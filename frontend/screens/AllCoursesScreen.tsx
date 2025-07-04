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
  TextInput,
} from 'react-native';
import { NavigationProp, RouteProp } from '@react-navigation/native';
import { API_BASE } from '../config/api';

interface AllCoursesScreenProps {
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

// Brand configuration
const BRAND = {
  name: "SUJHAV",
  subtitle: "Synchronize your Understanding, do Justice to your Hardwork and let others Admire your Victory!",
  primaryColor: '#00ff88',
  secondaryColor: '#000000',
  backgroundColor: '#0a1a0a',
  accentColor: '#1a2e1a',
};

const AllCoursesScreen: React.FC<AllCoursesScreenProps> = ({ navigation, route }) => {
  // Get initial data from route params
  const initialCourses = route.params?.courses || [];
  const initialCategory = route.params?.selectedCategory || 'all';
  const initialClass = route.params?.selectedClass || 'all';
  const initialType = route.params?.selectedType || 'all';

  // State management
  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>(initialCourses);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'jee' | 'neet' | 'boards'>(initialCategory);
  const [selectedClass, setSelectedClass] = useState<'all' | '11th' | '12th'>(initialClass);
  const [selectedType, setSelectedType] = useState<'all' | 'paid' | 'free'>(initialType);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-20)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  // API Base URL
  const API_BASE_URL = API_BASE;

