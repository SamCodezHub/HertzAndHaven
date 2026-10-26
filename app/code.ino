#include "DFRobot_C4001.h"
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <string.h>
#include "secrets.h"

// Network publishing runs on its own FreeRTOS task so HTTPS requests do not
// pause radar sampling or the fall-detection state machine in loop().
static portMUX_TYPE telemetryMux = portMUX_INITIALIZER_UNLOCKED;
static volatile float latestVelocityMps = 0.0f;
static volatile bool latestTargetPresent = false;

void publishTelemetryTask(void *parameter) {
  const String telemetryUrl = String(SENSOR_ENDPOINT) + "/api/device/" + SENSOR_DEVICE_ID + "/telemetry";
  for (;;) {
    if (WiFi.status() == WL_CONNECTED) {
      float velocity;
      bool targetPresent;
      portENTER_CRITICAL(&telemetryMux);
      velocity = latestVelocityMps;
      targetPresent = latestTargetPresent;
      portEXIT_CRITICAL(&telemetryMux);

      char payload[160];
      snprintf(payload, sizeof(payload),
               "{\"velocity_mps\":%.3f,\"target_present\":%s}",
               velocity, targetPresent ? "true" : "false");

      WiFiClientSecure tlsClient;
      tlsClient.setCACert(SENSOR_ROOT_CA);
      HTTPClient http;
      http.setConnectTimeout(5000);
      http.setTimeout(5000);
      if (http.begin(tlsClient, telemetryUrl)) {
        http.addHeader("Authorization", String("Bearer ") + SENSOR_WRITE_TOKEN);
        http.addHeader("Content-Type", "application/json");
        int responseCode = http.POST((uint8_t *)payload, strlen(payload));
        if (responseCode < 200 || responseCode >= 300) {
          Serial.printf("Telemetry upload failed: HTTP %d\n", responseCode);
        }
        http.end();
      } else {
        Serial.println("Could not start HTTPS telemetry request");
      }
    }
    vTaskDelay(pdMS_TO_TICKS(3000));
  }
}

// --- Hardware Pins ---
#define RED_LED 38    // Emergency LED on GPIO 5
#define GREEN_LED 4  // False Alarm / Status LED on GPIO 4

const int RADAR_RX_PIN = 18; // Connects to C4001 TX
const int RADAR_TX_PIN = 17; // Connects to C4001 RX

// DFRobot C4001 driver MUST run at 9600 baud
DFRobot_C4001_UART radar(&Serial1, 9600, RADAR_RX_PIN, RADAR_TX_PIN);

// --- Tuned Fall & Walking-Rejection Thresholds ---
const float WINDOW_DELTA_THRESHOLD = 0.20; // Requires a sharp velocity surge (m/s)
const float MIN_PEAK_FALL_SPEED    = 0.30; // Must reach an actual drop peak speed (m/s)

// --- Sliding Window Buffer (4 samples @ 150ms = 600ms history) ---
float speedHistory[4] = {0.0, 0.0, 0.0, 0.0};
int historyIndex = 0;

// --- State Machine Variables ---
unsigned long fallTimer = 0;
bool trackingFall = false;
float floorRange = 0.0;

struct MotionMetrics {
  float delta;
  float maxSpeed;
};

MotionMetrics getMotionMetrics(float currentAbsSpeed) {
  speedHistory[historyIndex] = currentAbsSpeed;
  historyIndex = (historyIndex + 1) % 4;

  float minS = speedHistory[0];
  float maxS = speedHistory[0];
  for (int i = 1; i < 4; i++) {
    if (speedHistory[i] < minS) minS = speedHistory[i];
    if (speedHistory[i] > maxS) maxS = speedHistory[i];
  }
  return {maxS - minS, maxS};
}

