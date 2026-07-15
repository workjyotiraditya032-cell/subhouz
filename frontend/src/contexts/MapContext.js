import React, { createContext, useContext, useState, useMemo } from 'react';

const MapContext = createContext(null);

export function MapProvider({ children }) {
  const [mapCenter, setMapCenter] = useState([20.2961, 85.8245]); // Default Bhubaneswar
  const [mapZoom, setMapZoom] = useState(12);

  const value = useMemo(() => ({
    mapCenter,
    setMapCenter,
    mapZoom,
    setMapZoom
  }), [mapCenter, mapZoom]);

  return (
    <MapContext.Provider value={value}>
      {children}
    </MapContext.Provider>
  );
}

export function useMapState() {
  const context = useContext(MapContext);
  if (!context) {
    throw new Error('useMapState must be used within a MapProvider');
  }
  return context;
}
