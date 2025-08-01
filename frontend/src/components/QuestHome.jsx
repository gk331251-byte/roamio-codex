import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { generateQuest, createGroupQuest, getActiveQuest, getQuest, leaveGroup, validatePremium, getUserXP } from "../lib/api.js";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import PlaceItem from "./PlaceItem";
import RouteMap from "./RouteMap";
import LocationDetection from "./LocationDetection/LocationDetection";
import { logError, logUserActionError } from "../lib/errorLogger";
import googleMapsLoader from "../services/googleMapsLoader";

const _toQuestObj = (doc) => {
  if (!doc || !doc.fields) return doc;
  return Object.keys(doc.fields).reduce((acc, k) => {
    const v = doc.fields[k];
    if (v.stringValue !== undefined) acc[k] = v.stringValue;
    else if (v.integerValue !== undefined) acc[k] = parseInt(v.integerValue, 10);
    else if (v.doubleValue !== undefined) acc[k] = v.doubleValue;
    else if (v.arrayValue) acc[k] = (v.arrayValue.values || []).map(_toQuestObj);
    else if (v.mapValue) acc[k] = _toQuestObj({ fields: v.mapValue.fields || {} });
    return acc;
  }, {});
};

const moodOptions = [
  { 
    value: "adventurous", 
    label: "Adventurous", 
    icon: "🗺️", 
    gradient: "from-earth-clay-400 to-earth-clay-600", 
    bgColor: "bg-earth-clay-50",
    borderColor: "border-earth-clay-200",
    textColor: "text-earth-clay-700",
    description: "Bold exploration & discovery",
    preview: "Uncover hidden trails and local secrets"
  },
  { 
    value: "chill", 
    label: "Chill", 
    icon: "☕", 
    gradient: "from-sage-400 to-sage-600", 
    bgColor: "bg-sage-50",
    borderColor: "border-sage-200",
    textColor: "text-sage-700",
    description: "Relaxed & peaceful vibes",
    preview: "Cozy cafes and tranquil spots"
  },
  { 
    value: "romantic", 
    label: "Romantic", 
    icon: "💕", 
    gradient: "from-rose-400 to-rose-600", 
    bgColor: "bg-rose-50",
    borderColor: "border-rose-200",
    textColor: "text-rose-700",
    description: "Love & intimate connection",
    preview: "Sunset views and charming hideaways"
  },
  { 
    value: "mystery", 
    label: "Mystery", 
    icon: "🔍", 
    gradient: "from-slate-400 to-slate-600", 
    bgColor: "bg-slate-50",
    borderColor: "border-slate-200",
    textColor: "text-slate-700",
    description: "Hidden secrets & intrigue",
    preview: "Enigmatic places with untold stories"
  },
  { 
    value: "cozy", 
    label: "Cozy", 
    icon: "🏠", 
    gradient: "from-earth-sand-400 to-earth-sand-600", 
    bgColor: "bg-earth-sand-50",
    borderColor: "border-earth-sand-200",
    textColor: "text-earth-sand-700",
    description: "Warm & intimate spaces",
    preview: "Fireplaces, bookshops, and comfort"
  },
  { 
    value: "historic", 
    label: "Historic", 
    icon: "🏛️", 
    gradient: "from-stone-400 to-stone-600", 
    bgColor: "bg-stone-50",
    borderColor: "border-stone-200",
    textColor: "text-stone-700",
    description: "Stories of the past",
    preview: "Museums, monuments, and heritage sites"
  },
  { 
    value: "spiritual", 
    label: "Spiritual", 
    icon: "🧘", 
    gradient: "from-earth-forest-400 to-earth-forest-600", 
    bgColor: "bg-earth-forest-50",
    borderColor: "border-earth-forest-200",
    textColor: "text-earth-forest-700",
    description: "Soul searching & mindfulness",
    preview: "Sacred spaces and meditation spots"
  },
  { 
    value: "creative", 
    label: "Creative", 
    icon: "🎨", 
    gradient: "from-purple-400 to-purple-600", 
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    textColor: "text-purple-700",
    description: "Artistic inspiration & culture",
    preview: "Galleries, studios, and creative hubs"
  },
  { 
    value: "outdoorsy", 
    label: "Outdoorsy", 
    icon: "🌳", 
    gradient: "from-sage-500 to-earth-forest-500", 
    bgColor: "bg-sage-50",
    borderColor: "border-sage-200",
    textColor: "text-sage-700",
    description: "Nature connection & fresh air",
    preview: "Parks, trails, and natural beauty"
  },
  { 
    value: "quirky", 
    label: "Quirky", 
    icon: "🦄", 
    gradient: "from-pink-400 to-pink-600", 
    bgColor: "bg-pink-50",
    borderColor: "border-pink-200",
    textColor: "text-pink-700",
    description: "Wonderfully weird & unique",
    preview: "Unusual attractions and offbeat finds"
  }
];

