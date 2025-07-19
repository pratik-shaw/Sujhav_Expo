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

interface NotesPaymentScreenProps {
  navigation: NavigationProp<any>;
  route: RouteProp<any>;
}

interface PaymentData {
  purchase?: {
    _id: string;
    studentId: string;
    notesId: string;
    paymentDetails: {
      amount: number;
      currency: string;
      razorpayOrderId: string;
    };
  };
  razorpayOrder?: {
    id: string;
    amount: number;
    currency: string;
    receipt: string;
  };
  notes?: {
    _id: string;
    notesTitle: string;
    tutor: string;
    price: number;
    thumbnail?: {
      data: string;
      contentType: string;
    };
    type: 'paid' | 'free';
    description?: string;
    category?: string;
    class?: string;
  };
  onPaymentSuccess?: (paymentData: any) => void;
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

const NotesPaymentScreen: React.FC<NotesPaymentScreenProps> = ({ navigation, route }) => {
  // Add validation for route params with fallback values
  const routeParams = route.params as PaymentData || {};
  const { purchase, razorpayOrder, notes, onPaymentSuccess } = routeParams;

  // Early return if essential data is missing
  useEffect(() => {
    if (!notes || !purchase || !razorpayOrder) {
      console.error('Missing required data:', {
        hasNotes: !!notes,
        hasPurchase: !!purchase,
        hasRazorpayOrder: !!razorpayOrder
      });
      
      Alert.alert(
        'Error',
        'Payment data is missing. Please try again.',
        [
          {
            text: 'Go Back',
            onPress: () => navigation.goBack()
          }
        ]
      );
      return;
    }
  }, [notes, purchase, razorpayOrder, navigation]);

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

  // If essential data is missing, show loading or error state
  if (!notes || !purchase || !razorpayOrder) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar backgroundColor={BRAND.backgroundColor} barStyle="light-content" />
        <ActivityIndicator size="large" color={BRAND.primaryColor} />
      </View>
    );
  }

  // EXPO COMPATIBLE: Generate Razorpay checkout HTML
  const generateRazorpayHtml = (options: any) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Razorpay Payment - Notes</title>
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
        .notes-name {
            font-size: 18px;
            margin-bottom: 10px;
            color: #ccc;
        }
        .tutor-name {
            font-size: 14px;
            margin-bottom: 30px;
            color: #999;
            font-style: italic;
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
        .notes-info {
            background: rgba(0, 255, 136, 0.1);
            border: 1px solid #00ff88;
            border-radius: 10px;
            padding: 15px;
            margin: 20px 0;
        }
        .category-class {
            font-size: 12px;
            color: #00ff88;
            margin: 5px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">${options.name}</div>
        <div class="notes-name">${options.description}</div>
        <div class="tutor-name">by ${options.tutor || 'Unknown Tutor'}</div>
        ${options.category ? `<div class="category-class">Category: ${options.category}</div>` : ''}
        ${options.class ? `<div class="category-class">Class: ${options.class}</div>` : ''}
        
        <div class="notes-info">
            <div>📝 Study Notes Access</div>
            <div style="font-size: 12px; margin-top: 5px;">Lifetime access to all PDF materials</div>
        </div>
        
        <div class="amount">₹${(options.amount / 100).toFixed(2)}</div>
        
        <button id="payButton" class="pay-button" onclick="startPayment()">
            Purchase Notes
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
    
    if (baseUrl && baseUrl.endsWith('/api')) {
      return `${baseUrl}${cleanEndpoint}`;
    } else {
      return `${baseUrl || ''}/api${cleanEndpoint}`;
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
      'Are you sure you want to cancel this payment? Your notes purchase will remain pending.',
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
      'Your payment session has expired. Please try purchasing the notes again.',
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

  // FIXED: Added proper null checks for notes and thumbnail
  const getImageSource = () => {
    if (notes?.thumbnail?.data && notes.thumbnail.contentType) {
      return { uri: `data:${notes.thumbnail.contentType};base64,${notes.thumbnail.data}` };
    }
    
    return { uri: 'https://via.placeholder.com/350x200/1a2e1a/00ff88?text=Study+Notes' };
  };

  // Handle free notes access
  const handleFreeNotesAccess = () => {
    Alert.alert(
      'Free Notes Access',
      'These are free notes. You can access them immediately!',
      [
        {
          text: 'Access Notes',
          onPress: () => {
            navigation.navigate('NotesViewerScreen', { 
              notesId: notes?._id,
              notesTitle: notes?.notesTitle 
            });
          }
        }
      ]
    );
  };

  // EXPO COMPATIBLE: Initialize Razorpay via WebView
  const initializeRazorpay = async () => {
    try {
      if (!userData || !userData.token) {
        Alert.alert('Error', 'Please login again to continue with payment.');
        navigation.navigate('Login');
        return;
      }

      // Handle free notes
      if (!notes?.price || notes.price === 0) {
        handleFreeNotesAccess();
        return;
      }

      setPaymentProcessing(true);
      setNetworkError(null);

      console.log('Initializing Razorpay payment via WebView for notes...');
      console.log('Purchase ID:', purchase?._id);
      console.log('Razorpay Order ID:', razorpayOrder?.id);
      
      // EXPO: Create Razorpay options
      const options = {
        description: notes?.notesTitle || 'Study Notes',
        image: getImageSource().uri,
        currency: razorpayOrder?.currency || 'INR',
        key: 'rzp_test_za8EBHBiDeO6E4', // Your Razorpay test key
        amount: razorpayOrder?.amount || (notes.price * 100), // Amount in paise
        order_id: razorpayOrder?.id,
        name: BRAND.name,
        tutor: notes?.tutor || 'Unknown Tutor',
        category: notes?.category,
        class: notes?.class,
        prefill: {
          email: userData?.userEmail || '',
          contact: userData?.userPhone || '',
          name: userData?.userName || ''
        },
        theme: {
          color: BRAND.primaryColor
        },
        notes: {
          type: 'notes_purchase',
          notesId: notes?._id,
          studentId: userData.userId
        }
      };

      console.log('Opening Razorpay checkout via WebView for notes...');

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
    console.log('WebView message received for notes:', data);

    setShowWebView(false);

    if (data.success) {
      // Payment successful - process immediately
      const paymentResponse: PaymentResponse = {
        razorpay_order_id: data.razorpay_order_id,
        razorpay_payment_id: data.razorpay_payment_id,
        razorpay_signature: data.razorpay_signature,
      };
      
      // Don't set paymentProcessing to false here - let handlePaymentSuccess manage it
      handlePaymentSuccess(paymentResponse);
      
    } else {
      // Payment failed or cancelled
      setPaymentProcessing(false);
      
      if (data.error === 'cancelled') {
        Alert.alert(
          'Payment Cancelled',
          'You cancelled the payment. Your notes purchase is still pending.',
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

    console.log('Processing notes payment success...');
    console.log('Payment response:', {
      paymentId: paymentResponse.razorpay_payment_id,
      orderId: paymentResponse.razorpay_order_id,
      signature: paymentResponse.razorpay_signature ? 'Present' : 'Missing'
    });

    setPaymentProcessing(true); // Keep processing state

    // Enhanced verification payload with additional fields
    const verificationPayload = {
      purchaseId: purchase?._id,
      notesId: notes?._id,
      studentId: userData.userId,
      razorpay_order_id: paymentResponse.razorpay_order_id,
      razorpay_payment_id: paymentResponse.razorpay_payment_id,
      razorpay_signature: paymentResponse.razorpay_signature,
      // Add payment details for status update
      paymentDetails: {
        amount: razorpayOrder?.amount || (notes.price * 100),
        currency: razorpayOrder?.currency || 'INR',
        paymentMethod: 'razorpay',
        paymentStatus: 'completed' // Explicitly set status
      }
    };

    console.log('Sending notes payment verification request...');
    const verificationUrl = getApiUrl('/purchasedNotes/verify-payment');
    
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
      // Update local state immediately
      setPaymentProcessing(false);
      
      // Show success animation
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();

      // Wait for animation then proceed
      setTimeout(() => {
        Alert.alert(
          'Payment Successful! 📚',
          'Payment verified successfully!\nYou now have access to the notes.',
          [
            {
              text: 'View Notes',
              onPress: () => {
                // Call success callback with updated purchase data
                if (onPaymentSuccess) {
                  onPaymentSuccess({
                    ...result.data.purchase,
                    paymentStatus: 'completed',
                    purchaseStatus: 'completed'
                  });
                }
                
                // Navigate with success flag
                navigation.navigate('NotesViewer', { 
                  notesId: notes?._id,
                  notesTitle: notes?.notesTitle,
                  purchaseId: result.data.purchase._id,
                  paymentSuccess: true
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
    console.error('Notes payment verification error:', error);
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

  const handlePaymentFailure = (error: Error) => {
    console.error('Notes payment failure:', error);
    setPaymentProcessing(false);
    const errorMessage = error.message || 'An unknown error occurred';
    setNetworkError(errorMessage);
    
    Alert.alert(
      'Payment Failed',
      errorMessage,
      [
        { text: 'Retry', onPress: () => initializeRazorpay() },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  // Render WebView for Razorpay
  const renderWebView = () => {
    if (!showWebView) return null;

    return (
      <View style={styles.webViewContainer}>
        <StatusBar backgroundColor={BRAND.backgroundColor} barStyle="light-content" />
        <SafeAreaView style={styles.webViewSafeArea}>
          <View style={styles.webViewHeader}>
            <TouchableOpacity 
              style={styles.webViewBackButton} 
              onPress={() => {
                setShowWebView(false);
                setPaymentProcessing(false);
              }}
            >
              <Text style={styles.webViewBackText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.webViewTitle}>Complete Payment</Text>
            <View style={styles.webViewPlaceholder} />
          </View>
          <WebView
            source={{ html: razorpayHtml }}
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
            onError={(error) => {
              console.error('WebView error:', error);
              Alert.alert('Error', 'Failed to load payment gateway');
              setShowWebView(false);
            }}
          />
        </SafeAreaView>
      </View>
    );
  };

  // Main render
  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={BRAND.backgroundColor} barStyle="light-content" />
      
      {showWebView ? renderWebView() : (
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
          <SafeAreaView style={styles.safeArea}>
            <ScrollView 
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Header */}
              <View style={styles.header}>
                <TouchableOpacity 
                  style={styles.backButton} 
                  onPress={handleBackPress}
                >
                  <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Purchase Notes</Text>
                <View style={styles.timerContainer}>
                  <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
                </View>
              </View>

              {/* Notes Info Card */}
              <Animated.View 
                style={[styles.notesCard, { transform: [{ scale: pulseAnim }] }]}
              >
                <Image 
                  source={getImageSource()} 
                  style={styles.notesImage}
                  resizeMode="cover"
                />
                <View style={styles.notesInfo}>
                  <Text style={styles.notesTitle}>{notes.notesTitle}</Text>
                  <Text style={styles.tutorName}>by {notes.tutor}</Text>
                  
                  {notes.category && (
                    <Text style={styles.categoryText}>📂 {notes.category}</Text>
                  )}
                  
                  {notes.class && (
                    <Text style={styles.classText}>🎓 Class {notes.class}</Text>
                  )}
                  
                  {notes.description && (
                    <Text style={styles.descriptionText} numberOfLines={3}>
                      {notes.description}
                    </Text>
                  )}
                </View>
              </Animated.View>

              {/* Price Section */}
              <View style={styles.priceSection}>
                <Text style={styles.priceLabel}>Total Amount</Text>
                <Text style={styles.priceAmount}>
                  {notes.price === 0 ? 'FREE' : `₹${notes.price.toFixed(2)}`}
                </Text>
                {notes.price > 0 && (
                  <Text style={styles.priceNote}>One-time payment • Lifetime access</Text>
                )}
              </View>

              {/* Payment Features */}
              <View style={styles.featuresSection}>
                <Text style={styles.featuresTitle}>What you get:</Text>
                <View style={styles.featuresList}>
                  <View style={styles.featureItem}>
                    <Text style={styles.featureIcon}>📄</Text>
                    <Text style={styles.featureText}>All PDF materials</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Text style={styles.featureIcon}>⬇️</Text>
                    <Text style={styles.featureText}>Download for offline reading</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Text style={styles.featureIcon}>🔄</Text>
                    <Text style={styles.featureText}>Regular updates</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Text style={styles.featureIcon}>💬</Text>
                    <Text style={styles.featureText}>Direct tutor support</Text>
                  </View>
                </View>
              </View>

              {/* Network Error Display */}
              {networkError && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorIcon}>⚠️</Text>
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
              )}

              {/* Payment Progress */}
              {paymentProcessing && (
                <Animated.View 
                  style={[styles.progressContainer, { opacity: progressAnim }]}
                >
                  <ActivityIndicator size="large" color={BRAND.primaryColor} />
                  <Text style={styles.progressText}>Processing your payment...</Text>
                  <Text style={styles.progressSubText}>Please don't close this screen</Text>
                </Animated.View>
              )}

              {/* Payment Button */}
              <TouchableOpacity
                style={[
                  styles.paymentButton,
                  (loading || paymentProcessing) && styles.paymentButtonDisabled
                ]}
                onPress={initializeRazorpay}
                disabled={loading || paymentProcessing || timeLeft <= 0}
              >
                {paymentProcessing ? (
                  <View style={styles.paymentButtonContent}>
                    <ActivityIndicator size="small" color={BRAND.backgroundColor} />
                    <Text style={styles.paymentButtonText}>Processing...</Text>
                  </View>
                ) : (
                  <Text style={styles.paymentButtonText}>
                    {notes.price === 0 ? 'Access Free Notes' : `Pay ₹${notes.price.toFixed(2)}`}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Security Info */}
              <View style={styles.securityInfo}>
                <Text style={styles.securityIcon}>🔒</Text>
                <Text style={styles.securityText}>
                  Secure payment powered by Razorpay • 256-bit SSL encryption
                </Text>
              </View>

              {/* Terms and Conditions */}
              <View style={styles.termsSection}>
                <Text style={styles.termsText}>
                  By proceeding with the payment, you agree to our Terms of Service and Privacy Policy.
                </Text>
              </View>

              {/* Footer Spacing */}
              <View style={styles.footerSpacing} />
            </ScrollView>
          </SafeAreaView>
        </Animated.View>
      )}
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND.backgroundColor,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.accentColor,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BRAND.accentColor,
    borderRadius: 20,
  },
  backButtonText: {
    color: BRAND.primaryColor,
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: BRAND.primaryColor,
    fontSize: 18,
    fontWeight: 'bold',
  },
  timerContainer: {
    backgroundColor: BRAND.errorColor,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  timerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  notesCard: {
    margin: 20,
    backgroundColor: BRAND.accentColor,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: BRAND.primaryColor,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: BRAND.primaryColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  notesImage: {
    width: '100%',
    height: 180,
  },
  notesInfo: {
    padding: 20,
  },
  notesTitle: {
    color: BRAND.primaryColor,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  tutorName: {
    color: '#ccc',
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 10,
  },
  categoryText: {
    color: BRAND.primaryColor,
    fontSize: 12,
    marginBottom: 5,
  },
  classText: {
    color: BRAND.primaryColor,
    fontSize: 12,
    marginBottom: 10,
  },
  descriptionText: {
    color: '#999',
    fontSize: 14,
    lineHeight: 20,
  },
  priceSection: {
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    backgroundColor: BRAND.accentColor,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: BRAND.primaryColor,
  },
  priceLabel: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 5,
  },
  priceAmount: {
    color: BRAND.primaryColor,
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  priceNote: {
    color: '#999',
    fontSize: 12,
    textAlign: 'center',
  },
  featuresSection: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  featuresTitle: {
    color: BRAND.primaryColor,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  featuresList: {
    backgroundColor: BRAND.accentColor,
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: BRAND.primaryColor,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureIcon: {
    fontSize: 16,
    marginRight: 10,
    width: 20,
  },
  featureText: {
    color: '#ccc',
    fontSize: 14,
    flex: 1,
  },
  errorContainer: {
    margin: 20,
    padding: 20,
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: BRAND.errorColor,
    alignItems: 'center',
  },
  errorIcon: {
    fontSize: 24,
    marginBottom: 10,
  },
  errorText: {
    color: BRAND.errorColor,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 15,
  },
  retryButton: {
    backgroundColor: BRAND.errorColor,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  progressContainer: {
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    backgroundColor: BRAND.accentColor,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: BRAND.primaryColor,
  },
  progressText: {
    color: BRAND.primaryColor,
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
  },
  progressSubText: {
    color: '#999',
    fontSize: 12,
    marginTop: 5,
  },
  paymentButton: {
    margin: 20,
    backgroundColor: BRAND.primaryColor,
    paddingVertical: 18,
    borderRadius: 15,
    alignItems: 'center',
    elevation: 3,
    shadowColor: BRAND.primaryColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  paymentButtonDisabled: {
    backgroundColor: '#666',
    elevation: 0,
    shadowOpacity: 0,
  },
  paymentButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentButtonText: {
    color: BRAND.backgroundColor,
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginBottom: 15,
  },
  securityIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  securityText: {
    color: '#999',
    fontSize: 12,
    textAlign: 'center',
  },
  termsSection: {
    marginHorizontal: 20,
    marginBottom: 10,
  },
  termsText: {
    color: '#666',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  footerSpacing: {
    height: 40,
  },

  // WebView Styles
  webViewContainer: {
    flex: 1,
    backgroundColor: BRAND.backgroundColor,
  },
  webViewSafeArea: {
    flex: 1,
  },
  webViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: BRAND.accentColor,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.primaryColor,
  },
  webViewBackButton: {
    padding: 10,
  },
  webViewBackText: {
    color: BRAND.primaryColor,
    fontSize: 16,
    fontWeight: 'bold',
  },
  webViewTitle: {
    color: BRAND.primaryColor,
    fontSize: 18,
    fontWeight: 'bold',
  },
  webViewPlaceholder: {
    width: 60,
  },
  webViewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: BRAND.backgroundColor,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webViewLoadingText: {
    color: BRAND.primaryColor,
    fontSize: 16,
    marginTop: 10,
  },
});

export default NotesPaymentScreen;