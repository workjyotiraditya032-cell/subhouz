/**
 * Helper to render custom Google HTML Advanced Markers.
 * Sets pricing tag styles, click triggers, and mouse hover bindings.
 */
export default function createPropertyMarker({
  google,
  map,
  hostel,
  isActive,
  onClick,
  onHover,
  onHoverOut
}) {
  const price = hostel.starting_rent || 0;
  const formattedPrice = price >= 1000 ? `${(price / 1000).toFixed(1)}k` : price;
  
  const priceTag = document.createElement("div");
  priceTag.className = `shadow-[0_4px_16px_rgba(0,0,0,0.12)] rounded-full px-3.5 py-1.5 font-bold text-xs border transition-all duration-300 flex items-center justify-center whitespace-nowrap cursor-pointer transform ${
    isActive 
      ? 'bg-emerald-800 text-white border-emerald-950 scale-110 ring-4 ring-emerald-500/20 font-black' 
      : 'bg-white text-emerald-800 border-emerald-700 hover:bg-slate-50 font-bold hover:scale-[1.03]'
  }`;
  priceTag.innerHTML = `₹${formattedPrice}`;
  
  const marker = new google.maps.marker.AdvancedMarkerElement({
    map,
    position: { lat: hostel.latitude, lng: hostel.longitude },
    content: priceTag,
    title: hostel.name
  });
  
  marker.addListener("click", onClick);
  priceTag.addEventListener("mouseenter", onHover);
  priceTag.addEventListener("mouseleave", onHoverOut);
  
  return { marker, element: priceTag };
}
