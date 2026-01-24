import React, { useEffect, useMemo } from 'react';
// @ts-ignore
import { Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import Home from './components/Home';
import Palmistry from './components/Palmistry';
import Login from './components/Login';
import Register from './components/Register';
import Header from './components/Header';
import Footer from './components/Footer';
import Remedy from './components/Remedy';
import FaceReading from './components/FaceReading';
import DreamAnalysis from './components/DreamAnalysis';
import Matchmaking from './components/Matchmaking';
import AdminDashboard from './components/AdminDashboard';
import AdminConfig from './components/AdminConfig';
import AdminCloudConfig from './components/AdminCloudConfig';
import AdminPaymentConfig from './components/AdminPaymentConfig';
import AdminDB from './components/AdminDB';
import MasterLogin from './components/MasterLogin';
import RevenueDashboard from './components/RevenueDashboard';
import NumerologyAstrology from './components/NumerologyAstrology';
import Tarot from './components/Tarot';
import Store from './components/Store';
import AdminGuard from './components/AdminGuard';
import BackupManager from './components/BackupManager';
import ReadingHistory from './components/ReadingHistory';
import GemstoneGuide from './components/GemstoneGuide';
import Ayurveda from './components/Ayurveda';
import MoonJournal from './components/MoonJournal';
import MuhuratPicker from './components/MuhuratPicker';
import CosmicSync from './components/CosmicSync';
import VoiceOracle from './components/VoiceOracle';
import PanchangBar from './components/PanchangBar';
import SigilGallery from './components/SigilGallery';
import ReportDesigner from './components/ReportDesigner';
import KalnirnayeCalendar from './components/KalnirnayeCalendar';

import { useAuth } from './context/AuthContext';
import { PushNotifications } from './components/PushNotifications';
import DailyReminder from './components/DailyReminder';
import BadgeCounter from './components/BadgeCounter';
import { AnalyticsProvider } from './components/Analytics';
import { ABTestStatus } from './components/ABTesting';
import { AccessibilityProvider } from './context/AccessibilityContext';
import LargeTextMode from './components/LargeTextMode';
import ReferralProgram from './components/ReferralProgram';
import Leaderboard from './components/Leaderboard';
import GamificationHUD from './components/GamificationHUD';
import ContextDbNavigator from './components/ContextDbNavigator';
import { useTheme } from './context/ThemeContext';
import ErrorBoundary from './components/shared/ErrorBoundary';
import MobileNavBar from './components/MobileNavBar';
import { useDevice } from './hooks/useDevice';
import { ADMIN_EMAILS } from './constants';

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" />;
  return <>{children}</>;
};

