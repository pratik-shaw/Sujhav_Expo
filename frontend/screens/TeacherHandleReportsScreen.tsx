import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, Dimensions, StatusBar,
  SafeAreaView, Animated, ActivityIndicator, ScrollView, RefreshControl,
  FlatList, Modal, TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { RootStackParamList } from '../App';
import { API_BASE } from '../config/api';

type TeacherHandleReportsNavigationProp = NativeStackNavigationProp<RootStackParamList>;
type TeacherHandleReportsRouteProp = {
  key: string; name: string;
  params: { batchId: string; subjectName: string; };
};

const { width, height } = Dimensions.get('window');

const BRAND = {
  name: "SUJHAV", primaryColor: '#00ff88', secondaryColor: '#000000',
  backgroundColor: '#0a1a0a', accentColor: '#1a2e1a',
};

const API_BASE_URL = API_BASE;

interface Student {
  _id: string; name: string; email: string;
}

interface StudentAssignment {
  _id?: string; 
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
  className: string; 
  subjectName: string;
  batch: { _id: string; batchName: string; category: string; };
  createdBy: { _id: string; name: string; email: string; };
  hasQuestionPdf?: boolean; 
  hasAnswerPdf?: boolean;
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
  const { batchId, subjectName } = route.params;

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
  const [error, setError] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-20)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(30)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadReportData();
    startEntranceAnimation();
  }, [batchId, subjectName]);

  const loadReportData = async () => {
    setIsLoading(true);
    setError(null);
    await fetchBatchTests();
    setIsLoading(false);
  };

  const fetchBatchTests = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        setError('No authentication token found');
        Alert.alert('Error', 'Please log in again');
        return;
      }

      console.log('Fetching tests for:', { batchId, subjectName });

      // Updated API endpoint to match backend routes
      const endpoint = `${API_BASE_URL}/tests/teacher/batch/${batchId}/subject/${encodeURIComponent(subjectName)}`;
      console.log('API Endpoint:', endpoint);

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      console.log('API Response:', data);
      
      if (response.ok && data.success) {
        setTests(data.data || []);
        processStudentReports(data.data || []);
        calculateBatchAnalytics(data.data || []);
      } else {
        const errorMessage = data.message || `HTTP ${response.status}: Failed to fetch batch tests`;
        console.error('API Error:', errorMessage);
        setError(errorMessage);
        Alert.alert('Error', errorMessage);
      }
    } catch (error) {
      console.error('Network error fetching batch tests:', error);
      const errorMessage = 'Network error. Please check your connection.';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
    }
  };

  const processStudentReports = (testsData: Test[]) => {
    if (!testsData || testsData.length === 0) {
      setStudentReports([]);
      return;
    }

    const studentReportsMap = new Map<string, StudentReport>();

    testsData.forEach(test => {
      if (!test.assignedStudents || !Array.isArray(test.assignedStudents)) return;

      test.assignedStudents.forEach(assignment => {
        if (!assignment.student || !assignment.student._id) return;

        const studentId = assignment.student._id;
        
        if (!studentReportsMap.has(studentId)) {
          studentReportsMap.set(studentId, {
            studentId,
            studentName: assignment.student.name || 'Unknown Student',
            studentEmail: assignment.student.email || '',
            tests: [],
            totalTests: 0,
            evaluatedTests: 0,
            averagePercentage: 0,
            totalMarksScored: 0,
            totalFullMarks: 0,
          });
        }

        const studentReport = studentReportsMap.get(studentId)!;
        const percentage = assignment.marksScored !== null && assignment.marksScored !== undefined ? 
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

        if (assignment.marksScored !== null && assignment.marksScored !== undefined) {
          studentReport.evaluatedTests++;
          studentReport.totalMarksScored += assignment.marksScored;
        }
      });
    });

    const reports = Array.from(studentReportsMap.values()).map(report => ({
      ...report,
      averagePercentage: report.totalFullMarks > 0 ? 
        (report.totalMarksScored / report.totalFullMarks) * 100 : 0,
    }));

    console.log('Processed student reports:', reports.length);
    setStudentReports(reports);
  };

  const calculateBatchAnalytics = (testsData: Test[]) => {
    if (!testsData || testsData.length === 0) {
      setBatchAnalytics({
        totalTests: 0,
        totalStudents: 0,
        overallAveragePercentage: 0,
        highestScore: 0,
        lowestScore: 0,
        totalSubmissions: 0,
        pendingEvaluations: 0,
      });
      return;
    }

    let totalSubmissions = 0;
    let pendingEvaluations = 0;
    let allPercentages: number[] = [];
    const uniqueStudents = new Set<string>();

    testsData.forEach(test => {
      if (!test.assignedStudents || !Array.isArray(test.assignedStudents)) return;

      test.assignedStudents.forEach(assignment => {
        if (!assignment.student || !assignment.student._id) return;

        uniqueStudents.add(assignment.student._id);
        
        if (assignment.submittedAt) totalSubmissions++;
        if (assignment.submittedAt && !assignment.evaluatedAt) pendingEvaluations++;
        
        if (assignment.marksScored !== null && assignment.marksScored !== undefined) {
          const percentage = (assignment.marksScored / test.fullMarks) * 100;
          allPercentages.push(percentage);
        }
      });
    });

    const totalStudents = uniqueStudents.size;
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
    Animated.timing(glowOpacity, { toValue: 1, duration: 1000, useNativeDriver: true }).start();

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(headerOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(headerTranslateY, { toValue: 0, duration: 800, useNativeDriver: true }),
      ]).start();
    }, 200);

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(contentOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(contentTranslateY, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]).start();
    }, 400);

    setTimeout(() => {
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
    }, 600);
  };

  const getFilteredStudents = () => {
    let filtered = studentReports;

    if (searchQuery.trim()) {
      filtered = filtered.filter(student => 
        student.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.studentEmail.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name': return a.studentName.localeCompare(b.studentName);
        case 'percentage': return b.averagePercentage - a.averagePercentage;
        case 'tests': return b.evaluatedTests - a.evaluatedTests;
        default: return 0;
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

  const handleEditMarks = async (testId: string, studentId: string, currentMarks: number | null) => {
    const student = studentReports.find(s => s.studentId === studentId);
    const test = tests.find(t => t._id === testId);
    
    if (!student || !test) {
      Alert.alert('Error', 'Student or test not found');
      return;
    }

    Alert.prompt(
      'Update Marks',
      `Enter new marks for ${student.studentName}:\nTest: ${test.testTitle}\nMax Marks: ${test.fullMarks}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: async (newMarks) => {
            if (newMarks === undefined || newMarks === null) return;
            
            const marks = parseFloat(newMarks);
            
            if (isNaN(marks) || marks < 0 || marks > test.fullMarks) {
              Alert.alert('Error', `Marks must be between 0 and ${test.fullMarks}`);
              return;
            }

            try {
              const token = await AsyncStorage.getItem('userToken');
              if (!token) {
                Alert.alert('Error', 'Please log in again');
                return;
              }

              console.log('Updating marks:', { testId, studentId, marks });

              // Updated API endpoint to match backend routes
              const response = await fetch(`${API_BASE_URL}/tests/teacher/${testId}/marks`, {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                  studentId, 
                  marksScored: marks 
                }),
              });

              const data = await response.json();
              console.log('Update marks response:', data);
              
              if (response.ok && data.success) {
                Alert.alert('Success', 'Marks updated successfully');
                await loadReportData(); // Refresh all data
                setShowStudentModal(false); // Close modal and reopen with updated data
                setTimeout(() => {
                  const updatedStudent = studentReports.find(s => s.studentId === studentId);
                  if (updatedStudent) {
                    setSelectedStudent(updatedStudent);
                    setShowStudentModal(true);
                  }
                }, 500);
              } else {
                const errorMessage = data.message || `HTTP ${response.status}: Failed to update marks`;
                Alert.alert('Error', errorMessage);
              }
            } catch (error) {
              console.error('Error updating marks:', error);
              Alert.alert('Error', 'Network error occurred while updating marks');
            }
          }
        }
      ],
      'plain-text',
      currentMarks?.toString() || ''
    );
  };

  const renderAnalyticsTab = () => (
    <Animated.View style={[styles.analyticsContainer, { opacity: contentOpacity, transform: [{ translateY: contentTranslateY }] }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.analyticsContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[BRAND.primaryColor]} tintColor={BRAND.primaryColor} />}>
        
        <View style={styles.analyticsSection}>
          <Text style={styles.sectionTitle}>Overall Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{batchAnalytics?.totalTests || 0}</Text>
              <Text style={styles.statLabel}>Tests</Text>
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

        <View style={styles.analyticsSection}>
          <Text style={styles.sectionTitle}>Performance Overview</Text>
          <View style={styles.performanceGrid}>
            <View style={styles.performanceBox}>
              <Text style={styles.performanceLabel}>Average</Text>
              <Text style={[styles.performanceValue, { color: getPerformanceColor(batchAnalytics?.overallAveragePercentage || 0) }]}>
                {batchAnalytics?.overallAveragePercentage.toFixed(1) || 0}%
              </Text>
            </View>
            <View style={styles.performanceBox}>
              <Text style={styles.performanceLabel}>Highest</Text>
              <Text style={[styles.performanceValue, { color: BRAND.primaryColor }]}>
                {batchAnalytics?.highestScore.toFixed(1) || 0}%
              </Text>
            </View>
            <View style={styles.performanceBox}>
              <Text style={styles.performanceLabel}>Lowest</Text>
              <Text style={[styles.performanceValue, { color: '#ff6b6b' }]}>
                {batchAnalytics?.lowestScore.toFixed(1) || 0}%
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.analyticsSection}>
          <Text style={styles.sectionTitle}>Recent Tests</Text>
          {tests.slice(0, 3).map(test => (
            <TouchableOpacity key={test._id} style={styles.recentTestCard}
              onPress={() => navigation.navigate('TeacherHandleScoresScreen', { testId: test._id, testTitle: test.testTitle, fullMarks: test.fullMarks })}>
              <View style={styles.recentTestHeader}>
                <Text style={styles.recentTestTitle}>{test.testTitle}</Text>
                <Text style={styles.recentTestDate}>{new Date(test.createdAt).toLocaleDateString()}</Text>
              </View>
              <View style={styles.recentTestStats}>
                <Text style={styles.recentTestStat}>{test.assignedStudents.length} assigned</Text>
                <Text style={styles.recentTestStat}>{test.assignedStudents.filter(s => s.submittedAt).length} submitted</Text>
                <Text style={styles.recentTestStat}>{test.assignedStudents.filter(s => s.evaluatedAt).length} evaluated</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </Animated.View>
  );

  const renderStudentCard = ({ item }: { item: StudentReport }) => (
    <TouchableOpacity style={styles.studentCard} onPress={() => handleStudentPress(item)}>
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
          <Text style={styles.statLabel}>Score</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderStudentsTab = () => (
    <Animated.View style={[styles.studentsContainer, { opacity: contentOpacity, transform: [{ translateY: contentTranslateY }] }]}>
      <View style={styles.controlsContainer}>
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color="#666" />
          <TextInput style={styles.searchInput} placeholder="Search students..." placeholderTextColor="#666"
            value={searchQuery} onChangeText={setSearchQuery} />
        </View>
        <View style={styles.filtersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {['name', 'percentage', 'tests'].map((sort) => (
              <TouchableOpacity key={sort}
                style={[styles.filterButton, sortBy === sort && styles.activeFilterButton]}
                onPress={() => setSortBy(sort as any)}>
                <Text style={[styles.filterButtonText, sortBy === sort && styles.activeFilterButtonText]}>
                  {sort === 'percentage' ? 'Score' : sort.charAt(0).toUpperCase() + sort.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      <FlatList data={getFilteredStudents()} renderItem={renderStudentCard} keyExtractor={(item) => item.studentId}
        contentContainerStyle={styles.studentsList} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[BRAND.primaryColor]} tintColor={BRAND.primaryColor} />} />
    </Animated.View>
  );

  const renderTestCard = ({ item }: { item: Test }) => (
    <TouchableOpacity style={styles.testCard}
      onPress={() => navigation.navigate('TeacherHandleScoresScreen', { testId: item._id, testTitle: item.testTitle, fullMarks: item.fullMarks })}>
      <View style={styles.testCardHeader}>
        <Text style={styles.testTitle}>{item.testTitle}</Text>
        <Text style={styles.testDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
      </View>
      <View style={styles.testStats}>
        <View style={styles.testStatItem}>
          <Text style={styles.testStatValue}>{item.fullMarks}</Text>
          <Text style={styles.testStatLabel}>Marks</Text>
        </View>
        <View style={styles.testStatItem}>
          <Text style={styles.testStatValue}>{item.assignedStudents.length}</Text>
          <Text style={styles.testStatLabel}>Assigned</Text>
        </View>
        <View style={styles.testStatItem}>
          <Text style={styles.testStatValue}>{item.assignedStudents.filter(s => s.evaluatedAt).length}</Text>
          <Text style={styles.testStatLabel}>Evaluated</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderTestsTab = () => (
    <Animated.View style={[styles.testsContainer, { opacity: contentOpacity, transform: [{ translateY: contentTranslateY }] }]}>
      <FlatList data={tests} renderItem={renderTestCard} keyExtractor={(item) => item._id}
        contentContainerStyle={styles.testsList} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[BRAND.primaryColor]} tintColor={BRAND.primaryColor} />} />
    </Animated.View>
  );

  const renderStudentModal = () => (
    <Modal visible={showStudentModal} transparent={true} animationType="slide" onRequestClose={() => setShowStudentModal(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{selectedStudent?.studentName}</Text>
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowStudentModal(false)}>
              <MaterialIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody}>
            <View style={styles.studentDetailStats}>
              <View style={styles.detailStatBox}>
                <Text style={styles.detailStatNumber}>{selectedStudent?.totalTests}</Text>
                <Text style={styles.detailStatLabel}>Tests</Text>
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
              <TouchableOpacity key={test.testId} style={styles.testHistoryItem}
                onPress={() => handleEditMarks(test.testId, selectedStudent.studentId, test.marksScored)}>
                <View style={styles.testHistoryHeader}>
                  <Text style={styles.testHistoryTitle}>{test.testTitle}</Text>
                  <Text style={styles.testHistoryDate}>{new Date(test.createdAt).toLocaleDateString()}</Text>
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
                  <Text style={styles.testHistoryStatusText}>Tap to edit marks</Text>
                </View>
              </TouchableOpacity>
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
      
      <View style={styles.backgroundElements}>
        <Animated.View style={[styles.glowCircle, styles.glowCircle1, { opacity: Animated.multiply(glowOpacity, 0.08) }]} />
        <Animated.View style={[styles.glowCircle, styles.glowCircle2, { opacity: Animated.multiply(glowOpacity, 0.06) }]} />
        <Animated.View style={[styles.glowCircle, styles.glowCircle3, { opacity: Animated.multiply(glowOpacity, 0.04) }]} />
      </View>

      <Animated.View style={[styles.headerSection, { opacity: headerOpacity, transform: [{ translateY: headerTranslateY }] }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Batch Reports</Text>
            <Text style={styles.headerSubtitle}>{subjectName}</Text>
          </View>
        </View>
      </Animated.View>

      <Animated.View style={[styles.tabContainer, { opacity: contentOpacity, transform: [{ translateY: contentTranslateY }] }]}>
        {['analytics', 'students', 'tests'].map((tab) => (
          <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab as any)}>
            <MaterialIcons name={tab === 'analytics' ? 'analytics' : tab === 'students' ? 'people' : 'assignment'} 
              size={20} color={activeTab === tab ? BRAND.backgroundColor : '#666'} />
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </Animated.View>

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {activeTab === 'analytics' && renderAnalyticsTab()}
        {activeTab === 'students' && renderStudentsTab()}
        {activeTab === 'tests' && renderTestsTab()}
      </Animated.View>

      {renderStudentModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: BRAND.backgroundColor 
  },
  
  backgroundElements: { 
    position: 'absolute', 
    width: '100%', 
    height: '100%' 
  },
  
  glowCircle: { 
    position: 'absolute', 
    borderRadius: 1000, 
    backgroundColor: BRAND.primaryColor 
  },
  
  glowCircle1: { 
    width: 400, 
    height: 400, 
    top: -200, 
    right: -200 
  },
  
  glowCircle2: { 
    width: 300, 
    height: 300, 
    bottom: -150, 
    left: -150 
  },
  
  glowCircle3: { 
    width: 200, 
    height: 200, 
    top: '50%', 
    left: '50%', 
    marginTop: -100, 
    marginLeft: -100 
  },
  
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  
  loadingText: { 
    color: '#fff', 
    marginTop: 16, 
    fontSize: 16 
  },
  
  headerSection: { 
    paddingHorizontal: 20, 
    paddingVertical: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: BRAND.accentColor 
  },
  
  headerContent: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  
  backButton: { 
    padding: 8, 
    marginRight: 16 
  },
  
  headerTitleContainer: { 
    flex: 1 
  },
  
  headerTitle: { 
    color: '#fff', 
    fontSize: 24, 
    fontWeight: 'bold' 
  },
  
  headerSubtitle: { 
    color: BRAND.primaryColor, 
    fontSize: 16, 
    marginTop: 4 
  },
  
  tabContainer: { 
    flexDirection: 'row', 
    paddingHorizontal: 20, 
    marginTop: 16 
  },
  
  tab: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 12, 
    borderRadius: 12, 
    marginHorizontal: 4,
    backgroundColor: BRAND.accentColor
  },
  
  activeTab: {
    backgroundColor: BRAND.primaryColor
  },
  
  tabText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8
  },
  
  activeTabText: {
    color: BRAND.backgroundColor
  },
  
  content: {
    flex: 1,
    marginTop: 16
  },
  
  // Analytics Tab Styles
  analyticsContainer: {
    flex: 1
  },
  
  analyticsContent: {
    paddingHorizontal: 20,
    paddingBottom: 20
  },
  
  analyticsSection: {
    marginBottom: 24
  },
  
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16
  },
  
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  
  statBox: {
    backgroundColor: BRAND.accentColor,
    borderRadius: 12,
    padding: 16,
    width: (width - 60) / 2,
    marginBottom: 12,
    alignItems: 'center'
  },
  
  statNumber: {
    color: BRAND.primaryColor,
    fontSize: 28,
    fontWeight: 'bold'
  },
  
  statLabel: {
    color: '#999',
    fontSize: 14,
    marginTop: 4
  },
  
  performanceGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  
  performanceBox: {
    backgroundColor: BRAND.accentColor,
    borderRadius: 12,
    padding: 16,
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center'
  },
  
  performanceLabel: {
    color: '#999',
    fontSize: 12,
    marginBottom: 8
  },
  
  performanceValue: {
    fontSize: 24,
    fontWeight: 'bold'
  },
  
  recentTestCard: {
    backgroundColor: BRAND.accentColor,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: BRAND.primaryColor
  },
  
  recentTestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  
  recentTestTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1
  },
  
  recentTestDate: {
    color: '#999',
    fontSize: 12
  },
  
  recentTestStats: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  
  recentTestStat: {
    color: BRAND.primaryColor,
    fontSize: 12,
    fontWeight: '500'
  },
  
  // Students Tab Styles
  studentsContainer: {
    flex: 1
  },
  
  controlsContainer: {
    paddingHorizontal: 20,
    marginBottom: 16
  },
  
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND.accentColor,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12
  },
  
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    marginLeft: 12
  },
  
  filtersContainer: {
    flexDirection: 'row'
  },
  
  filterButton: {
    backgroundColor: BRAND.accentColor,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8
  },
  
  activeFilterButton: {
    backgroundColor: BRAND.primaryColor
  },
  
  filterButtonText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '500'
  },
  
  activeFilterButtonText: {
    color: BRAND.backgroundColor
  },
  
  studentsList: {
    paddingHorizontal: 20,
    paddingBottom: 20
  },
  
  studentCard: {
    backgroundColor: BRAND.accentColor,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: BRAND.primaryColor
  },
  
  studentCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  
  studentInfo: {
    flex: 1
  },
  
  studentName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  
  studentEmail: {
    color: '#999',
    fontSize: 14,
    marginTop: 4
  },
  
  studentPerformance: {
    alignItems: 'flex-end'
  },
  
  performancePercentage: {
    fontSize: 20,
    fontWeight: 'bold'
  },
  
  studentStats: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  
  statItem: {
    alignItems: 'center'
  },
  
  statValue: {
    color: BRAND.primaryColor,
    fontSize: 16,
    fontWeight: 'bold'
  },
  
  // Tests Tab Styles
  testsContainer: {
    flex: 1
  },
  
  testsList: {
    paddingHorizontal: 20,
    paddingBottom: 20
  },
  
  testCard: {
    backgroundColor: BRAND.accentColor,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: BRAND.primaryColor
  },
  
  testCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  
  testTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1
  },
  
  testDate: {
    color: '#999',
    fontSize: 12
  },
  
  testStats: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  
  testStatItem: {
    alignItems: 'center'
  },
  
  testStatValue: {
    color: BRAND.primaryColor,
    fontSize: 16,
    fontWeight: 'bold'
  },
  
  testStatLabel: {
    color: '#999',
    fontSize: 12,
    marginTop: 4
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end'
  },
  
  modalContent: {
    backgroundColor: BRAND.backgroundColor,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.8,
    minHeight: height * 0.5
  },
  
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.accentColor
  },
  
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold'
  },
  
  modalCloseButton: {
    padding: 8
  },
  
  modalBody: {
    flex: 1,
    padding: 20
  },
  
  studentDetailStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24
  },
  
  detailStatBox: {
    backgroundColor: BRAND.accentColor,
    borderRadius: 12,
    padding: 16,
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center'
  },
  
  detailStatNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: BRAND.primaryColor
  },
  
  detailStatLabel: {
    color: '#999',
    fontSize: 12,
    marginTop: 4
  },
  
  modalSectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16
  },
  
  testHistoryItem: {
    backgroundColor: BRAND.accentColor,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: BRAND.primaryColor
  },
  
  testHistoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  
  testHistoryTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    flex: 1
  },
  
  testHistoryDate: {
    color: '#999',
    fontSize: 12
  },
  
  testHistoryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  
  testHistoryScore: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500'
  },
  
  testHistoryPercentage: {
    fontSize: 16,
    fontWeight: 'bold'
  },
  
  testHistoryStatus: {
    alignItems: 'center'
  },
  
  testHistoryStatusText: {
    color: '#999',
    fontSize: 12,
    fontStyle: 'italic'
  }
});