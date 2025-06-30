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
import AsyncStorage from '@react-native-async-storage/async-storage';

export type RootStackParamList = {
  Intro: undefined;
  Home: undefined;
  UserProfile: undefined;
  SignIn: undefined;
  SignUp: undefined;
  TeacherDashboard: undefined;
  AdminDashboard: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList>('Intro');

  useEffect(() => {
    checkAuthStatus();
  }, []);

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
        // No token found, show intro
        setInitialRoute('Intro');
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setInitialRoute('Intro');
    } finally {
      setIsLoading(false);
    }
  };

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
      </Stack.Navigator>
    </NavigationContainer>
  );
}