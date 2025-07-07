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
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { NavigationProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BottomNavigation from '../components/BottomNavigation';
import CoursesSection from '../components/CoursesSection';
import MoreOptionSection from '../components/MoreOptionSection';
import { API_BASE } from '../config/api';

interface HomeScreenProps {
  navigation: NavigationProp<any>;
}

interface Course {
  _id: string;
  courseTitle: string;
  tutor: string;
  rating: number;
  price: number;
  category: 'jee' | 'neet' | 'boards';
  class: string;
  courseDetails: {
    subtitle: string;
    description: string;
  };
  videoLinks: Array<{
    videoTitle: string;
    videoDescription: string;
    videoLink: string;
    duration: string;
  }>;
  courseThumbnail: string;
  totalEnrolledStudents?: number;
  studentsEnrolled: Array<any>;
  isActive: boolean;
  type: 'paid' | 'free';
  isEnrolled?: boolean; // Add enrollment status
  enrollmentId?: string; // Add enrollment ID
}

interface UserData {
  id: string;
  email: string;
  name: string;
  token: string;
  role?: string;
}

const { width, height } = Dimensions.get('window');

// Brand configuration (matching IntroScreen)
const BRAND = {
  name: "SUJHAV",
  subtitle: "Synchronize your Understanding, do Justice to your Hardwork and let others Admire your Victory!",
  primaryColor: '#00ff88',
  secondaryColor: '#000000',
  backgroundColor: '#0a1a0a',
  accentColor: '#1a2e1a',
};

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  // State management
  const [courses, setCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'jee' | 'neet' | 'boards'>('all');
  const [selectedClass, setSelectedClass] = useState<'all' | '11th' | '12th'>('all');
  const [selectedType, setSelectedType] = useState<'all' | 'paid' | 'free'>('all');
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-20)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;

  // API Base URL
  const API_BASE_URL = API_BASE;

  // Check authentication status
  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userRole = await AsyncStorage.getItem('userRole');
      const userId = await AsyncStorage.getItem('userId');
      const userName = await AsyncStorage.getItem('userName');
      const storedUserData = await AsyncStorage.getItem('userData');
      
      if (token && userId && userName) {
        let parsedUserData = null;
        
        if (storedUserData) {
          try {
            parsedUserData = JSON.parse(storedUserData);
          } catch (e) {
            console.error('Error parsing stored user data:', e);
          }
        }
        
        const userDataObj: UserData = {
          id: userId,
          name: userName,
          email: parsedUserData?.email || '',
          token: token,
          role: userRole || 'user'
        };
        
        setUserData(userDataObj);
        setIsLoggedIn(true);
        return userDataObj;
      } else {
        setIsLoggedIn(false);
        setUserData(null);
        return null;
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setIsLoggedIn(false);
      setUserData(null);
      return null;
    }
  };

  // Check enrollment status for multiple courses
  const checkEnrollmentStatus = async (coursesData: Course[], userToken: string) => {
    if (!coursesData.length || !userToken) return coursesData;

    try {
      console.log('Checking enrollment status for', coursesData.length, 'courses');
      
      // Create promises for all enrollment checks
      const enrollmentPromises = coursesData.map(async (course) => {
        try {
          const response = await fetch(`${API_BASE_URL}/enrollment/access/${course._id}`, {
            headers: {
              'Authorization': `Bearer ${userToken}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const data = await response.json();
            return {
              ...course,
              isEnrolled: data.hasAccess,
              enrollmentId: data.enrollment?._id || null
            };
          } else {
            return {
              ...course,
              isEnrolled: false,
              enrollmentId: null
            };
          }
        } catch (error) {
          console.error(`Error checking enrollment for course ${course._id}:`, error);
          return {
            ...course,
            isEnrolled: false,
            enrollmentId: null
          };
        }
      });

      // Wait for all enrollment checks to complete
      const coursesWithEnrollment = await Promise.all(enrollmentPromises);
      console.log('Enrollment status check completed');
      
      return coursesWithEnrollment;
    } catch (error) {
      console.error('Error in batch enrollment check:', error);
      return coursesData.map(course => ({
        ...course,
        isEnrolled: false,
        enrollmentId: null
      }));
    }
  };

  // Improved fetchCourses function with enrollment status
  const fetchCourses = async () => {
    try {
      setLoading(true);
      
      console.log('Fetching courses from:', API_BASE_URL);
      
      // Fetch paid courses
      const paidResponse = await fetch(`${API_BASE_URL}/paidCourses`);
      console.log('Paid courses response status:', paidResponse.status);
      
      if (!paidResponse.ok) {
        throw new Error(`HTTP error! status: ${paidResponse.status}`);
      }
      
      const paidText = await paidResponse.text();
      console.log('Paid courses raw response:', paidText.substring(0, 200));
      
      let paidCourses;
      try {
        paidCourses = JSON.parse(paidText);
      } catch (parseError) {
        console.error('Failed to parse paid courses JSON:', parseError);
        console.error('Response was:', paidText);
        throw new Error('Invalid JSON response from paid courses endpoint');
      }
      
      // Fetch unpaid courses
      const unpaidResponse = await fetch(`${API_BASE_URL}/unpaidCourses`);
      console.log('Unpaid courses response status:', unpaidResponse.status);
      
      if (!unpaidResponse.ok) {
        throw new Error(`HTTP error! status: ${unpaidResponse.status}`);
      }
      
      const unpaidText = await unpaidResponse.text();
      console.log('Unpaid courses raw response:', unpaidText.substring(0, 200));
      
      let unpaidCourses;
      try {
        unpaidCourses = JSON.parse(unpaidText);
      } catch (parseError) {
        console.error('Failed to parse unpaid courses JSON:', parseError);
        console.error('Response was:', unpaidText);
        throw new Error('Invalid JSON response from unpaid courses endpoint');
      }
      
      // Handle different response formats
      const paidData = Array.isArray(paidCourses) ? paidCourses : (paidCourses.data || []);
      const unpaidData = Array.isArray(unpaidCourses) ? unpaidCourses : (unpaidCourses.data || []);
      
      // Combine and mark course types
      let allCourses = [
        ...paidData.map((course: any) => ({ ...course, type: 'paid' })),
        ...unpaidData.map((course: any) => ({ ...course, type: 'free' }))
      ];
      
      console.log('Successfully fetched courses:', allCourses.length);
      
      // Check enrollment status if user is logged in
      const currentUserData = await checkAuthStatus();
      if (currentUserData && currentUserData.token) {
        console.log('User is logged in, checking enrollment status...');
        allCourses = await checkEnrollmentStatus(allCourses, currentUserData.token);
      } else {
        console.log('User not logged in, skipping enrollment check');
        allCourses = allCourses.map(course => ({
          ...course,
          isEnrolled: false,
          enrollmentId: null
        }));
      }
      
      setCourses(allCourses);
      setFilteredCourses(allCourses);
      
    } catch (error) {
      console.error('Error fetching courses:', error);
      
      // Show user-friendly error message
      console.error('Failed to load courses. Please check your internet connection and try again.');
      
      // Set empty arrays to prevent app crash
      setCourses([]);
      setFilteredCourses([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter courses based on selected filters
  const applyFilters = () => {
    let filtered = courses;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(course => course.category === selectedCategory);
    }

    if (selectedClass !== 'all') {
      filtered = filtered.filter(course => course.class === selectedClass);
    }

    if (selectedType !== 'all') {
      filtered = filtered.filter(course => course.type === selectedType);
    }

    setFilteredCourses(filtered);
  };

  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCourses();
    setRefreshing(false);
  };

  // Handle course card press
  const handleCoursePress = (courseId: string) => {
    // Navigate to course details screen
    navigation.navigate('CourseDetails', { courseId });
    console.log('Course pressed:', courseId);
  };

  // Handle view details button press
  const handleViewDetails = (courseId: string) => {
    navigation.navigate('CourseDetails', { courseId });
    console.log('View details pressed:', courseId);
  };

  // Updated handle enroll now button press
  const handleEnrollNow = (courseId: string) => {
    // Find the course to check enrollment status
    const course = filteredCourses.find(c => c._id === courseId);
    
    if (course && course.isEnrolled && course.enrollmentId) {
      // User is enrolled, navigate to course content
      console.log('User is enrolled, navigating to course content');
      navigation.navigate('CourseContent', { 
        courseId: courseId,
        enrollmentId: course.enrollmentId
      });
    } else {
      // User is not enrolled, navigate to course details for enrollment
      console.log('User not enrolled, navigating to course details');
      navigation.navigate('CourseDetails', { courseId });
    }
  };

  // Handle view all courses press - Navigate to AllCoursesScreen
  const handleViewAllCourses = () => {
    navigation.navigate('AllCoursesScreen', {
      courses: filteredCourses,
      selectedCategory,
      selectedClass,
      selectedType
    });
  };

  // Get latest 4 courses to display (reduced from 6 to make room for MoreOptionSection)
  const getLatestCourses = () => {
    return filteredCourses.slice(0, 4);
  };

  // Check if there are more courses to show
  const hasMoreCourses = () => {
    return filteredCourses.length > 1;
  };

  useEffect(() => {
    fetchCourses();
    startEntranceAnimation();
    startPulseAnimation();
  }, []);

  // Auto-refresh when screen is focused to check for enrollment changes
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('Screen focused, refreshing courses...');
      fetchCourses();
    });

    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    applyFilters();
  }, [selectedCategory, selectedClass, selectedType, courses]);

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

    // Content fade in
    setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    }, 1000);
  };

  const startPulseAnimation = () => {
    const pulse = () => {
      Animated.sequence([
        Animated.timing(pulseScale, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseScale, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]).start(() => pulse());
    };
    pulse();
  };

  const renderFilterButton = (title: string, value: string, selectedValue: string, onPress: (value: any) => void) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        selectedValue === value && styles.filterButtonActive
      ]}
      onPress={() => onPress(value)}
    >
      <Text style={[
        styles.filterButtonText,
        selectedValue === value && styles.filterButtonTextActive
      ]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  // Render header component for ScrollView
  const renderHeader = () => (
    <>
      {/* Welcome Section */}
      <Animated.View
        style={[
          styles.welcomeSection,
          { opacity: fadeAnim },
        ]}
      >
        <Text style={styles.welcomeTitle}>Explore Our Courses</Text>
        <Text style={styles.welcomeSubtitle}>
          Choose from our premium and free courses
        </Text>
      </Animated.View>

      {/* Filters Section */}
      <Animated.View style={[styles.filtersSection, { opacity: fadeAnim }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterRow}>
            {/* Category Filters */}
            {renderFilterButton('All', 'all', selectedCategory, setSelectedCategory)}
            {renderFilterButton('JEE', 'jee', selectedCategory, setSelectedCategory)}
            {renderFilterButton('NEET', 'neet', selectedCategory, setSelectedCategory)}
            {renderFilterButton('Boards', 'boards', selectedCategory, setSelectedCategory)}
            
            {/* Class Filters */}
            {renderFilterButton('All Classes', 'all', selectedClass, setSelectedClass)}
            {renderFilterButton('11th', '11th', selectedClass, setSelectedClass)}
            {renderFilterButton('12th', '12th', selectedClass, setSelectedClass)}
            
            {/* Type Filters */}
            {renderFilterButton('All Types', 'all', selectedType, setSelectedType)}
            {renderFilterButton('Paid', 'paid', selectedType, setSelectedType)}
            {renderFilterButton('Free', 'free', selectedType, setSelectedType)}
          </View>
        </ScrollView>
      </Animated.View>
    </>
  );

  // Render footer component for ScrollView
  const renderFooter = () => (
    <>
      {/* More Options Section - Now with proper spacing */}
      <Animated.View style={[styles.moreOptionsContainer, { opacity: fadeAnim }]}>
        <MoreOptionSection navigation={navigation} fadeAnim={fadeAnim} />
      </Animated.View>

      {/* Bottom padding */}
      <View style={styles.bottomPadding} />
    </>
  );

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
          <Text style={styles.brandTitle}>{BRAND.name}</Text>
        </View>
      </Animated.View>

      {/* Main Content - CoursesSection with integrated MoreOptionSection */}
      <CoursesSection
        courses={getLatestCourses()}
        loading={loading}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onCoursePress={handleCoursePress}
        onViewDetails={handleViewDetails}
        onEnrollNow={handleEnrollNow}
        fadeAnim={fadeAnim}
        headerComponent={renderHeader}
        footerComponent={renderFooter}
        // New props for "View All Courses" integration
        totalCoursesCount={filteredCourses.length}
        onShowAllCourses={handleViewAllCourses}
        showAllCoursesButton={hasMoreCourses()}
      />
      
      {/* Bottom Navigation */}
      <BottomNavigation navigation={navigation} activeTab="home" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND.backgroundColor,
  },
  backgroundElements: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  glowCircle: {
    position: 'absolute',
    borderRadius: 200,
    backgroundColor: 'rgba(0, 255, 136, 0.2)',
  },
  glowCircle1: {
    width: 450,
    height: 450,
    top: -225,
    right: -175,
  },
  glowCircle2: {
    width: 350,
    height: 350,
    bottom: 50,
    left: -125,
  },
  glowCircle3: {
    width: 250,
    height: 250,
    top: height * 0.25,
    left: width * 0.75 - 125,
  },

  // Header Section
  headerSection: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(10, 26, 10, 0.95)',
    zIndex: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    width: 30,
    height: 30,
    marginRight: 10,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 1,
    textShadowColor: BRAND.primaryColor,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },

  // Welcome Section
  welcomeSection: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#cccccc',
    textAlign: 'center',
    opacity: 0.8,
  },

  // Filters Section
  filtersSection: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  filterButtonActive: {
    backgroundColor: BRAND.primaryColor,
    borderColor: BRAND.primaryColor,
  },
  filterButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: BRAND.backgroundColor,
    fontWeight: '600',
  },

  // More Options Container - Fixed spacing
  moreOptionsContainer: {
    marginTop: 2, // Reduced gap between sections
    paddingHorizontal: 0, // Remove horizontal padding to match CoursesSection
  },

  // Bottom padding
  bottomPadding: {
    height: 100, // Space for bottom navigation
  },
});

export default HomeScreen;