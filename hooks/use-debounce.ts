import { useEffect, useState } from 'react';

/**
 * Hook pour retarder la mise à jour d'une valeur (debounce)
 * Utile pour les recherches en temps réel
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
