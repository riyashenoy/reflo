import { createContext, useContext } from 'react';

export type AppEntryRoute = 'Main' | 'ProfileSetup';

type AuthFlowContextValue = {
  setAppEntryRoute: (route: AppEntryRoute) => void;
};

export const AuthFlowContext = createContext<AuthFlowContextValue | null>(null);

export function useAuthFlow() {
  const context = useContext(AuthFlowContext);
  if (!context) {
    throw new Error('useAuthFlow must be used within AuthFlowContext.Provider');
  }
  return context;
}