void setup()
{
  Serial.begin(115200);

  // USB CDC wait delay for ESP32-S3
  unsigned long startWait = millis();
  while (!Serial && (millis() - startWait < 3000));

  Serial.println("\n==========================================");
  Serial.println("ESP32-S3 + C4001 Fall Detector Ready");
  Serial.println("==========================================");

  pinMode(RED_LED, OUTPUT);
  pinMode(GREEN_LED, OUTPUT);
  digitalWrite(RED_LED, LOW);
  digitalWrite(GREEN_LED, LOW);

  // Initialize Hardware Serial1 strictly at 9600 baud
  Serial1.begin(9600, SERIAL_8N1, RADAR_RX_PIN, RADAR_TX_PIN);
  delay(200);

  // Connect to C4001 radar
  while (!radar.begin()) {
    Serial.println("NO Devices ! Check RX/TX (C4001 TX -> GPIO 18, RX -> GPIO 17)");

    digitalWrite(GREEN_LED, HIGH);
    delay(100);
    digitalWrite(GREEN_LED, LOW);
    delay(900);
    digitalWrite(RED_LED, HIGH);
    delay(100);
    digitalWrite(RED_LED, LOW);
    delay(900);
  }

  Serial.println("Device connected!");

  digitalWrite(GREEN_LED, HIGH);
  delay(1500);
  digitalWrite(GREEN_LED, LOW);
  digitalWrite(RED_LED, HIGH);
  delay(100);
  digitalWrite(RED_LED, LOW);
  delay(900);

  radar.setSensorMode(eSpeedMode);

  // Hardware range cap: Min distance 11cm, Max distance 150cm (1.5m), Sensitivity 12
  if (radar.setDetectThres(11, 500, 10)) {
    Serial.println("Near-field detection range set successfully (5m max)");
  }

  radar.setFrettingDetection(eON);

  // Start Wi-Fi without waiting for a connection so the detector keeps running
  // even when the network is unavailable.
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  xTaskCreatePinnedToCore(publishTelemetryTask, "telemetry", 8192, nullptr, 1, nullptr, 0);
}

void loop()
{
  int numTargets = radar.getTargetNumber();
  float currentSpeed = radar.getTargetSpeed();
  float currentRange = radar.getTargetRange();

  // Publish zero while no target is present instead of leaving an old speed
  // visible in the phone app. Keep the target flag so the app can label it.
  portENTER_CRITICAL(&telemetryMux);
  latestTargetPresent = numTargets > 0;
  latestVelocityMps = numTargets > 0 ? currentSpeed : 0.0f;
  portEXIT_CRITICAL(&telemetryMux);

  float absSpeed = abs(currentSpeed);
  MotionMetrics metrics = getMotionMetrics(absSpeed);

  // Debug Print Stream
  Serial.print("Speed: "); Serial.print(currentSpeed);
  Serial.print(" m/s | 600ms Delta: "); Serial.print(metrics.delta);
  Serial.print(" m/s | Range: "); Serial.print(currentRange);
  Serial.println(" m");

  if (numTargets > 0) {

    // PHASE 1: Kinetic Fall Trigger
    if (metrics.delta >= WINDOW_DELTA_THRESHOLD && metrics.maxSpeed >= MIN_PEAK_FALL_SPEED && !trackingFall) {
      trackingFall = true;
      fallTimer = millis();
      floorRange = currentRange;
      Serial.println("⚠️ WARNING: Sudden fall kinetic profile detected!");
    }

    // PHASE 2: Post-Impact Verification State Machine
    if (trackingFall) {
      unsigned long timeElapsed = millis() - fallTimer;

      // Fast Cancel: Continued walking motion detected
      if (timeElapsed >= 500 && timeElapsed <= 1500 && absSpeed > 0.2) {
        Serial.println("ℹ️ Continuous movement detected. Trigger cancelled.");
        trackingFall = false;
      }

      // Confirmation Window (2.5s post-impact)
      else if (timeElapsed > 2500) {

        // ALERT: Target motionless near floor
        if (absSpeed < 0.15 && abs(currentRange - floorRange) < 0.5) {
          Serial.println("🚨 🚨 🚨 ALERT: FALL CONFIRMED! 🚨 🚨 🚨");

          for (int i = 0; i < 10; i++) {
            digitalWrite(RED_LED, HIGH);
            delay(250);
            digitalWrite(RED_LED, LOW);
            delay(250);
          }

          trackingFall = false;
        }

        // FALSE ALARM: Person stood up / moved
        else {
          Serial.println("✅ False Alarm: Target standing or moving normally.");

          for (int i = 0; i < 4; i++) {
            digitalWrite(GREEN_LED, HIGH);
            delay(200);
            digitalWrite(GREEN_LED, LOW);
            delay(200);
          }

          trackingFall = false;
        }
      }
    }
  }

  delay(150);
}
