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
  "patia": { lat: 20.3588, lng: 85.8166 },
  "shampur": { lat: 20.2885, lng: 85.7766 },
  "mancheswar": { lat: 20.3259, lng: 85.8672 },
  "patrapada": { lat: 20.2801, lng: 85.7441 },
  "khandagiri": { lat: 20.2580, lng: 85.7750 },
  "jaydev vihar": { lat: 20.2970, lng: 85.8180 },
  "kiit university": { lat: 20.3533, lng: 85.8189 },
  "iter college": { lat: 20.2766, lng: 85.7966 },
  "silicon institute of technology": { lat: 20.3702, lng: 85.8078 },
  "c. v. raman global university": { lat: 20.2155, lng: 85.7355 },
  "sikharchandi temple": { lat: 20.3644, lng: 85.8233 },
  "ranganath temple": { lat: 20.3275, lng: 85.8690 },
  "saraswati sishu mandir": { lat: 20.2890, lng: 85.7790 },
  "khandagiri caves": { lat: 20.2584, lng: 85.7752 },
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
      
      const defaultCenter = { lat: 20.2961, lng: 85.8245 }; // Bhubaneswar
      
      const map = new Map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: 12,
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
