import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  TouchableOpacity,
  ScrollView,
  Image,
  Linking,
  Alert,
  SafeAreaView,
} from 'react-native';
import { NavigationProp } from '@react-navigation/native';

interface OfflineCenterScreenProps {
  navigation: NavigationProp<any>;
}

const { width, height } = Dimensions.get('window');

// Brand configuration
const BRAND = {
  name: "SUJHAV",
  primaryColor: '#00ff88',
  secondaryColor: '#000000',
  backgroundColor: '#0a1a0a',
  accentColor: '#1a2e1a',
};

// Contact details
const CONTACT_INFO = {
  phone: '+919876543210',
  email: 'info@sujhav.com',
  address: '123 Education Street, Knowledge City, WB 700001',
  timings: 'Mon-Sat: 8:00 AM - 8:00 PM',
};

// Center data
const centerData = {
  heroImage: 'https://via.placeholder.com/400x250/1a2e1a/00ff88?text=SUJHAV+Center',
  gallery: [
    {
      id: '1',
      title: 'Modern Study Hall',
      image: 'https://via.placeholder.com/400x300/1a2e1a/00ff88?text=Study+Hall',
    },
    {
      id: '2',
      title: 'Digital Library',
      image: 'https://via.placeholder.com/400x300/1a2e1a/00ff88?text=Digital+Library',
    },
    {
      id: '3',
      title: 'Advanced Laboratory',
      image: 'https://via.placeholder.com/400x300/1a2e1a/00ff88?text=Laboratory',
    },
    {
      id: '4',
      title: 'Smart Classrooms',
      image: 'https://via.placeholder.com/400x300/1a2e1a/00ff88?text=Smart+Classroom',
    },
    {
      id: '5',
      title: 'Recreation Area',
      image: 'https://via.placeholder.com/400x300/1a2e1a/00ff88?text=Recreation+Area',
    },
    {
      id: '6',
      title: 'Cafeteria',
      image: 'https://via.placeholder.com/400x300/1a2e1a/00ff88?text=Cafeteria',
    },
  ],
  courses: [
    {
      id: '1',
      name: 'JEE Main & Advanced',
      duration: '2 Years',
      batches: '15+ Batches',
      price: '₹80,000/year',
      features: ['Expert Faculty', 'Mock Tests', 'Study Material', 'Doubt Clearing'],
      popular: true,
    },
    {
      id: '2',
      name: 'NEET Preparation',
      duration: '2 Years',
      batches: '12+ Batches',
      price: '₹75,000/year',
      features: ['Medical Experts', 'Clinical Exposure', 'Practice Tests', 'Counseling'],
      popular: false,
    },
    {
      id: '3',
      name: 'Class 11th & 12th Boards',
      duration: '2 Years',
      batches: '20+ Batches',
      price: '₹50,000/year',
      features: ['Board Focused', 'Regular Tests', 'Concept Building', 'Revision'],
      popular: false,
    },
    {
      id: '4',
      name: 'Foundation (9th & 10th)',
      duration: '2 Years',
      batches: '8+ Batches',
      price: '₹40,000/year',
      features: ['Strong Foundation', 'Fun Learning', 'Skill Development', 'Career Guidance'],
      popular: false,
    },
  ],
  facilities: [
    { icon: '📚', title: 'Digital Library', description: 'Access to 10,000+ books and e-resources' },
    { icon: '🔬', title: 'Modern Labs', description: 'Fully equipped Physics, Chemistry, Biology labs' },
    { icon: '💻', title: 'Computer Lab', description: 'Latest computers with high-speed internet' },
    { icon: '🎯', title: 'Test Series', description: 'Regular mock tests and assessments' },
    { icon: '👨‍🏫', title: 'Expert Faculty', description: 'IIT/NIT alumni with proven track record' },
    { icon: '🏆', title: 'Results', description: '95% success rate in competitive exams' },
  ],
  testimonials: [
    {
      id: '1',
      name: 'Rahul Sharma',
      course: 'JEE Advanced',
      rank: 'AIR 245',
      text: 'SUJHAV helped me achieve my dream of getting into IIT. The faculty and environment are exceptional.',
      image: 'https://via.placeholder.com/60x60/1a2e1a/00ff88?text=RS',
    },
    {
      id: '2',
      name: 'Priya Patel',
      course: 'NEET',
      rank: 'AIR 156',
      text: 'The medical faculty at SUJHAV is outstanding. Their guidance made NEET preparation smooth.',
      image: 'https://via.placeholder.com/60x60/1a2e1a/00ff88?text=PP',
    },
  ],
};

