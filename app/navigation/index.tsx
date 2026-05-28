import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import Calendar from '../screens/Calendar';
import CameraSetup from '../screens/CameraSetup';
import ClassDetail from '../screens/ClassDetail';
import Home from '../screens/Home';
import LiveWorkout from '../screens/LiveWorkout';
import PostWorkout from '../screens/PostWorkout';
import Profile from '../screens/Profile';
import ProfileSetup from '../screens/ProfileSetup';
import Progress from '../screens/Progress';
import SignIn from '../screens/SignIn';

export type RootStackParamList = {
  SignIn: undefined;
  ProfileSetup: undefined;
  Main: undefined;
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

const Stack = createNativeStackNavigator<RootStackParamList>();
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

export default function RootNavigation() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="SignIn">
        <Stack.Screen
          name="SignIn"
          component={SignIn}
          options={{ headerShown: false }}
        />
        <Stack.Screen name="ProfileSetup" component={ProfileSetup} />
        <Stack.Screen
          name="Main"
          component={MainTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen name="ClassDetail" component={ClassDetail} />
        <Stack.Screen name="CameraSetup" component={CameraSetup} />
        <Stack.Screen name="LiveWorkout" component={LiveWorkout} />
        <Stack.Screen name="PostWorkout" component={PostWorkout} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
