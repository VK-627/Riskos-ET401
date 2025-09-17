import { Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { StockMarketNews } from './pages/StockMarketNews';
import { LandingPage } from './pages/LandingPage';
import { PortfolioDashboard } from './pages/PortfolioDashboard';
import { Assessment } from './pages/Assessment';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import AboutUsPage from './pages/AboutUsPage';
import { Learn } from './pages/Learn';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { useContext } from 'react';

function AppContent() {
  const { isLoggedIn } = useContext(AuthContext);

  return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <Navbar />
        <main className="flex-grow">
          {/* Wrap Routes in ErrorBoundary for global error handling */}
          <ErrorBoundary>
            <Routes>
              <Route path="/news" element={<StockMarketNews />} />
              <Route path="/portfolio" element={<PortfolioDashboard />} />
              <Route path="/" element={isLoggedIn ? <Assessment /> : <LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/learn" element={ <Learn />} />
              <Route path="/about" element={<AboutUsPage />} />
              <Route path= "/assessment" element={<Assessment />} />

          </Routes>
        </ErrorBoundary>
      </main>

      <footer className="bg-black text-white py-10 text-sm w-full">
        <div className="text-center mt-8 text-xs text-gray-400">
          <p>
            2025 Company Ltd. All rights reserved.
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Use</a>
            <a href="#">Cookie Policy</a>
            <a href="#">Manage Cookies</a>
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <i className="fab fa-instagram" />
            <i className="fab fa-linkedin" />
            <i className="fab fa-facebook" />
            <i className="fab fa-x-twitter" />
          </div>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
