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
} from 'react-native';
import { NavigationProp, RouteProp } from '@react-navigation/native';
import { API_BASE } from '../config/api';

// Define the route params type
interface RouteParams {
  notesId: string;
}

// Define the navigation stack param list
interface RootStackParamList extends Record<string, object | undefined> {
  PaidNotesDetails: RouteParams;
}

interface PaidNotesDetailsScreenProps {
  navigation: NavigationProp<RootStackParamList>;
  route: RouteProp<RootStackParamList, 'PaidNotesDetails'>;
}

interface NotesData {
  _id: string;
  notesTitle: string;
  tutor: string;
  rating: number;
  price: number;
  category: 'jee' | 'neet' | 'boards';
  class: string;
  notesDetails: {
    subtitle: string;
    description: string;
  };
  pdfs: Array<{
    _id: string;
    pdfTitle: string;
    pdfDescription: string;
    originalName: string;
    fileSize: number;
    pages: number;
  }>;
  thumbnail: {
    mimeType: string;
    originalName: string;
    size: number;
  };
  viewCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PdfItem {
  _id: string;
  pdfTitle: string;
  pdfDescription: string;
  originalName: string;
  fileSize: number;
  pages: number;
}

interface PurchaseData {
  _id: string;
  purchaseStatus: 'pending' | 'completed' | 'failed' | 'cancelled';
  paymentStatus: 'pending' | 'completed' | 'failed';
  paymentDetails: {
    razorpayOrderId?: string;
    amount: number;
    currency: string;
  };
}

interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
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
  priceColor: '#ffd700',
};

