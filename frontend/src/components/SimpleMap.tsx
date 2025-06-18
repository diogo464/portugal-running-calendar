import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { LatLngExpression, icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers
const DefaultIcon = icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const SimpleMap = () => {
  // Center of Portugal coordinates
  const position: LatLngExpression = [39.3999, -8.2245];

  return (
    <div className="w-full h-64 mb-6 bg-black">
      <MapContainer 
        center={position} 
        zoom={7} 
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
        className="rounded-lg"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position} icon={DefaultIcon}>
          <Popup>
            Portugal Running Events Map
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};

export default SimpleMap;
