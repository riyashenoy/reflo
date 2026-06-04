import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import RootNavigation from './app/navigation';

export default function App() {
  return (
    <SafeAreaProvider>
      <RootNavigation />
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
