import React from 'react';
import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import FloorPlan2DView from './pages/FloorPlan2DView';
import FloorPlan3DView from './pages/FloorPlan3DView';

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/floorplan-2d" element={<FloorPlan2DView />} />
      <Route path="/floorplan-3d" element={<FloorPlan3DView />} />
    </Routes>
  );
}

export default App;