import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  TouchableOpacity,
  Modal,
  Image,
  BackHandler,
} from 'react-native';
import { NavigationProp } from '@react-navigation/native';

interface SignupLoginBannerProps {
  navigation: NavigationProp<any>;
  onClose: () => void;
  visible?: boolean;
}

const { width, height } = Dimensions.get('window');

// Brand configuration (matching theme)
const BRAND = {
  name: "SUJHAV",
  subtitle: "Synchronize your Understanding, do Justice to your Hardwork and let others Admire your Victory!",
  primaryColor: '#00ff88',
  secondaryColor: '#000000',
  backgroundColor: '#0a1a0a',
  accentColor: '#1a2e1a',
};

const SignupLoginBanner: React.FC<SignupLoginBannerProps> = ({ 
  navigation, 
  onClose, 
  visible = true 
}) => {
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(height)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const buttonsOpacity = useRef(new Animated.Value(0)).current;
  const buttonsTranslateY = useRef(new Animated.Value(30)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;

  // Handle entrance animations
  useEffect(() => {
    if (visible) {
      startEntranceAnimation();
      startPulseAnimation();
    }
  }, [visible]);

  // Handle back button on Android
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (visible) {
        handleClose();
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [visible]);

  const startEntranceAnimation = () => {
    // Background and modal entrance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Glow effect
    setTimeout(() => {
      Animated.timing(glowOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }, 200);

    // Logo animation
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }, 400);

    // Buttons animation
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(buttonsOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(buttonsTranslateY, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }, 600);
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

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const handleSignup = () => {
    handleClose();
    // Navigate to signup screen
    setTimeout(() => {
      navigation.navigate('SignUp');
    }, 350);
  };

  const handleLogin = () => {
    handleClose();
    // Navigate to login screen
    setTimeout(() => {
      navigation.navigate('SignIn');
    }, 350);
  };

  if (!visible) return null;

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="none"
      statusBarTranslucent={true}
    >
      {/* Backdrop */}
      <Animated.View
        style={[
          styles.backdrop,
          { opacity: fadeAnim }
        ]}
      >
        <TouchableOpacity
          style={styles.backdropTouchable}
          activeOpacity={1}
          onPress={handleClose}
        />
      </Animated.View>

      {/* Banner Container */}
      <Animated.View
        style={[
          styles.bannerContainer,
          {
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim }
            ],
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
              { opacity: Animated.multiply(glowOpacity, 0.1) }
            ]} 
          />
        </View>

        {/* Close Button */}
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>

        {/* Content */}
        <View style={styles.content}>
          {/* Logo Section */}
          <Animated.View
            style={[
              styles.logoSection,
              {
                opacity: logoOpacity,
                transform: [
                  { scale: Animated.multiply(logoScale, pulseScale) }
                ],
              },
            ]}
          >
            <Animated.View
              style={[
                styles.logoGlow,
                { opacity: Animated.multiply(glowOpacity, 0.6) }
              ]}
            />
            <Image
              source={require('../assets/images/logo-sujhav.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </Animated.View>

          {/* Welcome Text */}
          <Animated.View
            style={[
              styles.textSection,
              {
                opacity: logoOpacity,
              },
            ]}
          >
            <Text style={styles.welcomeTitle}>Welcome to {BRAND.name}</Text>
            <Text style={styles.welcomeSubtitle}>
              {BRAND.subtitle}
            </Text>
            <Text style={styles.callToAction}>
              Join thousands of learners on their journey to excellence
            </Text>
          </Animated.View>

          {/* Action Buttons */}
          <Animated.View
            style={[
              styles.buttonSection,
              {
                opacity: buttonsOpacity,
                transform: [{ translateY: buttonsTranslateY }],
              },
            ]}
          >
            {/* Sign Up Button */}
            <TouchableOpacity
              style={styles.signupButton}
              onPress={handleSignup}
              activeOpacity={0.8}
            >
              <Animated.View
                style={[
                  styles.buttonGlow,
                  { opacity: Animated.multiply(glowOpacity, 0.8) }
                ]}
              />
              <Text style={styles.signupButtonText}>Create Account</Text>
              <Text style={styles.signupButtonSubtext}>Start learning today</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
              activeOpacity={0.8}
            >
              <Text style={styles.loginButtonText}>Sign In</Text>
              <Text style={styles.loginButtonSubtext}>Welcome back</Text>
            </TouchableOpacity>

            {/* Additional Options */}
            <View style={styles.additionalOptions}>
              <TouchableOpacity style={styles.guestOption}>
                <Text style={styles.guestOptionText}>Continue as Guest</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  backdropTouchable: {
    flex: 1,
  },
  bannerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: BRAND.backgroundColor,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingBottom: 40,
    minHeight: height * 0.75,
    maxHeight: height * 0.9,
    borderTopWidth: 2,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.3)',
    elevation: 20,
    shadowColor: BRAND.primaryColor,
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  backgroundElements: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    overflow: 'hidden',
  },
  glowCircle: {
    position: 'absolute',
    borderRadius: 200,
    backgroundColor: 'rgba(0, 255, 136, 0.2)',
  },
  glowCircle1: {
    width: 300,
    height: 300,
    top: -100,
    right: -100,
  },
  glowCircle2: {
    width: 200,
    height: 200,
    bottom: 50,
    left: -50,
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 70,
    justifyContent: 'space-evenly',
  },
  logoSection: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 140,
    position: 'relative',
  },
  logoGlow: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0, 255, 136, 0.3)',
    top: '50%',
    left: '50%',
    marginTop: -50,
    marginLeft: -50,
  },
  logoImage: {
    width: 70,
    height: 70,
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -35,
    marginLeft: -35,
    zIndex: 2,
  },
  textSection: {
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 25,
  },
  welcomeTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 18,
    letterSpacing: 1,
    textShadowColor: BRAND.primaryColor,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#cccccc',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 22,
    fontStyle: 'italic',
    opacity: 0.9,
  },
  callToAction: {
    fontSize: 16,
    color: BRAND.primaryColor,
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 22,
  },
  buttonSection: {
    paddingHorizontal: 5,
    paddingBottom: 10,
  },
  signupButton: {
    backgroundColor: BRAND.primaryColor,
    borderRadius: 15,
    paddingVertical: 18,
    paddingHorizontal: 25,
    marginBottom: 16,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    elevation: 5,
    shadowColor: BRAND.primaryColor,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  buttonGlow: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    backgroundColor: 'rgba(0, 255, 136, 0.3)',
    borderRadius: 20,
  },
  signupButtonText: {
    color: BRAND.backgroundColor,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
    zIndex: 2,
  },
  signupButtonSubtext: {
    color: BRAND.backgroundColor,
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.8,
    zIndex: 2,
  },
  loginButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 15,
    paddingVertical: 18,
    paddingHorizontal: 25,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0, 255, 136, 0.4)',
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  loginButtonSubtext: {
    color: '#cccccc',
    fontSize: 12,
    fontWeight: '400',
    opacity: 0.8,
  },
  additionalOptions: {
    alignItems: 'center',
    marginTop: 12,
  },
  guestOption: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  guestOptionText: {
    color: '#aaaaaa',
    fontSize: 14,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});

export default SignupLoginBanner;