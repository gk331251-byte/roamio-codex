# React Error #185 Debugging Guide

This document provides comprehensive guidance for debugging React Error #185 ("Maximum update depth exceeded") in the quest generation flow.

## 🛠️ Debugging Tools Implemented

### 1. Quest Debugger (`src/utils/questDebugger.js`)
Comprehensive logging system for quest generation flow:

- **Step-by-step tracking**: Logs each phase of quest generation
- **State update monitoring**: Tracks all state changes with timestamps
- **Async operation tracking**: Monitors promises and API calls
- **Error categorization**: Detailed error logging with context
- **Performance metrics**: Duration tracking for each step

#### Usage:
```javascript
import { startQuestGeneration, logQuestStep, logStateUpdate } from '../utils/questDebugger';

// Start tracking
startQuestGeneration();

// Log steps
logQuestStep('api_call_start', { userId, questCity });

// Track state changes (automatic in QuestHome)
logStateUpdate('QuestHome', 'loading', false, true);
```

### 2. React Error Detector (`src/utils/reactErrorDetector.js`)
Development-only infinite loop detection:

- **Real-time monitoring**: Detects excessive render frequency
- **Error #185 detection**: Specifically catches infinite loop errors
- **Component analysis**: Provides debugging suggestions
- **Render frequency tracking**: Monitors component render patterns

#### Usage:
```javascript
import { trackRender, analyzeComponent } from '../utils/reactErrorDetector';

// Track component renders
trackRender('QuestHome');

// Analyze dependencies
analyzeComponent('QuestHome', [user, mood, timeLimit]);
```

### 3. Debug Monitor (`src/utils/debugMonitor.js`)
Real-time debugging panel for development:

- **Visual debugging**: Live quest generation status
- **Memory monitoring**: JavaScript heap usage tracking
- **Error visualization**: Real-time error display
- **Keyboard shortcuts**: Ctrl+Shift+D to toggle panel

#### Activation:
- URL parameter: `?debug=true`
- localStorage: `localStorage.setItem('roamio_debug', 'true')`
- Keyboard: Press Ctrl+Shift+D

## 🔍 Common React Error #185 Causes & Fixes

### 1. Infinite useEffect Loops
**Problem:**
```javascript
useEffect(() => {
  if (mood.length === 0) {
    setMood([defaultMood]);
  }
}, [mood.length]); // ❌ mood.length dependency causes infinite loop
```

**Solution:**
```javascript
useEffect(() => {
  if (mood.length === 0 && !hasInitialized.current) {
    setMood([defaultMood]);
    hasInitialized.current = true;
  }
}, [suggestedMoods]); // ✅ Use stable dependency
```

### 2. State Updates on Unmounted Components
**Problem:**
```javascript
const [loading, setLoading] = useState(false);

useEffect(() => {
  setTimeout(() => {
    setLoading(false); // ❌ May run after component unmounts
  }, 5000);
}, []);
```

**Solution:**
```javascript
const isMountedRef = useRef(true);

useEffect(() => {
  return () => {
    isMountedRef.current = false;
  };
}, []);

const safeSetTimeout = (callback, delay) => {
  setTimeout(() => {
    if (isMountedRef.current) {
      callback();
    }
  }, delay);
};
```

### 3. Object Dependencies in useEffect
**Problem:**
```javascript
const locationData = { lat, lng, address };

useEffect(() => {
  processLocation(locationData);
}, [locationData]); // ❌ New object every render
```

**Solution:**
```javascript
const locationData = useMemo(() => ({ lat, lng, address }), [lat, lng, address]);

useEffect(() => {
  processLocation(locationData);
}, [locationData]); // ✅ Stable object reference
```

## 🚨 Error Detection Patterns

### Automatic Detection
The debugging system automatically detects:

