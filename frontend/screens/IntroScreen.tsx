import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  StatusBar,
  SafeAreaView,
  Image,
} from 'react-native';
import { NavigationProp } from '@react-navigation/native';

interface IntroScreenProps {
  navigation: NavigationProp<any>;
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
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  }
};

// Features data
const features = [
  {
    id: '1',
    title: 'Expert Tutoring',
    description: 'Learn from experienced educators passionate about your success',
    icon: '🎓',
  },
  {
    id: '2',
    title: 'Personalized Learning',
    description: 'Customized paths tailored to your unique goals',
    icon: '🎯',
  },
  {
    id: '3',
    title: 'Progress Tracking',
    description: 'Monitor growth with detailed analytics',
    icon: '📊',
  },
  {
    id: '4',
    title: '24/7 Support',
    description: 'Round-the-clock assistance whenever needed',
    icon: '💬',
  },
];

const IntroScreen: React.FC<IntroScreenProps> = ({ navigation }) => {
  // States
  const [showContent, setShowContent] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);

  // Animation refs
  const splashOpacity = useRef(new Animated.Value(1)).current;
  const splashScale = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(50)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleTranslateY = useRef(new Animated.Value(30)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;
  
  // Content animation refs
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const messageOpacity = useRef(new Animated.Value(0)).current;
  const featuresOpacity = useRef(new Animated.Value(0)).current;
  const buttonsOpacity = useRef(new Animated.Value(0)).current;

  // Handle splash screen animation
  useEffect(() => {
    checkUserToken();
    startSplashAnimation();
  }, []);

  const checkUserToken = async () => {
    try {
      // TODO: Add your token checking logic here
      // For demo purposes, set this to false to show intro screen
      // If token exists, set to true
      
      // Example token check:
      // const token = await AsyncStorage.getItem('userToken');
      // setIsUserLoggedIn(!!token);
      
      console.log('Checking user token...');
      // Simulate token check
      // setIsUserLoggedIn(true); // Uncomment this line to test auto-redirect
    } catch (error) {
      console.error('Error checking user token:', error);
    }
  };

  const startSplashAnimation = () => {
    // Logo animation sequence
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setTimeout(() => {
          Animated.timing(glowOpacity, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }).start();
          
          // Start pulse animation
          const startPulse = () => {
            Animated.sequence([
              Animated.timing(pulseScale, {
                toValue: 1.08,
                duration: 1200,
                useNativeDriver: true,
              }),
              Animated.timing(pulseScale, {
                toValue: 1,
                duration: 1200,
                useNativeDriver: true,
              }),
            ]).start(() => {
              if (showSplash) startPulse();
            });
          };
          startPulse();
        }, 300);
      });
    }, 500);

    // Title animation
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(titleTranslateY, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start();
    }, 1400);

    // Subtitle animation
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(subtitleOpacity, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(subtitleTranslateY, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start();
    }, 2000);

    // Transition to main content or home screen
    setTimeout(() => {
      if (isUserLoggedIn) {
        // If user is logged in, redirect directly to home
        navigation.navigate('Home');
      } else {
        // Show intro content
        Animated.parallel([
          Animated.timing(splashOpacity, {
            toValue: 0,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(splashScale, {
            toValue: 1.1,
            duration: 1200,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setShowSplash(false);
          startContentAnimation();
        });
      }
    }, 4000);
  };

  const startContentAnimation = () => {
    // Staggered content animations
    const animations = [
      { ref: contentOpacity, delay: 0 },
      { ref: headerOpacity, delay: 200 },
      { ref: messageOpacity, delay: 400 },
      { ref: featuresOpacity, delay: 600 },
      { ref: buttonsOpacity, delay: 800 },
    ];

    animations.forEach(({ ref, delay }) => {
      setTimeout(() => {
        Animated.timing(ref, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }).start();
      }, delay);
    });
  };

  // Handle navigation actions
  const handleGetStarted = () => {
    navigation.navigate('Home');
  };

  const handleLearnMore = () => {
    console.log('Learn More pressed');
  };

  // Render feature item
  const renderFeatureItem = (feature: typeof features[0], index: number) => {
    return (
      <View key={feature.id} style={styles.featureCard}>
        <View style={styles.featureIconContainer}>
          <Text style={styles.featureIcon}>{feature.icon}</Text>
          <Animated.View
            style={[
              styles.featureIconGlow,
              { opacity: Animated.multiply(glowOpacity, 0.6) }
            ]}
          />
        </View>
        <View style={styles.featureContent}>
          <Text style={styles.featureTitle}>{feature.title}</Text>
          <Text style={styles.featureDescription}>{feature.description}</Text>
        </View>
      </View>
    );
  };

  // Premium styled text renderer for SUJHAV acronym

  // Render splash screen
  if (showSplash) {
    return (
      <View style={styles.splashContainer}>
        <StatusBar hidden />
        <Animated.View
          style={[
            styles.splashContent,
            {
              opacity: splashOpacity,
              transform: [{ scale: splashScale }],
            },
          ]}
        >
          {/* Animated Background Elements */}
          <View style={styles.backgroundElements}>
            <Animated.View 
              style={[
                styles.glowCircle,
                styles.glowCircle1,
                { opacity: Animated.multiply(glowOpacity, 0.15) }
              ]} 
            />
            <Animated.View 
              style={[
                styles.glowCircle,
                styles.glowCircle2,
                { opacity: Animated.multiply(glowOpacity, 0.12) }
              ]} 
            />
            <Animated.View 
              style={[
                styles.glowCircle,
                styles.glowCircle3,
                { opacity: Animated.multiply(glowOpacity, 0.10) }
              ]} 
            />
          </View>

          {/* Logo Container */}
          <Animated.View
            style={[
              styles.logoContainer,
              {
                transform: [
                  { scale: Animated.multiply(logoScale, pulseScale) }
                ],
                opacity: logoOpacity,
              }
            ]}
          >
            {/* Glow effect behind logo */}
            <Animated.View
              style={[
                styles.logoGlow,
                { opacity: Animated.multiply(glowOpacity, 0.5) }
              ]}
            />
            
            {/* Logo */}
            <View style={styles.logoPlaceholder}>
              <Image
                source={require('../assets/images/logo-sujhav.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
          </Animated.View>

          {/* Premium Acronym Title */}
          <Animated.View
            style={[
              styles.titleContainer,
              {
                opacity: titleOpacity,
                transform: [{ translateY: titleTranslateY }],
              }
            ]}
          >
          </Animated.View>

          {/* Subtitle - Hidden as requested */}
          <Animated.View
            style={[
              styles.subtitleContainer,
              {
                opacity: subtitleOpacity,
                transform: [{ translateY: subtitleTranslateY }],
              }
            ]}
          >
          </Animated.View>
        </Animated.View>
      </View>
    );
  }

  // Don't render features section if user is logged in
  if (isUserLoggedIn) {
    return null; // Component will redirect to home
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
        <Animated.View 
          style={[
            styles.glowCircle,
            styles.glowCircle3,
            { opacity: Animated.multiply(glowOpacity, 0.04) }
          ]} 
        />
      </View>

      <Animated.View
        style={[
          styles.mainContent,
          { opacity: contentOpacity }
        ]}
      >
        {/* Header Section */}
        <Animated.View style={[styles.headerSection, { opacity: headerOpacity }]}>
          {/* Logo Container */}
          <View style={styles.headerLogoContainer}>
            <Animated.View
              style={[
                styles.headerLogoGlow,
                { opacity: Animated.multiply(glowOpacity, 0.4) }
              ]}
            />
            <View style={styles.headerLogoPlaceholder}>
              <Image
                source={require('../assets/images/logo-sujhav.png')}
                style={styles.headerLogoImage}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* Welcome Text */}
          <View style={styles.welcomeTextContainer}>
            <Text style={styles.welcomeText}>Welcome to</Text>
            <Text style={styles.brandTitle}>{BRAND.name}</Text>
            <View style={styles.titleUnderline} />
          </View>
        </Animated.View>

        {/* Main Message Section */}
        <Animated.View style={[styles.messageSection, { opacity: messageOpacity }]}>
          <Text style={styles.mainMessage}>
            Your Gateway to{'\n'}
            <Text style={styles.highlightText}>Educational Excellence</Text>
          </Text>
          
          <Text style={styles.subMessage}>
            {BRAND.subtitle}
          </Text>
        </Animated.View>

        {/* Features Section - Only show if user is not logged in */}
        {!isUserLoggedIn && (
          <Animated.View style={[styles.featuresSection, { opacity: featuresOpacity }]}>
            <Text style={styles.sectionTitle}>Why Choose SUJHAV?</Text>
            <View style={styles.featuresGrid}>
              {features.map((feature, index) => renderFeatureItem(feature, index))}
            </View>
          </Animated.View>
        )}

        {/* Action Buttons Section */}
        <Animated.View style={[styles.actionSection, { opacity: buttonsOpacity }]}>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: BRAND.primaryColor }]}
            onPress={handleGetStarted}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Get Started Now</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: BRAND.primaryColor }]}
            onPress={handleLearnMore}
            activeOpacity={0.8}
          >
            <Text style={[styles.secondaryButtonText, { color: BRAND.primaryColor }]}>
              Learn More
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND.backgroundColor,
  },
  
  // Splash Screen Styles
  splashContainer: {
    flex: 1,
    backgroundColor: '#000000',
    position: 'relative',
  },
  splashContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    zIndex: 10,
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
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 50,
    position: 'relative',
  },
  logoGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(0, 255, 136, 0.3)',
  },
  logoPlaceholder: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    zIndex: 2,
  },
  logoImage: {
    width: 160,
    height: 160,
    borderRadius: 0,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 25,
  },
  
  // Premium Acronym Styles
  acronymContainer: {
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  acronymLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 5,
  },
  acronymLetter: {
    fontSize: 32,
    fontWeight: '900',
    color: '#00ff88',
    marginRight: 12,
    letterSpacing: 2,
    textShadowColor: '#00ff88',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
    shadowColor: '#00ff88',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  acronymWord: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
    letterSpacing: 1,
    textShadowColor: 'rgba(255, 255, 255, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    flex: 1,
  },

  splashTitle: {
    fontSize: 42,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 10,
    textAlign: 'center',
    textShadowColor: '#00ff88',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  titleUnderline: {
    width: 120,
    height: 5,
    backgroundColor: '#00ff88',
    marginTop: 12,
    borderRadius: 2.5,
  },
  subtitleContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  splashSubtitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#00ff88',
    textAlign: 'center',
    letterSpacing: 2.5,
  },

  // Main Content Styles
  mainContent: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    paddingTop: 15,
    paddingBottom: 25,
  },

  // Header Section
  headerSection: {
    alignItems: 'center',
    marginBottom: 15,
  },
  headerLogoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  headerLogoGlow: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(0, 255, 136, 0.3)',
  },
  headerLogoPlaceholder: {
    width: 85,
    height: 85,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    zIndex: 2,
  },
  headerLogoImage: {
    width: 85,
    height: 85,
    borderRadius: 0,
  },
  welcomeTextContainer: {
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 14,
    fontWeight: '300',
    color: '#888888',
    letterSpacing: 1.5,
    marginBottom: 6,
    textAlign: 'center',
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 4,
    textAlign: 'center',
    textShadowColor: BRAND.primaryColor,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  brandTagline: {
    fontSize: 12,
    fontWeight: '500',
    color: BRAND.primaryColor,
    letterSpacing: 1,
    textAlign: 'center',
  },

  // Message Section
  messageSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  mainMessage: {
    fontSize: 22,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 30,
    marginBottom: 15,
    letterSpacing: 0.5,
  },
  highlightText: {
    color: BRAND.primaryColor,
    fontWeight: '700',
    textShadowColor: BRAND.primaryColor,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  subMessage: {
    fontSize: 14,
    fontWeight: '400',
    color: '#aaaaaa',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 5,
    letterSpacing: 0.3,
    fontStyle: 'italic',
  },

  // Features Section
  featuresSection: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 18,
    letterSpacing: 0.5,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  featureCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.25)',
    width: (width - 52) / 2,
    alignItems: 'center',
    shadowColor: BRAND.primaryColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  featureIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0, 255, 136, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  featureIcon: {
    fontSize: 16,
    zIndex: 2,
  },
  featureIconGlow: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0, 255, 136, 0.2)',
    zIndex: 1,
  },
  featureContent: {
    alignItems: 'center',
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: 10,
    fontWeight: '400',
    color: '#cccccc',
    lineHeight: 14,
    letterSpacing: 0.2,
    textAlign: 'center',
  },

  // Action Section
  actionSection: {
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 35,
    borderRadius: 12,
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
    shadowColor: BRAND.primaryColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 10,
  },
  primaryButtonText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 35,
    borderRadius: 12,
    borderWidth: 2,
    width: '100%',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // Bottom Elements
  bottomAccent: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  accentLine: {
    width: '50%',
    height: 2,
    borderRadius: 1,
    opacity: 0.6,
  },
});

export default IntroScreen;