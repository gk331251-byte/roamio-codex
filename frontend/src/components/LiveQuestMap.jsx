import GoogleMapReact from "google-map-react";
import { useEffect, useRef } from "react";

const UserMarker = () => <div className="text-2xl">🧍‍♂️</div>;

const StopMarker = ({ visited, current }) => (
  <div className={`text-2xl ${current ? "text-green-600" : visited ? "text-gray-400" : "text-red-500"}`}>
    📍
  </div>
);

export default function LiveQuestMap({ stops = [], visitedIndex = 0, userLocation }) {
  const mapRef = useRef(null);
  const mapsRef = useRef(null);

  const drawRoute = () => {
    if (!mapRef.current || !mapsRef.current || stops.length < 2) return;

    const directionsService = new mapsRef.current.DirectionsService();
    const directionsRenderer = new mapsRef.current.DirectionsRenderer({ suppressMarkers: true });
    directionsRenderer.setMap(mapRef.current);

    directionsService.route(
      {
        origin: stops[0],
        destination: stops[stops.length - 1],
        waypoints: stops.slice(1, -1).map((s) => ({ location: s })),
        travelMode: mapsRef.current.TravelMode.WALKING,
      },
      (result, status) => {
        if (status === "OK") {
          directionsRenderer.setDirections(result);
        } else {
          console.error("Directions request failed due to " + status);
        }
      }
    );
  };

  useEffect(() => {
    drawRoute();
  }, [stops]);

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
          drawRoute();
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
