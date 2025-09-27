/**
 * Hook d'optimisation pour éviter les re-renders inutiles
 * Utilise React.memo, useMemo, et useCallback de manière centralisée
 */

import { useMemo, useCallback, useRef, useEffect, useState } from 'react';

/**
 * Hook pour optimiser les props passées aux composants enfants
 * @param {Object} props - Les props à optimiser
 * @param {Array} deps - Les dépendances pour la mémoisation
 * @returns {Object} Props optimisées
 */
export function useOptimizedProps(props, deps = []) {
  return useMemo(() => props, deps);
}

/**
 * Hook pour optimiser les callbacks avec dépendances stables
 * @param {Function} callback - La fonction à optimiser
 * @param {Array} deps - Les dépendances
 * @returns {Function} Callback optimisé
 */
export function useStableCallback(callback, deps = []) {
  return useCallback(callback, deps);
}

/**
 * Hook pour éviter les re-renders lors de changements d'objets/arrays
 * Utilise une comparaison profonde pour la mémoisation
 * @param {*} value - La valeur à stabiliser
 * @returns {*} Valeur stabilisée
 */
export function useDeepMemo(value) {
  const ref = useRef();

  if (!deepEqual(ref.current, value)) {
    ref.current = value;
  }

  return ref.current;
}

/**
 * Hook pour traquer les re-renders en développement
 * @param {string} componentName - Nom du composant
 * @param {Object} props - Props du composant
 */
export function useRenderTracker(componentName, props = {}) {
  const renderCount = useRef(0);
  const prevProps = useRef();

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      renderCount.current += 1;

      if (prevProps.current) {
        const changedProps = Object.keys(props).filter(
          key => props[key] !== prevProps.current[key]
        );

        if (changedProps.length > 0) {
          console.log(`🔄 ${componentName} re-render #${renderCount.current}`, {
            changedProps,
            newProps: changedProps.reduce((acc, key) => ({
              ...acc,
              [key]: props[key]
            }), {}),
            prevProps: changedProps.reduce((acc, key) => ({
              ...acc,
              [key]: prevProps.current[key]
            }), {})
          });
        }
      }

      prevProps.current = props;
    }
  });
}

/**
 * Hook pour créer des mémoîsations conditionnelles
 * @param {Function} factory - Fonction de création de la valeur
 * @param {Array} deps - Dépendances
 * @param {Boolean} condition - Condition pour la mémoisation
 * @returns {*} Valeur mémorisée ou recalculée
 */
export function useConditionalMemo(factory, deps, condition = true) {
  return useMemo(() => {
    if (!condition) {
      return factory();
    }
    return factory();
  }, condition ? deps : []);
}

/**
 * Comparaison profonde simple pour les objets et arrays
 * @param {*} a - Première valeur
 * @param {*} b - Seconde valeur
 * @returns {Boolean} True si égales
 */
function deepEqual(a, b) {
  if (a === b) return true;

  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  if (!a || !b || (typeof a !== 'object' && typeof b !== 'object')) {
    return a === b;
  }

  if (a === null || a === undefined || b === null || b === undefined) {
    return false;
  }

  if (a.prototype !== b.prototype) return false;

  let keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) {
    return false;
  }

  return keys.every(k => deepEqual(a[k], b[k]));
}

/**
 * Hook pour optimiser les listes avec de nombreux éléments
 * @param {Array} items - Liste d'éléments
 * @param {Function} keyExtractor - Fonction d'extraction de clé
 * @param {Function} renderer - Fonction de rendu d'un élément
 * @returns {Array} Éléments rendus optimisés
 */
export function useOptimizedList(items, keyExtractor, renderer) {
  return useMemo(() => {
    if (!Array.isArray(items)) return [];

    return items.map((item, index) => {
      const key = keyExtractor ? keyExtractor(item, index) : index;
      return {
        key,
        element: renderer(item, index, key)
      };
    });
  }, [items, keyExtractor, renderer]);
}

/**
 * Hook pour débouncer les valeurs et éviter les re-renders fréquents
 * @param {*} value - Valeur à débouncer
 * @param {number} delay - Délai en ms
 * @returns {*} Valeur débouncée
 */
export function useDebouncedValue(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}