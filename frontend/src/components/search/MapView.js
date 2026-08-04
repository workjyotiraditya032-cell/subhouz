import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useSearch } from '../../contexts/SearchContext';

// Coordinate lookup presets for centering queries
const SEARCH_COORDINATES = {
  "bengaluru": [12.9716, 77.5946],
  "koramangala": [12.9352, 77.6245],
  "indiranagar": [12.9784, 77.6408],
  "hyderabad": [17.3850, 78.4867],
  "hitech city": [17.4435, 78.3772],
  "gachibowli": [17.4401, 78.3489],
  "pune": [18.5204, 73.8567],
  "hinjewadi": [18.5912, 73.7389],
  "viman nagar": [18.5679, 73.9143],
  "mumbai": [19.0760, 72.8777],
  "bandra": [19.0596, 72.8295],
  "delhi": [28.6139, 77.2090],
  "gurugram": [28.4595, 77.0266],
  "cyber city": [28.4950, 77.0895],
  "chennai": [13.0827, 80.2707],
  "velachery": [12.9796, 80.2209],
  "kolkata": [22.5726, 88.3639],
  "jaipur": [26.9124, 75.7873],
};

// Fix for broken default icon urls in Leaflet bundle
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Custom price pin marker builder
const createPriceIcon = (price, isActive) => {
  const formattedPrice = price >= 1000 ? `${(price / 1000).toFixed(1)}k` : price;
  return L.divIcon({
    className: 'custom-price-marker-icon',
    html: `
      <div class="shadow-[0_4px_16px_rgba(0,0,0,0.12)] rounded-full px-3.5 py-1.5 font-bold text-xs border transition-all duration-300 flex items-center justify-center whitespace-nowrap cursor-pointer transform ${
        isActive 
          ? 'bg-emerald-800 text-white border-emerald-950 scale-110 ring-4 ring-emerald-500/20 font-black' 
          : 'bg-white text-emerald-800 border-emerald-700 hover:bg-slate-50 font-bold hover:scale-[1.03]'
      }">
        ₹${formattedPrice}
      </div>
    `,
    iconSize: [68, 30],
    iconAnchor: [34, 15]
  });
};

// Sub-component to fit multiple marker bounds
function MapBoundsController({ hostels }) {
  const map = useMap();

  useEffect(() => {
    if (!hostels || hostels.length === 0) return;

    const points = hostels
      .filter(h => h.latitude && h.longitude)
      .map(h => [h.latitude, h.longitude]);

    if (points.length === 1) {
      map.setView(points[0], 15, { animate: true, duration: 0.8 });
    } else if (points.length > 1) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15, animate: true, duration: 0.8 });
    }
  }, [hostels, map]);

  return null;
}

// Sub-component to center maps during searches containing location query matching
function MapCenterController({ searchQuery }) {
  const map = useMap();

  useEffect(() => {
    if (!searchQuery) return;
    const clean = searchQuery.toLowerCase().trim();
    
    // Find matching coordinates
    const coords = SEARCH_COORDINATES[clean];
    if (coords) {
      map.setView(coords, 14, { animate: true, duration: 0.8 });
    }
  }, [searchQuery, map]);

  return null;
}

export default function MapView({ searchLocation }) {
  const { hostels, activeHostelId, setActiveHostelId } = useSearch();

  const filteredHostels = useMemo(() => {
    return hostels.filter(h => h.latitude && h.longitude);
  }, [hostels]);

  // Determine starting position
  const initialCenter = useMemo(() => {
    if (searchLocation) {
      const clean = searchLocation.toLowerCase().trim();
      const coords = SEARCH_COORDINATES[clean];
      if (coords) return coords;
    }
    
    if (filteredHostels.length > 0) {
      return [filteredHostels[0].latitude, filteredHostels[0].longitude];
    }
    
    return [20.5937, 78.9629]; // default India center
  }, [searchLocation, filteredHostels]);

  const handleMarkerClick = (hostelId) => {
    setActiveHostelId(hostelId);
    const card = document.getElementById(`listing-card-${hostelId}`);
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-slate-100 relative">
      <MapContainer 
        center={initialCenter} 
        zoom={13} 
        style={{ width: '100%', height: '100%', zIndex: 1 }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        
        {/* Render markers */}
        {filteredHostels.map((h) => {
          const isActive = activeHostelId === h.id;
          return (
            <Marker
              key={h.id}
              position={[h.latitude, h.longitude]}
              icon={createPriceIcon(h.starting_rent, isActive)}
              eventHandlers={{
                click: () => handleMarkerClick(h.id),
                mouseover: () => setActiveHostelId(h.id),
                mouseout: () => setActiveHostelId(null)
              }}
            >
              <Popup closeButton={false} offset={[0, -10]}>
                <div className="p-2 text-slate-800 min-w-[120px] font-sans">
                  <h4 className="font-bold text-xs leading-tight mb-1">{h.name}</h4>
                  <p className="text-[10px] text-slate-500 font-semibold mb-1">{h.area}</p>
                  <div className="flex items-center justify-between mt-1.5 border-t border-slate-100 pt-1.5">
                    <span className="text-[11px] font-black text-emerald-800">₹{h.starting_rent}/mo</span>
                    <span className="text-[9px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-bold uppercase">
                      {h.hostel_type}
                    </span>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Sync bounds automatically */}
        <MapBoundsController hostels={filteredHostels} />
        <MapCenterController searchQuery={searchLocation} />
      </MapContainer>
    </div>
  );
}
