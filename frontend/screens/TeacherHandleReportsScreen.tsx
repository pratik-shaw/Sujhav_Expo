import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
  StatusBar,
  SafeAreaView,
  Animated,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  FlatList,
  Modal,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { RootStackParamList } from '../App';
import { API_BASE } from '../config/api';

type TeacherHandleReportsNavigationProp = NativeStackNavigationProp<RootStackParamList>;
type TeacherHandleReportsRouteProp = {
  key: string;
  name: string;
  params: {
    batchId: string;
  };
};

const { width, height } = Dimensions.get('window');

// Brand configuration
const BRAND = {
  name: "SUJHAV",
  primaryColor: '#00ff88',
  secondaryColor: '#000000',
  backgroundColor: '#0a1a0a',
  accentColor: '#1a2e1a',
};

const API_BASE_URL = API_BASE;


// Interfaces
interface Student {
  _id: string;
  name: string;
  email: string;
}

interface StudentAssignment {
  _id: string;
  student: Student;
  marksScored: number | null;
  submittedAt: Date | null;
  evaluatedAt: Date | null;
}

interface Test {
  _id: string;
  testTitle: string;
  fullMarks: number;
  assignedStudents: StudentAssignment[];
  createdAt: string;
  dueDate: Date | null;
  instructions: string;
  isActive: boolean;
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
}

interface BatchTests {
  success: boolean;
  data: Test[];
  count: number;
}

interface StudentReport {
  studentId: string;
  studentName: string;
  studentEmail: string;
  tests: Array<{
    testId: string;
    testTitle: string;
    fullMarks: number;
    marksScored: number | null;
    percentage: number | null;
    submittedAt: Date | null;
    evaluatedAt: Date | null;
    createdAt: string;
  }>;
  totalTests: number;
  evaluatedTests: number;
  averagePercentage: number;
  totalMarksScored: number;
  totalFullMarks: number;
}

interface BatchAnalytics {
  totalTests: number;
  totalStudents: number;
  overallAveragePercentage: number;
  highestScore: number;
  lowestScore: number;
  totalSubmissions: number;
  pendingEvaluations: number;
}

