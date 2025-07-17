import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  StatusBar,
  SafeAreaView,
  Animated,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  FlatList,
} from 'react-native';
import { NavigationProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import axios from 'axios';
import { Feather, FontAwesome5, Ionicons, MaterialIcons } from '@expo/vector-icons';

import { API_BASE_URL, API_TIMEOUT } from '../config/api';
import BottomNavigation from '../components/BottomNavigation';

interface MyContentScreenProps {
  navigation: NavigationProp<any>;
}

interface EnrollmentData {
  _id: string;
  courseId: {
    _id: string;
    courseTitle: string;
    courseBrief: string;
    courseDescription: string;
    courseImage?: string;
    price: number;
    instructorName: string;
    courseDuration: string;
    courseLevel: string;
    isActive: boolean;
  };
  enrollmentStatus: string;
  mode: string;
  schedule: string;
  enrolledAt: string;
  paymentStatus: string;
  courseType: string;
}

const { width, height } = Dimensions.get('window');

// Brand configuration
const BRAND = {
  name: "SUJHAV",
  subtitle: "Synchronize your Understanding, do Justice to your Hardwork and let others Admire your Victory!",
  primaryColor: '#00ff88',
  secondaryColor: '#000000',
  backgroundColor: '#0a1a0a',
  accentColor: '#1a2e1a',
};

// API Configuration
const API_CONFIG = {
  baseURL: API_BASE_URL || 'http://localhost:3000/api',
  timeout: API_TIMEOUT || 15000,
  endpoints: {
    myEnrollments: '/enrollment/my-enrollments',
    courseAccess: '/enrollment/access',
  }
};

// Create an axios instance with timeout configuration
const apiClient = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
});

// Add request interceptor to include auth token
apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle token expiration
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.multiRemove(['userToken', 'userRole', 'userId', 'userName', 'userData']);
    }
    return Promise.reject(error);
  }
);

