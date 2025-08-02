// Form Validation Summary Component
import React from 'react';

const FormValidationSummary = ({
  errors = {},
  warnings = {},
  isVisible = false,
  onDismiss,
  className = ''
}) => {
  const errorFields = Object.keys(errors).filter(field => errors[field] && errors[field].length > 0);
  const warningFields = Object.keys(warnings).filter(field => warnings[field] && warnings[field].length > 0);
  
  const hasErrors = errorFields.length > 0;
  const hasWarnings = warningFields.length > 0;
  
  if (!isVisible || (!hasErrors && !hasWarnings)) {
    return null;
  }
  
  return (
    <div className={`rounded-lg border p-4 ${className}`}>
      {/* Error Summary */}
      {hasErrors && (
        <div className="mb-4 last:mb-0">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800 mb-2">
                {errorFields.length === 1 ? 'Please fix this issue:' : `Please fix these ${errorFields.length} issues:`}
              </h3>
              <ul className="space-y-1">
                {errorFields.map(field => {
                  const fieldErrors = errors[field];
                  return fieldErrors.map((error, index) => (
                    <li key={`${field}-${index}`} className="text-sm text-red-700">
                      <span className="font-medium capitalize">{field.replace(/([A-Z])/g, ' $1').toLowerCase()}:</span>{' '}
                      {error.error || error.message}
                    </li>
                  ));
                })}
              </ul>
            </div>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="ml-2 text-red-400 hover:text-red-600"
                aria-label="Dismiss"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Warning Summary */}
      {hasWarnings && !hasErrors && (
        <div className="mb-4 last:mb-0">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-yellow-500 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.08 14.5c-.77.833.192 2.5 1.732 2.5z"></path>
            </svg>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-yellow-800 mb-2">
                {warningFields.length === 1 ? 'Suggestion:' : 'Suggestions:'}
              </h3>
              <ul className="space-y-1">
                {warningFields.map(field => {
                  const fieldWarnings = warnings[field];
                  return fieldWarnings.map((warning, index) => (
                    <li key={`${field}-${index}`} className="text-sm text-yellow-700">
                      <span className="font-medium capitalize">{field.replace(/([A-Z])/g, ' $1').toLowerCase()}:</span>{' '}
                      {warning.warning || warning.message}
                    </li>
                  ));
                })}
              </ul>
            </div>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="ml-2 text-yellow-400 hover:text-yellow-600"
                aria-label="Dismiss"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Quick validation status indicator
export const ValidationStatus = ({ isValid, hasWarnings, isValidating, className = '' }) => {
  if (isValidating) {
    return (
      <div className={`flex items-center space-x-2 text-sage-600 ${className}`}>
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
        </svg>
        <span className="text-sm">Validating...</span>
      </div>
    );
  }
  
  if (!isValid) {
    return (
      <div className={`flex items-center space-x-2 text-red-600 ${className}`}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <span className="text-sm">Please fix the errors above</span>
      </div>
    );
  }
  
  if (hasWarnings) {
    return (
      <div className={`flex items-center space-x-2 text-yellow-600 ${className}`}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.08 14.5c-.77.833.192 2.5 1.732 2.5z"></path>
        </svg>
        <span className="text-sm">Ready to generate (with suggestions)</span>
      </div>
    );
  }
  
  return (
    <div className={`flex items-center space-x-2 text-green-600 ${className}`}>
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
      </svg>
      <span className="text-sm">Ready to generate your quest!</span>
    </div>
  );
};

export default FormValidationSummary;