const OfflineCenterScreen: React.FC<OfflineCenterScreenProps> = ({ navigation }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleCallPress = () => {
    Alert.alert(
      'Call SUJHAV Center',
      `Would you like to call ${CONTACT_INFO.phone}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Call Now', 
          onPress: () => Linking.openURL(`tel:${CONTACT_INFO.phone}`)
        }
      ]
    );
  };

  const handleEmailPress = () => {
    Linking.openURL(`mailto:${CONTACT_INFO.email}`);
  };

  const handleEnrollPress = (course: any) => {
    Alert.alert(
      'Enroll in Course',
      `Would you like to enroll in ${course.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Call to Enroll', 
          onPress: handleCallPress
        }
      ]
    );
  };

  const renderGalleryItem = (item: any) => (
    <TouchableOpacity key={item.id} style={styles.galleryItem}>
      <Image source={{ uri: item.image }} style={styles.galleryImage} />
      <Text style={styles.galleryTitle}>{item.title}</Text>
    </TouchableOpacity>
  );

  const renderCourseCard = (course: any) => (
    <View key={course.id} style={styles.courseCard}>
      {course.popular && (
        <View style={styles.popularBadge}>
          <Text style={styles.popularText}>Popular</Text>
        </View>
      )}
      <View style={styles.courseHeader}>
        <Text style={styles.courseName}>{course.name}</Text>
        <Text style={styles.coursePrice}>{course.price}</Text>
      </View>
      
      <View style={styles.courseDetails}>
        <View style={styles.courseDetailRow}>
          <Text style={styles.courseDetailLabel}>Duration:</Text>
          <Text style={styles.courseDetailValue}>{course.duration}</Text>
        </View>
        <View style={styles.courseDetailRow}>
          <Text style={styles.courseDetailLabel}>Batches:</Text>
          <Text style={styles.courseDetailValue}>{course.batches}</Text>
        </View>
      </View>

      <View style={styles.courseFeatures}>
        {course.features.map((feature: string, index: number) => (
          <View key={index} style={styles.featureItem}>
            <Text style={styles.featureIcon}>✓</Text>
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={styles.enrollButton}
        onPress={() => handleEnrollPress(course)}
      >
        <Text style={styles.enrollButtonText}>Enroll Now</Text>
      </TouchableOpacity>
    </View>
  );

  const renderFacilityCard = (facility: any, index: number) => (
    <View key={index} style={styles.facilityCard}>
      <Text style={styles.facilityIcon}>{facility.icon}</Text>
      <Text style={styles.facilityTitle}>{facility.title}</Text>
      <Text style={styles.facilityDescription}>{facility.description}</Text>
    </View>
  );

  const renderTestimonial = (testimonial: any) => (
    <View key={testimonial.id} style={styles.testimonialCard}>
      <View style={styles.testimonialHeader}>
        <Image source={{ uri: testimonial.image }} style={styles.testimonialImage} />
        <View style={styles.testimonialInfo}>
          <Text style={styles.testimonialName}>{testimonial.name}</Text>
          <Text style={styles.testimonialCourse}>{testimonial.course}</Text>
          <Text style={styles.testimonialRank}>{testimonial.rank}</Text>
        </View>
      </View>
      <Text style={styles.testimonialText}>"{testimonial.text}"</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Offline Center</Text>
          </View>

          {/* Hero Section */}
          <View style={styles.heroSection}>
            <Image source={{ uri: centerData.heroImage }} style={styles.heroImage} />
            <View style={styles.heroOverlay}>
              <Text style={styles.heroTitle}>SUJHAV Education Center</Text>
              <Text style={styles.heroSubtitle}>Where Dreams Take Flight</Text>
            </View>
          </View>

          {/* Gallery Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Our Facilities</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.galleryScroll}
            >
              {centerData.gallery.map(renderGalleryItem)}
            </ScrollView>
          </View>

          {/* Courses Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Our Courses</Text>
            {centerData.courses.map(renderCourseCard)}
          </View>

          {/* Facilities Grid */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Why Choose Us</Text>
            <View style={styles.facilitiesGrid}>
              {centerData.facilities.map(renderFacilityCard)}
            </View>
          </View>

          {/* Testimonials */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Success Stories</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.testimonialsScroll}
            >
              {centerData.testimonials.map(renderTestimonial)}
            </ScrollView>
          </View>

          {/* Contact Section */}
          <View style={styles.contactSection}>
            <Text style={styles.sectionTitle}>Contact Us</Text>
            <View style={styles.contactCard}>
              <TouchableOpacity style={styles.contactItem} onPress={handleCallPress}>
                <Text style={styles.contactIcon}>📞</Text>
                <Text style={styles.contactText}>{CONTACT_INFO.phone}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.contactItem} onPress={handleEmailPress}>
                <Text style={styles.contactIcon}>✉️</Text>
                <Text style={styles.contactText}>{CONTACT_INFO.email}</Text>
              </TouchableOpacity>
              
              <View style={styles.contactItem}>
                <Text style={styles.contactIcon}>📍</Text>
                <Text style={styles.contactText}>{CONTACT_INFO.address}</Text>
              </View>
              
              <View style={styles.contactItem}>
                <Text style={styles.contactIcon}>🕒</Text>
                <Text style={styles.contactText}>{CONTACT_INFO.timings}</Text>
              </View>
            </View>
          </View>

          {/* Bottom Action */}
          <View style={styles.bottomAction}>
            <TouchableOpacity style={styles.callNowButton} onPress={handleCallPress}>
              <Text style={styles.callNowText}>Call Now for Admission</Text>
              <Text style={styles.callNowIcon}>📞</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND.backgroundColor,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 20,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'rgba(26, 46, 26, 0.95)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 255, 136, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  backButtonText: {
    color: BRAND.primaryColor,
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '600',
  },

  // Hero Section
  heroSection: {
    position: 'relative',
    height: 250,
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 20,
  },
  heroTitle: {
    color: BRAND.primaryColor,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  heroSubtitle: {
    color: '#ffffff',
    fontSize: 16,
    opacity: 0.9,
  },

  // Section
  section: {
    marginHorizontal: 20,
    marginTop: 30,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
  },

  // Gallery
  galleryScroll: {
    flexDirection: 'row',
  },
  galleryItem: {
    marginRight: 15,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: BRAND.accentColor,
  },
  galleryImage: {
    width: 200,
    height: 130,
    borderRadius: 12,
  },
  galleryTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    padding: 10,
    textAlign: 'center',
  },

  // Course Cards
  courseCard: {
    backgroundColor: BRAND.accentColor,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.1)',
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    right: 20,
    backgroundColor: BRAND.primaryColor,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    color: BRAND.secondaryColor,
    fontSize: 12,
    fontWeight: '700',
  },
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  courseName: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    marginRight: 10,
  },
  coursePrice: {
    color: BRAND.primaryColor,
    fontSize: 18,
    fontWeight: '600',
  },
  courseDetails: {
    marginBottom: 16,
  },
  courseDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  courseDetailLabel: {
    color: '#cccccc',
    fontSize: 14,
  },
  courseDetailValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  courseFeatures: {
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureIcon: {
    color: BRAND.primaryColor,
    fontSize: 16,
    marginRight: 8,
    fontWeight: 'bold',
  },
  featureText: {
    color: '#ffffff',
    fontSize: 14,
  },
  enrollButton: {
    backgroundColor: BRAND.primaryColor,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    alignItems: 'center',
  },
  enrollButtonText: {
    color: BRAND.secondaryColor,
    fontSize: 16,
    fontWeight: '700',
  },

  // Facilities Grid
  facilitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  facilityCard: {
    width: (width - 60) / 2,
    backgroundColor: BRAND.accentColor,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.1)',
  },
  facilityIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  facilityTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  facilityDescription: {
    color: '#cccccc',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Testimonials
  testimonialsScroll: {
    flexDirection: 'row',
  },
  testimonialCard: {
    width: width - 80,
    backgroundColor: BRAND.accentColor,
    borderRadius: 16,
    padding: 20,
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.1)',
  },
  testimonialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  testimonialImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  testimonialInfo: {
    flex: 1,
  },
  testimonialName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  testimonialCourse: {
    color: '#cccccc',
    fontSize: 14,
    marginBottom: 2,
  },
  testimonialRank: {
    color: BRAND.primaryColor,
    fontSize: 14,
    fontWeight: '600',
  },
  testimonialText: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 22,
    fontStyle: 'italic',
  },

  // Contact Section
  contactSection: {
    marginHorizontal: 20,
    marginTop: 30,
  },
  contactCard: {
    backgroundColor: BRAND.accentColor,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.1)',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  contactIcon: {
    fontSize: 20,
    marginRight: 16,
    width: 24,
    textAlign: 'center',
  },
  contactText: {
    color: '#ffffff',
    fontSize: 16,
    flex: 1,
  },

  // Bottom Action
  bottomAction: {
    marginHorizontal: 20,
    marginTop: 30,
  },
  callNowButton: {
    backgroundColor: BRAND.primaryColor,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 25,
    elevation: 4,
    shadowColor: BRAND.primaryColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  callNowText: {
    color: BRAND.secondaryColor,
    fontSize: 18,
    fontWeight: '700',
    marginRight: 8,
  },
  callNowIcon: {
    fontSize: 18,
  },
});

export default OfflineCenterScreen;