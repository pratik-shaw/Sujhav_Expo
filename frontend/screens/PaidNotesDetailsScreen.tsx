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
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  Share,
  Linking,
  Platform,
} from 'react-native';
import { NavigationProp, RouteProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '../config/api';
import SignupLoginBanner from '../components/SignupLoginBanner';

const { width, height } = Dimensions.get('window');

// Types
interface RouteParams { notesId: string; }
interface RootStackParamList extends Record<string, object | undefined> {
  PaidNotesDetails: RouteParams;
  NotesPaymentScreen: { purchase: PurchaseData; razorpayOrder: RazorpayOrder; notes: NotesData; onPaymentSuccess: (paymentData: any) => void; };
}

interface NotesData {
  _id: string; notesTitle: string; tutor: string; rating: number; price: number;
  category: 'jee' | 'neet' | 'boards'; class: string;
  notesDetails: { subtitle: string; description: string; };
  pdfs: Array<{ _id: string; pdfTitle: string; pdfDescription: string; originalName: string; fileSize: number; pages: number; }>;
  thumbnail?: { data?: string; contentType?: string; mimeType?: string; originalName?: string; size?: number; };
  viewCount: number; isActive: boolean; createdAt: string; updatedAt: string;
  type: 'paid' | 'free'; description?: string;
}

interface PdfItem { _id: string; pdfTitle: string; pdfDescription: string; originalName: string; fileSize: number; pages: number; }
interface PurchaseData { _id: string; studentId: string; notesId: string; purchaseStatus: 'pending' | 'completed' | 'failed' | 'cancelled'; paymentStatus: 'pending' | 'completed' | 'failed'; paymentDetails: { razorpayOrderId?: string; amount: number; currency: string; }; }
interface RazorpayOrder { id: string; amount: number; currency: string; receipt?: string; }
interface UserData { id: string; email: string; name: string; token: string; role?: string; }
interface PaidNotesDetailsScreenProps { navigation: NavigationProp<RootStackParamList>; route: RouteProp<RootStackParamList, 'PaidNotesDetails'>; }

// Brand configuration (same as unpaid notes)
const BRAND = {
  name: "SUJHAV",
  subtitle: "Synchronize your Understanding, do Justice to your Hardwork and let others Admire your Victory!",
  primaryColor: '#00ff88',
  secondaryColor: '#000000',
  backgroundColor: '#0a1a0a',
  accentColor: '#1a2e1a',
  priceColor: '#ffd700',
};

const PaidNotesDetailsScreen: React.FC<PaidNotesDetailsScreenProps> = ({ navigation, route }) => {
  const notesId = route.params?.notesId;
  
  // State
  const [notesData, setNotesData] = useState<NotesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pdfModalVisible, setPdfModalVisible] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState<PdfItem | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [purchaseData, setPurchaseData] = useState<PurchaseData | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [showLoginBanner, setShowLoginBanner] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  // Animation refs (same as unpaid notes)
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-20)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  const API_BASE_URL = API_BASE;

  // Auth check
  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userRole = await AsyncStorage.getItem('userRole');
      const userId = await AsyncStorage.getItem('userId');
      const userName = await AsyncStorage.getItem('userName');
      const storedUserData = await AsyncStorage.getItem('userData');
      
      if (token && userId && userName) {
        let parsedUserData = null;
        if (storedUserData) {
          try { parsedUserData = JSON.parse(storedUserData); } catch (e) { console.error('Error parsing stored user data:', e); }
        }
        
        const userDataObj: UserData = {
          id: userId, name: userName, email: parsedUserData?.email || '', token: token, role: userRole || 'user'
        };
        
        setUserData(userDataObj);
        setIsLoggedIn(true);
        return true;
      } else {
        setIsLoggedIn(false);
        return false;
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setIsLoggedIn(false);
      return false;
    }
  };

  // Initialize
  useEffect(() => {
    if (!notesId) {
      Alert.alert('Error', 'Notes ID is required');
      navigation.goBack();
      return;
    }
    fetchNotesDetails();
    checkAuthStatus();
    startEntranceAnimation();
  }, [notesId]);

  useEffect(() => {
    if (isLoggedIn && userData && notesData) checkNotesAccess();
  }, [isLoggedIn, userData, notesData]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => checkAuthStatus());
    return unsubscribe;
  }, [navigation]);

  // Fetch data
  const fetchNotesDetails = async () => {
    if (!notesId) return;
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/paidNotes/${notesId}`);
      if (!response.ok) throw new Error('Failed to fetch notes details');
      
      const data = await response.json();
      if (data.success) {
        const notesWithRequiredFields: NotesData = {
          ...data.data,
          type: data.data.price === 0 ? 'free' : 'paid',
          description: data.data.notesDetails?.description || data.data.notesDetails?.subtitle || '',
        };
        setNotesData(notesWithRequiredFields);
        incrementViewCount();
      } else {
        throw new Error(data.message || 'Failed to fetch notes details');
      }
    } catch (error) {
      console.error('Error fetching notes details:', error);
      Alert.alert('Error', 'Failed to load notes details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const checkNotesAccess = async () => {
    if (!notesId || !userData) return;
    try {
      const response = await fetch(`${API_BASE_URL}/purchasedNotes/access/${notesId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userData.token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setHasAccess(data.hasAccess);
        if (data.purchase) setPurchaseData(data.purchase);
      } else if (response.status === 401) {
        await AsyncStorage.multiRemove(['userToken', 'userRole', 'userId', 'userName', 'userData']);
        setIsLoggedIn(false);
        setUserData(null);
        setHasAccess(false);
      }
    } catch (error) {
      console.error('Error checking notes access:', error);
    }
  };

  const incrementViewCount = async () => {
    if (!notesId) return;
    try {
      await fetch(`${API_BASE_URL}/paidNotes/${notesId}/view`, { method: 'POST' });
    } catch (error) {
      console.error('Error incrementing view count:', error);
    }
  };

  // Handlers
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotesDetails();
    if (userData) await checkNotesAccess();
    setRefreshing(false);
  };

  const handlePdfPress = async (pdf: PdfItem) => {
    console.log('PDF pressed, checking access...');
    
    if (!hasAccess) {
      console.log('User does not have access, initiating purchase flow');
      Alert.alert('🔒 Access Required', `You need to ${notesData?.price === 0 ? 'get' : 'purchase'} these notes to access the PDFs.`,
        [{ text: 'Cancel', style: 'cancel' }, { text: notesData?.price === 0 ? 'Get Now' : 'Buy Now', onPress: handlePurchase, style: 'default' }]);
      return;
    }

    // If has access, show the PDF modal
    setSelectedPdf(pdf);
    setPdfModalVisible(true);
  };

  // Updated handlePdfDownload function for React Native
