import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import IntroScreen from './screens/IntroScreen';
import HomeScreen from './screens/HomeScreen';
import UserProfileScreen from './screens/UserProfileScreen';
import SignInScreen from './screens/SignInScreen';
import SignUpScreen from './screens/SignUpScreen';
// import AsyncStorage from '@react-native-async-storage/async-storage';

export type RootStackParamList = {
  Intro: undefined;
  Home: undefined;
  UserProfile: undefined; // Add UserProfile screen to the stack
  SignIn: undefined; // Add SignIn screen to the stack
  SignUp: undefined; // Add SignUp screen to the stack
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
      // TODO: Add your authentication logic here
      // Example:
      // const userToken = await AsyncStorage.getItem('userToken');
      // const userId = await AsyncStorage.getItem('userId');
      
      // if (userToken && userId) {
      //   // User is logged in, go directly to Home
      //   setInitialRoute('Home');
      // } else {
      //   // User is not logged in, show intro
      //   setInitialRoute('Intro');
      // }
      
      // For now, always start with Intro
      setInitialRoute('Intro');
      
    } catch (error) {
      console.error('Error checking auth status:', error);
      setInitialRoute('Intro');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    // You can return a loading screen here if needed
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName={initialRoute}
        screenOptions={{
          headerShown: false, // Hide headers for all screens
          animation: 'fade', // Smooth transitions between screens
        }}
      >
        <Stack.Screen 
          name="Intro" 
          component={IntroScreen}
          options={{
            gestureEnabled: false, // Disable swipe back gesture
          }}
        />
        <Stack.Screen 
          name="Home" 
          component={HomeScreen}
          options={{
            gestureEnabled: false, // Disable swipe back gesture
          }}
        />
        <Stack.Screen 
          name="UserProfile" 
          component={UserProfileScreen}
          options={{
            gestureEnabled: false, // Disable swipe back gesture
          }}
        />
        <Stack.Screen 
          name="SignIn" 
          component={SignInScreen}
          options={{
            gestureEnabled: false, // Disable swipe back gesture
          }}
        />
        <Stack.Screen 
          name="SignUp" 
          component={SignUpScreen}
          options={{
            gestureEnabled: false, // Disable swipe back gesture
          }}
          
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}