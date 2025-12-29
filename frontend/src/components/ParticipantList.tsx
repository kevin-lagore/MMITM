import { useAppStore } from '../store/appStore';
import type { TransportMode } from '../types';

const transportIcons: Record<TransportMode, string> = {
  driving: '🚗',
  transit: '🚇',
  cycling: '🚴',
  walking: '🚶',
};

export function ParticipantList() {
  const participants = useAppStore((state) => state.participants);
  const removeParticipant = useAppStore((state) => state.removeParticipant);

  if (participants.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p className="text-4xl mb-2">👥</p>
        <p className="text-sm">No participants yet</p>
        <p className="text-xs mt-1">Add at least 2 people to find your meeting spot</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {participants.map((participant, index) => (
        <div
          key={participant.id}
          className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-100
                     animate-fade-in hover:bg-gray-100 transition-colors group"
        >
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-500 text-white
                          flex items-center justify-center text-sm font-bold shadow-sm">
            {index + 1}
          </div>
          <div className="flex-grow min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 truncate">
                {participant.name}
              </span>
              <span className="text-lg" title={participant.transportMode}>
                {transportIcons[participant.transportMode]}
              </span>
            </div>
            <p className="text-sm text-gray-500 truncate mt-0.5">
              {participant.address}
            </p>
          </div>
          <button
            onClick={() => removeParticipant(participant.id)}
            className="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-500
                       hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
            title="Remove participant"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
