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
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { NavigationProp } from '@react-navigation/native';
import BottomNavigation from '../components/BottomNavigation';
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

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-20)).current;
  const welcomeOpacity = useRef(new Animated.Value(0)).current;
  const welcomeTranslateY = useRef(new Animated.Value(30)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;

  // API Base URL - Replace with your actual API base URL
  const API_BASE_URL = API_BASE; // TODO: Replace with actual API URL

  // Helper function to get proper image source
  const getImageSource = (thumbnailPath: string) => {
    // Handle empty or null paths
    if (!thumbnailPath) {
      return { uri: 'https://via.placeholder.com/300x200/1a2e1a/00ff88?text=No+Image' };
    }
    
    // Check if it's already a complete URL
    if (thumbnailPath.startsWith('http://') || thumbnailPath.startsWith('https://')) {
      return { uri: thumbnailPath };
    }
    
    // Handle paths that may or may not start with /
    const normalizedPath = thumbnailPath.startsWith('/') 
      ? thumbnailPath 
      : `/${thumbnailPath}`;
    
    return { uri: `${API_BASE_URL}${normalizedPath}` };
  };

  // Fetch courses from both paid and unpaid endpoints
  // Improved fetchCourses function with better error handling
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
    const allCourses = [
      ...paidData.map((course: any) => ({ ...course, type: 'paid' })),
      ...unpaidData.map((course: any) => ({ ...course, type: 'free' }))
    ];
    
    console.log('Successfully fetched courses:', allCourses.length);
    setCourses(allCourses);
    setFilteredCourses(allCourses);
    
  } catch (error) {
    console.error('Error fetching courses:', error);
    
    // Show user-friendly error message
    // You might want to show an alert or toast here
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

  // Handle course card press - Future implementation
  const handleCoursePress = (courseId: string) => {
    // TODO: Navigate to course details screen
    // navigation.navigate('CourseDetails', { courseId });
    console.log('Course pressed:', courseId);
  };

  useEffect(() => {
    fetchCourses();
    startEntranceAnimation();
    startPulseAnimation();
  }, []);

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

    // Welcome message animation
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(welcomeOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(welcomeTranslateY, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }, 600);

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

  const renderCourseCard = ({ item }: { item: Course }) => (
    <TouchableOpacity
      style={styles.courseCard}
      onPress={() => handleCoursePress(item._id)}
      activeOpacity={0.8}
    >
      {/* Full width thumbnail image */}
      <Image
        source={getImageSource(item.courseThumbnail)}
        style={styles.courseImage}
        resizeMode="cover"
        onError={(error) => {
          console.log('Image load error for course:', item.courseTitle, error);
        }}
      />
      
      {/* Top badges row */}
      <View style={styles.topBadgesRow}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryBadgeText}>{item.category.toUpperCase()}</Text>
        </View>
        <View style={styles.classBadge}>
          <Text style={styles.classBadgeText}>{item.class}</Text>
        </View>
      </View>

      {/* Price badge */}
      <View style={styles.priceBadge}>
        <Text style={styles.priceBadgeText}>
          {item.type === 'paid' ? `₹${item.price}` : 'FREE'}
        </Text>
      </View>

      {/* Translucent overlay with course content */}
      <View style={styles.courseContentOverlay}>
        <View style={styles.courseContent}>
          <Text style={styles.courseTitle} numberOfLines={2}>
            {item.courseTitle}
          </Text>
          <Text style={styles.courseTutor} numberOfLines={1}>by {item.tutor}</Text>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.ratingText}>⭐ {item.rating}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.videosText}>{item.videoLinks?.length || 0} videos</Text>
            </View>
          </View>
          
          <View style={styles.enrollmentRow}>
            <Text style={styles.enrollmentText}>
              {item.studentsEnrolled?.length || 0} students
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

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

      {/* Welcome Section */}
      <Animated.View
        style={[
          styles.welcomeSection,
          {
            opacity: welcomeOpacity,
            transform: [{ translateY: welcomeTranslateY }],
          },
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

      {/* Course List */}
      <Animated.View style={[styles.courseListContainer, { opacity: fadeAnim }]}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={BRAND.primaryColor} />
            <Text style={styles.loadingText}>Loading courses...</Text>
          </View>
        ) : (
          <FlatList
          data={filteredCourses}
          renderItem={renderCourseCard}
          keyExtractor={(item) => item._id}
          numColumns={1}
          contentContainerStyle={styles.courseListContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[BRAND.primaryColor]}
              tintColor={BRAND.primaryColor}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No courses found</Text>
              <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
            </View>
          }
        />

        )}
      </Animated.View>

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

  // Course List
  courseListContainer: {
    flex: 1,
    paddingBottom: 100, // Space for bottom navigation
  },
  courseListContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  
  // UPDATED: Full thumbnail course card design
  courseCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    marginBottom: 16,
    width: '100%',
    height: 200, // Fixed height for consistency
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.3)',
    overflow: 'hidden',
    shadowColor: BRAND.primaryColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    position: 'relative',
  },
  
  // UPDATED: Full width and height image
  courseImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  
  // UPDATED: Badges positioned over the image
  topBadgesRow: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    zIndex: 3,
  },
  categoryBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  categoryBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  classBadge: {
    backgroundColor: 'rgba(0, 255, 136, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  classBadgeText: {
    color: BRAND.backgroundColor,
    fontSize: 10,
    fontWeight: '700',
  },
  priceBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: BRAND.primaryColor,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 4,
    zIndex: 3,
  },
  priceBadgeText: {
    color: BRAND.backgroundColor,
    fontSize: 11,
    fontWeight: '700',
  },
  
  // NEW: Translucent overlay container
  courseContentOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%', // Takes up bottom half of the card
    // For React Native, we'll use a dark overlay with opacity
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
    zIndex: 2,
  },
  
  // UPDATED: Course content positioned within the overlay
  courseContent: {
    padding: 16,
    paddingTop: 24, // Extra padding to ensure text doesn't blend with image
  },
  courseTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
    lineHeight: 18,
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  courseTutor: {
    fontSize: 11,
    color: BRAND.primaryColor,
    marginBottom: 8,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  
  // UPDATED: Stats and enrollment with better contrast
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  videosText: {
    fontSize: 11,
    color: '#cccccc',
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  enrollmentRow: {
    alignItems: 'flex-start',
  },
  enrollmentText: {
    fontSize: 10,
    color: '#aaaaaa',
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Loading and Empty States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
    marginTop: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#aaaaaa',
    fontSize: 14,
  },
});

export default HomeScreen;