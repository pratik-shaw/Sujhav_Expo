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
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { NavigationProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import axios from 'axios';
import { Feather, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { API_BASE_URL, API_TIMEOUT } from '../config/api';

interface SignInScreenProps {
  navigation: NavigationProp<any>;
}

interface LoginResponse {
  message: string;
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
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

// API Configuration with timeout
const API_CONFIG = {
  baseURL: API_BASE_URL, // Replace with your actual backend URL
  timeout: 15000, // 15 seconds timeout
  endpoints: {
    login: '/auth/login',
    register: '/auth/register',
    currentUser: '/auth/current-user',
    forgotPassword: '/auth/forgot-password',
  }
};

// Create an axios instance with timeout configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
});

const SignInScreen: React.FC<SignInScreenProps> = ({ navigation }) => {
  // State for form inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Loading and network state
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  // Refs for input fields (for focus management)
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(30)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;
  const buttonScale = useRef(new Animated.Value(0.8)).current;

  // Check network connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: { isConnected: any; }) => {
      setIsConnected(state.isConnected ?? false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Handle entrance animations
  useEffect(() => {
    startEntranceAnimation();
    startPulseAnimation();
    checkAuthStatus(); // Check if user is already logged in
  }, []);

  const startEntranceAnimation = () => {
    // Background fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    // Glow effect
    setTimeout(() => {
      Animated.timing(glowOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    }, 200);

    // Logo animation
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }, 400);

    // Form animation
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(formOpacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(formTranslateY, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(buttonScale, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ]).start();
    }, 700);
  };

  const startPulseAnimation = () => {
    const pulse = () => {
      Animated.sequence([
        Animated.timing(pulseScale, {
          toValue: 1.03,
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

  // Form validation
  const isFormValid = () => {
    if (!email.trim() || !password.trim()) return false;
    if (!isEmailValid()) return false;
    return true;
  };

  // Email validation check
  const isEmailValid = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Show detailed error if API call fails
  const handleApiError = (error: any) => {
    console.error("Login error:", error);
    
    if (!isConnected) {
      Alert.alert(
        "Network Error", 
        "You appear to be offline. Please check your internet connection and try again."
      );
      return;
    }
    
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        Alert.alert(
          "Connection Timeout", 
          "The server took too long to respond. Please check your API URL and try again. Make sure your server is running at " + API_CONFIG.baseURL
        );
      } else if (error.response) {
        // Server responded with error status code
        const status = error.response.status;
        const errorMessage = error.response.data?.message || `Server error (${status}). Please try again.`;
        
        if (status === 401) {
          Alert.alert(
            "Invalid Credentials", 
            "The email or password you entered is incorrect. Please check your credentials and try again."
          );
        } else if (status === 404) {
          Alert.alert(
            "Account Not Found", 
            "No account found with this email address. Please check your email or sign up for a new account."
          );
        } else if (status === 403) {
          Alert.alert(
            "Account Locked", 
            "Your account has been temporarily locked. Please try again later or contact support."
          );
        } else {
          Alert.alert("Login Failed", errorMessage);
        }
      } else if (error.request) {
        // Request made but no response received
        Alert.alert(
          "Server Unreachable", 
          `Could not reach the server at ${API_CONFIG.baseURL}. Please verify the API URL is correct and the server is running.`
        );
      } else {
        Alert.alert(
          "Request Error", 
          "An error occurred while setting up the request. Please try again."
        );
      }
    } else {
      Alert.alert(
        "Unknown Error", 
        "An unexpected error occurred. Please try again later."
      );
    }
  };

  // Clear AsyncStorage for debugging if needed
  const clearStorageAndRetry = async () => {
    try {
      await AsyncStorage.multiRemove(['userToken', 'userRole', 'userId', 'userName']);
      console.log('AsyncStorage cleared');
      Alert.alert('Storage Cleared', 'Please try signing in again');
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  };

  // API call function for user login
  const loginUserAPI = async (credentials: {
    email: string;
    password: string;
  }) => {
    try {
      const response = await apiClient.post(API_CONFIG.endpoints.login, credentials);
      return response.data;
    } catch (error) {
      console.error('Login API Error:', error);
      throw error;
    }
  };

  // Function to check if user is already logged in
  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userRole = await AsyncStorage.getItem('userRole');
      
      if (token && userRole) {
        // Verify token with backend
        try {
          const response = await apiClient.get(API_CONFIG.endpoints.currentUser, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          
          if (response.data) {
            // User is still authenticated, navigate based on role
            switch (userRole) {
              case 'admin':
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'AdminDashboard' }],
                });
                break;
              case 'teacher':
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'TeacherDashboard' }],
                });
                break;
              case 'user':
              default:
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Home' }],
                });
                break;
            }
          }
        } catch (error) {
          // Token is invalid or expired, clear storage
          await AsyncStorage.multiRemove(['userToken', 'userRole', 'userId', 'userName']);
          console.log('Cleared invalid auth data');
        }
      }
    } catch (error) {
      // Error reading storage, clear it
      console.error('Error checking auth status:', error);
      await AsyncStorage.multiRemove(['userToken', 'userRole', 'userId', 'userName']);
    }
  };

  const handleSignIn = async () => {
    if (!isFormValid()) {
      let errorMessage = "Please fill in all fields";
      
      if (!isEmailValid()) {
        errorMessage = "Please enter a valid email address";
      }
      
      Alert.alert("Error", errorMessage);
      return;
    }

    if (!isConnected) {
      Alert.alert("Network Error", "You appear to be offline. Please check your internet connection and try again.");
      return;
    }

    setIsLoading(true);

    try {
      console.log('Attempting login with:', { email });

      // Login user
      const loginCredentials = {
        email: email.toLowerCase().trim(),
        password: password,
      };

      const loginResponse: LoginResponse = await loginUserAPI(loginCredentials);
      console.log('Login successful:', loginResponse);

      // Store auth token and user data (using simple pattern)
      if (loginResponse && loginResponse.token) {
        try {
          // Store token and user info (simple pattern from small file)
          await AsyncStorage.setItem('userToken', loginResponse.token);
          await AsyncStorage.setItem('userRole', loginResponse.user.role);
          await AsyncStorage.setItem('userId', loginResponse.user.id);
          await AsyncStorage.setItem('userName', loginResponse.user.name);

          Alert.alert(
            'Welcome Back!',
            `Hello ${loginResponse.user.name}, you have successfully signed in.`,
            [
              {
                text: 'Continue',
                onPress: () => {
                  // Navigate based on role (matching small file pattern)
                  switch (loginResponse.user.role) {
                    case 'admin':
                      navigation.reset({
                        index: 0,
                        routes: [{ name: 'AdminDashboard' }],
                      });
                      break;
                    case 'teacher':
                      navigation.reset({
                        index: 0,
                        routes: [{ name: 'TeacherDashboard' }],
                      });
                      break;
                    case 'user':
                    default:
                      navigation.reset({
                        index: 0,
                        routes: [{ name: 'Home' }],
                      });
                      break;
                  }
                }
              }
            ]
          );
        } catch (storageError) {
          console.error('Error saving auth data:', storageError);
          Alert.alert(
            "Storage Error", 
            "Login successful but failed to save session data. You may need to sign in again.",
            [
              { 
                text: "OK", 
                onPress: () => {
                  // Navigate anyway based on role
                  switch (loginResponse.user.role) {
                    case 'admin':
                      navigation.reset({ index: 0, routes: [{ name: 'AdminDashboard' }] });
                      break;
                    case 'teacher':
                      navigation.reset({ index: 0, routes: [{ name: 'TeacherDashboard' }] });
                      break;
                    case 'user':
                    default:
                      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
                      break;
                  }
                }
              },
              { text: "Clear Storage & Retry", onPress: clearStorageAndRetry }
            ]
          );
        }
      } else {
        console.log('Login successful, but no token returned');
        Alert.alert(
          "Login Issue", 
          "Login was successful but no authentication token was received. Please try again."
        );
      }
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle forgot password
  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert(
        'Email Required',
        'Please enter your email address first, then tap "Forgot Password" to receive reset instructions.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!isEmailValid()) {
      Alert.alert(
        'Invalid Email',
        'Please enter a valid email address to receive password reset instructions.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Reset Password',
      `Send password reset instructions to ${email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Send', 
          onPress: async () => {
            try {
              setIsLoading(true);
              // Implement forgot password API call here
              await apiClient.post(API_CONFIG.endpoints.forgotPassword, {
                email: email.toLowerCase().trim()
              });
              
              Alert.alert(
                'Email Sent',
                'Password reset instructions have been sent to your email address.',
                [{ text: 'OK' }]
              );
            } catch (error) {
              Alert.alert(
                'Error',
                'Failed to send password reset email. Please try again later.',
                [{ text: 'OK' }]
              );
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleSocialSignIn = (provider: string) => {
    Alert.alert(
      'Social Sign In',
      `${provider} sign in will be implemented soon.`,
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND.backgroundColor} />
      
      {/* Animated Background Elements */}
      <Animated.View style={[styles.backgroundElements, { opacity: fadeAnim }]}>
        <Animated.View 
          style={[
            styles.glowCircle,
            styles.glowCircle1,
            { opacity: Animated.multiply(glowOpacity, 0.1) }
          ]} 
        />
        <Animated.View 
          style={[
            styles.glowCircle,
            styles.glowCircle2,
            { opacity: Animated.multiply(glowOpacity, 0.08) }
          ]} 
        />
        <Animated.View 
          style={[
            styles.glowCircle,
            styles.glowCircle3,
            { opacity: Animated.multiply(glowOpacity, 0.06) }
          ]} 
        />
      </Animated.View>

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={BRAND.primaryColor} />
          </TouchableOpacity>

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
                { opacity: Animated.multiply(glowOpacity, 0.7) }
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
              styles.headerSection,
              { opacity: logoOpacity }
            ]}
          >
            <Text style={styles.welcomeTitle}>Welcome Back</Text>
            <Text style={styles.welcomeSubtitle}>
              Sign in to continue your learning journey
            </Text>
          </Animated.View>

          {/* Form Section */}
          <Animated.View
            style={[
              styles.formSection,
              {
                opacity: formOpacity,
                transform: [{ translateY: formTranslateY }],
              },
            ]}
          >
            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={[
                styles.inputWrapper,
                focusedInput === 'email' && styles.inputWrapperFocused
              ]}>
                <FontAwesome5 name="envelope" size={16} color="#666666" style={styles.inputIcon} />
                <TextInput
                  ref={emailRef}
                  style={styles.textInput}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email"
                  placeholderTextColor="#666666"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onFocus={() => setFocusedInput('email')}
                  onBlur={() => setFocusedInput(null)}
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  returnKeyType="next"
                  editable={!isLoading}
                  autoComplete="email"
                  textContentType="emailAddress"
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={[
                styles.inputWrapper,
                focusedInput === 'password' && styles.inputWrapperFocused
              ]}>
                <FontAwesome5 name="lock" size={16} color="#666666" style={styles.inputIcon} />
                <TextInput
                  ref={passwordRef}
                  style={[styles.textInput, styles.passwordInput]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor="#666666"
                  secureTextEntry={!showPassword}
                  onFocus={() => setFocusedInput('password')}
                  onBlur={() => setFocusedInput(null)}
                  returnKeyType="done"
                  onSubmitEditing={handleSignIn}
                  editable={!isLoading}
                  autoComplete="off"
                  textContentType="oneTimeCode"
                />
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  <Feather name={showPassword ? "eye" : "eye-off"} size={18} color="#666666" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password */}
            <TouchableOpacity
              style={styles.forgotPasswordContainer}
              onPress={handleForgotPassword}
              disabled={isLoading}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Sign In Button */}
            <Animated.View
              style={[
                styles.signInButtonContainer,
                { transform: [{ scale: buttonScale }] }
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.signInButton,
                  (!isFormValid() || isLoading) && styles.signInButtonDisabled
                ]}
                onPress={handleSignIn}
                disabled={!isFormValid() || isLoading}
                activeOpacity={0.8}
              >
                <Animated.View
                  style={[
                    styles.buttonGlow,
                    { opacity: Animated.multiply(glowOpacity, 0.6) }
                  ]}
                />
                {isLoading ? (
                  <ActivityIndicator color={BRAND.backgroundColor} size="small" />
                ) : (
                  <Text style={styles.signInButtonText}>Sign In</Text>
                )}
              </TouchableOpacity>
            </Animated.View>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social Sign In Options */}
            <View style={styles.socialButtonsContainer}>
              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => handleSocialSignIn('Google')}
                disabled={isLoading}
              >
                <FontAwesome5 name="google" size={20} color="#DB4437" />
                <Text style={styles.socialButtonText}>Google</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => handleSocialSignIn('Apple')}
                disabled={isLoading}
              >
                <FontAwesome5 name="apple" size={20} color="#000000" />
                <Text style={styles.socialButtonText}>Apple</Text>
              </TouchableOpacity>
            </View>

            {/* Sign Up Link */}
            <Animated.View
              style={[
                styles.signUpLinkContainer,
                { opacity: formOpacity }
              ]}
            >
              <Text style={styles.signUpLinkText}>Don't have an account? </Text>
              <TouchableOpacity 
                onPress={() => navigation.navigate('SignUp')}
                disabled={isLoading}
              >
                <Text style={styles.signUpLinkButton}>Sign Up</Text>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    width: '100%',
    height: '100%',
  },
  glowCircle: {
    position: 'absolute',
    borderRadius: 200,
    backgroundColor: 'rgba(0, 255, 136, 0.2)',
  },
  glowCircle1: {
    width: 350,
    height: 350,
    top: -150,
    right: -100,
  },
  glowCircle2: {
    width: 250,
    height: 250,
    bottom: 200,
    left: -75,
  },
  glowCircle3: {
    width: 180,
    height: 180,
    top: height * 0.5,
    right: -50,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 30,
  },
  backButton: {
    marginTop: 20,
    marginBottom: 10,
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  logoSection: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
    marginVertical: 30,
    position: 'relative',
  },
  logoGlow: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(0, 255, 136, 0.3)',
  },
  logoImage: {
    width: 60,
    height: 60,
    zIndex: 2,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 12,
    letterSpacing: 0.5,
    textShadowColor: BRAND.primaryColor,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#cccccc',
    textAlign: 'center',
    opacity: 0.9,
  },
  formSection: {
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 25,
  },
  inputLabel: {
    fontSize: 14,
    color: '#ffffff',
    marginBottom: 8,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  inputWrapper: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 56,
  },
  inputWrapperFocused: {
    borderColor: BRAND.primaryColor,
    backgroundColor: 'rgba(0, 255, 136, 0.05)',
  },
  textInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  passwordInput: {
    paddingRight: 50,
  },
  passwordToggle: {
    position: 'absolute',
    right: 16,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: 30,
  },
  forgotPasswordText: {
    color: BRAND.primaryColor,
    fontSize: 14,
    fontWeight: '500',
  },
  signInButtonContainer: {
    marginBottom: 25,
  },
  signInButton: {
    backgroundColor: BRAND.primaryColor,
    borderRadius: 15,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    elevation: 8,
    shadowColor: BRAND.primaryColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  signInButtonDisabled: {
    opacity: 0.7,
  },
  buttonGlow: {
    position: 'absolute',
    top: -5,
    left: -5,
    right: -5,
    bottom: -5,
    backgroundColor: 'rgba(0, 255, 136, 0.3)',
    borderRadius: 20,
  },
  signInButtonText: {
    color: BRAND.backgroundColor,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
    zIndex: 2,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 25,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  dividerText: {
    color: '#666666',
    fontSize: 14,
    marginHorizontal: 15,
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 10,
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  socialButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  signUpLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 30,
  },
  signUpLinkText: {
    color: '#cccccc',
    fontSize: 16,
  },
  signUpLinkButton: {
    color: BRAND.primaryColor,
    fontSize: 16,
    fontWeight: '700',
  },
  inputIcon: {
    marginRight: 12,
  },
});

export default SignInScreen;