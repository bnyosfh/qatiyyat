import React, { useState, useEffect } from 'react';
import { Trip } from './types';
import { LOCAL_STORAGE_KEY } from './constants';
import { Dashboard } from './pages/Dashboard';
import { TripDetails } from './pages/TripDetails';

const App: React.FC = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [currentTripId, setCurrentTripId] = useState<string | null>(null);

  // Load from local storage on mount
  useEffect(() => {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      try {
        setTrips(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse trips", e);
      }
    }
  }, []);

  // Save to local storage whenever trips change
  useEffect(() => {
    if (trips.length > 0) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(trips));
    }
  }, [trips]);

  const handleCreateTrip = (newTrip: Trip) => {
    setTrips(prev => [newTrip, ...prev]);
  };

  const handleUpdateTrip = (updatedTrip: Trip) => {
    setTrips(prev => prev.map(t => t.id === updatedTrip.id ? updatedTrip : t));
  };
  
  const handleDeleteTrip = (id: string) => {
     setTrips(prev => prev.filter(t => t.id !== id));
  }

  const activeTrip = trips.find(t => t.id === currentTripId);

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentTripId(null)}>
              <div className="bg-blue-600 w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-lg">Q</div>
              <span className="font-bold text-xl text-gray-900">Qatta Manager</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTrip ? (
          <TripDetails 
            trip={activeTrip} 
            onUpdateTrip={handleUpdateTrip} 
            onBack={() => setCurrentTripId(null)} 
          />
        ) : (
          <Dashboard 
            trips={trips} 
            onCreateTrip={handleCreateTrip} 
            onUpdateTrip={handleUpdateTrip}
            onSelectTrip={setCurrentTripId}
            onDeleteTrip={handleDeleteTrip}
          />
        )}
      </main>
    </div>
  );
};

export default App;