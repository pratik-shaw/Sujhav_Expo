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
  ActivityIndicator,
  BackHandler,
  Share,
  RefreshControl,
  Modal,
  Animated,
  Platform,
} from 'react-native';
import { NavigationProp, RouteProp, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { API_BASE } from '../config/api';

interface NotesViewerScreenProps {
  navigation: NavigationProp<any>;
  route: RouteProp<any>;
}

interface RouteParams {
  notesId: string;
  notesTitle?: string;
  purchaseId?: string;
  paymentSuccess?: boolean;
}

interface NotesData {
  _id: string;
  notesTitle: string;
  tutor: string;
  price: number;
  type: 'paid' | 'free';
  description?: string;
  category?: string;
  class?: string;
  createdAt: string;
  updatedAt: string;
  thumbnail?: {
    data: string;
    contentType: string;
  };
}

interface PurchaseData {
  _id: string;
  studentId: string;
  notesId: string;
  purchaseStatus: 'pending' | 'completed' | 'failed';
  paymentStatus: 'pending' | 'completed' | 'failed';
  paymentDetails: {
    amount: number;
    currency: string;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
  };
  purchasedAt: string;
}

interface PdfFile {
  _id: string;
  filename: string;
  originalName: string;
  size: number;
  uploadedAt: string;
  downloadUrl?: string;
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
  successColor: '#00ff88',
  textPrimary: '#ffffff',
  textSecondary: '#cccccc',
  textMuted: '#999999',
};

const NotesViewerScreen: React.FC<NotesViewerScreenProps> = ({ navigation, route }) => {
  // Route parameters with type safety
  const routeParams = route.params as RouteParams;
  const { notesId, notesTitle, purchaseId, paymentSuccess } = routeParams;

  // State management
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notesData, setNotesData] = useState<NotesData | null>(null);
  const [purchaseData, setPurchaseData] = useState<PurchaseData | null>(null);
  const [pdfFiles, setPdfFiles] = useState<PdfFile[]>([]);
  const [userData, setUserData] = useState<any>(null);
  const [currentPdfIndex, setCurrentPdfIndex] = useState(0);
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [downloadingFiles, setDownloadingFiles] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [accessGranted, setAccessGranted] = useState(false);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const successAnim = useRef(new Animated.Value(0)).current;

  // Validate required parameters
  useEffect(() => {
    if (!notesId) {
      console.error('Missing required notesId parameter');
      Alert.alert(
        'Error',
        'Invalid notes access. Please try again.',
        [{ text: 'Go Back', onPress: () => navigation.goBack() }]
      );
      return;
    }

    console.log('NotesViewer initialized with:', {
      notesId,
      notesTitle,
      purchaseId,
      paymentSuccess
    });
  }, [notesId, navigation]);

  // Handle back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => backHandler.remove();
  }, [showPdfViewer]);

  // Initialize component
  useEffect(() => {
    if (notesId) {
      initializeViewer();
    }
  }, [notesId]);

  // Show success animation if payment was successful
  useEffect(() => {
    if (paymentSuccess) {
      setTimeout(() => {
        showSuccessAnimation();
      }, 500);
    }
  }, [paymentSuccess]);

  // Focus effect to refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (notesId && userData) {
        refreshNotesData();
      }
    }, [notesId, userData])
  );

  const initializeViewer = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get user data first
      await getUserData();
      
      // Start entrance animation
      startEntranceAnimation();
      
    } catch (error) {
      console.error('Error initializing viewer:', error);
      setError('Failed to initialize notes viewer');
      setLoading(false);
    }
  };

  const startEntranceAnimation = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const showSuccessAnimation = () => {
    Animated.sequence([
      Animated.timing(successAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(successAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const getUserData = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userId = await AsyncStorage.getItem('userId');
      const userName = await AsyncStorage.getItem('userName');
      const userEmail = await AsyncStorage.getItem('userEmail');
      
      if (token && userId) {
        const userData = { token, userId, userName, userEmail };
        setUserData(userData);
        console.log('User data loaded for notes viewer');
        
        // Load notes data after getting user data
        await loadNotesData(userData);
      } else {
        throw new Error('User authentication required');
      }
    } catch (error) {
      console.error('Error getting user data:', error);
      Alert.alert(
        'Authentication Required',
        'Please login to access your notes.',
        [{ text: 'Login', onPress: () => navigation.navigate('Login') }]
      );
    }
  };

  const getApiUrl = (endpoint: string) => {
    const baseUrl = API_BASE?.replace(/\/+$/, '');
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    
    if (baseUrl && baseUrl.endsWith('/api')) {
      return `${baseUrl}${cleanEndpoint}`;
    } else {
      return `${baseUrl || ''}/api${cleanEndpoint}`;
    }
  };

  const makeApiRequest = async (url: string, options: RequestInit) => {
    try {
      console.log('Making API request to:', url);
      
      const response = await fetch(url, {
        ...options,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  };

  const loadNotesData = async (userData: any) => {
    try {
      setError(null);
      
      // Load notes details
      const notesUrl = getApiUrl(`/notes/${notesId}`);
      const notesResponse = await makeApiRequest(notesUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${userData.token}`,
        },
      });

      if (notesResponse.success && notesResponse.data) {
        setNotesData(notesResponse.data);
        console.log('Notes data loaded:', notesResponse.data.notesTitle);
      }

      // Check if user has purchased these notes (for paid notes)
      if (notesResponse.data?.type === 'paid') {
        await checkPurchaseStatus(userData);
      } else {
        // Free notes - grant access immediately
        setAccessGranted(true);
        await loadPdfFiles(userData);
      }

    } catch (error) {
      console.error('Error loading notes data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Failed to load notes: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const checkPurchaseStatus = async (userData: any) => {
    try {
      // Check if user has purchased these notes
      const purchaseUrl = getApiUrl(`/purchasedNotes/check/${notesId}`);
      const purchaseResponse = await makeApiRequest(purchaseUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${userData.token}`,
        },
      });

      if (purchaseResponse.success && purchaseResponse.data) {
        setPurchaseData(purchaseResponse.data);
        
        // Check if purchase is completed
        if (purchaseResponse.data.purchaseStatus === 'completed' && 
            purchaseResponse.data.paymentStatus === 'completed') {
          setAccessGranted(true);
          await loadPdfFiles(userData);
        } else {
          setAccessGranted(false);
          setError('Purchase is still being processed. Please try again in a few minutes.');
        }
      } else {
        setAccessGranted(false);
        setError('You have not purchased these notes yet.');
      }
    } catch (error) {
      console.error('Error checking purchase status:', error);
      setAccessGranted(false);
      setError('Failed to verify your purchase. Please contact support.');
    }
  };

  const loadPdfFiles = async (userData: any) => {
    try {
      const filesUrl = getApiUrl(`/notes/${notesId}/files`);
      const filesResponse = await makeApiRequest(filesUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${userData.token}`,
        },
      });

      if (filesResponse.success && filesResponse.data) {
        setPdfFiles(filesResponse.data);
        console.log(`Loaded ${filesResponse.data.length} PDF files`);
      }
    } catch (error) {
      console.error('Error loading PDF files:', error);
      setError('Failed to load notes files');
    }
  };

  const refreshNotesData = async () => {
    if (!userData) return;
    
    setRefreshing(true);
    try {
      await loadNotesData(userData);
    } catch (error) {
      console.error('Error refreshing notes data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleBackPress = () => {
    if (showPdfViewer) {
      setShowPdfViewer(false);
      return true;
    }
    navigation.goBack();
    return true;
  };

  const openPdfViewer = (index: number) => {
    setCurrentPdfIndex(index);
    setShowPdfViewer(true);
  };

  const downloadPdf = async (pdfFile: PdfFile) => {
    if (!userData) return;

    try {
      // Request permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant storage permission to download files.');
        return;
      }

      setDownloadingFiles(prev => new Set(prev).add(pdfFile._id));

      // Get download URL
      const downloadUrl = getApiUrl(`/notes/${notesId}/files/${pdfFile._id}/download`);
      
      console.log('Downloading PDF:', pdfFile.originalName);
      
      // Download file
      const downloadResult = await FileSystem.downloadAsync(
        downloadUrl,
        FileSystem.documentDirectory + pdfFile.originalName,
        {
          headers: {
            'Authorization': `Bearer ${userData.token}`,
          },
        }
      );

      if (downloadResult.status === 200) {
        // Save to device
        const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
        await MediaLibrary.createAlbumAsync('SUJHAV Notes', asset, false);
        
        Alert.alert(
          'Download Complete',
          `${pdfFile.originalName} has been downloaded to your device.`,
          [
            { text: 'OK' },
            { 
              text: 'Share', 
              onPress: () => sharePdf(downloadResult.uri, pdfFile.originalName)
            }
          ]
        );
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Download Failed', 'Failed to download the PDF. Please try again.');
    } finally {
      setDownloadingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(pdfFile._id);
        return newSet;
      });
    }
  };

  const sharePdf = async (uri: string, filename: string) => {
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        await Share.share({
          message: `Check out this study material: ${filename}`,
          title: filename,
        });
      }
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderPdfViewer = () => {
    if (!showPdfViewer || pdfFiles.length === 0) return null;

    const currentFile = pdfFiles[currentPdfIndex];
    const pdfUrl = getApiUrl(`/notes/${notesId}/files/${currentFile._id}/view?token=${userData?.token}`);

    return (
      <Modal
        visible={showPdfViewer}
        animationType="slide"
        statusBarTranslucent
      >
        <View style={styles.pdfViewerContainer}>
          <StatusBar backgroundColor={BRAND.backgroundColor} barStyle="light-content" />
          <SafeAreaView style={styles.pdfViewerSafeArea}>
            {/* PDF Viewer Header */}
            <View style={styles.pdfViewerHeader}>
              <TouchableOpacity 
                style={styles.pdfBackButton} 
                onPress={() => setShowPdfViewer(false)}
              >
                <Text style={styles.pdfBackButtonText}>← Back</Text>
              </TouchableOpacity>
              <Text style={styles.pdfViewerTitle} numberOfLines={1}>
                {currentFile?.originalName}
              </Text>
              <TouchableOpacity 
                style={styles.pdfDownloadButton}
                onPress={() => downloadPdf(currentFile)}
                disabled={downloadingFiles.has(currentFile._id)}
              >
                <Text style={styles.pdfDownloadButtonText}>
                  {downloadingFiles.has(currentFile._id) ? '⬇' : '📥'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* PDF Navigation */}
            {pdfFiles.length > 1 && (
              <View style={styles.pdfNavigation}>
                <TouchableOpacity
                  style={[styles.pdfNavButton, currentPdfIndex === 0 && styles.pdfNavButtonDisabled]}
                  onPress={() => setCurrentPdfIndex(Math.max(0, currentPdfIndex - 1))}
                  disabled={currentPdfIndex === 0}
                >
                  <Text style={styles.pdfNavButtonText}>Previous</Text>
                </TouchableOpacity>
                <Text style={styles.pdfNavText}>
                  {currentPdfIndex + 1} of {pdfFiles.length}
                </Text>
                <TouchableOpacity
                  style={[styles.pdfNavButton, currentPdfIndex === pdfFiles.length - 1 && styles.pdfNavButtonDisabled]}
                  onPress={() => setCurrentPdfIndex(Math.min(pdfFiles.length - 1, currentPdfIndex + 1))}
                  disabled={currentPdfIndex === pdfFiles.length - 1}
                >
                  <Text style={styles.pdfNavButtonText}>Next</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* WebView for PDF */}
            <WebView
              source={{ uri: pdfUrl }}
              style={styles.pdfWebView}
              startInLoadingState={true}
              renderLoading={() => (
                <View style={styles.pdfLoadingContainer}>
                  <ActivityIndicator size="large" color={BRAND.primaryColor} />
                  <Text style={styles.pdfLoadingText}>Loading PDF...</Text>
                </View>
              )}
              onError={(error) => {
                console.error('PDF WebView error:', error);
                Alert.alert('Error', 'Failed to load PDF. Please try again.');
              }}
            />
          </SafeAreaView>
        </View>
      </Modal>
    );
  };

  const renderSuccessBanner = () => {
    if (!paymentSuccess) return null;

    return (
      <Animated.View 
        style={[
          styles.successBanner,
          {
            opacity: successAnim,
            transform: [
              {
                translateY: successAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-50, 0],
                })
              }
            ]
          }
        ]}
      >
        <Text style={styles.successBannerIcon}>🎉</Text>
        <Text style={styles.successBannerText}>Payment successful! Notes are now available.</Text>
      </Animated.View>
    );
  };

  const renderNotesInfo = () => {
    if (!notesData) return null;

    return (
      <View style={styles.notesInfoCard}>
        <Text style={styles.notesTitle}>{notesData.notesTitle}</Text>
        <Text style={styles.tutorName}>by {notesData.tutor}</Text>
        
        <View style={styles.notesMetadata}>
          {notesData.category && (
            <Text style={styles.metadataItem}>📂 {notesData.category}</Text>
          )}
          {notesData.class && (
            <Text style={styles.metadataItem}>🎓 Class {notesData.class}</Text>
          )}
          <Text style={styles.metadataItem}>
            💰 {notesData.type === 'free' ? 'Free' : `₹${notesData.price}`}
          </Text>
        </View>

        {notesData.description && (
          <Text style={styles.notesDescription}>{notesData.description}</Text>
        )}

        {purchaseData && (
          <View style={styles.purchaseInfo}>
            <Text style={styles.purchaseInfoTitle}>Purchase Details</Text>
            <Text style={styles.purchaseInfoText}>
              Purchased on: {formatDate(purchaseData.purchasedAt)}
            </Text>
            <Text style={styles.purchaseInfoText}>
              Status: {purchaseData.purchaseStatus === 'completed' ? '✅ Completed' : '⏳ Processing'}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderPdfFiles = () => {
    if (!accessGranted) return null;

    if (pdfFiles.length === 0) {
      return (
        <View style={styles.noPdfContainer}>
          <Text style={styles.noPdfIcon}>📄</Text>
          <Text style={styles.noPdfTitle}>No files available</Text>
          <Text style={styles.noPdfText}>
            The notes files are being uploaded. Please check back later.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.pdfFilesContainer}>
        <Text style={styles.pdfFilesTitle}>Available Files ({pdfFiles.length})</Text>
        
        {pdfFiles.map((pdfFile, index) => (
          <View key={pdfFile._id} style={styles.pdfFileCard}>
            <View style={styles.pdfFileInfo}>
              <Text style={styles.pdfFileName}>{pdfFile.originalName}</Text>
              <Text style={styles.pdfFileSize}>{formatFileSize(pdfFile.size)}</Text>
              <Text style={styles.pdfFileDate}>
                Uploaded: {formatDate(pdfFile.uploadedAt)}
              </Text>
            </View>
            
            <View style={styles.pdfFileActions}>
              <TouchableOpacity
                style={styles.pdfActionButton}
                onPress={() => openPdfViewer(index)}
              >
                <Text style={styles.pdfActionButtonText}>👁️ View</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.pdfActionButton, styles.pdfDownloadAction]}
                onPress={() => downloadPdf(pdfFile)}
                disabled={downloadingFiles.has(pdfFile._id)}
              >
                {downloadingFiles.has(pdfFile._id) ? (
                  <ActivityIndicator size="small" color={BRAND.backgroundColor} />
                ) : (
                  <Text style={styles.pdfActionButtonText}>📥 Download</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderError = () => {
    if (!error) return null;

    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Unable to Access Notes</Text>
        <Text style={styles.errorText}>{error}</Text>
        
        {!accessGranted && notesData?.type === 'paid' && (
          <TouchableOpacity
            style={styles.purchaseButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.purchaseButtonText}>Purchase Notes</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={styles.retryButton}
          onPress={refreshNotesData}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar backgroundColor={BRAND.backgroundColor} barStyle="light-content" />
        <SafeAreaView style={styles.loadingContent}>
          <ActivityIndicator size="large" color={BRAND.primaryColor} />
          <Text style={styles.loadingText}>Loading your notes...</Text>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={BRAND.backgroundColor} barStyle="light-content" />
      
      <Animated.View 
        style={[
          styles.container, 
          { 
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={handleBackPress}
            >
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {notesTitle || notesData?.notesTitle || 'Study Notes'}
            </Text>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={refreshNotesData}
            >
              <Text style={styles.refreshButtonText}>🔄</Text>
            </TouchableOpacity>
          </View>

          {/* Success Banner */}
          {renderSuccessBanner()}

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={refreshNotesData}
                colors={[BRAND.primaryColor]}
                tintColor={BRAND.primaryColor}
              />
            }
          >
            {/* Notes Information */}
            {renderNotesInfo()}

            {/* Error State */}
            {renderError()}

            {/* PDF Files */}
            {renderPdfFiles()}

            {/* Footer Spacing */}
            <View style={styles.footerSpacing} />
          </ScrollView>
        </SafeAreaView>
      </Animated.View>

      {/* PDF Viewer Modal */}
      {renderPdfViewer()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND.backgroundColor,
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: BRAND.backgroundColor,
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: BRAND.textSecondary,
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
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
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerTitle: {
    flex: 1,
    color: BRAND.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginHorizontal: 12,
  },
  refreshButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BRAND.accentColor,
    borderRadius: 20,
  },
  refreshButtonText: {
    fontSize: 16,
  },
  successBanner: {
    backgroundColor: BRAND.successColor,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 10,
  },
  successBannerIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  successBannerText: {
    color: BRAND.backgroundColor,
    fontWeight: 'bold',
    fontSize: 14,
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  notesInfoCard: {
    backgroundColor: BRAND.accentColor,
    margin: 20,
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: BRAND.primaryColor,
  },
  notesTitle: {
    color: BRAND.textPrimary,
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  tutorName: {
    color: BRAND.textSecondary,
    fontSize: 16,
    fontStyle: 'italic',
    marginBottom: 16,
  },
  notesMetadata: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  metadataItem: {
    color: BRAND.primaryColor,
    fontSize: 12,
    backgroundColor: BRAND.backgroundColor,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 4,
  },
  notesDescription: {
    color: BRAND.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  purchaseInfo: {
    backgroundColor: BRAND.backgroundColor,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BRAND.primaryColor,
  },
  purchaseInfoTitle: {
    color: BRAND.primaryColor,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  purchaseInfoText: {
    color: BRAND.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  // PDF Files Container
  pdfFilesContainer: {
    margin: 20,
  },
  pdfFilesTitle: {
    color: BRAND.textPrimary,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  pdfFileCard: {
    backgroundColor: BRAND.accentColor,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BRAND.primaryColor,
    elevation: 3,
    shadowColor: BRAND.primaryColor,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  pdfFileInfo: {
    marginBottom: 12,
  },
  pdfFileName: {
    color: BRAND.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  pdfFileSize: {
    color: BRAND.textSecondary,
    fontSize: 12,
    marginBottom: 2,
  },
  pdfFileDate: {
    color: BRAND.textMuted,
    fontSize: 11,
  },
  pdfFileActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pdfActionButton: {
    flex: 1,
    backgroundColor: BRAND.primaryColor,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  pdfDownloadAction: {
    backgroundColor: BRAND.warningColor,
  },
  pdfActionButtonText: {
    color: BRAND.backgroundColor,
    fontSize: 12,
    fontWeight: 'bold',
  },
  // No PDF State
  noPdfContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    margin: 20,
    backgroundColor: BRAND.accentColor,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: BRAND.primaryColor,
  },
  noPdfIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  noPdfTitle: {
    color: BRAND.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  noPdfText: {
    color: BRAND.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Error State
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    margin: 20,
    backgroundColor: BRAND.accentColor,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: BRAND.errorColor,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    color: BRAND.errorColor,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    color: BRAND.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  purchaseButton: {
    backgroundColor: BRAND.primaryColor,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 12,
  },
  purchaseButtonText: {
    color: BRAND.backgroundColor,
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: BRAND.accentColor,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BRAND.primaryColor,
  },
  retryButtonText: {
    color: BRAND.primaryColor,
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  // PDF Viewer Modal Styles
  pdfViewerContainer: {
    flex: 1,
    backgroundColor: BRAND.backgroundColor,
  },
  pdfViewerSafeArea: {
    flex: 1,
  },
  pdfViewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.accentColor,
    backgroundColor: BRAND.backgroundColor,
  },
  pdfBackButton: {
    backgroundColor: BRAND.accentColor,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BRAND.primaryColor,
  },
  pdfBackButtonText: {
    color: BRAND.primaryColor,
    fontSize: 14,
    fontWeight: 'bold',
  },
  pdfViewerTitle: {
    flex: 1,
    color: BRAND.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginHorizontal: 12,
  },
  pdfDownloadButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BRAND.accentColor,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BRAND.primaryColor,
  },
  pdfDownloadButtonText: {
    fontSize: 16,
  },
  pdfNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: BRAND.accentColor,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.primaryColor,
  },
  pdfNavButton: {
    backgroundColor: BRAND.primaryColor,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  pdfNavButtonDisabled: {
    backgroundColor: BRAND.textMuted,
    opacity: 0.5,
  },
  pdfNavButtonText: {
    color: BRAND.backgroundColor,
    fontSize: 12,
    fontWeight: 'bold',
  },
  pdfNavText: {
    color: BRAND.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  pdfWebView: {
    flex: 1,
    backgroundColor: BRAND.backgroundColor,
  },
  pdfLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BRAND.backgroundColor,
  },
  pdfLoadingText: {
    color: BRAND.textSecondary,
    marginTop: 16,
    fontSize: 16,
  },
  // Footer
  footerSpacing: {
    height: 50,
  },
});

export default NotesViewerScreen;