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
  // Reset all animations to initial state
  glowOpacity.setValue(0);
  headerOpacity.setValue(0);
  headerTranslateY.setValue(-20);
  contentOpacity.setValue(0);
  contentScale.setValue(0.8);
  fadeAnim.setValue(0);
  buttonScale.setValue(0.8);

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

  // Fade in and button scale animation
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

  // Render content for unauthenticated users
const renderUnauthenticatedContent = () => (
  <Animated.View 
    style={[
      styles.unauthenticatedContainer,
      {
        opacity: contentOpacity,
        transform: [{ scale: contentScale }],
      }
    ]}
  >
    <Animated.View 
      style={[
        styles.welcomeSection,
        {
          opacity: fadeAnim,
          transform: [{ translateY: headerTranslateY }],
        }
      ]}
    >
      {/* Logo */}
      <Animated.View 
        style={[
          styles.logoContainer,
          {
            transform: [{ scale: pulseScale }],
          }
        ]}
      >
        <Image
          source={require('../assets/images/logo-sujhav.png')}
          style={styles.headerLogoImage}
          resizeMode="contain"
        />
      </Animated.View>

      <Animated.Text 
        style={[
          styles.welcomeTitle,
          {
            opacity: fadeAnim,
          }
        ]}
      >
        Sign In Required
      </Animated.Text>
      
      <Animated.Text 
        style={[
          styles.welcomeSubtitle,
          {
            opacity: fadeAnim,
          }
        ]}
      >
        Please sign in to view your test reports and performance analytics.
      </Animated.Text>
      
      <Animated.Text 
        style={[
          styles.welcomeSubtext,
          {
            opacity: fadeAnim,
          }
        ]}
      >
        Join SUJHAV to track your academic progress!
      </Animated.Text>
    </Animated.View>

    {/* Sign In Button */}
    <Animated.View 
      style={[
        styles.signInButtonContainer,
        {
          opacity: fadeAnim,
          transform: [{ scale: buttonScale }],
        }
      ]}
    >
      <TouchableOpacity 
        style={styles.signInButton}
        onPress={handleSignInPress}
        activeOpacity={0.7}
      >
        <Text style={styles.signInButtonText}>Sign In</Text>
      </TouchableOpacity>
    </Animated.View>

    {/* Secondary Button */}
    <Animated.View 
      style={[
        styles.secondaryButtonContainer,
        {
          opacity: fadeAnim,
          transform: [{ scale: buttonScale }],
        }
      ]}
    >
      <TouchableOpacity 
        style={styles.secondaryButton}
        onPress={() => navigation.navigate('SignUp')}
        activeOpacity={0.7}
      >
        <Text style={styles.secondaryButtonText}>Create Account</Text>
      </TouchableOpacity>
    </Animated.View>
  </Animated.View>
);


