import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const cellSites = [
  { id: "001", name: "Site 001", coordinates: [8.477, 124.645], status: "Active" },
  { id: "002", name: "Site 002", coordinates: [7.25, 125.167], status: "Inactive" },
  { id: "003", name: "Site 003", coordinates: [6.917, 122.083], status: "Active" },
  { id: "004", name: "Site 004", coordinates: [6.1, 125.2], status: "Inactive" },
  { id: "005", name: "Site 005", coordinates: [8.0, 125.5], status: "Active" },
  { id: "006", name: "Site 006", coordinates: [7.3, 124.2], status: "Active" },
  { id: "007", name: "Site 007", coordinates: [6.5, 122.6], status: "Inactive" },
  { id: "008", name: "Site 008", coordinates: [7.8, 125.0], status: "Inactive" },
  { id: "009", name: "Site 009", coordinates: [8.4, 123.8], status: "Active" },
  { id: "010", name: "Site 010", coordinates: [6.7, 124.4], status: "Active" }
];

const markerIcons = {
  Active: L.icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    shadowSize: [41, 41]
  }),
  Inactive: L.icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    shadowSize: [41, 41]
  })
};

const MapLegend = () => {
  return (
    <div
      style={{
        position: "absolute",
        bottom: "10px",
        left: "10px",
        backgroundColor: "rgba(255, 255, 255, 0.8)",
        padding: "8px",
        borderRadius: "8px",
        boxShadow: "0 0 6px rgba(0, 0, 0, 0.2)",
        zIndex: 1000
      }}
    >
      <h3 className="font-semibold mb-2">Alarm Legend</h3>
      <div className="flex flex-col">
        <div className="flex items-center mb-1">
          <span className="w-4 h-4 bg-red-600 rounded-full inline-block mr-2"></span>
          <span>Critical</span>
        </div>
        <div className="flex items-center mb-1">
          <span className="w-4 h-4 bg-orange-500 rounded-full inline-block mr-2"></span>
          <span>Major</span>
        </div>
        <div className="flex items-center mb-1">
          <span className="w-4 h-4 bg-yellow-400 rounded-full inline-block mr-2"></span>
          <span>Minor</span>
        </div>
        <div className="flex items-center mb-1">
          <span className="w-4 h-4 bg-yellow-200 rounded-full inline-block mr-2"></span>
          <span>Warning</span>
        </div>
        <div className="flex items-center mb-1">
          <span className="w-4 h-4 bg-green-500 rounded-full inline-block mr-2"></span>
          <span>Normal</span>
        </div>
        <div className="flex items-center mb-1">
          <span className="w-4 h-4 bg-blue-400 rounded-full inline-block mr-2"></span>
          <span>Informational</span>
        </div>
      </div>
    </div>
  );
};

const CellSitesTopology = () => {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Cell Sites - Mindanao, Philippines</h1>
      <p className="mb-4">A network visualization of cell sites in Mindanao, Philippines, showing site statuses.</p>

      <div style={{ position: "relative", height: "700px", width: "100%" }}>
        <MapContainer center={[7.5, 124.5]} zoom={7} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          {cellSites.map((site) => (
            <Marker key={site.id} position={site.coordinates} icon={markerIcons[site.status]}>
              <Popup>{site.name} - Status: {site.status}</Popup>
            </Marker>
          ))}
        </MapContainer>
        <MapLegend />
      </div>
    </div>
  );
};

export default CellSitesTopology;
