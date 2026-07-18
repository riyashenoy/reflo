import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import {
  NavigationContainer,
  type LinkingOptions,
} from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged, type User } from 'firebase/auth';

import { AuthFlowContext, type AppEntryRoute } from '../context/AuthFlowContext';
import Calendar from '../screens/Calendar';
import ClassDetail from '../screens/ClassDetail';
import DemoWorkout from '../screens/DemoWorkout';
import ExercisePreview from '../screens/ExercisePreview';
import EmailAuth from '../screens/EmailAuth';
import Home from '../screens/Home';
import LiveWorkout from '../screens/LiveWorkout';
import PostWorkout from '../screens/PostWorkout';
import Profile from '../screens/Profile';
import ProfileEdit from '../screens/ProfileEdit';
import ProfileSetup from '../screens/ProfileSetup';
import Progress from '../screens/Progress';
import SignIn from '../screens/SignIn';
import BottomTabBar from '../components/BottomTabBar';
import PikePressLoader, {
  PIKE_PRESS_CYCLE_S,
} from '../components/PikePressLoader';
import { auth } from '../lib/firebase';
import type { SessionLogEntry } from '../hooks/usePoseDetection';
import theme from '../theme';

export type AuthStackParamList = {
  SignIn: undefined;
  EmailAuth: undefined;
};

export type AppStackParamList = {
  Main: undefined;
  ProfileSetup: undefined;
  ClassDetail: { libraryId?: string; workoutId?: string };
  ExercisePreview: { workoutId: string; exerciseIndex: number };
  LiveWorkout: { workoutId?: string; libraryId?: string; dateKey?: string };
  PostWorkout: {
    workoutId?: string;
    libraryId?: string;
    dateKey?: string;
    formScore?: number;
    readOnly?: boolean;
    sessionLog?: SessionLogEntry[];
  };
  ProfileEdit: { section?: 'about' | 'body' | 'mindful' | 'focus' };
  DemoWorkout: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Calendar: undefined;
  Progress: undefined;
  Profile: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const DEMO_WORKOUT_PATH = '/demo-reflo-x7k2';

function isDemoWorkoutPath(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return false;
  }

  return window.location.pathname.replace(/\/$/, '') === DEMO_WORKOUT_PATH;
}

function getLinkingPrefixes(): string[] {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return [window.location.origin];
  }

  return [];
}

const linking: LinkingOptions<AppStackParamList> = {
  prefixes: getLinkingPrefixes(),
  config: {
    screens: {
      Main: '',
      DemoWorkout: 'demo-reflo-x7k2',
    },
  },
};

if (Platform.OS === 'web' && typeof window !== 'undefined') {
  linking.getInitialURL = async () => window.location.href;
  linking.subscribe = (listener) => {
    const onPopState = () => {
      listener(window.location.href);
    };

    window.addEventListener('popstate', onPopState);

    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  };
}

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Tab.Screen name="Home" component={Home} />
      <Tab.Screen name="Calendar" component={Calendar} />
      <Tab.Screen name="Progress" component={Progress} />
      <Tab.Screen name="Profile" component={Profile} />
    </Tab.Navigator>
  );
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="SignIn" component={SignIn} />
      <AuthStack.Screen name="EmailAuth" component={EmailAuth} />
    </AuthStack.Navigator>
  );
}

function AppNavigator({
  initialRouteName,
}: {
  initialRouteName: AppEntryRoute | 'DemoWorkout';
}) {
  return (
    <AppStack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        animation: 'fade_from_bottom',
        animationDuration: 280,
      }}
    >
      <AppStack.Screen
        name="Main"
        component={MainTabs}
        options={{ headerShown: false }}
      />
      <AppStack.Screen
        name="ProfileSetup"
        component={ProfileSetup}
        options={{ headerShown: false }}
      />
      <AppStack.Screen
        name="ClassDetail"
        component={ClassDetail}
        options={{ headerShown: false }}
      />
      <AppStack.Screen
        name="ExercisePreview"
        component={ExercisePreview}
        options={{ headerShown: false }}
      />
      <AppStack.Screen
        name="LiveWorkout"
        component={LiveWorkout}
        options={{ headerShown: false }}
      />
      <AppStack.Screen
        name="PostWorkout"
        component={PostWorkout}
        options={{ headerShown: false }}
      />
      <AppStack.Screen
        name="ProfileEdit"
        component={ProfileEdit}
        options={{ headerShown: false }}
      />
      <AppStack.Screen
        name="DemoWorkout"
        component={DemoWorkout}
        options={{ headerShown: false }}
      />
    </AppStack.Navigator>
  );
}

