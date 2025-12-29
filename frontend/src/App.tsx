import { useAppStore } from './store/appStore';
import { ParticipantForm } from './components/ParticipantForm';
import { ParticipantList } from './components/ParticipantList';
import { IntentInput } from './components/IntentInput';
import { MapView } from './components/MapContainer';
import { ResultsPanel } from './components/ResultsPanel';

function App() {
  const status = useAppStore((state) => state.status);
  const error = useAppStore((state) => state.error);
  const result = useAppStore((state) => state.result);
  const participants = useAppStore((state) => state.participants);
  const findMeetingPlace = useAppStore((state) => state.findMeetingPlace);
  const reset = useAppStore((state) => state.reset);

  const canSearch = participants.length >= 2 && status !== 'loading';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600
                            flex items-center justify-center shadow-lg shadow-primary-500/20">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Meet in the Middle</h1>
                <p className="text-sm text-gray-500">Find fair meeting spots based on travel time</p>
              </div>
            </div>
            {result && (
              <button onClick={reset} className="btn-secondary">
                Start Over
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Input */}
          <div className="lg:col-span-1 space-y-6">
            {/* Participants Section */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-600
                              flex items-center justify-center text-sm">1</span>
                Add Participants
              </h2>
              <ParticipantForm />
            </div>

            {/* Participant List */}
            {participants.length > 0 && (
              <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="text-primary-500">👥</span>
                  Participants ({participants.length})
                </h2>
                <ParticipantList />
              </div>
            )}

            {/* Intent Section */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-600
                              flex items-center justify-center text-sm">2</span>
                Destination Type
              </h2>
              <IntentInput />
            </div>

            {/* Search Button */}
            <button
              onClick={findMeetingPlace}
              disabled={!canSearch}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3"
            >
              {status === 'loading' ? (
                <>
                  <div className="loader w-5 h-5 border-2 border-white/30 border-t-white"></div>
                  Finding your spot...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                  </svg>
                  Find Meeting Place
                </>
              )}
            </button>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg animate-fade-in">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}

            {/* Results Panel (mobile) */}
            <div className="lg:hidden">
              <ResultsPanel />
            </div>
          </div>

          {/* Right Column - Map & Results */}
          <div className="lg:col-span-2 space-y-6">
            {/* Map */}
            <div className="card p-0 overflow-hidden h-[400px] lg:h-[500px]">
              <MapView />
            </div>

            {/* Results Panel (desktop) */}
            <div className="hidden lg:block">
              <ResultsPanel />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            Meet in the Middle - Find fair meeting spots for everyone
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
