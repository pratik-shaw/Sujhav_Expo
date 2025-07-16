import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  RefreshControl,
  Alert,
  Animated,
  ActivityIndicator,
  Modal,
  StatusBar,
  Linking,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationProp } from '@react-navigation/native';
import { API_BASE } from '../config/api';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';

// Brand configuration
const BRAND = {
  name: "SUJHAV",
  primaryColor: '#00ff88',
  secondaryColor: '#000000',
  backgroundColor: '#0a1a0a',
  accentColor: '#1a2e1a',
  cardBackground: '#1a2e1a',
  borderColor: '#2a3e2a',
  textPrimary: '#ffffff',
  textSecondary: '#b0b0b0',
  successColor: '#00ff88',
  warningColor: '#ffaa00',
  dangerColor: '#ff4444',
};

const { width, height } = Dimensions.get('window');

interface UserReportsScreenProps {
  navigation: NavigationProp<any>;
}

interface UserData {
  id: string;
  email: string;
  name: string;
  token: string;
  role?: string;
}

interface Batch {
  _id: string;
  batchName: string;
  category: string;
  teachers: Array<{
    _id: string;
    name: string;
    email: string;
  }>;
}

interface TestReport {
  testId: string;
  testTitle: string;
  fullMarks: number;
  marksScored: number | null;
  submittedAt: string | null;
  evaluatedAt: string | null;
  createdAt: string;
  dueDate: string | null;
  batch: {
    _id: string;
    batchName: string;
    category: string;
  };
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  instructions: string;
  percentage: string | null;
  status: 'pending' | 'submitted' | 'evaluated';
  hasQuestionPdf?: boolean;
}

interface UserReportsData {
  batches: Batch[];
  tests: TestReport[];
  totalTests: number;
  totalBatches: number;
  statistics: {
    totalTests: number;
    evaluatedTests: number;
    pendingTests: number;
    averagePercentage: number;
    totalMarksScored: number;
    totalFullMarks: number;
  };
}

