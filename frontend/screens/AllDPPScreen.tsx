import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  StatusBar,
  SafeAreaView,
  Animated,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Modal,
  Linking,
} from 'react-native';
import { NavigationProp, RouteProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '../config/api';

interface AllDPPScreenProps {
  navigation: NavigationProp<any>;
  route: RouteProp<any>;
}

interface DPP {
  _id: string;
  title: string;
  class: string;
  category: 'jee' | 'neet' | 'boards';
  questionActive: boolean;
  answerActive: boolean;
  questionPDF: {
    originalName: string;
    fileSize: number;
    pages: number;
  };
  answerPDF?: {
    originalName: string;
    fileSize: number;
    pages: number;
  };
  viewCount: number;
  createdAt: string;
  updatedAt: string;
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

const AllDPPScreen: React.FC<AllDPPScreenProps> = ({ navigation, route }) => {
  // Get initial data from route params
  const initialDPPs = route.params?.dpps || [];
  const initialCategory = route.params?.selectedCategory || 'all';
  const initialClass = route.params?.selectedClass || 'all';

  // State management
  const [dpps, setDPPs] = useState<DPP[]>(initialDPPs);
  const [filteredDPPs, setFilteredDPPs] = useState<DPP[]>(initialDPPs);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'jee' | 'neet' | 'boards'>(initialCategory);
  const [selectedClass, setSelectedClass] = useState<'all' | '11th' | '12th'>(initialClass);
  
  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDPP, setSelectedDPP] = useState<DPP | null>(null);

  // Authentication state
  const [userData, setUserData] = useState<UserData | null>(null);
  const [showLoginBanner, setShowLoginBanner] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-20)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const modalScale = useRef(new Animated.Value(0)).current;

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

  // Fetch all DPPs
  const fetchAllDPPs = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`${API_BASE_URL}/dpp`);
      
      if (response.ok) {
        const data = await response.json();
        const dppData = data.data || [];
        
        // Filter only active DPPs
        const activeDPPs = dppData.filter((dpp: DPP) => dpp.questionActive);
        
        // Sort by creation date (newest first)
        activeDPPs.sort((a: DPP, b: DPP) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        setDPPs(activeDPPs);
      } else {
        console.error('Error fetching DPPs:', response.status);
        setDPPs([]);
      }
    } catch (error) {
      console.error('Error fetching DPPs:', error);
      setDPPs([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter DPPs based on search and filters
  const applyFilters = () => {
    let filtered = dpps;

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(dpp =>
        dpp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dpp.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dpp.class.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(dpp => dpp.category === selectedCategory);
    }

    // Apply class filter
    if (selectedClass !== 'all') {
      filtered = filtered.filter(dpp => dpp.class === selectedClass);
    }

    setFilteredDPPs(filtered);
  };

  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAllDPPs();
    await checkAuthStatus();
    setRefreshing(false);
  };

  // Handle DPP press - Open Modal
  const handleDPPPress = (dpp: DPP) => {
    setSelectedDPP(dpp);
    setModalVisible(true);
    
    // Animate modal opening
    Animated.spring(modalScale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();
  };

  // Handle Modal Close
  const handleModalClose = () => {
    Animated.timing(modalScale, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setModalVisible(false);
      setSelectedDPP(null);
    });
  };

  // Handle PDF Open with authentication check
  const handleOpenPDF = async (type: 'question' | 'answer') => {
    if (!selectedDPP) return;

    console.log('PDF open requested, checking authentication...');
    
    // Check if user is authenticated
    const isAuthenticated = await checkAuthStatus();
    console.log('Authentication result:', isAuthenticated);
    
    if (!isAuthenticated || !userData) {
      console.log('User not authenticated, showing login banner');
      setShowLoginBanner(true);
      return;
    }

    try {
      // Corrected URL to match backend routes
      const pdfUrl = `${API_BASE_URL}/dpp/${selectedDPP._id}/${type}-pdf`;
      
      const canOpen = await Linking.canOpenURL(pdfUrl);
      
      if (canOpen) {
        await Linking.openURL(pdfUrl);
      } else {
        console.error('Cannot open PDF URL:', pdfUrl);
        // You might want to show an alert here
      }
    } catch (error) {
      console.error('Error opening PDF:', error);
      // You might want to show an alert here
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

  // Handle login banner sign in - close modal and navigate
  const handleLoginBannerSignIn = () => {
    setShowLoginBanner(false);
    // Close modal if it's open
    if (modalVisible) {
      handleModalClose();
    }
    navigation.navigate('SignIn');
  };

  // Helper function to format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Helper function to format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  useEffect(() => {
    // If no DPPs were passed, fetch them
    if (initialDPPs.length === 0) {
      fetchAllDPPs();
    }
    checkAuthStatus();
    startEntranceAnimation();
  }, []);

  // Check authentication on focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('Screen focused, checking auth status...');
      checkAuthStatus();
    });

    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    applyFilters();
  }, [searchQuery, selectedCategory, selectedClass, dpps]);

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

  const renderFilterButton = (title: string, value: string, selectedValue: string, onPress: (value: any) => void) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        selectedValue === value && styles.filterButtonActive
      ]}
      onPress={() => onPress(value)}
    >
      <Text style={[
        styles.filterButtonText,
        selectedValue === value && styles.filterButtonTextActive
      ]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  const renderDPPItem = (dpp: DPP) => (
    <TouchableOpacity
      key={dpp._id}
      style={styles.dppItem}
      onPress={() => handleDPPPress(dpp)}
      activeOpacity={0.7}
    >
      {/* DPP Icon */}
      <View style={styles.dppIconContainer}>
        <Text style={styles.dppIcon}>📄</Text>
        <View style={styles.dppStatusBadge}>
          <Text style={styles.dppStatusText}>DPP</Text>
        </View>
      </View>

      {/* DPP Info */}
      <View style={styles.dppInfo}>
        <View style={styles.dppHeader}>
          <Text style={styles.dppTitle} numberOfLines={2}>
            {dpp.title}
          </Text>
          <View style={styles.dppBadges}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{dpp.category.toUpperCase()}</Text>
            </View>
            <View style={styles.classBadge}>
              <Text style={styles.classBadgeText}>{dpp.class}</Text>
            </View>
          </View>
        </View>

        <View style={styles.dppStats}>
          <View style={styles.statItem}>
            <Text style={styles.questionStatus}>
              Question: {dpp.questionActive ? '✅' : '❌'}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.answerStatus}>
              Answer: {dpp.answerActive ? '✅' : '❌'}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.viewsText}>
              {dpp.viewCount || 0} views
            </Text>
          </View>
        </View>

        <View style={styles.dateContainer}>
          <Text style={styles.dateText}>
            Updated: {formatDate(dpp.updatedAt)}
          </Text>
        </View>
      </View>

      {/* File Info */}
      <View style={styles.fileInfoContainer}>
        <Text style={styles.fileCountText}>
          {dpp.questionPDF?.pages || 0}
        </Text>
        <Text style={styles.fileCountLabel}>Pages</Text>
        <Text style={styles.fileSizeText}>
          {formatFileSize(dpp.questionPDF?.fileSize || 0)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  // Modal Content
  const renderModal = () => {
    if (!selectedDPP) return null;

    return (
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={handleModalClose}
      >
        <View style={styles.modalOverlay}>
          <Animated.View 
            style={[
              styles.modalContent,
              {
                transform: [{ scale: modalScale }],
              },
            ]}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Text style={styles.modalTitle} numberOfLines={2}>
                  {selectedDPP.title}
                </Text>
                <View style={styles.modalBadges}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>
                      {selectedDPP.category.toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.classBadge}>
                    <Text style={styles.classBadgeText}>
                      {selectedDPP.class}
                    </Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleModalClose}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Modal Body */}
            <View style={styles.modalBody}>
              {/* DPP Stats */}
              <View style={styles.modalStats}>
                <View style={styles.modalStatItem}>
                  <Text style={styles.modalStatLabel}>Views</Text>
                  <Text style={styles.modalStatValue}>
                    {selectedDPP.viewCount || 0}
                  </Text>
                </View>
                <View style={styles.modalStatItem}>
                  <Text style={styles.modalStatLabel}>Pages</Text>
                  <Text style={styles.modalStatValue}>
                    {selectedDPP.questionPDF?.pages || 0}
                  </Text>
                </View>
                <View style={styles.modalStatItem}>
                  <Text style={styles.modalStatLabel}>Size</Text>
                  <Text style={styles.modalStatValue}>
                    {formatFileSize(selectedDPP.questionPDF?.fileSize || 0)}
                  </Text>
                </View>
              </View>

              {/* Authentication Notice */}
              {!isLoggedIn && (
                <View style={styles.authNotice}>
                  <Text style={styles.authNoticeText}>
                    🔒 Please sign in to access PDF files
                  </Text>
                  <TouchableOpacity
                    style={styles.authNoticeButton}
                    onPress={handleLoginBannerSignIn}
                  >
                    <Text style={styles.authNoticeButtonText}>Sign In</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* PDF Actions */}
              <View style={styles.pdfActions}>
                <Text style={styles.pdfActionsTitle}>Available PDFs</Text>
                
                {/* Question PDF */}
                <TouchableOpacity
                  style={[
                    styles.pdfButton,
                    !selectedDPP.questionActive && styles.pdfButtonDisabled
                  ]}
                  onPress={() => handleOpenPDF('question')}
                  disabled={!selectedDPP.questionActive}
                >
                  <View style={styles.pdfButtonContent}>
                    <Text style={styles.pdfButtonIcon}>📄</Text>
                    <View style={styles.pdfButtonInfo}>
                      <Text style={[
                        styles.pdfButtonTitle,
                        !selectedDPP.questionActive && styles.pdfButtonTitleDisabled
                      ]}>
                        Question Paper
                      </Text>
                      <Text style={[
                        styles.pdfButtonSubtitle,
                        !selectedDPP.questionActive && styles.pdfButtonSubtitleDisabled
                      ]}>
                        {selectedDPP.questionActive ? 'Tap to open' : 'Not available'}
                      </Text>
                    </View>
                    <View style={[
                      styles.pdfButtonStatus,
                      selectedDPP.questionActive && styles.pdfButtonStatusActive
                    ]}>
                      <Text style={styles.pdfButtonStatusText}>
                        {selectedDPP.questionActive ? '✅' : '❌'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Answer PDF */}
                <TouchableOpacity
                  style={[
                    styles.pdfButton,
                    !selectedDPP.answerActive && styles.pdfButtonDisabled
                  ]}
                  onPress={() => handleOpenPDF('answer')}
                  disabled={!selectedDPP.answerActive}
                >
                  <View style={styles.pdfButtonContent}>
                    <Text style={styles.pdfButtonIcon}>📋</Text>
                    <View style={styles.pdfButtonInfo}>
                      <Text style={[
                        styles.pdfButtonTitle,
                        !selectedDPP.answerActive && styles.pdfButtonTitleDisabled
                      ]}>
                        Answer Key
                      </Text>
                      <Text style={[
                        styles.pdfButtonSubtitle,
                        !selectedDPP.answerActive && styles.pdfButtonSubtitleDisabled
                      ]}>
                        {selectedDPP.answerActive ? 'Tap to open' : 'Not available'}
                      </Text>
                    </View>
                    <View style={[
                      styles.pdfButtonStatus,
                      selectedDPP.answerActive && styles.pdfButtonStatusActive
                    ]}>
                      <Text style={styles.pdfButtonStatusText}>
                        {selectedDPP.answerActive ? '✅' : '❌'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </View>

              {/* DPP Info */}
              <View style={styles.modalInfo}>
                <Text style={styles.modalInfoTitle}>Details</Text>
                <View style={styles.modalInfoItem}>
                  <Text style={styles.modalInfoLabel}>Created:</Text>
                  <Text style={styles.modalInfoValue}>
                    {formatDate(selectedDPP.createdAt)}
                  </Text>
                </View>
                <View style={styles.modalInfoItem}>
                  <Text style={styles.modalInfoLabel}>Updated:</Text>
                  <Text style={styles.modalInfoValue}>
                    {formatDate(selectedDPP.updatedAt)}
                  </Text>
                </View>
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>
    );
  };

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
            <Text style={styles.headerTitle}>All DPPs</Text>
            <Text style={styles.headerSubtitle}>
              {filteredDPPs.length} practice papers available
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Search Bar */}
      <Animated.View style={[styles.searchSection, { opacity: fadeAnim }]}>
        <View style={styles.searchInputContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search DPPs, categories, class..."
            placeholderTextColor="#666666"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <Text style={styles.searchIcon}>🔍</Text>
        </View>
      </Animated.View>

      {/* Filters Section */}
      <Animated.View style={[styles.filtersSection, { opacity: fadeAnim }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterRow}>
            {/* Category Filters */}
            {renderFilterButton('All Categories', 'all', selectedCategory, setSelectedCategory)}
            {renderFilterButton('JEE', 'jee', selectedCategory, setSelectedCategory)}
            {renderFilterButton('NEET', 'neet', selectedCategory, setSelectedCategory)}
            {renderFilterButton('Boards', 'boards', selectedCategory, setSelectedCategory)}
            
            {/* Class Filters */}
            {renderFilterButton('All Classes', 'all', selectedClass, setSelectedClass)}
            {renderFilterButton('11th', '11th', selectedClass, setSelectedClass)}
            {renderFilterButton('12th', '12th', selectedClass, setSelectedClass)}
          </View>
        </ScrollView>
      </Animated.View>

      {/* DPPs List */}
      <Animated.View style={[styles.dppsContainer, { opacity: fadeAnim }]}>
        <ScrollView
          style={styles.dppsList}
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
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading DPPs...</Text>
            </View>
          ) : filteredDPPs.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No DPPs found</Text>
              <Text style={styles.emptySubtext}>
                Try adjusting your search or filters
              </Text>
            </View>
          ) : (
            <View style={styles.dppsListContent}>
              {filteredDPPs.map((dpp) => renderDPPItem(dpp))}
              <View style={styles.bottomPadding} />
            </View>
          )}
        </ScrollView>
      </Animated.View>

      {/* Modal */}
      {renderModal()}

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND.backgroundColor,
  },
  loginBannerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    padding: 16,
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
  headerSubtitle: {
    fontSize: 12,
    color: BRAND.primaryColor,
    marginTop: 2,
    fontWeight: '500',
  },

  // Search Section
  searchSection: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  searchIcon: {
    fontSize: 16,
    marginLeft: 10,
  },

  // Filters Section
  filtersSection: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  filterButtonActive: {
    backgroundColor: BRAND.primaryColor,
    borderColor: BRAND.primaryColor,
  },
  filterButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: BRAND.backgroundColor,
    fontWeight: '600',
  },

  // DPPs Container
  dppsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  dppsList: {
    flex: 1,
  },
  dppsListContent: {
    paddingTop: 10,
  },

  // DPP Item
  dppItem: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.2)',
    shadowColor: BRAND.primaryColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dppIconContainer: {
    width: 80,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    position: 'relative',
  },
  dppIcon: {
    fontSize: 24,
  },
  dppStatusBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 255, 136, 0.9)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dppStatusText: {
    color: BRAND.backgroundColor,
    fontSize: 8,
    fontWeight: '700',
  },

  // DPP Info
  dppInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  dppHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  dppTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
    lineHeight: 18,
    marginRight: 8,
  },
  dppBadges: {
    flexDirection: 'row',
    gap: 4,
  },
  categoryBadge: {
    backgroundColor: 'rgba(0, 255, 136, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryBadgeText: {
    color: BRAND.primaryColor,
    fontSize: 8,
    fontWeight: '700',
  },
  classBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  classBadgeText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '700',
  },

  dppStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  questionStatus: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '500',
  },
  answerStatus: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '500',
  },
  viewsText: {
    fontSize: 10,
    color: '#aaaaaa',
    fontWeight: '500',
  },
  dateContainer: {
    marginTop: 2,
  },
  dateText: {
    fontSize: 9,
    color: '#888888',
    fontWeight: '400',
  },

  // File Info Container
  // File Info Container
  fileInfoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    minWidth: 50,
  },
  fileCountText: {
    fontSize: 16,
    fontWeight: '700',
    color: BRAND.primaryColor,
    textAlign: 'center',
  },
  fileCountLabel: {
    fontSize: 8,
    color: '#aaaaaa',
    textAlign: 'center',
    marginTop: 2,
    fontWeight: '500',
  },
  fileSizeText: {
    fontSize: 8,
    color: '#888888',
    textAlign: 'center',
    marginTop: 2,
    fontWeight: '400',
  },

  // Loading and Empty States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#aaaaaa',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '400',
  },

  // Bottom Padding
  bottomPadding: {
    height: 20,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: BRAND.backgroundColor,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.3)',
    shadowColor: BRAND.primaryColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  // Modal Header
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeaderLeft: {
    flex: 1,
    marginRight: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
    lineHeight: 22,
  },
  modalBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Modal Body
  modalBody: {
    padding: 20,
  },

  // Modal Stats
  modalStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  modalStatItem: {
    alignItems: 'center',
    flex: 1,
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

  // PDF Actions
  pdfActions: {
    marginBottom: 20,
  },
  pdfActionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  pdfButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.2)',
  },
  pdfButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  pdfButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pdfButtonIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  pdfButtonInfo: {
    flex: 1,
  },
  pdfButtonTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  pdfButtonTitleDisabled: {
    color: '#666666',
  },
  pdfButtonSubtitle: {
    fontSize: 12,
    color: '#aaaaaa',
    fontWeight: '400',
  },
  pdfButtonSubtitleDisabled: {
    color: '#555555',
  },
  pdfButtonStatus: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pdfButtonStatusActive: {
    backgroundColor: 'rgba(0, 255, 136, 0.2)',
  },
  pdfButtonStatusText: {
    fontSize: 12,
  },

  // Modal Info
  modalInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
  },
  modalInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  modalInfoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalInfoLabel: {
    fontSize: 12,
    color: '#aaaaaa',
    fontWeight: '500',
  },
  modalInfoValue: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },
  authNotice: {
  backgroundColor: 'rgba(255, 193, 7, 0.1)',
  borderRadius: 12,
  padding: 16,
  marginBottom: 20,
  borderWidth: 1,
  borderColor: 'rgba(255, 193, 7, 0.3)',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
},
authNoticeText: {
  color: '#ffc107',
  fontSize: 14,
  fontWeight: '500',
  flex: 1,
  marginRight: 12,
},
authNoticeButton: {
  backgroundColor: BRAND.primaryColor,
  paddingHorizontal: 16,
  paddingVertical: 8,
  borderRadius: 8,
},
authNoticeButtonText: {
  color: BRAND.backgroundColor,
  fontSize: 12,
  fontWeight: '700',
},
});

export default AllDPPScreen;