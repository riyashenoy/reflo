import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useIsMobileWeb } from './app/hooks/useIsMobileWeb';
import { SavedWorkoutsProvider } from './app/context/SavedWorkoutsContext';
import RootNavigation from './app/navigation';
import theme from './app/theme';

SplashScreen.preventAutoHideAsync();

function useMobileWebViewport() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      return;
    }

    const meta = document.querySelector('meta[name="viewport"]');
    if (meta) {
      meta.setAttribute(
        'content',
        'width=device-width, initial-scale=1, viewport-fit=cover'
      );
    }
  }, []);
}

export default function App() {
  const isMobileWeb = useIsMobileWeb();
  useMobileWebViewport();
  const [fontsLoaded, fontError] = useFonts({
    'SHAdGrotesk-Regular': require('./assets/fonts/adgroteskregular.ttf'),
    'SHAdGrotesk-Light': require('./assets/fonts/adgrotesklight.ttf'),
    'SHAdGrotesk-Medium': require('./assets/fonts/adgroteskmedium.ttf'),
    // Space-free filenames — URLs with spaces break @font-face on web / Vercel.
    'LouisGeorgeCafe': require('./assets/fonts/LouisGeorgeCafe.ttf'),
    'LouisGeorgeCafe-Bold': require('./assets/fonts/LouisGeorgeCafe-Bold.ttf'),
    'LouisGeorgeCafe-Italic': require('./assets/fonts/LouisGeorgeCafe-Italic.ttf'),
    'LouisGeorgeCafe-BoldItalic': require('./assets/fonts/LouisGeorgeCafe-BoldItalic.ttf'),
    'LouisGeorgeCafe-Light': require('./assets/fonts/LouisGeorgeCafe-Light.ttf'),
    'LouisGeorgeCafe-LightItalic': require('./assets/fonts/LouisGeorgeCafe-LightItalic.ttf'),
    Inter_400Regular,
    Inter_500Medium,
  });

  useEffect(() => {
    if (fontError) {
      console.error('[Fonts] Loading error:', fontError);
      void SplashScreen.hideAsync();
      return;
    }

    if (fontsLoaded) {
      console.log('[Fonts] Loaded successfully:', {
        'SHAdGrotesk-Regular': true,
        'LouisGeorgeCafe-Bold': true,
        Inter_400Regular: true,
      });
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Block first paint until faces are ready so we never flash system fonts.
  // On hard load failure, still mount (logged above) rather than hang forever.
  if (!fontsLoaded && !fontError) {
    return null;
  }

  const appContent = (
    <SafeAreaProvider>
      <SavedWorkoutsProvider>
        <RootNavigation />
      </SavedWorkoutsProvider>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );

  if (Platform.OS === 'web') {
    if (isMobileWeb) {
      return (
        <View style={styles.mobileWebRoot}>
          {appContent}
        </View>
      );
    }

    return (
      <View style={styles.webContainer}>
        <View style={styles.phoneFrame}>{appContent}</View>
      </View>
    );
  }

  return appContent;
}

const styles = StyleSheet.create({
  mobileWebRoot: {
    flex: 1,
    width: '100%',
    height: '100dvh' as any,
    minHeight: '100dvh' as any,
    maxHeight: '100dvh' as any,
    backgroundColor: theme.colors.background,
    overflow: 'hidden',
  },
  webContainer: {
    flex: 1,
    backgroundColor: '#242121',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100dvh' as any,
  },
  phoneFrame: {
    width: 390,
    height: '100dvh' as any,
    maxHeight: 844,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: theme.colors.background,
  },
});