const UserReportsScreen: React.FC<UserReportsScreenProps> = ({ navigation }) => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isAssignedToBatch, setIsAssignedToBatch] = useState<boolean>(false);
  const [reportsData, setReportsData] = useState<UserReportsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'pending' | 'evaluated'>('all');
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Check authentication status
  const checkAuthStatus = async (): Promise<UserData | null> => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userRole = await AsyncStorage.getItem('userRole');
      const userId = await AsyncStorage.getItem('userId');
      const userName = await AsyncStorage.getItem('userName');
      const storedUserData = await AsyncStorage.getItem('userData');
      
      if (token && userId && userName) {
        let parsedUserData = null;
        
        if (storedUserData) {
          try {
            parsedUserData = JSON.parse(storedUserData);
          } catch (e) {
            console.error('Error parsing stored user data:', e);
          }
        }
        
        const userDataObj: UserData = {
          id: userId,
          name: userName,
          email: parsedUserData?.email || '',
          token: token,
          role: userRole || 'user'
        };
        
        setUserData(userDataObj);
        setIsLoggedIn(true);
        return userDataObj;
      } else {
        setIsLoggedIn(false);
        setUserData(null);
        setShowLoginModal(true);
        return null;
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setIsLoggedIn(false);
      setUserData(null);
      setShowLoginModal(true);
      return null;
    }
  };

  const handleDownloadError = (statusCode: number | null, type: 'question' | 'answer') => {
  const isQuestion = type === 'question';
  const pdfType = isQuestion ? 'Question PDF' : 'Answer PDF';
  
  if (statusCode === 403) {
    Alert.alert(
      'Access Denied', 
      isQuestion 
        ? 'You are not authorized to download this PDF' 
        : 'Answer sheet is only available after test evaluation'
    );
  } else if (statusCode === 404 || statusCode === 400) {
    Alert.alert('No PDF Available', `No ${pdfType.toLowerCase()} is attached to this test`);
  } else if (statusCode === 500) {
    Alert.alert('Server Error', 'Server error occurred. Please try again later.');
  } else {
    // Generic message for any other error (including network errors)
    Alert.alert('No PDF Available', `No ${pdfType.toLowerCase()} is attached to this test`);
  }
};

  // Download question PDF using Expo FileSystem
  const downloadQuestionPdf = async (testId: string, testTitle: string) => {
  try {
    if (!userData) {
      Alert.alert('Error', 'Please log in to download files');
      return;
    }

    setDownloadingPdf(testId);

    // Create sanitized filename
    const sanitizedTitle = testTitle.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `${sanitizedTitle}_Questions.pdf`;
    const fileUri = FileSystem.documentDirectory + fileName;

    // Download the file
    const downloadResult = await FileSystem.downloadAsync(
      `${API_BASE}/tests/student/test/${testId}/question-pdf`,
      fileUri,
      {
        headers: {
          'Authorization': `Bearer ${userData.token}`,
        },
      }
    );

    if (downloadResult.status === 200) {
      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      
      if (isAvailable) {
        // Share the file (this will allow users to save it or open with other apps)
        await Sharing.shareAsync(downloadResult.uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Save or Open PDF',
          UTI: 'com.adobe.pdf',
        });
      } else {
        // Fallback: try to save to media library (Android)
        if (Platform.OS === 'android') {
          try {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status === 'granted') {
              const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
              await MediaLibrary.createAlbumAsync('SUJHAV', asset, false);
              Alert.alert('Success', 'PDF saved to your device');
            } else {
              Alert.alert('Permission Required', 'Please grant permission to save files');
            }
          } catch (mediaError) {
            // Silent handling - don't log to console
            Alert.alert('Error', 'Failed to save PDF to device');
          }
        } else {
          Alert.alert('Success', 'PDF downloaded successfully');
        }
      }
    } else {
      // Handle non-200 responses without throwing errors
      handleDownloadError(downloadResult.status, 'question');
    }

  } catch (error) {
    // Handle network errors and other exceptions silently
    handleDownloadError(null, 'question');
  } finally {
    setDownloadingPdf(null);
  }
};

  // Download answer PDF (only for evaluated tests)
  const downloadAnswerPdf = async (testId: string, testTitle: string) => {
  try {
    if (!userData) {
      Alert.alert('Error', 'Please log in to download files');
      return;
    }

    setDownloadingPdf(testId + '_answer');

    // Create sanitized filename
    const sanitizedTitle = testTitle.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `${sanitizedTitle}_Answers.pdf`;
    const fileUri = FileSystem.documentDirectory + fileName;

    // Download the file
    const downloadResult = await FileSystem.downloadAsync(
      `${API_BASE}/tests/student/test/${testId}/answer-pdf`,
      fileUri,
      {
        headers: {
          'Authorization': `Bearer ${userData.token}`,
        },
      }
    );

    if (downloadResult.status === 200) {
      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      
      if (isAvailable) {
        // Share the file
        await Sharing.shareAsync(downloadResult.uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Save or Open Answer PDF',
          UTI: 'com.adobe.pdf',
        });
      } else {
        // Fallback for Android
        if (Platform.OS === 'android') {
          try {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status === 'granted') {
              const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
              await MediaLibrary.createAlbumAsync('SUJHAV', asset, false);
              Alert.alert('Success', 'Answer PDF saved to your device');
            } else {
              Alert.alert('Permission Required', 'Please grant permission to save files');
            }
          } catch (mediaError) {
            // Silent handling - don't log to console
            Alert.alert('Error', 'Failed to save PDF to device');
          }
        } else {
          Alert.alert('Success', 'Answer PDF downloaded successfully');
        }
      }
    } else {
      // Handle non-200 responses without throwing errors
      handleDownloadError(downloadResult.status, 'answer');
    }

  } catch (error) {
    // Handle network errors and other exceptions silently
    handleDownloadError(null, 'answer');
  } finally {
    setDownloadingPdf(null);
  }
};

  // Fetch user reports
  const fetchUserReports = async () => {
    try {
      setLoading(true);
      
      const currentUserData = await checkAuthStatus();
      if (!currentUserData) {
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE}/tests/user/comprehensive-reports`, {
        headers: {
          'Authorization': `Bearer ${currentUserData.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('User reports response:', data);
        
        if (data.success) {
          setIsAssignedToBatch(data.isAssigned);
          
          if (data.isAssigned) {
            setReportsData(data.data);
          } else {
            setReportsData(null);
          }
        } else {
          console.error('Failed to fetch user reports:', data.message);
          Alert.alert('Error', data.message || 'Failed to fetch reports');
        }
      } else {
        console.error('Failed to fetch user reports:', response.status);
        Alert.alert('Error', 'Failed to fetch reports. Please try again.');
      }
    } catch (error) {
      console.error('Error fetching user reports:', error);
      Alert.alert('Error', 'Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUserReports();
    setRefreshing(false);
  };

  // Start animations
  const startAnimations = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Navigate to login
  const handleLogin = () => {
    setShowLoginModal(false);
    navigation.navigate('Login');
  };

  // Navigate to course details
  const handleJoinOnline = () => {
    navigation.navigate('Home');
  };

  // Filter tests based on selected filter
  const getFilteredTests = () => {
    if (!reportsData) return [];
    
    switch (selectedFilter) {
      case 'pending':
        return reportsData.tests.filter(test => test.status === 'pending');
      case 'evaluated':
        return reportsData.tests.filter(test => test.status === 'evaluated');
      default:
        return reportsData.tests;
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'evaluated':
        return BRAND.successColor;
      case 'submitted':
        return BRAND.warningColor;
      case 'pending':
        return BRAND.dangerColor;
      default:
        return BRAND.textSecondary;
    }
  };

  // Get grade based on percentage
  const getGrade = (percentage: number) => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C+';
    if (percentage >= 40) return 'C';
    return 'F';
  };

  // Initialize screen
  useEffect(() => {
    fetchUserReports();
    startAnimations();
  }, []);

  // Login Modal Component
  const LoginModal = () => (
    <Modal
      visible={showLoginModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowLoginModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Login Required</Text>
          <Text style={styles.modalText}>
            Please log in to view your test reports and academic performance.
          </Text>
          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.modalButton} onPress={handleLogin}>
              <Text style={styles.modalButtonText}>Login</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modalButton, styles.modalButtonSecondary]} 
              onPress={() => setShowLoginModal(false)}
            >
              <Text style={[styles.modalButtonText, styles.modalButtonTextSecondary]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Empty State Component
  const EmptyState = () => (
    <Animated.View 
      style={[
        styles.emptyStateContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }
      ]}
    >
      <Text style={styles.emptyStateTitle}>
        Not a Registered Student
      </Text>
      <Text style={styles.emptyStateText}>
        You are not registered as a student in any offline center batch.
      </Text>
      <Text style={styles.emptyStateSubtext}>
        Join SUJHAV Online Center to continue your learning journey!
      </Text>
      <TouchableOpacity style={styles.joinButton} onPress={handleJoinOnline}>
        <Text style={styles.joinButtonText}>Join Online Center</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  // Statistics Card Component
  const StatisticsCard = ({ statistics }: { statistics: any }) => (
    <View style={styles.statisticsCard}>
      <Text style={styles.cardTitle}>Performance Overview</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{statistics.totalTests}</Text>
          <Text style={styles.statLabel}>Total Tests</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{statistics.evaluatedTests}</Text>
          <Text style={styles.statLabel}>Evaluated</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{statistics.pendingTests}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: BRAND.successColor }]}>
            {statistics.averagePercentage.toFixed(1)}%
          </Text>
          <Text style={styles.statLabel}>Average</Text>
        </View>
      </View>
    </View>
  );

  // Test Card Component
  const TestCard = ({ test }: { test: TestReport }) => (
    <View style={styles.testCard}>
      <View style={styles.testHeader}>
        <Text style={styles.testTitle}>{test.testTitle}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(test.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(test.status) }]}>
            {test.status.toUpperCase()}
          </Text>
        </View>
      </View>
      
      <View style={styles.testDetails}>
        <Text style={styles.testBatch}>Batch: {test.batch.batchName}</Text>
        <Text style={styles.testTeacher}>Teacher: {test.createdBy.name}</Text>
        <Text style={styles.testDate}>
          Created: {new Date(test.createdAt).toLocaleDateString()}
        </Text>
        
        {test.dueDate && (
          <Text style={styles.testDueDate}>
            Due: {new Date(test.dueDate).toLocaleDateString()}
          </Text>
        )}
      </View>

      <View style={styles.marksContainer}>
        <Text style={styles.marksLabel}>Marks:</Text>
        {test.marksScored !== null ? (
          <View style={styles.marksInfo}>
            <Text style={styles.marksValue}>
              {test.marksScored}/{test.fullMarks}
            </Text>
            <Text style={[styles.percentage, { color: BRAND.successColor }]}>
              {test.percentage}%
            </Text>
            <Text style={[styles.grade, { color: BRAND.successColor }]}>
              ({getGrade(parseFloat(test.percentage || '0'))})
            </Text>
          </View>
        ) : (
          <Text style={[styles.marksValue, { color: BRAND.textSecondary }]}>
            Not Evaluated
          </Text>
        )}
      </View>

      {/* Download Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[
            styles.downloadButton,
            downloadingPdf === test.testId && styles.downloadButtonDisabled
          ]}
          onPress={() => downloadQuestionPdf(test.testId, test.testTitle)}
          disabled={downloadingPdf === test.testId}
        >
          {downloadingPdf === test.testId ? (
            <ActivityIndicator size="small" color={BRAND.textPrimary} />
          ) : (
            <Text style={styles.downloadButtonText}>📄 Questions</Text>
          )}
        </TouchableOpacity>

        {/* Answer PDF button - only show for evaluated tests */}
        {test.status === 'evaluated' && (
          <TouchableOpacity
            style={[
              styles.downloadButton,
              styles.answerButton,
              downloadingPdf === test.testId + '_answer' && styles.downloadButtonDisabled
            ]}
            onPress={() => downloadAnswerPdf(test.testId, test.testTitle)}
            disabled={downloadingPdf === test.testId + '_answer'}
          >
            {downloadingPdf === test.testId + '_answer' ? (
              <ActivityIndicator size="small" color={BRAND.textPrimary} />
            ) : (
              <Text style={styles.downloadButtonText}>📋 Answers</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  // Filter Buttons Component
  const FilterButtons = () => (
    <View style={styles.filterContainer}>
      {['all', 'pending', 'evaluated'].map((filter) => (
        <TouchableOpacity
          key={filter}
          style={[
            styles.filterButton,
            selectedFilter === filter && styles.filterButtonActive
          ]}
          onPress={() => setSelectedFilter(filter as any)}
        >
          <Text style={[
            styles.filterButtonText,
            selectedFilter === filter && styles.filterButtonTextActive
          ]}>
            {filter.toUpperCase()}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // Loading component
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={BRAND.primaryColor} />
        <Text style={styles.loadingText}>Loading your reports...</Text>
      </View>
    );
  }

  // Main render
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND.backgroundColor} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Reports</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Login Modal */}
      <LoginModal />

      {/* Main Content */}
      {!isLoggedIn ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={BRAND.primaryColor} />
        </View>
      ) : !isAssignedToBatch ? (
        <EmptyState />
      ) : (
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[BRAND.primaryColor]}
              tintColor={BRAND.primaryColor}
            />
          }
        >
          {reportsData && (
            <Animated.View 
              style={[
                styles.contentContainer,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                }
              ]}
            >
              {/* Statistics Card */}
              <StatisticsCard statistics={reportsData.statistics} />

              {/* Batch Information */}
              <View style={styles.batchCard}>
                <Text style={styles.cardTitle}>Your Batches</Text>
                {reportsData.batches.map((batch) => (
                  <View key={batch._id} style={styles.batchItem}>
                    <Text style={styles.batchName}>{batch.batchName}</Text>
                    <Text style={styles.batchCategory}>{batch.category.toUpperCase()}</Text>
                  </View>
                ))}
              </View>

              {/* Filter Buttons */}
              <FilterButtons />

              {/* Tests List */}
              <View style={styles.testsContainer}>
                <Text style={styles.sectionTitle}>
                  Test Reports ({getFilteredTests().length})
                </Text>
                {getFilteredTests().length === 0 ? (
                  <Text style={styles.noTestsText}>No tests found for the selected filter.</Text>
                ) : (
                  getFilteredTests().map((test) => (
                    <TestCard key={test.testId} test={test} />
                  ))
                )}
              </View>
            </Animated.View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
    actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: BRAND.borderColor,
  },
  downloadButton: {
    backgroundColor: BRAND.primaryColor + '20',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BRAND.primaryColor,
    flex: 1,
    marginHorizontal: 4,
  },
  downloadButtonDisabled: {
    backgroundColor: BRAND.textSecondary + '20',
    borderColor: BRAND.textSecondary,
  },
  downloadButtonText: {
    color: BRAND.primaryColor,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: BRAND.backgroundColor,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.borderColor,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BRAND.accentColor,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: BRAND.primaryColor,
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: BRAND.textPrimary,
  },
  headerRight: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BRAND.backgroundColor,
  },
  loadingText: {
    color: BRAND.textSecondary,
    marginTop: 10,
    fontSize: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: BRAND.textPrimary,
    textAlign: 'center',
    marginBottom: 15,
  },
  emptyStateText: {
    fontSize: 16,
    color: BRAND.textSecondary,
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 24,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: BRAND.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 20,
  },
  joinButton: {
    backgroundColor: BRAND.primaryColor,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
  },
  joinButtonText: {
    color: BRAND.secondaryColor,
    fontSize: 16,
    fontWeight: 'bold',
  },
  statisticsCard: {
    backgroundColor: BRAND.cardBackground,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: BRAND.borderColor,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: BRAND.textPrimary,
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  statItem: {
    alignItems: 'center',
    minWidth: '22%',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: BRAND.primaryColor,
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: BRAND.textSecondary,
    textAlign: 'center',
  },
  batchCard: {
    backgroundColor: BRAND.cardBackground,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: BRAND.borderColor,
  },
  batchItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.borderColor,
  },
  batchName: {
    fontSize: 16,
    fontWeight: '600',
    color: BRAND.textPrimary,
    flex: 1,
  },
  batchCategory: {
    fontSize: 12,
    color: BRAND.primaryColor,
    backgroundColor: BRAND.primaryColor + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    fontWeight: '600',
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    backgroundColor: BRAND.cardBackground,
    borderRadius: 15,
    padding: 5,
    borderWidth: 1,
    borderColor: BRAND.borderColor,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  filterButtonActive: {
    backgroundColor: BRAND.primaryColor,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: BRAND.textSecondary,
  },
  filterButtonTextActive: {
    color: BRAND.secondaryColor,
  },
  testsContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: BRAND.textPrimary,
    marginBottom: 15,
  },
  noTestsText: {
    fontSize: 16,
    color: BRAND.textSecondary,
    textAlign: 'center',
    marginTop: 30,
    fontStyle: 'italic',
  },
  testCard: {
    backgroundColor: BRAND.cardBackground,
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: BRAND.borderColor,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  testHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  testTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: BRAND.textPrimary,
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  testDetails: {
    marginBottom: 15,
  },
  testBatch: {
    fontSize: 14,
    color: BRAND.textSecondary,
    marginBottom: 4,
  },
  testTeacher: {
    fontSize: 14,
    color: BRAND.textSecondary,
    marginBottom: 4,
  },
  testDate: {
    fontSize: 14,
    color: BRAND.textSecondary,
    marginBottom: 4,
  },
  testDueDate: {
    fontSize: 14,
    color: BRAND.warningColor,
    fontWeight: '600',
  },
  marksContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: BRAND.borderColor,
  },
  marksLabel: {
    fontSize: 14,
    color: BRAND.textSecondary,
    fontWeight: '600',
  },
  marksInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  marksValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: BRAND.textPrimary,
  },
  percentage: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  grade: {
    fontSize: 14,
    fontWeight: '600',
    backgroundColor: BRAND.successColor + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: BRAND.cardBackground,
    borderRadius: 20,
    padding: 30,
    width: width * 0.85,
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BRAND.borderColor,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: BRAND.textPrimary,
    marginBottom: 15,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    color: BRAND.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 25,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 15,
  },
  modalButton: {
    flex: 1,
    backgroundColor: BRAND.primaryColor,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: BRAND.borderColor,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: BRAND.secondaryColor,
  },
  modalButtonTextSecondary: {
    color: BRAND.textSecondary,
  },
  
  // Add this missing style:
  answerButton: {
    backgroundColor: BRAND.successColor + '20',
    borderColor: BRAND.successColor,
  },
});

export default UserReportsScreen;