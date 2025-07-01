import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HostGroups from './pages/HostGroups';
import Scripts from './pages/Scripts';
import Ansible from './pages/Ansible';
import DockerTemplates from './pages/DockerTemplates';
import Terminal from './pages/Terminal';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<HostGroups />} />
          <Route path="/hostgroups" element={<HostGroups />} />
          <Route path="/scripts" element={<Scripts />} />
          <Route path="/ansible" element={<Ansible />} />
          <Route path="/docker-templates" element={<DockerTemplates />} />
          <Route path="/terminal/:hostId" element={<Terminal />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;