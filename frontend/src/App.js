import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HostGroups from './pages/HostGroups';
import Scripts from './pages/Scripts';
import Ansible from './pages/Ansible';
import DockerTemplates from './pages/DockerTemplates';
import Terminal from './pages/Terminal';
import HostMonitoring from './pages/HostMonitoring';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Layout><HostGroups /></Layout>} />
          <Route path="/hostgroups" element={<Layout><HostGroups /></Layout>} />
          <Route path="/monitoring" element={<Layout><HostMonitoring /></Layout>} />
          <Route path="/scripts" element={<Layout><Scripts /></Layout>} />
          <Route path="/ansible" element={<Layout><Ansible /></Layout>} />
          <Route path="/docker-templates" element={<Layout><DockerTemplates /></Layout>} />
          <Route path="/terminal/:hostId" element={<Terminal />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;