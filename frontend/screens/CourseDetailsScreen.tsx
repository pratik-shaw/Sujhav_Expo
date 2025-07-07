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
  Alert,
} from 'react-native';
import { NavigationProp, RouteProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '../config/api';
import SignupLoginBanner from '../components/SignupLoginBanner';

interface CourseDetailsScreenProps {
  navigation: NavigationProp<any>;
  route: RouteProp<any>;
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
    _id?: string;
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
}

interface UserData {
  id: string;
  email: string;
  name: string;
  token: string;
  role?: string;
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

const CourseDetailsScreen: React.FC<CourseDetailsScreenProps> = ({ navigation, route }) => {
  const courseId = route.params?.courseId;

  // State management
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [showLoginBanner, setShowLoginBanner] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrollmentData, setEnrollmentData] = useState<any>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-20)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  // API Base URL
  const API_BASE_URL = API_BASE;

  // Updated authentication check to match UserProfileScreen pattern
  const checkAuthStatus = async () => {
    try {
      console.log('Checking auth status...');
      
      // Updated to use storage keys from SignIn screen (matching UserProfileScreen)
      const token = await AsyncStorage.getItem('userToken');
      const userRole = await AsyncStorage.getItem('userRole');
      const userId = await AsyncStorage.getItem('userId');
      const userName = await AsyncStorage.getItem('userName');
      const storedUserData = await AsyncStorage.getItem('userData');
      
      console.log('Auth data found:', { 
        hasToken: !!token, 
        userRole, 
        userId, 
        userName,
        hasStoredData: !!storedUserData
      });
      
      if (token && userId && userName) {
        let parsedUserData = null;
        
        // Try to get detailed user data from storage first
        if (storedUserData) {
          try {
            parsedUserData = JSON.parse(storedUserData);
          } catch (e) {
            console.error('Error parsing stored user data:', e);
          }
        }
        
        // Create user data object with available information
        const userDataObj: UserData = {
          id: userId,
          name: userName,
          email: parsedUserData?.email || '',
          token: token,
          role: userRole || 'user'
        };
        
        console.log('Setting user data:', userDataObj);
        setUserData(userDataObj);
        setIsLoggedIn(true);
        return true;
      } else {
        console.log('No auth data found, user not logged in');
        setIsLoggedIn(false);
        return false;
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setIsLoggedIn(false);
      return false;
    }
  };

  // Check if user is already enrolled
  const checkEnrollmentStatus = async () => {
    if (!userData || !courseId) return;

    try {
      console.log('Checking enrollment status for course:', courseId);
      const response = await fetch(`${API_BASE_URL}/enrollment/access/${courseId}`, {
        headers: {
          'Authorization': `Bearer ${userData.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Enrollment status:', data);
        setIsEnrolled(data.hasAccess);
        setEnrollmentData(data.enrollment);
      } else {
        console.log('Enrollment check failed:', response.status);
      }
    } catch (error) {
      console.error('Enrollment check error:', error);
    }
  };

  // Fetch course details from API
  const fetchCourseDetails = async () => {
    try {
      setLoading(true);
      
      // Try fetching from paid courses first
      let response = await fetch(`${API_BASE_URL}/paidCourses/${courseId}`);
      let courseData = null;
      let courseType = 'paid';

      if (response.ok) {
        const text = await response.text();
        courseData = JSON.parse(text);
      } else {
        // If not found in paid courses, try unpaid courses
        response = await fetch(`${API_BASE_URL}/unpaidCourses/${courseId}`);
        if (response.ok) {
          const text = await response.text();
          courseData = JSON.parse(text);
          courseType = 'free';
        }
      }

      if (courseData) {
        // Handle different response formats
        const course = courseData.data || courseData;
        setCourse({ ...course, type: courseType });
      } else {
        throw new Error('Course not found');
      }
      
    } catch (error) {
      console.error('Error fetching course details:', error);
      Alert.alert('Error', 'Failed to load course details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle enrollment process
  const handleEnrollment = async () => {
    if (!course) return;

    console.log('Attempting enrollment...');
    console.log('Current auth state:', { isLoggedIn, userData: !!userData });

    // Check if user is authenticated
    const isAuthenticated = await checkAuthStatus();
    console.log('Authentication result:', isAuthenticated);
    
    if (!isAuthenticated || !userData) {
      console.log('User not authenticated, showing login banner');
      setShowLoginBanner(true);
      return;
    }

    // If already enrolled, navigate to course content
    if (isEnrolled) {
      Alert.alert(
        'Already Enrolled',
        'You are already enrolled in this course. Would you like to continue learning?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Continue Learning', 
            onPress: () => {
              navigation.navigate('CourseContent', { 
                courseId: course._id,
                enrollmentId: enrollmentData?._id
              });
            }
          }
        ]
      );
      return;
    }

    try {
      setEnrolling(true);
      console.log('Starting enrollment process...');
      
      const enrollmentPayload = {
        courseId: course._id,
        courseType: course.type === 'paid' ? 'PaidCourse' : 'UnpaidCourse',
        mode: 'online',
        schedule: 'flexible'
      };

      console.log('Enrollment payload:', enrollmentPayload);
      console.log('Using token:', userData.token);

      const response = await fetch(`${API_BASE_URL}/enrollment/enroll`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userData.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(enrollmentPayload),
      });

      const data = await response.json();
      console.log('Enrollment response:', { status: response.status, data });

      if (response.ok) {
        if (course.type === 'free' || course.price === 0) {
          // Free course - enrollment completed
          setIsEnrolled(true);
          setEnrollmentData(data.enrollment);
          
          Alert.alert(
            'Enrollment Successful!',
            'You have successfully enrolled in this free course. Start learning now!',
            [
              {
                text: 'Start Learning',
                onPress: () => {
                  navigation.navigate('CourseContent', { 
                    courseId: course._id,
                    enrollmentId: data.enrollment._id
                  });
                },
              },
            ]
          );
        } else {
          // Paid course - initiate payment
          handlePayment(data.enrollment, data.razorpayOrder);
        }
      } else {
        if (response.status === 401) {
          // Token expired or invalid
          console.log('Token expired, clearing auth data');
          await AsyncStorage.multiRemove(['userToken', 'userRole', 'userId', 'userName', 'userData']);
          setIsLoggedIn(false);
          setUserData(null);
          setShowLoginBanner(true);
          Alert.alert(
            'Session Expired',
            'Your session has expired. Please sign in again.',
            [{ text: 'OK' }]
          );
          return;
        }
        throw new Error(data.message || 'Enrollment failed');
      }
    } catch (error) {
      console.error('Error enrolling in course:', error);
      const errorMessage = (error instanceof Error && error.message) ? error.message : 'Failed to enroll in course. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setEnrolling(false);
    }
  };

  // Handle payment process
  const handlePayment = (enrollment: any, razorpayOrder: any) => {
    // This would integrate with Razorpay SDK
    Alert.alert(
      'Payment Required',
      `This course costs ₹${course?.price}. You will be redirected to the payment gateway.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Pay Now', 
          onPress: () => {
            // Navigate to payment screen or integrate Razorpay
            navigation.navigate('PaymentScreen', {
              enrollment: enrollment,
              razorpayOrder: razorpayOrder,
              course: course,
              onPaymentSuccess: handlePaymentSuccess
            });
          }
        }
      ]
    );
  };

  // Handle successful payment
  const handlePaymentSuccess = async (paymentData: any) => {
    try {
      const response = await fetch(`${API_BASE_URL}/enrollment/verify-payment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userData?.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enrollmentId: paymentData.enrollmentId,
          razorpay_order_id: paymentData.razorpay_order_id,
          razorpay_payment_id: paymentData.razorpay_payment_id,
          razorpay_signature: paymentData.razorpay_signature,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsEnrolled(true);
        setEnrollmentData(data.enrollment);
        
        Alert.alert(
          'Payment Successful!',
          'Your payment has been verified and you are now enrolled in the course.',
          [
            {
              text: 'Start Learning',
              onPress: () => {
                navigation.navigate('CourseContent', { 
                  courseId: course?._id,
                  enrollmentId: data.enrollment._id
                });
              },
            },
          ]
        );
      } else {
        throw new Error(data.message || 'Payment verification failed');
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      Alert.alert('Error', 'Payment verification failed. Please contact support.');
    }
  };

  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCourseDetails();
    if (userData) {
      await checkEnrollmentStatus();
    }
    setRefreshing(false);
  };

  // Handle back button
  const handleBackPress = () => {
    navigation.goBack();
  };

  // Close login banner
  const handleCloseBanner = () => {
    setShowLoginBanner(false);
  };

  // Helper function to get proper image source
  const getImageSource = (thumbnailPath: string) => {
    if (!thumbnailPath) {
      return { uri: 'https://via.placeholder.com/350x200/1a2e1a/00ff88?text=No+Image' };
    }
    
    if (thumbnailPath.startsWith('http://') || thumbnailPath.startsWith('https://')) {
      return { uri: thumbnailPath };
    }
    
    const normalizedPath = thumbnailPath.startsWith('/') 
      ? thumbnailPath 
      : `/${thumbnailPath}`;
    
    return { uri: `${API_BASE}${normalizedPath}` };
  };

  // Format duration
  const formatDuration = (duration: string) => {
    if (!duration) return '0:00';
    return duration;
  };

  // Get enrollment button text
  const getEnrollButtonText = () => {
    if (enrolling) return 'Processing...';
    if (isEnrolled) return 'Continue Learning';
    if (course?.type === 'free' || course?.price === 0) return 'Enroll for Free';
    return `Enroll for ₹${course?.price}`;
  };

  // Initial effects
  useEffect(() => {
    if (courseId) {
      fetchCourseDetails();
      startEntranceAnimation();
    }
  }, [courseId]);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  useEffect(() => {
    if (isLoggedIn && userData && course) {
      checkEnrollmentStatus();
    }
  }, [isLoggedIn, userData, course]);

  // Auto-refresh when screen is focused
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('Screen focused, checking auth status...');
      checkAuthStatus();
    });

    return unsubscribe;
  }, [navigation]);

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
    }, 600);
  };

  const renderVideoItem = (video: any, index: number) => (
    <View key={video._id || index} style={styles.videoItem}>
      <View style={styles.videoIcon}>
        <Text style={styles.videoIconText}>▶️</Text>
      </View>
      <View style={styles.videoInfo}>
        <Text style={styles.videoTitle} numberOfLines={2}>
          {video.videoTitle}
        </Text>
        <Text style={styles.videoDescription} numberOfLines={2}>
          {video.videoDescription}
        </Text>
        <View style={styles.videoMeta}>
          <Text style={styles.videoDuration}>
            Duration: {formatDuration(video.duration)}
          </Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={BRAND.backgroundColor} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading course details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!course) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={BRAND.backgroundColor} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Course not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
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
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackPress}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Course Details</Text>
          </View>
        </View>
      </Animated.View>

      {/* Course Content */}
      <Animated.View style={[styles.contentContainer, { opacity: fadeAnim }]}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[BRAND.primaryColor]}
              tintColor={BRAND.primaryColor}
            />
          }
        >
          {/* Course Thumbnail */}
          <View style={styles.thumbnailContainer}>
            <Image
              source={getImageSource(course.courseThumbnail)}
              style={styles.thumbnailImage}
              resizeMode="cover"
            />
            <View style={styles.courseTypeBadge}>
              <Text style={styles.courseTypeBadgeText}>
                {course.type === 'paid' ? 'PAID' : 'FREE'}
              </Text>
            </View>
            {isEnrolled && (
              <View style={styles.enrolledBadge}>
                <Text style={styles.enrolledBadgeText}>✓ ENROLLED</Text>
              </View>
            )}
          </View>

          {/* Course Header */}
          <View style={styles.courseHeader}>
            <View style={styles.courseTitleRow}>
              <Text style={styles.courseTitle}>{course.courseTitle}</Text>
              <View style={styles.priceContainer}>
                <Text style={styles.priceText}>
                  {course.type === 'paid' ? `₹${course.price}` : 'FREE'}
                </Text>
              </View>
            </View>
            
            <Text style={styles.courseSubtitle}>{course.courseDetails?.subtitle}</Text>
            
            <View style={styles.courseMeta}>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Tutor:</Text>
                <Text style={styles.metaValue}>{course.tutor}</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Category:</Text>
                <Text style={styles.metaValue}>{course.category.toUpperCase()}</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Class:</Text>
                <Text style={styles.metaValue}>{course.class}</Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>⭐ {course.rating}</Text>
                <Text style={styles.statLabel}>Rating</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{course.videoLinks?.length || 0}</Text>
                <Text style={styles.statLabel}>Videos</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{course.studentsEnrolled?.length || 0}</Text>
                <Text style={styles.statLabel}>Students</Text>
              </View>
            </View>
          </View>

          {/* Course Description */}
          <View style={styles.descriptionSection}>
            <Text style={styles.sectionTitle}>About this Course</Text>
            <Text style={styles.descriptionText}>
              {course.courseDetails?.description || 'No description available.'}
            </Text>
          </View>

          {/* Video List */}
          <View style={styles.videoSection}>
            <Text style={styles.sectionTitle}>Course Content</Text>
            {course.videoLinks && course.videoLinks.length > 0 ? (
              <View style={styles.videoList}>
                {course.videoLinks.map((video, index) => renderVideoItem(video, index))}
              </View>
            ) : (
              <Text style={styles.noVideosText}>No videos available for this course.</Text>
            )}
          </View>

          {/* Enrollment Button */}
          <View style={styles.enrollmentSection}>
            <TouchableOpacity
              style={[
                styles.enrollButton, 
                enrolling && styles.enrollButtonDisabled,
                isEnrolled && styles.enrollButtonEnrolled
              ]}
              onPress={handleEnrollment}
              disabled={enrolling}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.enrollButtonText,
                isEnrolled && styles.enrollButtonTextEnrolled
              ]}>
                {getEnrollButtonText()}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>
      </Animated.View>

      {/* Login/Signup Banner */}
      <SignupLoginBanner
        navigation={navigation}
        visible={showLoginBanner}
        onClose={handleCloseBanner}
      />
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
    width: 400,
    height: 400,
    top: -200,
    right: -150,
  },
  glowCircle2: {
    width: 300,
    height: 300,
    bottom: 100,
    left: -100,
  },

  // Header Section
  headerSection: {
    height: 60,
    justifyContent: 'center',
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  backButtonText: {
    color: BRAND.primaryColor,
    fontSize: 20,
    fontWeight: '600',
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },

  // Content Container
  contentContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },

  // Thumbnail Section
  thumbnailContainer: {
    height: 200,
    margin: 20,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  courseTypeBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  courseTypeBadgeText: {
    color: BRAND.primaryColor,
    fontSize: 12,
    fontWeight: '700',
  },
  enrolledBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0, 255, 136, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  enrolledBadgeText: {
    color: BRAND.backgroundColor,
    fontSize: 12,
    fontWeight: '700',
  },

  // Course Header
  courseHeader: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  courseTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  courseTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
    marginRight: 16,
    lineHeight: 30,
  },
  priceContainer: {
    backgroundColor: 'rgba(0, 255, 136, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BRAND.primaryColor,
  },
  priceText: {
    fontSize: 16,
    fontWeight: '700',
    color: BRAND.primaryColor,
  },
  courseSubtitle: {
    fontSize: 16,
    color: '#cccccc',
    marginBottom: 16,
    lineHeight: 22,
  },
  courseMeta: {
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  metaLabel: {
    fontSize: 14,
    color: '#aaaaaa',
    marginRight: 8,
    fontWeight: '500',
  },
  metaValue: {
    fontSize: 14,
    color: BRAND.primaryColor,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#aaaaaa',
    fontWeight: '500',
  },

  // Description Section
  descriptionSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 14,
    color: '#cccccc',
    lineHeight: 20,
    fontWeight: '400',
  },

  // Video Section
  videoSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  videoList: {
    gap: 12,
  },
  videoItem: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.2)',
  },
  videoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 255, 136, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  videoIconText: {
    fontSize: 16,
  },
  videoInfo: {
    flex: 1,
  },
  videoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
    lineHeight: 18,
  },
  videoDescription: {
    fontSize: 12,
    color: '#cccccc',
    marginBottom: 8,
    lineHeight: 16,
  },
  videoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  videoDuration: {
    fontSize: 12,
    color: BRAND.primaryColor,
    fontWeight: '500',
  },
  noVideosText: {
    fontSize: 14,
    color: '#aaaaaa',
    textAlign: 'center',
    paddingVertical: 20,
    fontStyle: 'italic',
  },

  // Enrollment Section
  enrollmentSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  enrollButton: {
    backgroundColor: BRAND.primaryColor,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: BRAND.primaryColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  enrollButtonDisabled: {
    backgroundColor: 'rgba(0, 255, 136, 0.5)',
  },
  enrollButtonEnrolled: {
    backgroundColor: 'rgba(0, 255, 136, 0.2)',
    borderWidth: 2,
    borderColor: BRAND.primaryColor,
  },
  enrollButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: BRAND.backgroundColor,
    letterSpacing: 0.5,
  },
  enrollButtonTextEnrolled: {
    color: BRAND.primaryColor,
  },

  // Loading and Error States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
 errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },

  // Bottom Padding (referenced in ScrollView)
  bottomPadding: {
    height: 40,
  },

  // Additional styles you might want to add for better UI consistency
  
  // Loading spinner animation (optional enhancement)
  loadingSpinner: {
    marginTop: 10,
  },

  // Enhanced back button for error state
  errorBackButton: {
    backgroundColor: BRAND.primaryColor,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  errorBackButtonText: {
    color: BRAND.backgroundColor,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Enhanced course meta styling
  metaContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },

  // Video section enhancements
  videoSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  videoCount: {
    fontSize: 14,
    color: BRAND.primaryColor,
    fontWeight: '500',
  },

  // Enhanced enrollment button states
  enrollButtonPressing: {
    backgroundColor: 'rgba(0, 255, 136, 0.8)',
    transform: [{ scale: 0.98 }],
  },

  // Price styling enhancements
  originalPrice: {
    fontSize: 12,
    color: '#aaaaaa',
    textDecorationLine: 'line-through',
    marginBottom: 2,
  },
  discountedPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: BRAND.primaryColor,
  },

  // Badge enhancements
  badgeContainer: {
    flexDirection: 'row',
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    justifyContent: 'space-between',
  },

  // Stats enhancement
  statsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.2)',
  },

  // Video item enhancements
  videoItemPressed: {
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    borderColor: BRAND.primaryColor,
  },
  videoNumber: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  videoNumberText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },

  // Additional utility styles
  separator: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spaceBetween: {
    justifyContent: 'space-between',
  },
    centerContent: {
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
  
  export default CourseDetailsScreen;