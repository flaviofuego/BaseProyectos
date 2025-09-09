import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@/context/ThemeContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { AuthProvider } from '@/context/AuthContext';
import Layout from '@/components/layout/Layout';
import NotificationManager from '@/components/notifications/NotificationManager';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

// Pages
import Dashboard from '@/pages/Dashboard';
import CreatePerson from '@/pages/CreatePerson';
import SearchPersons from '@/pages/SearchPersons';
import ModifyPerson from '@/pages/ModifyPerson';
import DeletePerson from '@/pages/DeletePerson';
import ConsultLogs from '@/pages/ConsultLogs';
import NLPQuery from '@/pages/NLPQuery';
import Login from '@/pages/Login';
import Register from '@/pages/Register';

function App() {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <AuthProvider>
          <Router>
            <div className="min-h-screen bg-gray-50 dark:bg-dark-bg-primary transition-colors duration-200">
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                
                {/* Protected routes */}
                <Route path="/" element={
                  <ProtectedRoute>
                    <Layout>
                      <Dashboard />
                    </Layout>
                  </ProtectedRoute>
                } />
                
                <Route path="/crear-persona" element={
                  <ProtectedRoute>
                    <Layout>
                      <CreatePerson />
                    </Layout>
                  </ProtectedRoute>
                } />
                
                <Route path="/consultar-personas" element={
                  <ProtectedRoute>
                    <Layout>
                      <SearchPersons />
                    </Layout>
                  </ProtectedRoute>
                } />
                
                <Route path="/modificar-persona/:id" element={
                  <ProtectedRoute>
                    <Layout>
                      <ModifyPerson />
                    </Layout>
                  </ProtectedRoute>
                } />
                
                <Route path="/borrar-persona/:id" element={
                  <ProtectedRoute>
                    <Layout>
                      <DeletePerson />
                    </Layout>
                  </ProtectedRoute>
                } />
                
                <Route path="/consultar-logs" element={
                  <ProtectedRoute>
                    <Layout>
                      <ConsultLogs />
                    </Layout>
                  </ProtectedRoute>
                } />
                
                <Route path="/consulta-nlp" element={
                  <ProtectedRoute>
                    <Layout>
                      <NLPQuery />
                    </Layout>
                  </ProtectedRoute>
                } />
                
                {/* Redirect any unknown routes to home */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              
              <NotificationManager />
            </div>
          </Router>
        </AuthProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
}

export default App;
