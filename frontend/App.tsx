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
import SplashScreen from './components/SplashScreen';
import AdminAddUnpaidCourseScreen from './screens/AdminAddUnpaidCourseScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AdminAddPaidCourseScreen from './screens/AdminAddPaidCourseScreen';
import AllCoursesScreen from './screens/AllCoursesScreen';
import AdminPaidNotesScreen from './screens/AdminPaidNotesScreen';
import AdminUnpaidNotesScreen from './screens/AdminUnpaidNotesScreen';
import AdminPaidMaterialsScreen from './screens/AdminPaidMaterialsScreen';
import AllNotesScreen from './screens/AllNotesScreen';
import CourseDetailsScreen from './screens/CourseDetailsScreen';
import CourseContentScreen from './screens/CourseContentScreen';
import MyContentScreen from './screens/MyContentScreen';
import UnpaidNotesDetailsScreen from './screens/UnpaidNotesDetails';
import PaidNotesDetailsScreen from './screens/PaidNotesDetailsScreen';
import AdminDPPScreen from './screens/AdminDPPScreen';
import AllDPPScreen from './screens/AllDPPScreen';
import OfflineCenterScreen from './screens/OfflineCenterScreen';
import AdminCreateBatchesScreen from './screens/AdminCreateBatchesScreen';
import TeacherBatchDetailsScreen from './screens/TeacherBatchDetailsScreen';
import TeacherHandleTestScreen from './screens/TeacherHandleTestScreen';

