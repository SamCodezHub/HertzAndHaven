package com.sentinel.sensormonitor;

import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;

public class MainActivity extends Activity {
    private static final String APP_HOST = "appassets.androidplatform.net";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(7, 93, 84));
        getWindow().setNavigationBarColor(Color.rgb(7, 93, 84));

        WebView web = new WebView(this);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        web.setBackgroundColor(Color.rgb(247, 245, 239));
        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                if (!APP_HOST.equals(request.getUrl().getHost())) return null;
                String path = request.getUrl().getPath();
                String name = path != null && path.startsWith("/assets/") ? path.substring("/assets/".length()) : "";
                String mime = mimeType(name);
                if (mime == null) return emptyResponse();
                try {
                    InputStream stream = getAssets().open(name);
                    return new WebResourceResponse(mime, "UTF-8", stream);
                } catch (IOException error) {
                    return emptyResponse();
                }
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !APP_HOST.equals(request.getUrl().getHost());
            }
        });

        try {
            InputStream page = getAssets().open("index.html");
            byte[] bytes = new byte[page.available()];
            int length = page.read(bytes);
            page.close();
            String html = new String(bytes, 0, Math.max(0, length), java.nio.charset.StandardCharsets.UTF_8);
            web.loadDataWithBaseURL("https://" + APP_HOST + "/assets/index.html", html, "text/html", "UTF-8", null);
        } catch (IOException error) {
            web.loadDataWithBaseURL("https://" + APP_HOST + "/assets/index.html",
                    "<html><body style='background:#f7f5ef;color:#24372f'>App files are missing.</body></html>",
                    "text/html", "UTF-8", null);
        }
        setContentView(web);
    }

    private String mimeType(String name) {
        if ("styles.css".equals(name)) return "text/css";
        if ("app.js".equals(name)) return "application/javascript";
        if ("manifest.webmanifest".equals(name)) return "application/manifest+json";
        if ("icon.svg".equals(name)) return "image/svg+xml";
        if ("new_logo_mark.jpg".equals(name)) return "image/jpeg";
        return null;
    }

    private WebResourceResponse emptyResponse() {
        return new WebResourceResponse("text/plain", "UTF-8", new ByteArrayInputStream(new byte[0]));
    }
}
