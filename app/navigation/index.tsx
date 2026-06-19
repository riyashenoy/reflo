import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged, type User } from 'firebase/auth';

import { AuthFlowContext, type AppEntryRoute } from '../context/AuthFlowContext';
import Calendar from '../screens/Calendar';
import ClassDetail from '../screens/ClassDetail';
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
  ClassDetail: { workoutId?: string };
  ExercisePreview: { workoutId: string; exerciseIndex: number };
  LiveWorkout: { workoutId?: string };
  PostWorkout: { workoutId?: string; sessionLog?: SessionLogEntry[] };
  ProfileEdit: { section?: 'about' | 'body' | 'mindful' };
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

function AppNavigator({ initialRouteName }: { initialRouteName: AppEntryRoute }) {
  return (
    <AppStack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{ headerShown: true }}
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
    </AppStack.Navigator>
  );
}

export default function RootNavigation() {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [appEntryRoute, setAppEntryRoute] = useState<AppEntryRoute>('Main');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setInitializing(false);
      if (!firebaseUser) {
        setAppEntryRoute('Main');
      }
    });

    return unsubscribe;
  }, []);

  if (initializing) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={theme.colors.red} />
      </View>
    );
  }

  return (
    <AuthFlowContext.Provider value={{ setAppEntryRoute }}>
      <View style={styles.root}>
        <NavigationContainer>
          {user ? (
            <AppNavigator
              key={`${user.uid}-${appEntryRoute}`}
              initialRouteName={appEntryRoute}
            />
          ) : (
            <AuthNavigator />
          )}
        </NavigationContainer>
      </View>
    </AuthFlowContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
});
