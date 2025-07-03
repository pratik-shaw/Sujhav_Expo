import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import IntroScreen from './screens/IntroScreen';
import HomeScreen from './screens/HomeScreen';
import UserProfileScreen from './screens/UserProfileScreen';
import SignInScreen from './screens/SignInScreen';
import SignUpScreen from './screens/SignUpScreen';
import TeacherDashboardScreen from './screens/TeacherDashboardScreen';
import AdminDashboardScreen from './screens/AdminDashboardScreen';
import SplashScreen from './components/SplashScreen'; // Import your splash screen
import AdminAddUnpaidCourseScreen from './screens/AdminAddUnpaidCourseScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AdminAddPaidCourseScreen from './screens/AdminAddPaidCourseScreen';

export type RootStackParamList = {
  Intro: undefined;
  Home: undefined;
  UserProfile: undefined;
  SignIn: undefined;
  SignUp: undefined;
  TeacherDashboard: undefined;
  AdminDashboard: undefined;
  AdminAddUnpaidCourseScreen: undefined; // Add this line for the new screen
  AdminAddPaidCourseScreen: undefined; // Add this line for the new screen
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true); // Always start with splash screen
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList>('Intro');

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Check auth status first to determine if splash should be shown
      await checkAuthStatus();
    } catch (error) {
      console.error('Error initializing app:', error);
      // If error occurs, skip splash and go to intro
      setShowSplash(false);
      setInitialRoute('Intro');
      setIsLoading(false);
    }
  };

  const checkAuthStatus = async () => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      const userRole = await AsyncStorage.getItem('userRole');

      if (userToken && userRole) {
        // User is logged in, route based on role
        switch (userRole) {
          case 'admin':
            setInitialRoute('AdminDashboard');
            break;
          case 'teacher':
            setInitialRoute('TeacherDashboard');
            break;
          case 'user':
          default:
            setInitialRoute('Home');
            break;
        }
      } else {
        // No token found, skip splash and go directly to intro
        setShowSplash(false);
        setInitialRoute('Intro');
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setShowSplash(false);
      setInitialRoute('Intro');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSplashComplete = async () => {
    // Hide splash screen and then check auth status
    setShowSplash(false);
    await checkAuthStatus();
  };

  // Show splash screen if it's the first launch
  if (showSplash) {
    return (
      <SplashScreen 
        onSplashComplete={handleSplashComplete}
        duration={4000} // 4 seconds duration
      />
    );
  }

  // Show loading state while checking auth
  if (isLoading) {
    return null; // You can add a loading spinner here if needed
  }

  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName={initialRoute}
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
      >
        <Stack.Screen 
          name="Intro" 
          component={IntroScreen}
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen 
          name="Home" 
          component={HomeScreen}
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen 
          name="TeacherDashboard" 
          component={TeacherDashboardScreen}
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen 
          name="AdminDashboard" 
          component={AdminDashboardScreen}
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen 
          name="UserProfile" 
          component={UserProfileScreen}
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen 
          name="SignIn" 
          component={SignInScreen}
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen 
          name="SignUp" 
          component={SignUpScreen}
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen 
          name="AdminAddUnpaidCourseScreen" 
          component={AdminAddUnpaidCourseScreen}
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen 
          name="AdminAddPaidCourseScreen" 
          component={AdminAddPaidCourseScreen}
          options={{ gestureEnabled: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}