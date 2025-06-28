import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import IntroScreen from './screens/IntroScreen';
import HomeScreen from './screens/HomeScreen';
// import AsyncStorage from '@react-native-async-storage/async-storage';

export type RootStackParamList = {
  Intro: undefined;
  Home: undefined;
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}