const QuestHome = () => {
  const [city, setCity] = useState("");
  const [mood, setMood] = useState([]);
  const [timeLimit, setTimeLimit] = useState(90);
  const [startLocation, setStartLocation] = useState(null);
  const [detectedLocation, setDetectedLocation] = useState(null);
  const [suggestedMoods, setSuggestedMoods] = useState([]);
  const [locationError, setLocationError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [questResult, setQuestResult] = useState(null);
  const [user, setUser] = useState(null);
  const [premium, setPremium] = useState(false);
  const [resumeData, setResumeData] = useState(null);
  const [level, setLevel] = useState(1);
  const [difficulty, setDifficulty] = useState('Easy');
  const navigate = useNavigate();

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const res = await validatePremium();
          setPremium(!!res.isPremium);
        } catch (err) {
          console.error('premium check failed', err);
        }
        try {
          const xpData = await getUserXP(firebaseUser.uid);
          setLevel(xpData.level || 1);
        } catch (err) {
          console.error('xp fetch failed', err);
        }
      } else {
        setPremium(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const data = await getActiveQuest(user.uid);
        if (data && data.questId && data.status !== 'completed') {
          const questDoc = await getQuest(data.questId).catch(() => null);
          let groupOk = true;
          if (data.groupId) {
            const snap = await getDoc(doc(db, 'groups', data.groupId));
            groupOk = snap.exists() && !snap.data().completed;
          }
          if (questDoc && groupOk) {
            const questObj = _toQuestObj(questDoc);
            if (Array.isArray(data.trimmedPlaces)) {
              questObj.places = data.trimmedPlaces;
            }
            setResumeData({
              quest: questObj,
              groupId: data.groupId,
              questId: data.questId,
              status: data.status,
              usedTimeLimit: data.usedTimeLimit,
            });
          } else {
            if (data.groupId) await leaveGroup(data.groupId, user.uid);
            setResumeData(null);
          }
        } else {
          setResumeData(null);
        }
      } catch (err) {
        console.error('Failed to load active quest', err);
      }
    })();
  }, [user]);

  // Initialize Google Maps autocomplete
  useEffect(() => {
    const initAutocomplete = async () => {
      try {
        await googleMapsLoader.waitForReady();
        
        const input = document.getElementById('start-address');
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
      } catch (error) {
        console.error('Failed to initialize Google Maps autocomplete:', error);
        logError(error, {
          type: 'googleMapsAutocompleteError',
          component: 'QuestHome'
        });
      }
    };
    
    initAutocomplete();
  }, []);

  // Handle successful location detection
  const handleLocationDetected = (locationData) => {
    setDetectedLocation(locationData);
    setStartLocation({
      address: locationData.formattedAddress,
      lat: locationData.lat,
      lng: locationData.lng,
      placeId: locationData.placeId
    });
    setCity(locationData.city);
    setSuggestedMoods(locationData.suggestedMoods || []);
    setLocationError(null);
  };

  // Handle location detection errors
  const handleLocationError = (error) => {
    setLocationError(error);
    logUserActionError(new Error(error.message), 'location_detection', {
      errorType: error.type,
      canRetry: error.canRetry
    });
  };

  const handleLogin = async () => {
    const auth = getAuth();
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Login error", err);
      setError("Failed to sign in.");
    }
  };

  // Auto-select suggested moods when location is detected
  useEffect(() => {
    if (suggestedMoods.length > 0 && mood.length === 0) {
      // Auto-select the top suggested mood if none are selected
      const topSuggestion = suggestedMoods[0];
      if (topSuggestion) {
        setMood([topSuggestion.value]);
      }
    }
  }, [suggestedMoods, mood.length]);

  const handleGenerate = async () => {
    setError("");
    setQuestResult(null);

    if (!user) {
      setError("You must be signed in to generate a quest.");
      return;
    }

    // Validate location - check for either manual input or detected location
    const hasManualLocation = city && city.trim();
    const hasDetectedLocation = startLocation && startLocation.address;
    
    if (!hasManualLocation && !hasDetectedLocation) {
      setError("Please enter a location or use location detection.");
      return;
    }

    if (!Array.isArray(mood) || mood.length === 0) {
      setError("Please select at least one mood for your quest.");
      return;
    }

    if (isNaN(timeLimit) || timeLimit < 30) {
      setError("Please select a valid time limit for your quest.");
      return;
    }

    setLoading(true);
    try {
      const token = await user.getIdToken();
      
      // Determine the best city string to use
      let questCity;
      let locationData = null;
      
      if (hasDetectedLocation) {
        questCity = detectedLocation?.city || startLocation.address;
        locationData = startLocation;
      } else {
        questCity = city.trim();
      }

      console.log('🚀 Generating quest with:', {
        city: questCity,
        mood,
        timeLimit,
        difficulty,
        hasDetectedLocation,
        locationData
      });
      
      const result = await generateQuest(
        questCity,
        mood,
        Number(timeLimit),
        token,
        user.uid,
        locationData,
        difficulty
      );
      
      if (result.error) {
        console.error('❌ API error:', result);
        setError(result.error || 'Something went wrong generating your quest.');
        logError(new Error(result.error), {
          type: 'questGenerationError',
          city: questCity,
          mood,
          timeLimit,
          difficulty
        });
        return;
      }
      
      if (result.fallbackCity) {
        setError(`That location isn't fully supported yet. Showing results near ${result.fallbackCity} instead.`);
        // Don't return, continue with the fallback results
        setTimeout(() => setError(""), 5000); // Clear after 5 seconds
      }
      
      setQuestResult(result);
    } catch (err) {
      console.error('❌ Quest generation failed:', err);
      const errorMessage = err.message.includes('Invalid input') 
        ? 'Please check your location and mood selections.'
        : 'Something went wrong generating your quest. Please try again.';
      setError(errorMessage);
      
      logError(err, {
        type: 'questGenerationException',
        city: city || 'unknown',
        mood,
        timeLimit,
        difficulty,
        hasDetectedLocation,
        hasManualLocation
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartQuest = async () => {
    if (!premium) {
      navigate('/pricing');
      return;
    }
    if (!questResult) return;
    const questId = `${city}_${mood.join('-')}`;
    try {
      const { groupId } = await createGroupQuest(
        user.uid,
        questId,
        user.displayName
      );
      navigate('/live', {
        state: { quest: questResult.quest, questId, groupId, timeLimit },
      });
    } catch (err) {
      console.error('Failed to create group', err);
      setError('Failed to start group quest');
    }
  };

  const toggleMood = (selectedMood) => {
    if (mood.includes(selectedMood)) {
      setMood(mood.filter((m) => m !== selectedMood));
    } else if (mood.length < 3) {
      setMood([...mood, selectedMood]);
    } else {
      setError("You can select up to 3 moods for the best experience.");
      setTimeout(() => setError(""), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-stone-50 to-sage-50">
      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm text-white z-50">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 text-center">
            <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-xl font-semibold">Crafting your adventure...</p>
            <p className="text-white/80 mt-2">Finding the perfect spots for your quest</p>
          </div>
        </div>
      )}

      {/* Resume Quest Banner */}
      {resumeData && (
        <div className="bg-gradient-to-r from-amber-400 to-orange-500 text-white py-4 px-6">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div>
              <p className="font-semibold">🎯 You have an active quest!</p>
              <p className="text-white/90 text-sm">Continue your adventure where you left off</p>
            </div>
            <button
              onClick={() =>
                navigate('/live', { 
                  state: { 
                    quest: resumeData.quest, 
                    questId: resumeData.questId, 
                    groupId: resumeData.groupId, 
                    timeLimit: resumeData.usedTimeLimit 
                  } 
                })
              }
              className="bg-white/20 hover:bg-white/30 text-white px-6 py-2 rounded-xl font-semibold transition-all duration-200"
            >
              Resume Quest
            </button>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Discover Your Next
            <span className="block bg-gradient-to-r from-sage-600 via-sage-500 to-emerald-600 bg-clip-text text-transparent">
              Adventure
            </span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Turn any location into an epic quest. AI-powered adventures that adapt to your mood, time, and curiosity.
          </p>
        </div>

        {!user ? (
          /* Sign In Section */
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-sage-100 p-12 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-sage-400 to-sage-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Start Your Quest Journey</h2>
            <p className="text-gray-600 mb-8">Sign in to unlock personalized adventures tailored to your preferences</p>
            <button
              onClick={handleLogin}
              className="bg-gradient-to-r from-sage-500 to-sage-600 hover:from-sage-600 hover:to-sage-700 text-white px-8 py-4 rounded-2xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
            >
              <span className="flex items-center space-x-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Sign In with Google</span>
              </span>
            </button>
          </div>
        ) : (
          /* Quest Builder */
          <div className="space-y-8">
            {/* Location Section */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-sage-100 p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <span className="w-8 h-8 bg-gradient-to-br from-sage-400 to-sage-600 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                  </svg>
                </span>
                Where's your adventure?
              </h2>
              
              <div className="space-y-6">
                {/* Manual Location Input */}
                <div className="relative">
                  <input
                    id="start-address"
                    type="text"
                    placeholder="Enter your starting location..."
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-6 py-4 pl-14 text-lg border-2 border-sage-200 rounded-2xl focus:border-sage-500 focus:outline-none focus:ring-4 focus:ring-sage-500/20 transition-all duration-200"
                  />
                  <svg className="absolute left-5 top-5 w-6 h-6 text-sage-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                  </svg>
                </div>
                
                {/* OR Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">OR</span>
                  </div>
                </div>
                
                {/* Location Detection */}
                <LocationDetection
                  onLocationDetected={handleLocationDetected}
                  onError={handleLocationError}
                  showMoodSuggestions={true}
                />
              </div>
            </div>

            {/* Mood Selection */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-sage-100 p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <span className="w-8 h-8 bg-gradient-to-br from-sage-400 to-sage-600 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </span>
                What's your vibe? <span className="text-sm font-normal text-gray-500 ml-2">(Choose up to 3)</span>
              </h2>
              
              {/* Location-Based Mood Recommendations */}
              {suggestedMoods.length > 0 && (
                <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200">
                  <div className="flex items-center space-x-2 mb-3">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <h3 className="font-semibold text-blue-800">💡 Recommended for your area:</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {suggestedMoods.map((suggestedMood, index) => {
                      const isAlreadySelected = mood.includes(suggestedMood.value);
                      return (
                        <button
                          key={index}
                          onClick={() => !isAlreadySelected && toggleMood(suggestedMood.value)}
                          disabled={isAlreadySelected}
                          className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                            isAlreadySelected
                              ? 'bg-sage-100 text-sage-700 border border-sage-300 cursor-default'
                              : 'bg-white text-blue-700 border border-blue-300 hover:bg-blue-100 hover:border-blue-400 cursor-pointer transform hover:scale-105'
                          }`}
                        >
                          <span>{suggestedMood.icon}</span>
                          <span>{suggestedMood.label}</span>
                          {isAlreadySelected && (
                            <svg className="w-4 h-4 text-sage-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-blue-600 mt-2">
                    Based on nearby {suggestedMoods[0]?.reason || 'places'}
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                {moodOptions.map((option) => {
                  const isSelected = mood.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      onClick={() => toggleMood(option.value)}
                      className={`group relative overflow-hidden rounded-2xl border-2 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg ${
                        isSelected
                          ? `border-sage-400 ${option.bgColor} shadow-sage-md ring-2 ring-sage-200`
                          : `border-neutral-200 bg-white hover:${option.bgColor} hover:${option.borderColor} hover:shadow-md`
                      }`}
                    >
                      {/* Background Pattern */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${option.gradient} opacity-5 group-hover:opacity-10 transition-opacity duration-300`}></div>
                      
                      {/* Content */}
                      <div className="relative p-6">
                        {/* Icon */}
                        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${option.gradient} flex items-center justify-center mb-4 mx-auto shadow-sm group-hover:shadow-md transition-shadow duration-300 ${
                          isSelected ? 'ring-2 ring-white' : ''
                        }`}>
                          <span className="text-2xl">{option.icon}</span>
                        </div>
                        
                        {/* Title */}
                        <h3 className={`font-semibold text-base mb-2 transition-colors duration-200 ${
                          isSelected ? option.textColor : "text-gray-700 group-hover:" + option.textColor
                        }`}>
                          {option.label}
                        </h3>
                        
                        {/* Description */}
                        <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                          {option.description}
                        </p>
                        
                        {/* Preview Text */}
                        <p className={`text-xs font-medium transition-colors duration-200 ${
                          isSelected ? option.textColor : "text-gray-500 group-hover:" + option.textColor
                        }`}>
                          {option.preview}
                        </p>
                      </div>
                      
                      {/* Selection Indicator */}
                      {isSelected && (
                        <div className="absolute -top-1 -right-1 w-7 h-7 bg-sage-500 rounded-full flex items-center justify-center shadow-lg">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                          </svg>
                        </div>
                      )}
                      
                      {/* Hover Glow Effect */}
                      <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-gradient-to-br ${option.gradient} opacity-[0.03]`}></div>
                    </button>
                  );
                })}
              </div>
              
              {/* Selected Moods Summary */}
              {mood.length > 0 && (
                <div className="mt-6 p-4 bg-sage-50 rounded-xl border border-sage-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-sage-700">Selected vibes:</span>
                      <div className="flex space-x-2">
                        {mood.map((selectedMood) => {
                          const option = moodOptions.find(opt => opt.value === selectedMood);
                          return (
                            <span
                              key={selectedMood}
                              className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium ${option.bgColor} ${option.textColor} ${option.borderColor} border`}
                            >
                              <span>{option.icon}</span>
                              <span>{option.label}</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    <span className="text-xs text-sage-600 font-medium">
                      {mood.length}/3
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Time & Difficulty */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-sage-100 p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <span className="w-8 h-8 bg-gradient-to-br from-sage-400 to-sage-600 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </span>
                Quest Settings
              </h2>
              
              <div className="grid md:grid-cols-2 gap-8">
                {/* Time Limit */}
                <div>
                  <label className="block text-lg font-semibold text-gray-700 mb-4">
                    Time Limit: <span className="text-sage-600">{timeLimit} minutes</span>
                  </label>
                  <input
                    type="range"
                    min="30"
                    max="180"
                    step="15"
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(Number(e.target.value))}
                    className="w-full h-3 bg-sage-200 rounded-lg appearance-none cursor-pointer slider"
                    style={{
                      background: `linear-gradient(to right, rgb(156, 175, 136) 0%, rgb(156, 175, 136) ${((timeLimit - 30) / 150) * 100}%, rgb(229, 231, 235) ${((timeLimit - 30) / 150) * 100}%, rgb(229, 231, 235) 100%)`
                    }}
                  />
                  <div className="flex justify-between text-sm text-gray-500 mt-2">
                    <span>30 min</span>
                    <span>Quick</span>
                    <span>Moderate</span>
                    <span>Extended</span>
                    <span>180 min</span>
                  </div>
                </div>

                {/* Difficulty */}
                <div>
                  <label className="block text-lg font-semibold text-gray-700 mb-4">Difficulty Level</label>
                  <div className="flex gap-3">
                    {['Easy','Medium','Hard'].map((d) => {
                      const locked = !premium && ((d==='Medium' && level < 3) || (d==='Hard' && level < 6));
                      return (
                        <button
                          key={d}
                          type="button"
                          disabled={locked}
                          onClick={() => setDifficulty(d)}
                          className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all duration-200 ${
                            difficulty === d 
                              ? 'bg-sage-600 text-white shadow-lg ring-2 ring-sage-200' 
                              : locked 
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-gray-100 text-gray-700 hover:bg-sage-100 hover:text-sage-700'
                          }`}
                        >
                          {locked ? `${d} 🔒` : d}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    {difficulty === 'Easy' && 'Shorter walks, popular destinations'}
                    {difficulty === 'Medium' && 'Mixed terrain, hidden gems'}
                    {difficulty === 'Hard' && 'Challenging routes, unique discoveries'}
                  </p>
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <div className="text-center">
              <button
                onClick={handleGenerate}
                disabled={loading || !mood.length || (!startLocation && !city.trim())}
                className="bg-gradient-to-r from-sage-500 to-sage-600 hover:from-sage-600 hover:to-sage-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white px-12 py-4 rounded-2xl font-bold text-xl shadow-sage-lg hover:shadow-sage-xl transition-all duration-200 transform hover:scale-105 disabled:transform-none"
              >
                {loading ? (
                  <span className="flex items-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Generating...</span>
                  </span>
                ) : (
                  <span className="flex items-center space-x-2">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                    </svg>
                    <span>Generate Quest</span>
                  </span>
                )}
              </button>
              
              {(!mood.length || (!startLocation && !city.trim())) && (
                <p className="text-gray-500 text-sm mt-3">
                  {!mood.length && "Select at least one mood"}{!mood.length && (!startLocation && !city.trim()) && " and "}
                  {(!startLocation && !city.trim()) && "enter a location"} to continue
                </p>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-2xl">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <span>{error}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quest Results */}
        {questResult?.quest?.places && (
          <div className="mt-12 bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-sage-100 p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-gray-900 flex items-center">
                <span className="w-10 h-10 bg-gradient-to-br from-sage-400 to-sage-600 rounded-xl flex items-center justify-center mr-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
                  </svg>
                </span>
                Your Quest Awaits
              </h2>
              
              <div className="flex items-center space-x-4 text-sm">
                <span className="bg-sage-100 text-sage-700 px-3 py-1 rounded-full font-medium">
                  {questResult.quest.places.length} stops
                </span>
                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">
                  ~{timeLimit} min
                </span>
                <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-medium">
                  {difficulty}
                </span>
              </div>
            </div>

            {/* Quest Description */}
            <div className="bg-gradient-to-r from-sage-50 to-emerald-50 rounded-2xl p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Your Adventure Story</h3>
              <p className="text-gray-700 leading-relaxed text-lg">
                {questResult.quest?.questText || "Embark on a personalized journey through your chosen location, discovering hidden gems and creating lasting memories."}
              </p>
            </div>

            {/* Quest Stops */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-sage-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                </svg>
                Quest Stops
              </h3>
              
              <div className="grid gap-4">
                {questResult.quest.places.map((place, index) => (
                  <div key={index} className="flex items-center space-x-4 p-4 bg-white rounded-xl border border-sage-100 hover:border-sage-300 transition-colors">
                    <div className="w-10 h-10 bg-gradient-to-br from-sage-400 to-sage-600 rounded-full flex items-center justify-center text-white font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <PlaceItem place={place} />
                    </div>
                    <div className="text-sage-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/>
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Map */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-sage-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
                </svg>
                Route Preview
              </h3>
              <div className="rounded-2xl overflow-hidden shadow-lg">
                <RouteMap
                  places={questResult.quest.places}
                  route={questResult.quest.route}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleStartQuest}
                disabled={!!resumeData}
                className={`flex-1 py-4 rounded-2xl font-bold text-lg transition-all duration-200 transform hover:scale-105 ${
                  resumeData 
                    ? 'bg-gray-400 text-white cursor-not-allowed' 
                    : 'bg-gradient-to-r from-sage-500 to-sage-600 hover:from-sage-600 hover:to-sage-700 text-white shadow-sage-lg hover:shadow-sage-xl'
                }`}
              >
                <span className="flex items-center justify-center space-x-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <span>Start Adventure</span>
                </span>
              </button>
              
              <button
                onClick={() => setQuestResult(null)}
                className="flex-1 sm:flex-none px-8 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-semibold transition-colors"
              >
                Generate New Quest
              </button>
            </div>

            {/* Premium Notice */}
            {!premium && (
              <div className="mt-6 bg-gradient-to-r from-earth-clay-50 to-earth-sand-50 border border-earth-clay-200 rounded-2xl p-6">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-earth-clay-400 to-earth-clay-600 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-earth-clay-900">Quest+ Required</h4>
                    <p className="text-earth-clay-700 text-sm">Upgrade to start your adventure and unlock unlimited quests, group features, and more!</p>
                  </div>
                  <a 
                    href="/pricing" 
                    className="bg-gradient-to-r from-earth-clay-500 to-earth-clay-600 hover:from-earth-clay-600 hover:to-earth-clay-700 text-white px-6 py-2 rounded-xl font-semibold transition-all duration-200"
                  >
                    Upgrade Now
                  </a>
                </div>
              </div>
            )}

            {/* Resume Quest Notice */}
            {resumeData && (
              <div className="mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-6">
                <div className="flex items-center space-x-3">
                  <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                  </svg>
                  <div className="flex-1">
                    <h4 className="font-semibold text-amber-900">Active Quest in Progress</h4>
                    <p className="text-amber-700 text-sm">You have an ongoing adventure. Complete it before starting a new quest!</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestHome;