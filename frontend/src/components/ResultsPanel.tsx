import { useAppStore } from '../store/appStore';
import { VenueCard } from './VenueCard';

export function ResultsPanel() {
  const result = useAppStore((state) => state.result);
  const selectedVenueId = useAppStore((state) => state.selectedVenueId);
  const selectVenue = useAppStore((state) => state.selectVenue);

  if (!result) {
    return null;
  }

  if (result.recommendedVenues.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">🔍</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No venues found</h3>
        <p className="text-gray-500">
          Try a different type of place or adjust participant locations.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          Recommended Places
        </h2>
        <span className="text-sm text-gray-500">
          {result.recommendedVenues.length} found
        </span>
      </div>

      <div className="space-y-4">
        {result.recommendedVenues.map((venue, index) => (
          <VenueCard
            key={venue.id}
            venue={venue}
            rank={index}
            isSelected={venue.id === selectedVenueId}
            onClick={() => selectVenue(venue.id)}
          />
        ))}
      </div>
    </div>
  );
}
