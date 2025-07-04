import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Animated,
  ScrollView,
} from 'react-native';
import { API_BASE } from '../config/api';

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

interface CoursesSectionProps {
  courses: Course[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onCoursePress: (courseId: string) => void;
  fadeAnim: Animated.Value;
  headerComponent?: () => React.ReactNode;
  footerComponent?: () => React.ReactNode;
  // New props for button actions
  onViewDetails?: (courseId: string) => void;
  onEnrollNow?: (courseId: string) => void;
  // New props for showing all courses
  totalCoursesCount?: number;
  onShowAllCourses?: () => void;
  showAllCoursesButton?: boolean;
}

// Brand configuration
const BRAND = {
  name: "SUJHAV",
  subtitle: "Synchronize your Understanding, do Justice to your Hardwork and let others Admire your Victory!",
  primaryColor: '#00ff88',
  secondaryColor: '#000000',
  backgroundColor: '#0a1a0a',
  accentColor: '#1a2e1a',
};

const CoursesSection: React.FC<CoursesSectionProps> = ({
  courses,
  loading,
  refreshing,
  onRefresh,
  onCoursePress,
  fadeAnim,
  headerComponent,
  footerComponent,
  onViewDetails,
  onEnrollNow,
  totalCoursesCount,
  onShowAllCourses,
  showAllCoursesButton = false,
}) => {
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
    
    return { uri: `${API_BASE}${normalizedPath}` };
  };

  const handleViewDetails = (courseId: string) => {
    if (onViewDetails) {
      onViewDetails(courseId);
    } else {
      // Default fallback to onCoursePress
      onCoursePress(courseId);
    }
  };

  const handleEnrollNow = (courseId: string) => {
    if (onEnrollNow) {
      onEnrollNow(courseId);
    } else {
      // Default fallback - can be customized for enrollment logic
      console.log('Enroll now clicked for course:', courseId);
    }
  };

  const handleShowAllCourses = () => {
    if (onShowAllCourses) {
      onShowAllCourses();
    } else {
      // Default fallback - commented navigation as requested
      // navigation.navigate('AllCoursesScreen');
      console.log('Show all courses clicked');
    }
  };

