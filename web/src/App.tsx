import { lazy, Suspense } from 'react';
import { BrowserRouter, HashRouter, Routes, Route } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import RouteFallback from './components/RouteFallback';

const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const FamilyDashboard = lazy(() => import('./pages/FamilyDashboard'));
const ModeratorDashboard = lazy(() => import('./pages/ModeratorDashboard'));
const NotFound = lazy(() => import('./pages/NotFound'));

/**
 * Electron serves the bundle from `file://`, where path-based routing cannot
 * work. Fall back to a hash router so the same build runs in the browser and
 * inside the desktop shell.
 */
const isDesktop =
  typeof window !== 'undefined' &&
  (window.location.protocol === 'file:' || /electron/i.test(navigator.userAgent));
const Router = isDesktop ? HashRouter : BrowserRouter;

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/landing" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/family-dashboard" element={<FamilyDashboard />} />
            <Route path="/dashboard" element={<ModeratorDashboard />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
