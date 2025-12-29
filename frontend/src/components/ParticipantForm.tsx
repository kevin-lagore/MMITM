import { useState } from 'react';
import type { TransportMode } from '../types';
import { useAppStore } from '../store/appStore';
import { AddressInput } from './AddressInput';

const transportModes: { value: TransportMode; label: string; icon: string }[] = [
  { value: 'driving', label: 'Driving', icon: '🚗' },
  { value: 'transit', label: 'Transit', icon: '🚇' },
  { value: 'cycling', label: 'Cycling', icon: '🚴' },
  { value: 'walking', label: 'Walking', icon: '🚶' },
];

export function ParticipantForm() {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [transportMode, setTransportMode] = useState<TransportMode>('driving');
  const addParticipant = useAppStore((state) => state.addParticipant);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !address.trim()) return;

    addParticipant({ name: name.trim(), address: address.trim(), transportMode });
    setName('');
    setAddress('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="label">
          Name
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Alice"
          className="input"
          required
        />
      </div>

      <div>
        <label htmlFor="address" className="label">
          Starting Address
        </label>
        <AddressInput
          id="address"
          value={address}
          onChange={setAddress}
          placeholder="Start typing an address..."
        />
      </div>

      <div>
        <label htmlFor="transport" className="label">
          Transport Mode
        </label>
        <div className="grid grid-cols-4 gap-2">
          {transportModes.map((mode) => (
            <button
              key={mode.value}
              type="button"
              onClick={() => setTransportMode(mode.value)}
              className={`py-2.5 px-3 rounded-lg border text-center transition-all duration-200 ${
                transportMode === mode.value
                  ? 'bg-primary-50 border-primary-300 text-primary-700 shadow-sm'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="text-lg">{mode.icon}</span>
              <span className="block text-xs mt-1">{mode.label}</span>
            </button>
          ))}
        </div>
      </div>

      <button type="submit" className="btn-primary w-full">
        Add Participant
      </button>
    </form>
  );
}
