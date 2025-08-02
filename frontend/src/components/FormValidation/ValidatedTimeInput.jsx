// Validated Time Input with Smart Suggestions
import React, { useState, useEffect, useRef } from 'react';
import { ValidationRules, InputSanitizer } from '../../utils/formValidation';

const ValidatedTimeInput = ({
  label = "Quest Duration",
  value,
  onChange,
  onValidate,
  min = 15,
  max = 480,
  step = 15,
  required = true,
  className = '',
  disabled = false,
  showPresets = true,
  showSlider = true
}) => {
  const [errors, setErrors] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [hasBeenInteracted, setHasBeenInteracted] = useState(false);
  const [inputValue, setInputValue] = useState(value?.toString() || '');
  const [showCustomInput, setShowCustomInput] = useState(false);
  
  const debounceRef = useRef(null);
  
  // Common time presets
  const timePresets = [
    { value: 30, label: '30 min', description: 'Quick exploration' },
    { value: 60, label: '1 hour', description: 'Perfect for lunch break' },
    { value: 90, label: '1.5 hours', description: 'Leisurely adventure' },
    { value: 120, label: '2 hours', description: 'Deep exploration' },
    { value: 180, label: '3 hours', description: 'Half-day journey' },
    { value: 240, label: '4 hours', description: 'Extended adventure' }
  ];
  
  // Validation effect with debouncing
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      if (hasBeenInteracted || value) {
        validateTime(value);
      }
    }, 300);
    
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value, hasBeenInteracted]);
  
  // Update input value when prop changes
  useEffect(() => {
    setInputValue(value?.toString() || '');
  }, [value]);
  
  const validateTime = (timeValue) => {
    const validationResult = ValidationRules.validTimeLimit(timeValue);
    
    const fieldErrors = [];
    const fieldWarnings = [];
    
    if (!validationResult.isValid) {
      fieldErrors.push(validationResult);
    } else if (validationResult.warning) {
      fieldWarnings.push(validationResult);
    }
    
    // Additional helpful guidance
    const numValue = parseInt(timeValue, 10);
    if (!isNaN(numValue)) {
      if (numValue >= 15 && numValue < 30) {
        fieldWarnings.push({
          warning: 'Quick quest! Perfect for a coffee break.',
          severity: 'info'
        });
      } else if (numValue >= 240) {
        fieldWarnings.push({
          warning: 'Long adventure! Make sure you have enough time.',
          severity: 'info'
        });
      }
      
      // Suggest optimal times based on research
      if (numValue > 0 && numValue < 15) {
        fieldErrors.push({
          error: 'Quests need at least 15 minutes to be meaningful.',
          severity: 'error'
        });
      }
    }
    
    setErrors(fieldErrors);
    setWarnings(fieldWarnings);
    
    // Notify parent component
    if (onValidate) {
      onValidate({
        isValid: fieldErrors.length === 0,
        errors: fieldErrors,
        warnings: fieldWarnings
      });
    }
  };
  
  const handlePresetSelect = (presetValue) => {
    setHasBeenInteracted(true);
    setInputValue(presetValue.toString());
    onChange(presetValue);
  };
  
  const handleSliderChange = (e) => {
    const newValue = parseInt(e.target.value, 10);
    setHasBeenInteracted(true);
    setInputValue(newValue.toString());
    onChange(newValue);
  };
  
  const handleCustomInputChange = (e) => {
    const rawValue = e.target.value;
    const sanitizedValue = InputSanitizer.sanitizeNumericInput(rawValue, 0, max);
    setInputValue(rawValue); // Keep raw input for user experience
    setHasBeenInteracted(true);
    
    // Only update parent if it's a valid number
    if (!isNaN(sanitizedValue) && sanitizedValue >= 0) {
      onChange(sanitizedValue);
    }
  };
  
  const handleCustomInputBlur = () => {
    // Sanitize and correct the input on blur
    const sanitizedValue = InputSanitizer.sanitizeNumericInput(inputValue, min, max);
    setInputValue(sanitizedValue.toString());
    onChange(sanitizedValue);
  };
  
  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours === 0) {
      return `${mins} min`;
    } else if (mins === 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
      return `${hours}h ${mins}m`;
    }
  };
  
  const hasErrors = errors.length > 0;
  const showValidation = hasBeenInteracted || value;
  
  const labelClasses = [
    'block text-sm font-medium mb-3 transition-colors duration-200',
    hasErrors && showValidation ? 'text-red-700' : 'text-gray-700'
  ].join(' ');
  
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Label */}
      <label className={labelClasses}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
        {value && (
          <span className="ml-2 text-sage-600 text-sm font-normal">
            ({formatTime(value)})
          </span>
        )}
      </label>
      
      {/* Preset Buttons */}
      {showPresets && (
        <div className="space-y-2">
          <p className="text-xs text-gray-600 font-medium">Popular durations:</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {timePresets.map((preset) => {
              const isSelected = value === preset.value;
              
              const buttonClasses = [
                'p-3 rounded-lg border text-left transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-sage-300',
                isSelected
                  ? 'bg-sage-100 border-sage-300 text-sage-800 ring-2 ring-sage-200'
                  : 'bg-white border-gray-200 text-gray-700 hover:border-sage-300 hover:bg-sage-50',
                disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              ].join(' ');
              
              return (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => handlePresetSelect(preset.value)}
                  disabled={disabled}
                  className={buttonClasses}
                  aria-pressed={isSelected}
                >
                  <div className="font-medium text-sm">{preset.label}</div>
                  <div className="text-xs text-gray-500 mt-1">{preset.description}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Slider Input */}
      {showSlider && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <p className="text-xs text-gray-600 font-medium">Adjust duration:</p>
            <button
              type="button"
              onClick={() => setShowCustomInput(!showCustomInput)}
              className="text-xs text-sage-600 hover:text-sage-700 underline"
            >
              {showCustomInput ? 'Use slider' : 'Enter exact time'}
            </button>
          </div>
          
          {showCustomInput ? (
            // Custom Input
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={inputValue}
                onChange={handleCustomInputChange}
                onBlur={handleCustomInputBlur}
                min={min}
                max={max}
                step={step}
                className={[
                  'flex-1 px-3 py-2 rounded-lg border',
                  'focus:outline-none focus:ring-2 focus:ring-sage-300',
                  hasErrors && showValidation
                    ? 'border-red-300 focus:border-red-500'
                    : 'border-gray-300 focus:border-sage-500'
                ].join(' ')}
                placeholder="Enter minutes"
                disabled={disabled}
              />
              <span className="text-sm text-gray-500">minutes</span>
            </div>
          ) : (
            // Slider
            <div className="space-y-2">
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value || min}
                onChange={handleSliderChange}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                disabled={disabled}
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>{min} min</span>
                <span className="font-medium text-sage-600">
                  {value ? formatTime(value) : formatTime(min)}
                </span>
                <span>{formatTime(max)}</span>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Time Recommendations */}
      {value && value >= min && value <= max && !hasErrors && (
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div>
              <p className="text-sm font-medium text-blue-800">Quest Recommendation</p>
              <p className="text-sm text-blue-700">
                {value <= 60 
                  ? 'Perfect for a quick exploration! You\'ll visit 2-3 key locations.'
                  : value <= 120
                  ? 'Great duration for a balanced quest with 3-4 interesting stops.'
                  : value <= 240
                  ? 'Comprehensive adventure! You\'ll have time for 4-6 diverse experiences.'
                  : 'Extended journey! Perfect for a full exploration with 6+ unique locations.'
                }
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Error Messages */}
      {errors.length > 0 && showValidation && (
        <div className="space-y-1">
          {errors.map((error, index) => (
            <div key={index} className="flex items-start text-sm text-red-600">
              <svg className="w-4 h-4 mt-0.5 mr-1.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span>{error.error}</span>
            </div>
          ))}
        </div>
      )}
      
      {/* Warning/Info Messages */}
      {warnings.length > 0 && showValidation && !hasErrors && (
        <div className="space-y-1">
          {warnings.map((warning, index) => {
            const isInfo = warning.severity === 'info';
            const iconColor = isInfo ? 'text-blue-500' : 'text-yellow-500';
            const textColor = isInfo ? 'text-blue-600' : 'text-yellow-600';
            
            return (
              <div key={index} className={`flex items-start text-sm ${textColor}`}>
                <svg className={`w-4 h-4 mt-0.5 mr-1.5 flex-shrink-0 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span>{warning.warning}</span>
                {warning.suggestion && (
                  <button
                    onClick={() => {
                      setInputValue(warning.suggestion.toString());
                      onChange(warning.suggestion);
                    }}
                    className={`ml-2 underline hover:no-underline ${textColor}`}
                  >
                    Use {warning.suggestion} min
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          background: #059669;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          transition: all 0.2s ease;
        }
        
        .slider::-webkit-slider-thumb:hover {
          background: #047857;
          transform: scale(1.1);
        }
        
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          background: #059669;
          border-radius: 50%;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
};

export default ValidatedTimeInput;