export default function RootNavigation() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [appEntryRoute, setAppEntryRoute] = useState<AppEntryRoute>('Main');
  const [splashMounted, setSplashMounted] = useState(true);
  const splashBgOpacity = useRef(new Animated.Value(1)).current;
  const splashFigureOpacity = useRef(new Animated.Value(1)).current;
  const splashScale = useRef(new Animated.Value(1)).current;
  const splashStartedAt = useRef(
    typeof performance !== 'undefined' ? performance.now() : Date.now()
  );
  const demoPath = isDemoWorkoutPath();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);
      if (!firebaseUser) {
        setAppEntryRoute('Main');
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!authReady || !splashMounted) {
      return;
    }

    const isReturningSession =
      Boolean(user) && !demoPath && appEntryRoute === 'Main';

    if (!isReturningSession) {
      setSplashMounted(false);
      return;
    }

    const now =
      typeof performance !== 'undefined' ? performance.now() : Date.now();
    const elapsed = now - splashStartedAt.current;
    const remainingMs = Math.max(0, PIKE_PRESS_CYCLE_S * 1000 - elapsed);
    let fadeStarted = false;

    const finishTimer = setTimeout(() => {
      fadeStarted = true;
      Animated.parallel([
        // Background dissolves first so the homepage shows through
        Animated.timing(splashBgOpacity, {
          toValue: 0,
          duration: 460,
          useNativeDriver: true,
        }),
        // Figure shrinks away as the homepage comes through
        Animated.timing(splashScale, {
          toValue: 0.05,
          duration: 320,
          useNativeDriver: true,
        }),
        Animated.timing(splashFigureOpacity, {
          toValue: 0,
          duration: 320,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          setSplashMounted(false);
        }
      });
    }, remainingMs);

    return () => {
      clearTimeout(finishTimer);
      if (fadeStarted) {
        splashBgOpacity.stopAnimation();
        splashFigureOpacity.stopAnimation();
        splashScale.stopAnimation();
      }
    };
  }, [
    authReady,
    user,
    demoPath,
    appEntryRoute,
    splashMounted,
    splashBgOpacity,
    splashFigureOpacity,
    splashScale,
  ]);

  const showAppNavigator = Boolean(user) || demoPath;
  const navigatorInitialRoute = demoPath ? 'DemoWorkout' : appEntryRoute;
  const navigatorKey = demoPath
    ? 'demo-workout'
    : user
      ? `${user.uid}-${appEntryRoute}`
      : 'guest';

  return (
    <AuthFlowContext.Provider value={{ setAppEntryRoute }}>
      <View style={styles.root}>
        {authReady ? (
          <NavigationContainer linking={showAppNavigator ? linking : undefined}>
            {showAppNavigator ? (
              <AppNavigator
                key={navigatorKey}
                initialRouteName={navigatorInitialRoute}
              />
            ) : (
              <AuthNavigator />
            )}
          </NavigationContainer>
        ) : null}

        {splashMounted ? (
          <View pointerEvents="none" style={loadingStyles.overlay}>
            <Animated.View
              style={[loadingStyles.background, { opacity: splashBgOpacity }]}
            />
            <Animated.View
              style={{
                opacity: splashFigureOpacity,
                transform: [{ scale: splashScale }],
              }}
            >
              <PikePressLoader size={112} />
            </Animated.View>
          </View>
        ) : null}
      </View>
    </AuthFlowContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

const loadingStyles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  background: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: theme.colors.background,
  },
});