const PaidNotesDetailsScreen: React.FC<PaidNotesDetailsScreenProps> = ({ navigation, route }) => {
  // Safe access to route params with fallback
  const notesId = route.params?.notesId;
  
  // State management
  const [notesData, setNotesData] = useState<NotesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pdfModalVisible, setPdfModalVisible] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState<PdfItem | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [purchaseData, setPurchaseData] = useState<PurchaseData | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(false);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-20)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const priceGlow = useRef(new Animated.Value(0)).current;

  // API Base URL
  const API_BASE_URL = API_BASE;

  // Early return if notesId is not provided
  useEffect(() => {
    if (!notesId) {
      Alert.alert('Error', 'Notes ID is required');
      navigation.goBack();
      return;
    }
    fetchNotesDetails();
    checkNotesAccess();
    startEntranceAnimation();
  }, [notesId]);

  // Fetch notes details
  const fetchNotesDetails = async () => {
    if (!notesId) return;
    
    try {
      setLoading(true);
      
      // Fetch notes details
      const response = await fetch(`${API_BASE_URL}/paidNotes/${notesId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch notes details');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setNotesData(data.data);
        // Increment view count
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

  // Check if user has access to notes
  const checkNotesAccess = async () => {
    if (!notesId) return;
    
    try {
      setCheckingAccess(true);
      
      const response = await fetch(`${API_BASE_URL}/purchased-notes/access/${notesId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Add your auth token here
          // 'Authorization': `Bearer ${authToken}`
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setHasAccess(data.hasAccess);
        if (data.purchase) {
          setPurchaseData(data.purchase);
        }
      }
      
    } catch (error) {
      console.error('Error checking notes access:', error);
    } finally {
      setCheckingAccess(false);
    }
  };

  // Increment view count
  const incrementViewCount = async () => {
    if (!notesId) return;
    
    try {
      await fetch(`${API_BASE_URL}/paidNotes/${notesId}/view`, {
        method: 'POST',
      });
    } catch (error) {
      console.error('Error incrementing view count:', error);
    }
  };

  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchNotesDetails(), checkNotesAccess()]);
    setRefreshing(false);
  };

  // Handle PDF press
  const handlePdfPress = (pdf: PdfItem) => {
    if (!hasAccess) {
      Alert.alert(
        'Access Denied',
        'You need to purchase these notes to access the PDFs.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Buy Now', onPress: handlePurchase }
        ]
      );
      return;
    }
    
    setSelectedPdf(pdf);
    setPdfModalVisible(true);
  };

  // Handle PDF download/view (for purchased notes)
  const handlePdfDownload = async (pdf: PdfItem) => {
    if (!notesId || !hasAccess) {
      Alert.alert('Error', 'You need to purchase these notes to download PDFs');
      return;
    }
    
    try {
      const downloadUrl = `${API_BASE_URL}/purchased-notes/${notesId}/pdfs/${pdf._id}/download`;
      
      // Try to open PDF in default app
      const supported = await Linking.canOpenURL(downloadUrl);
      if (supported) {
        await Linking.openURL(downloadUrl);
      } else {
        Alert.alert('Error', 'Cannot open PDF viewer');
      }
      
    } catch (error) {
      console.error('Error downloading PDF:', error);
      Alert.alert('Error', 'Failed to download PDF. Please try again.');
    }
  };

  // Handle purchase
  const handlePurchase = async () => {
    if (!notesId || !notesData) return;
    
    try {
      setPurchasing(true);
      
      const response = await fetch(`${API_BASE_URL}/purchased-notes/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add your auth token here
          // 'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          notesId: notesId
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Handle free notes
        if (notesData.price === 0) {
          Alert.alert('Success', 'Successfully purchased the free notes!');
          setHasAccess(true);
          setPurchaseData(data.purchase);
        } else {
          // Handle paid notes - navigate to payment
          if (data.razorpayOrder) {
            handleRazorpayPayment(data.purchase, data.razorpayOrder);
          } else {
            Alert.alert('Error', 'Failed to initialize payment');
          }
        }
      } else {
        Alert.alert('Error', data.message || 'Failed to purchase notes');
      }
      
    } catch (error) {
      console.error('Error purchasing notes:', error);
      Alert.alert('Error', 'Failed to purchase notes. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  // Handle Razorpay payment
  const handleRazorpayPayment = (purchase: PurchaseData, razorpayOrder: RazorpayOrder) => {
    // This would integrate with Razorpay SDK
    // For now, showing a placeholder
    Alert.alert(
      'Payment Required',
      `Please complete the payment of ₹${notesData?.price} to access these notes.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Pay Now', 
          onPress: () => {
            // Here you would integrate with Razorpay
            // For demonstration, we'll simulate a successful payment
            simulatePaymentSuccess(purchase, razorpayOrder);
          }
        }
      ]
    );
  };

  // Simulate payment success (replace with actual Razorpay integration)
  const simulatePaymentSuccess = async (purchase: PurchaseData, razorpayOrder: RazorpayOrder) => {
    try {
      // In real implementation, this would be called after successful Razorpay payment
      const response = await fetch(`${API_BASE_URL}/purchased-notes/verify-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add your auth token here
          // 'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          purchaseId: purchase._id,
          razorpay_order_id: razorpayOrder.id,
          razorpay_payment_id: 'pay_dummy_payment_id',
          razorpay_signature: 'dummy_signature'
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        Alert.alert('Success', 'Payment successful! You now have access to these notes.');
        setHasAccess(true);
        setPurchaseData(data.purchase);
      } else {
        Alert.alert('Error', 'Payment verification failed');
      }
      
    } catch (error) {
      console.error('Error verifying payment:', error);
      Alert.alert('Error', 'Payment verification failed');
    }
  };

  // Handle share
  const handleShare = async () => {
    try {
      const result = await Share.share({
        message: `Check out these notes: ${notesData?.notesTitle} by ${notesData?.tutor} - Only ₹${notesData?.price}`,
        title: notesData?.notesTitle,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  // Handle back button
  const handleBackPress = () => {
    navigation.goBack();
  };

  // Get thumbnail source
  const getThumbnailSource = () => {
    if (!notesId) {
      return { uri: 'https://via.placeholder.com/400x300/1a2e1a/00ff88?text=No+Image' };
    }
    return { uri: `${API_BASE_URL}/paidNotes/${notesId}/thumbnail` };
  };

  // Helper functions
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatPrice = (price: number) => {
    return price === 0 ? 'FREE' : `₹${price}`;
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'jee': return '#ff6b6b';
      case 'neet': return '#4ecdc4';
      case 'boards': return '#45b7d1';
      default: return BRAND.primaryColor;
    }
  };

  const startEntranceAnimation = () => {
    // Background glow
    Animated.timing(glowOpacity, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    // Price glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(priceGlow, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(priceGlow, {
          toValue: 0.3,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

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

  const renderPdfItem = (pdf: PdfItem, index: number) => (
    <TouchableOpacity
      key={pdf._id}
      style={[
        styles.pdfItem,
        !hasAccess && styles.pdfItemLocked
      ]}
      onPress={() => handlePdfPress(pdf)}
      activeOpacity={0.7}
    >
      <View style={styles.pdfIcon}>
        <Text style={styles.pdfIconText}>
          {hasAccess ? '📄' : '🔒'}
        </Text>
      </View>
      
      <View style={styles.pdfInfo}>
        <Text style={[
          styles.pdfTitle,
          !hasAccess && styles.pdfTitleLocked
        ]} numberOfLines={2}>
          {pdf.pdfTitle}
        </Text>
        <Text style={[
          styles.pdfDescription,
          !hasAccess && styles.pdfDescriptionLocked
        ]} numberOfLines={2}>
          {hasAccess ? pdf.pdfDescription : 'Purchase to unlock'}
        </Text>
        <View style={styles.pdfMeta}>
          <Text style={[
            styles.pdfMetaText,
            !hasAccess && styles.pdfMetaTextLocked
          ]}>
            {hasAccess ? `${formatFileSize(pdf.fileSize)} • ${pdf.pages} pages` : 'Locked'}
          </Text>
        </View>
      </View>
      
      <TouchableOpacity
        style={[
          styles.downloadButton,
          !hasAccess && styles.downloadButtonLocked
        ]}
        onPress={() => hasAccess ? handlePdfDownload(pdf) : handlePdfPress(pdf)}
        disabled={!hasAccess}
      >
        <Text style={styles.downloadButtonText}>
          {hasAccess ? '📥' : '🔒'}
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
            <Text style={styles.headerTitle}>Premium Notes</Text>
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
              <Animated.View style={[
                styles.priceBadge,
                { opacity: priceGlow }
              ]}>
                <Text style={styles.priceBadgeText}>{formatPrice(notesData.price)}</Text>
              </Animated.View>
            </View>
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

          {/* Price and Purchase Section */}
          <View style={styles.purchaseSection}>
            <View style={styles.priceContainer}>
              <Text style={styles.priceLabel}>Price:</Text>
              <Text style={styles.priceValue}>{formatPrice(notesData.price)}</Text>
            </View>
            
            {!hasAccess ? (
              <TouchableOpacity
                style={[
                  styles.buyButton,
                  purchasing && styles.buyButtonDisabled
                ]}
                onPress={handlePurchase}
                disabled={purchasing}
                activeOpacity={0.8}
              >
                <Text style={styles.buyButtonText}>
                  {purchasing ? 'Processing...' : (notesData.price === 0 ? 'Get Free Notes' : 'Buy Now')}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.accessGrantedContainer}>
                <Text style={styles.accessGrantedText}>✅ You have access to these notes</Text>
              </View>
            )}
          </View>

          {/* Description */}
          <View style={styles.descriptionSection}>
            <Text style={styles.sectionTitle}>About these Notes</Text>
            <Text style={styles.descriptionText}>{notesData.notesDetails.description}</Text>
          </View>

          {/* PDFs Section */}
          <View style={styles.pdfsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>PDFs</Text>
              <Text style={styles.pdfCount}>({notesData.pdfs.length})</Text>
            </View>
            
            {!hasAccess && (
              <View style={styles.accessWarning}>
                <Text style={styles.accessWarningText}>
                  🔒 Purchase required to access PDFs
                </Text>
              </View>
            )}
            
            {notesData.pdfs && notesData.pdfs.length > 0 ? (
              <View style={styles.pdfsList}>
                {notesData.pdfs.map((pdf, index) => renderPdfItem(pdf, index))}
              </View>
            ) : (
              <Text style={styles.noPdfsText}>No PDFs available for these notes.</Text>
            )}
          </View>

          {/* Footer Info */}
          <View style={styles.footerSection}>
            <View style={styles.footerItem}>
              <Text style={styles.footerLabel}>Created:</Text>
              <Text style={styles.footerValue}>{formatDate(notesData.createdAt)}</Text>
            </View>
            <View style={styles.footerItem}>
              <Text style={styles.footerLabel}>Updated:</Text>
              <Text style={styles.footerValue}>{formatDate(notesData.updatedAt)}</Text>
            </View>
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>
      </Animated.View>

      {/* PDF Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={pdfModalVisible}
        onRequestClose={() => setPdfModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={2}>
                {selectedPdf?.pdfTitle}
              </Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setPdfModalVisible(false)}
              >
                <Text style={styles.modalCloseButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={styles.modalDescription}>
                {selectedPdf?.pdfDescription}
              </Text>
              
              <View style={styles.modalStats}>
                <View style={styles.modalStatItem}>
                  <Text style={styles.modalStatLabel}>Size:</Text>
                  <Text style={styles.modalStatValue}>
                    {selectedPdf ? formatFileSize(selectedPdf.fileSize) : ''}
                  </Text>
                </View>
                <View style={styles.modalStatItem}>
                  <Text style={styles.modalStatLabel}>Pages:</Text>
                  <Text style={styles.modalStatValue}>{selectedPdf?.pages || 0}</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  setPdfModalVisible(false);
                  if (selectedPdf) {
                    handlePdfDownload(selectedPdf);
                  }
                }}
              >
                <Text style={styles.modalButtonText}>
                  {hasAccess ? 'Open PDF' : 'Purchase Required'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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

  // Header Section
  headerSection: {
    height: 60,
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(10, 26, 10, 0.95)',
    zIndex: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  backButtonText: {
    color: BRAND.primaryColor,
    fontSize: 20,
    fontWeight: '600',
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareButtonText: {
    fontSize: 18,
  },

  // Content Container
  contentContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },

  // Thumbnail Section
  thumbnailContainer: {
    height: 200,
    margin: 20,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  thumbnailOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    padding: 12,
    flexDirection: 'row',
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 255, 136, 0.9)',
  },
  categoryBadgeText: {
    color: BRAND.backgroundColor,
    fontSize: 12,
    fontWeight: '700',
  },
  priceBadge: {
    backgroundColor: 'rgba(255, 193, 7, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  priceBadgeText: {
    color: BRAND.backgroundColor,
    fontSize: 12,
    fontWeight: '700',
  },

  // Notes Header
  notesHeader: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  notesTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
    lineHeight: 30,
  },
  notesSubtitle: {
    fontSize: 16,
    color: '#cccccc',
    marginBottom: 16,
    lineHeight: 22,
  },
  notesMeta: {
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  metaLabel: {
    fontSize: 14,
    color: '#aaaaaa',
    marginRight: 8,
    fontWeight: '500',
  },
  metaValue: {
    fontSize: 14,
    color: BRAND.primaryColor,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#aaaaaa',
    fontWeight: '500',
  },

  // Purchase Section
  purchaseSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  purchaseContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  priceLabel: {
    fontSize: 16,
    color: '#aaaaaa',
    marginRight: 8,
    fontWeight: '500',
  },
  priceValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffc107',
  },
  buyButton: {
    backgroundColor: BRAND.primaryColor,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
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
  buyButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    opacity: 0.7,
  },
  buyButtonText: {
    color: BRAND.backgroundColor,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  accessGrantedContainer: {
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    borderColor: BRAND.primaryColor,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accessGrantedText: {
    color: BRAND.primaryColor,
    fontSize: 16,
    fontWeight: '600',
  },

  // Description Section
  descriptionSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 14,
    color: '#cccccc',
    lineHeight: 20,
    fontWeight: '400',
  },

  // PDFs Section
  pdfsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  pdfCount: {
    fontSize: 16,
    color: BRAND.primaryColor,
    fontWeight: '500',
    marginLeft: 8,
  },
  accessWarning: {
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    borderColor: '#ffc107',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  accessWarningText: {
    color: '#ffc107',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  pdfsList: {
    gap: 12,
  },
  pdfItem: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.2)',
  },
  pdfItemLocked: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  pdfIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 255, 136, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  pdfIconLocked: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  pdfIconText: {
    fontSize: 16,
  },
  pdfInfo: {
    flex: 1,
  },
  pdfTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
    lineHeight: 18,
  },
  pdfTitleLocked: {
    color: '#aaaaaa',
  },
  pdfDescription: {
    fontSize: 12,
    color: '#cccccc',
    marginBottom: 8,
    lineHeight: 16,
  },
  pdfDescriptionLocked: {
    color: '#888888',
  },
  pdfMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pdfMetaText: {
    fontSize: 12,
    color: BRAND.primaryColor,
    fontWeight: '500',
  },
  pdfMetaTextLocked: {
    color: '#888888',
  },
  downloadButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 255, 136, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  downloadButtonLocked: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  downloadButtonText: {
    fontSize: 16,
  },
  noPdfsText: {
    fontSize: 14,
    color: '#aaaaaa',
    textAlign: 'center',
    paddingVertical: 20,
    fontStyle: 'italic',
  },

  // Footer Section
  footerSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  footerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  footerLabel: {
    fontSize: 14,
    color: '#aaaaaa',
    fontWeight: '500',
  },
  footerValue: {
    fontSize: 14,
    color: BRAND.primaryColor,
    fontWeight: '600',
  },

  // Loading and Error States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  errorBackButton: {
    backgroundColor: BRAND.primaryColor,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  errorBackButtonText: {
    color: BRAND.backgroundColor,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: BRAND.backgroundColor,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.3)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
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
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginRight: 12,
    lineHeight: 24,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalBody: {
    padding: 20,
  },
  modalDescription: {
    fontSize: 14,
    color: '#cccccc',
    lineHeight: 20,
    marginBottom: 16,
  },
  modalStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalStatItem: {
    alignItems: 'center',
  },
  modalStatLabel: {
    fontSize: 12,
    color: '#aaaaaa',
    fontWeight: '500',
    marginBottom: 4,
  },
  modalStatValue: {
    fontSize: 16,
    color: BRAND.primaryColor,
    fontWeight: '700',
  },
  modalActions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalButton: {
    backgroundColor: BRAND.primaryColor,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
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
  modalButtonText: {
    color: BRAND.backgroundColor,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Bottom Padding
  bottomPadding: {
    height: 40,
  },
});

export default PaidNotesDetailsScreen;