import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  StatusBar,
  SafeAreaView,
  Animated,
  Image,
} from 'react-native';
import { NavigationProp } from '@react-navigation/native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';

import BottomNavigation from '../components/BottomNavigation';

interface UpcomingTestsScreenProps {
  navigation: NavigationProp<any>;
}

const { width, height } = Dimensions.get('window');

// Brand configuration (matching MyContentScreen)
const BRAND = {
  name: "SUJHAV",
  subtitle: "Synchronize your Understanding, do Justice to your Hardwork and let others Admire your Victory!",
  primaryColor: '#00ff88',
  secondaryColor: '#000000',
  backgroundColor: '#0a1a0a',
  accentColor: '#1a2e1a',
};

const UpcomingTestsScreen: React.FC<UpcomingTestsScreenProps> = ({ navigation }) => {
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-20)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentScale = useRef(new Animated.Value(0.8)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;
  const iconRotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    startEntranceAnimation();
    startPulseAnimation();
    startIconRotation();
  }, []);

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

  const startIconRotation = () => {
    const rotate = () => {
      iconRotate.setValue(0);
      Animated.timing(iconRotate, {
        toValue: 1,
        duration: 4000,
        useNativeDriver: true,
      }).start(() => rotate());
    };
    rotate();
  };

  const rotateInterpolate = iconRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

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
          <Text style={styles.brandTitle}>Upcoming Tests</Text>
        </View>
      </Animated.View>

      {/* Content Container */}
      <View style={styles.contentContainer}>
        <Animated.View
          style={[
            styles.developmentContainer,
            {
              opacity: contentOpacity,
              transform: [
                { scale: Animated.multiply(contentScale, pulseScale) }
              ],
            },
          ]}
        >
          {/* Main Icon with Animation */}
          <Animated.View
            style={[
              styles.iconContainer,
              {
                transform: [{ rotate: rotateInterpolate }],
              },
            ]}
          >
            <Animated.View
              style={[
                { opacity: Animated.multiply(glowOpacity, 0.3) }
              ]}
            />
            <FontAwesome5 name="tools" size={80} color={BRAND.primaryColor} />
          </Animated.View>

          {/* Development Message */}
          <Animated.View
            style={[
              styles.messageContainer,
              { opacity: fadeAnim }
            ]}
          >
            <Text style={styles.developmentTitle}>Under Development</Text>
            <Text style={styles.developmentSubtitle}>
              We're working hard to bring you an amazing test experience!
            </Text>
            <Text style={styles.developmentDescription}>
              The Upcoming Tests feature will allow you to:
            </Text>
          </Animated.View>

          {/* Features List */}
          <Animated.View
            style={[
              styles.featuresList,
              { opacity: fadeAnim }
            ]}
          >
            <View style={styles.featureItem}>
              <MaterialIcons name="quiz" size={24} color={BRAND.primaryColor} />
              <Text style={styles.featureText}>View upcoming test schedules</Text>
            </View>
            
            <View style={styles.featureItem}>
              <MaterialIcons name="notifications" size={24} color={BRAND.primaryColor} />
              <Text style={styles.featureText}>Get test reminders</Text>
            </View>
            
            <View style={styles.featureItem}>
              <MaterialIcons name="analytics" size={24} color={BRAND.primaryColor} />
              <Text style={styles.featureText}>Track your test performance</Text>
            </View>
            
            <View style={styles.featureItem}>
              <MaterialIcons name="workspace-premium" size={24} color={BRAND.primaryColor} />
              <Text style={styles.featureText}>Access practice tests</Text>
            </View>
          </Animated.View>

          {/* Status Message */}
          <Animated.View
            style={[
              styles.statusContainer,
              { opacity: fadeAnim }
            ]}
          >
            <MaterialIcons name="schedule" size={20} color="#888" />
            <Text style={styles.statusText}>Coming Soon...</Text>
          </Animated.View>
        </Animated.View>
      </View>

      {/* Bottom Navigation */}
      <BottomNavigation navigation={navigation} activeTab="tests" />
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  developmentContainer: {
    alignItems: 'center',
    maxWidth: 350,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 40,
  },
  iconGlow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: BRAND.primaryColor,
    top: -40,
    left: -40,
  },
  messageContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  developmentTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 15,
  },
  developmentSubtitle: {
    fontSize: 18,
    color: BRAND.primaryColor,
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '500',
  },
  developmentDescription: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 22,
  },
  featuresList: {
    alignSelf: 'stretch',
    marginBottom: 40,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#0f1f0f',
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1a2e1a',
  },
  featureText: {
    fontSize: 16,
    color: '#fff',
    marginLeft: 15,
    flex: 1,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a2e1a',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#2a3e2a',
  },
  statusText: {
    fontSize: 16,
    color: '#888',
    marginLeft: 10,
    fontWeight: '500',
  },
});

export default UpcomingTestsScreen;