function App() {
  const { isAuthenticated, logout, user } = useAuth();
  const location = useLocation();
  const { isMobile } = useDevice();

  const isAuthPage = ['/login', '/register', '/master-login'].includes(location.pathname);
  const isAdminPage = location.pathname.startsWith('/admin') || location.pathname === '/master-login';
  const showLayout = isAuthenticated && !isAuthPage && !isAdminPage;

  // Strict Admin Check - ensures normal users never see gear/db buttons
  const isAdmin = useMemo(() => {
    if (!user) return false;
    // Role must be explicitly 'admin' AND email must be in authorized list
    return user.role === 'admin' && ADMIN_EMAILS.includes(user.email || '');
  }, [user]);

  return (
    <AccessibilityProvider>
      <AnalyticsProvider>
        <PushNotifications>
          <div className="bg-skin-base min-h-screen text-skin-text flex flex-col font-lora overflow-x-hidden transition-colors duration-500">
            
            {showLayout && <Header onLogout={logout} isMobile={isMobile} />}
            
            {isAuthenticated && (
               <>
                 <DailyReminder />
                 {!isMobile && <BadgeCounter />}
                 <LargeTextMode />
                 
                 {/* Guarded UI - Admin Only */}
                 {isAdmin && <ContextDbNavigator />}
                 {isAdmin && <ABTestStatus />}
                 
                 {!isAdminPage && <GamificationHUD />}
                 
                 {!isAdminPage && !isMobile && (
                    <Link to="/referrals" className="fixed bottom-6 left-6 z-40 animate-pulse-glow group">
                       <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-700 rounded-full shadow-[0_0_20px_rgba(34,197,94,0.4)] flex items-center justify-center border-2 border-white/20 transform group-hover:scale-110 transition-transform">
                          <span className="text-2xl">🎁</span>
                       </div>
                    </Link>
                 )}
               </>
            )}

            <main className={`flex-grow ${showLayout ? `container mx-auto px-4 ${isMobile ? 'pb-24 pt-4' : 'py-8'}` : ''}`}>
              {location.pathname === '/home' && isAuthenticated && (
                  <PanchangBar />
              )}

              <Routes>
                <Route path="/" element={isAuthenticated ? <Home /> : <Login />} />
                <Route path="/login" element={isAuthenticated ? <Navigate to="/home" /> : <Login />} />
                <Route path="/register" element={isAuthenticated ? <Navigate to="/home" /> : <Register />} />
                
                <Route path="/master-login" element={<MasterLogin />} />
                <Route path="/admin/dashboard" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
                <Route path="/admin/config" element={<AdminGuard><AdminConfig /></AdminGuard>} />
                <Route path="/admin/cloud" element={<AdminGuard><AdminCloudConfig /></AdminGuard>} />
                <Route path="/admin/payments" element={<AdminGuard><AdminPaymentConfig /></AdminGuard>} />
                <Route path="/admin/revenue" element={<AdminGuard><RevenueDashboard /></AdminGuard>} />
                <Route path="/admin/db/:table" element={<AdminGuard><AdminDB /></AdminGuard>} />
                <Route path="/admin/backup" element={<AdminGuard><BackupManager /></AdminGuard>} />
                <Route path="/admin/report-designer" element={<AdminGuard><ReportDesigner /></AdminGuard>} />

                <Route path="/home" element={<ProtectedRoute><ErrorBoundary><Home /></ErrorBoundary></ProtectedRoute>} />
                <Route path="/history" element={<ProtectedRoute><ErrorBoundary><ReadingHistory /></ErrorBoundary></ProtectedRoute>} />
                <Route path="/palmistry" element={<ProtectedRoute><ErrorBoundary><Palmistry /></ErrorBoundary></ProtectedRoute>} />
                <Route path="/numerology" element={<ProtectedRoute><ErrorBoundary><NumerologyAstrology mode="numerology" /></ErrorBoundary></ProtectedRoute>} />
                <Route path="/astrology" element={<ProtectedRoute><ErrorBoundary><NumerologyAstrology mode="astrology" /></ErrorBoundary></ProtectedRoute>} />
                <Route path="/tarot" element={<ProtectedRoute><ErrorBoundary><Tarot /></ErrorBoundary></ProtectedRoute>} />
                <Route path="/face-reading" element={<ProtectedRoute><ErrorBoundary><FaceReading /></ErrorBoundary></ProtectedRoute>} />
                <Route path="/dream-analysis" element={<ProtectedRoute><ErrorBoundary><DreamAnalysis /></ErrorBoundary></ProtectedRoute>} />
                <Route path="/matchmaking" element={<ProtectedRoute><ErrorBoundary><Matchmaking /></ErrorBoundary></ProtectedRoute>} />
                <Route path="/remedy" element={<ProtectedRoute><ErrorBoundary><Remedy /></ErrorBoundary></ProtectedRoute>} />
                <Route path="/store" element={<ProtectedRoute><ErrorBoundary><Store /></ErrorBoundary></ProtectedRoute>} />
                <Route path="/gemstones" element={<ProtectedRoute><ErrorBoundary><GemstoneGuide /></ErrorBoundary></ProtectedRoute>} />
                <Route path="/referrals" element={<ProtectedRoute><ReferralProgram /></ProtectedRoute>} />
                <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
                <Route path="/achievements" element={<ProtectedRoute><ErrorBoundary><SigilGallery /></ErrorBoundary></ProtectedRoute>} />
                
                <Route path="/ayurveda" element={<ProtectedRoute><ErrorBoundary><Ayurveda /></ErrorBoundary></ProtectedRoute>} />
                <Route path="/moon-journal" element={<ProtectedRoute><ErrorBoundary><MoonJournal /></ErrorBoundary></ProtectedRoute>} />
                <Route path="/muhurat" element={<ProtectedRoute><ErrorBoundary><MuhuratPicker /></ErrorBoundary></ProtectedRoute>} />
                <Route path="/cosmic-sync" element={<ProtectedRoute><ErrorBoundary><CosmicSync /></ErrorBoundary></ProtectedRoute>} />
                <Route path="/voice-oracle" element={<ProtectedRoute><ErrorBoundary><VoiceOracle /></ErrorBoundary></ProtectedRoute>} />
                <Route path="/calendar" element={<ProtectedRoute><ErrorBoundary><KalnirnayeCalendar /></ErrorBoundary></ProtectedRoute>} />

                <Route path="*" element={<Navigate to="/login" />} />
              </Routes>
            </main>
            
            {showLayout && isMobile && <MobileNavBar />}
            {showLayout && !isMobile && <Footer />}
          </div>
        </PushNotifications>
      </AnalyticsProvider>
    </AccessibilityProvider>
  );
}

export default App;