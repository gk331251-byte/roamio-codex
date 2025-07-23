import GoogleMapReact from "google-map-react";
import { useEffect, useRef } from "react";

const UserMarker = () => <div className="text-2xl">🧍‍♂️</div>;

const StopMarker = ({ visited, current }) => (
  <div className={`text-2xl ${current ? "text-green-600" : visited ? "text-gray-400" : "text-red-500"}`}>
    📍
  </div>
);

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

  const center = userLocation || stops[0];

  return (
    <div className="h-[300px] w-full rounded-xl overflow-hidden shadow-md">
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
          />
        ))}
      </GoogleMapReact>
    </div>
  );
}
