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
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { NavigationProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import axios from 'axios';
import { Feather, FontAwesome5, Ionicons, MaterialIcons } from '@expo/vector-icons';

import { API_BASE_URL, API_TIMEOUT } from '../config/api';
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
  role: string;
  phone?: string;
  bio?: string;
  lastActive?: string;
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

// Simplified API Configuration - removed unnecessary endpoints
const API_CONFIG = {
  baseURL: API_BASE_URL || 'http://localhost:3000/api',
  timeout: API_TIMEOUT || 15000,
  endpoints: {
    currentUser: '/auth/me',
  }
};

// Create an axios instance with timeout configuration
const apiClient = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
});

// Add request interceptor to include auth token
apiClient.interceptors.request.use(
  async (config) => {
    // Updated to use 'userToken' instead of 'authToken' to match SignIn screen
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle token expiration
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - Updated keys to match SignIn screen
      await AsyncStorage.multiRemove(['userToken', 'userRole', 'userId', 'userName', 'userData']);
      // Don't navigate here, let the component handle it
    }
    return Promise.reject(error);
  }
);

const UserProfileScreen: React.FC<UserProfileScreenProps> = ({ navigation }) => {
  // State
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-20)).current;
  const profileOpacity = useRef(new Animated.Value(0)).current;
  const profileScale = useRef(new Animated.Value(0.8)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;
  const buttonScale = useRef(new Animated.Value(0.8)).current;

  // Check network connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected ?? false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Check authentication status and load user data
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

  // Auto-refresh data when screen is focused
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (isLoggedIn) {
        refreshUserData();
      }
    });

    return unsubscribe;
  }, [navigation, isLoggedIn]);

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      console.log('Checking auth status...');
      
      // Updated to use storage keys from SignIn screen
      const token = await AsyncStorage.getItem('userToken');
      const userRole = await AsyncStorage.getItem('userRole');
      const userId = await AsyncStorage.getItem('userId');
      const userName = await AsyncStorage.getItem('userName');
      
      console.log('Auth data found:', { 
        hasToken: !!token, 
        userRole, 
        userId, 
        userName 
      });
      
      if (token && userId && userName) {
        // Create basic user data from stored values
        const basicUserData: UserData = {
          id: userId,
          name: userName,
          email: '', // Will be fetched from API
          role: userRole || 'user',
          joinedDate: 'Recently',
          totalCourses: 0,
          completedCourses: 0,
          achievements: 0,
        };
        
        setUserData(basicUserData);
        setIsLoggedIn(true);
        
        // Fetch fresh data from API
        await fetchUserProfile();
      } else {
        console.log('No auth data found, user not logged in');
        setIsLoggedIn(false);
        setShowBanner(true);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsLoggedIn(false);
      setShowBanner(true);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserProfile = async () => {
    try {
      console.log('Fetching user profile from API...');
      const response = await apiClient.get(API_CONFIG.endpoints.currentUser);
      
      console.log('API Response:', response.data);
      
      if (response.data && response.data.user) {
        const apiUser = response.data.user;
        const updatedUser: UserData = {
          id: apiUser.id,
          name: apiUser.name,
          email: apiUser.email,
          avatar: apiUser.avatar,
          role: apiUser.role,
          phone: apiUser.phone,
          bio: apiUser.bio,
          joinedDate: apiUser.joinedDate || 
            (apiUser.createdAt ? new Date(apiUser.createdAt).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long' 
            }) : 'Recently'),
          totalCourses: apiUser.totalCourses || 0,
          completedCourses: apiUser.completedCourses || 0,
          achievements: apiUser.achievements || 0,
          lastActive: new Date().toISOString(),
        };

        console.log('Updated user data:', updatedUser);
        
        // Store updated user data
        await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
        setUserData(updatedUser);
        setLastSyncTime(new Date().toLocaleTimeString());
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      await handleAuthError(error);
    }
  };

  const refreshUserData = async () => {
    if (!isConnected) {
      Alert.alert(
        "Offline",
        "You're currently offline. Connect to the internet to refresh your profile."
      );
      return;
    }

    setIsRefreshing(true);
    try {
      await fetchUserProfile();
    } catch (error) {
      console.error('Error refreshing user data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAuthError = async (error: any) => {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        // Token expired or invalid - Updated keys to match SignIn screen
        await AsyncStorage.multiRemove(['userToken', 'userRole', 'userId', 'userName', 'userData']);
        setIsLoggedIn(false);
        setUserData(null);
        setShowBanner(true);
        Alert.alert(
          "Session Expired",
          "Your session has expired. Please sign in again.",
          [{ text: "OK" }]
        );
        return;
      }
    }
    
    // Handle other errors
    if (!isConnected) {
      Alert.alert(
        "Network Error",
        "You appear to be offline. Please check your internet connection."
      );
      return;
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
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Sign Out", 
          style: "destructive",
          onPress: async () => {
            try {
              setIsLoading(true);
              
              // Clear local storage - Updated to match SignIn screen keys
              await AsyncStorage.multiRemove(['userToken', 'userRole', 'userId', 'userName', 'userData']);
              setIsLoggedIn(false);
              setUserData(null);
              setShowBanner(true);
              
              // Navigate to home or login screen
              navigation.reset({
                index: 0,
                routes: [{ name: 'Home' }],
              });
              
            } catch (error) {
              console.error('Error during logout:', error);
              Alert.alert("Error", "Failed to sign out. Please try again.");
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleEditProfile = () => {
    navigation.navigate('EditProfile', { userData });
  };

  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  const handleNotifications = () => {
    navigation.navigate('Notifications');
  };

  const handleHelpSupport = () => {
    navigation.navigate('HelpSupport');
  };

  const handleBannerClose = () => {
    setShowBanner(false);
  };

  const handleSignInPress = () => {
    navigation.navigate('SignIn');
  };

  const renderStatsCard = (
    title: string,
    value: number,
    icon: keyof typeof MaterialIcons.glyphMap,
    color: string
  ) => (
    <View style={[styles.statItem, { borderColor: color }]}>
      <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
        <MaterialIcons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.statNumber}>{value}</Text>
      <Text style={styles.statLabel}>{title}</Text>
    </View>
  );

  const renderAuthenticatedProfile = () => (
    <ScrollView 
      style={styles.scrollContainer} 
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={refreshUserData}
          colors={[BRAND.primaryColor]}
          tintColor={BRAND.primaryColor}
          title="Pull to refresh"
          titleColor={BRAND.primaryColor}
        />
      }
    >
      {/* Connection Status */}
      {!isConnected && (
        <View style={styles.statusIndicator}>
          <Ionicons name="cloud-offline" size={14} color="#ff6b6b" />
          <Text style={styles.statusText}>Offline</Text>
        </View>
      )}

      {/* Last Sync Time */}
      {lastSyncTime && (
        <Text style={styles.lastSyncText}>Last updated: {lastSyncTime}</Text>
      )}

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
        <Animated.View/>
        
        <TouchableOpacity style={styles.avatarContainer} onPress={handleEditProfile}>
          {userData?.avatar ? (
            <Image source={{ uri: userData.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.defaultAvatar}>
              <Text style={styles.avatarText}>
                {userData?.name?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
          )}
          <View style={styles.editAvatarBadge}>
            <Feather name="camera" size={10} color={BRAND.backgroundColor} />
          </View>
        </TouchableOpacity>
        
        <Text style={styles.userName}>{userData?.name || 'User'}</Text>
        <Text style={styles.userEmail}>{userData?.email || 'user@example.com'}</Text>
        <Text style={styles.joinedDate}>
          Joined {userData?.joinedDate || 'Recently'}
        </Text>
        {userData?.role && (
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{userData.role.toUpperCase()}</Text>
          </View>
        )}
      </Animated.View>

      {/* Stats Section */}
      <Animated.View style={[styles.statsContainer, { opacity: fadeAnim }]}>
        <Text style={styles.sectionTitle}>Your Progress</Text>
        <View style={styles.statsGrid}>
          {renderStatsCard("Courses", userData?.totalCourses || 0, "school", BRAND.primaryColor)}
          {renderStatsCard("Completed", userData?.completedCourses || 0, "check-circle", "#4CAF50")}
          {renderStatsCard("Achievements", userData?.achievements || 0, "emoji-events", "#FF9800")}
        </View>
      </Animated.View>

      {/* Profile Options */}
      <Animated.View style={[styles.optionsContainer, { opacity: fadeAnim }]}>
        <Text style={styles.sectionTitle}>Account</Text>
        
        <TouchableOpacity style={styles.optionItem} onPress={handleEditProfile}>
          <View style={styles.optionLeft}>
            <MaterialIcons name="edit" size={18} color={BRAND.primaryColor} />
            <Text style={styles.optionText}>    Edit Profile</Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color="#cccccc" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.optionItem} onPress={handleSettings}>
          <View style={styles.optionLeft}>
            <MaterialIcons name="settings" size={18} color={BRAND.primaryColor} />
            <Text style={styles.optionText}>    Settings</Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color="#cccccc" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.optionItem} onPress={handleNotifications}>
          <View style={styles.optionLeft}>
            <MaterialIcons name="notifications" size={18} color={BRAND.primaryColor} />
            <Text style={styles.optionText}>    Notifications</Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color="#cccccc" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.optionItem} onPress={handleHelpSupport}>
          <View style={styles.optionLeft}>
            <MaterialIcons name="help" size={18} color={BRAND.primaryColor} />
            <Text style={styles.optionText}>    Help & Support</Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color="#cccccc" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.optionItem, styles.logoutOption]}
          onPress={handleLogout}
          disabled={isLoading}
        >
          <View style={styles.optionLeft}>
            <MaterialIcons name="logout" size={18} color="#ff6b6b" />
            <Text style={[styles.optionText, styles.logoutText]}>
              {isLoading ? "Signing out..." : "Sign Out"}
            </Text>
          </View>
          {isLoading ? (
            <ActivityIndicator size="small" color="#ff6b6b" />
          ) : (
            <MaterialIcons name="chevron-right" size={20} color="#ff6b6b" />
          )}
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
          Sign in to access your personalized learning dashboard and track your progress
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
          <Animated.View
            style={[
              styles.buttonGlow,
              { opacity: Animated.multiply(glowOpacity, 0.6) }
            ]}
          />
          <Text style={styles.signInButtonText}>Sign in to continue</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );

  // Loading state
  if (isLoggedIn === null || isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={BRAND.backgroundColor} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BRAND.primaryColor} />
          <Text style={styles.loadingText}>Loading your profile...</Text>
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
        {isLoggedIn && !isConnected && (
          <View style={styles.connectionStatus}>
            <Ionicons name="cloud-offline" size={16} color="#ff6b6b" />
          </View>
        )}
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
   offlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  offlineText: {
    color: '#ff6b6b',
    fontSize: 12,
    marginLeft: 8,
    fontWeight: '500',
  },
  lastSyncText: {
    textAlign: 'center',
    color: '#aaaaaa',
    fontSize: 12,
    marginTop: 10,
    marginBottom: 5,
    fontStyle: 'italic',
  },
  connectionStatus: {
    position: 'absolute',
    right: 20,
    top: 20,
  },

  // Avatar edit badge
  editAvatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: BRAND.primaryColor,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: BRAND.backgroundColor,
  },

  // Role badge
  roleBadge: {
    backgroundColor: 'rgba(0, 255, 136, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: BRAND.primaryColor,
  },
  roleText: {
    color: BRAND.primaryColor,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },

  // Section titles
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 20,
    letterSpacing: 0.5,
  },

  // Enhanced stats
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  additionalStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  additionalStatItem: {
    alignItems: 'center',
  },
  additionalStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: BRAND.primaryColor,
    marginBottom: 4,
  },
  additionalStatLabel: {
    fontSize: 11,
    color: '#cccccc',
    textAlign: 'center',
  },

  // Option items
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Delete account option
  deleteOption: {
    borderColor: 'rgba(255, 68, 68, 0.3)',
    marginTop: 10,
  },
  deleteText: {
    color: '#ff4444',
  },

  // Button glow effect
  buttonGlow: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 25,
    backgroundColor: 'rgba(0, 255, 136, 0.3)',
  },

  // Additional missing styles that might be referenced
  optionIcon: {
    marginRight: 15,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  statusText: {
    color: '#ff6b6b',
    fontSize: 12,
    marginLeft: 8,
    fontWeight: '500',
  },
});

export default UserProfileScreen;