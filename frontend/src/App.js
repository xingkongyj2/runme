import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
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
      <Router>
        <div className="App">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Layout><HostGroups /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/hostgroups" element={
              <ProtectedRoute>
                <Layout><HostGroups /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/monitoring" element={
              <ProtectedRoute>
                <Layout><HostMonitoring /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/deployment" element={
              <ProtectedRoute>
                <Layout><Deployment /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/scripts" element={
              <ProtectedRoute>
                <Layout><Scripts /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/ansible" element={
              <ProtectedRoute>
                <Layout><Ansible /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/docker-templates" element={
              <ProtectedRoute>
                <Layout><DockerTemplates /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/terminal/:hostId" element={
              <ProtectedRoute>
                <Terminal />
              </ProtectedRoute>
            } />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;