export default function TeacherHandleReportsScreen() {
  const navigation = useNavigation<TeacherHandleReportsNavigationProp>();
  const route = useRoute<TeacherHandleReportsRouteProp>();
  const { batchId } = route.params;

  // State management
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tests, setTests] = useState<Test[]>([]);
  const [studentReports, setStudentReports] = useState<StudentReport[]>([]);
  const [batchAnalytics, setBatchAnalytics] = useState<BatchAnalytics | null>(null);
  const [activeTab, setActiveTab] = useState<'analytics' | 'students' | 'tests'>('analytics');
  const [selectedStudent, setSelectedStudent] = useState<StudentReport | null>(null);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'percentage' | 'tests'>('name');
  const [filterStatus, setFilterStatus] = useState<'all' | 'excellent' | 'good' | 'needs_improvement'>('all');

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-20)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(30)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadReportData();
    startEntranceAnimation();
  }, [batchId]);

  const loadReportData = async () => {
    setIsLoading(true);
    await Promise.all([
      fetchBatchTests(),
    ]);
    setIsLoading(false);
  };

  const fetchBatchTests = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        Alert.alert('Error', 'No authentication token found');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/tests/teacher/batch/${batchId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data: BatchTests = await response.json();
      
      if (data.success) {
        setTests(data.data);
        processStudentReports(data.data);
        calculateBatchAnalytics(data.data);
      } else {
        Alert.alert('Error', 'Failed to fetch batch tests');
      }
    } catch (error) {
      console.error('Error fetching batch tests:', error);
      Alert.alert('Error', 'Network error. Please check your connection.');
    }
  };

  const processStudentReports = (testsData: Test[]) => {
    const studentReportsMap = new Map<string, StudentReport>();

    testsData.forEach(test => {
      test.assignedStudents.forEach(assignment => {
        const studentId = assignment.student._id;
        
        if (!studentReportsMap.has(studentId)) {
          studentReportsMap.set(studentId, {
            studentId,
            studentName: assignment.student.name,
            studentEmail: assignment.student.email,
            tests: [],
            totalTests: 0,
            evaluatedTests: 0,
            averagePercentage: 0,
            totalMarksScored: 0,
            totalFullMarks: 0,
          });
        }

        const studentReport = studentReportsMap.get(studentId)!;
        
        const percentage = assignment.marksScored ? 
          (assignment.marksScored / test.fullMarks) * 100 : null;

        studentReport.tests.push({
          testId: test._id,
          testTitle: test.testTitle,
          fullMarks: test.fullMarks,
          marksScored: assignment.marksScored,
          percentage,
          submittedAt: assignment.submittedAt,
          evaluatedAt: assignment.evaluatedAt,
          createdAt: test.createdAt,
        });

        studentReport.totalTests++;
        studentReport.totalFullMarks += test.fullMarks;

        if (assignment.marksScored !== null) {
          studentReport.evaluatedTests++;
          studentReport.totalMarksScored += assignment.marksScored;
        }
      });
    });

    // Calculate averages
    const reports = Array.from(studentReportsMap.values()).map(report => ({
      ...report,
      averagePercentage: report.totalFullMarks > 0 ? 
        (report.totalMarksScored / report.totalFullMarks) * 100 : 0,
    }));

    setStudentReports(reports);
  };

  const calculateBatchAnalytics = (testsData: Test[]) => {
    let totalStudents = 0;
    let totalSubmissions = 0;
    let pendingEvaluations = 0;
    let allPercentages: number[] = [];
    const uniqueStudents = new Set<string>();

    testsData.forEach(test => {
      test.assignedStudents.forEach(assignment => {
        uniqueStudents.add(assignment.student._id);
        
        if (assignment.submittedAt) {
          totalSubmissions++;
        }
        
        if (assignment.submittedAt && !assignment.evaluatedAt) {
          pendingEvaluations++;
        }
        
        if (assignment.marksScored !== null) {
          const percentage = (assignment.marksScored / test.fullMarks) * 100;
          allPercentages.push(percentage);
        }
      });
    });

    totalStudents = uniqueStudents.size;
    const overallAveragePercentage = allPercentages.length > 0 ? 
      allPercentages.reduce((sum, p) => sum + p, 0) / allPercentages.length : 0;
    const highestScore = allPercentages.length > 0 ? Math.max(...allPercentages) : 0;
    const lowestScore = allPercentages.length > 0 ? Math.min(...allPercentages) : 0;

    setBatchAnalytics({
      totalTests: testsData.length,
      totalStudents,
      overallAveragePercentage,
      highestScore,
      lowestScore,
      totalSubmissions,
      pendingEvaluations,
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReportData();
    setRefreshing(false);
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

    // Content animation
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(contentTranslateY, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }, 400);

    // Fade in
    setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    }, 600);
  };

  const getFilteredStudents = () => {
    let filtered = studentReports;

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(student => 
        student.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.studentEmail.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(student => {
        const percentage = student.averagePercentage;
        switch (filterStatus) {
          case 'excellent':
            return percentage >= 80;
          case 'good':
            return percentage >= 60 && percentage < 80;
          case 'needs_improvement':
            return percentage < 60;
          default:
            return true;
        }
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.studentName.localeCompare(b.studentName);
        case 'percentage':
          return b.averagePercentage - a.averagePercentage;
        case 'tests':
          return b.evaluatedTests - a.evaluatedTests;
        default:
          return 0;
      }
    });

    return filtered;
  };

  const getPerformanceColor = (percentage: number) => {
    if (percentage >= 80) return BRAND.primaryColor;
    if (percentage >= 60) return '#ffa500';
    return '#ff6b6b';
  };

  const getPerformanceLabel = (percentage: number) => {
    if (percentage >= 80) return 'Excellent';
    if (percentage >= 60) return 'Good';
    return 'Needs Improvement';
  };

  const handleStudentPress = (student: StudentReport) => {
    setSelectedStudent(student);
    setShowStudentModal(true);
  };

  const renderAnalyticsTab = () => (
    <Animated.View 
      style={[
        styles.analyticsContainer,
        { opacity: contentOpacity, transform: [{ translateY: contentTranslateY }] }
      ]}
    >
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.analyticsContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[BRAND.primaryColor]}
            tintColor={BRAND.primaryColor}
          />
        }
      >
        {/* Overall Statistics */}
        <View style={styles.analyticsSection}>
          <Text style={styles.sectionTitle}>Overall Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{batchAnalytics?.totalTests || 0}</Text>
              <Text style={styles.statLabel}>Total Tests</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{batchAnalytics?.totalStudents || 0}</Text>
              <Text style={styles.statLabel}>Students</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{batchAnalytics?.totalSubmissions || 0}</Text>
              <Text style={styles.statLabel}>Submissions</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{batchAnalytics?.pendingEvaluations || 0}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
          </View>
        </View>

        {/* Performance Overview */}
        <View style={styles.analyticsSection}>
          <Text style={styles.sectionTitle}>Performance Overview</Text>
          <View style={styles.performanceGrid}>
            <View style={styles.performanceBox}>
              <Text style={styles.performanceLabel}>Average Score</Text>
              <Text style={[styles.performanceValue, { color: getPerformanceColor(batchAnalytics?.overallAveragePercentage || 0) }]}>
                {batchAnalytics?.overallAveragePercentage.toFixed(1) || 0}%
              </Text>
            </View>
            <View style={styles.performanceBox}>
              <Text style={styles.performanceLabel}>Highest Score</Text>
              <Text style={[styles.performanceValue, { color: BRAND.primaryColor }]}>
                {batchAnalytics?.highestScore.toFixed(1) || 0}%
              </Text>
            </View>
            <View style={styles.performanceBox}>
              <Text style={styles.performanceLabel}>Lowest Score</Text>
              <Text style={[styles.performanceValue, { color: '#ff6b6b' }]}>
                {batchAnalytics?.lowestScore.toFixed(1) || 0}%
              </Text>
            </View>
          </View>
        </View>

        {/* Performance Distribution */}
        <View style={styles.analyticsSection}>
          <Text style={styles.sectionTitle}>Performance Distribution</Text>
          <View style={styles.distributionContainer}>
            {(() => {
              const excellent = studentReports.filter(s => s.averagePercentage >= 80).length;
              const good = studentReports.filter(s => s.averagePercentage >= 60 && s.averagePercentage < 80).length;
              const needsImprovement = studentReports.filter(s => s.averagePercentage < 60).length;
              
              return (
                <>
                  <View style={styles.distributionItem}>
                    <View style={[styles.distributionBar, { backgroundColor: BRAND.primaryColor }]}>
                      <Text style={styles.distributionCount}>{excellent}</Text>
                    </View>
                    <Text style={styles.distributionLabel}>Excellent (80%+)</Text>
                  </View>
                  <View style={styles.distributionItem}>
                    <View style={[styles.distributionBar, { backgroundColor: '#ffa500' }]}>
                      <Text style={styles.distributionCount}>{good}</Text>
                    </View>
                    <Text style={styles.distributionLabel}>Good (60-79%)</Text>
                  </View>
                  <View style={styles.distributionItem}>
                    <View style={[styles.distributionBar, { backgroundColor: '#ff6b6b' }]}>
                      <Text style={styles.distributionCount}>{needsImprovement}</Text>
                    </View>
                    <Text style={styles.distributionLabel}>Needs Improvement (&lt;60%)</Text>
                  </View>
                </>
              );
            })()}
          </View>
        </View>

        {/* Recent Tests */}
        <View style={styles.analyticsSection}>
          <Text style={styles.sectionTitle}>Recent Tests</Text>
          {tests.slice(0, 3).map(test => (
            <View key={test._id} style={styles.recentTestCard}>
              <View style={styles.recentTestHeader}>
                <Text style={styles.recentTestTitle}>{test.testTitle}</Text>
                <Text style={styles.recentTestDate}>
                  {new Date(test.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.recentTestStats}>
                <Text style={styles.recentTestStat}>
                  {test.assignedStudents.length} students assigned
                </Text>
                <Text style={styles.recentTestStat}>
                  {test.assignedStudents.filter(s => s.submittedAt).length} submissions
                </Text>
                <Text style={styles.recentTestStat}>
                  {test.assignedStudents.filter(s => s.evaluatedAt).length} evaluated
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </Animated.View>
  );

  const renderStudentCard = ({ item }: { item: StudentReport }) => (
    <TouchableOpacity 
      style={styles.studentCard}
      onPress={() => handleStudentPress(item)}
    >
      <View style={styles.studentCardHeader}>
        <View style={styles.studentInfo}>
          <Text style={styles.studentName}>{item.studentName}</Text>
          <Text style={styles.studentEmail}>{item.studentEmail}</Text>
        </View>
        <View style={styles.studentPerformance}>
          <Text style={[styles.performancePercentage, { color: getPerformanceColor(item.averagePercentage) }]}>
            {item.averagePercentage.toFixed(1)}%
          </Text>
          <Text style={[styles.performanceLabel, { color: getPerformanceColor(item.averagePercentage) }]}>
            {getPerformanceLabel(item.averagePercentage)}
          </Text>
        </View>
      </View>
      <View style={styles.studentStats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{item.totalTests}</Text>
          <Text style={styles.statLabel}>Tests</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{item.evaluatedTests}</Text>
          <Text style={styles.statLabel}>Evaluated</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{item.totalMarksScored}</Text>
          <Text style={styles.statLabel}>Total Score</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderStudentsTab = () => (
    <Animated.View 
      style={[
        styles.studentsContainer,
        { opacity: contentOpacity, transform: [{ translateY: contentTranslateY }] }
      ]}
    >
      {/* Search and Filter Controls */}
      <View style={styles.controlsContainer}>
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search students..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <View style={styles.filtersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[styles.filterButton, sortBy === 'name' && styles.activeFilterButton]}
              onPress={() => setSortBy('name')}
            >
              <Text style={[styles.filterButtonText, sortBy === 'name' && styles.activeFilterButtonText]}>
                Name
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, sortBy === 'percentage' && styles.activeFilterButton]}
              onPress={() => setSortBy('percentage')}
            >
              <Text style={[styles.filterButtonText, sortBy === 'percentage' && styles.activeFilterButtonText]}>
                Score
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, sortBy === 'tests' && styles.activeFilterButton]}
              onPress={() => setSortBy('tests')}
            >
              <Text style={[styles.filterButtonText, sortBy === 'tests' && styles.activeFilterButtonText]}>
                Tests
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>

      {/* Students List */}
      <FlatList
        data={getFilteredStudents()}
        renderItem={renderStudentCard}
        keyExtractor={(item) => item.studentId}
        contentContainerStyle={styles.studentsList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[BRAND.primaryColor]}
            tintColor={BRAND.primaryColor}
          />
        }
      />
    </Animated.View>
  );

  const renderTestCard = ({ item }: { item: Test }) => (
    <TouchableOpacity 
      style={styles.testCard}
      onPress={() => navigation.navigate('TeacherHandleScoresScreen', {
        testId: item._id,
        testTitle: item.testTitle,
        fullMarks: item.fullMarks
      })}
    >
      <View style={styles.testCardHeader}>
        <Text style={styles.testTitle}>{item.testTitle}</Text>
        <Text style={styles.testDate}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
      <View style={styles.testStats}>
        <View style={styles.testStatItem}>
          <Text style={styles.testStatValue}>{item.fullMarks}</Text>
          <Text style={styles.testStatLabel}>Full Marks</Text>
        </View>
        <View style={styles.testStatItem}>
          <Text style={styles.testStatValue}>{item.assignedStudents.length}</Text>
          <Text style={styles.testStatLabel}>Assigned</Text>
        </View>
        <View style={styles.testStatItem}>
          <Text style={styles.testStatValue}>{item.assignedStudents.filter(s => s.submittedAt).length}</Text>
          <Text style={styles.testStatLabel}>Submitted</Text>
        </View>
        <View style={styles.testStatItem}>
          <Text style={styles.testStatValue}>{item.assignedStudents.filter(s => s.evaluatedAt).length}</Text>
          <Text style={styles.testStatLabel}>Evaluated</Text>
        </View>
      </View>
      <View style={styles.testActions}>
        <MaterialIcons name="edit" size={20} color={BRAND.primaryColor} />
        <Text style={styles.testActionText}>Manage Scores</Text>
      </View>
    </TouchableOpacity>
  );

  const renderTestsTab = () => (
    <Animated.View 
      style={[
        styles.testsContainer,
        { opacity: contentOpacity, transform: [{ translateY: contentTranslateY }] }
      ]}
    >
      <FlatList
        data={tests}
        renderItem={renderTestCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.testsList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[BRAND.primaryColor]}
            tintColor={BRAND.primaryColor}
          />
        }
      />
    </Animated.View>
  );

  const renderStudentModal = () => (
    <Modal
      visible={showStudentModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowStudentModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{selectedStudent?.studentName}</Text>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setShowStudentModal(false)}
            >
              <MaterialIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody}>
            <View style={styles.studentDetailStats}>
              <View style={styles.detailStatBox}>
                <Text style={styles.detailStatNumber}>{selectedStudent?.totalTests}</Text>
                <Text style={styles.detailStatLabel}>Total Tests</Text>
              </View>
              <View style={styles.detailStatBox}>
                <Text style={styles.detailStatNumber}>{selectedStudent?.evaluatedTests}</Text>
                <Text style={styles.detailStatLabel}>Evaluated</Text>
              </View>
              <View style={styles.detailStatBox}>
                <Text style={[styles.detailStatNumber, { color: getPerformanceColor(selectedStudent?.averagePercentage || 0) }]}>
                  {selectedStudent?.averagePercentage.toFixed(1)}%
                </Text>
                <Text style={styles.detailStatLabel}>Average</Text>
              </View>
            </View>

            <Text style={styles.modalSectionTitle}>Test History</Text>
            {selectedStudent?.tests.map(test => (
              <View key={test.testId} style={styles.testHistoryItem}>
                <View style={styles.testHistoryHeader}>
                  <Text style={styles.testHistoryTitle}>{test.testTitle}</Text>
                  <Text style={styles.testHistoryDate}>
                    {new Date(test.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.testHistoryStats}>
                  <Text style={styles.testHistoryScore}>
                    {test.marksScored !== null ? `${test.marksScored}/${test.fullMarks}` : 'Not Evaluated'}
                  </Text>
                  {test.percentage !== null && (
                    <Text style={[styles.testHistoryPercentage, { color: getPerformanceColor(test.percentage) }]}>
                      {test.percentage.toFixed(1)}%
                    </Text>
                  )}
                </View>
                <View style={styles.testHistoryStatus}>
                  <Text style={styles.testHistoryStatusText}>
                    {test.evaluatedAt ? 'Evaluated' : test.submittedAt ? 'Submitted' : 'Not Submitted'}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={BRAND.backgroundColor} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BRAND.primaryColor} />
          <Text style={styles.loadingText}>Loading reports...</Text>
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
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Batch Reports</Text>
            <Text style={styles.headerSubtitle}>Performance Analytics</Text>
          </View>
        </View>
      </Animated.View>

      {/* Tab Navigation */}
      <Animated.View 
        style={[
          styles.tabContainer,
          { opacity: contentOpacity, transform: [{ translateY: contentTranslateY }] }
        ]}
      >
        <TouchableOpacity
          style={[styles.tab, activeTab === 'analytics' && styles.activeTab]}
          onPress={() => setActiveTab('analytics')}
        >
          <MaterialIcons 
            name="analytics" 
            size={20} 
            color={activeTab === 'analytics' ? BRAND.backgroundColor : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'analytics' && styles.activeTabText]}>
            Analytics
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'students' && styles.activeTab]}
          onPress={() => setActiveTab('students')}
        >
          <MaterialIcons 
            name="people" 
            size={20} 
            color={activeTab === 'students' ? BRAND.backgroundColor : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'students' && styles.activeTabText]}>
            Students
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'tests' && styles.activeTab]}
          onPress={() => setActiveTab('tests')}
        >
          <MaterialIcons 
            name="assignment" 
            size={20} 
            color={activeTab === 'tests' ? BRAND.backgroundColor : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'tests' && styles.activeTabText]}>
            Tests
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Content */}
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {activeTab === 'analytics' && renderAnalyticsTab()}
        {activeTab === 'students' && renderStudentsTab()}
        {activeTab === 'tests' && renderTestsTab()}
      </Animated.View>

      {/* Student Detail Modal */}
      {renderStudentModal()}
    </SafeAreaView>
  );
}

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
  },
  glowCircle: {
    position: 'absolute',
    borderRadius: 200,
    backgroundColor: BRAND.primaryColor,
  },
  glowCircle1: {
    width: 400,
    height: 400,
    top: -200,
    left: -100,
  },
  glowCircle2: {
    width: 300,
    height: 300,
    top: height * 0.3,
    right: -150,
  },
  glowCircle3: {
    width: 200,
    height: 200,
    bottom: -100,
    left: width * 0.2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 20,
  },
  headerSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
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
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: BRAND.primaryColor,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginLeft: 8,
  },
  activeTabText: {
    color: BRAND.backgroundColor,
  },
  content: {
    flex: 1,
  },
  analyticsContainer: {
    flex: 1,
  },
  analyticsContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  analyticsSection: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  statBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    width: (width - 60) / 4,
    alignItems: 'center',
    marginBottom: 10,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: BRAND.primaryColor,
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
  performanceGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  performanceBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    width: (width - 60) / 3,
    alignItems: 'center',
  },
  performanceLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  performanceValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  distributionContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
  },
  distributionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  distributionBar: {
    width: 60,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  distributionCount: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  distributionLabel: {
    color: '#fff',
    fontSize: 14,
  },
  recentTestCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  recentTestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  recentTestTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  recentTestDate: {
    fontSize: 12,
    color: '#999',
  },
  recentTestStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  recentTestStat: {
    fontSize: 12,
    color: '#999',
  },
  studentsContainer: {
    flex: 1,
  },
  controlsContainer: {
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 15,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    marginLeft: 10,
  },
  filtersContainer: {
    flexDirection: 'row',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    marginRight: 10,
  },
  activeFilterButton: {
    backgroundColor: BRAND.primaryColor,
  },
  filterButtonText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '500',
  },
  activeFilterButtonText: {
    color: BRAND.backgroundColor,
  },
  studentsList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  studentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  studentCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  studentEmail: {
    fontSize: 14,
    color: '#999',
    marginTop: 2,
  },
  studentPerformance: {
    alignItems: 'flex-end',
  },
  performancePercentage: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  studentStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: BRAND.primaryColor,
  },
  testsContainer: {
    flex: 1,
  },
  testsList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  testCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  testCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  testTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  testDate: {
    fontSize: 12,
    color: '#999',
  },
  testStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  testStatItem: {
    alignItems: 'center',
  },
  testStatValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: BRAND.primaryColor,
  },
  testStatLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  testActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  testActionText: {
    color: BRAND.primaryColor,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: BRAND.backgroundColor,
    borderRadius: 20,
    width: width * 0.9,
    maxHeight: height * 0.8,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    padding: 20,
  },
  studentDetailStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  detailStatBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    width: (width * 0.9 - 80) / 3,
    alignItems: 'center',
  },
  detailStatNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: BRAND.primaryColor,
  },
  detailStatLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  modalSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 15,
  },
  testHistoryItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  testHistoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  testHistoryTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
    flex: 1,
  },
  testHistoryDate: {
    fontSize: 12,
    color: '#999',
  },
  testHistoryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  testHistoryScore: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  testHistoryPercentage: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  testHistoryStatus: {
    alignItems: 'flex-start',
  },
  testHistoryStatusText: {
    fontSize: 12,
    color: '#999',
  },
});