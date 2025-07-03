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
      <View style={styles.courseImageContainer}>
        <Image
          source={{ uri: item.courseThumbnail }}
          style={styles.courseImage}
          resizeMode="cover"
        />
        <View style={styles.courseBadge}>
          <Text style={styles.courseBadgeText}>
            {item.type === 'paid' ? `₹${item.price}` : 'FREE'}
          </Text>
        </View>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryBadgeText}>{item.category.toUpperCase()}</Text>
        </View>
      </View>
      
      <View style={styles.courseContent}>
        <Text style={styles.courseTitle} numberOfLines={2}>
          {item.courseTitle}
        </Text>
        <Text style={styles.courseTutor}>by {item.tutor}</Text>
        <Text style={styles.courseSubtitle} numberOfLines={2}>
          {item.courseDetails.subtitle}
        </Text>
        
        <View style={styles.courseStats}>
          <View style={styles.ratingContainer}>
            <Text style={styles.ratingText}>⭐ {item.rating}</Text>
          </View>
          <View style={styles.studentsContainer}>
            <Text style={styles.studentsText}>
              {item.studentsEnrolled?.length || 0} enrolled
            </Text>
          </View>
          <View style={styles.videosContainer}>
            <Text style={styles.videosText}>
              {item.videoLinks?.length || 0} videos
            </Text>
          </View>
        </View>
        
        <View style={styles.classContainer}>
          <Text style={styles.classText}>Class {item.class}</Text>
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
            numColumns={2}
            columnWrapperStyle={styles.courseRow}
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
    paddingVertical: 20,
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
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
  courseRow: {
    justifyContent: 'space-between',
  },
  courseCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 15,
    marginBottom: 15,
    width: (width - 50) / 2,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.2)',
    overflow: 'hidden',
  },
  courseImageContainer: {
    position: 'relative',
    height: 120,
  },
  courseImage: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  courseBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: BRAND.primaryColor,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  courseBadgeText: {
    color: BRAND.backgroundColor,
    fontSize: 10,
    fontWeight: '600',
  },
  categoryBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  courseContent: {
    padding: 12,
  },
  courseTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
    lineHeight: 18,
  },
  courseTutor: {
    fontSize: 11,
    color: BRAND.primaryColor,
    marginBottom: 6,
  },
  courseSubtitle: {
    fontSize: 11,
    color: '#cccccc',
    marginBottom: 8,
    lineHeight: 14,
  },
  courseStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 10,
    color: '#ffffff',
  },
  studentsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  studentsText: {
    fontSize: 10,
    color: '#aaaaaa',
  },
  videosContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  videosText: {
    fontSize: 10,
    color: '#aaaaaa',
  },
  classContainer: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 255, 136, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  classText: {
    fontSize: 10,
    color: BRAND.primaryColor,
    fontWeight: '600',
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