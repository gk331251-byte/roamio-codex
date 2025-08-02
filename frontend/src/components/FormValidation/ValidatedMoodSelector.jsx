// Validated Mood Selector with Real-time Feedback
import React, { useState, useEffect } from 'react';
import { ValidationRules } from '../../utils/formValidation';

const ValidatedMoodSelector = ({
  label = "Quest Mood",
  selectedMoods = [],
  onChange,
  onValidate,
  moodOptions = [],
  maxSelections = 3,
  required = true,
  className = '',
  disabled = false
}) => {
  const [errors, setErrors] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [hasBeenInteracted, setHasBeenInteracted] = useState(false);
  
  // Validation effect
  useEffect(() => {
    if (hasBeenInteracted || selectedMoods.length > 0) {
      validateMoods(selectedMoods);
    }
  }, [selectedMoods, hasBeenInteracted]);
  
  const validateMoods = (moods) => {
    const validationResult = ValidationRules.validMoodSelection(moods);
    
    const fieldErrors = [];
    const fieldWarnings = [];
    
    if (!validationResult.isValid) {
      fieldErrors.push(validationResult);
    } else if (validationResult.warning) {
      fieldWarnings.push(validationResult);
    }
    
    // Additional validation for max selections
    if (moods.length === maxSelections) {
      fieldWarnings.push({
        warning: `You've selected the maximum of ${maxSelections} moods. Remove one to select another.`,
        severity: 'warning'
      });
    }
    
    // Provide helpful guidance
    if (moods.length === 1 && hasBeenInteracted) {
      fieldWarnings.push({
        warning: `Great choice! You can select up to ${maxSelections - 1} more moods for a more personalized quest.`,
        severity: 'info'
      });
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
  
  const handleMoodToggle = (moodValue) => {
    setHasBeenInteracted(true);
    
    let newMoods;
    if (selectedMoods.includes(moodValue)) {
      // Remove mood
      newMoods = selectedMoods.filter(mood => mood !== moodValue);
    } else {
      // Add mood if under limit
      if (selectedMoods.length < maxSelections) {
        newMoods = [...selectedMoods, moodValue];
      } else {
        // Show error for too many selections
        setErrors([{
          error: `You can only select up to ${maxSelections} moods. Remove one first.`,
          severity: 'error'
        }]);
        return;
      }
    }
    
    onChange(newMoods);
  };
  
  const hasErrors = errors.length > 0;
  const showValidation = hasBeenInteracted || selectedMoods.length > 0;
  
  const labelClasses = [
    'block text-sm font-medium mb-3 transition-colors duration-200',
    hasErrors && showValidation ? 'text-red-700' : 'text-gray-700'
  ].join(' ');
  
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Label */}
      <label className={labelClasses}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
        {selectedMoods.length > 0 && (
          <span className="ml-2 text-sage-600 text-xs">
            ({selectedMoods.length}/{maxSelections} selected)
          </span>
        )}
      </label>
      
      {/* Mood Options Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {moodOptions.map((mood) => {
          const isSelected = selectedMoods.includes(mood.value);
          const isDisabled = disabled || (!isSelected && selectedMoods.length >= maxSelections);
          
          const buttonClasses = [
            'relative p-4 rounded-xl border-2 transition-all duration-200 text-left',
            'focus:outline-none focus:ring-2 focus:ring-offset-2',
            // Selection states
            isSelected
              ? `${mood.bgColor} ${mood.borderColor} border-2 transform scale-105 shadow-md`
              : 'bg-white/80 border-gray-200 hover:border-sage-300 hover:bg-sage-50',
            // Disabled state
            isDisabled && !isSelected
              ? 'opacity-50 cursor-not-allowed'
              : 'cursor-pointer hover:scale-102',
            // Focus states
            isSelected
              ? 'focus:ring-sage-300'
              : 'focus:ring-sage-200',
            // Error states
            hasErrors && showValidation
              ? 'ring-2 ring-red-200'
              : ''
          ].filter(Boolean).join(' ');
          
          return (
            <button
              key={mood.value}
              type="button"
              onClick={() => handleMoodToggle(mood.value)}
              disabled={isDisabled}
              className={buttonClasses}
              aria-pressed={isSelected}
              aria-describedby={hasErrors ? 'mood-errors' : undefined}
            >
              {/* Selection Indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <svg className="w-5 h-5 text-sage-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
              )}
              
              {/* Mood Content */}
              <div className="flex items-center space-x-3">
                <span className="text-2xl" role="img" aria-label={mood.label}>
                  {mood.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-semibold text-sm ${mood.textColor}`}>
                    {mood.label}
                  </h3>
                  <p className="text-xs text-gray-600 mt-1 leading-tight">
                    {mood.description}
                  </p>
                </div>
              </div>
              
              {/* Preview Text */}
              <div className="mt-2">
                <p className="text-xs text-gray-500 italic">
                  {mood.preview}
                </p>
              </div>
            </button>
          );
        })}
      </div>
      
      {/* Selection Summary */}
      {selectedMoods.length > 0 && (
        <div className="p-3 bg-sage-50 rounded-lg border border-sage-200">
          <p className="text-sm text-sage-700">
            <span className="font-medium">Selected moods:</span>{' '}
            {selectedMoods.map((moodValue, index) => {
              const mood = moodOptions.find(m => m.value === moodValue);
              return (
                <span key={moodValue}>
                  {mood?.icon} {mood?.label}
                  {index < selectedMoods.length - 1 ? ', ' : ''}
                </span>
              );
            })}
          </p>
        </div>
      )}
      
      {/* Error Messages */}
      {errors.length > 0 && showValidation && (
        <div id="mood-errors" className="space-y-1">
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
              </div>
            );
          })}
        </div>
      )}
      
      {/* Helpful Guidance */}
      {selectedMoods.length === 0 && !hasBeenInteracted && (
        <div className="text-sm text-gray-500 italic">
          Select 1-{maxSelections} moods that match your desired quest experience
        </div>
      )}
    </div>
  );
};

export default ValidatedMoodSelector;