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

interface SignUpScreenProps {
  navigation: NavigationProp<any>;
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
  baseURL: 'http://localhost:3000/api', // Replace with your actual backend URL
  timeout: 15000, // 15 seconds timeout
  endpoints: {
    register: '/auth/register',
    login: '/auth/login',
    currentUser: '/auth/current-user',
  }
};

// Create an axios instance with timeout configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
});

const SignUpScreen: React.FC<SignUpScreenProps> = ({ navigation }) => {
  // State for form inputs
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  
  // Loading and network state
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  // Refs for input fields (for focus management)
  const fullNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

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
    if (!fullName || !email || !password || !confirmPassword) return false;
    if (password !== confirmPassword) return false;
    if (!agreeToTerms) return false;
    if (!isEmailValid()) return false;
    if (!isPasswordValid()) return false;
    return true;
  };

  // Password validation check
  const isPasswordValid = () => {
    return password.length >= 6;
  };

  // Email validation check
  const isEmailValid = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Show detailed error if API call fails
  const handleApiError = (error: any) => {
    console.error("Signup error:", error);
    
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
        const errorMessage = error.response.data?.message || `Server error (${error.response.status}). Please try again.`;
        if (error.response.status === 409 || errorMessage.includes('already exists')) {
          Alert.alert(
            "Account Exists", 
            "An account with this email already exists. Please use a different email or try signing in."
          );
        } else {
          Alert.alert("Registration Failed", errorMessage);
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
      await AsyncStorage.multiRemove(['authToken', 'userData']);
      console.log('AsyncStorage cleared');
      Alert.alert('Storage Cleared', 'Please try again');
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  };

  // API call function for user registration
  const registerUserAPI = async (userData: {
    name: string;
    email: string;
    password: string;
  }) => {
    try {
      const response = await apiClient.post(API_CONFIG.endpoints.register, userData);
      return response.data;
    } catch (error) {
      console.error('Registration API Error:', error);
      throw error;
    }
  };

  // Login user automatically after successful registration
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

  // Replace the handleSignUp function in your SignUpScreen with this improved version

const handleSignUp = async () => {
  if (!isFormValid()) {
    let errorMessage = "Please fill all required fields";
    
    if (!isEmailValid()) {
      errorMessage = "Please enter a valid email address";
    } else if (!isPasswordValid()) {
      errorMessage = "Password must be at least 6 characters long";
    } else if (password !== confirmPassword) {
      errorMessage = "Passwords do not match";
    } else if (!agreeToTerms) {
      errorMessage = "You must accept the Terms of Service";
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
    console.log('Attempting registration with:', { fullName, email });

    // Register user
    const registrationData = {
      name: fullName.trim(),
      email: email.toLowerCase().trim(),
      password: password,
    };

    const registrationResponse = await registerUserAPI(registrationData);
    console.log('Registration successful:', registrationResponse);

    // Auto-login after successful registration
    const loginCredentials = {
      email: email.toLowerCase().trim(),
      password: password,
    };

    const loginResponse = await loginUserAPI(loginCredentials);
    console.log('Auto-login successful:', loginResponse);

    // Store auth token and user data (matching SignIn pattern)
    if (loginResponse && loginResponse.token) {
      try {
        // Store token and user info (same pattern as SignIn screen)
        await AsyncStorage.setItem('userToken', loginResponse.token);
        await AsyncStorage.setItem('userRole', loginResponse.user.role);
        await AsyncStorage.setItem('userId', loginResponse.user.id);
        await AsyncStorage.setItem('userName', loginResponse.user.name);

        // Show welcome message
        Alert.alert(
          'Welcome to SUJHAV!',
          `Hello ${loginResponse.user.name}, your account has been created successfully. You're now signed in!`,
          [
            {
              text: 'Get Started',
              onPress: () => {
                // Navigate based on role (matching SignIn screen pattern)
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
          "Account Created Successfully", 
          "Your account has been created but there was an issue saving your session. Please sign in with your new credentials.",
          [
            { 
              text: "Sign In Now", 
              onPress: () => {
                // Pre-fill the email on SignIn screen
                navigation.navigate('SignIn', { prefillEmail: email });
              }
            }
          ]
        );
      }
    } else {
      // Account created but no token returned
      console.log('Registration successful, but no token returned');
      Alert.alert(
        "Account Created Successfully", 
        "Your account has been created! Please sign in with your new credentials.",
        [
          { 
            text: "Sign In Now", 
            onPress: () => {
              // Pre-fill the email on SignIn screen
              navigation.navigate('SignIn', { prefillEmail: email });
            }
          }
        ]
      );
    }
  } catch (error) {
    handleApiError(error);
  } finally {
    setIsLoading(false);
  }
};

  const handleTermsPress = () => {
    Alert.alert(
      'Terms of Service',
      'Terms of Service and Privacy Policy will be available soon.',
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
            <Text style={styles.welcomeTitle}>Create Account</Text>
            <Text style={styles.welcomeSubtitle}>
              Join SUJHAV and start your learning journey
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
            {/* Full Name Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <View style={[
                styles.inputWrapper,
                focusedInput === 'fullName' && styles.inputWrapperFocused
              ]}>
                <FontAwesome5 name="user" size={16} color="#666666" style={styles.inputIcon} />
                <TextInput
                  ref={fullNameRef}
                  style={styles.textInput}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Enter your full name"
                  placeholderTextColor="#666666"
                  autoCapitalize="words"
                  autoCorrect={false}
                  onFocus={() => setFocusedInput('fullName')}
                  onBlur={() => setFocusedInput(null)}
                  onSubmitEditing={() => emailRef.current?.focus()}
                  returnKeyType="next"
                  editable={!isLoading}
                  autoComplete="name"
                />
              </View>
            </View>

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
                  placeholder="Create a password (min. 6 characters)"
                  placeholderTextColor="#666666"
                  secureTextEntry={!showPassword}
                  onFocus={() => setFocusedInput('password')}
                  onBlur={() => setFocusedInput(null)}
                  onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                  returnKeyType="next"
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

            {/* Confirm Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Confirm Password</Text>
              <View style={[
                styles.inputWrapper,
                focusedInput === 'confirmPassword' && styles.inputWrapperFocused
              ]}>
                <FontAwesome5 name="lock" size={16} color="#666666" style={styles.inputIcon} />
                <TextInput
                  ref={confirmPasswordRef}
                  style={[styles.textInput, styles.passwordInput]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm your password"
                  placeholderTextColor="#666666"
                  secureTextEntry={!showConfirmPassword}
                  onFocus={() => setFocusedInput('confirmPassword')}
                  onBlur={() => setFocusedInput(null)}
                  returnKeyType="done"
                  editable={!isLoading}
                  autoComplete="off"
                  textContentType="oneTimeCode"
                />
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                >
                  <Feather name={showConfirmPassword ? "eye" : "eye-off"} size={18} color="#666666" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Terms and Conditions */}
            <TouchableOpacity
              style={styles.termsContainer}
              onPress={() => setAgreeToTerms(!agreeToTerms)}
              disabled={isLoading}
            >
              <View style={[
                styles.checkbox,
                agreeToTerms && styles.checkboxChecked
              ]}>
                {agreeToTerms && <Ionicons name="checkmark" size={16} color={BRAND.backgroundColor} />}
              </View>
              <View style={styles.termsTextContainer}>
                <Text style={styles.termsText}>
                  I agree to the{' '}
                  <Text style={styles.termsLink} onPress={handleTermsPress}>
                    Terms of Service
                  </Text>
                  {' '}and{' '}
                  <Text style={styles.termsLink} onPress={handleTermsPress}>
                    Privacy Policy
                  </Text>
                </Text>
              </View>
            </TouchableOpacity>

            {/* Sign Up Button */}
            <Animated.View
              style={[
                styles.signUpButtonContainer,
                { transform: [{ scale: buttonScale }] }
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.signUpButton,
                  (!isFormValid() || isLoading) && styles.signUpButtonDisabled
                ]}
                onPress={handleSignUp}
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
                  <Text style={styles.signUpButtonText}>Create Account</Text>
                )}
              </TouchableOpacity>
            </Animated.View>

            {/* Sign In Link */}
            <Animated.View
              style={[
                styles.signInLinkContainer,
                { opacity: formOpacity }
              ]}
            >
              <Text style={styles.signInLinkText}>Already have an account? </Text>
              <TouchableOpacity 
                onPress={() => navigation.navigate('SignIn')}
                disabled={isLoading}
              >
                <Text style={styles.signInLinkButton}>Sign In</Text>
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
    bottom: 100,
    left: -75,
  },
  glowCircle3: {
    width: 180,
    height: 180,
    top: height * 0.6,
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
  backButtonText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '300',
  },
  logoSection: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 100,
    marginVertical: 20,
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
    marginBottom: 30,
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
    marginBottom: 20,
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
  passwordToggleText: {
    fontSize: 18,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 25,
    paddingHorizontal: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: BRAND.primaryColor,
    borderColor: BRAND.primaryColor,
  },
  checkmark: {
    color: BRAND.backgroundColor,
    fontSize: 12,
    fontWeight: 'bold',
  },
  termsTextContainer: {
    flex: 1,
  },
  termsText: {
    color: '#cccccc',
    fontSize: 14,
    lineHeight: 20,
  },
  termsLink: {
    color: BRAND.primaryColor,
    fontWeight: '600',
  },
  signUpButtonContainer: {
    marginBottom: 25,
  },
  signUpButton: {
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
  signUpButtonDisabled: {
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
  signUpButtonText: {
    color: BRAND.backgroundColor,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
    zIndex: 2,
  },
  signInLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 30,
  },
  signInLinkText: {
    color: '#cccccc',
    fontSize: 16,
  },
  signInLinkButton: {
    color: BRAND.primaryColor,
    fontSize: 16,
    fontWeight: '700',
  },
  inputIcon: {
    marginRight: 12,
  },
});

export default SignUpScreen;