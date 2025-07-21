import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  StatusBar,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Animated,
  ActivityIndicator,
  BackHandler,
  AlertButton,
} from 'react-native';
import { NavigationProp, RouteProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebView } from 'react-native-webview'; // EXPO COMPATIBLE: Use WebView for Razorpay
import * as Linking from 'expo-linking'; // EXPO COMPATIBLE: For handling deep links
import { API_BASE } from '../config/api';

// Interface for Razorpay payment response
interface PaymentResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface PaymentScreenProps {
  navigation: NavigationProp<any>;
  route: RouteProp<any>;
}

interface PaymentData {
  enrollment: {
    _id: string;
    studentId: string;
    courseId: string;
    paymentDetails: {
      amount: number;
      currency: string;
      razorpayOrderId: string;
    };
  };
  razorpayOrder: {
    id: string;
    amount: number;
    currency: string;
    receipt: string;
  };
  course: {
    _id: string;
    courseTitle: string;
    tutor: string;
    price: number;
    courseThumbnail: string;
    type: 'paid' | 'free';
  };
  onPaymentSuccess: (paymentData: any) => void;
}

const { width, height } = Dimensions.get('window');

// Brand configuration
const BRAND = {
  name: "SUJHAV",
  primaryColor: '#00ff88',
  secondaryColor: '#000000',
  backgroundColor: '#0a1a0a',
  accentColor: '#1a2e1a',
  errorColor: '#ff4444',
  warningColor: '#ffaa00',
};

