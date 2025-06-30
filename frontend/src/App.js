import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HostGroups from './pages/HostGroups';
import Scripts from './pages/Scripts';
import Ansible from './pages/Ansible';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Layout>
          <Routes>
            <Route path="/" element={<HostGroups />} />
            <Route path="/hostgroups" element={<HostGroups />} />
            <Route path="/scripts" element={<Scripts />} />
            <Route path="/ansible" element={<Ansible />} />
          </Routes>
        </Layout>
      </div>
    </Router>
  );
}

export default App;