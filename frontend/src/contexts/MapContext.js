import React, { createContext, useContext, useState, useMemo } from 'react';

const MapContext = createContext(null);

export function MapProvider({ children }) {
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]); // Default India Center
  const [mapZoom, setMapZoom] = useState(5);

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
