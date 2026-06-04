import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged, type User } from 'firebase/auth';

import { AuthFlowContext, type AppEntryRoute } from '../context/AuthFlowContext';
import Calendar from '../screens/Calendar';
import CameraSetup from '../screens/CameraSetup';
import ClassDetail from '../screens/ClassDetail';
import EmailAuth from '../screens/EmailAuth';
import Home from '../screens/Home';
import LiveWorkout from '../screens/LiveWorkout';
import PostWorkout from '../screens/PostWorkout';
import Profile from '../screens/Profile';
import ProfileSetup from '../screens/ProfileSetup';
import Progress from '../screens/Progress';
import SignIn from '../screens/SignIn';
import { auth } from '../lib/firebase';

export type AuthStackParamList = {
  SignIn: undefined;
  EmailAuth: undefined;
};

export type AppStackParamList = {
  Main: undefined;
  ProfileSetup: undefined;
  ClassDetail: { workoutId?: string };
  CameraSetup: { workoutId?: string };
  LiveWorkout: { workoutId?: string };
  PostWorkout: { workoutId?: string };
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
    <Tab.Navigator>
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
      <AppStack.Screen name="ProfileSetup" component={ProfileSetup} />
      <AppStack.Screen name="ClassDetail" component={ClassDetail} />
      <AppStack.Screen name="CameraSetup" component={CameraSetup} />
      <AppStack.Screen name="LiveWorkout" component={LiveWorkout} />
      <AppStack.Screen name="PostWorkout" component={PostWorkout} />
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
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <AuthFlowContext.Provider value={{ setAppEntryRoute }}>
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
    </AuthFlowContext.Provider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
