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
  TextInput,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { RootStackParamList } from '../App';
import { API_BASE } from '../config/api';

type TeacherHandleScoresNavigationProp = NativeStackNavigationProp<RootStackParamList>;
type TeacherHandleScoresRouteProp = {
  key: string;
  name: string;
  params: {
    testId: string;
    testTitle: string;
    fullMarks: number;
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

// Student assignment interface (updated to match backend)
interface StudentAssignment {
  _id: string;
  student: {
    _id: string;
    name: string;
    email: string;
  };
  marksScored: number | null;
  submittedAt: Date | null;
  evaluatedAt: Date | null;
}

// Test interface (updated to match backend structure)
interface Test {
  _id: string;
  testTitle: string;
  fullMarks: number;
  batch: {
    _id: string;
    batchName: string;
    category: string;
  };
  className: string;
  subjectName: string;
  assignedStudents: StudentAssignment[];
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  instructions: string;
  dueDate: Date | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Marks update interface
interface MarksUpdate {
  studentId: string;
  marksScored: number;
}

export default function TeacherHandleScoresScreen() {
  const navigation = useNavigation<TeacherHandleScoresNavigationProp>();
  const route = useRoute<TeacherHandleScoresRouteProp>();
  const { testId, testTitle, fullMarks } = route.params;

  // State management
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [test, setTest] = useState<Test | null>(null);
  const [studentsAssignments, setStudentsAssignments] = useState<StudentAssignment[]>([]);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentAssignment | null>(null);
  const [marksInput, setMarksInput] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false);
  const [bulkMarksUpdates, setBulkMarksUpdates] = useState<{ [key: string]: string }>({});
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'submitted' | 'evaluated' | 'pending'>('all');

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-20)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(30)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadTestData();
    startEntranceAnimation();
  }, [testId]);

  const loadTestData = async () => {
    setIsLoading(true);
    await fetchTestDetails();
    setIsLoading(false);
  };

  // Updated fetchTestDetails to fetch test from getTeacherTests and filter by ID
  const fetchTestDetails = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        Alert.alert('Error', 'No authentication token found');
        return;
      }

      // Fetch all teacher tests and find the specific one
      const response = await fetch(`${API_BASE_URL}/tests/teacher/my-tests`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (data.success) {
        // Find the specific test by ID
        const specificTest = data.data.find((t: Test) => t._id === testId);
        
        if (!specificTest) {
          Alert.alert('Error', 'Test not found');
          return;
        }

        setTest(specificTest);
        setStudentsAssignments(specificTest.assignedStudents);
        
        // Initialize bulk marks updates with current marks
        const bulkUpdates: { [key: string]: string } = {};
        specificTest.assignedStudents.forEach((assignment: StudentAssignment) => {
          bulkUpdates[assignment.student._id] = assignment.marksScored?.toString() || '';
        });
        setBulkMarksUpdates(bulkUpdates);
      } else {
        Alert.alert('Error', data.message || 'Failed to fetch test details');
      }
    } catch (error) {
      console.error('Error fetching test details:', error);
      Alert.alert('Error', 'Network error. Please check your connection.');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTestData();
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

  const handleUpdateMarks = (student: StudentAssignment) => {
    setSelectedStudent(student);
    setMarksInput(student.marksScored?.toString() || '');
    setShowUpdateModal(true);
  };

  const handleCloseUpdateModal = () => {
    setSelectedStudent(null);
    setMarksInput('');
    setShowUpdateModal(false);
  };

  const validateMarks = (marks: string): boolean => {
    if (!marks || marks.trim() === '') {
      Alert.alert('Error', 'Please enter marks');
      return false;
    }
    
    const marksNumber = parseFloat(marks);
    if (isNaN(marksNumber) || marksNumber < 0 || marksNumber > fullMarks) {
      Alert.alert('Invalid Marks', `Please enter marks between 0 and ${fullMarks}`);
      return false;
    }
    return true;
  };

  const handleUpdateMarksSubmit = async () => {
    if (!selectedStudent) {
      Alert.alert('Error', 'No student selected');
      return;
    }

    if (!validateMarks(marksInput)) {
      return;
    }

    setIsUpdating(true);

    try {
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        Alert.alert('Error', 'No authentication token found');
        setIsUpdating(false);
        return;
      }

      const requestBody = {
        studentId: selectedStudent.student._id,
        marksScored: parseFloat(marksInput),
      };

      console.log('Making API call to update marks:');
      console.log('URL:', `${API_BASE_URL}/tests/teacher/${testId}/marks`);
      console.log('Request body:', JSON.stringify(requestBody));

      // Using the correct teacher marks endpoint
      const response = await fetch(`${API_BASE_URL}/tests/teacher/${testId}/marks`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      // Check if response is ok first
      if (!response.ok) {
        const errorText = await response.text();
        console.error('HTTP Error:', response.status, errorText);
        Alert.alert('Error', `HTTP Error: ${response.status}. ${errorText}`);
        setIsUpdating(false);
        return;
      }

      const data = await response.json();
      console.log('Response data:', data);
      
      if (data.success) {
        Alert.alert('Success', 'Marks updated successfully!', [
          {
            text: 'OK',
            onPress: () => {
              handleCloseUpdateModal();
              fetchTestDetails();
            }
          }
        ]);
      } else {
        console.error('API Error:', data);
        Alert.alert('Error', data.message || 'Failed to update marks');
      }
    } catch (error) {
      console.error('Network Error updating marks:', error);
      Alert.alert('Error', `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBulkMarksUpdate = (studentId: string, marks: string) => {
    setBulkMarksUpdates(prev => ({
      ...prev,
      [studentId]: marks,
    }));
  };

  const handleBulkUpdateSubmit = async () => {
    // Validate all marks and prepare updates
    const updates: MarksUpdate[] = [];
    const validationErrors: string[] = [];
    
    for (const [studentId, marks] of Object.entries(bulkMarksUpdates)) {
      if (marks && marks.trim() !== '') {
        const marksNumber = parseFloat(marks);
        if (isNaN(marksNumber) || marksNumber < 0 || marksNumber > fullMarks) {
          const student = studentsAssignments.find(s => s.student._id === studentId);
          validationErrors.push(`Invalid marks for ${student?.student.name || 'Unknown'}: ${marks}`);
          continue;
        }
        updates.push({
          studentId,
          marksScored: marksNumber,
        });
      }
    }

    if (validationErrors.length > 0) {
      Alert.alert('Validation Error', validationErrors.join('\n'));
      return;
    }

    if (updates.length === 0) {
      Alert.alert('Error', 'Please enter at least one mark to update');
      return;
    }

    setIsBulkUpdating(true);

    try {
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        Alert.alert('Error', 'No authentication token found');
        setIsBulkUpdating(false);
        return;
      }

      // Update marks for each student sequentially to avoid overwhelming the server
      const results = [];
      for (const update of updates) {
        try {
          // Using updated teacher marks endpoint
          const response = await fetch(`${API_BASE_URL}/tests/teacher/${testId}/marks`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(update),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`HTTP Error for student ${update.studentId}:`, response.status, errorText);
            results.push({ success: false, studentId: update.studentId, error: errorText });
          } else {
            const data = await response.json();
            results.push({ success: data.success, studentId: update.studentId, data });
          }
        } catch (error) {
          console.error(`Network Error for student ${update.studentId}:`, error);
          results.push({ 
            success: false, 
            studentId: update.studentId, 
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failedCount = results.length - successCount;

      if (failedCount === 0) {
        Alert.alert('Success', `Updated marks for ${successCount} student${successCount > 1 ? 's' : ''}!`, [
          {
            text: 'OK',
            onPress: () => {
              setShowBulkUpdateModal(false);
              fetchTestDetails();
            }
          }
        ]);
      } else {
        Alert.alert(
          'Partial Success', 
          `Updated ${successCount} out of ${results.length} students. ${failedCount} updates failed.`,
          [
            {
              text: 'OK',
              onPress: () => {
                fetchTestDetails();
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error updating bulk marks:', error);
      Alert.alert('Error', `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const getFilteredStudents = () => {
    switch (filterStatus) {
      case 'submitted':
        return studentsAssignments.filter(s => s.submittedAt);
      case 'evaluated':
        return studentsAssignments.filter(s => s.evaluatedAt);
      case 'pending':
        return studentsAssignments.filter(s => s.submittedAt && !s.evaluatedAt);
      default:
        return studentsAssignments;
    }
  };

  const getStatusColor = (assignment: StudentAssignment) => {
    if (assignment.evaluatedAt) return BRAND.primaryColor;
    if (assignment.submittedAt) return '#ffa500';
    return '#666';
  };

  const getStatusText = (assignment: StudentAssignment) => {
    if (assignment.evaluatedAt) return 'Evaluated';
    if (assignment.submittedAt) return 'Submitted';
    return 'Not Submitted';
  };

  const renderStudentCard = ({ item }: { item: StudentAssignment }) => (
    <Animated.View 
      style={[
        styles.studentCard,
        { opacity: contentOpacity, transform: [{ translateY: contentTranslateY }] }
      ]}
    >
      <View style={styles.studentHeader}>
        <View style={styles.studentInfo}>
          <Text style={styles.studentName}>{item.student.name}</Text>
          <Text style={styles.studentEmail}>{item.student.email}</Text>
        </View>
        <View style={styles.studentStatus}>
          <Text style={[styles.statusText, { color: getStatusColor(item) }]}>
            {getStatusText(item)}
          </Text>
        </View>
      </View>

      <View style={styles.studentDetails}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Marks Scored:</Text>
          <Text style={[
            styles.detailValue,
            { color: item.marksScored !== null ? BRAND.primaryColor : '#666' }
          ]}>
            {item.marksScored !== null ? `${item.marksScored}/${fullMarks}` : 'Not Evaluated'}
          </Text>
        </View>

        {item.submittedAt && (
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Submitted:</Text>
            <Text style={styles.detailValue}>
              {new Date(item.submittedAt).toLocaleDateString()} at {new Date(item.submittedAt).toLocaleTimeString()}
            </Text>
          </View>
        )}

        {item.evaluatedAt && (
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Evaluated:</Text>
            <Text style={styles.detailValue}>
              {new Date(item.evaluatedAt).toLocaleDateString()} at {new Date(item.evaluatedAt).toLocaleTimeString()}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.studentActions}>
        <TouchableOpacity
          style={styles.updateButton}
          onPress={() => handleUpdateMarks(item)}
        >
          <MaterialIcons 
            name="edit" 
            size={16} 
            color="#000" 
          />
          <Text style={styles.updateButtonText}>
            {item.marksScored !== null ? 'Update Marks' : 'Add Marks'}
          </Text>
        </TouchableOpacity>

        {item.marksScored !== null && (
          <View style={styles.percentageContainer}>
            <Text style={styles.percentageText}>
              {((item.marksScored / fullMarks) * 100).toFixed(1)}%
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );

  const renderUpdateModal = () => (
    <Modal
      visible={showUpdateModal}
      animationType="slide"
      transparent={true}
      onRequestClose={handleCloseUpdateModal}
    >
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView 
          style={styles.modalKeyboard}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.updateModalContainer}>
            <View style={styles.updateModalHeader}>
              <Text style={styles.updateModalTitle}>Update Marks</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleCloseUpdateModal}
              >
                <MaterialIcons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.updateModalContent}>
              <Text style={styles.studentNameModal}>
                {selectedStudent?.student.name}
              </Text>
              <Text style={styles.studentEmailModal}>
                {selectedStudent?.student.email}
              </Text>

              <View style={styles.marksInputContainer}>
                <Text style={styles.marksLabel}>
                  Enter marks (0 - {fullMarks}):
                </Text>
                <TextInput
                  style={styles.marksInput}
                  value={marksInput}
                  onChangeText={setMarksInput}
                  placeholder="0"
                  placeholderTextColor="#666"
                  keyboardType="numeric"
                  maxLength={3}
                  autoFocus={true}
                />
              </View>

              <View style={styles.updateModalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCloseUpdateModal}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitButton, isUpdating && styles.disabledButton]}
                  onPress={handleUpdateMarksSubmit}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <Text style={styles.submitButtonText}>Update</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );

  const renderBulkUpdateModal = () => (
    <Modal
      visible={showBulkUpdateModal}
      animationType="slide"
      transparent={false}
      onRequestClose={() => setShowBulkUpdateModal(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setShowBulkUpdateModal(false)}
          >
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Bulk Update Marks</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.bulkUpdateContent}>
          <Text style={styles.bulkUpdateSubtitle}>
            Enter marks for multiple students at once
          </Text>

          {studentsAssignments.map((assignment) => (
            <View key={assignment.student._id} style={styles.bulkUpdateItem}>
              <View style={styles.bulkStudentInfo}>
                <Text style={styles.bulkStudentName}>{assignment.student.name}</Text>
                <Text style={styles.bulkStudentEmail}>{assignment.student.email}</Text>
                <Text style={[styles.bulkStudentStatus, { color: getStatusColor(assignment) }]}>
                  {getStatusText(assignment)}
                </Text>
              </View>
              <View style={styles.bulkMarksInputContainer}>
                <Text style={styles.bulkMarksLabel}>/{fullMarks}</Text>
                <TextInput
                  style={styles.bulkMarksInput}
                  value={bulkMarksUpdates[assignment.student._id] || ''}
                  onChangeText={(text) => handleBulkMarksUpdate(assignment.student._id, text)}
                  placeholder="0"
                  placeholderTextColor="#666"
                  keyboardType="numeric"
                  maxLength={3}
                />
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setShowBulkUpdateModal(false)}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.createButton, isBulkUpdating && styles.disabledButton]}
            onPress={handleBulkUpdateSubmit}
            disabled={isBulkUpdating}
          >
            {isBulkUpdating ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Text style={styles.createButtonText}>Update All</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );

  const renderFilterButtons = () => (
    <View style={styles.filterContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {[
          { key: 'all', label: 'All', count: studentsAssignments.length },
          { key: 'submitted', label: 'Submitted', count: studentsAssignments.filter(s => s.submittedAt).length },
          { key: 'evaluated', label: 'Evaluated', count: studentsAssignments.filter(s => s.evaluatedAt).length },
          { key: 'pending', label: 'Pending', count: studentsAssignments.filter(s => s.submittedAt && !s.evaluatedAt).length },
        ].map((filter) => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterButton,
              filterStatus === filter.key && styles.filterButtonActive
            ]}
            onPress={() => setFilterStatus(filter.key as any)}
          >
            <Text style={[
              styles.filterButtonText,
              filterStatus === filter.key && styles.filterButtonTextActive
            ]}>
              {filter.label} ({filter.count})
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderEmptyState = () => (
    <Animated.View 
      style={[
        styles.emptyState,
        { opacity: contentOpacity, transform: [{ translateY: contentTranslateY }] }
      ]}
    >
      <MaterialIcons name="assignment-turned-in" size={80} color="#333" />
      <Text style={styles.emptyStateTitle}>No Students Found</Text>
      <Text style={styles.emptyStateSubtitle}>
        {filterStatus === 'all' 
          ? 'No students are assigned to this test'
          : `No students match the "${filterStatus}" filter`
        }
      </Text>
    </Animated.View>
  );

  const renderStats = () => {
    const totalStudents = studentsAssignments.length;
    const submittedCount = studentsAssignments.filter(s => s.submittedAt).length;
    const evaluatedCount = studentsAssignments.filter(s => s.evaluatedAt).length;
    const averageMarks = evaluatedCount > 0 
      ? studentsAssignments
          .filter(s => s.marksScored !== null)
          .reduce((sum, s) => sum + (s.marksScored || 0), 0) / evaluatedCount
      : 0;

    return (
      <Animated.View 
        style={[
          styles.statsContainer,
          { opacity: contentOpacity, transform: [{ translateY: contentTranslateY }] }
        ]}
      >
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalStudents}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{submittedCount}</Text>
          <Text style={styles.statLabel}>Submitted</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{evaluatedCount}</Text>
          <Text style={styles.statLabel}>Evaluated</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{averageMarks.toFixed(1)}</Text>
          <Text style={styles.statLabel}>Avg Marks</Text>
        </View>
      </Animated.View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={BRAND.backgroundColor} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BRAND.primaryColor} />
          <Text style={styles.loadingText}>Loading student scores...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const filteredStudents = getFilteredStudents();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND.backgroundColor} />
      
      {/* Animated background glow */}
      <Animated.View style={[styles.backgroundGlow, { opacity: glowOpacity }]} />

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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Student Scores</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {test?.testTitle || testTitle}
          </Text>
          {test?.subjectName && test?.className && (
            <Text style={styles.headerMeta}>
              {test.subjectName} • Class {test.className}
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.bulkUpdateButton}
          onPress={() => setShowBulkUpdateModal(true)}
        >
          <MaterialIcons name="edit-note" size={24} color="#000" />
        </TouchableOpacity>
      </Animated.View>

      {/* Stats */}
      {renderStats()}

      {/* Filters */}
      {renderFilterButtons()}

      {/* Content */}
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {filteredStudents.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={filteredStudents}
            keyExtractor={(item) => item.student._id}
            renderItem={renderStudentCard}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[BRAND.primaryColor]}
                progressBackgroundColor={BRAND.accentColor}
              />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          />
        )}
      </Animated.View>

      {/* Modals */}
      {renderUpdateModal()}
      {renderBulkUpdateModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND.backgroundColor,
  },
  backgroundGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.3,
    backgroundColor: BRAND.primaryColor,
    opacity: 0.05,
    borderRadius: width,
    transform: [{ scaleX: 2 }],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 15,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: BRAND.accentColor,
    marginRight: 15,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: BRAND.primaryColor,
    marginTop: 2,
  },
  headerMeta: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  bulkUpdateButton: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: BRAND.primaryColor,
    marginLeft: 10,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginHorizontal: 20,
    marginVertical: 10,
    backgroundColor: BRAND.accentColor,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: BRAND.primaryColor,
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  filterContainer: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: BRAND.accentColor,
    borderWidth: 1,
    borderColor: '#333',
  },
  filterButtonActive: {
    backgroundColor: BRAND.primaryColor,
    borderColor: BRAND.primaryColor,
  },
  filterButtonText: {
    fontSize: 14,
    color: '#888',
  },
  filterButtonTextActive: {
    color: '#000',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  studentCard: {
    backgroundColor: BRAND.accentColor,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  studentHeader: {
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
    fontWeight: 'bold',
    color: '#fff',
  },
  studentEmail: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  studentStatus: {
    alignItems: 'flex-end',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  studentDetails: {
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 14,
    color: '#888',
  },
  detailValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  studentActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND.primaryColor,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  updateButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  percentageContainer: {
    backgroundColor: '#333',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  percentageText: {
    color: BRAND.primaryColor,
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    lineHeight: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalKeyboard: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  updateModalContainer: {
    width: width * 0.9,
    backgroundColor: BRAND.accentColor,
    borderRadius: 16,
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#333',
  },
  updateModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  updateModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    padding: 4,
  },
  updateModalContent: {
    padding: 20,
  },
  studentNameModal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  studentEmailModal: {
    fontSize: 14,
    color: '#888',
    marginBottom: 20,
  },
  marksInputContainer: {
    marginBottom: 24,
  },
  marksLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
  },
  marksInput: {
    backgroundColor: '#333',
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
  },
  updateModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#333',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#888',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    backgroundColor: BRAND.primaryColor,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.6,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: BRAND.backgroundColor,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginLeft: -24, // Compensate for back button width
  },
  headerSpacer: {
    width: 24, // Same as back button width
  },
  bulkUpdateContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  bulkUpdateSubtitle: {
    fontSize: 14,
    color: '#888',
    marginVertical: 16,
    textAlign: 'center',
  },
  bulkUpdateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND.accentColor,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  bulkStudentInfo: {
    flex: 1,
  },
  bulkStudentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  bulkStudentEmail: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  bulkStudentStatus: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  bulkMarksInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
  },
  bulkMarksLabel: {
    fontSize: 16,
    color: '#888',
    marginRight: 8,
  },
  bulkMarksInput: {
    backgroundColor: '#333',
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#444',
    width: 60,
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
    gap: 12,
  },
  createButton: {
    flex: 1,
    backgroundColor: BRAND.primaryColor,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});