const MyContentScreen: React.FC<MyContentScreenProps> = ({ navigation }) => {
  // State
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [enrollments, setEnrollments] = useState<EnrollmentData[]>([]);
  const [showBanner, setShowBanner] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('enrolled');

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-20)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentScale = useRef(new Animated.Value(0.8)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;
  const buttonScale = useRef(new Animated.Value(0.8)).current;

  // Check network connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected ?? false);
    });
    return () => unsubscribe();
  }, []);

  // Check authentication status and load enrollments
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Handle entrance animations
  useEffect(() => {
    if (isLoggedIn !== null) {
      startEntranceAnimation();
      startPulseAnimation();
    }
  }, [isLoggedIn]);

  // Auto-refresh data when screen is focused
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (isLoggedIn) {
        fetchEnrollments();
      }
    });
    return unsubscribe;
  }, [navigation, isLoggedIn]);

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      console.log('Checking auth status...');
      
      const token = await AsyncStorage.getItem('userToken');
      const userId = await AsyncStorage.getItem('userId');
      
      if (token && userId) {
        console.log('User is authenticated, fetching enrollments...');
        setIsLoggedIn(true);
        await fetchEnrollments();
      } else {
        console.log('No auth data found, user not logged in');
        setIsLoggedIn(false);
        setShowBanner(true);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsLoggedIn(false);
      setShowBanner(true);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCourseDetails = async (courseId: string) => {
    try {
      // Try to fetch from paid courses first
      const paidResponse = await fetch(`${API_CONFIG.baseURL}/paidCourses`);
      if (paidResponse.ok) {
        const paidCourses = await paidResponse.json();
        const paidData = Array.isArray(paidCourses) ? paidCourses : (paidCourses.data || []);
        const paidCourse = paidData.find((course: any) => course._id === courseId);
        if (paidCourse) {
          return { ...paidCourse, type: 'paid' };
        }
      }

      // Try to fetch from unpaid courses
      const unpaidResponse = await fetch(`${API_CONFIG.baseURL}/unpaidCourses`);
      if (unpaidResponse.ok) {
        const unpaidCourses = await unpaidResponse.json();
        const unpaidData = Array.isArray(unpaidCourses) ? unpaidCourses : (unpaidCourses.data || []);
        const unpaidCourse = unpaidData.find((course: any) => course._id === courseId);
        if (unpaidCourse) {
          return { ...unpaidCourse, type: 'free' };
        }
      }

      return null;
    } catch (error) {
      console.error(`Error fetching course details for ${courseId}:`, error);
      return null;
    }
  };

  // Updated fetchEnrollments function
  const fetchEnrollments = async () => {
    try {
      console.log('Fetching enrollments from API...');
      console.log('API URL:', `${API_CONFIG.baseURL}${API_CONFIG.endpoints.myEnrollments}?status=${activeFilter}`);
      
      const response = await apiClient.get(`${API_CONFIG.endpoints.myEnrollments}?status=${activeFilter}`);
      
      console.log('Enrollments API Response:', response.data);
      
      if (response.data && response.data.success) {
        const enrollments = response.data.enrollments || [];
        
        // Filter out cancelled courses
        const filteredEnrollments = enrollments.filter((enrollment: any) => 
          enrollment.enrollmentStatus !== 'cancelled'
        );
        
        // Fetch complete course details for each enrollment
        const enrichedEnrollments = await Promise.all(
          filteredEnrollments.map(async (enrollment: any) => {
            const courseId = enrollment.courseId?._id || enrollment.courseId;
            
            if (courseId) {
              const fullCourseDetails = await fetchCourseDetails(courseId);
              
              if (fullCourseDetails) {
                return {
                  ...enrollment,
                  courseId: {
                    ...enrollment.courseId,
                    ...fullCourseDetails,
                    // Keep original enrollment-specific data
                    _id: courseId,
                    courseTitle: fullCourseDetails.courseTitle || enrollment.courseId?.courseTitle,
                    courseBrief: fullCourseDetails.courseDetails?.subtitle || enrollment.courseId?.courseBrief,
                    courseDescription: fullCourseDetails.courseDetails?.description || enrollment.courseId?.courseDescription,
                    price: fullCourseDetails.price || enrollment.courseId?.price || 0,
                    instructorName: fullCourseDetails.tutor || enrollment.courseId?.instructorName,
                    courseDuration: fullCourseDetails.courseDuration || enrollment.courseId?.courseDuration,
                    courseLevel: fullCourseDetails.courseLevel || enrollment.courseId?.courseLevel,
                    isActive: fullCourseDetails.isActive !== undefined ? fullCourseDetails.isActive : enrollment.courseId?.isActive,
                  }
                };
              }
            }
            
            // Fallback to original enrollment data if course details fetch fails
            return enrollment;
          })
        );
        
        console.log('Enriched enrollments:', enrichedEnrollments);
        setEnrollments(enrichedEnrollments);
      } else {
        console.error('API response indicates failure:', response.data);
      }
    } catch (error) {
      console.error('Error fetching enrollments:', error);
      
      // Enhanced error logging
      if (typeof error === 'object' && error !== null && 'response' in error) {
        const err = error as { response: any };
        console.error('Response status:', err.response?.status);
        console.error('Response data:', err.response?.data);
      } else if (typeof error === 'object' && error !== null && 'request' in error) {
        console.error('No response received:', (error as any).request);
      } else {
        console.error('Error setting up request:', (error as any).message);
      }
      
      await handleAuthError(error);
    }
  };

  const refreshEnrollments = async () => {
    if (!isConnected) {
      Alert.alert(
        "Offline",
        "You're currently offline. Connect to the internet to refresh your courses."
      );
      return;
    }

    setIsRefreshing(true);
    try {
      await fetchEnrollments();
    } catch (error) {
      console.error('Error refreshing enrollments:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAuthError = async (error: any) => {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        await AsyncStorage.multiRemove(['userToken', 'userRole', 'userId', 'userName', 'userData']);
        setIsLoggedIn(false);
        setEnrollments([]);
        setShowBanner(true);
        Alert.alert(
          "Session Expired",
          "Your session has expired. Please sign in again.",
          [{ text: "OK" }]
        );
        return;
      }
    }
    
    if (!isConnected) {
      Alert.alert(
        "Network Error",
        "You appear to be offline. Please check your internet connection."
      );
      return;
    }
  };

  const startEntranceAnimation = () => {
    // Background glow
    Animated.timing(glowOpacity, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    // Header animation
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(headerOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(headerTranslateY, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start();
    }, 200);

    // Content animation
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(contentScale, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }, 600);

    // Fade in animation
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(buttonScale, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start();
    }, 1000);
  };

  const startPulseAnimation = () => {
    const pulse = () => {
      Animated.sequence([
        Animated.timing(pulseScale, {
          toValue: 1.02,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseScale, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
      ]).start(() => pulse());
    };
    pulse();
  };

  const handleCoursePress = (courseId: string, enrollmentId: string) => {
    console.log('Opening course:', courseId);
    navigation.navigate('CourseDetails', { 
      courseId, 
      enrollmentId,
      hasAccess: true 
    });
  };

  const handleBannerClose = () => {
    setShowBanner(false);
  };

  const handleSignInPress = () => {
    navigation.navigate('SignIn');
  };

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
    if (isLoggedIn) {
      fetchEnrollments();
    }
  };

  const getProgressPercentage = (progress: any) => {
    if (!progress || !progress.completedVideos) return 0;
    return Math.min(progress.completedVideos.length * 10, 100);
  };

  const formatDuration = (duration: string) => {
    if (!duration) return 'N/A';
    return duration.replace('hours', 'hrs').replace('minutes', 'min');
  };

  const renderCourseCard = ({ item }: { item: EnrollmentData }) => {    
    return (
      <Animated.View
        style={[
          styles.courseCard,
          {
            opacity: fadeAnim,
            transform: [{ scale: Animated.multiply(contentScale, pulseScale) }],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.courseCardContent}
          onPress={() => handleCoursePress(item.courseId._id, item._id)}
          activeOpacity={0.8}
        >
          {/* Course Image using Logo */}
          <View style={styles.courseImageContainer}>
            <Image
              source={require('../assets/images/logo-sujhav.png')}
              style={styles.courseImage}
              resizeMode="contain"
            />
            
            
            {/* Course type badge */}
            <View style={[styles.courseTypeBadge, { 
              backgroundColor: item.courseId.price > 0 ? '#FF9800' : BRAND.primaryColor 
            }]}>
              <Text style={styles.courseTypeBadgeText}>
                {item.courseId.price > 0 ? 'PAID' : 'FREE'}
              </Text>
            </View>
          </View>

          {/* Course Content */}
          <View style={styles.courseContent}>
            <Text style={styles.courseTitle} numberOfLines={2}>
              {item.courseId.courseTitle || 'Untitled Course'}
            </Text>
            
            <Text style={styles.courseInstructor}>
              by {item.courseId.instructorName || 'Unknown Instructor'}
            </Text>
            
            <Text style={styles.courseBrief} numberOfLines={2}>
              {item.courseId.courseBrief || item.courseId.courseDescription || 'No description available'}
            </Text>
            
            {/* Course Info */}
            <View style={styles.courseInfo}>
              <View style={styles.courseInfoItem}>
                <MaterialIcons name="schedule" size={14} color="#888" />
                <Text style={styles.courseInfoText}>
                  {formatDuration(item.courseId.courseDuration)}
                </Text>
              </View>
              
              <View style={styles.courseInfoItem}>
                <MaterialIcons name="signal-cellular-alt" size={14} color="#888" />
                <Text style={styles.courseInfoText}>
                  {item.courseId.courseLevel || 'N/A'}
                </Text>
              </View>
            </View>
            
            {/* Price Info */}
            <View style={styles.priceInfo}>
              <Text style={styles.priceText}>
                {item.courseId.price > 0 ? `₹${item.courseId.price}` : 'Free'}
              </Text>
            </View>
            
            {/* Enrollment Status */}
            <View style={styles.enrollmentStatus}>
              <View style={[styles.statusDot, { 
                backgroundColor: item.enrollmentStatus === 'enrolled' ? BRAND.primaryColor : '#FF9800' 
              }]} />
              <Text style={styles.statusText}>
                {item.enrollmentStatus.charAt(0).toUpperCase() + item.enrollmentStatus.slice(1)}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderFilterTabs = () => (
    <Animated.View style={[styles.filterContainer, { opacity: fadeAnim }]}>
      {['enrolled'].map((filter) => (
        <TouchableOpacity
          key={filter}
          style={[
            styles.filterTab,
            activeFilter === filter && styles.activeFilterTab,
          ]}
          onPress={() => handleFilterChange(filter)}
        >
          <Text style={[
            styles.filterTabText,
            activeFilter === filter && styles.activeFilterTabText,
          ]}>
            {filter.charAt(0).toUpperCase() + filter.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </Animated.View>
  );

  const renderEmptyState = () => (
    <Animated.View style={[styles.emptyState, { opacity: fadeAnim }]}>
      <MaterialIcons name="school" size={60} color="#444" />
      <Text style={styles.emptyStateTitle}>No Courses Found</Text>
      <Text style={styles.emptyStateSubtitle}>
        {activeFilter === 'enrolled' 
          ? "You haven't enrolled in any courses yet."
          : `No ${activeFilter} courses found.`}
      </Text>
      {activeFilter === 'enrolled' && (
        <TouchableOpacity
          style={styles.browseCoursesButton}
          onPress={() => navigation.navigate('Courses')}
        >
          <Text style={styles.browseCoursesButtonText}>Browse Courses</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );

  const renderUnauthenticatedContent = () => (
    <View style={styles.unauthenticatedContainer}>
      <Animated.View
        style={[
          styles.welcomeSection,
          {
            opacity: contentOpacity,
            transform: [{ translateY: Animated.multiply(contentScale, 20) }],
          },
        ]}
      >
        {/* Logo */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              transform: [
                { scale: Animated.multiply(contentScale, pulseScale) }
              ],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.logoGlow,
              { opacity: Animated.multiply(glowOpacity, 0.5) }
            ]}
          />
          <Image
            source={require('../assets/images/logo-sujhav.png')}
            style={styles.headerLogoImage}
            resizeMode="contain"
          />
        </Animated.View>

        <Text style={styles.welcomeTitle}>My Learning Dashboard</Text>
        <Text style={styles.welcomeSubtitle}>
          Sign in to access your enrolled courses and track your learning progress
        </Text>
      </Animated.View>

      {/* Sign In Button */}
      <Animated.View
        style={[
          styles.signInButtonContainer,
          { 
            opacity: fadeAnim,
            transform: [{ scale: buttonScale }]
          }
        ]}
      >
        <TouchableOpacity 
          style={styles.signInButton}
          onPress={handleSignInPress}
          activeOpacity={0.8}
        >
          <Animated.View
            style={[
              styles.buttonGlow,
              { opacity: Animated.multiply(glowOpacity, 0.6) }
            ]}
          />
          <Text style={styles.signInButtonText}>Sign in to continue</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );

  // Loading state
  if (isLoggedIn === null || isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={BRAND.backgroundColor} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BRAND.primaryColor} />
          <Text style={styles.loadingText}>Loading your courses...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND.backgroundColor} />
      
      {/* Animated Background Elements */}
      <View style={styles.backgroundElements}>
        <Animated.View 
          style={[
            styles.glowCircle,
            styles.glowCircle1,
            { opacity: Animated.multiply(glowOpacity, 0.08) }
          ]} 
        />
        <Animated.View 
          style={[
            styles.glowCircle,
            styles.glowCircle2,
            { opacity: Animated.multiply(glowOpacity, 0.06) }
          ]} 
        />
        <Animated.View 
          style={[
            styles.glowCircle,
            styles.glowCircle3,
            { opacity: Animated.multiply(glowOpacity, 0.04) }
          ]} 
        />
      </View>

      {/* Header */}
      <Animated.View 
        style={[
          styles.headerSection,
          {
            opacity: headerOpacity,
            transform: [{ translateY: headerTranslateY }],
          },
        ]}
      >
        <View style={styles.headerContent}>
          <Image
            source={require('../assets/images/logo-sujhav.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <Text style={styles.brandTitle}>My Content</Text>
        </View>
      </Animated.View>

      {/* Content Container */}
      <View style={styles.contentContainer}>
        {isLoggedIn ? (
          <>
            {/* Filter Tabs */}
            {renderFilterTabs()}

            {/* Course List */}
            <FlatList
              data={enrollments}
              renderItem={renderCourseCard}
              keyExtractor={(item) => item._id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.courseList}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={refreshEnrollments}
                  colors={[BRAND.primaryColor]}
                  tintColor={BRAND.primaryColor}
                  title="Pull to refresh"
                  titleColor={BRAND.primaryColor}
                />
              }
              ListEmptyComponent={renderEmptyState}
            />
          </>
        ) : (
          renderUnauthenticatedContent()
        )}
      </View>

      {/* Bottom Navigation */}
      <BottomNavigation navigation={navigation} activeTab="content" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND.backgroundColor,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: BRAND.primaryColor,
    fontSize: 16,
    marginTop: 10,
    fontWeight: '500',
  },
  backgroundElements: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  glowCircle: {
    position: 'absolute',
    borderRadius: 1000,
    backgroundColor: BRAND.primaryColor,
  },
  glowCircle1: {
    width: 200,
    height: 200,
    top: -100,
    right: -100,
  },
  glowCircle2: {
    width: 150,
    height: 150,
    bottom: 100,
    left: -75,
  },
  glowCircle3: {
    width: 100,
    height: 100,
    top: height * 0.3,
    right: -50,
  },
  headerSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1a2e1a',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogo: {
    width: 30,
    height: 30,
    marginRight: 10,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: BRAND.primaryColor,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1a2e1a',
  },
  filterTab: {
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 25,
    marginHorizontal: 10,
    backgroundColor: '#1a2e1a',
    minWidth: 100,
    alignItems: 'center',
  },
  activeFilterTab: {
    backgroundColor: BRAND.primaryColor,
  },
  filterTabText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  activeFilterTabText: {
    color: BRAND.backgroundColor,
  },
  courseList: {
    paddingVertical: 20,
  },
  courseCard: {
    backgroundColor: '#0f1f0f',
    borderRadius: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1a2e1a',
    overflow: 'hidden',
    elevation: 3,
    shadowColor: BRAND.primaryColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  courseCardContent: {
    flexDirection: 'row',
    padding: 15,
  },
  courseImageContainer: {
    position: 'relative',
    width: 100,
    height: 100,
    backgroundColor: '#1a2e1a',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  courseImage: {
    width: 60,
    height: 60,
  },
  progressOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#333',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  progressBar: {
    height: '100%',
    backgroundColor: BRAND.primaryColor,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  courseTypeBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  courseTypeBadgeText: {
    color: BRAND.backgroundColor,
    fontSize: 10,
    fontWeight: 'bold',
  },
  courseContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  courseTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  courseInstructor: {
    fontSize: 12,
    color: BRAND.primaryColor,
    marginBottom: 8,
    fontWeight: '500',
  },
  courseBrief: {
    fontSize: 12,
    color: '#ccc',
    marginBottom: 10,
    lineHeight: 16,
  },
  courseInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  courseInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  courseInfoText: {
    fontSize: 12,
    color: '#888',
    marginLeft: 5,
  },
  priceInfo: {
    marginBottom: 10,
  },
  priceText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: BRAND.primaryColor,
  },
  progressInfo: {
    marginBottom: 10,
  },
  progressText: {
    fontSize: 12,
    color: '#888',
    marginBottom: 5,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#333',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFull: {
    height: '100%',
    backgroundColor: BRAND.primaryColor,
    borderRadius: 3,
  },
  enrollmentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 30,
  },
  browseCoursesButton: {
    backgroundColor: BRAND.primaryColor,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  browseCoursesButtonText: {
    color: BRAND.backgroundColor,
    fontSize: 16,
    fontWeight: 'bold',
  },
  unauthenticatedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logoContainer: {
    position: 'relative',
    marginBottom: 30,
  },
  logoGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: BRAND.primaryColor,
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
  },
  headerLogoImage: {
    width: 100,
    height: 100,
    zIndex: 2,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 15,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
  signInButtonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  signInButton: {
    position: 'relative',
    backgroundColor: BRAND.primaryColor,
    paddingHorizontal: 40,
    paddingVertical: 18,
    borderRadius: 30,
    minWidth: 200,
    alignItems: 'center',
    elevation: 5,
    shadowColor: BRAND.primaryColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  buttonGlow: {
    position: 'absolute',
    width: '120%',
    height: '140%',
    borderRadius: 35,
    backgroundColor: BRAND.primaryColor,
    top: -10,
    left: -20,
    right: -20,
    bottom: -10,
  },
  signInButtonText: {
    color: BRAND.backgroundColor,
    fontSize: 18,
    fontWeight: 'bold',
    zIndex: 2,
  },
});

export default MyContentScreen;