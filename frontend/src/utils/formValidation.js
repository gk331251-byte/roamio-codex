// Comprehensive Form Validation with XSS Protection
// Real-time validation, sanitization, and security measures

import DOMPurify from 'dompurify';

/**
 * Input Sanitization with XSS Protection
 */
export class InputSanitizer {
  static sanitizeText(input, options = {}) {
    if (typeof input !== 'string') {
      return '';
    }
    
    const {
      maxLength = 1000,
      allowBasicFormatting = false,
      preserveNewlines = false
    } = options;
    
    // First sanitization pass - remove dangerous content
    let sanitized = DOMPurify.sanitize(input, {
      ALLOWED_TAGS: allowBasicFormatting ? ['b', 'i', 'em', 'strong'] : [],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true
    });
    
    // Additional XSS protection patterns
    const xssPatterns = [
      /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /onload/gi,
      /onerror/gi,
      /onclick/gi,
      /onmouseover/gi,
      /onfocus/gi,
      /onblur/gi,
      /onchange/gi,
      /onsubmit/gi,
      /<iframe/gi,
      /<object/gi,
      /<embed/gi,
      /<form/gi,
      /data:text\/html/gi,
      /data:application/gi
    ];
    
    xssPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });
    
    // Normalize whitespace
    if (!preserveNewlines) {
      sanitized = sanitized.replace(/\s+/g, ' ').trim();
    }
    
    // Enforce length limit
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength).trim();
    }
    
    return sanitized;
  }
  
  static sanitizeLocation(input) {
    if (typeof input !== 'string') {
      return '';
    }
    
    // Location-specific sanitization
    let sanitized = this.sanitizeText(input, { maxLength: 200 });
    
    // Remove potentially dangerous characters for location queries
    sanitized = sanitized.replace(/[<>'"&]/g, '');
    
    // Remove SQL injection patterns
    const sqlPatterns = [
      /union\s+select/gi,
      /drop\s+table/gi,
      /delete\s+from/gi,
      /insert\s+into/gi,
      /update\s+set/gi,
      /--/g,
      /\/\*/g,
      /\*\//g
    ];
    
    sqlPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });
    
    return sanitized;
  }
  
  static sanitizeNumericInput(input, min = 0, max = Number.MAX_SAFE_INTEGER) {
    const num = parseInt(input, 10);
    
    if (isNaN(num)) {
      return min;
    }
    
    return Math.max(min, Math.min(max, num));
  }
  
  static sanitizeEmail(input) {
    if (typeof input !== 'string') {
      return '';
    }
    
    // Basic email sanitization
    let sanitized = this.sanitizeText(input, { maxLength: 254 });
    
    // Remove dangerous characters
    sanitized = sanitized.replace(/[<>'"&()]/g, '');
    
    return sanitized.toLowerCase().trim();
  }
}

/**
 * Validation Rules Engine
 */
export class ValidationRules {
  static required(value, fieldName = 'Field') {
    const sanitizedValue = typeof value === 'string' ? value.trim() : value;
    
    if (!sanitizedValue || sanitizedValue === '' || sanitizedValue === null || sanitizedValue === undefined) {
      return {
        isValid: false,
        error: `${fieldName} is required`,
        severity: 'error'
      };
    }
    
    return { isValid: true };
  }
  
  static minLength(value, minLength, fieldName = 'Field') {
    if (typeof value !== 'string') {
      return {
        isValid: false,
        error: `${fieldName} must be a valid text`,
        severity: 'error'
      };
    }
    
    if (value.trim().length < minLength) {
      return {
        isValid: false,
        error: `${fieldName} must be at least ${minLength} characters long`,
        severity: 'error'
      };
    }
    
    return { isValid: true };
  }
  
  static maxLength(value, maxLength, fieldName = 'Field') {
    if (typeof value !== 'string') {
      return { isValid: true };
    }
    
    if (value.length > maxLength) {
      return {
        isValid: false,
        error: `${fieldName} must be no more than ${maxLength} characters`,
        severity: 'error'
      };
    }
    
    return { isValid: true };
  }
  
  static validLocation(value) {
    if (!value || typeof value !== 'string') {
      return {
        isValid: false,
        error: 'Please enter a valid location',
        severity: 'error'
      };
    }
    
    const sanitized = InputSanitizer.sanitizeLocation(value);
    
    if (sanitized.length < 2) {
      return {
        isValid: false,
        error: 'Location must be at least 2 characters long',
        severity: 'error'
      };
    }
    
    if (sanitized.length > 200) {
      return {
        isValid: false,
        error: 'Location name is too long (max 200 characters)',
        severity: 'error'
      };
    }
    
    // Check for valid location patterns
    const validLocationPattern = /^[a-zA-Z0-9\s,.-]+$/;
    if (!validLocationPattern.test(sanitized)) {
      return {
        isValid: false,
        error: 'Location contains invalid characters. Use only letters, numbers, spaces, commas, periods, and hyphens.',
        severity: 'error'
      };
    }
    
    // Check for suspicious patterns
    const suspiciousPatterns = [
      /script/gi,
      /javascript/gi,
      /vbscript/gi,
      /onclick/gi,
      /onerror/gi,
      /<.*>/gi,
      /\{.*\}/gi,
      /\[.*\]/gi
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(sanitized)) {
        return {
          isValid: false,
          error: 'Location contains invalid content. Please enter a real location name.',
          severity: 'error'
        };
      }
    }
    
    return { isValid: true, sanitizedValue: sanitized };
  }
  
  static validTimeLimit(value) {
    const num = parseInt(value, 10);
    
    if (isNaN(num)) {
      return {
        isValid: false,
        error: 'Time limit must be a valid number',
        severity: 'error'
      };
    }
    
    if (num < 15) {
      return {
        isValid: false,
        error: 'Quest time must be at least 15 minutes',
        severity: 'error'
      };
    }
    
    if (num > 480) { // 8 hours max
      return {
        isValid: false,
        error: 'Quest time cannot exceed 8 hours (480 minutes)',
        severity: 'error'
      };
    }
    
    // Suggest common time intervals
    const commonTimes = [30, 45, 60, 90, 120, 180, 240];
    const closest = commonTimes.reduce((prev, curr) => 
      Math.abs(curr - num) < Math.abs(prev - num) ? curr : prev
    );
    
    if (Math.abs(closest - num) > 0 && Math.abs(closest - num) <= 5) {
      return {
        isValid: true,
        warning: `Did you mean ${closest} minutes?`,
        severity: 'warning',
        suggestion: closest
      };
    }
    
    return { isValid: true };
  }
  
  static validMoodSelection(moods) {
    if (!Array.isArray(moods)) {
      return {
        isValid: false,
        error: 'Please select at least one mood for your quest',
        severity: 'error'
      };
    }
    
    if (moods.length === 0) {
      return {
        isValid: false,
        error: 'Please select at least one mood for your quest',
        severity: 'error'
      };
    }
    
    if (moods.length > 3) {
      return {
        isValid: false,
        error: 'Please select no more than 3 moods for better quest customization',
        severity: 'error'
      };
    }
    
    // Validate each mood value
    const validMoods = [
      'adventurous', 'chill', 'romantic', 'mystery', 'cozy', 
      'historic', 'artistic', 'foodie', 'nature', 'nightlife', 
      'family', 'budget', 'luxury', 'weird'
    ];
    
    for (const mood of moods) {
      if (!validMoods.includes(mood)) {
        return {
          isValid: false,
          error: `"${mood}" is not a valid mood option`,
          severity: 'error'
        };
      }
    }
    
    return { isValid: true };
  }
  
  static validEmail(value) {
    if (!value || typeof value !== 'string') {
      return {
        isValid: false,
        error: 'Email address is required',
        severity: 'error'
      };
    }
    
    const sanitized = InputSanitizer.sanitizeEmail(value);
    
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    if (!emailPattern.test(sanitized)) {
      return {
        isValid: false,
        error: 'Please enter a valid email address',
        severity: 'error'
      };
    }
    
    if (sanitized.length > 254) {
      return {
        isValid: false,
        error: 'Email address is too long',
        severity: 'error'
      };
    }
    
    return { isValid: true, sanitizedValue: sanitized };
  }
}

