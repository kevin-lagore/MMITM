import { create } from 'zustand';
import type { ParticipantInput, FindMiddleResponse, AppStatus } from '../types';
import { findMiddle } from '../services/api';

interface AppStore {
  // State
  participants: ParticipantInput[];
  intent: string;
  status: AppStatus;
  error: string | null;
  result: FindMiddleResponse | null;
  selectedVenueId: string | null;

  // Actions
  addParticipant: (participant: Omit<ParticipantInput, 'id'>) => void;
  updateParticipant: (id: string, updates: Partial<ParticipantInput>) => void;
  removeParticipant: (id: string) => void;
  setIntent: (intent: string) => void;
  selectVenue: (venueId: string | null) => void;
  findMeetingPlace: () => Promise<void>;
  reset: () => void;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

const initialState = {
  participants: [],
  intent: '',
  status: 'idle' as AppStatus,
  error: null,
  result: null,
  selectedVenueId: null,
};

export const useAppStore = create<AppStore>((set, get) => ({
  ...initialState,

  addParticipant: (participant) => {
    set((state) => ({
      participants: [
        ...state.participants,
        { ...participant, id: generateId() },
      ],
    }));
  },

  updateParticipant: (id, updates) => {
    set((state) => ({
      participants: state.participants.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    }));
  },

  removeParticipant: (id) => {
    set((state) => ({
      participants: state.participants.filter((p) => p.id !== id),
    }));
  },

  setIntent: (intent) => {
    set({ intent });
  },

  selectVenue: (venueId) => {
    set({ selectedVenueId: venueId });
  },

  findMeetingPlace: async () => {
    const { participants, intent } = get();

    if (participants.length < 2) {
      set({ error: 'Please add at least 2 participants', status: 'error' });
      return;
    }

    if (!intent.trim()) {
      set({ error: 'Please describe what type of place you\'re looking for', status: 'error' });
      return;
    }

    set({ status: 'loading', error: null });

    try {
      const result = await findMiddle(participants, intent);
      set({
        status: 'success',
        result,
        selectedVenueId: result.recommendedVenues[0]?.id || null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      set({ status: 'error', error: message });
    }
  },

  reset: () => {
    set(initialState);
  },
}));