export type RootStackParamList = {
  Intro: undefined;
  Home: undefined;
  UserProfile: undefined;
  SignIn: undefined;
  SignUp: undefined;
  TeacherDashboard: undefined;
  AdminDashboard: undefined;
  AdminAddUnpaidCourseScreen: undefined;
  AdminAddPaidCourseScreen: undefined;
  AllCoursesScreen: {
    courses?: any[];
    selectedCategory?: string;
    selectedClass?: string;
    selectedType?: string;
  };
  AdminPaidNotesScreen: undefined;
  AdminUnpaidNotesScreen: undefined;
  AdminPaidMaterialsScreen: undefined;
  AllNotesScreen: undefined;
  CourseDetails: { 
    courseId: string;
    fromScreen?: string;
  };
  CourseContent: { 
    courseId: string; 
    enrollmentId?: string;
    fromScreen?: string;
  };
  MyContent: undefined;
  UnpaidNotesDetails: { notesId: string; fromScreen?: string };
  PaidNotesDetails: { notesId: string; fromScreen?: string };
  AdminDPPScreen: undefined; // Add this line
  AdminAddFreeDPPScreen: undefined; // Add this line
  AdminAddPaidTestSeriesScreen: undefined; // Add this line
  AdminAddFreeTestSeriesScreen: undefined; // Add this line
  AllDPPScreen: undefined; // Add this line
  OfflineCenterScreen: undefined; // Add this line
  AdminCreateBatchesScreen: undefined; // Add this line
  TeacherBatchDetailsScreen: { batchId: string }; // Add this line
  TeacherHandleTestScreen: { batchId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList>('Intro');

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      await checkAuthStatus();
    } catch (error) {
      console.error('Error initializing app:', error);
      setShowSplash(false);
      setInitialRoute('Intro');
      setIsLoading(false);
    }
  };

  const checkAuthStatus = async () => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      const userRole = await AsyncStorage.getItem('userRole');
      const userId = await AsyncStorage.getItem('userId');
      const userName = await AsyncStorage.getItem('userName');

      console.log('Auth check:', { 
        hasToken: !!userToken, 
        userRole, 
        userId, 
        userName 
      });

      if (userToken && userRole && userId && userName) {
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
    setShowSplash(false);
    await checkAuthStatus();
  };

  if (showSplash) {
    return (
      <SplashScreen 
        onSplashComplete={handleSplashComplete}
        duration={4000}
      />
    );
  }

  if (isLoading) {
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName={initialRoute}
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          animationDuration: 300,
        }}
      >
        <Stack.Screen name="Intro" component={IntroScreen} options={{ gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="Home" component={HomeScreen} options={{ gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="TeacherDashboard" component={TeacherDashboardScreen} options={{ gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="UserProfile" component={UserProfileScreen} options={{ gestureEnabled: true, animation: 'fade' }} />
        <Stack.Screen name="SignIn" component={SignInScreen} options={{ gestureEnabled: true, animation: 'slide_from_bottom' }} />
        <Stack.Screen name="SignUp" component={SignUpScreen} options={{ gestureEnabled: true, animation: 'slide_from_bottom' }} />
        
        {/* Admin Screens */}
        <Stack.Screen name="AdminAddUnpaidCourseScreen" component={AdminAddUnpaidCourseScreen} options={{ gestureEnabled: true, animation: 'slide_from_right' }} />
        <Stack.Screen name="AdminAddPaidCourseScreen" component={AdminAddPaidCourseScreen} options={{ gestureEnabled: true, animation: 'slide_from_right' }} />
        <Stack.Screen name="AdminPaidNotesScreen" component={AdminPaidNotesScreen} options={{ gestureEnabled: true, animation: 'slide_from_right' }} />
        <Stack.Screen name="AdminUnpaidNotesScreen" component={AdminUnpaidNotesScreen} options={{ gestureEnabled: true, animation: 'slide_from_right' }} />
        <Stack.Screen name="AdminPaidMaterialsScreen" component={AdminPaidMaterialsScreen} options={{ gestureEnabled: true, animation: 'slide_from_right' }} />
        <Stack.Screen name="AdminDPPScreen" component={AdminDPPScreen} options={{ gestureEnabled: true, animation: 'slide_from_right' }} />
        
        {/* Other Screens */}
        <Stack.Screen name="AllCoursesScreen" component={AllCoursesScreen} options={{ gestureEnabled: true, animation: 'slide_from_right' }} />
        <Stack.Screen name="AllNotesScreen" component={AllNotesScreen} options={{ gestureEnabled: true, animation: 'slide_from_right' }} />
        <Stack.Screen name="CourseDetails" component={CourseDetailsScreen} options={{ gestureEnabled: true, animation: 'slide_from_right', presentation: 'card' }} />
        <Stack.Screen name="CourseContent" component={CourseContentScreen} options={{ gestureEnabled: true, animation: 'slide_from_right', presentation: 'card' }} />
        <Stack.Screen name="MyContent" component={MyContentScreen} options={{ gestureEnabled: true, animation: 'fade', presentation: 'card' }} />
        <Stack.Screen name="UnpaidNotesDetails" component={UnpaidNotesDetailsScreen} options={{ gestureEnabled: true, animation: 'slide_from_right', presentation: 'card' }} />
        <Stack.Screen name="PaidNotesDetails" component={PaidNotesDetailsScreen} options={{ gestureEnabled: true, animation: 'slide_from_right', presentation: 'card' }} />
        <Stack.Screen name="AllDPPScreen" component={AllDPPScreen} options={{ gestureEnabled: true, animation: 'slide_from_right', presentation: 'card' }} />
        <Stack.Screen name="OfflineCenterScreen" component={OfflineCenterScreen} options={{ gestureEnabled: true, animation: 'fade', presentation: 'card' }} />
        <Stack.Screen name="AdminCreateBatchesScreen" component={AdminCreateBatchesScreen} options={{ gestureEnabled: true, animation: 'slide_from_right', presentation: 'card' }} />
        

        {/* Teacher Screens */}
        <Stack.Screen name="TeacherBatchDetailsScreen" component={TeacherBatchDetailsScreen} options={{ gestureEnabled: true, animation: 'slide_from_right', presentation: 'card' }} />
        <Stack.Screen name="TeacherHandleTestScreen" component={TeacherHandleTestScreen} options={{ gestureEnabled: true, animation: 'slide_from_right', presentation: 'card' }} />
        
      </Stack.Navigator>
    </NavigationContainer>
  );
}