/**
 * Real-time Form Validator
 */
export class FormValidator {
  constructor() {
    this.fields = new Map();
    this.errors = new Map();
    this.warnings = new Map();
    this.isValidating = false;
  }
  
  addField(fieldName, value, rules = []) {
    this.fields.set(fieldName, { value, rules });
    this.validateField(fieldName);
  }
  
  updateField(fieldName, value) {
    const field = this.fields.get(fieldName);
    if (field) {
      field.value = value;
      this.validateField(fieldName);
    }
  }
  
  validateField(fieldName) {
    const field = this.fields.get(fieldName);
    if (!field) return;
    
    const { value, rules } = field;
    let fieldErrors = [];
    let fieldWarnings = [];
    
    for (const rule of rules) {
      const result = rule(value);
      
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
    
    if (fieldErrors.length > 0) {
      this.errors.set(fieldName, fieldErrors);
    } else {
      this.errors.delete(fieldName);
    }
    
    if (fieldWarnings.length > 0) {
      this.warnings.set(fieldName, fieldWarnings);
    } else {
      this.warnings.delete(fieldName);
    }
  }
  
  validateAll() {
    this.isValidating = true;
    
    for (const fieldName of this.fields.keys()) {
      this.validateField(fieldName);
    }
    
    return this.isValid();
  }
  
  isValid() {
    return this.errors.size === 0;
  }
  
  getErrors(fieldName = null) {
    if (fieldName) {
      return this.errors.get(fieldName) || [];
    }
    return Object.fromEntries(this.errors);
  }
  
  getWarnings(fieldName = null) {
    if (fieldName) {
      return this.warnings.get(fieldName) || [];
    }
    return Object.fromEntries(this.warnings);
  }
  
  getFirstError(fieldName) {
    const errors = this.errors.get(fieldName);
    return errors && errors.length > 0 ? errors[0] : null;
  }
  
  hasErrors() {
    return this.errors.size > 0;
  }
  
  hasWarnings() {
    return this.warnings.size > 0;
  }
  
  clearField(fieldName) {
    this.errors.delete(fieldName);
    this.warnings.delete(fieldName);
  }
  
  clear() {
    this.errors.clear();
    this.warnings.clear();
    this.fields.clear();
    this.isValidating = false;
  }
  
  getSanitizedValues() {
    const sanitizedValues = {};
    
    for (const [fieldName, field] of this.fields) {
      const { value } = field;
      
      // Apply appropriate sanitization based on field type
      switch (fieldName) {
        case 'location':
        case 'city':
          sanitizedValues[fieldName] = InputSanitizer.sanitizeLocation(value);
          break;
        case 'email':
          sanitizedValues[fieldName] = InputSanitizer.sanitizeEmail(value);
          break;
        case 'timeLimit':
          sanitizedValues[fieldName] = InputSanitizer.sanitizeNumericInput(value, 15, 480);
          break;
        default:
          sanitizedValues[fieldName] = InputSanitizer.sanitizeText(value);
      }
    }
    
    return sanitizedValues;
  }
}

/**
 * Quest Form Specific Validator
 */
export class QuestFormValidator extends FormValidator {
  constructor() {
    super();
    this.setupQuestValidation();
  }
  
