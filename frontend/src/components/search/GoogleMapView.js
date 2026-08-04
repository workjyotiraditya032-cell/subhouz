import React, { useEffect, useRef, useMemo, useState } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { useSearch } from '../../contexts/SearchContext';
import createPropertyMarker from './PropertyMarker';
import MarkerCluster from './MarkerCluster';

const API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "";

// Configure loader options globally once
setOptions({
  key: API_KEY,
  version: "weekly"
});

// Preset search coordinates fallback
const SEARCH_COORDINATES = {
  "bengaluru": { lat: 12.9716, lng: 77.5946 },
  "koramangala": { lat: 12.9352, lng: 77.6245 },
  "indiranagar": { lat: 12.9784, lng: 77.6408 },
  "hyderabad": { lat: 17.3850, lng: 78.4867 },
  "hitech city": { lat: 17.4435, lng: 78.3772 },
  "gachibowli": { lat: 17.4401, lng: 78.3489 },
  "pune": { lat: 18.5204, lng: 73.8567 },
  "hinjewadi": { lat: 18.5912, lng: 73.7389 },
  "viman nagar": { lat: 18.5679, lng: 73.9143 },
  "mumbai": { lat: 19.0760, lng: 72.8777 },
  "bandra": { lat: 19.0596, lng: 72.8295 },
  "delhi": { lat: 28.6139, lng: 77.2090 },
  "gurugram": { lat: 28.4595, lng: 77.0266 },
  "cyber city": { lat: 28.4950, lng: 77.0895 },
  "chennai": { lat: 13.0827, lng: 80.2707 },
  "velachery": { lat: 12.9796, lng: 80.2209 },
  "kolkata": { lat: 22.5726, lng: 88.3639 },
  "jaipur": { lat: 26.9124, lng: 75.7873 },
};

export default function GoogleMapView({ searchLocation }) {
  const { hostels, activeHostelId, setActiveHostelId } = useSearch();
  const [googleInstance, setGoogleInstance] = useState(null);
  
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const clustererInstanceRef = useRef(null);

  const filteredHostels = useMemo(() => {
    return hostels.filter(h => h.latitude && h.longitude);
  }, [hostels]);

  // Load Google Maps API once
  useEffect(() => {
    let active = true;
    const loadGoogleMaps = async () => {
      try {
        await importLibrary("maps");
        await importLibrary("marker");
        await importLibrary("places");
        if (active) {
          setGoogleInstance(window.google);
        }
      } catch (err) {
        console.error('[GoogleMapView] Loader failed:', err);
      }
    };
    loadGoogleMaps();
    return () => {
      active = false;
    };
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!googleInstance || !mapContainerRef.current || mapInstanceRef.current) return;

    const initializeMap = async () => {
      const { Map } = await googleInstance.maps.importLibrary("maps");
      
      const defaultCenter = { lat: 20.5937, lng: 78.9629 }; // India Center
      
      const map = new Map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: 5,
        mapId: "DEMO_MAP_ID", // Required for Advanced Markers
        disableDefaultUI: true,
        zoomControl: true,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }]
          }
        ]
      });

      mapInstanceRef.current = map;
    };

    initializeMap();
  }, [googleInstance]);

  // Handle markers & bounds sync
  useEffect(() => {
    if (!googleInstance || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    // Clear existing clusterer
    if (clustererInstanceRef.current) {
      clustererInstanceRef.current.clearMarkers();
    }

    // Clear existing markers
    Object.values(markersRef.current).forEach(({ marker }) => {
      marker.setMap(null);
    });
    markersRef.current = {};

    const markerList = [];
    const bounds = new googleInstance.maps.LatLngBounds();
    let hasPoints = false;

    filteredHostels.forEach((h) => {
      if (!h.latitude || !h.longitude) return;

      const pos = { lat: h.latitude, lng: h.longitude };
      bounds.extend(pos);
      hasPoints = true;

      const isActive = activeHostelId === h.id;

      // Create advanced marker
      const { marker } = createPropertyMarker({
        google: googleInstance,
        map,
        hostel: h,
        isActive,
        onClick: () => {
          setActiveHostelId(h.id);
          const card = document.getElementById(`listing-card-${h.id}`);
          if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        },
        onHover: () => setActiveHostelId(h.id),
        onHoverOut: () => setActiveHostelId(null)
      });

      markersRef.current[h.id] = { marker, pos };
      markerList.push(marker);
    });

    // Fit map bounds automatically
    if (hasPoints) {
      if (filteredHostels.length === 1) {
        map.setCenter({ lat: filteredHostels[0].latitude, lng: filteredHostels[0].longitude });
        map.setZoom(15);
      } else {
        map.fitBounds(bounds);
      }
    }

    // Initialize marker clusterer
    if (markerList.length > 0) {
      clustererInstanceRef.current = MarkerCluster.create(map, markerList);
    }
  }, [googleInstance, filteredHostels, activeHostelId, setActiveHostelId]);

  // Center query-based locations
  useEffect(() => {
    if (!googleInstance || !mapInstanceRef.current || !searchLocation) return;
    const map = mapInstanceRef.current;
    const clean = searchLocation.toLowerCase().trim();
    
    const coords = SEARCH_COORDINATES[clean];
    if (coords) {
      map.setCenter(coords);
      map.setZoom(14);
    }
  }, [googleInstance, searchLocation]);

  return (
    <div className="w-full h-full rounded-3xl overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-slate-100 relative">
      <div ref={mapContainerRef} className="w-full h-full min-h-[300px]" />
      
      {/* Fallback watermark when API Key is blank */}
      {!API_KEY && (
        <div className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-full text-white text-[10px] font-bold border border-white/10 z-50">
          Google Maps Demo Mode
        </div>
      )}
    </div>
  );
}