  const renderCourseCard = (course: Course) => (
    <View key={course._id} style={styles.courseCardContainer}>
      {/* Main Course Card */}
      <TouchableOpacity
        style={styles.courseCard}
        onPress={() => onCoursePress(course._id)}
        activeOpacity={0.8}
      >
        {/* Full width thumbnail image */}
        <Image
          source={getImageSource(course.courseThumbnail)}
          style={styles.courseImage}
          resizeMode="cover"
          onError={(error) => {
            console.log('Image load error for course:', course.courseTitle, error);
          }}
        />
        
        {/* Top badges row */}
        <View style={styles.topBadgesRow}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{course.category.toUpperCase()}</Text>
          </View>
          <View style={styles.classBadge}>
            <Text style={styles.classBadgeText}>{course.class}</Text>
          </View>
        </View>

        {/* Price badge */}
        <View style={styles.priceBadge}>
          <Text style={styles.priceBadgeText}>
            {course.type === 'paid' ? `₹${course.price}` : 'FREE'}
          </Text>
        </View>

        {/* Translucent overlay with course content */}
        <View style={styles.courseContentOverlay}>
          <View style={styles.courseContent}>
            <Text style={styles.courseTitle} numberOfLines={2}>
              {course.courseTitle}
            </Text>
            <Text style={styles.courseTutor} numberOfLines={1}>by {course.tutor}</Text>
            
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.ratingText}>⭐ {course.rating}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.videosText}>{course.videoLinks?.length || 0} videos</Text>
              </View>
            </View>
            
            <View style={styles.enrollmentRow}>
              <Text style={styles.enrollmentText}>
                {course.studentsEnrolled?.length || 0} students
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>

      {/* Attached Action Buttons at bottom of card */}
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity
          style={styles.viewDetailsButton}
          onPress={() => handleViewDetails(course._id)}
          activeOpacity={0.7}
        >
          <Text style={styles.viewDetailsButtonText}>View Details</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.enrollButton}
          onPress={() => handleEnrollNow(course._id)}
          activeOpacity={0.7}
        >
          <Text style={styles.enrollButtonText}>
            {course.type === 'paid' ? 'Enroll Now' : 'Start Learning'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderShowAllCoursesCard = () => (
    <View key="show-all-courses" style={styles.showAllCoursesContainer}>
      <TouchableOpacity
        style={styles.showAllCoursesCard}
        onPress={handleShowAllCourses}
        activeOpacity={0.8}
      >
        {/* Background gradient effect */}
        <View style={styles.showAllCoursesBackground}>
          <View style={styles.showAllCoursesGradient} />
        </View>
        
        {/* Content */}
        <View style={styles.showAllCoursesContent}>
          
          <Text style={styles.showAllCoursesTitle}>View All Courses</Text>
          <Text style={styles.showAllCoursesSubtitle}>
            {totalCoursesCount ? `${totalCoursesCount} courses available` : 'See more courses'}
          </Text>
          
          <View style={styles.showAllCoursesArrow}>
            <Text style={styles.showAllCoursesArrowText}>→</Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
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
      {/* Header Component */}
      {headerComponent && headerComponent()}

      {/* Main Content */}
      <Animated.View style={[styles.courseListContainer, { opacity: fadeAnim }]}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={BRAND.primaryColor} />
            <Text style={styles.loadingText}>Loading courses...</Text>
          </View>
        ) : (
          <View style={styles.courseListContent}>
            {courses.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No courses found</Text>
                <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
              </View>
            ) : (
              <>
                {/* Render regular course cards */}
                {courses.map((course) => renderCourseCard(course))}
                
                {/* Render "Show All Courses" card if enabled */}
                {showAllCoursesButton && renderShowAllCoursesCard()}
              </>
            )}
          </View>
        )}
      </Animated.View>

      {/* Footer Component */}
      {footerComponent && footerComponent()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  // Container for the ScrollView
  container: {
    flex: 1,
    backgroundColor: BRAND.backgroundColor,
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
  
  // Course card container - includes card + action buttons
  courseCardContainer: {
    marginBottom: 24,
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.3)',
    shadowColor: BRAND.primaryColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  
  // Course card design with full thumbnail
  courseCard: {
    width: '100%',
    height: 200, // Fixed height for consistency
    position: 'relative',
  },
  
  // Full width and height image
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
  
  // Badges positioned over the image
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
  
  // Translucent overlay container
  courseContentOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%', // Takes up bottom half of the card
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
    zIndex: 2,
  },
  
  // Course content positioned within the overlay
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
  
  // Stats and enrollment with better contrast
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

  // Attached Action Buttons - directly attached to bottom of card
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 255, 136, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  viewDetailsButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.4)',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewDetailsButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  enrollButton: {
    flex: 1,
    backgroundColor: BRAND.primaryColor,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BRAND.primaryColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  enrollButtonText: {
    color: BRAND.backgroundColor,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Show All Courses Card Style
  showAllCoursesBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  showAllCoursesGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 255, 136, 0.05)',
  },
  showAllCoursesContent: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
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
  showAllCoursesContainer: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 255, 136, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.2)',
    shadowColor: BRAND.primaryColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  
  showAllCoursesCard: {
    width: '100%',
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  
  showAllCoursesIconText: {
    fontSize: 20,
  },
  
  showAllCoursesTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  
  showAllCoursesSubtitle: {
    fontSize: 12,
    color: BRAND.primaryColor,
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '500',
    opacity: 0.9,
  },
  
  showAllCoursesArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: BRAND.primaryColor,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: BRAND.primaryColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  
  showAllCoursesArrowText: {
    fontSize: 16,
    color: BRAND.backgroundColor,
    fontWeight: '600',
  },
});

export default CoursesSection;