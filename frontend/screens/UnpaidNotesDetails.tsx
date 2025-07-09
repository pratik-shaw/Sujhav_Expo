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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '../config/api';
import SignupLoginBanner from '../components/SignupLoginBanner';

// Define the route params type
interface RouteParams {
  notesId: string;
}

// Define the navigation stack param list
interface RootStackParamList extends Record<string, object | undefined> {
  UnpaidNotesDetails: RouteParams;
}

interface UnpaidNotesDetailsScreenProps {
  navigation: NavigationProp<RootStackParamList>;
  route: RouteProp<RootStackParamList, 'UnpaidNotesDetails'>;
}

interface NotesData {
  _id: string;
  notesTitle: string;
  tutor: string;
  rating: number;
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

interface UserData {
  id: string;
  email: string;
  name: string;
  token: string;
  role?: string;
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

const UnpaidNotesDetailsScreen: React.FC<UnpaidNotesDetailsScreenProps> = ({ navigation, route }) => {
  // Safe access to route params with fallback
  const notesId = route.params?.notesId;
  
  // State management
  const [notesData, setNotesData] = useState<NotesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pdfModalVisible, setPdfModalVisible] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState<PdfItem | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);
  
  // Authentication state
  const [userData, setUserData] = useState<UserData | null>(null);
  const [showLoginBanner, setShowLoginBanner] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-20)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  // API Base URL
  const API_BASE_URL = API_BASE;

  // Authentication check function
  const checkAuthStatus = async () => {
    try {
      console.log('Checking auth status...');
      
      const token = await AsyncStorage.getItem('userToken');
      const userRole = await AsyncStorage.getItem('userRole');
      const userId = await AsyncStorage.getItem('userId');
      const userName = await AsyncStorage.getItem('userName');
      const storedUserData = await AsyncStorage.getItem('userData');
      
      console.log('Auth data found:', { 
        hasToken: !!token, 
        userRole, 
        userId, 
        userName,
        hasStoredData: !!storedUserData
      });
      
      if (token && userId && userName) {
        let parsedUserData = null;
        
        // Try to get detailed user data from storage first
        if (storedUserData) {
          try {
            parsedUserData = JSON.parse(storedUserData);
          } catch (e) {
            console.error('Error parsing stored user data:', e);
          }
        }
        
        // Create user data object with available information
        const userDataObj: UserData = {
          id: userId,
          name: userName,
          email: parsedUserData?.email || '',
          token: token,
          role: userRole || 'user'
        };
        
        console.log('Setting user data:', userDataObj);
        setUserData(userDataObj);
        setIsLoggedIn(true);
        return true;
      } else {
        console.log('No auth data found, user not logged in');
        setIsLoggedIn(false);
        return false;
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setIsLoggedIn(false);
      return false;
    }
  };

  // Early return if notesId is not provided
  useEffect(() => {
    if (!notesId) {
      Alert.alert('Error', 'Notes ID is required');
      navigation.goBack();
      return;
    }
    fetchNotesDetails();
    startEntranceAnimation();
  }, [notesId]);

  // Check authentication on mount and focus
  useEffect(() => {
    checkAuthStatus();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('Screen focused, checking auth status...');
      checkAuthStatus();
    });

    return unsubscribe;
  }, [navigation]);

  // Fetch notes details
  const fetchNotesDetails = async () => {
    if (!notesId) return;
    
    try {
      setLoading(true);
      
      // Fetch notes details
      const response = await fetch(`${API_BASE_URL}/unpaidNotes/${notesId}`);
      
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

  // Increment view count
  const incrementViewCount = async () => {
    if (!notesId) return;
    
    try {
      await fetch(`${API_BASE_URL}/unpaidNotes/${notesId}/view`, {
        method: 'POST',
      });
    } catch (error) {
      console.error('Error incrementing view count:', error);
    }
  };

  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotesDetails();
    await checkAuthStatus();
    setRefreshing(false);
  };

  // Handle PDF press with authentication check
  const handlePdfPress = async (pdf: PdfItem) => {
    console.log('PDF pressed, checking authentication...');
    
    // Check if user is authenticated
    const isAuthenticated = await checkAuthStatus();
    console.log('Authentication result:', isAuthenticated);
    
    if (!isAuthenticated || !userData) {
      console.log('User not authenticated, showing login banner');
      setShowLoginBanner(true);
      return;
    }

    // If authenticated, show the PDF modal
    setSelectedPdf(pdf);
    setPdfModalVisible(true);
  };

  // Handle PDF download/view with authentication check
  const handlePdfDownload = async (pdf: PdfItem) => {
    if (!notesId) return;
    
    // Check if user is authenticated
    const isAuthenticated = await checkAuthStatus();
    
    if (!isAuthenticated || !userData) {
      console.log('User not authenticated, showing login banner');
      setShowLoginBanner(true);
      return;
    }
    
    try {
      setDownloadingPdf(pdf._id);
      
      const pdfUrl = `${API_BASE_URL}/unpaidNotes/${notesId}/pdfs/${pdf._id}`;
      
      // Try to open PDF in default app
      const supported = await Linking.canOpenURL(pdfUrl);
      if (supported) {
        await Linking.openURL(pdfUrl);
      } else {
        Alert.alert('Error', 'Cannot open PDF viewer');
      }
      
    } catch (error) {
      console.error('Error downloading PDF:', error);
      Alert.alert('Error', 'Failed to open PDF. Please try again.');
    } finally {
      setDownloadingPdf(null);
      setPdfModalVisible(false);
    }
  };

  // Handle share
  const handleShare = async () => {
    try {
      const result = await Share.share({
        message: `Check out these notes: ${notesData?.notesTitle} by ${notesData?.tutor}`,
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

  // Close login banner
  const handleCloseBanner = () => {
    setShowLoginBanner(false);
  };

  // Get thumbnail source
  const getThumbnailSource = () => {
    if (!notesId) {
      return { uri: 'https://via.placeholder.com/400x300/1a2e1a/00ff88?text=No+Image' };
    }
    return { uri: `${API_BASE_URL}/unpaidNotes/${notesId}/thumbnail` };
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
      style={styles.pdfItem}
      onPress={() => handlePdfPress(pdf)}
      activeOpacity={0.7}
    >
      <View style={styles.pdfIcon}>
        <Text style={styles.pdfIconText}>📄</Text>
      </View>
      
      <View style={styles.pdfInfo}>
        <Text style={styles.pdfTitle} numberOfLines={2}>
          {pdf.pdfTitle}
        </Text>
        <Text style={styles.pdfDescription} numberOfLines={2}>
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
        onPress={() => handlePdfDownload(pdf)}
        disabled={downloadingPdf === pdf._id}
      >
        <Text style={styles.downloadButtonText}>
          {downloadingPdf === pdf._id ? '⏳' : '📥'}
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
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>FREE</Text>
              </View>
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
            
            {!isLoggedIn && (
              <View style={styles.authNotice}>
                <Text style={styles.authNoticeText}>
                  📋 Please sign in to access and download PDF files
                </Text>
                <TouchableOpacity
                  style={styles.authNoticeButton}
                  onPress={() => navigation.navigate('SignIn')}
                >
                  <Text style={styles.authNoticeButtonText}>Sign In</Text>
                </TouchableOpacity>
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
                  if (selectedPdf) {
                    handlePdfDownload(selectedPdf);
                  }
                }}
              >
                <Text style={styles.modalButtonText}>Open PDF</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Login/Signup Banner */}
      <SignupLoginBanner
        navigation={navigation}
        visible={showLoginBanner}
        onClose={handleCloseBanner}
      />
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
  },
  categoryBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  typeBadge: {
    backgroundColor: 'rgba(0, 255, 136, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  typeBadgeText: {
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
  pdfIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 255, 136, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
  pdfDescription: {
    fontSize: 12,
    color: '#cccccc',
    marginBottom: 8,
    lineHeight: 16,
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
  downloadButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 255, 136, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
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
  // Add these styles to your existing StyleSheet.create() object

// Authentication Notice Styles (missing from your code)
authNotice: {
  backgroundColor: 'rgba(255, 165, 0, 0.1)', // Orange background for notice
  borderRadius: 12,
  padding: 16,
  marginBottom: 16,
  borderWidth: 1,
  borderColor: 'rgba(255, 165, 0, 0.3)',
  alignItems: 'center',
},
authNoticeText: {
  fontSize: 14,
  color: '#ffffff',
  textAlign: 'center',
  marginBottom: 12,
  lineHeight: 20,
  fontWeight: '500',
},
authNoticeButton: {
  backgroundColor: BRAND.primaryColor,
  paddingHorizontal: 20,
  paddingVertical: 10,
  borderRadius: 8,
  shadowColor: BRAND.primaryColor,
  shadowOffset: {
    width: 0,
    height: 2,
  },
  shadowOpacity: 0.3,
  shadowRadius: 4,
  elevation: 4,
},
authNoticeButtonText: {
  color: BRAND.backgroundColor,
  fontSize: 14,
  fontWeight: '700',
  letterSpacing: 0.5,
},
});

export default UnpaidNotesDetailsScreen;