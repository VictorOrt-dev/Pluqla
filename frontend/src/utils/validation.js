// Validation robuste des données
// Impact: Sécurité, prévention d'erreurs, feedback utilisateur amélioré
// Utilisé par: formulaires, inputs, données API, localStorage

import { useState, useCallback, useMemo } from 'react';

// Schémas de validation pour les différents types de données
export const ValidationSchemas = {
  userData: {
    name: {
      required: true,
      type: 'string',
      minLength: 2,
      maxLength: 50,
      pattern: /^[a-zA-ZÀ-ÿ\s\-']+$/,
      message: 'Le nom doit contenir entre 2 et 50 caractères alphabétiques'
    },
    savedAmount: {
      required: true,
      type: 'number',
      min: 0,
      max: 1000000,
      message: 'Le montant épargné doit être entre 0 et 1,000,000€'
    },
    monthlyGoal: {
      required: true,
      type: 'number',
      min: 10,
      max: 10000,
      message: 'L\'objectif mensuel doit être entre 10 et 10,000€'
    },
    age: {
      required: false,
      type: 'number',
      min: 13,
      max: 120,
      message: 'L\'âge doit être entre 13 et 120 ans'
    }
  },

  transaction: {
    amount: {
      required: true,
      type: 'number',
      min: 0.01,
      max: 10000,
      message: 'Le montant doit être entre 0,01€ et 10,000€'
    },
    category: {
      required: true,
      type: 'string',
      enum: ['alimentation', 'habits', 'activite', 'deplacement'],
      message: 'Catégorie invalide'
    },
    description: {
      required: true,
      type: 'string',
      minLength: 3,
      maxLength: 100,
      message: 'La description doit contenir entre 3 et 100 caractères'
    }
  },

  questionnaire: {
    age: {
      required: true,
      type: 'number',
      min: 13,
      max: 120,
      message: 'Veuillez indiquer votre âge'
    },
    mainSpending: {
      required: true,
      type: 'string',
      enum: ['Alimentation', 'Shopping', 'Sorties', 'Transport', 'Autre'],
      message: 'Veuillez sélectionner votre principale dépense'
    },
    mealsPerWeek: {
      required: true,
      type: 'number',
      min: 0,
      max: 21,
      message: 'Nombre de repas par semaine invalide'
    }
  }
};

// Classe principale de validation
export class Validator {
  static validate(data, schema) {
    const errors = {};
    let isValid = true;

    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field];
      const fieldErrors = this.validateField(value, rules, field);

      if (fieldErrors.length > 0) {
        errors[field] = fieldErrors;
        isValid = false;
      }
    }

    return {
      isValid,
      errors,
      errorCount: Object.keys(errors).length
    };
  }

  static validateField(value, rules, fieldName = '') {
    const errors = [];

    // Vérifier si le champ est requis
    if (rules.required && (value === null || value === undefined || value === '')) {
      errors.push(rules.message || `${fieldName} est requis`);
      return errors; // Arrêter ici si le champ est requis mais vide
    }

    // Si la valeur est vide et non requise, passer
    if (!rules.required && (value === null || value === undefined || value === '')) {
      return errors;
    }

    // Validation du type
    if (rules.type && !this.validateType(value, rules.type)) {
      errors.push(rules.message || `${fieldName} doit être de type ${rules.type}`);
      return errors; // Arrêter si le type est incorrect
    }

    // Validation des contraintes spécifiques
    if (rules.type === 'string') {
      if (rules.minLength && value.length < rules.minLength) {
        errors.push(rules.message || `${fieldName} doit contenir au moins ${rules.minLength} caractères`);
      }
      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push(rules.message || `${fieldName} ne peut pas dépasser ${rules.maxLength} caractères`);
      }
      if (rules.pattern && !rules.pattern.test(value)) {
        errors.push(rules.message || `${fieldName} ne respecte pas le format requis`);
      }
    }

    if (rules.type === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        errors.push(rules.message || `${fieldName} doit être supérieur ou égal à ${rules.min}`);
      }
      if (rules.max !== undefined && value > rules.max) {
        errors.push(rules.message || `${fieldName} doit être inférieur ou égal à ${rules.max}`);
      }
    }

    // Validation enum
    if (rules.enum && !rules.enum.includes(value)) {
      errors.push(rules.message || `${fieldName} doit être une des valeurs: ${rules.enum.join(', ')}`);
    }

    return errors;
  }

  static validateType(value, expectedType) {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      default:
        return true;
    }
  }

  // Sanitisation des données
  static sanitize(data, schema) {
    const sanitized = {};

    for (const [field, rules] of Object.entries(schema)) {
      let value = data[field];

      if (value === null || value === undefined) {
        sanitized[field] = value;
        continue;
      }

      switch (rules.type) {
        case 'string':
          // Nettoyer les chaînes
          value = String(value).trim();
          // Échapper les caractères HTML
          value = value.replace(/[<>]/g, '');
          break;

        case 'number':
          value = Number(value);
          // Limiter les décimales à 2 pour les montants
          if (field.includes('amount') || field.includes('Amount')) {
            value = Math.round(value * 100) / 100;
          }
          break;

        default:
          break;
      }

      sanitized[field] = value;
    }

    return sanitized;
  }
}


export const useValidation = (initialData = {}, schema = {}) => {
  const [data, setData] = useState(initialData);
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation en temps réel
  const validation = useMemo(() => {
    return Validator.validate(data, schema);
  }, [data, schema]);

  // Mettre à jour un champ et marquer comme touché
  const updateField = useCallback((field, value) => {
    setData(prev => ({ ...prev, [field]: value }));
    setTouched(prev => ({ ...prev, [field]: true }));
  }, []);

  // Marquer tous les champs comme touchés
  const touchAllFields = useCallback(() => {
    const allFields = Object.keys(schema);
    setTouched(allFields.reduce((acc, field) => ({ ...acc, [field]: true }), {}));
  }, [schema]);

  // Valider et soumettre
  const validateAndSubmit = useCallback(async (onSubmit) => {
    touchAllFields();
    setIsSubmitting(true);

    try {
      if (validation.isValid) {
        const sanitizedData = Validator.sanitize(data, schema);
        await onSubmit(sanitizedData);
        return { success: true };
      } else {
        return { success: false, errors: validation.errors };
      }
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setIsSubmitting(false);
    }
  }, [data, schema, validation, touchAllFields]);

  // Obtenir les erreurs d'un champ spécifique
  const getFieldErrors = useCallback((field) => {
    if (!touched[field]) return [];
    return validation.errors[field] || [];
  }, [touched, validation.errors]);

  // Vérifier si un champ a des erreurs
  const hasFieldError = useCallback((field) => {
    return touched[field] && validation.errors[field]?.length > 0;
  }, [touched, validation.errors]);

  return {
    data,
    setData,
    updateField,
    validation,
    touched,
    touchAllFields,
    validateAndSubmit,
    getFieldErrors,
    hasFieldError,
    isSubmitting,
    isValid: validation.isValid && Object.keys(touched).length > 0
  };
};