const handlePdfDownload = async (pdf: PdfItem) => {
  if (!notesId || !hasAccess || !userData) {
    Alert.alert('Error', 'You need access to these notes to view PDFs');
    return;
  }
  
  try {
    setDownloadingPdf(pdf._id);
    console.log('🔍 Opening PDF:', pdf.pdfTitle);
    
    // Construct the PDF URL with token parameter
    const pdfUrl = `${API_BASE_URL}/purchasedNotes/${notesId}/pdfs/${pdf._id}/view?token=${encodeURIComponent(userData.token)}`;
    console.log('📄 PDF URL:', pdfUrl);
    
    // Try to open the PDF URL
    const canOpen = await Linking.canOpenURL(pdfUrl);
    console.log('🔗 Can open URL:', canOpen);
    
    if (canOpen) {
      await Linking.openURL(pdfUrl);
      console.log('✅ PDF opened successfully');
      setPdfModalVisible(false); // Close modal on success
    } else {
      throw new Error('Cannot open PDF URL');
    }
    
  } catch (error) {
    console.error('❌ Error opening PDF:', error);
    
    // Show user-friendly options
    Alert.alert(
      'Open PDF',
      'Choose how to access the PDF:',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Open in Browser', 
          onPress: async () => {
            try {
              const browserUrl = `${API_BASE_URL}/purchasedNotes/${notesId}/pdfs/${pdf._id}/view?token=${encodeURIComponent(userData.token)}`;
              await Linking.openURL(browserUrl);
            } catch (e) {
              console.error('Browser open failed:', e);
              Alert.alert('Error', 'Could not open PDF in browser');
            }
          }
        },
        {
          text: 'Copy Link',
          onPress: () => {
            const urlWithToken = `${API_BASE_URL}/purchasedNotes/${notesId}/pdfs/${pdf._id}/view?token=${encodeURIComponent(userData.token)}`;
            
            // If you have @react-native-clipboard/clipboard installed:
            // import Clipboard from '@react-native-clipboard/clipboard';
            // Clipboard.setString(urlWithToken);
            // Alert.alert('Copied!', 'PDF link copied to clipboard');
            
            // For now, just show the URL
            Alert.alert('PDF Link', `Copy this link:\n\n${urlWithToken}`, [
              { text: 'OK' }
            ]);
          }
        }
      ]
    );
  } finally {
    setDownloadingPdf(null);
  }
};

