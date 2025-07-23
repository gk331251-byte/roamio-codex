import React from "react";

// Simple icon map (you can expand this or swap with real icons later)
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
  Unknown: "📍"
};

export default function PlaceItem({ place }) {
  // Handle plain strings (cached quest)
  if (typeof place === "string") {
    return <li>{place}</li>;
  }

  const name = place?.name || "Unnamed Place";
  const type = place?.type || "Unknown";
  const icon = typeIcons[type] || typeIcons["Unknown"];
  const visit = place.visitDuration || 10;
  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`;

  return (
    <li className="flex items-center space-x-2">
      <span>{icon}</span>
      <a
        href={mapsLink}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:underline"
      >
        <strong>{name}</strong>
      </a>
      <span className="text-sm text-gray-500">({type}, ~{visit} min)</span>
    </li>
  );
}
