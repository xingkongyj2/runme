import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { MenuConfigProvider } from './contexts/MenuConfigContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Settings from './pages/Settings';
import HostGroups from './pages/HostGroups';
import Scripts from './pages/Scripts';
import Ansible from './pages/Ansible';
import DockerTemplates from './pages/DockerTemplates';
import Terminal from './pages/Terminal';
import HostMonitoring from './pages/HostMonitoring';
import Deployment from './pages/Deployment';

function App() {
  return (
    <AuthProvider>
      <MenuConfigProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/terminal/:hostId" element={
              <ProtectedRoute>
                <Terminal />
              </ProtectedRoute>
            } />
            <Route path="/*" element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<HostGroups />} />
                    <Route path="/hostgroups" element={<HostGroups />} />
                    <Route path="/scripts" element={<Scripts />} />
                    <Route path="/ansible" element={<Ansible />} />
                    <Route path="/docker-templates" element={<DockerTemplates />} />
                    <Route path="/monitoring" element={<HostMonitoring />} />
                    <Route path="/deployment" element={<Deployment />} />
                    <Route path="/settings" element={<Settings />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            } />
          </Routes>
        </Router>
      </MenuConfigProvider>
    </AuthProvider>
  );
}

export default App;