1. **High render frequency**: >50 renders per second
2. **State update loops**: Same state updated >10 times in 1 second  
3. **Unmounted component updates**: State updates after component unmount
4. **Auth state loss**: Authentication errors during quest generation
5. **Memory leaks**: Uncleaned timeouts and event listeners

### Manual Analysis
Use these tools for deeper investigation:

```javascript
// Generate detailed report
import { generateQuestReport } from '../utils/questDebugger';
const report = generateQuestReport();
console.log('Quest Analysis:', report);

// Check component render patterns
import { analyzeComponent } from '../utils/reactErrorDetector';
analyzeComponent('QuestHome', [user, mood, timeLimit]);
```

## 🔧 Quest Generation Flow Protection

### 1. Component Lifecycle Management
- **Mounted state tracking**: Prevents updates on unmounted components
- **Cleanup on unmount**: Clears timeouts, intervals, and event listeners
- **Abort controllers**: Cancels ongoing async operations

### 2. State Update Safety
- **Tracked state updates**: All state changes logged and monitored
- **Infinite loop prevention**: Refs and flags prevent circular updates
- **Error state management**: Proper error handling without navigation

### 3. Memory Management
- **Safe timeouts**: Automatic cleanup and mounted state checking
- **Event listener cleanup**: Proper removal on component unmount
- **Async operation tracking**: Promise monitoring and cancellation

## 📊 Debugging Commands

### Development Console
```javascript
// Enable debug mode
localStorage.setItem('roamio_debug', 'true');

// Generate quest report
questDebugger.generateReport();

// Check render stats
reactErrorDetector.getStats();

// Clear debug data
localStorage.removeItem('roamio_debug');
```

### URL Parameters
- `?debug=true` - Enable debug panel
- `?strict=true` - Enable React StrictMode

### Keyboard Shortcuts
- `Ctrl+Shift+D` - Toggle debug panel
- `Escape` - Dismiss all toasts/modals

## 🏥 Error Recovery

### Automatic Recovery
1. **Error boundaries**: Catch React errors without app crash
2. **Auth state recovery**: Automatic re-authentication on token failure
3. **Timeout cleanup**: Prevents memory leaks on error
4. **State reset**: Clear error states after timeout

### Manual Recovery
1. **Component retry**: Error boundary provides retry buttons
2. **Page refresh**: Fallback option for persistent errors
3. **State clearing**: Reset component state manually
4. **Local storage reset**: Clear cached debug data

## 📈 Performance Monitoring

### Metrics Tracked
- Quest generation duration
- Component render frequency
- Memory usage (development only)
- State update frequency
- Async operation performance

### Thresholds
- **High render frequency**: >50 renders/second
- **Memory warning**: >500MB JavaScript heap
- **State update warning**: >10 updates/second per state
- **Quest timeout**: >30 seconds for generation

## 🎯 Best Practices

### 1. State Management
- Use functional updates: `setState(prev => prev + 1)`
- Avoid object dependencies in useEffect
- Use useCallback/useMemo for expensive operations
- Check component mounted state before updates

### 2. Error Handling
- Always wrap async operations in try-catch
- Use error boundaries for component-level errors
- Log errors with sufficient context
- Provide user-friendly error messages

### 3. Performance
- Use React.memo for expensive components
- Implement proper dependency arrays
- Clean up resources on unmount
- Monitor render frequency in development

### 4. Debugging
- Enable debug mode during development
- Use browser dev tools for performance profiling
- Test error scenarios explicitly
- Monitor memory usage during long sessions

## 🔗 Related Files

- `src/components/QuestHome.jsx` - Main quest generation component
- `src/utils/questDebugger.js` - Quest-specific debugging
- `src/utils/reactErrorDetector.js` - React error detection
- `src/utils/debugMonitor.js` - Visual debugging panel
- `src/components/ErrorBoundary/QuestGenerationErrorBoundary.jsx` - Error recovery

This comprehensive debugging system should help identify and resolve any remaining React Error #185 issues in the quest generation flow.