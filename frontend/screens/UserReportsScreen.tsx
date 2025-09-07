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
  Platform,
  Image,
  FlatList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationProp } from '@react-navigation/native';
import { API_BASE } from '../config/api';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import BottomNavigation from '../components/BottomNavigation';
import SignupLoginBanner from '../components/SignupLoginBanner';
import UserProfileQuickActions from '../components/UserProfileQuickActions';

// Brand configuration
const BRAND = {
  name: "SUJHAV",
  subtitle: "Synchronize your Understanding, do Justice to your Hardwork and let others Admire your Victory!",
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
  classes: string[];
  subjects: Array<{
    name?: string;
    teacher?: {
      _id?: string;
      name?: string;
      email?: string;
    };
  }>;
  userAssignment?: {
    assignedClasses: string[];
    assignedSubjects: Array<{
      subjectName?: string;
    }>;
  };
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
  className: string;
  subjectName: string;
  batch: {
    _id: string;
    batchName?: string;
    category?: string;
  };
  createdBy: {
    _id: string;
    name?: string;
    email?: string;
  };
  instructions: string;
  percentage: string | null;
  status: 'pending' | 'submitted' | 'evaluated';
  hasQuestionPdf?: boolean;
  hasAnswerPdf?: boolean;
}

interface UserReportsData {
  batches: Batch[];
  tests: TestReport[];
  userAssignments: Array<{
    batchId: string;
    batchName: string;
    category: string;
    subjectName: string;
    classes: string[];
  }>;
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
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isAssignedToBatch, setIsAssignedToBatch] = useState<boolean>(false);
  const [reportsData, setReportsData] = useState<UserReportsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [showBanner, setShowBanner] = useState<boolean>(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'pending' | 'evaluated'>('all');
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-20)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentScale = useRef(new Animated.Value(0.8)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;
  const buttonScale = useRef(new Animated.Value(0.8)).current;

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
        setShowBanner(true);
        return null;
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setIsLoggedIn(false);
      setUserData(null);
      setShowBanner(true);
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
      Alert.alert('No PDF Available', `No ${pdfType.toLowerCase()} is attached to this test`);
    }
  };

  // Download question PDF using new student endpoint
  const downloadQuestionPdf = async (testId: string, testTitle: string) => {
    try {
      if (!userData) {
        Alert.alert('Error', 'Please log in to download files');
        return;
      }

      setDownloadingPdf(testId);

      const sanitizedTitle = testTitle.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `${sanitizedTitle}_Questions.pdf`;
      const fileUri = FileSystem.documentDirectory + fileName;

      // Updated endpoint path for student question PDF download
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
        const isAvailable = await Sharing.isAvailableAsync();
        
        if (isAvailable) {
          await Sharing.shareAsync(downloadResult.uri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Save or Open PDF',
            UTI: 'com.adobe.pdf',
          });
        } else {
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
              Alert.alert('Error', 'Failed to save PDF to device');
            }
          } else {
            Alert.alert('Success', 'PDF downloaded successfully');
          }
        }
      } else {
        handleDownloadError(downloadResult.status, 'question');
      }
    } catch (error) {
      console.error('Download error:', error);
      handleDownloadError(null, 'question');
    } finally {
      setDownloadingPdf(null);
    }
  };

  // Download answer PDF using new student endpoint
  const downloadAnswerPdf = async (testId: string, testTitle: string) => {
    try {
      if (!userData) {
        Alert.alert('Error', 'Please log in to download files');
        return;
      }

      setDownloadingPdf(testId + '_answer');

      const sanitizedTitle = testTitle.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `${sanitizedTitle}_Answers.pdf`;
      const fileUri = FileSystem.documentDirectory + fileName;

      // Updated endpoint path for student answer PDF download
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
        const isAvailable = await Sharing.isAvailableAsync();
        
        if (isAvailable) {
          await Sharing.shareAsync(downloadResult.uri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Save or Open Answer PDF',
            UTI: 'com.adobe.pdf',
          });
        } else {
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
              Alert.alert('Error', 'Failed to save PDF to device');
            }
          } else {
            Alert.alert('Success', 'Answer PDF downloaded successfully');
          }
        }
      } else {
        handleDownloadError(downloadResult.status, 'answer');
      }
    } catch (error) {
      console.error('Download error:', error);
      handleDownloadError(null, 'answer');
    } finally {
      setDownloadingPdf(null);
    }
  };

  // Fetch user reports using new endpoint structure
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
          // Transform the data with comprehensive null safety
          const transformedData = {
            batches: (data.data?.batches || []).map((batch: any) => ({
              ...batch,
              batchName: batch?.batchName || 'Unknown Batch',
              category: batch?.category || 'Unknown Category',
              classes: batch?.classes || [],
              subjects: (batch?.subjects || []).map((subject: any) => ({
                name: subject?.name || 'Unknown Subject',
                teacher: {
                  _id: subject?.teacher?._id || '',
                  name: subject?.teacher?.name || 'Unknown Teacher',
                  email: subject?.teacher?.email || '',
                }
              })),
              userAssignment: batch?.userAssignment ? {
                assignedClasses: batch.userAssignment.assignedClasses || [],
                assignedSubjects: (batch.userAssignment.assignedSubjects || []).map((s: any) => ({
                  subjectName: s?.subjectName || 'Unknown Subject'
                }))
              } : undefined
            })),
            tests: (data.data?.tests || []).map((test: any) => ({
              ...test,
              testTitle: test?.testTitle || 'Untitled Test',
              batch: {
                _id: test?.batch?._id || '',
                batchName: test?.batch?.batchName || 'Unknown Batch',
                category: test?.batch?.category || 'Unknown Category',
              },
              createdBy: {
                _id: test?.createdBy?._id || '',
                name: test?.createdBy?.name || 'Unknown Teacher',
                email: test?.createdBy?.email || '',
              },
              className: test?.className || 'Unknown Class',
              subjectName: test?.subjectName || 'Unknown Subject',
              percentage: test?.percentage || null,
            })),
            userAssignments: data.data?.userAssignments || [],
            statistics: {
              totalTests: data.data?.statistics?.totalTests || 0,
              evaluatedTests: data.data?.statistics?.evaluatedTests || 0,
              pendingTests: data.data?.statistics?.pendingTests || 0,
              averagePercentage: parseFloat(data.data?.statistics?.averagePercentage || '0'),
              totalMarksScored: data.data?.statistics?.totalMarksScored || 0,
              totalFullMarks: data.data?.statistics?.totalFullMarks || 0,
            }
          };
          setReportsData(transformedData);
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

    // Content animation
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(contentScale, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }, 600);

    // Fade in animation
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(buttonScale, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start();
    }, 1000);
  };

  const startPulseAnimation = () => {
    const pulse = () => {
      Animated.sequence([
        Animated.timing(pulseScale, {
          toValue: 1.02,
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

  // Navigation handlers
  const handleJoinOnline = () => {
    navigation.navigate('Home');
  };

  const handleBannerClose = () => {
    setShowBanner(false);
  };

  const handleSignInPress = () => {
    navigation.navigate('SignIn');
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
  }, []);

  // Handle entrance animations
  useEffect(() => {
    if (isLoggedIn !== null) {
      startEntranceAnimation();
      startPulseAnimation();
    }
  }, [isLoggedIn]);

  // Empty State Component (Not registered student)
  const EmptyState = () => (
    <View style={styles.unauthenticatedContainer}>
      <Animated.View
        style={[
          styles.welcomeSection,
          {
            opacity: contentOpacity,
            transform: [{ translateY: Animated.multiply(contentScale, 20) }],
          },
        ]}
      >
        {/* Logo */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              transform: [
                { scale: Animated.multiply(contentScale, pulseScale) }
              ],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.logoGlow,
              { opacity: Animated.multiply(glowOpacity, 0.5) }
            ]}
          />
          <Image
            source={require('../assets/images/logo-sujhav.png')}
            style={styles.headerLogoImage}
            resizeMode="contain"
          />
        </Animated.View>

        <Text style={styles.welcomeTitle}>Not a Registered Student</Text>
        <Text style={styles.welcomeSubtitle}>
          You are not registered as a student in any offline center batch.
        </Text>
        <Text style={styles.welcomeSubtext}>
          Join SUJHAV Online Center to continue your learning journey!
        </Text>
      </Animated.View>

<UserProfileQuickActions navigation={navigation} />

      {/* Join Online Button */}
      <Animated.View
        style={[
          styles.signInButtonContainer,
          { 
            opacity: fadeAnim,
            transform: [{ scale: buttonScale }]
          }
        ]}
      >
        <TouchableOpacity 
          style={styles.signInButton}
          onPress={handleJoinOnline}
          activeOpacity={0.8}
        >
          <Animated.View
            style={[
              styles.buttonGlow,
              { opacity: Animated.multiply(glowOpacity, 0.6) }
            ]}
          />
          <Text style={styles.signInButtonText}>Join Online Center</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );

  // Statistics Card Component
  const StatisticsCard = ({ statistics }: { statistics: any }) => (
    <Animated.View style={[styles.statisticsCard, { 
      opacity: fadeAnim,
      transform: [{ scale: Animated.multiply(contentScale, pulseScale) }],
    }]}>
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
    </Animated.View>
  );

  // Test Card Component with enhanced information
  const TestCard = ({ item }: { item: TestReport }) => (
  <Animated.View
    style={[
      styles.testCard,
      {
        opacity: fadeAnim,
        transform: [{ scale: Animated.multiply(contentScale, pulseScale) }],
      },
    ]}
  >
    <View style={styles.testCardContent}>
      <View style={styles.testHeader}>
        <Text style={styles.testTitle}>{item.testTitle || 'Untitled Test'}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status?.toUpperCase() || 'UNKNOWN'}
          </Text>
        </View>
      </View>
      
      <View style={styles.testDetails}>
        <View style={styles.testInfoRow}>
          <MaterialIcons name="group" size={14} color={BRAND.textSecondary} />
          <Text style={styles.testInfoText}>
            Batch: {safeGetBatchName(item.batch)}
          </Text>
        </View>
        <View style={styles.testInfoRow}>
          <MaterialIcons name="class" size={14} color={BRAND.textSecondary} />
          <Text style={styles.testInfoText}>Class: {item.className || 'Unknown Class'}</Text>
        </View>
        <View style={styles.testInfoRow}>
          <MaterialIcons name="subject" size={14} color={BRAND.textSecondary} />
          <Text style={styles.testInfoText}>Subject: {item.subjectName || 'Unknown Subject'}</Text>
        </View>
        <View style={styles.testInfoRow}>
          <MaterialIcons name="person" size={14} color={BRAND.textSecondary} />
          <Text style={styles.testInfoText}>
            Teacher: {safeGetCreatorName(item.createdBy)}
          </Text>
        </View>
        <View style={styles.testInfoRow}>
          <MaterialIcons name="calendar-today" size={14} color={BRAND.textSecondary} />
          <Text style={styles.testInfoText}>
            Created: {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Unknown Date'}
          </Text>
        </View>
        
        {item.dueDate && (
          <View style={styles.testInfoRow}>
            <MaterialIcons name="schedule" size={14} color={BRAND.warningColor} />
            <Text style={[styles.testInfoText, { color: BRAND.warningColor }]}>
              Due: {new Date(item.dueDate).toLocaleDateString()}
            </Text>
          </View>
        )}
        
        {item.evaluatedAt && (
          <View style={styles.testInfoRow}>
            <MaterialIcons name="check-circle" size={14} color={BRAND.successColor} />
            <Text style={[styles.testInfoText, { color: BRAND.successColor }]}>
              Evaluated: {new Date(item.evaluatedAt).toLocaleDateString()}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.marksContainer}>
        <Text style={styles.marksLabel}>Marks:</Text>
        {item.marksScored !== null && item.marksScored !== undefined ? (
          <View style={styles.marksInfo}>
            <Text style={styles.marksValue}>
              {item.marksScored}/{item.fullMarks || 0}
            </Text>
            <Text style={[styles.percentage, { color: BRAND.successColor }]}>
              {item.percentage || '0'}%
            </Text>
            <Text style={[styles.grade, { color: BRAND.successColor }]}>
              ({getGrade(parseFloat(item.percentage || '0'))})
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
        {/* Question PDF button - always show if available */}
        {item.hasQuestionPdf && (
          <TouchableOpacity
            style={[
              styles.downloadButton,
              downloadingPdf === item.testId && styles.downloadButtonDisabled
            ]}
            onPress={() => downloadQuestionPdf(item.testId, item.testTitle || 'test')}
            disabled={downloadingPdf === item.testId}
          >
            {downloadingPdf === item.testId ? (
              <ActivityIndicator size="small" color={BRAND.textPrimary} />
            ) : (
              <>
                <MaterialIcons name="description" size={16} color={BRAND.textPrimary} />
                <Text style={styles.downloadButtonText}>Questions</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Answer PDF button - only show for evaluated tests with answer PDF */}
        {item.status === 'evaluated' && item.hasAnswerPdf && (
          <TouchableOpacity
            style={[
              styles.downloadButton,
              styles.answerButton,
              downloadingPdf === item.testId + '_answer' && styles.downloadButtonDisabled
            ]}
            onPress={() => downloadAnswerPdf(item.testId, item.testTitle || 'test')}
            disabled={downloadingPdf === item.testId + '_answer'}
          >
            {downloadingPdf === item.testId + '_answer' ? (
              <ActivityIndicator size="small" color={BRAND.textPrimary} />
            ) : (
              <>
                <MaterialIcons name="assignment" size={16} color={BRAND.textPrimary} />
                <Text style={styles.downloadButtonText}>Answers</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  </Animated.View>
);

  // Enhanced Batch Card Component
  // Enhanced Batch Card Component with null safety
// Updated TypeScript interfaces with optional properties
interface Batch {
  _id: string;
  batchName: string;
  category: string;
  classes: string[];
  subjects: Array<{
    name?: string;
    teacher?: {
      _id?: string;
      name?: string;
      email?: string;
    };
  }>;
  userAssignment?: {
    assignedClasses: string[];
    assignedSubjects: Array<{
      subjectName?: string;
    }>;
  };
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
  className: string;
  subjectName: string;
  batch: {
    _id: string;
    batchName?: string;
    category?: string;
  };
  createdBy: {
    _id: string;
    name?: string;
    email?: string;
  };
  instructions: string;
  percentage: string | null;
  status: 'pending' | 'submitted' | 'evaluated';
  hasQuestionPdf?: boolean;
  hasAnswerPdf?: boolean;
}

// Safe data access helpers
const safeGetTeacherName = (teacher: any): string => {
  return teacher?.name || 'Unknown Teacher';
};

const safeGetBatchName = (batch: any): string => {
  return batch?.batchName || 'Unknown Batch';
};

const safeGetCreatorName = (creator: any): string => {
  return creator?.name || 'Unknown Creator';
};

// Enhanced Batch Card Component with comprehensive null safety
const BatchCard = ({ batch }: { batch: Batch }) => (
  <Animated.View style={[styles.batchCard, { opacity: fadeAnim }]}>
    <Text style={styles.batchName}>{batch.batchName || 'Unknown Batch'}</Text>
    <Text style={styles.batchCategory}>{batch.category || 'Unknown Category'}</Text>
    
    {/* Show user's assigned classes */}
    {batch.userAssignment?.assignedClasses && batch.userAssignment.assignedClasses.length > 0 && (
      <View style={styles.assignmentInfo}>
        <Text style={styles.assignmentLabel}>Your Classes:</Text>
        <Text style={styles.assignmentValue}>
          {batch.userAssignment.assignedClasses.join(', ')}
        </Text>
      </View>
    )}
    
    {/* Show user's assigned subjects */}
    {batch.userAssignment?.assignedSubjects && batch.userAssignment.assignedSubjects.length > 0 && (
      <View style={styles.assignmentInfo}>
        <Text style={styles.assignmentLabel}>Your Subjects:</Text>
        <Text style={styles.assignmentValue}>
          {batch.userAssignment.assignedSubjects
            .map(s => s?.subjectName || 'Unknown Subject')
            .filter(name => name !== 'Unknown Subject')
            .join(', ') || 'No subjects assigned'
          }
        </Text>
      </View>
    )}
    
    {/* Show available subjects with teachers - with comprehensive null safety */}
    {batch.subjects && batch.subjects.length > 0 && (
      <View style={styles.subjectsContainer}>
        <Text style={styles.subjectsLabel}>All Subjects:</Text>
        {batch.subjects
          .filter(subject => subject && subject.name) // Filter out invalid subjects
          .map((subject, index) => (
            <View key={index} style={styles.subjectItem}>
              <Text style={styles.subjectName}>
                {subject.name || 'Unknown Subject'}
              </Text>
              <Text style={styles.teacherName}>
                by {safeGetTeacherName(subject.teacher)}
              </Text>
            </View>
          ))
        }
      </View>
    )}
  </Animated.View>
);


  // Filter Buttons Component
  const FilterButtons = () => (
    <Animated.View style={[styles.filterContainer, { opacity: fadeAnim }]}>
      {['all', 'pending', 'evaluated'].map((filter) => (
        <TouchableOpacity
          key={filter}
          style={[
            styles.filterTab,
            selectedFilter === filter && styles.activeFilterTab,
          ]}
          onPress={() => setSelectedFilter(filter as any)}
        >
          <Text style={[
            styles.filterTabText,
            selectedFilter === filter && styles.activeFilterTabText,
          ]}>
            {filter.toUpperCase()}
          </Text>
        </TouchableOpacity>
      ))}
    </Animated.View>
  );

  // Render unauthenticated content
  const renderUnauthenticatedContent = () => (
    <View style={styles.unauthenticatedContainer}>
      <Animated.View
        style={[
          styles.welcomeSection,
          {
            opacity: contentOpacity,
            transform: [{ translateY: Animated.multiply(contentScale, 20) }],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.logoContainer,
            {
              transform: [
                { scale: Animated.multiply(contentScale, pulseScale) }
              ],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.logoGlow,
              { opacity: Animated.multiply(glowOpacity, 0.5) }
            ]}
          />
          <Image
            source={require('../assets/images/logo-sujhav.png')}
            style={styles.headerLogoImage}
            resizeMode="contain"
          />
        </Animated.View>

        <Text style={styles.welcomeTitle}>Welcome to {BRAND.name}</Text>
        <Text style={styles.welcomeSubtitle}>{BRAND.subtitle}</Text>
        <Text style={styles.welcomeSubtext}>
          Please sign in to view your academic reports and progress.
        </Text>
      </Animated.View>

      <Animated.View
        style={[
          styles.signInButtonContainer,
          { 
            opacity: fadeAnim,
            transform: [{ scale: buttonScale }]
          }
        ]}
      >
        <TouchableOpacity 
          style={styles.signInButton}
          onPress={handleSignInPress}
          activeOpacity={0.8}
        >
          <Animated.View
            style={[
              styles.buttonGlow,
              { opacity: Animated.multiply(glowOpacity, 0.6) }
            ]}
          />
          <Text style={styles.signInButtonText}>Sign In</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );

  // Render authenticated content (student assigned to batch)
const renderAuthenticatedContent = () => {
  if (!reportsData) return null;

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[BRAND.primaryColor]}
          progressBackgroundColor={BRAND.cardBackground}
        />
      }
    >
      {/* Quick Actions Section - NEW ADDITION */}
      <UserProfileQuickActions navigation={navigation} />

      {/* Statistics Section */}
      <StatisticsCard statistics={reportsData.statistics} />

      {/* Batches Section */}
      {reportsData.batches.length > 0 && (
        <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
          <Text style={styles.sectionTitle}>Your Batches</Text>
          {reportsData.batches.map((batch, index) => (
            <BatchCard key={batch._id} batch={batch} />
          ))}
        </Animated.View>
      )}

      {/* Tests Section */}
      {reportsData.tests.length > 0 && (
        <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
          <Text style={styles.sectionTitle}>Test Reports</Text>
          
          {/* Filter Buttons */}
          <FilterButtons />
          
          <FlatList
            data={getFilteredTests()}
            renderItem={({ item }) => <TestCard item={item} />}
            keyExtractor={(item) => item.testId}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
        </Animated.View>
      )}

      {/* No Tests Message */}
      {getFilteredTests().length === 0 && (
        <Animated.View style={[styles.noDataContainer, { opacity: fadeAnim }]}>
          <MaterialIcons name="assignment" size={48} color={BRAND.textSecondary} />
          <Text style={styles.noDataText}>No tests found</Text>
          <Text style={styles.noDataSubtext}>
            {selectedFilter === 'all' 
              ? 'No tests have been assigned yet'
              : `No ${selectedFilter} tests found`
            }
          </Text>
        </Animated.View>
      )}
    </ScrollView>
  );
};

  // Loading screen
  if (loading && isLoggedIn === null) {
  return (
    <SafeAreaView style={styles.loadingContainer}>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor={BRAND.backgroundColor} 
        translucent={false}
        hidden={false}
      />
      <View style={styles.loadingContent}>
        <ActivityIndicator size="large" color={BRAND.primaryColor} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    </SafeAreaView>
  );
}

  return (
  <SafeAreaView style={styles.mainContainer}>
    <StatusBar 
      barStyle="light-content" 
      backgroundColor={BRAND.backgroundColor} 
      translucent={false}
      hidden={false}
    />
    
    {/* Animated Background Glow */}
    <Animated.View
      style={[
        styles.backgroundGlow,
        { opacity: glowOpacity }
      ]}
    />

    {/* Header */}
    <Animated.View
      style={[
        styles.header,
        {
          opacity: headerOpacity,
          transform: [{ translateY: headerTranslateY }],
        },
      ]}
    >
      <View style={styles.headerContent}>
        <Image
          source={require('../assets/images/logo-sujhav.png')}
          style={styles.headerLogoImage}
          resizeMode="contain"
        />
        <Text style={styles.headerTitle}>Reports</Text>
      </View>
    </Animated.View>

    {/* Content based on authentication and batch assignment */}
    {isLoggedIn === false ? (
      renderUnauthenticatedContent()
    ) : !isAssignedToBatch ? (
      <EmptyState />
    ) : loading ? (
      <View style={styles.loadingContent}>
        <ActivityIndicator size="large" color={BRAND.primaryColor} />
        <Text style={styles.loadingText}>Loading Reports...</Text>
      </View>
    ) : (
      renderAuthenticatedContent()
    )}

    {/* Bottom Navigation */}
    <BottomNavigation navigation={navigation} activeTab="Reports" />
  </SafeAreaView>
);
};

// Styles
const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: BRAND.backgroundColor,
    ...(Platform.OS === 'android' && {
      paddingTop: 0,
    }),
  },
  container: {
    flex: 1,
    backgroundColor: BRAND.backgroundColor,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: BRAND.backgroundColor,
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'android' && {
      paddingTop: 0,
    }),
  },
  loadingContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  loadingText: {
    color: BRAND.textPrimary,
    fontSize: 16,
    marginTop: 12,
    fontWeight: '500',
  },
  backgroundGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: BRAND.primaryColor,
    opacity: 0.05,
    zIndex: -1,
  },
  // Header - removed border
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: BRAND.backgroundColor,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogoImage: {
    width: 30,
    height: 30,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: BRAND.primaryColor,
    letterSpacing: 0.5,
  },
  unauthenticatedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    backgroundColor: BRAND.backgroundColor,
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 40,
    maxWidth: 350,
  },
  logoContainer: {
    position: 'relative',
    marginBottom: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: BRAND.primaryColor,
    opacity: 0.3,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: BRAND.textPrimary,
    textAlign: 'center',
    marginBottom: 15,
    letterSpacing: 0.5,
  },
  welcomeSubtitle: {
    fontSize: 18,
    color: BRAND.primaryColor,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
    fontWeight: '500',
  },
  welcomeSubtext: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 22,
  },
  signInButtonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  signInButton: {
    backgroundColor: BRAND.primaryColor,
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 25,
    position: 'relative',
    overflow: 'hidden',
    elevation: 5,
    shadowColor: BRAND.primaryColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonGlow: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    backgroundColor: BRAND.primaryColor,
    borderRadius: 35,
    opacity: 0.2,
  },
  signInButtonText: {
    color: BRAND.secondaryColor,
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: 25,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: BRAND.textPrimary,
    marginBottom: 15,
    letterSpacing: 0.3,
  },
  // Statistics card - removed border, adjusted spacing for quick actions
  statisticsCard: {
    backgroundColor: '#0f1f0f',
    margin: 20,
    marginTop: 10, // Reduced top margin for better spacing with quick actions
    padding: 20,
    borderRadius: 15,
    elevation: 3,
    shadowColor: BRAND.primaryColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: BRAND.textPrimary,
    marginBottom: 15,
    textAlign: 'center',
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
    fontSize: 24,
    fontWeight: 'bold',
    color: BRAND.primaryColor,
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: BRAND.textSecondary,
    textAlign: 'center',
  },
  // Batch card - removed border
  batchCard: {
    backgroundColor: '#0f1f0f',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: BRAND.primaryColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  batchName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: BRAND.textPrimary,
    marginBottom: 4,
  },
  batchCategory: {
    fontSize: 14,
    color: BRAND.primaryColor,
    marginBottom: 12,
    fontWeight: '500',
  },
  assignmentInfo: {
    marginBottom: 8,
  },
  assignmentLabel: {
    fontSize: 12,
    color: BRAND.textSecondary,
    marginBottom: 2,
  },
  assignmentValue: {
    fontSize: 14,
    color: BRAND.textPrimary,
    fontWeight: '500',
  },
  subjectsContainer: {
    marginTop: 8,
  },
  subjectsLabel: {
    fontSize: 12,
    color: BRAND.textSecondary,
    marginBottom: 6,
  },
  subjectItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  subjectName: {
    fontSize: 13,
    color: BRAND.textPrimary,
    flex: 1,
  },
  teacherName: {
    fontSize: 11,
    color: BRAND.textSecondary,
    fontStyle: 'italic',
  },
  // Filter container - removed border
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    backgroundColor: '#1a2e1a',
    borderRadius: 10,
    padding: 4,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeFilterTab: {
    backgroundColor: BRAND.primaryColor,
  },
  filterTabText: {
    fontSize: 14,
    color: BRAND.textSecondary,
    fontWeight: '600',
  },
  activeFilterTabText: {
    color: BRAND.secondaryColor,
  },
  // Test card - removed border
  testCard: {
    backgroundColor: '#0f1f0f',
    marginBottom: 15,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: BRAND.primaryColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  testCardContent: {
    padding: 16,
  },
  testHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  testTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: BRAND.textPrimary,
    flex: 1,
    marginRight: 10,
    lineHeight: 22,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  testDetails: {
    marginBottom: 12,
  },
  testInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  testInfoText: {
    fontSize: 13,
    color: BRAND.textSecondary,
    marginLeft: 8,
    flex: 1,
  },
  // Marks container - removed border, added subtle separation
  marksContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingTop: 10,
    backgroundColor: 'rgba(26, 46, 26, 0.3)', // Subtle background instead of border
    marginHorizontal: -8,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  marksLabel: {
    fontSize: 14,
    color: BRAND.textSecondary,
    marginRight: 10,
  },
  marksInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  marksValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: BRAND.textPrimary,
    marginRight: 8,
  },
  percentage: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 6,
  },
  grade: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  // Download buttons - removed borders, improved styling
  downloadButton: {
    backgroundColor: '#1a2e1a',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    elevation: 1,
    shadowColor: BRAND.primaryColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  answerButton: {
    backgroundColor: BRAND.primaryColor + '20',
  },
  downloadButtonDisabled: {
    opacity: 0.6,
  },
  downloadButtonText: {
    color: BRAND.textPrimary,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  noDataText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: BRAND.textSecondary,
    marginTop: 12,
    textAlign: 'center',
  },
  noDataSubtext: {
    fontSize: 14,
    color: BRAND.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
});

export default UserReportsScreen;