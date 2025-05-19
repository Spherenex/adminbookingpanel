// src/App.js - Standalone Admin Panel

import React from 'react';
import Admin from './components/Admin';
import './styles/Admin.css';

const App = () => {
  return (
    <div className="admin-app-container">
      <Admin />
    </div>
  );
};

export default App;