import { useAppStore } from '../store/appStore';

const suggestions = [
  'coffee shop',
  'pub for lunch',
  'park',
  'restaurant for dinner',
  'quiet cafe to work',
  'bar with outdoor seating',
];

export function IntentInput() {
  const intent = useAppStore((state) => state.intent);
  const setIntent = useAppStore((state) => state.setIntent);

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="intent" className="label">
          What kind of place are you looking for?
        </label>
        <input
          type="text"
          id="intent"
          value={intent}
          onChange={(e) => setIntent(e.target.value)}
          placeholder="e.g., coffee shop, pub for lunch, park..."
          className="input"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => setIntent(suggestion)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all duration-200 ${
              intent === suggestion
                ? 'bg-primary-50 border-primary-300 text-primary-700'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
            }`}
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