const PaymentScreen: React.FC<PaymentScreenProps> = ({ navigation, route }) => {
  const { enrollment, razorpayOrder, course, onPaymentSuccess } = route.params as PaymentData;

  // State management
  const [loading, setLoading] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutes in seconds
  const [paymentMethod, setPaymentMethod] = useState<'razorpay' | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [showWebView, setShowWebView] = useState(false); // EXPO: Control WebView visibility
  const [razorpayHtml, setRazorpayHtml] = useState<string>(''); // EXPO: HTML content for WebView

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // EXPO COMPATIBLE: Generate Razorpay checkout HTML
  const generateRazorpayHtml = (options: any) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Razorpay Payment</title>
    <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #0a1a0a 0%, #1a2e1a 100%);
            color: #00ff88;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }
        .container {
            text-align: center;
            max-width: 400px;
            padding: 30px;
            background: rgba(26, 46, 26, 0.8);
            border-radius: 15px;
            border: 1px solid #00ff88;
            backdrop-filter: blur(10px);
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 20px;
            color: #00ff88;
        }
        .amount {
            font-size: 32px;
            font-weight: bold;
            margin: 20px 0;
            color: #00ff88;
        }
        .course-name {
            font-size: 18px;
            margin-bottom: 30px;
            color: #ccc;
        }
        .pay-button {
            background: #00ff88;
            color: #0a1a0a;
            border: none;
            padding: 15px 40px;
            font-size: 18px;
            font-weight: bold;
            border-radius: 10px;
            cursor: pointer;
            width: 100%;
            margin: 20px 0;
            transition: all 0.3s ease;
        }
        .pay-button:hover {
            background: #00cc6a;
            transform: translateY(-2px);
        }
        .pay-button:disabled {
            background: #666;
            cursor: not-allowed;
            transform: none;
        }
        .loading {
            display: none;
            margin: 20px 0;
        }
        .loading.show {
            display: block;
        }
        .spinner {
            border: 3px solid #333;
            border-top: 3px solid #00ff88;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            animation: spin 1s linear infinite;
            margin: 0 auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .error {
            color: #ff4444;
            margin: 10px 0;
            padding: 10px;
            background: rgba(255, 68, 68, 0.1);
            border-radius: 5px;
            border: 1px solid #ff4444;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">${options.name}</div>
        <div class="course-name">${options.description}</div>
        <div class="amount">₹${(options.amount / 100).toFixed(2)}</div>
        
        <button id="payButton" class="pay-button" onclick="startPayment()">
            Pay Now
        </button>
        
        <div id="loading" class="loading">
            <div class="spinner"></div>
            <p>Processing payment...</p>
        </div>
        
        <div id="error" class="error" style="display: none;"></div>
    </div>

    <script>
        const options = ${JSON.stringify(options)};
        
        function showLoading() {
            document.getElementById('loading').classList.add('show');
            document.getElementById('payButton').style.display = 'none';
        }
        
        function hideLoading() {
            document.getElementById('loading').classList.remove('show');
            document.getElementById('payButton').style.display = 'block';
        }
        
        function showError(message) {
            const errorDiv = document.getElementById('error');
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        }
        
        function startPayment() {
            if (!window.Razorpay) {
                showError('Payment gateway not loaded. Please refresh and try again.');
                return;
            }
            
            showLoading();
            
            const rzp = new Razorpay({
                ...options,
                handler: function (response) {
                    // Payment successful
                    const result = {
                        success: true,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_signature: response.razorpay_signature
                    };
                    
                    // Send success message to React Native
                    window.ReactNativeWebView?.postMessage(JSON.stringify(result));
                },
                modal: {
                    ondismiss: function() {
                        hideLoading();
                        // Payment cancelled
                        const result = {
                            success: false,
                            error: 'cancelled',
                            message: 'Payment was cancelled by user'
                        };
                        window.ReactNativeWebView?.postMessage(JSON.stringify(result));
                    }
                }
            });
            
            rzp.on('payment.failed', function (response) {
                hideLoading();
                // Payment failed
                const result = {
                    success: false,
                    error: 'failed',
                    message: response.error.description,
                    code: response.error.code,
                    razorpay_payment_id: response.error.metadata?.payment_id
                };
                window.ReactNativeWebView?.postMessage(JSON.stringify(result));
            });
            
            rzp.open();
        }
        
        // Auto-start payment when page loads (optional)
        // window.onload = startPayment;
    </script>
</body>
</html>`;
  };

  // FIXED: Proper API URL construction
  const getApiUrl = (endpoint: string) => {
    const baseUrl = API_BASE?.replace(/\/+$/, '');
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    
    if (baseUrl.endsWith('/api')) {
      return `${baseUrl}${cleanEndpoint}`;
    } else {
      return `${baseUrl}/api${cleanEndpoint}`;
    }
  };

  // Custom timeout implementation for fetch
  const fetchWithTimeout = (url: string, options: RequestInit, timeout: number = 30000): Promise<Response> => {
    return new Promise((resolve, reject) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        reject(new Error('Request timeout'));
      }, timeout);

      fetch(url, {
        ...options,
        signal: controller.signal,
      })
        .then(response => {
          clearTimeout(timeoutId);
          resolve(response);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  };

  // Enhanced network request with retry logic
  const makeNetworkRequest = async (url: string, options: RequestInit, retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        console.log(`Attempting request ${i + 1}/${retries} to:`, url);
        
        const response = await fetchWithTimeout(url, options, 30000);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Server error response:', errorText);
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        return { response, data };

      } catch (error) {
        console.error(`Request attempt ${i + 1} failed:`, error);
        
        if (i === retries - 1) {
          throw error;
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
  };

  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handlePaymentTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Handle back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => backHandler.remove();
  }, []);

  // Entrance animation and initialization
  useEffect(() => {
    startEntranceAnimation();
    getUserData();
  }, []);

  const startEntranceAnimation = () => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const getUserData = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userId = await AsyncStorage.getItem('userId');
      const userName = await AsyncStorage.getItem('userName');
      const userEmail = await AsyncStorage.getItem('userEmail');
      const userPhone = await AsyncStorage.getItem('userPhone');
      
      if (token && userId && userName) {
        setUserData({ token, userId, userName, userEmail, userPhone });
        console.log('User data loaded:', { userId, userName, hasToken: !!token });
      } else {
        console.error('Missing user data');
        Alert.alert('Error', 'User authentication data not found. Please login again.');
        navigation.navigate('Login');
      }
    } catch (error) {
      console.error('Error getting user data:', error);
      Alert.alert('Error', 'Failed to load user data. Please try again.');
    }
  };

  const handleBackPress = () => {
    if (showWebView) {
      setShowWebView(false);
      setPaymentProcessing(false);
      return true;
    }
    
    Alert.alert(
      'Cancel Payment',
      'Are you sure you want to cancel this payment? Your enrollment will remain pending.',
      [
        { text: 'Continue Payment', style: 'cancel' },
        { 
          text: 'Cancel Payment', 
          style: 'destructive',
          onPress: () => navigation.goBack()
        }
      ]
    );
    return true;
  };

  const handlePaymentTimeout = () => {
    Alert.alert(
      'Payment Timeout',
      'Your payment session has expired. Please try enrolling again.',
      [
        {
          text: 'OK',
          onPress: () => navigation.goBack()
        }
      ]
    );
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getImageSource = (thumbnailPath: string) => {
    if (!thumbnailPath) {
      return { uri: 'https://via.placeholder.com/350x200/1a2e1a/00ff88?text=No+Image' };
    }
    
    if (thumbnailPath.startsWith('http://') || thumbnailPath.startsWith('https://')) {
      return { uri: thumbnailPath };
    }
    
    return { uri: `${API_BASE?.replace(/\/+$/, '')}${thumbnailPath}` };
  };

  // EXPO COMPATIBLE: Initialize Razorpay via WebView
  const initializeRazorpay = async () => {
    try {
      if (!userData || !userData.token) {
        Alert.alert('Error', 'Please login again to continue with payment.');
        navigation.navigate('Login');
        return;
      }

      setPaymentProcessing(true);
      setNetworkError(null);

      console.log('Initializing Razorpay payment via WebView...');
      console.log('Enrollment ID:', enrollment._id);
      console.log('Razorpay Order ID:', razorpayOrder.id);
      
      // EXPO: Create Razorpay options
      const options = {
        description: course.courseTitle,
        image: getImageSource(course.courseThumbnail).uri,
        currency: razorpayOrder.currency,
        key: 'rzp_test_za8EBHBiDeO6E4', // Your Razorpay test key
        amount: razorpayOrder.amount, // Amount in paise
        order_id: razorpayOrder.id,
        name: BRAND.name,
        prefill: {
          email: userData?.userEmail || '',
          contact: userData?.userPhone || '',
          name: userData?.userName || ''
        },
        theme: {
          color: BRAND.primaryColor
        }
      };

      console.log('Opening Razorpay checkout via WebView...');

      // Generate HTML content for WebView
      const html = generateRazorpayHtml(options);
      setRazorpayHtml(html);
      setShowWebView(true);

    } catch (error) {
      console.error('Razorpay initialization error:', error);
      setPaymentProcessing(false);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setNetworkError(errorMessage);
      
      Alert.alert(
        'Payment Error', 
        errorMessage,
        [
          { text: 'Retry', onPress: () => initializeRazorpay() },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    }
  };

  // EXPO: Handle WebView messages
  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('WebView message received:', data);

      setShowWebView(false);

      if (data.success) {
        // Payment successful
        const paymentResponse: PaymentResponse = {
          razorpay_order_id: data.razorpay_order_id,
          razorpay_payment_id: data.razorpay_payment_id,
          razorpay_signature: data.razorpay_signature,
        };
        handlePaymentSuccess(paymentResponse);
      } else {
        // Payment failed or cancelled
        setPaymentProcessing(false);
        
        if (data.error === 'cancelled') {
          Alert.alert(
            'Payment Cancelled',
            'You cancelled the payment. Your enrollment is still pending.',
            [
              { text: 'Try Again', onPress: () => initializeRazorpay() },
              { text: 'Cancel', style: 'cancel' }
            ]
          );
        } else if (data.error === 'failed') {
          Alert.alert(
            'Payment Failed',
            data.message || 'Payment failed. Please try again.',
            [
              { text: 'Try Again', onPress: () => initializeRazorpay() },
              { text: 'Cancel', style: 'cancel' }
            ]
          );
        } else {
          handlePaymentFailure(new Error(data.message || 'Payment failed'));
        }
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
      setShowWebView(false);
      setPaymentProcessing(false);
      handlePaymentFailure(new Error('Payment processing failed'));
    }
  };

  // Handle real payment success
  const handlePaymentSuccess = async (paymentResponse: PaymentResponse) => {
  try {
    if (!userData || !userData.token) {
      throw new Error('User authentication expired. Please login again.');
    }

    console.log('Processing payment success...');
    console.log('Payment response:', {
      paymentId: paymentResponse.razorpay_payment_id,
      orderId: paymentResponse.razorpay_order_id,
      signature: paymentResponse.razorpay_signature ? 'Present' : 'Missing'
    });

    // Verify payment with backend
    const verificationPayload = {
      enrollmentId: enrollment._id,
      razorpay_order_id: paymentResponse.razorpay_order_id,
      razorpay_payment_id: paymentResponse.razorpay_payment_id,
      razorpay_signature: paymentResponse.razorpay_signature,
    };

    console.log('Sending verification request...');
    const verificationUrl = getApiUrl('/enrollment/verify-payment');
    
    const result = await makeNetworkRequest(verificationUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userData.token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(verificationPayload),
    });

    if (result && result.data && result.data.success) {
      setPaymentProcessing(false);
      
      // Show success animation - FIXED: useNativeDriver set to false
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: false, // This is the key fix
      }).start();

      setTimeout(() => {
        Alert.alert(
          'Payment Successful! 🎉',
          'Payment verified successfully!\nYou are now enrolled in the course.',
          [
            {
              text: 'Start Learning',
              onPress: () => {
                navigation.navigate('CourseContent', { 
                  courseId: course._id,
                  enrollmentId: result.data.enrollment._id
                });
              },
            },
          ]
        );
      }, 1000);
    } else {
      const errorMessage = result?.data?.message || 'Payment verification failed';
      throw new Error(errorMessage);
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    setPaymentProcessing(false);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    setNetworkError(errorMessage);
    
    let displayMessage = 'Payment verification failed.';
    let actions: AlertButton[] = [{ text: 'OK', style: 'cancel' }];
    
    if (errorMessage.includes('Network request failed') || 
        errorMessage.includes('timeout') || 
        errorMessage.includes('fetch')) {
      displayMessage = 'Network connection error. Please check your internet connection and try again.';
      actions = [
        { text: 'Retry', onPress: () => handlePaymentSuccess(paymentResponse) },
        { text: 'Cancel', style: 'cancel' }
      ];
    } else if (errorMessage.includes('authentication') || 
               errorMessage.includes('401')) {
      displayMessage = 'Session expired. Please login again.';
      actions = [
        { text: 'Login', onPress: () => navigation.navigate('Login') },
        { text: 'Cancel', style: 'cancel' }
      ];
    }

    Alert.alert('Payment Verification Error', displayMessage, actions);
  }
};

// Alternative approach: Use transform scaleX instead of width
// Replace the progress bar animation with this more performant approach:

const renderProgressBar = () => {
  if (!paymentProcessing) return null;
  
  return (
    <Animated.View style={[styles.progressContainer, { opacity: fadeAnim }]}>
      <View style={styles.progressBar}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              transform: [
                {
                  scaleX: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 1],
                  }),
                },
              ],
              transformOrigin: 'left', // This ensures scaling from left to right
            },
          ]}
        />
      </View>
      <Text style={styles.progressText}>Verifying payment...</Text>
    </Animated.View>
  );
};

  const handlePaymentFailure = (error: any) => {
    console.error('Payment failed:', error);
    setPaymentProcessing(false);
    const errorMessage = error instanceof Error ? error.message : 'Payment failed';
    setNetworkError(errorMessage);
    
    Alert.alert(
      'Payment Failed',
      'Your payment could not be processed. Please try again.',
      [
        { text: 'Retry', onPress: () => initializeRazorpay() },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const renderPaymentMethod = (method: 'razorpay', title: string, description: string, icon: string) => (
    <TouchableOpacity
      style={[
        styles.paymentMethodCard,
        paymentMethod === method && styles.paymentMethodCardSelected
      ]}
      onPress={() => setPaymentMethod(method)}
      activeOpacity={0.7}
    >
      <View style={styles.paymentMethodIcon}>
        <Text style={styles.paymentMethodIconText}>{icon}</Text>
      </View>
      <View style={styles.paymentMethodInfo}>
        <Text style={styles.paymentMethodTitle}>{title}</Text>
        <Text style={styles.paymentMethodDescription}>{description}</Text>
      </View>
      <View style={styles.paymentMethodRadio}>
        <View style={[
          styles.radioButton,
          paymentMethod === method && styles.radioButtonSelected
        ]}>
          {paymentMethod === method && <View style={styles.radioButtonInner} />}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderNetworkError = () => {
    if (!networkError) return null;
    
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>⚠️ Connection Error</Text>
        <Text style={styles.errorText}>{networkError}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setNetworkError(null);
            initializeRazorpay();
          }}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // EXPO: WebView Payment Screen
  if (showWebView) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={BRAND.backgroundColor} />
        
        {/* WebView Header */}
        <View style={styles.webViewHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              setShowWebView(false);
              setPaymentProcessing(false);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Complete Payment</Text>
          <View style={styles.timerContainer}>
            <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
          </View>
        </View>

        <WebView
          source={{ html: razorpayHtml }}
          style={styles.webView}
          onMessage={handleWebViewMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.webViewLoading}>
              <ActivityIndicator size="large" color={BRAND.primaryColor} />
              <Text style={styles.webViewLoadingText}>Loading payment gateway...</Text>
            </View>
          )}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('WebView error:', nativeEvent);
            setShowWebView(false);
            setPaymentProcessing(false);
            Alert.alert('Error', 'Failed to load payment gateway. Please try again.');
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND.backgroundColor} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackPress}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Complete Payment</Text>
        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
        </View>
      </View>

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Network Error Display */}
          {renderNetworkError()}

          {/* Course Details Card */}
          <View style={styles.courseCard}>
            <Image
              source={getImageSource(course.courseThumbnail)}
              style={styles.courseImage}
              resizeMode="cover"
            />
            <View style={styles.courseInfo}>
              <Text style={styles.courseTitle}>{course.courseTitle}</Text>
              <Text style={styles.courseTutor}>by {course.tutor}</Text>
              <View style={styles.priceContainer}>
                <Text style={styles.priceText}>₹{course.price}</Text>
                <Text style={styles.priceLabel}>Course Fee</Text>
              </View>
            </View>
          </View>

          {/* Payment Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Payment Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Course Fee</Text>
              <Text style={styles.summaryValue}>₹{course.price}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Platform Fee</Text>
              <Text style={styles.summaryValue}>₹0</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>GST (18%)</Text>
              <Text style={styles.summaryValue}>₹{Math.round(course.price * 0.18)}</Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryTotal]}>
              <Text style={styles.summaryTotalLabel}>Total Amount</Text>
              <Text style={styles.summaryTotalValue}>₹{Math.round(course.price * 1.18)}</Text>
            </View>
          </View>

          {/* Payment Methods */}
          <View style={styles.paymentMethodsCard}>
            <Text style={styles.paymentMethodsTitle}>Select Payment Method</Text>
            {renderPaymentMethod(
              'razorpay',
              'Razorpay Gateway',
              'Credit/Debit Cards, Net Banking, UPI, Wallets',
              '💳'
            )}
          </View>

          {/* Security Notice */}
          <View style={styles.securityCard}>
            <Text style={styles.securityTitle}>🔒 Secure Payment</Text>
            <Text style={styles.securityText}>
Your payment information is encrypted and secure. We never store your card details on our servers.
            </Text>
          </View>

          {/* Payment Button */}
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              style={[
                styles.payButton,
                (!paymentMethod || paymentProcessing || timeLeft <= 0) && styles.payButtonDisabled
              ]}
              onPress={initializeRazorpay}
              disabled={!paymentMethod || paymentProcessing || timeLeft <= 0}
              activeOpacity={0.8}
            >
              {paymentProcessing ? (
                <View style={styles.payButtonLoading}>
                  <ActivityIndicator size="small" color={BRAND.backgroundColor} />
                  <Text style={styles.payButtonText}>Processing...</Text>
                </View>
              ) : (
                <Text style={styles.payButtonText}>
                  Pay ₹{Math.round(course.price * 1.18)}
                </Text>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* Terms and Conditions */}
          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              By proceeding with this payment, you agree to our{' '}
              <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
              <Text style={styles.termsLink}>Refund Policy</Text>.
            </Text>
          </View>

          {/* Progress Indicator */}
          {paymentProcessing && (
            <Animated.View style={[styles.progressContainer, { opacity: progressAnim }]}>
              <View style={styles.progressBar}>
                <Animated.View
                  style={[
                    styles.progressFill,
                    {
                      width: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>Verifying payment...</Text>
            </Animated.View>
          )}
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND.backgroundColor,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.accentColor,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BRAND.accentColor,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: BRAND.primaryColor,
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: BRAND.primaryColor,
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  timerContainer: {
    backgroundColor: BRAND.errorColor,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  timerText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  courseCard: {
    backgroundColor: BRAND.accentColor,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: BRAND.primaryColor + '30',
  },
  courseImage: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    marginBottom: 15,
  },
  courseInfo: {
    alignItems: 'center',
  },
  courseTitle: {
    color: BRAND.primaryColor,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  courseTutor: {
    color: '#ccc',
    fontSize: 16,
    marginBottom: 15,
  },
  priceContainer: {
    alignItems: 'center',
  },
  priceText: {
    color: BRAND.primaryColor,
    fontSize: 32,
    fontWeight: 'bold',
  },
  priceLabel: {
    color: '#aaa',
    fontSize: 14,
    marginTop: 4,
  },
  summaryCard: {
    backgroundColor: BRAND.accentColor,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: BRAND.primaryColor + '30',
  },
  summaryTitle: {
    color: BRAND.primaryColor,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    color: '#ccc',
    fontSize: 16,
  },
  summaryValue: {
    color: 'white',
    fontSize: 16,
  },
  summaryTotal: {
    borderTopWidth: 1,
    borderTopColor: BRAND.primaryColor + '30',
    marginTop: 10,
    paddingTop: 15,
  },
  summaryTotalLabel: {
    color: BRAND.primaryColor,
    fontSize: 18,
    fontWeight: '600',
  },
  summaryTotalValue: {
    color: BRAND.primaryColor,
    fontSize: 24,
    fontWeight: 'bold',
  },
  paymentMethodsCard: {
    backgroundColor: BRAND.accentColor,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: BRAND.primaryColor + '30',
  },
  paymentMethodsTitle: {
    color: BRAND.primaryColor,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND.backgroundColor,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  paymentMethodCardSelected: {
    borderColor: BRAND.primaryColor,
    backgroundColor: BRAND.primaryColor + '10',
  },
  paymentMethodIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: BRAND.accentColor,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  paymentMethodIconText: {
    fontSize: 24,
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  paymentMethodDescription: {
    color: '#aaa',
    fontSize: 12,
  },
  paymentMethodRadio: {
    padding: 4,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#666',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: BRAND.primaryColor,
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: BRAND.primaryColor,
  },
  securityCard: {
    backgroundColor: BRAND.primaryColor + '15',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: BRAND.primaryColor + '30',
  },
  securityTitle: {
    color: BRAND.primaryColor,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  securityText: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
  },
  payButton: {
    backgroundColor: BRAND.primaryColor,
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    elevation: 5,
    shadowColor: BRAND.primaryColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  payButtonDisabled: {
    backgroundColor: '#666',
    elevation: 0,
    shadowOpacity: 0,
  },
  payButtonLoading: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  payButtonText: {
    color: BRAND.backgroundColor,
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  termsContainer: {
    marginBottom: 30,
  },
  termsText: {
    color: '#aaa',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: BRAND.primaryColor,
    textDecorationLine: 'underline',
  },
  progressContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  progressBar: {
    width: width - 80,
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    width: '100%', // Full width, controlled by scaleX transform
    backgroundColor: BRAND.primaryColor,
    transformOrigin: 'left center', // Ensures animation starts from left
  },
  progressText: {
    color: BRAND.primaryColor,
    fontSize: 14,
    fontWeight: '500',
  },
  errorContainer: {
    backgroundColor: BRAND.errorColor + '20',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: BRAND.errorColor,
  },
  errorTitle: {
    color: BRAND.errorColor,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorText: {
    color: '#ff9999',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: BRAND.errorColor,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  webViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: BRAND.backgroundColor,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.accentColor,
  },
  webView: {
    flex: 1,
    backgroundColor: BRAND.backgroundColor,
  },
  webViewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: BRAND.backgroundColor,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webViewLoadingText: {
    color: BRAND.primaryColor,
    fontSize: 16,
    marginTop: 15,
  },
});

export default PaymentScreen;