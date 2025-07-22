import { useEffect, useState } from "react";
import GoogleMapReact from "google-map-react";

function RouteMap({ places, GOOGLE_MAPS_API_KEY }) {
  const [routeData, setRouteData] = useState(null);

  useEffect(() => {
    const fetchRoute = async () => {
      try {
        const coords = places.map(place => ({ lat: place.coordinates.lat, lng: place.coordinates.lng }));
        const response = await fetch(`http://127.0.0.1:8000/route?places=${encodeURIComponent(JSON.stringify(coords))}`);
        const data = await response.json();
        setRouteData(data.route);
      } catch (error) {
        console.error("Error fetching route:", error);
      }
    };

    if (places && places.length > 1) {
      fetchRoute();
    }
  }, [places]);

  return (
    <div className="w-full h-[500px] bg-gray-900 rounded-xl shadow-lg">
      <GoogleMapReact
        bootstrapURLKeys={{ key: GOOGLE_MAPS_API_KEY }}
        defaultCenter={places[0].coordinates}
        defaultZoom={12}
      >
        {places.map((place, index) => (
          <div key={index} lat={place.coordinates.lat} lng={place.coordinates.lng} className="text-white">
            {place.name}
          </div>
        ))}
      </GoogleMapReact>
    </div>
  );
}

export default RouteMap;
