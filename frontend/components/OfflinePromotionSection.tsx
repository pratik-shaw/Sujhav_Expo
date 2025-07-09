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
} from 'react-native';
import { NavigationProp } from '@react-navigation/native';

interface OfflinePromotionSectionProps {
  navigation: NavigationProp<any>;
  fadeAnim: Animated.Value;
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

// Contact number
const CONTACT_NUMBER = '+919876543210'; // Replace with actual number

// Mock data for offline center promotion
const offlineContent = {
  photos: [
    {
      id: '1',
      title: 'Modern Study Hall',
      image: 'https://via.placeholder.com/400x240/1a2e1a/00ff88?text=Study+Hall',
    },
    {
      id: '2',
      title: 'Digital Library',
      image: 'https://via.placeholder.com/400x240/1a2e1a/00ff88?text=Digital+Library',
    },
    {
      id: '3',
      title: 'Advanced Laboratory',
      image: 'https://via.placeholder.com/400x240/1a2e1a/00ff88?text=Laboratory',
    },
    {
      id: '4',
      title: 'Smart Classrooms',
      image: 'https://via.placeholder.com/400x240/1a2e1a/00ff88?text=Smart+Classroom',
    },
    {
      id: '5',
      title: 'Recreation Area',
      image: 'https://via.placeholder.com/400x240/1a2e1a/00ff88?text=Recreation+Area',
    },
    {
      id: '6',
      title: 'Cafeteria',
      image: 'https://via.placeholder.com/400x240/1a2e1a/00ff88?text=Cafeteria',
    },
  ],
  highlights: [
    { icon: '🎯', text: '95% Success Rate' },
    { icon: '👨‍🏫', text: 'Expert Faculty' },
    { icon: '📚', text: 'Rich Resources' },
    { icon: '🏆', text: 'Proven Results' },
  ],
};

const OfflinePromotionSection: React.FC<OfflinePromotionSectionProps> = ({ navigation, fadeAnim }) => {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    // Slide in animation
    Animated.spring(slideAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();

    // Scale animation
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleCallPress = () => {
    Alert.alert(
      'Call SUJHAV Center',
      `Would you like to call ${CONTACT_NUMBER}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Call Now', 
          onPress: () => Linking.openURL(`tel:${CONTACT_NUMBER}`)
        }
      ]
    );
  };

  const handleExploreOfflineCenter = () => {
    navigation.navigate('OfflineCenterScreen');
  };

  const onImageScroll = (event: any) => {
    const slideSize = width - 80; // Accounting for margins
    const index = Math.round(event.nativeEvent.contentOffset.x / slideSize);
    setActiveImageIndex(index);
  };

  const renderHighlight = (highlight: any, index: number) => (
    <View key={index} style={styles.highlightItem}>
      <Text style={styles.highlightIcon}>{highlight.icon}</Text>
      <Text style={styles.highlightText}>{highlight.text}</Text>
    </View>
  );

  const renderDot = (index: number) => (
    <View
      key={index}
      style={[
        styles.dot,
        { backgroundColor: activeImageIndex === index ? BRAND.primaryColor : 'rgba(255, 255, 255, 0.3)' }
      ]}
    />
  );

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [
            { translateY: slideAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [30, 0],
            })},
            { scale: scaleAnim },
          ],
        },
      ]}
    >
      {/* Header Section */}
      <View style={styles.header}>
        <Text style={styles.mainTitle}>Visit Our Offline Center</Text>
        <Text style={styles.subtitle}>
          Experience excellence with premium facilities and expert guidance
        </Text>
        
        {/* Highlights */}
        <View style={styles.highlightsContainer}>
          {offlineContent.highlights.map(renderHighlight)}
        </View>
      </View>

      {/* Image Slider Section */}
      <View style={styles.sliderSection}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onImageScroll}
          scrollEventThrottle={16}
          style={styles.imageSlider}
          contentContainerStyle={styles.sliderContent}
        >
          {offlineContent.photos.map((photo, index) => (
            <TouchableOpacity
              key={photo.id}
              style={styles.imageSlide}
              onPress={handleExploreOfflineCenter}
              activeOpacity={0.9}
            >
              <Image
                source={{ uri: photo.image }}
                style={styles.sliderImage}
                resizeMode="cover"
              />
              <View style={styles.imageOverlay}>
                <Text style={styles.imageTitle}>{photo.title}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        {/* Dots Indicator */}
        <View style={styles.dotsContainer}>
          {offlineContent.photos.map((_, index) => renderDot(index))}
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.exploreButton}
          onPress={handleExploreOfflineCenter}
          activeOpacity={0.8}
        >
          <Text style={styles.exploreButtonText}>Explore Courses</Text>
          <Text style={styles.exploreButtonIcon}>📚</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.callButton}
          onPress={handleCallPress}
          activeOpacity={0.8}
        >
          <Text style={styles.callButtonText}>Call Now</Text>
          <Text style={styles.callButtonIcon}>📞</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(10, 26, 10, 0.95)',
    marginHorizontal: 20,
    marginVertical: 15,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },

  // Header Section
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: BRAND.primaryColor,
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
    paddingHorizontal: 10,
  },

  // Highlights
  highlightsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  highlightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.2)',
  },
  highlightIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  highlightText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },

  // Image Slider Section
  sliderSection: {
    marginBottom: 20,
  },
  imageSlider: {
    height: 180,
  },
  sliderContent: {
    paddingHorizontal: 0,
  },
  imageSlide: {
    width: width - 80,
    height: 160,
    marginHorizontal: 0,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.2)',
    shadowColor: BRAND.primaryColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  sliderImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  imageTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Dots Indicator
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Action Buttons
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  exploreButton: {
    flex: 1,
    backgroundColor: BRAND.primaryColor,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 20,
    shadowColor: BRAND.primaryColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  exploreButtonText: {
    color: BRAND.backgroundColor,
    fontSize: 15,
    fontWeight: '700',
    marginRight: 6,
  },
  exploreButtonIcon: {
    fontSize: 16,
  },
  callButton: {
    flex: 1,
    backgroundColor: 'rgba(0, 255, 136, 0.15)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BRAND.primaryColor,
  },
  callButtonText: {
    color: BRAND.primaryColor,
    fontSize: 15,
    fontWeight: '600',
    marginRight: 6,
  },
  callButtonIcon: {
    fontSize: 16,
  },
});

export default OfflinePromotionSection;