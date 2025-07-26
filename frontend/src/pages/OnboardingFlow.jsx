import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { generateDemoQuest } from '../lib/api';
import { calculateAge } from '../utils/dateHelpers';

const moodOptions = ['Adventure', 'Romantic', 'Weird', 'Nature', 'Foodie', 'Cozy'];

export default function OnboardingFlow() {
  const navigate = useNavigate();
  const auth = getAuth();
  const user = auth.currentUser;
  const [selected, setSelected] = useState([]);
  const [time, setTime] = useState(60);
  const [useGPS, setUseGPS] = useState(false);
  const [coords, setCoords] = useState(null);
  const [startLocation, setStartLocation] = useState(null);
  const [city, setCity] = useState('');
  const [dob, setDob] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleMood = (m) => {
    setSelected((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );
  };

  const handleGps = () => {
    const next = !useGPS;
    setUseGPS(next);
    if (next && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setCoords(null)
      );
    }
  };

  useEffect(() => {
    if (!window.google || !window.google.maps || !window.google.maps.places) return;
    const input = document.getElementById('onboard-address');
    if (!input || input._ac) return;
    const ac = new window.google.maps.places.Autocomplete(input);
    input._ac = ac;
    ac.addListener('place_changed', () => {
      const p = ac.getPlace();
      if (!p.geometry) return;
      const { lat, lng } = p.geometry.location.toJSON();
      setStartLocation({ address: p.formatted_address, lat, lng, placeId: p.place_id });
      setCity(p.formatted_address);
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selected.length === 0) {
      setError('Select at least one mood');
      return;
    }
    if (!useGPS && !startLocation) {
      setError('Starting address required');
      return;
    }
    if (!dob) {
      setError('Date of birth required');
      return;
    }
    if (!user) return navigate('/');
    setError('');
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const result = await generateDemoQuest(
        city || 'gps',
        token,
        user.uid,
        useGPS ? coords : null,
        startLocation
      );
      await setDoc(
        doc(db, 'users', user.uid),
        {
          onboarding: { mood: selected, timeLimit: Number(time), useGPS },
          dateOfBirth: dob,
          age: calculateAge(dob),
        },
        { merge: true }
      );
      navigate('/quest-details', { state: { quest: result.quest, questId: result.questId, timeLimit: Number(time) } });
    } catch (err) {
      console.error('onboarding failed', err);
      setError('Failed to start quest');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-8 text-[#0e1b0e]">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6">
        <h1 className="text-2xl font-bold text-center">Customize Your First Quest</h1>
        <div>
          <p className="mb-2 text-center font-medium">What kind of adventure are you in the mood for?</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {moodOptions.map((m) => (
              <button
                type="button"
                key={m}
                onClick={() => toggleMood(m)}
                className={`px-3 py-1 rounded-full border ${selected.includes(m) ? 'bg-[#019863] text-white' : 'bg-white'}`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <div className="text-center">
          <label className="block mb-1 font-medium">Time Available: {time} minutes</label>
          <input
            type="range"
            min="15"
            max="180"
            step="15"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="text-center space-y-2">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={useGPS} onChange={handleGps} />
            Improve quests using your current location
          </label>
          {!useGPS && (
            <input
              id="onboard-address"
              type="text"
              placeholder="Start address"
              defaultValue={city}
              className="w-full border rounded px-3 py-2"
              required
            />
          )}
          <div className="pt-2">
            <label className="block mb-1">Date of Birth</label>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>
        </div>
        {error && <div className="text-red-600 text-sm text-center">{error}</div>}
        <button
          type="submit"
          className="w-full bg-[#019863] text-white py-2 rounded-full"
          disabled={loading}
        >
          {loading ? 'Generating...' : 'Start Quest'}
        </button>
      </form>
    </div>
  );
}