// Alternative function to test PDF access directly
const testPDFAccess = async (pdf: PdfItem) => {
  if (!notesId || !userData) {
    console.log('❌ Missing required data for PDF test');
    return;
  }
  
  try {
    console.log('🧪 Testing PDF access...');
    
    // Test with fetch first to see if the endpoint responds
    const testUrl = `${API_BASE_URL}/purchasedNotes/${notesId}/pdfs/${pdf._id}/view`;
    const response = await fetch(testUrl, {
      method: 'HEAD', // Just check headers, don't download content
      headers: {
        'Authorization': `Bearer ${userData.token}`,
      },
    });
    
    console.log('📡 PDF Test Response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });
    
    if (response.ok) {
      console.log('✅ PDF access test successful - opening URL');
      const pdfUrl = `${testUrl}?token=${encodeURIComponent(userData.token)}`;
      await Linking.openURL(pdfUrl);
    } else {
      console.log('❌ PDF access test failed');
      Alert.alert('Access Denied', `Status: ${response.status} - ${response.statusText}`);
    }
    
  } catch (error) {
    console.error('🧪 PDF Test Error:', error);
    Alert.alert('Test Failed', `Error: `);
  }
};


  const handlePurchase = async () => {
    if (!notesId || !notesData) {
      Alert.alert('Error', 'Notes data not available');
      return;
    }

    const isAuthenticated = await checkAuthStatus();
    if (!isAuthenticated || !userData) {
      setShowLoginBanner(true);
      return;
    }

    if (hasAccess) {
      Alert.alert('✅ Already Purchased', 'You already have access to these notes.', [{ text: 'OK' }]);
      return;
    }
    
    try {
      setPurchasing(true);
      const response = await fetch(`${API_BASE_URL}/purchasedNotes/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userData.token}` },
        body: JSON.stringify({ notesId: notesId })
      });
      
      const responseText = await response.text();
      
      if (responseText.trim().startsWith('<')) {
        if (response.status === 404) {
          Alert.alert('Error', 'API endpoint not found. Please check if the server is running.');
          return;
        } else if (response.status === 500) {
          Alert.alert('Error', 'Server error occurred. Please try again later.');
          return;
        } else {
          Alert.alert('Error', 'Unexpected server response. Please try again.');
          return;
        }
      }
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        Alert.alert('Error', 'Invalid response from server. Please try again later.');
        return;
      }
      
      if (response.ok) {
        if (data.success) {
          if (notesData.price === 0) {
            Alert.alert('🎉 Success!', 'Successfully acquired the free notes!',
              [{ text: 'View PDFs', onPress: () => { setHasAccess(true); setPurchaseData(data.purchase); } }]);
          } else {
            if (data.razorpayOrder && data.purchase) {
              const enhancedPurchase: PurchaseData = { ...data.purchase, studentId: data.purchase.studentId || userData.id, notesId: data.purchase.notesId || notesId };
              const enhancedRazorpayOrder: RazorpayOrder = { ...data.razorpayOrder, receipt: data.razorpayOrder.receipt || `receipt_${Date.now()}` };
              handlePayment(enhancedPurchase, enhancedRazorpayOrder);
            } else {
              Alert.alert('Error', 'Failed to initialize payment - missing payment data');
            }
          }
        } else {
          Alert.alert('Error', data.message || 'Failed to purchase notes');
        }
      } else {
        if (response.status === 401) {
          await AsyncStorage.multiRemove(['userToken', 'userRole', 'userId', 'userName', 'userData']);
          setIsLoggedIn(false);
          setUserData(null);
          setShowLoginBanner(true);
          Alert.alert('Session Expired', 'Your session has expired. Please sign in again.', [{ text: 'OK' }]);
          return;
        }
        Alert.alert('Error', data.message || `Request failed with status ${response.status}`);
      }
    } catch (error) {
      console.error('Network/Fetch error:', error);
      if (error instanceof TypeError && error.message.includes('Network request failed')) {
        Alert.alert('Connection Error', 'Unable to connect to the server. Please check your internet connection.',
          [{ text: 'Retry', onPress: () => handlePurchase() }, { text: 'Cancel', style: 'cancel' }]);
      } else {
        const errorMessage = (error instanceof Error && error.message) ? error.message : 'An unexpected error occurred. Please try again.';
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handlePayment = (purchase: PurchaseData, razorpayOrder: RazorpayOrder) => {
    if (!notesData) {
      Alert.alert('Error', 'Notes data not available');
      return;
    }

    if (!purchase._id || !purchase.studentId || !purchase.notesId) {
      console.error('Purchase data validation failed:', purchase);
      Alert.alert('Error', 'Invalid purchase data. Please try again.');
      return;
    }

    if (!razorpayOrder.id || !razorpayOrder.amount) {
      console.error('Razorpay order validation failed:', razorpayOrder);
      Alert.alert('Error', 'Invalid payment order. Please try again.');
      return;
    }

    Alert.alert('💳 Payment Required', `This note costs ₹${notesData?.price}. You will be redirected to the payment gateway.`,
      [{ text: 'Cancel', style: 'cancel' }, { 
        text: 'Pay Now', 
        onPress: () => {
          navigation.navigate('NotesPaymentScreen', {
            purchase: purchase, razorpayOrder: razorpayOrder, notes: notesData, onPaymentSuccess: handlePaymentSuccess
          });
        }
      }]);
  };

  const handlePaymentSuccess = async (paymentData: any) => {
    try {
      const response = await fetch(`${API_BASE_URL}/purchasedNotes/verify-payment`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${userData?.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchaseId: paymentData.purchaseId || paymentData._id,
          razorpay_order_id: paymentData.razorpay_order_id,
          razorpay_payment_id: paymentData.razorpay_payment_id,
          razorpay_signature: paymentData.razorpay_signature,
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setHasAccess(true);
        setPurchaseData(data.purchase);
        Alert.alert('🎉 Payment Successful!', 'Your payment has been verified and you now have access to these notes.',
          [{ text: 'View PDFs', onPress: () => checkNotesAccess() }]);
      } else {
        throw new Error(data.message || 'Payment verification failed');
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      Alert.alert('Error', 'Payment verification failed. Please contact support.');
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `📚 Check out these notes: ${notesData?.notesTitle} by ${notesData?.tutor}\n💰 Only ₹${notesData?.price}\n🎯 Category: ${notesData?.category.toUpperCase()}\n\nGet it on ${BRAND.name}!`,
        title: `${notesData?.notesTitle} - ${BRAND.name}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  // Handle back button
  const handleBackPress = () => {
    navigation.goBack();
  };

  // Close login banner
  const handleCloseBanner = () => {
    setShowLoginBanner(false);
  };

  // Utility functions
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatPrice = (price: number) => price === 0 ? 'FREE' : `₹${price.toLocaleString()}`;

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'jee': return '#ff6b6b';
      case 'neet': return '#4ecdc4';
      case 'boards': return '#45b7d1';
      default: return BRAND.primaryColor;
    }
  };

  const getRatingStars = (rating: number) => '⭐'.repeat(Math.floor(rating)) + (rating % 1 >= 0.5 ? '⭐' : '');

  // Get thumbnail source
  const getThumbnailSource = () => {
    if (!notesId) {
      return { uri: 'https://via.placeholder.com/400x300/1a2e1a/00ff88?text=No+Image' };
    }
    if (notesData?.thumbnail?.data && notesData?.thumbnail?.contentType) {
      return { uri: `data:${notesData.thumbnail.contentType};base64,${notesData.thumbnail.data}` };
    }
    return { uri: `${API_BASE_URL}/paidNotes/${notesId}/thumbnail` };
  };

  // Animation function (same as unpaid notes)
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

    // Content fade in
    setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    }, 600);
  };

  // Render PDF item (same as unpaid notes but with access check)
  const renderPdfItem = (pdf: PdfItem, index: number) => (
    <TouchableOpacity
      key={pdf._id}
      style={[styles.pdfItem, !hasAccess && styles.pdfItemLocked]}
      onPress={() => handlePdfPress(pdf)}
      activeOpacity={0.7}
    >
      <View style={styles.pdfIcon}>
        <Text style={styles.pdfIconText}>📄</Text>
        {!hasAccess && <Text style={styles.lockIcon}>🔒</Text>}
      </View>
      
      <View style={styles.pdfInfo}>
        <Text style={[styles.pdfTitle, !hasAccess && styles.textLocked]} numberOfLines={2}>
          {pdf.pdfTitle}
        </Text>
        <Text style={[styles.pdfDescription, !hasAccess && styles.textLocked]} numberOfLines={2}>
          {pdf.pdfDescription}
        </Text>
        <View style={styles.pdfMeta}>
          <Text style={styles.pdfMetaText}>
            {formatFileSize(pdf.fileSize)} • {pdf.pages} pages
          </Text>
        </View>
      </View>
      
      <TouchableOpacity
        style={styles.downloadButton}
        onPress={() => hasAccess ? handlePdfDownload(pdf) : handlePdfPress(pdf)}
        disabled={downloadingPdf === pdf._id}
      >
        <Text style={styles.downloadButtonText}>
          {downloadingPdf === pdf._id ? '⏳' : hasAccess ? '📥' : '🔒'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  // Early return if notesId is not available
  if (!notesId) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={BRAND.backgroundColor} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Invalid notes ID</Text>
          <TouchableOpacity style={styles.errorBackButton} onPress={handleBackPress}>
            <Text style={styles.errorBackButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={BRAND.backgroundColor} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading notes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!notesData) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={BRAND.backgroundColor} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Notes not found</Text>
          <TouchableOpacity style={styles.errorBackButton} onPress={fetchNotesDetails}>
            <Text style={styles.errorBackButtonText}>Retry</Text>
          </TouchableOpacity>
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
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackPress}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Notes Details</Text>
          </View>
          
          <TouchableOpacity
            style={styles.shareButton}
            onPress={handleShare}
            activeOpacity={0.7}
          >
            <Text style={styles.shareButtonText}>📤</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Content */}
      <Animated.View style={[styles.contentContainer, { opacity: fadeAnim }]}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[BRAND.primaryColor]}
              tintColor={BRAND.primaryColor}
            />
          }
        >
          {/* Thumbnail */}
          <View style={styles.thumbnailContainer}>
            <Image
              source={getThumbnailSource()}
              style={styles.thumbnail}
              resizeMode="cover"
            />
            <View style={styles.thumbnailOverlay}>
              <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(notesData.category) }]}>
                <Text style={styles.categoryBadgeText}>{notesData.category.toUpperCase()}</Text>
              </View>
              <View style={[styles.typeBadge, notesData.price === 0 ? styles.freeBadge : styles.paidBadge]}>
                <Text style={styles.typeBadgeText}>{notesData.price === 0 ? 'FREE' : 'PAID'}</Text>
              </View>
              {hasAccess && (
                <View style={styles.accessBadge}>
                  <Text style={styles.accessBadgeText}>✅ OWNED</Text>
                </View>
              )}
            </View>
            {notesData.price > 0 && (
              <View style={styles.priceOverlay}>
                <Text style={styles.priceText}>₹{notesData.price}</Text>
              </View>
            )}
          </View>

          {/* Notes Header */}
          <View style={styles.notesHeader}>
            <Text style={styles.notesTitle}>{notesData.notesTitle}</Text>
            <Text style={styles.notesSubtitle}>{notesData.notesDetails.subtitle}</Text>
            
            <View style={styles.notesMeta}>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Tutor:</Text>
                <Text style={styles.metaValue}>{notesData.tutor}</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Category:</Text>
                <Text style={styles.metaValue}>{notesData.category.toUpperCase()}</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Class:</Text>
                <Text style={styles.metaValue}>{notesData.class}</Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>⭐ {notesData.rating}</Text>
                <Text style={styles.statLabel}>Rating</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{notesData.pdfs.length}</Text>
                <Text style={styles.statLabel}>PDFs</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{notesData.viewCount}</Text>
                <Text style={styles.statLabel}>Views</Text>
              </View>
            </View>
          </View>

          {/* Description */}
          <View style={styles.descriptionSection}>
            <Text style={styles.sectionTitle}>About these Notes</Text>
            <Text style={styles.descriptionText}>{notesData.notesDetails.description}</Text>
          </View>

          {/* Purchase Notice Section */}
          {!hasAccess && (
            <View style={styles.purchaseNoticeSection}>
              <View style={styles.purchaseNoticeContainer}>
                <Text style={styles.purchaseNoticeIcon}>💰</Text>
                <View style={styles.purchaseNoticeContent}>
                  <Text style={styles.purchaseNoticeTitle}>
                    {notesData.price === 0 ? 'Get Free Access' : 'Purchase Required'}
                  </Text>
                  <Text style={styles.purchaseNoticeText}>
                    {notesData.price === 0 
                      ? 'Sign in to access these free notes and download all PDFs'
                      : `Purchase these notes for ₹${notesData.price} to access all PDFs`
                    }
                  </Text>
                </View>
              </View>
              <TouchableOpacity
  style={[styles.purchaseNoticeButton, purchasing && styles.purchaseNoticeButtonDisabled]}
  onPress={handlePurchase}
  disabled={purchasing}
>
  <Text style={styles.purchaseNoticeButtonText}>
    {purchasing 
      ? '⏳ Processing...' 
      : notesData.price === 0 
        ? '🎉 Get Now (Free)' 
        : `💳 Buy Now - ₹${notesData.price}`
    }
  </Text>
</TouchableOpacity>
            </View>
          )}

          {/* PDFs Section */}
          <View style={styles.pdfsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>PDF Contents</Text>
              <View style={styles.pdfCount}>
                <Text style={styles.pdfCountText}>{notesData.pdfs.length} PDFs</Text>
              </View>
            </View>
            
            {notesData.pdfs.map((pdf, index) => renderPdfItem(pdf, index))}
          </View>

          {/* Additional Info */}
          <View style={styles.additionalInfo}>
            <Text style={styles.additionalInfoTitle}>📋 Additional Information</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Created:</Text>
              <Text style={styles.infoValue}>{formatDate(notesData.createdAt)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Last Updated:</Text>
              <Text style={styles.infoValue}>{formatDate(notesData.updatedAt)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status:</Text>
              <Text style={[styles.infoValue, { color: notesData.isActive ? BRAND.primaryColor : '#ff6b6b' }]}>
                {notesData.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>

          {/* Bottom Spacing */}
          <View style={styles.bottomSpacing} />
        </ScrollView>
      </Animated.View>

      {/* PDF Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={pdfModalVisible}
        onRequestClose={() => setPdfModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>PDF Details</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setPdfModalVisible(false)}
              >
                <Text style={styles.modalCloseButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            {selectedPdf && (
              <View style={styles.modalContent}>
                <Text style={styles.modalPdfTitle}>{selectedPdf.pdfTitle}</Text>
                <Text style={styles.modalPdfDescription}>{selectedPdf.pdfDescription}</Text>
                
                <View style={styles.modalPdfMeta}>
                  <View style={styles.modalMetaItem}>
                    <Text style={styles.modalMetaLabel}>File Size:</Text>
                    <Text style={styles.modalMetaValue}>{formatFileSize(selectedPdf.fileSize)}</Text>
                  </View>
                  <View style={styles.modalMetaItem}>
                    <Text style={styles.modalMetaLabel}>Pages:</Text>
                    <Text style={styles.modalMetaValue}>{selectedPdf.pages}</Text>
                  </View>
                  <View style={styles.modalMetaItem}>
                    <Text style={styles.modalMetaLabel}>Original Name:</Text>
                    <Text style={styles.modalMetaValue}>{selectedPdf.originalName}</Text>
                  </View>
                </View>
                
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={() => setPdfModalVisible(false)}
                  >
                    <Text style={styles.modalCancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.modalDownloadButton, downloadingPdf === selectedPdf._id && styles.modalDownloadButtonDisabled]}
                    onPress={() => handlePdfDownload(selectedPdf)}
                    disabled={downloadingPdf === selectedPdf._id}
                  >
                    <Text style={styles.modalDownloadButtonText}>
                      {downloadingPdf === selectedPdf._id ? '⏳ Downloading...' : '📥 Download & Open'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Signup/Login Banner */}
{showLoginBanner && (
  <SignupLoginBanner 
    navigation={navigation} 
    onClose={handleCloseBanner} 
  />
)}
    

      {/* Floating Purchase Button (for mobile convenience) */}
      {!hasAccess && (
        <View style={styles.floatingButtonContainer}>
          <TouchableOpacity
            style={[styles.floatingPurchaseButton, purchasing && styles.floatingPurchaseButtonDisabled]}
            onPress={handlePurchase}
            disabled={purchasing}
            activeOpacity={0.8}
          >
            <Text style={styles.floatingPurchaseButtonText}>
              {purchasing 
                ? '⏳' 
                : notesData.price === 0 
                  ? '🎉 Get Free' 
                  : `💳 ₹${notesData.price}`
              }
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

// Styles
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
    zIndex: -1,
  },
  
  glowCircle: {
    position: 'absolute',
    borderRadius: 1000,
    backgroundColor: BRAND.primaryColor,
  },
  
  glowCircle1: {
    width: width * 1.5,
    height: width * 1.5,
    top: -width * 0.75,
    left: -width * 0.25,
  },
  
  glowCircle2: {
    width: width * 1.2,
    height: width * 1.2,
    bottom: -width * 0.6,
    right: -width * 0.1,
  },
  
  headerSection: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  backButtonText: {
    color: BRAND.primaryColor,
    fontSize: 24,
    fontWeight: 'bold',
  },
  
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  
  shareButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  shareButtonText: {
    fontSize: 20,
  },
  
  contentContainer: {
    flex: 1,
  },
  
  scrollView: {
    flex: 1,
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  loadingText: {
    color: BRAND.primaryColor,
    fontSize: 18,
    fontWeight: '600',
  },
  
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  
  errorText: {
    color: '#ff6b6b',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  
  errorBackButton: {
    backgroundColor: BRAND.primaryColor,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  
  errorBackButtonText: {
    color: BRAND.backgroundColor,
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  thumbnailContainer: {
    position: 'relative',
    margin: 20,
    marginBottom: 10,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: BRAND.accentColor,
  },
  
  thumbnail: {
    width: '100%',
    height: 200,
    backgroundColor: BRAND.accentColor,
  },
  
  thumbnailOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 15,
  },
  
  categoryBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 15,
  },
  
  freeBadge: {
    backgroundColor: '#4ecdc4',
  },
  
  paidBadge: {
    backgroundColor: '#ff9f43',
  },
  
  typeBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  accessBadge: {
    backgroundColor: BRAND.primaryColor,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 15,
  },
  
  accessBadgeText: {
    color: BRAND.backgroundColor,
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  priceOverlay: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: BRAND.priceColor,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  
  priceText: {
    color: BRAND.backgroundColor,
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  notesHeader: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  
  notesTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    lineHeight: 30,
  },
  
  notesSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    marginBottom: 20,
    lineHeight: 22,
  },
  
  notesMeta: {
    marginBottom: 20,
  },
  
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  
  metaLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    width: 80,
  },
  
  metaValue: {
    color: BRAND.primaryColor,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
  },
  
  statItem: {
    alignItems: 'center',
  },
  
  statValue: {
    color: BRAND.primaryColor,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  
  statLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
  },
  
  descriptionSection: {
    paddingHorizontal: 20,
    paddingBottom: 25,
  },
  
  sectionTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  
  descriptionText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    lineHeight: 24,
  },
  
  purchaseNoticeSection: {
    paddingHorizontal: 20,
    paddingBottom: 25,
  },
  
  purchaseNoticeContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 15,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  
  purchaseNoticeIcon: {
    fontSize: 30,
    marginRight: 15,
  },
  
  purchaseNoticeContent: {
    flex: 1,
  },
  
  purchaseNoticeTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  
  purchaseNoticeText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    lineHeight: 20,
  },
  
  purchaseNoticeButton: {
    backgroundColor: BRAND.primaryColor,
    borderRadius: 25,
    paddingVertical: 15,
    paddingHorizontal: 30,
    alignItems: 'center',
  },
  
  purchaseNoticeButtonDisabled: {
    backgroundColor: 'rgba(0, 255, 136, 0.5)',
  },
  
  purchaseNoticeButtonText: {
    color: BRAND.backgroundColor,
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  pdfsSection: {
    paddingHorizontal: 20,
    paddingBottom: 25,
  },
  
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  
  pdfCount: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 15,
  },
  
  pdfCountText: {
    color: BRAND.primaryColor,
    fontSize: 12,
    fontWeight: '600',
  },
  
  pdfItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  
  pdfItemLocked: {
    opacity: 0.6,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  
  pdfIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
    position: 'relative',
  },
  
  pdfIconText: {
    fontSize: 24,
  },
  
  lockIcon: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    fontSize: 14,
    backgroundColor: BRAND.backgroundColor,
    borderRadius: 10,
    padding: 1,
  },
  
  pdfInfo: {
    flex: 1,
    marginRight: 10,
  },
  
  pdfTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  
  pdfDescription: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginBottom: 6,
  },
  
  textLocked: {
    color: 'rgba(255, 255, 255, 0.4)',
  },
  
  pdfMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  pdfMetaText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
  },
  
  downloadButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  downloadButtonText: {
    fontSize: 18,
  },
  
  additionalInfo: {
    paddingHorizontal: 20,
    paddingBottom: 25,
  },
  
  additionalInfoTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  
  infoLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    width: 120,
  },
  
  infoValue: {
    color: 'white',
    fontSize: 14,
    flex: 1,
  },
  
  bottomSpacing: {
    height: 100,
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  
  modalContainer: {
    backgroundColor: BRAND.backgroundColor,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    maxHeight: height * 0.7,
  },
  
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  
  modalTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  modalCloseButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  
  modalContent: {
    padding: 20,
  },
  
  modalPdfTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  
  modalPdfDescription: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    marginBottom: 20,
    lineHeight: 22,
  },
  
  modalPdfMeta: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 25,
  },
  
  modalMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  
  modalMetaLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    width: 100,
  },
  
  modalMetaValue: {
    color: BRAND.primaryColor,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  
  modalCancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 25,
    paddingVertical: 15,
    alignItems: 'center',
  },
  
  modalCancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  
  modalDownloadButton: {
    flex: 2,
    backgroundColor: BRAND.primaryColor,
    borderRadius: 25,
    paddingVertical: 15,
    alignItems: 'center',
  },
  
  modalDownloadButtonDisabled: {
    backgroundColor: 'rgba(0, 255, 136, 0.5)',
  },
  
  modalDownloadButtonText: {
    color: BRAND.backgroundColor,
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // Floating Button
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    zIndex: 1000,
  },
  
  floatingPurchaseButton: {
    backgroundColor: BRAND.primaryColor,
    borderRadius: 30,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  
  floatingPurchaseButtonDisabled: {
    backgroundColor: 'rgba(0, 255, 136, 0.5)',
  },
  
  floatingPurchaseButtonText: {
    color: BRAND.backgroundColor,
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default PaidNotesDetailsScreen;