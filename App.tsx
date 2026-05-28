import { StatusBar } from 'expo-status-bar';

import RootNavigation from './app/navigation';

export default function App() {
  return (
    <>
      <RootNavigation />
      <StatusBar style="auto" />
    </>
  );
}
