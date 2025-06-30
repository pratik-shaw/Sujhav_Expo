import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  StatusBar,
  Image,
} from 'react-native';

interface SplashScreenProps {
  onSplashComplete: () => void;
  duration?: number; // Duration in milliseconds (default: 4000)
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

const SplashScreen: React.FC<SplashScreenProps> = ({ 
  onSplashComplete, 
  duration = 4000 
}) => {
  // Animation refs
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(50)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleTranslateY = useRef(new Animated.Value(30)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;
  const splashOpacity = useRef(new Animated.Value(1)).current;
  const splashScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    startSplashAnimation();
  }, []);

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
              startPulse(); // Continue pulsing
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

    // Exit animation and callback
    setTimeout(() => {
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
        onSplashComplete();
      });
    }, duration);
  };

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
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Splash Screen Styles
  splashContainer: {
    flex: 1,
    backgroundColor: '#000000',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
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
});

export default SplashScreen;