  setupQuestValidation() {
    // Pre-configure validation rules for quest form
    this.questRules = {
      location: [
        (value) => ValidationRules.required(value, 'Location'),
        (value) => ValidationRules.validLocation(value)
      ],
      mood: [
        (value) => ValidationRules.validMoodSelection(value)
      ],
      timeLimit: [
        (value) => ValidationRules.required(value, 'Time limit'),
        (value) => ValidationRules.validTimeLimit(value)
      ]
    };
  }
  
  validateQuestForm(formData) {
    const { location, mood, timeLimit } = formData;
    
    // Add fields with their rules
    this.addField('location', location, this.questRules.location);
    this.addField('mood', mood, this.questRules.mood);
    this.addField('timeLimit', timeLimit, this.questRules.timeLimit);
    
    return this.validateAll();
  }
  
  getQuestFormErrors() {
    return {
      location: this.getFirstError('location'),
      mood: this.getFirstError('mood'),
      timeLimit: this.getFirstError('timeLimit'),
      hasErrors: this.hasErrors()
    };
  }
  
  getQuestFormWarnings() {
    return {
      location: this.getWarnings('location'),
      mood: this.getWarnings('mood'),
      timeLimit: this.getWarnings('timeLimit'),
      hasWarnings: this.hasWarnings()
    };
  }
}

/**
 * Security Utilities
 */
export class SecurityUtils {
  static detectSuspiciousInput(input) {
    if (typeof input !== 'string') {
      return { isSuspicious: false };
    }
    
    const suspiciousPatterns = [
      { pattern: /<script/gi, reason: 'Script tag detected' },
      { pattern: /javascript:/gi, reason: 'JavaScript protocol detected' },
      { pattern: /vbscript:/gi, reason: 'VBScript protocol detected' },
      { pattern: /data:text\/html/gi, reason: 'Data URI with HTML detected' },
      { pattern: /on\w+\s*=/gi, reason: 'Event handler detected' },
      { pattern: /\{.*\{/g, reason: 'Template injection pattern detected' },
      { pattern: /\{\{.*\}\}/g, reason: 'Template syntax detected' },
      { pattern: /<%.*%>/g, reason: 'Server-side script detected' },
      { pattern: /union\s+select/gi, reason: 'SQL injection pattern detected' },
      { pattern: /drop\s+table/gi, reason: 'SQL injection pattern detected' },
      { pattern: /<iframe/gi, reason: 'Iframe tag detected' },
      { pattern: /<object/gi, reason: 'Object tag detected' },
      { pattern: /<embed/gi, reason: 'Embed tag detected' }
    ];
    
    for (const { pattern, reason } of suspiciousPatterns) {
      if (pattern.test(input)) {
        return {
          isSuspicious: true,
          reason,
          pattern: pattern.source
        };
      }
    }
    
    return { isSuspicious: false };
  }
  
  static logSecurityEvent(eventType, details) {
    const securityEvent = {
      timestamp: new Date().toISOString(),
      type: eventType,
      details,
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    console.warn('🔒 Security Event:', securityEvent);
    
    // In production, this would be sent to a security monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to security monitoring endpoint
      // fetch('/api/security-events', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(securityEvent)
      // });
    }
  }
}

// Export validation hook for React components
import { useState, useCallback } from 'react';

export const useFormValidation = (initialRules = {}) => {
  const [validator] = useState(() => new FormValidator());
  const [errors, setErrors] = useState({});
  const [warnings, setWarnings] = useState({});
  
  const validateField = useCallback((fieldName, value) => {
    validator.updateField(fieldName, value);
    setErrors(validator.getErrors());
    setWarnings(validator.getWarnings());
  }, [validator]);
  
  const validateAll = useCallback(() => {
    const isValid = validator.validateAll();
    setErrors(validator.getErrors());
    setWarnings(validator.getWarnings());
    return isValid;
  }, [validator]);
  
  const addField = useCallback((fieldName, value, rules) => {
    validator.addField(fieldName, value, rules);
    setErrors(validator.getErrors());
    setWarnings(validator.getWarnings());
  }, [validator]);
  
  const getSanitizedValues = useCallback(() => {
    return validator.getSanitizedValues();
  }, [validator]);
  
  const clearValidation = useCallback(() => {
    validator.clear();
    setErrors({});
    setWarnings({});
  }, [validator]);
  
  return {
    validateField,
    validateAll,
    addField,
    getSanitizedValues,
    clearValidation,
    errors,
    warnings,
    isValid: validator.isValid(),
    hasErrors: validator.hasErrors(),
    hasWarnings: validator.hasWarnings()
  };
};