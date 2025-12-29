import { useEffect, useRef } from 'react';
import { MapContainer as LeafletMap, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useAppStore } from '../store/appStore';
import type { LatLng } from '../types';

// Fix Leaflet default marker icon issue
delete (L.Icon.Default.prototype as { _getIconUrl?: () => string })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom marker icons
const createParticipantIcon = (index: number) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div class="participant-marker">${index + 1}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

const createVenueIcon = (isSelected: boolean) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div class="venue-marker ${isSelected ? 'selected' : ''}">
      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/>
      </svg>
    </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

// Component to fit bounds when results change
function MapBoundsUpdater() {
  const map = useMap();
  const result = useAppStore((state) => state.result);
  const participants = useAppStore((state) => state.participants);

  useEffect(() => {
    if (result && result.participantLocations.length > 0) {
      const allPoints: LatLng[] = [
        ...result.participantLocations.map(p => p.location),
        ...result.recommendedVenues.map(v => v.location),
        result.searchArea.center,
      ];

      const bounds = L.latLngBounds(allPoints.map(p => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, result, participants]);

  return null;
}

export function MapView() {
  const result = useAppStore((state) => state.result);
  const selectedVenueId = useAppStore((state) => state.selectedVenueId);
  const selectVenue = useAppStore((state) => state.selectVenue);
  const mapRef = useRef<L.Map>(null);

  // Default center (London)
  const defaultCenter: [number, number] = [51.5074, -0.1278];
  const defaultZoom = 12;

  return (
    <LeafletMap
      ref={mapRef}
      center={defaultCenter}
      zoom={defaultZoom}
      className="w-full h-full min-h-[400px]"
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapBoundsUpdater />

      {/* Search area circle */}
      {result && (
        <Circle
          center={[result.searchArea.center.lat, result.searchArea.center.lng]}
          radius={result.searchArea.radiusMeters}
          pathOptions={{
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.1,
            weight: 2,
            dashArray: '5, 5',
          }}
        />
      )}

      {/* Participant markers */}
      {result?.participantLocations.map((participant, index) => (
        <Marker
          key={participant.name}
          position={[participant.location.lat, participant.location.lng]}
          icon={createParticipantIcon(index)}
        >
          <Popup>
            <div className="text-center">
              <strong>{participant.name}</strong>
              <br />
              <span className="text-gray-500 text-sm">Starting point</span>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Venue markers */}
      {result?.recommendedVenues.map((venue) => (
        <Marker
          key={venue.id}
          position={[venue.location.lat, venue.location.lng]}
          icon={createVenueIcon(venue.id === selectedVenueId)}
          eventHandlers={{
            click: () => selectVenue(venue.id),
          }}
        >
          <Popup>
            <div className="min-w-[150px]">
              <strong className="text-primary-700">{venue.name}</strong>
              <br />
              <span className="text-gray-500 text-xs">{venue.category}</span>
              <br />
              <span className="text-emerald-600 text-sm font-medium">
                {venue.explanation.split('.')[0]}
              </span>
            </div>
          </Popup>
        </Marker>
      ))}
    </LeafletMap>
  );
}
