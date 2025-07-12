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
import * as DocumentPicker from 'expo-document-picker';
import { RootStackParamList } from '../App';

type TeacherHandleTestNavigationProp = NativeStackNavigationProp<RootStackParamList>;
type TeacherHandleTestRouteProp = {
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

// Test interface
interface Test {
  _id: string;
  testTitle: string;
  fullMarks: number;
  batch: {
    _id: string;
    batchName: string;
    category: string;
  };
  assignedStudents: {
    student: {
      _id: string;
      name: string;
      email: string;
    };
    marksScored: number | null;
    submittedAt: Date | null;
    evaluatedAt: Date | null;
  }[];
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

// Student interface
interface Student {
  _id: string;
  name: string;
  email: string;
}

// File interface
interface FileUpload {
  uri: string;
  name: string;
  type: string;
  size: number;
}

export default function TeacherHandleTestScreen() {
  const navigation = useNavigation<TeacherHandleTestNavigationProp>();
  const route = useRoute<TeacherHandleTestRouteProp>();
  const { batchId } = route.params;

  // State management
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tests, setTests] = useState<Test[]>([]);
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignStudentsModal, setShowAssignStudentsModal] = useState(false);
  const [selectedTestForAssignment, setSelectedTestForAssignment] = useState<Test | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  // Create test form state
  const [testTitle, setTestTitle] = useState('');
  const [fullMarks, setFullMarks] = useState('');
  const [instructions, setInstructions] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [questionPdf, setQuestionPdf] = useState<FileUpload | null>(null);
  const [answerPdf, setAnswerPdf] = useState<FileUpload | null>(null);

  // Student assignment state
  const [selectedStudentsForAssignment, setSelectedStudentsForAssignment] = useState<string[]>([]);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-20)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(30)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadData();
    startEntranceAnimation();
  }, [batchId]);

  const loadData = async () => {
    setIsLoading(true);
    await Promise.all([
      fetchBatchTests(),
      fetchAvailableStudents()
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

      const response = await fetch(`http://192.168.29.148:5000/api/tests/batch/${batchId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (data.success) {
        setTests(data.data);
      } else {
        Alert.alert('Error', data.message || 'Failed to fetch tests');
      }
    } catch (error) {
      console.error('Error fetching batch tests:', error);
      Alert.alert('Error', 'Network error. Please check your connection.');
    }
  };

  const fetchAvailableStudents = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) return;

      const response = await fetch(`http://192.168.29.148:5000/api/tests/batch/${batchId}/available-students`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (data.success) {
        setAvailableStudents(data.data);
      }
    } catch (error) {
      console.error('Error fetching available students:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
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

  const handleCreateTest = () => {
    resetCreateForm();
    setShowCreateModal(true);
  };

  const resetCreateForm = () => {
    setTestTitle('');
    setFullMarks('');
    setInstructions('');
    setDueDate('');
    setQuestionPdf(null);
    setAnswerPdf(null);
  };

  const handleCloseCreateModal = () => {
    resetCreateForm();
    setShowCreateModal(false);
  };

  const handleAssignStudents = (test: Test) => {
    setSelectedTestForAssignment(test);
    // Pre-select already assigned students
    setSelectedStudentsForAssignment(test.assignedStudents.map(as => as.student._id));
    setShowAssignStudentsModal(true);
  };

  const handleCloseAssignStudentsModal = () => {
    setSelectedTestForAssignment(null);
    setSelectedStudentsForAssignment([]);
    setShowAssignStudentsModal(false);
  };

  const handleFileUpload = async (type: 'question' | 'answer') => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        const fileData: FileUpload = {
          uri: file.uri,
          name: file.name,
          type: file.mimeType || 'application/pdf',
          size: file.size || 0,
        };

        if (type === 'question') {
          setQuestionPdf(fileData);
        } else {
          setAnswerPdf(fileData);
        }
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const validateCreateForm = () => {
    if (!testTitle.trim()) {
      Alert.alert('Validation Error', 'Please enter test title');
      return false;
    }

    if (!fullMarks.trim()) {
      Alert.alert('Validation Error', 'Please enter full marks');
      return false;
    }

    const marksNumber = Number(fullMarks);
    if (isNaN(marksNumber) || marksNumber <= 0) {
      Alert.alert('Validation Error', 'Please enter valid full marks (greater than 0)');
      return false;
    }

    // Validate due date format if provided
    if (dueDate.trim() && !isValidDate(dueDate)) {
      Alert.alert('Validation Error', 'Please enter date in YYYY-MM-DD format');
      return false;
    }

    return true;
  };

  const isValidDate = (dateString: string) => {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) return false;
    
    const date = new Date(dateString);
    const timestamp = date.getTime();
    
    if (typeof timestamp !== 'number' || Number.isNaN(timestamp)) return false;
    
    return dateString === date.toISOString().split('T')[0];
  };

  const handleCreateTestSubmit = async () => {
    if (!validateCreateForm()) return;

    setIsCreating(true);

    try {
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        Alert.alert('Error', 'No authentication token found');
        setIsCreating(false);
        return;
      }

      const formData = new FormData();
      formData.append('testTitle', testTitle.trim());
      formData.append('fullMarks', fullMarks.trim());
      formData.append('batchId', batchId);
      // Don't assign students during creation
      formData.append('assignedStudents', JSON.stringify([]));
      
      if (instructions.trim()) {
        formData.append('instructions', instructions.trim());
      }
      
      if (dueDate.trim()) {
        formData.append('dueDate', dueDate.trim());
      }

      if (questionPdf) {
        formData.append('questionPdf', {
          uri: questionPdf.uri,
          name: questionPdf.name,
          type: questionPdf.type,
        } as any);
      }

      if (answerPdf) {
        formData.append('answerPdf', {
          uri: answerPdf.uri,
          name: answerPdf.name,
          type: answerPdf.type,
        } as any);
      }

      const response = await fetch('http://192.168.29.148:5000/api/tests/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        Alert.alert('Success', 'Test created successfully! You can now assign students to this test.', [
          {
            text: 'OK',
            onPress: () => {
              handleCloseCreateModal();
              fetchBatchTests();
            }
          }
        ]);
      } else {
        Alert.alert('Error', data.message || 'Failed to create test');
      }
    } catch (error) {
      console.error('Error creating test:', error);
      Alert.alert('Error', 'Network error. Please check your connection.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleAssignStudentsSubmit = async () => {
    if (!selectedTestForAssignment) return;

    setIsAssigning(true);

    try {
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        Alert.alert('Error', 'No authentication token found');
        setIsAssigning(false);
        return;
      }

      const response = await fetch(`http://192.168.29.148:5000/api/tests/${selectedTestForAssignment._id}/assign-students`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assignedStudents: selectedStudentsForAssignment
        }),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        Alert.alert('Success', 'Students assigned successfully!', [
          {
            text: 'OK',
            onPress: () => {
              handleCloseAssignStudentsModal();
              fetchBatchTests();
            }
          }
        ]);
      } else {
        Alert.alert('Error', data.message || 'Failed to assign students');
      }
    } catch (error) {
      console.error('Error assigning students:', error);
      Alert.alert('Error', 'Network error. Please check your connection.');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleDeleteTest = async (testId: string) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this test? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('userToken');
              
              const response = await fetch(`http://192.168.29.148:5000/api/tests/${testId}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });

              const data = await response.json();
              
              if (data.success) {
                Alert.alert('Success', 'Test deleted successfully!');
                await fetchBatchTests();
              } else {
                Alert.alert('Error', data.message || 'Failed to delete test');
              }
            } catch (error) {
              console.error('Error deleting test:', error);
              Alert.alert('Error', 'Network error. Please check your connection.');
            }
          }
        }
      ]
    );
  };

  const handleStudentToggle = (studentId: string) => {
    setSelectedStudentsForAssignment(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };

  const handleSelectAllStudents = () => {
    if (selectedStudentsForAssignment.length === availableStudents.length) {
      setSelectedStudentsForAssignment([]);
    } else {
      setSelectedStudentsForAssignment(availableStudents.map(student => student._id));
    }
  };

  const renderTestCard = ({ item }: { item: Test }) => (
    <Animated.View 
      style={[
        styles.testCard,
        { opacity: contentOpacity, transform: [{ translateY: contentTranslateY }] }
      ]}
    >
      <View style={styles.testCardHeader}>
        <View style={styles.testInfo}>
          <Text style={styles.testTitle}>{item.testTitle}</Text>
          <Text style={styles.testSubtitle}>
            Full Marks: {item.fullMarks} • {item.assignedStudents.length} Students Assigned
          </Text>
          <Text style={styles.testDate}>
            Created: {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.testActions}>
          <TouchableOpacity
            style={styles.assignButton}
            onPress={() => handleAssignStudents(item)}
          >
            <MaterialIcons name="group-add" size={20} color={BRAND.primaryColor} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteTest(item._id)}
          >
            <MaterialIcons name="delete" size={20} color="#ff6b6b" />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.testStats}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Assigned</Text>
          <Text style={styles.statValue}>{item.assignedStudents.length}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Submitted</Text>
          <Text style={styles.statValue}>
            {item.assignedStudents.filter(s => s.submittedAt).length}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Evaluated</Text>
          <Text style={styles.statValue}>
            {item.assignedStudents.filter(s => s.evaluatedAt).length}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Status</Text>
          <Text style={[styles.statValue, { color: item.isActive ? BRAND.primaryColor : '#ff6b6b' }]}>
            {item.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      {item.instructions && (
        <Text style={styles.testInstructions} numberOfLines={2}>
          {item.instructions}
        </Text>
      )}

      {item.assignedStudents.length === 0 && (
        <View style={styles.noStudentsAssigned}>
          <Text style={styles.noStudentsText}>No students assigned yet</Text>
          <TouchableOpacity
            style={styles.assignNowButton}
            onPress={() => handleAssignStudents(item)}
          >
            <Text style={styles.assignNowButtonText}>Assign Students</Text>
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );

  const renderCreateTestModal = () => (
    <Modal
      visible={showCreateModal}
      animationType="slide"
      transparent={false}
      onRequestClose={handleCloseCreateModal}
    >
      <SafeAreaView style={styles.modalContainer}>
        <KeyboardAvoidingView 
          style={styles.modalKeyboard}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleCloseCreateModal}
            >
              <MaterialIcons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Create Test</Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView 
            style={styles.formContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Test Title *</Text>
              <TextInput
                style={styles.textInput}
                value={testTitle}
                onChangeText={setTestTitle}
                placeholder="Enter test title"
                placeholderTextColor="#888"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Marks *</Text>
              <TextInput
                style={styles.textInput}
                value={fullMarks}
                onChangeText={setFullMarks}
                placeholder="Enter full marks"
                placeholderTextColor="#888"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Instructions</Text>
              <TextInput
                style={[styles.textInput, styles.multilineInput]}
                value={instructions}
                onChangeText={setInstructions}
                placeholder="Enter test instructions"
                placeholderTextColor="#888"
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Due Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.textInput}
                value={dueDate}
                onChangeText={setDueDate}
                placeholder="2024-12-31"
                placeholderTextColor="#888"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Question Paper (PDF)</Text>
              <TouchableOpacity
                style={[
                  styles.fileButton,
                  questionPdf && styles.fileButtonActive
                ]}
                onPress={() => handleFileUpload('question')}
              >
                <MaterialIcons 
                  name="attach-file" 
                  size={20} 
                  color={questionPdf ? BRAND.primaryColor : '#fff'} 
                />
                <Text style={[
                  styles.fileButtonText,
                  questionPdf && styles.fileButtonTextActive
                ]}>
                  {questionPdf ? questionPdf.name : 'Select Question Paper'}
                </Text>
                {questionPdf && (
                  <TouchableOpacity
                    style={styles.removeFileButton}
                    onPress={() => setQuestionPdf(null)}
                  >
                    <MaterialIcons name="close" size={16} color="#ff6b6b" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Answer Key (PDF)</Text>
              <TouchableOpacity
                style={[
                  styles.fileButton,
                  answerPdf && styles.fileButtonActive
                ]}
                onPress={() => handleFileUpload('answer')}
              >
                <MaterialIcons 
                  name="attach-file" 
                  size={20} 
                  color={answerPdf ? BRAND.primaryColor : '#fff'} 
                />
                <Text style={[
                  styles.fileButtonText,
                  answerPdf && styles.fileButtonTextActive
                ]}>
                  {answerPdf ? answerPdf.name : 'Select Answer Key'}
                </Text>
                {answerPdf && (
                  <TouchableOpacity
                    style={styles.removeFileButton}
                    onPress={() => setAnswerPdf(null)}
                  >
                    <MaterialIcons name="close" size={16} color="#ff6b6b" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.noteContainer}>
              <MaterialIcons name="info" size={16} color={BRAND.primaryColor} />
              <Text style={styles.noteText}>
                After creating the test, you can assign students by tapping the "Assign Students" button on the test card.
              </Text>
            </View>
          </ScrollView>

          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCloseCreateModal}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.createButton, isCreating && styles.disabledButton]}
              onPress={handleCreateTestSubmit}
              disabled={isCreating}
            >
              {isCreating ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Text style={styles.createButtonText}>Create Test</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );

  const renderAssignStudentsModal = () => (
    <Modal
      visible={showAssignStudentsModal}
      animationType="slide"
      transparent={false}
      onRequestClose={handleCloseAssignStudentsModal}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleCloseAssignStudentsModal}
          >
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>
            Assign Students to "{selectedTestForAssignment?.testTitle}"
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.selectAllContainer}>
          <TouchableOpacity
            style={styles.selectAllButton}
            onPress={handleSelectAllStudents}
          >
            <MaterialIcons 
              name={selectedStudentsForAssignment.length === availableStudents.length ? 'check-box' : 'check-box-outline-blank'} 
              size={20} 
              color={BRAND.primaryColor} 
            />
            <Text style={styles.selectAllText}>
              {selectedStudentsForAssignment.length === availableStudents.length ? 'Deselect All' : 'Select All'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.studentListContainer}>
          {availableStudents.map((student) => (
            <TouchableOpacity
              key={student._id}
              style={[
                styles.studentItem,
                selectedStudentsForAssignment.includes(student._id) && styles.selectedStudentItem
              ]}
              onPress={() => handleStudentToggle(student._id)}
            >
              <View style={styles.studentCheckbox}>
                <MaterialIcons 
                  name={selectedStudentsForAssignment.includes(student._id) ? 'check-circle' : 'radio-button-unchecked'} 
                  size={20} 
                  color={selectedStudentsForAssignment.includes(student._id) ? BRAND.primaryColor : '#666'} 
                />
              </View>
              <View style={styles.studentInfo}>
                <Text style={styles.studentName}>{student.name}</Text>
                <Text style={styles.studentEmail}>{student.email}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.actionContainer}>
          <Text style={styles.selectedCount}>
            {selectedStudentsForAssignment.length} of {availableStudents.length} selected
          </Text>
          <TouchableOpacity
            style={[styles.assignButton, isAssigning && styles.disabledButton]}
            onPress={handleAssignStudentsSubmit}
            disabled={isAssigning}
          >
            {isAssigning ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Text style={styles.assignButtonText}>
                {selectedStudentsForAssignment.length === 0 ? 'Unassign All' : 'Assign Students'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );

  const renderEmptyTests = () => (
    <Animated.View 
      style={[
        styles.emptyState,
        { opacity: fadeAnim }
      ]}
    >
      <MaterialIcons name="quiz" size={64} color="#333" />
      <Text style={styles.emptyStateTitle}>No Tests Created</Text>
      <Text style={styles.emptyStateDescription}>
        Create your first test and then assign students to it.
      </Text>
      <TouchableOpacity
        style={styles.createTestButton}
        onPress={handleCreateTest}
      >
        <MaterialIcons name="add" size={20} color={BRAND.backgroundColor} />
        <Text style={styles.createTestButtonText}>Create Test</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={BRAND.backgroundColor} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BRAND.primaryColor} />
          <Text style={styles.loadingText}>Loading tests...</Text>
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
            { opacity: Animated.multiply(glowOpacity, 0.06) }]} 
        />
      </View>

      {/* Header */}
      <Animated.View 
        style={[
          styles.header,
          {
            opacity: headerOpacity,
            transform: [{ translateY: headerTranslateY }]
          }
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Tests</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleCreateTest}
        >
          <MaterialIcons name="add" size={24} color={BRAND.primaryColor} />
        </TouchableOpacity>
      </Animated.View>

      {/* Content */}
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: contentOpacity,
            transform: [{ translateY: contentTranslateY }]
          }
        ]}
      >
        {tests.length === 0 ? (
          renderEmptyTests()
        ) : (
          <FlatList
            data={tests}
            renderItem={renderTestCard}
            keyExtractor={(item) => item._id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[BRAND.primaryColor]}
                tintColor={BRAND.primaryColor}
              />
            }
          />
        )}
      </Animated.View>

      {/* Floating Action Button */}
      <Animated.View
        style={[
          styles.fabContainer,
          { opacity: fadeAnim }
        ]}
      >
        <TouchableOpacity
          style={styles.fab}
          onPress={handleCreateTest}
        >
          <MaterialIcons name="add" size={28} color={BRAND.backgroundColor} />
        </TouchableOpacity>
      </Animated.View>

      {/* Modals */}
      {renderCreateTestModal()}
      {renderAssignStudentsModal()}
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
    zIndex: 0,
  },
  glowCircle: {
    position: 'absolute',
    borderRadius: 1000,
    backgroundColor: BRAND.primaryColor,
  },
  glowCircle1: {
    width: 300,
    height: 300,
    top: -150,
    left: -150,
  },
  glowCircle2: {
    width: 200,
    height: 200,
    bottom: -100,
    right: -100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    zIndex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BRAND.accentColor,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BRAND.accentColor,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    zIndex: 1,
  },
  listContainer: {
    padding: 20,
  },
  testCard: {
    backgroundColor: BRAND.accentColor,
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.1)',
  },
  testCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  testInfo: {
    flex: 1,
  },
  testTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  testSubtitle: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 3,
  },
  testDate: {
    color: '#888',
    fontSize: 12,
  },
  testActions: {
    flexDirection: 'row',
    gap: 10,
  },
  assignButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BRAND.primaryColor,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ff6b6b',
  },
  testStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 2,
  },
  statValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  testInstructions: {
    color: '#ccc',
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 10,
  },
  noStudentsAssigned: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ff6b6b',
  },
  noStudentsText: {
    color: '#ff6b6b',
    fontSize: 14,
    marginBottom: 10,
  },
  assignNowButton: {
    backgroundColor: BRAND.primaryColor,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
  },
  assignNowButtonText: {
    color: BRAND.backgroundColor,
    fontSize: 12,
    fontWeight: 'bold',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    zIndex: 2,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: BRAND.primaryColor,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: BRAND.primaryColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyStateDescription: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  createTestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND.primaryColor,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  createTestButtonText: {
    color: BRAND.backgroundColor,
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: BRAND.backgroundColor,
  },
  modalKeyboard: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  formContainer: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: BRAND.accentColor,
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  fileButton: {
    backgroundColor: BRAND.accentColor,
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  fileButtonActive: {
    borderColor: BRAND.primaryColor,
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
  },
  fileButtonText: {
    color: '#fff',
    fontSize: 16,
    flex: 1,
  },
  fileButtonTextActive: {
    color: BRAND.primaryColor,
  },
  removeFileButton: {
    padding: 2,
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.3)',
    gap: 10,
  },
  noteText: {
    color: '#ccc',
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#666',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: BRAND.primaryColor,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 120,
    alignItems: 'center',
  },
  createButtonText: {
    color: BRAND.backgroundColor,
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.6,
  },
  // Student Assignment Modal Styles
  selectAllContainer: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  selectAllText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  studentListContainer: {
    flex: 1,
    padding: 20,
  },
  studentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND.accentColor,
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  selectedStudentItem: {
    borderColor: BRAND.primaryColor,
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
  },
  studentCheckbox: {
    marginRight: 15,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  studentEmail: {
    color: '#ccc',
    fontSize: 14,
  },
  selectedCount: {
    color: '#ccc',
    fontSize: 14,
  },
  assignButtonText: {
    color: BRAND.backgroundColor,
    fontSize: 16,
    fontWeight: 'bold',
  },
});