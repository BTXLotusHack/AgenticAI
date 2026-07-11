import React, { useState } from 'react';
import type { TripPlanningItineraryV1, TripPlanningRequestV1 } from '@loopin/contracts';

export function AITripPlannerPage() {
  const [origin, setOrigin] = useState('San Francisco, CA');
  const [destination, setDestination] = useState('Los Angeles, CA');
  const [days, setDays] = useState(3);
  const [interests, setInterests] = useState('scenic, food, history');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [itinerary, setItinerary] = useState<TripPlanningItineraryV1 | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setItinerary(null);

    const payload: TripPlanningRequestV1 = {
      schemaVersion: 1,
      origin,
      destination,
      days,
      interests: interests.split(',').map(i => i.trim()).filter(Boolean),
      maxStopsPerDay: 4
    };

    try {
      const response = await fetch('http://localhost:3001/v1/trip-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text);
      }

      const data = await response.json();
      setItinerary(data.itinerary);
    } catch (err: any) {
      setError(err.message || 'Failed to generate itinerary');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="product-layout" style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>AI Trip Planner</h1>
        <p style={{ color: '#666' }}>Plan your perfect road trip with AI</p>
      </header>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: '#f5f5f5', padding: '1.5rem', borderRadius: '8px' }}>
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>Origin</label>
          <input type="text" value={origin} onChange={e => setOrigin(e.target.value)} required style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>Destination</label>
          <input type="text" value={destination} onChange={e => setDestination(e.target.value)} required style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>Days</label>
          <input type="number" value={days} min={1} max={14} onChange={e => setDays(parseInt(e.target.value))} required style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>Interests (comma separated)</label>
          <input type="text" value={interests} onChange={e => setInterests(e.target.value)} required style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
        </div>
        <button type="submit" disabled={loading} style={{ background: '#000', color: '#fff', padding: '0.75rem', borderRadius: '4px', fontWeight: 'bold', border: 'none', cursor: 'pointer', marginTop: '1rem' }}>
          {loading ? 'Generating...' : 'Generate Itinerary'}
        </button>
      </form>

      {error && (
        <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#fee', color: '#c00', borderRadius: '8px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {loading && (
        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <p style={{ fontSize: '1.2rem', color: '#666' }}>AI is thinking...</p>
        </div>
      )}

      {itinerary && (
        <div style={{ marginTop: '3rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>{itinerary.title}</h2>
          {itinerary.summary && <p style={{ marginBottom: '2rem', color: '#444' }}>{itinerary.summary}</p>}

          {itinerary.warnings && itinerary.warnings.length > 0 && (
            <div style={{ marginBottom: '2rem', padding: '1rem', background: '#fff3cd', color: '#856404', borderRadius: '8px' }}>
              <strong>Warnings:</strong>
              <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
                {itinerary.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {itinerary.days.map((day) => (
              <div key={day.dayNumber} style={{ border: '1px solid #eaeaea', borderRadius: '8px', padding: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', borderBottom: '2px solid #000', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                  Day {day.dayNumber} {day.theme && `- ${day.theme}`}
                </h3>
                
                {day.stops.length === 0 ? (
                  <p style={{ color: '#888' }}>No stops planned.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {day.stops.map((stop, i) => (
                      <div key={i} style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', background: '#000', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 'bold' }}>
                          {i + 1}
                        </div>
                        <div>
                          <h4 style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{stop.name}</h4>
                          <span style={{ fontSize: '0.85rem', background: '#eee', padding: '0.2rem 0.5rem', borderRadius: '12px', display: 'inline-block', margin: '0.25rem 0' }}>{stop.type}</span>
                          <p style={{ color: '#555', marginTop: '0.5rem' }}>{stop.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
