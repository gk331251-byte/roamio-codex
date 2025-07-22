import React from "react";
import GoogleMapReact from "google-map-react";
import { decode } from "@googlemaps/polyline-codec";

const typeIcons = {
  museum: "🏛️",
  restaurant: "🍽️",
  park: "🌳",
  tourist_attraction: "📸",
  cafe: "☕",
  bar: "🍸",
  bookstore: "📚",
  shopping_mall: "🛍️",
  art_gallery: "🖼️",
  aquarium: "🐠",
  cemetery: "🪦",
  grocery_or_supermarket: "🛒",
  stadium: "🎯",
  Unknown: "📍",
};

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const Pin = ({ type, name }) => {
  const icon = typeIcons[type] || typeIcons.Unknown;
  return (
    <div className="text-2xl" title={name}>
      {icon}
    </div>
  );
};

const RouteMap = ({ places = [], route = null }) => {
  const parseLatLng = (val) => {
    const num = parseFloat(val);
    return isNaN(num) ? null : num;
  };

  const orderedPlaces = places.filter(
    (p) => parseLatLng(p.lat) !== null && parseLatLng(p.lng) !== null
  );
  console.log("Route legs:", route?.legs);
    // ✅ Add logs here for debugging
console.log("PLACES:", orderedPlaces);
console.log("ROUTE LEGS:", route?.legs);
console.log("LEG 0 FULL:", route?.legs?.[0]);
console.log("LEG 0 DURATION:", route?.legs?.[0]?.duration);



  if (!orderedPlaces.length) return null;

  const center = {
    lat: parseLatLng(orderedPlaces[0].lat),
    lng: parseLatLng(orderedPlaces[0].lng),
  };

  const drawRoute = (map, maps) => {
    if (!route || !route.polyline) return;

    try {
      const decodedPath = decode(route.polyline).map(
        ([lat, lng]) => new maps.LatLng(lat, lng)
      );
      const polyline = new maps.Polyline({
        path: decodedPath,
        geodesic: true,
        strokeColor: "#019863",
        strokeOpacity: 0.9,
        strokeWeight: 5,
      });

      polyline.setMap(map);
    } catch (err) {
      console.error("Failed to render polyline:", err);
    }
  };

  return (
    <div className="w-full my-6 space-y-4">
      <div className="h-[400px] w-full rounded-xl overflow-hidden shadow-md">
        <GoogleMapReact
          bootstrapURLKeys={{ key: GOOGLE_MAPS_API_KEY }}
          defaultCenter={center}
          defaultZoom={13}
          yesIWantToUseGoogleMapApiInternals
          onGoogleApiLoaded={({ map, maps }) => drawRoute(map, maps)}
        >
          {orderedPlaces.map((place, index) => (
            <Pin
              key={index}
              lat={parseLatLng(place.lat)}
              lng={parseLatLng(place.lng)}
              name={place.name}
              type={place.type}
            />
          ))}
        </GoogleMapReact>
      </div>

      <div className="space-y-4 px-4 mt-4 text-left">
        {orderedPlaces.map((place, idx) => {
          const isFirst = idx === 0;
          const isLast = idx === orderedPlaces.length - 1;

          const travelFromPrevious = idx > 0 ? route?.legs?.[idx - 1]?.duration?.text : null;
          const travelToNext = !isLast ? route?.legs?.[idx]?.duration?.text : null;

          return (
            <div
              key={idx}
              className="border-l-4 border-green-600 pl-4 py-2 bg-white rounded-md shadow-sm transition-all duration-300 ease-in-out hover:bg-green-50"
            >
              <div className="font-bold text-lg">
                {place.name}{" "}
                <span className="text-gray-500">({place.type || "Unknown"})</span>
              </div>

              <div className="text-sm text-gray-700 space-y-1">
                {isFirst && <div>🟥 Starting Point</div>}
                {travelFromPrevious && <div>⏱️ Arrival from last: ~{travelFromPrevious}</div>}
                {travelToNext && <div>🛴 Travel to next: ~{travelToNext}</div>}
                {isLast && <div>🏁 Final Destination</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RouteMap;