  // Fetch all courses from API
  const fetchAllCourses = async () => {
    try {
      setLoading(true);
      
      // Fetch paid courses
      const paidResponse = await fetch(`${API_BASE_URL}/paidCourses`);
      if (!paidResponse.ok) {
        throw new Error(`HTTP error! status: ${paidResponse.status}`);
      }
      const paidText = await paidResponse.text();
      const paidCourses = JSON.parse(paidText);
      
      // Fetch unpaid courses
      const unpaidResponse = await fetch(`${API_BASE_URL}/unpaidCourses`);
      if (!unpaidResponse.ok) {
        throw new Error(`HTTP error! status: ${unpaidResponse.status}`);
      }
      const unpaidText = await unpaidResponse.text();
      const unpaidCourses = JSON.parse(unpaidText);
      
      // Handle different response formats
      const paidData = Array.isArray(paidCourses) ? paidCourses : (paidCourses.data || []);
      const unpaidData = Array.isArray(unpaidCourses) ? unpaidCourses : (unpaidCourses.data || []);
      
      // Combine and mark course types
      const allCourses = [
        ...paidData.map((course: any) => ({ ...course, type: 'paid' })),
        ...unpaidData.map((course: any) => ({ ...course, type: 'free' }))
      ];
      
      setCourses(allCourses);
      
    } catch (error) {
      console.error('Error fetching courses:', error);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter courses based on search and filters
  const applyFilters = () => {
    let filtered = courses;

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(course =>
        course.courseTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.tutor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(course => course.category === selectedCategory);
    }

    // Apply class filter
    if (selectedClass !== 'all') {
      filtered = filtered.filter(course => course.class === selectedClass);
    }

    // Apply type filter
    if (selectedType !== 'all') {
      filtered = filtered.filter(course => course.type === selectedType);
    }

    setFilteredCourses(filtered);
  };

  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAllCourses();
    setRefreshing(false);
  };

  // Handle course press
  const handleCoursePress = (courseId: string) => {
    navigation.navigate('CourseDetails', { courseId });
  };

  // Handle back button
  const handleBackPress = () => {
    navigation.goBack();
  };

  // Helper function to get proper image source
  const getImageSource = (thumbnailPath: string) => {
    if (!thumbnailPath) {
      return { uri: 'https://via.placeholder.com/80x60/1a2e1a/00ff88?text=No+Image' };
    }
    
    if (thumbnailPath.startsWith('http://') || thumbnailPath.startsWith('https://')) {
      return { uri: thumbnailPath };
    }
    
    const normalizedPath = thumbnailPath.startsWith('/') 
      ? thumbnailPath 
      : `/${thumbnailPath}`;
    
    return { uri: `${API_BASE}${normalizedPath}` };
  };

  useEffect(() => {
    // If no courses were passed, fetch them
    if (initialCourses.length === 0) {
      fetchAllCourses();
    }
    startEntranceAnimation();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchQuery, selectedCategory, selectedClass, selectedType, courses]);

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

  const renderCourseItem = (course: Course) => (
    <TouchableOpacity
      key={course._id}
      style={styles.courseItem}
      onPress={() => handleCoursePress(course._id)}
      activeOpacity={0.7}
    >
      {/* Course thumbnail */}
      <View style={styles.courseImageContainer}>
        <Image
          source={getImageSource(course.courseThumbnail)}
          style={styles.courseImage}
          resizeMode="cover"
        />
        <View style={styles.courseTypeBadge}>
          <Text style={styles.courseTypeBadgeText}>
            {course.type === 'paid' ? 'PAID' : 'FREE'}
          </Text>
        </View>
      </View>

      {/* Course info */}
      <View style={styles.courseInfo}>
        <View style={styles.courseHeader}>
          <Text style={styles.courseTitle} numberOfLines={2}>
            {course.courseTitle}
          </Text>
          <View style={styles.courseBadges}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{course.category.toUpperCase()}</Text>
            </View>
            <View style={styles.classBadge}>
              <Text style={styles.classBadgeText}>{course.class}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.courseTutor} numberOfLines={1}>
          by {course.tutor}
        </Text>

        <View style={styles.courseStats}>
          <View style={styles.statItem}>
            <Text style={styles.ratingText}>⭐ {course.rating}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.videosText}>{course.videoLinks?.length || 0} videos</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.enrollmentText}>
              {course.studentsEnrolled?.length || 0} students
            </Text>
          </View>
        </View>
      </View>

      {/* Price */}
      <View style={styles.priceContainer}>
        <Text style={styles.priceText}>
          {course.type === 'paid' ? `₹${course.price}` : 'FREE'}
        </Text>
      </View>
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
            <Text style={styles.headerTitle}>All Courses</Text>
            <Text style={styles.headerSubtitle}>
              {filteredCourses.length} courses available
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Search Bar */}
      <Animated.View style={[styles.searchSection, { opacity: fadeAnim }]}>
        <View style={styles.searchInputContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search courses, tutors, categories..."
            placeholderTextColor="#666666"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <Text style={styles.searchIcon}>🔍</Text>
        </View>
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
            
            {/* Type Filters */}
            {renderFilterButton('All Types', 'all', selectedType, setSelectedType)}
            {renderFilterButton('Paid', 'paid', selectedType, setSelectedType)}
            {renderFilterButton('Free', 'free', selectedType, setSelectedType)}
          </View>
        </ScrollView>
      </Animated.View>

      {/* Courses List */}
      <Animated.View style={[styles.coursesContainer, { opacity: fadeAnim }]}>
        <ScrollView
          style={styles.coursesList}
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
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading courses...</Text>
            </View>
          ) : filteredCourses.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No courses found</Text>
              <Text style={styles.emptySubtext}>
                Try adjusting your search or filters
              </Text>
            </View>
          ) : (
            <View style={styles.coursesListContent}>
              {filteredCourses.map((course) => renderCourseItem(course))}
              <View style={styles.bottomPadding} />
            </View>
          )}
        </ScrollView>
      </Animated.View>
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
  headerSubtitle: {
    fontSize: 12,
    color: BRAND.primaryColor,
    marginTop: 2,
    fontWeight: '500',
  },

  // Search Section
  searchSection: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  searchIcon: {
    fontSize: 16,
    marginLeft: 10,
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

  // Courses Container
  coursesContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  coursesList: {
    flex: 1,
  },
  coursesListContent: {
    paddingTop: 10,
  },

  // Course Item (List Style)
  courseItem: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.2)',
    shadowColor: BRAND.primaryColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  courseImageContainer: {
    width: 80,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  courseImage: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  courseTypeBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  courseTypeBadgeText: {
    color: BRAND.primaryColor,
    fontSize: 8,
    fontWeight: '700',
  },

  // Course Info
  courseInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  courseTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
    lineHeight: 18,
    marginRight: 8,
  },
  courseBadges: {
    flexDirection: 'row',
    gap: 4,
  },
  categoryBadge: {
    backgroundColor: 'rgba(0, 255, 136, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryBadgeText: {
    color: BRAND.primaryColor,
    fontSize: 8,
    fontWeight: '700',
  },
  classBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  classBadgeText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '700',
  },
  courseTutor: {
    fontSize: 12,
    color: BRAND.primaryColor,
    marginBottom: 6,
    fontWeight: '500',
  },
  courseStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '500',
  },
  videosText: {
    fontSize: 10,
    color: '#cccccc',
    fontWeight: '500',
  },
  enrollmentText: {
    fontSize: 10,
    color: '#aaaaaa',
    fontWeight: '500',
  },

  // Price Container
  priceContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '700',
    color: BRAND.primaryColor,
    textAlign: 'center',
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
    fontWeight: '500',
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
    textAlign: 'center',
  },

  // Bottom padding
  bottomPadding: {
    height: 20,
  },
});

export default AllCoursesScreen;