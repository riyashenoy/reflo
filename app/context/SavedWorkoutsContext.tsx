import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  readSavedWorkoutIds,
  writeSavedWorkoutIds,
} from '../lib/savedWorkoutsStorage';

type SavedWorkoutsContextValue = {
  savedIds: string[];
  isLoading: boolean;
  isSaved: (workoutId: string) => boolean;
  toggleSaved: (workoutId: string) => void;
};

const SavedWorkoutsContext = createContext<SavedWorkoutsContextValue | null>(
  null
);

export function SavedWorkoutsProvider({ children }: { children: ReactNode }) {
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    void (async () => {
      const ids = await readSavedWorkoutIds();
      if (active) {
        setSavedIds(ids);
        setIsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const isSaved = useCallback(
    (workoutId: string) => savedIds.includes(workoutId),
    [savedIds]
  );

  const toggleSaved = useCallback((workoutId: string) => {
    setSavedIds((current) => {
      const next = current.includes(workoutId)
        ? current.filter((id) => id !== workoutId)
        : [...current, workoutId];

      void writeSavedWorkoutIds(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      savedIds,
      isLoading,
      isSaved,
      toggleSaved,
    }),
    [savedIds, isLoading, isSaved, toggleSaved]
  );

  return (
    <SavedWorkoutsContext.Provider value={value}>
      {children}
    </SavedWorkoutsContext.Provider>
  );
}

export function useSavedWorkouts() {
  const context = useContext(SavedWorkoutsContext);
  if (!context) {
    throw new Error(
      'useSavedWorkouts must be used within SavedWorkoutsProvider'
    );
  }
  return context;
}
