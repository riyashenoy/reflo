import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import RootNavigation from './app/navigation';

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    'SHAdGrotesk-Regular': require('./assets/fonts/adgroteskregular.ttf'),
    'SHAdGrotesk-Light': require('./assets/fonts/adgrotesklight.ttf'),
    'SHAdGrotesk-Medium': require('./assets/fonts/adgroteskmedium.ttf'),
    'LouisGeorgeCafe': require('./assets/fonts/Louis George Cafe.ttf'),
    'LouisGeorgeCafe-Bold': require('./assets/fonts/Louis George Cafe Bold.ttf'),
    'LouisGeorgeCafe-Italic': require('./assets/fonts/Louis George Cafe Italic.ttf'),
    'LouisGeorgeCafe-BoldItalic': require('./assets/fonts/Louis George Cafe Bold Italic.ttf'),
    'LouisGeorgeCafe-Light': require('./assets/fonts/Louis George Cafe Light.ttf'),
    'LouisGeorgeCafe-LightItalic': require('./assets/fonts/Louis George Cafe Light Italic.ttf'),
    Inter_400Regular,
    Inter_500Medium,
  });

  useEffect(() => {
    if (fontError) {
      console.error('[Fonts] Loading error:', fontError);
      return;
    }

    if (fontsLoaded) {
      console.log('[Fonts] Loaded successfully:', {
        'SHAdGrotesk-Regular': true,
        'LouisGeorgeCafe-Bold': true,
      });
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <RootNavigation />
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
