// Validated Input Component with Real-time Feedback
import React, { useState, useEffect, useRef } from 'react';
import { InputSanitizer, SecurityUtils } from '../../utils/formValidation';

const ValidatedInput = ({
  label,
  type = 'text',
  value,
  onChange,
  onValidate,
  rules = [],
  placeholder,
  className = '',
  disabled = false,
  required = false,
  maxLength,
  autoComplete = 'off',
  sanitizationOptions = {},
  showCharacterCount = false,
  debounceMs = 300
}) => {
  const [errors, setErrors] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [isFocused, setIsFocused] = useState(false);
  const [hasBeenBlurred, setHasBeenBlurred] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [securityWarning, setSecurityWarning] = useState(null);
  
  const debounceRef = useRef(null);
  const inputRef = useRef(null);
  
  // Real-time validation with debouncing
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      validateInput(value);
    }, debounceMs);
    
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value, rules]);
  
  const validateInput = (inputValue) => {
    setIsValidating(true);
    
    // Security check first
    const securityCheck = SecurityUtils.detectSuspiciousInput(inputValue);
    if (securityCheck.isSuspicious) {
      setSecurityWarning(securityCheck.reason);
      SecurityUtils.logSecurityEvent('suspicious_input', {
        field: label,
        reason: securityCheck.reason,
        pattern: securityCheck.pattern,
        value: inputValue?.substring(0, 50) + '...' // Truncated for logging
      });
    } else {
      setSecurityWarning(null);
    }
    
    // Run validation rules
    const fieldErrors = [];
    const fieldWarnings = [];
    
    for (const rule of rules) {
      const result = rule(inputValue);
      
      if (!result.isValid) {
        if (result.severity === 'warning') {
          fieldWarnings.push(result);
        } else {
          fieldErrors.push(result);
        }
      } else if (result.warning) {
        fieldWarnings.push(result);
      }
    }
    
    setErrors(fieldErrors);
    setWarnings(fieldWarnings);
    setIsValidating(false);
    
    // Notify parent component
    if (onValidate) {
      onValidate({
        isValid: fieldErrors.length === 0 && !securityCheck.isSuspicious,
        errors: fieldErrors,
        warnings: fieldWarnings,
        securityWarning: securityCheck.isSuspicious ? securityCheck.reason : null
      });
    }
  };
  
  const handleChange = (e) => {
    let newValue = e.target.value;
    
    // Apply sanitization based on type
    switch (type) {
      case 'location':
        newValue = InputSanitizer.sanitizeLocation(newValue);
        break;
      case 'email':
        newValue = InputSanitizer.sanitizeEmail(newValue);
        break;
      case 'number':
        newValue = InputSanitizer.sanitizeNumericInput(newValue, 0, maxLength || Number.MAX_SAFE_INTEGER);
        break;
      default:
        newValue = InputSanitizer.sanitizeText(newValue, sanitizationOptions);
    }
    
    onChange(newValue);
  };
  
  const handleFocus = () => {
    setIsFocused(true);
  };
  
  const handleBlur = () => {
    setIsFocused(false);
    setHasBeenBlurred(true);
    validateInput(value);
  };
  
  // Determine validation state for styling
  const hasErrors = errors.length > 0 || securityWarning;
  const hasWarnings = warnings.length > 0;
  const showValidation = hasBeenBlurred || isFocused;
  
  // Dynamic styling classes
  const inputClasses = [
    'w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 focus:outline-none',
    'bg-white/90 backdrop-blur-sm text-gray-900 placeholder-gray-500',
    // Border colors based on validation state
    hasErrors && showValidation 
      ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200' 
      : hasWarnings && showValidation
      ? 'border-yellow-300 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200'
      : 'border-sage-200 focus:border-sage-500 focus:ring-2 focus:ring-sage-200',
    disabled && 'opacity-50 cursor-not-allowed',
    className
  ].filter(Boolean).join(' ');
  
  const labelClasses = [
    'block text-sm font-medium mb-2 transition-colors duration-200',
    hasErrors && showValidation ? 'text-red-700' : 'text-gray-700'
  ].join(' ');
  
  return (
    <div className="relative">
      {/* Label */}
      {label && (
        <label htmlFor={inputRef.current?.id} className={labelClasses}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
          {isValidating && (
            <span className="ml-2 text-sage-600">
              <svg className="inline w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
            </span>
          )}
        </label>
      )}
      
      {/* Input Field */}
      <div className="relative">
        <input
          ref={inputRef}
          type={type === 'location' ? 'text' : type}
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={inputClasses}
          disabled={disabled}
          maxLength={maxLength}
          autoComplete={autoComplete}
          aria-invalid={hasErrors && showValidation}
          aria-describedby={`${inputRef.current?.id}-feedback`}
        />
        
        {/* Validation Status Icon */}
        <div className="absolute right-3 top-3 flex items-center">
          {showValidation && !isValidating && (
            <>
              {hasErrors ? (
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              ) : hasWarnings ? (
                <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.08 14.5c-.77.833.192 2.5 1.732 2.5z"></path>
                </svg>
              ) : value && (
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              )}
            </>
          )}
        </div>
        
        {/* Character Count */}
        {showCharacterCount && maxLength && (
          <div className="absolute right-3 bottom-1 text-xs text-gray-500">
            {value?.length || 0}/{maxLength}
          </div>
        )}
      </div>
      
      {/* Security Warning */}
      {securityWarning && showValidation && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.08 14.5c-.77.833.192 2.5 1.732 2.5z"></path>
            </svg>
            <div>
              <p className="text-sm font-medium text-red-800">Security Warning</p>
              <p className="text-sm text-red-700">{securityWarning}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Error Messages */}
      {errors.length > 0 && showValidation && (
        <div id={`${inputRef.current?.id}-feedback`} className="mt-2 space-y-1">
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
      
      {/* Warning Messages */}
      {warnings.length > 0 && showValidation && !hasErrors && (
        <div className="mt-2 space-y-1">
          {warnings.map((warning, index) => (
            <div key={index} className="flex items-start text-sm text-yellow-600">
              <svg className="w-4 h-4 mt-0.5 mr-1.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.08 14.5c-.77.833.192 2.5 1.732 2.5z"></path>
              </svg>
              <span>{warning.error || warning.warning}</span>
              {warning.suggestion && (
                <button
                  onClick={() => onChange(warning.suggestion)}
                  className="ml-2 text-yellow-700 underline hover:no-underline"
                >
                  Use {warning.suggestion}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ValidatedInput;