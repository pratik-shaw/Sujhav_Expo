import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { NavigationProp } from '@react-navigation/native';

interface MoreOptionSectionProps {
  navigation: NavigationProp<any>;
  fadeAnim: Animated.Value;
}

// Brand configuration (matching your existing theme)
const BRAND = {
  name: "SUJHAV",
  subtitle: "Synchronize your Understanding, do Justice to your Hardwork and let others Admire your Victory!",
  primaryColor: '#00ff88',
  secondaryColor: '#000000',
  backgroundColor: '#0a1a0a',
  accentColor: '#1a2e1a',
};

const MoreOptionSection: React.FC<MoreOptionSectionProps> = ({
  navigation,
  fadeAnim,
}) => {
  const handleChapterNotesPress = () => {
    navigation.navigate('AllNotesScreen');
  };

  const handleDPPPress = () => {
    navigation.navigate('AllDPPScreen');
  };

  const handleTestSeriesPress = () => {
    // navigation.navigate('TestSeriesScreen');
    console.log('Test Series pressed');
    alert('Test Series feature is under development');
  };

  const renderOptionButton = (
    title: string,
    subtitle: string,
    icon: string,
    onPress: () => void,
    gradientColors: string[],
    isLeft: boolean = false
  ) => (
    <TouchableOpacity
      style={[
        styles.optionButton,
        isLeft ? styles.optionButtonLeft : styles.optionButtonRight,
        { backgroundColor: gradientColors[0] }
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Gradient overlay effect */}
      <View style={[styles.gradientOverlay, { backgroundColor: gradientColors[1] }]} />
      
      {/* Icon container */}
      <View style={styles.iconContainer}>
        <Text style={styles.iconText}>{icon}</Text>
      </View>
      
      {/* Content */}
      <View style={styles.buttonContent}>
        <Text style={styles.buttonTitle} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.buttonSubtitle} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
      
      {/* Glow effect */}
      <View style={styles.buttonGlow} />
      
      {/* Corner accent */}
      <View style={styles.cornerAccent} />
    </TouchableOpacity>
  );

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Section Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.sectionTitle}>More Options</Text>
        <Text style={styles.sectionSubtitle}>
          Explore additional learning resources
        </Text>
      </View>

      {/* Options Grid */}
      <View style={styles.optionsGrid}>
        {/* First Row */}
        <View style={styles.optionRow}>
          {renderOptionButton(
            'Chapter-wise Notes',
            'Organized study notes by chapters',
            '📝',
            handleChapterNotesPress,
            ['rgba(64, 224, 208, 0.15)', 'rgba(64, 224, 208, 0.05)'],
            false
          )}
        </View>

        {/* Second Row */}
        <View style={styles.optionRow}>
          {renderOptionButton(
            'Daily Practice Problems',
            'DPP\'s for consistent practice',
            '🧮',
            handleDPPPress,
            ['rgba(255, 215, 0, 0.15)', 'rgba(255, 215, 0, 0.05)'],
            true
          )}
          {renderOptionButton(
            'Test Series',
            'Mock tests and assessments',
            '📊',
            handleTestSeriesPress,
            ['rgba(255, 105, 180, 0.15)', 'rgba(255, 105, 180, 0.05)'],
            false
          )}
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 10, // Reduced from 20 to 10
  },
  
  // Header
  headerContainer: {
    marginBottom: 15, // Reduced from 20 to 15
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 6,
    letterSpacing: 0.5,
    textShadowColor: BRAND.primaryColor,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#cccccc',
    textAlign: 'center',
    opacity: 0.9,
  },

  // Options Grid
  optionsGrid: {
    gap: 16,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 16,
  },
  
  // Option Buttons
  optionButton: {
    flex: 1,
    height: 120,
    borderRadius: 16,
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: BRAND.primaryColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  optionButtonLeft: {
    marginRight: 0,
  },
  optionButtonRight: {
    marginLeft: 0,
  },
  
  // Gradient overlay
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.3,
  },
  
  // Icon container
  iconContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  iconText: {
    fontSize: 16,
  },
  
  // Button content
  buttonContent: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 40, // Space for icon
    zIndex: 2,
  },
  buttonTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 6,
    lineHeight: 20,
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  buttonSubtitle: {
    fontSize: 11,
    color: '#cccccc',
    lineHeight: 14,
    opacity: 0.9,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  
  // Visual effects
  buttonGlow: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 18,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.3)',
    opacity: 0.6,
  },
  
  cornerAccent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 40,
    height: 40,
    borderTopRightRadius: 20,
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: 'rgba(0, 255, 136, 0.3)',
  },
  
});

export default MoreOptionSection;