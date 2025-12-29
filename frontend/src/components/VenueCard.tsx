import type { RankedVenue, TransportMode } from '../types';
import { mapLinks } from '../services/api';

const transportIcons: Record<TransportMode, string> = {
  driving: '🚗',
  transit: '🚇',
  cycling: '🚴',
  walking: '🚶',
};

function formatDuration(seconds: number): string {
  if (seconds < 0) return 'N/A';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return `${hours}h ${remainingMins}m`;
}

interface VenueCardProps {
  venue: RankedVenue;
  rank: number;
  isSelected: boolean;
  onClick: () => void;
}

export function VenueCard({ venue, rank, isSelected, onClick }: VenueCardProps) {
  return (
    <div
      onClick={onClick}
      className={`card cursor-pointer transition-all duration-200 animate-slide-up ${
        isSelected
          ? 'ring-2 ring-primary-500 shadow-lg'
          : 'hover:shadow-lg hover:-translate-y-0.5'
      }`}
      style={{ animationDelay: `${rank * 50}ms` }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-3">
          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                          text-white text-sm font-bold shadow-sm ${
                            rank === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-500' :
                            rank === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400' :
                            rank === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-700' :
                            'bg-gray-400'
                          }`}>
            {rank + 1}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{venue.name}</h3>
            <p className="text-sm text-gray-500">{venue.category}</p>
          </div>
        </div>
        {venue.rating && (
          <div className="flex items-center gap-1 text-amber-500">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
            </svg>
            <span className="text-sm font-medium">{venue.rating.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* Address */}
      <p className="text-sm text-gray-600 mb-4">{venue.address}</p>

      {/* Fairness badge */}
      <div className="flex items-center gap-2 mb-4">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
          venue.fairnessScore > 0.8 ? 'bg-emerald-100 text-emerald-700' :
          venue.fairnessScore > 0.6 ? 'bg-amber-100 text-amber-700' :
          'bg-red-100 text-red-700'
        }`}>
          {venue.fairnessScore > 0.8 ? '✨ Great fairness' :
           venue.fairnessScore > 0.6 ? '👍 Good balance' :
           '⚠️ Some variation'}
        </span>
      </div>

      {/* Travel times */}
      <div className="space-y-2 mb-4">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Travel Times</p>
        <div className="grid gap-2">
          {venue.travelTimes.map((tt) => (
            <div
              key={tt.participantName}
              className="flex items-center justify-between py-1.5 px-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <span>{transportIcons[tt.transportMode]}</span>
                <span className="text-sm text-gray-700">{tt.participantName}</span>
              </div>
              <span className="text-sm font-medium text-gray-900">
                {formatDuration(tt.durationSeconds)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Explanation */}
      <p className="text-sm text-gray-600 italic mb-4">{venue.explanation}</p>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <a
          href={mapLinks.googleMapsDirections(venue.location.lat, venue.location.lng)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary text-sm py-2 px-3 inline-flex items-center gap-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
          </svg>
          Google Maps
        </a>
        <a
          href={mapLinks.waze(venue.location.lat, venue.location.lng)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary text-sm py-2 px-3"
          onClick={(e) => e.stopPropagation()}
        >
          Waze
        </a>
        <a
          href={mapLinks.appleMaps(venue.location.lat, venue.location.lng, venue.name)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary text-sm py-2 px-3"
          onClick={(e) => e.stopPropagation()}
        >
          Apple Maps
        </a>
      </div>
    </div>
  );
}
