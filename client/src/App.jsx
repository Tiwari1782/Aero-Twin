import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import IntroPage from './pages/IntroPage';
import DashboardLayout from './layouts/DashboardLayout';
import MainDashboard from './pages/MainDashboard';
import AlertsPage from './pages/AlertsPage';
import HistoryPage from './pages/HistoryPage';

const pageVariants = {
  initial: { opacity: 0, y: 20, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -20, filter: 'blur(4px)' },
};

const pageTransition = {
  duration: 0.5,
  ease: [0.25, 0.46, 0.45, 0.94],
};

function AnimatedPage({ children }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
}

export default function App() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={
            <AnimatedPage>
              <IntroPage />
            </AnimatedPage>
          }
        />
        <Route
          path="/dashboard"
          element={
            <AnimatedPage>
              <DashboardLayout />
            </AnimatedPage>
          }
        >
          <Route index element={<MainDashboard />} />
          <Route path="alerts" element={<AlertsPage />} />
          <Route path="history" element={<HistoryPage />} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}
