import GoogleMapReact from "google-map-react";
import { useEffect, useRef } from "react";

const UserMarker = () => (
  <div className="relative flex items-center justify-center">
    <div className="absolute h-4 w-4 rounded-full bg-blue-400 opacity-75 animate-ping" />
    <div className="relative h-3 w-3 rounded-full bg-blue-600" />
  </div>
);

const StopMarker = ({ visited, current, final, name }) => {
  let icon = "📍";
  if (final) icon = "🏁";
  if (current) icon = "⭐";
  if (visited && !current) icon = "✅";
  return (
    <div title={name} className="text-2xl">
      {icon}
    </div>
  );
};

export default function LiveQuestMap({
  stops = [],
  visitedIndex = 0,
  userLocation,
  polylinePoints = [],
}) {
  const mapRef = useRef(null);
  const mapsRef = useRef(null);
  const polyRef = useRef(null);
  const drawPolyline = () => {
    if (!mapRef.current || !mapsRef.current) return;
    if (polyRef.current) {
      polyRef.current.setMap(null);
      polyRef.current = null;
    }
    if (!polylinePoints.length) return;
    const path = polylinePoints.map((p) => new mapsRef.current.LatLng(p.lat, p.lng));
    polyRef.current = new mapsRef.current.Polyline({
      path,
      geodesic: true,
      strokeColor: "#019863",
      strokeOpacity: 0.9,
      strokeWeight: 5,
    });
    polyRef.current.setMap(mapRef.current);
  };

  useEffect(() => {
    drawPolyline();
  }, [polylinePoints]);

  const panTimeout = useRef(null);

  useEffect(() => {
    if (!mapRef.current || !userLocation) return;
    if (panTimeout.current) clearTimeout(panTimeout.current);
    panTimeout.current = setTimeout(() => {
      mapRef.current.panTo(userLocation);
    }, 500);
  }, [userLocation]);

  useEffect(() => {

    if (!mapRef.current || !stops.length) return;
    const target = stops[visitedIndex] || stops[stops.length - 1];
    mapRef.current.panTo(target);
  }, [visitedIndex, stops]);

  const center = userLocation || stops[0];

  return (
    <div className="w-full h-[60vh] max-h-[500px] rounded-xl overflow-hidden shadow-md">
      <GoogleMapReact
        bootstrapURLKeys={{ key: import.meta.env.VITE_GOOGLE_MAPS_API_KEY }}
        defaultCenter={center}
        defaultZoom={14}
        yesIWantToUseGoogleMapApiInternals
        onGoogleApiLoaded={({ map, maps }) => {
          mapRef.current = map;
          mapsRef.current = maps;
          drawPolyline();
        }}
      >
        {userLocation && <UserMarker lat={userLocation.lat} lng={userLocation.lng} />}
        {stops.map((stop, idx) => (
          <StopMarker
            key={idx}
            lat={stop.lat}
            lng={stop.lng}
            visited={idx < visitedIndex}
            current={idx === visitedIndex}
            final={idx === stops.length - 1}
            name={stop.name}
          />
        ))}
      </GoogleMapReact>
    </div>
  );
}
