import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Atmosphere } from './components/ui';
import { SessionProvider, useSession } from './lib/session';
import { isDay2State } from './lib/types';
import {
  BanquetPage,
  BountiesPage,
  CollectionPage,
  Day1HubPage,
  ExperiencesPage,
  ExplorePage,
  MaskRitePage,
  NpcsPage,
  PerformancesPage,
  RecordsPage
} from './pages/Day1Pages';
import { CityPage, ConvoyPage, Day2HubPage, GranaryPage, OutpostPage, ResourcesPage, TasksPage } from './pages/Day2Pages';
import EndingPage from './pages/EndingPage';
import EnrollPage from './pages/EnrollPage';
import PaintWallPage from './pages/PaintWallPage';
import AdminPage from './pages/AdminPage';
import { BackgroundMusic } from './components/BackgroundMusic';

function canonicalPath(state?: string | null) {
  if (state === 'ENDING') return '/ending';
  if (isDay2State(state)) return '/day2';
  if (state === 'SIGNED_IN') return '/enroll';
  return '/day1';
}

function EnrollRoute() {
  const { local, snapshot } = useSession();
  const state = snapshot?.player.state || local?.state;
  if (local && state && state !== 'SIGNED_IN') return <Navigate to={canonicalPath(state)} replace />;
  return <EnrollPage />;
}

function ProtectedRoute({ children, requireDay2 = false, endingOnly = false, allowEnding = false }: { children: React.ReactNode; requireDay2?: boolean; endingOnly?: boolean; allowEnding?: boolean }) {
  const location = useLocation();
  const { local, snapshot, loading } = useSession();
  if (!local) return <Navigate to="/enroll" replace state={{ from: location.pathname }} />;
  const state = snapshot?.player.state || local.state;
  if (loading && !snapshot) return <div className="route-loading" role="status">正在从账本找回你的路…</div>;
  if (state === 'SIGNED_IN') return <Navigate to="/enroll" replace />;
  if (state === 'ENDING' && !endingOnly && !allowEnding) return <Navigate to="/ending" replace />;
  if (endingOnly && state !== 'ENDING') return <Navigate to={canonicalPath(state)} replace />;
  if (requireDay2 && !isDay2State(state)) return <Navigate to="/day1" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const location = useLocation();
  return (
    <div className={`night-void ${location.pathname === '/admin' ? 'is-admin' : ''}`}>
      <BackgroundMusic />
      <Atmosphere />
      <div className="phone-shell">
        <div className="phone-screen">
          <div key={location.pathname} className="page-rise h-full">
            <Routes location={location}>
              <Route path="/" element={<Navigate to="/enroll" replace />} />
              <Route path="/enroll" element={<EnrollRoute />} />
              <Route path="/day1" element={<ProtectedRoute><Day1HubPage /></ProtectedRoute>} />
              <Route path="/day1/explore" element={<ProtectedRoute><ExplorePage /></ProtectedRoute>} />
              <Route path="/day1/records" element={<ProtectedRoute><RecordsPage /></ProtectedRoute>} />
              <Route path="/day1/collection" element={<ProtectedRoute><CollectionPage /></ProtectedRoute>} />
              <Route path="/day1/banquet" element={<ProtectedRoute><BanquetPage /></ProtectedRoute>} />
              <Route path="/day1/npcs" element={<ProtectedRoute><NpcsPage /></ProtectedRoute>} />
              <Route path="/day1/performances" element={<ProtectedRoute><PerformancesPage /></ProtectedRoute>} />
              <Route path="/day1/experiences" element={<ProtectedRoute><ExperiencesPage /></ProtectedRoute>} />
              <Route path="/day1/bounties" element={<ProtectedRoute><BountiesPage /></ProtectedRoute>} />
              <Route path="/day1/mask" element={<ProtectedRoute><MaskRitePage /></ProtectedRoute>} />
              <Route path="/paint-wall" element={<ProtectedRoute><PaintWallPage /></ProtectedRoute>} />
              <Route path="/day2" element={<ProtectedRoute requireDay2><Day2HubPage /></ProtectedRoute>} />
              <Route path="/day2/resources" element={<ProtectedRoute requireDay2><ResourcesPage /></ProtectedRoute>} />
              <Route path="/day2/tasks" element={<ProtectedRoute requireDay2><TasksPage /></ProtectedRoute>} />
              <Route path="/day2/convoy" element={<ProtectedRoute requireDay2><ConvoyPage /></ProtectedRoute>} />
              <Route path="/day2/city" element={<ProtectedRoute requireDay2><CityPage /></ProtectedRoute>} />
              <Route path="/day2/granary" element={<ProtectedRoute requireDay2><GranaryPage /></ProtectedRoute>} />
              <Route path="/day2/outpost" element={<ProtectedRoute requireDay2><OutpostPage /></ProtectedRoute>} />
              <Route path="/battle" element={<Navigate to="/day2" replace />} />
              <Route path="/ending" element={<ProtectedRoute endingOnly><EndingPage /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute allowEnding><AdminPage /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/enroll" replace />} />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return <SessionProvider><AppRoutes /></SessionProvider>;
}
