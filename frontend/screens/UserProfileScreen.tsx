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
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { NavigationProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BottomNavigation from '../components/BottomNavigation';
import SignupLoginBanner from '../components/SignupLoginBanner';

interface UserProfileScreenProps {
  navigation: NavigationProp<any>;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  joinedDate: string;
  totalCourses: number;
  completedCourses: number;
  achievements: number;
}

const { width, height } = Dimensions.get('window');

// Brand configuration (matching HomeScreen)
const BRAND = {
  name: "SUJHAV",
  subtitle: "Synchronize your Understanding, do Justice to your Hardwork and let others Admire your Victory!",
  primaryColor: '#00ff88',
  secondaryColor: '#000000',
  backgroundColor: '#0a1a0a',
  accentColor: '#1a2e1a',
};

const UserProfileScreen: React.FC<UserProfileScreenProps> = ({ navigation }) => {
  // State
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-20)).current;
  const profileOpacity = useRef(new Animated.Value(0)).current;
  const profileScale = useRef(new Animated.Value(0.8)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;
  const buttonScale = useRef(new Animated.Value(0.8)).current;

  // Check authentication status
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Handle entrance animations
  useEffect(() => {
    if (isLoggedIn !== null) {
      startEntranceAnimation();
      startPulseAnimation();
    }
  }, [isLoggedIn]);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const userDataString = await AsyncStorage.getItem('userData');
      
      if (token && userDataString) {
        const user = JSON.parse(userDataString);
        setUserData(user);
        setIsLoggedIn(true);
      } else {
        setIsLoggedIn(false);
        setShowBanner(true);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsLoggedIn(false);
      setShowBanner(true);
    }
  };

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

    // Profile animation
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(profileOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(profileScale, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }, 600);

    // Content fade in
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(buttonScale, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start();
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

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('userData');
      setIsLoggedIn(false);
      setUserData(null);
      setShowBanner(true);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const handleBannerClose = () => {
    setShowBanner(false);
  };

  const handleSignInPress = () => {
    // Navigate to login screen or show login modal
    navigation.navigate('SignIn'); // Adjust navigation route as needed
  };

  const renderAuthenticatedProfile = () => (
    <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <Animated.View
        style={[
          styles.profileHeader,
          {
            opacity: profileOpacity,
            transform: [
              { scale: Animated.multiply(profileScale, pulseScale) }
            ],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.avatarGlow,
            { opacity: Animated.multiply(glowOpacity, 0.6) }
          ]}
        />
        
        <View style={styles.avatarContainer}>
          {userData?.avatar ? (
            <Image source={{ uri: userData.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.defaultAvatar}>
              <Text style={styles.avatarText}>
                {userData?.name?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
          )}
        </View>
        
        <Text style={styles.userName}>{userData?.name || 'User'}</Text>
        <Text style={styles.userEmail}>{userData?.email || 'user@example.com'}</Text>
        <Text style={styles.joinedDate}>
          Joined {userData?.joinedDate || 'Recently'}
        </Text>
      </Animated.View>

      {/* Stats Section */}
      <Animated.View
        style={[
          styles.statsContainer,
          { opacity: fadeAnim }
        ]}
      >
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{userData?.totalCourses || 0}</Text>
            <Text style={styles.statLabel}>Total Courses</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{userData?.completedCourses || 0}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{userData?.achievements || 0}</Text>
            <Text style={styles.statLabel}>Achievements</Text>
          </View>
        </View>
      </Animated.View>

      {/* Profile Options */}
      <Animated.View
        style={[
          styles.optionsContainer,
          { opacity: fadeAnim }
        ]}
      >
        <TouchableOpacity style={styles.optionItem}>
          <Text style={styles.optionText}>Edit Profile</Text>
          <Text style={styles.optionArrow}>›</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.optionItem}>
          <Text style={styles.optionText}>Settings</Text>
          <Text style={styles.optionArrow}>›</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.optionItem}>
          <Text style={styles.optionText}>Notifications</Text>
          <Text style={styles.optionArrow}>›</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.optionItem}>
          <Text style={styles.optionText}>Help & Support</Text>
          <Text style={styles.optionArrow}>›</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.optionItem, styles.logoutOption]}
          onPress={handleLogout}
        >
          <Text style={[styles.optionText, styles.logoutText]}>Logout</Text>
          <Text style={[styles.optionArrow, styles.logoutText]}>›</Text>
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );

  const renderUnauthenticatedProfile = () => (
    <View style={styles.unauthenticatedContainer}>
      <Animated.View
        style={[
          styles.welcomeSection,
          {
            opacity: profileOpacity,
            transform: [{ translateY: Animated.multiply(profileScale, 20) }],
          },
        ]}
      >
        {/* Logo */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              transform: [
                { scale: Animated.multiply(profileScale, pulseScale) }
              ],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.logoGlow,
              { opacity: Animated.multiply(glowOpacity, 0.5) }
            ]}
          />
          <Image
            source={require('../assets/images/logo-sujhav.png')}
            style={styles.headerLogoImage}
            resizeMode="contain"
          />
        </Animated.View>

        <Text style={styles.welcomeTitle}>Welcome to {BRAND.name}</Text>
        <Text style={styles.welcomeSubtitle}>
          Sign in to access your personalized learning dashboard
        </Text>
      </Animated.View>

      {/* Sign In Button */}
      <Animated.View
        style={[
          styles.signInButtonContainer,
          { 
            opacity: fadeAnim,
            transform: [{ scale: buttonScale }]
          }
        ]}
      >
        <TouchableOpacity 
          style={styles.signInButton}
          onPress={handleSignInPress}
          activeOpacity={0.8}
        >
          <Text style={styles.signInButtonText}>Sign in to continue</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );

  if (isLoggedIn === null) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={BRAND.backgroundColor} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
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
        <Text style={styles.brandTitle}>
          {isLoggedIn ? 'Profile' : 'Join ' + BRAND.name}
        </Text>
      </Animated.View>

      {/* Content Container */}
      <View style={styles.contentContainer}>
        {isLoggedIn ? renderAuthenticatedProfile() : renderUnauthenticatedProfile()}
      </View>

      {/* Signup/Login Banner */}
      {showBanner && !isLoggedIn && (
        <SignupLoginBanner 
          navigation={navigation}
          onClose={handleBannerClose}
        />
      )}

      {/* Bottom Navigation */}
      <BottomNavigation navigation={navigation} activeTab="profile" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND.backgroundColor,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
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
  glowCircle3: {
    width: 200,
    height: 200,
    top: height * 0.4,
    left: width * 0.8 - 100,
  },

  // Header Section
  headerSection: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(10, 26, 10, 0.95)',
    zIndex: 10,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 1,
    textAlign: 'center',
    textShadowColor: BRAND.primaryColor,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },

  // Content Container
  contentContainer: {
    flex: 1,
    paddingBottom: 90,
  },
  scrollContainer: {
    flex: 1,
  },

  // Authenticated Profile Styles
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    position: 'relative',
  },
  avatarGlow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(0, 255, 136, 0.3)',
    top: 40,
  },
  avatarContainer: {
    marginBottom: 20,
    zIndex: 2,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: BRAND.primaryColor,
  },
  defaultAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: BRAND.accentColor,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: BRAND.primaryColor,
  },
  avatarText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: BRAND.primaryColor,
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  userEmail: {
    fontSize: 16,
    color: '#cccccc',
    marginBottom: 8,
  },
  joinedDate: {
    fontSize: 14,
    color: '#aaaaaa',
    fontStyle: 'italic',
  },

  // Stats Section
  statsContainer: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  statsGrid: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.2)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: BRAND.primaryColor,
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#cccccc',
    textAlign: 'center',
  },

  // Options Section
  optionsContainer: {
    paddingHorizontal: 20,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 10,
    padding: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  optionText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
  },
  optionArrow: {
    fontSize: 20,
    color: '#cccccc',
    fontWeight: '300',
  },
  logoutOption: {
    borderColor: 'rgba(255, 100, 100, 0.3)',
    marginTop: 20,
  },
  logoutText: {
    color: '#ff6464',
  },

  // Unauthenticated Profile Styles
  unauthenticatedContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    position: 'relative',
  },
  logoGlow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(0, 255, 136, 0.3)',
  },
  headerLogoImage: {
    width: 100,
    height: 100,
    borderRadius: 0,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 15,
    letterSpacing: 0.5,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#cccccc',
    textAlign: 'center',
    opacity: 0.8,
    lineHeight: 24,
  },

  // Sign In Button
  signInButtonContainer: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  signInButton: {
    backgroundColor: BRAND.primaryColor,
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 25,
    minWidth: 200,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BRAND.primaryColor,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  signInButtonText: {
    color: BRAND.backgroundColor,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default UserProfileScreen;