// Render content for authenticated users with batch assignment
// Render content for authenticated users with batch assignment
const renderAuthenticatedContent = () => {
  const filteredTests = getFilteredTests();
  
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[BRAND.primaryColor]}
          tintColor={BRAND.primaryColor}
          progressBackgroundColor={BRAND.cardBackground}
        />
      }
    >
      {/* Statistics Card */}
      {reportsData?.statistics && (
        <StatisticsCard statistics={reportsData.statistics} />
      )}

      {/* Add Quick Actions here */}
      <UserProfileQuickActions navigation={navigation} />

      {/* Batch Information */}
      {reportsData?.batches && reportsData.batches.length > 0 && (
        <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
          <Text style={styles.sectionTitle}>Your Batches</Text>
          {reportsData.batches.map((batch) => (
            <View key={batch._id} style={styles.batchCard}>
              <Text style={styles.batchName}>{batch.batchName}</Text>
              <Text style={styles.batchCategory}>{batch.category}</Text>
              
              {batch.userAssignment && (
                <View style={styles.assignmentInfo}>
                  <Text style={styles.assignmentLabel}>Assigned Classes:</Text>
                  <Text style={styles.assignmentValue}>
                    {batch.userAssignment.assignedClasses.join(', ') || 'None'}
                  </Text>
                </View>
              )}

              {batch.subjects && batch.subjects.length > 0 && (
                <View style={styles.subjectsContainer}>
                  <Text style={styles.subjectsLabel}>Subjects:</Text>
                  {batch.subjects.map((subject, index) => (
                    <View key={index} style={styles.subjectItem}>
                      <Text style={styles.subjectName}>
                        {subject.name || 'Unknown Subject'}
                      </Text>
                      <Text style={styles.teacherName}>
                        {safeGetTeacherName(subject.teacher)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </Animated.View>
      )}

      {/* Rest of the content remains the same... */}
      {/* Filter Tabs */}
      <Animated.View style={[styles.filterContainer, { opacity: fadeAnim }]}>
        <View style={{ flexDirection: 'row' }}>
          {(['all', 'pending', 'evaluated'] as const).map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterTab,
                selectedFilter === filter && styles.activeFilterTab
              ]}
              onPress={() => setSelectedFilter(filter)}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.filterTabText,
                selectedFilter === filter && styles.activeFilterTabText
              ]}>
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
                {filter === 'all' && reportsData?.statistics && 
                  ` (${reportsData.statistics.totalTests})`}
                {filter === 'pending' && reportsData?.statistics && 
                  ` (${reportsData.statistics.pendingTests})`}
                {filter === 'evaluated' && reportsData?.statistics && 
                  ` (${reportsData.statistics.evaluatedTests})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      {/* Tests List */}
      <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
        <Text style={styles.sectionTitle}>
          {selectedFilter === 'all' ? 'All Tests' : 
           selectedFilter === 'pending' ? 'Pending Tests' : 'Evaluated Tests'}
        </Text>
        
        {filteredTests.length > 0 ? (
          <FlatList
            data={filteredTests}
            renderItem={({ item }) => <TestCard item={item} />}
            keyExtractor={(item) => item.testId}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.noDataContainer}>
            <MaterialIcons 
              name={selectedFilter === 'pending' ? 'pending' : 
                    selectedFilter === 'evaluated' ? 'check-circle' : 'assignment'} 
              size={60} 
              color={BRAND.textSecondary} 
            />
            <Text style={styles.noDataText}>
              {selectedFilter === 'pending' ? 'No Pending Tests' :
               selectedFilter === 'evaluated' ? 'No Evaluated Tests' : 'No Tests Available'}
            </Text>
            <Text style={styles.noDataSubtext}>
              {selectedFilter === 'pending' 
                ? 'All your tests have been completed or evaluated.'
                : selectedFilter === 'evaluated'
                ? 'No tests have been evaluated yet.'
                : 'Your teacher will assign tests soon.'}
            </Text>
          </View>
        )}
      </Animated.View>
    </ScrollView>
  );
};

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

const EmptyState = () => (
  <Animated.View 
    style={[
      styles.unauthenticatedContainer,
      {
        opacity: contentOpacity,
        transform: [{ scale: contentScale }],
      }
    ]}
  >
    <Animated.View 
      style={[
        styles.welcomeSection,
        {
          opacity: fadeAnim,
          transform: [{ translateY: headerTranslateY }],
        }
      ]}
    >
      {/* Logo */}
      <Animated.View 
        style={[
          styles.logoContainer,
          {
            transform: [{ scale: pulseScale }],
          }
        ]}
      >
        <Image
          source={require('../assets/images/logo-sujhav.png')}
          style={styles.headerLogoImage}
          resizeMode="contain"
        />
      </Animated.View>

      <Animated.Text 
        style={[
          styles.welcomeTitle,
          {
            opacity: fadeAnim,
            transform: [{ translateY: headerTranslateY }],
          }
        ]}
      >
        Not a Registered Student
      </Animated.Text>
      
      <Animated.Text 
        style={[
          styles.welcomeSubtitle,
          {
            opacity: fadeAnim,
            transform: [{ translateY: headerTranslateY }],
          }
        ]}
      >
        You are not registered as a student in any offline center batch.
      </Animated.Text>
      
      <Animated.Text 
        style={[
          styles.welcomeSubtext,
          {
            opacity: fadeAnim,
            transform: [{ translateY: headerTranslateY }],
          }
        ]}
      >
        Join SUJHAV Online Center to continue your learning journey!
      </Animated.Text>
    </Animated.View>

    {/* Join Online Button */}
    <Animated.View 
      style={[
        styles.signInButtonContainer,
        {
          opacity: fadeAnim,
          transform: [{ scale: buttonScale }],
        }
      ]}
    >
      <TouchableOpacity 
        style={styles.signInButton}
        onPress={handleJoinOnline}
        activeOpacity={0.7}
      >
        <Text style={styles.signInButtonText}>Join Offline Center</Text>
      </TouchableOpacity>
    </Animated.View>
  </Animated.View>
);

  // Statistics Card Component - Updated to match MyContent style
  const StatisticsCard = ({ statistics }: { statistics: any }) => (
    <Animated.View style={[styles.statisticsCard, { 
      opacity: fadeAnim,
      transform: [{ scale: Animated.multiply(contentScale, pulseScale) }],
    }]}>
      <Text style={styles.cardTitle}>Performance Overview</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <MaterialIcons name="assignment" size={24} color={BRAND.primaryColor} />
          <Text style={styles.statValue}>{statistics.totalTests}</Text>
          <Text style={styles.statLabel}>Total Tests</Text>
        </View>
        <View style={styles.statItem}>
          <MaterialIcons name="check-circle" size={24} color={BRAND.successColor} />
          <Text style={styles.statValue}>{statistics.evaluatedTests}</Text>
          <Text style={styles.statLabel}>Evaluated</Text>
        </View>
        <View style={styles.statItem}>
          <MaterialIcons name="pending" size={24} color={BRAND.warningColor} />
          <Text style={styles.statValue}>{statistics.pendingTests}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statItem}>
          <MaterialIcons name="trending-up" size={24} color={BRAND.primaryColor} />
          <Text style={[styles.statValue, { color: BRAND.primaryColor }]}>
            {statistics.averagePercentage.toFixed(1)}%
          </Text>
          <Text style={styles.statLabel}>Average</Text>
        </View>
      </View>
    </Animated.View>
  );

  // Test Card Component - Updated to match MyContent style
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
        {/* Test Header */}
        <View style={styles.testHeader}>
          <View style={styles.testImageContainer}>
            <Image
              source={require('../assets/images/logo-sujhav.png')}
              style={styles.testImage}
              resizeMode="contain"
            />
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusBadgeText}>
                {item.status?.toUpperCase() || 'UNKNOWN'}
              </Text>
            </View>
          </View>
          
          <View style={styles.testContent}>
            <Text style={styles.testTitle} numberOfLines={2}>
              {item.testTitle || 'Untitled Test'}
            </Text>
            
            <Text style={styles.testSubtitle}>
              {safeGetBatchName(item.batch)}
            </Text>
            
            <View style={styles.testInfoRow}>
              <MaterialIcons name="class" size={14} color={BRAND.textSecondary} />
              <Text style={styles.testInfoText}>
                {item.className || 'Unknown Class'} • {item.subjectName || 'Unknown Subject'}
              </Text>
            </View>
            
            <View style={styles.testInfoRow}>
              <MaterialIcons name="person" size={14} color={BRAND.textSecondary} />
              <Text style={styles.testInfoText}>
                {safeGetCreatorName(item.createdBy)}
              </Text>
            </View>
          </View>
        </View>

        {/* Test Details */}
        <View style={styles.testDetails}>
          <View style={styles.testInfoGrid}>
            <View style={styles.testInfoItem}>
              <MaterialIcons name="calendar-today" size={16} color={BRAND.textSecondary} />
              <Text style={styles.testInfoLabel}>Created</Text>
              <Text style={styles.testInfoValue}>
                {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}
              </Text>
            </View>
            
            {item.dueDate && (
              <View style={styles.testInfoItem}>
                <MaterialIcons name="schedule" size={16} color={BRAND.warningColor} />
                <Text style={[styles.testInfoLabel, { color: BRAND.warningColor }]}>Due Date</Text>
                <Text style={[styles.testInfoValue, { color: BRAND.warningColor }]}>
                  {new Date(item.dueDate).toLocaleDateString()}
                </Text>
              </View>
            )}
            
            {item.evaluatedAt && (
              <View style={styles.testInfoItem}>
                <MaterialIcons name="check-circle" size={16} color={BRAND.successColor} />
                <Text style={[styles.testInfoLabel, { color: BRAND.successColor }]}>Evaluated</Text>
                <Text style={[styles.testInfoValue, { color: BRAND.successColor }]}>
                  {new Date(item.evaluatedAt).toLocaleDateString()}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Marks Section */}
        <View style={styles.marksSection}>
          {item.marksScored !== null && item.marksScored !== undefined ? (
            <View style={styles.marksContainer}>
              <View style={styles.marksDisplay}>
                <Text style={styles.marksValue}>
                  {item.marksScored}/{item.fullMarks || 0}
                </Text>
                <Text style={styles.marksLabel}>Marks</Text>
              </View>
              <View style={styles.percentageDisplay}>
                <Text style={[styles.percentageValue, { color: BRAND.primaryColor }]}>
                  {item.percentage || '0'}%
                </Text>
                <Text style={[styles.gradeValue, { color: BRAND.primaryColor }]}>
                  Grade {getGrade(parseFloat(item.percentage || '0'))}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.notEvaluatedContainer}>
              <MaterialIcons name="pending" size={20} color={BRAND.textSecondary} />
              <Text style={styles.notEvaluatedText}>Not Evaluated Yet</Text>
            </View>
          )}
        </View>

        {/* Download Buttons */}
        <View style={styles.actionButtons}>
          {item.hasQuestionPdf && (
            <TouchableOpacity
              style={[
                styles.downloadButton,
                downloadingPdf === item.testId && styles.downloadButtonDisabled
              ]}
              onPress={() => downloadQuestionPdf(item.testId, item.testTitle || 'test')}
              disabled={downloadingPdf === item.testId}
              activeOpacity={0.8}
            >
              {downloadingPdf === item.testId ? (
                <ActivityIndicator size="small" color={BRAND.backgroundColor} />
              ) : (
                <>
                  <MaterialIcons name="description" size={18} color={BRAND.backgroundColor} />
                  <Text style={styles.downloadButtonText}>Question Paper</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {item.status === 'evaluated' && item.hasAnswerPdf && (
            <TouchableOpacity
              style={[
                styles.downloadButton,
                styles.answerButton,
                downloadingPdf === item.testId + '_answer' && styles.downloadButtonDisabled
              ]}
              onPress={() => downloadAnswerPdf(item.testId, item.testTitle || 'test')}
              disabled={downloadingPdf === item.testId + '_answer'}
              activeOpacity={0.8}
            >
              {downloadingPdf === item.testId + '_answer' ? (
                <ActivityIndicator size="small" color={BRAND.backgroundColor} />
              ) : (
                <>
                  <MaterialIcons name="assignment" size={18} color={BRAND.backgroundColor} />
                  <Text style={styles.downloadButtonText}>Answer Sheet</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Animated.View>
  );

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
        <Animated.View 
          style={[
            styles.glowCircle,
            styles.glowCircle3,
            { opacity: Animated.multiply(glowOpacity, 0.04) }
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
          <Image
            source={require('../assets/images/logo-sujhav.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <Text style={styles.brandTitle}>Reports</Text>
        </View>
      </Animated.View>

      {/* Content based on authentication and batch assignment */}
      <View style={styles.contentContainer}>
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
      </View>

      {/* Bottom Navigation */}
      <BottomNavigation navigation={navigation} activeTab="Reports" />
    </SafeAreaView>
  );
};

// Updated Styles to match MyContent design consistency
const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: BRAND.backgroundColor,
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
  },
  loadingContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  loadingText: {
    color: BRAND.primaryColor,
    fontSize: 16,
    marginTop: 12,
    fontWeight: '500',
  },
  // Background Elements - matching MyContent
  backgroundElements: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  glowCircle: {
    position: 'absolute',
    borderRadius: 1000,
    backgroundColor: BRAND.primaryColor,
  },
  glowCircle1: {
    width: 200,
    height: 200,
    top: -100,
    right: -100,
  },
  glowCircle2: {
    width: 150,
    height: 150,
    bottom: 100,
    left: -75,
  },
  glowCircle3: {
    width: 100,
    height: 100,
    top: height * 0.3,
    right: -50,
  },
  // Header - matching MyContent design
  headerSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1a2e1a',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogo: {
    width: 30,
    height: 30,
    marginRight: 10,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: BRAND.primaryColor,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  // Unauthenticated content - simplified
  unauthenticatedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logoContainer: {
    marginBottom: 30,
    alignItems: 'center',
  },
  headerLogoImage: {
    width: 100,
    height: 100,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 15,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
    marginBottom: 10,
  },
  welcomeSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  signInButtonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  signInButton: {
    backgroundColor: BRAND.primaryColor,
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 25,
    minWidth: 200,
    alignItems: 'center',
  },
  signInButtonText: {
    color: BRAND.backgroundColor,
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButtonContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 15,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: BRAND.primaryColor,
    minWidth: 200,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: BRAND.primaryColor,
    fontSize: 16,
    fontWeight: '500',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
    letterSpacing: 0.3,
  },
  // Statistics card - matching MyContent style
  statisticsCard: {
    backgroundColor: '#0f1f0f',
    marginVertical: 20,
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#1a2e1a',
    elevation: 3,
    shadowColor: BRAND.primaryColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
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
    color: '#888',
    textAlign: 'center',
  },
  // Batch card - matching MyContent style
  batchCard: {
    backgroundColor: '#0f1f0f',
    padding: 16,
    borderRadius: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#1a2e1a',
    elevation: 2,
    shadowColor: BRAND.primaryColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  batchName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
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
    color: '#888',
    marginBottom: 2,
  },
  assignmentValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  subjectsContainer: {
    marginTop: 8,
  },
  subjectsLabel: {
    fontSize: 12,
    color: '#888',
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
    color: '#fff',
    flex: 1,
  },
  teacherName: {
    fontSize: 11,
    color: '#888',
    fontStyle: 'italic',
  },
  // Filter container - matching MyContent design
  filterContainer: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1a2e1a',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  activeFilterTab: {
    backgroundColor: BRAND.primaryColor,
    borderColor: BRAND.primaryColor,
  },
  filterTabText: {
    fontSize: 14,
    color: '#888',
    fontWeight: '600',
  },
  activeFilterTabText: {
    color: BRAND.backgroundColor,
    fontWeight: '700',
  },
  // Test card - completely redesigned to match MyContent
  testCard: {
    backgroundColor: '#0f1f0f',
    borderRadius: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1a2e1a',
    overflow: 'hidden',
    elevation: 3,
    shadowColor: BRAND.primaryColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  testCardContent: {
    padding: 15,
  },
  testHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  testImageContainer: {
    position: 'relative',
    width: 100,
    height: 100,
    backgroundColor: '#1a2e1a',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  testImage: {
    width: 60,
    height: 60,
  },
  statusBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  testContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  testTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
    lineHeight: 22,
  },
  testSubtitle: {
    fontSize: 12,
    color: BRAND.primaryColor,
    marginBottom: 8,
    fontWeight: '500',
  },
  testDetails: {
    marginBottom: 12,
  },
  testInfoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  testInfoItem: {
    alignItems: 'center',
    minWidth: '30%',
    marginBottom: 8,
  },
  testInfoLabel: {
    fontSize: 10,
    color: '#888',
    marginTop: 2,
    textAlign: 'center',
  },
  testInfoValue: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '500',
    marginTop: 1,
    textAlign: 'center',
  },
  testInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  testInfoText: {
    fontSize: 13,
    color: '#888',
    marginLeft: 8,
    flex: 1,
  },
  marksSection: {
    marginBottom: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1a2e1a',
  },
  marksContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  marksDisplay: {
    alignItems: 'center',
  },
  marksValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  marksLabel: {
    fontSize: 10,
    color: '#888',
    marginTop: 2,
  },
  percentageDisplay: {
    alignItems: 'center',
  },
  percentageValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  gradeValue: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  notEvaluatedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  notEvaluatedText: {
    fontSize: 14,
    color: '#888',
    marginLeft: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  downloadButton: {
    backgroundColor: '#1a2e1a',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2a3e2a',
    elevation: 1,
    shadowColor: BRAND.primaryColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  answerButton: {
    backgroundColor: 'rgba(0, 255, 136, 0.15)',
    borderColor: BRAND.primaryColor,
  },
  downloadButtonDisabled: {
    opacity: 0.6,
  },
  downloadButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  noDataText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 12,
    textAlign: 'center',
  },
  noDataSubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
});

export default UserReportsScreen;