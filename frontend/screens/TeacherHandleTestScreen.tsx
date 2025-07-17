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
import { API_BASE } from '../config/api';

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

const API_BASE_URL = API_BASE;


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
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignStudentsModal, setShowAssignStudentsModal] = useState(false);
  const [selectedTestForAssignment, setSelectedTestForAssignment] = useState<Test | null>(null);
  const [selectedTestForEdit, setSelectedTestForEdit] = useState<Test | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  // Create test form state
  const [testTitle, setTestTitle] = useState('');
  const [fullMarks, setFullMarks] = useState('');
  const [instructions, setInstructions] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [questionPdf, setQuestionPdf] = useState<FileUpload | null>(null);
  const [answerPdf, setAnswerPdf] = useState<FileUpload | null>(null);
  const [isActive, setIsActive] = useState(true);

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

      const response = await fetch(`${API_BASE_URL}/tests/batch/${batchId}`, {
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

      const response = await fetch(`${API_BASE_URL}/tests/batch/${batchId}/available-students`, {
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
    resetForm();
    setShowCreateModal(true);
  };

  const handleEditTest = (test: Test) => {
    setSelectedTestForEdit(test);
    populateFormWithTestData(test);
    setShowEditModal(true);
  };

  const populateFormWithTestData = (test: Test) => {
    setTestTitle(test.testTitle);
    setFullMarks(test.fullMarks.toString());
    setInstructions(test.instructions || '');
    setDueDate(test.dueDate ? new Date(test.dueDate).toISOString().split('T')[0] : '');
    setIsActive(test.isActive);
    // Note: We can't populate file uploads as they're not returned from the API
    setQuestionPdf(null);
    setAnswerPdf(null);
  };

  const resetForm = () => {
    setTestTitle('');
    setFullMarks('');
    setInstructions('');
    setDueDate('');
    setQuestionPdf(null);
    setAnswerPdf(null);
    setIsActive(true);
  };

  const handleCloseCreateModal = () => {
    resetForm();
    setShowCreateModal(false);
  };

  const handleCloseEditModal = () => {
    resetForm();
    setSelectedTestForEdit(null);
    setShowEditModal(false);
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

  const validateForm = () => {
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
    if (!validateForm()) return;

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
      formData.append('assignedStudents', JSON.stringify([]));
      formData.append('isActive', isActive.toString());
      
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

      const response = await fetch(`${API_BASE_URL}/tests`, {
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

  const handleEditTestSubmit = async () => {
    if (!validateForm() || !selectedTestForEdit) return;

    setIsEditing(true);

    try {
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        Alert.alert('Error', 'No authentication token found');
        setIsEditing(false);
        return;
      }

      const formData = new FormData();
      formData.append('testTitle', testTitle.trim());
      formData.append('fullMarks', fullMarks.trim());
      formData.append('isActive', isActive.toString());
      
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

      const response = await fetch(`${API_BASE_URL}/tests/${selectedTestForEdit._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        Alert.alert('Success', 'Test updated successfully!', [
          {
            text: 'OK',
            onPress: () => {
              handleCloseEditModal();
              fetchBatchTests();
            }
          }
        ]);
      } else {
        Alert.alert('Error', data.message || 'Failed to update test');
      }
    } catch (error) {
      console.error('Error updating test:', error);
      Alert.alert('Error', 'Network error. Please check your connection.');
    } finally {
      setIsEditing(false);
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

      const response = await fetch(`${API_BASE_URL}/tests/${selectedTestForAssignment._id}/assign-students`, {
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
              
              const response = await fetch(`${API_BASE_URL}/tests/${testId}`, {
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
            style={styles.editButton}
            onPress={() => handleEditTest(item)}
          >
            <MaterialIcons name="edit" size={20} color="#ffa500" />
          </TouchableOpacity>
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

  const renderTestModal = (isEdit: boolean) => (
    <Modal
      visible={isEdit ? showEditModal : showCreateModal}
      animationType="slide"
      transparent={false}
      onRequestClose={isEdit ? handleCloseEditModal : handleCloseCreateModal}
    >
      <SafeAreaView style={styles.modalContainer}>
        <KeyboardAvoidingView 
          style={styles.modalKeyboard}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={isEdit ? handleCloseEditModal : handleCloseCreateModal}
            >
              <MaterialIcons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {isEdit ? 'Edit Test' : 'Create Test'}
            </Text>
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
              <Text style={styles.inputLabel}>Test Status</Text>
              <View style={styles.statusContainer}>
                <TouchableOpacity
                  style={[
                    styles.statusButton,
                    isActive && styles.statusButtonActive
                  ]}
                  onPress={() => setIsActive(true)}
                >
                  <Text style={[
                    styles.statusButtonText,
                    isActive && styles.statusButtonTextActive
                  ]}>
                    Active
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.statusButton,
                    !isActive && styles.statusButtonInactive
                  ]}
                  onPress={() => setIsActive(false)}
                >
                  <Text style={[
                    styles.statusButtonText,
                    !isActive && styles.statusButtonTextInactive
                  ]}>
                    Inactive
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Question Paper (PDF) {isEdit && '(Leave empty to keep existing)'}
              </Text>
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
              <Text style={styles.inputLabel}>
                Answer Key (PDF) {isEdit && '(Leave empty to keep existing)'}
              </Text>
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
                {isEdit 
                  ? 'Leave PDF fields empty to keep existing files. Only upload new files if you want to replace them.'
                  : 'After creating the test, you can assign students by tapping the "Assign Students" button on the test card.'
                }
              </Text>
            </View>
          </ScrollView>

          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={isEdit ? handleCloseEditModal : handleCloseCreateModal}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.createButton,
                (isEdit ? isEditing : isCreating) && styles.disabledButton
              ]}
              onPress={isEdit ? handleEditTestSubmit : handleCreateTestSubmit}
              disabled={isEdit ? isEditing : isCreating}
            >
              {(isEdit ? isEditing : isCreating) ? (
                <ActivityIndicator size="small" color="#000" />
                ) : (
                <Text style={styles.createButtonText}>
                  {isEdit ? 'Update Test' : 'Create Test'}
                </Text>
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
          <Text style={styles.modalTitle}>Assign Students</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.assignStudentsContainer}>
          <View style={styles.assignStudentsHeader}>
            <Text style={styles.assignStudentsTitle}>
              {selectedTestForAssignment?.testTitle}
            </Text>
            <Text style={styles.assignStudentsSubtitle}>
              Select students to assign this test
            </Text>
          </View>

          <View style={styles.selectAllContainer}>
            <TouchableOpacity
              style={styles.selectAllButton}
              onPress={handleSelectAllStudents}
            >
              <MaterialIcons 
                name={selectedStudentsForAssignment.length === availableStudents.length ? "check-box" : "check-box-outline-blank"} 
                size={24} 
                color={BRAND.primaryColor} 
              />
              <Text style={styles.selectAllText}>
                {selectedStudentsForAssignment.length === availableStudents.length ? 'Deselect All' : 'Select All'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.selectedCount}>
              {selectedStudentsForAssignment.length} of {availableStudents.length} selected
            </Text>
          </View>

          <FlatList
            data={availableStudents}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.studentItem,
                  selectedStudentsForAssignment.includes(item._id) && styles.studentItemSelected
                ]}
                onPress={() => handleStudentToggle(item._id)}
              >
                <View style={styles.studentInfo}>
                  <Text style={styles.studentName}>{item.name}</Text>
                  <Text style={styles.studentEmail}>{item.email}</Text>
                </View>
                <MaterialIcons
                  name={selectedStudentsForAssignment.includes(item._id) ? "check-box" : "check-box-outline-blank"}
                  size={24}
                  color={selectedStudentsForAssignment.includes(item._id) ? BRAND.primaryColor : '#666'}
                />
              </TouchableOpacity>
            )}
            showsVerticalScrollIndicator={false}
            style={styles.studentsList}
          />

          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCloseAssignStudentsModal}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.createButton, isAssigning && styles.disabledButton]}
              onPress={handleAssignStudentsSubmit}
              disabled={isAssigning}
            >
              {isAssigning ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Text style={styles.createButtonText}>
                  Assign Students ({selectedStudentsForAssignment.length})
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );

  const renderEmptyState = () => (
    <Animated.View 
      style={[
        styles.emptyState,
        { opacity: contentOpacity, transform: [{ translateY: contentTranslateY }] }
      ]}
    >
      <MaterialIcons name="assignment" size={80} color="#333" />
      <Text style={styles.emptyStateTitle}>No Tests Created</Text>
      <Text style={styles.emptyStateSubtitle}>
        Create your first test to get started with assessments
      </Text>
      <TouchableOpacity
        style={styles.createFirstTestButton}
        onPress={handleCreateTest}
      >
        <MaterialIcons name="add" size={24} color="#000" />
        <Text style={styles.createFirstTestButtonText}>Create First Test</Text>
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
      
      {/* Animated background glow */}
      <Animated.View style={[ { opacity: glowOpacity }]} />

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
          <Text style={styles.headerTitle}>Test Management</Text>
          <Text style={styles.headerSubtitle}>
            {tests.length} test{tests.length !== 1 ? 's' : ''} created
          </Text>
        </View>
        <TouchableOpacity
          style={styles.createTestButton}
          onPress={handleCreateTest}
        >
          <MaterialIcons name="add" size={24} color="#000" />
        </TouchableOpacity>
      </Animated.View>

      {/* Content */}
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {tests.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={tests}
            keyExtractor={(item) => item._id}
            renderItem={renderTestCard}
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
      {renderTestModal(false)}
      {renderTestModal(true)}
      {renderAssignStudentsModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND.backgroundColor,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#ccc',
    fontSize: 14,
    marginTop: 2,
  },
  createTestButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BRAND.primaryColor,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  listContent: {
    padding: 20,
  },
  testCard: {
    backgroundColor: BRAND.accentColor,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  testCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  testInfo: {
    flex: 1,
  },
  testTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  testSubtitle: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 4,
  },
  testDate: {
    color: '#999',
    fontSize: 12,
  },
  testActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 165, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  assignButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `rgba(${parseInt(BRAND.primaryColor.slice(1, 3), 16)}, ${parseInt(BRAND.primaryColor.slice(3, 5), 16)}, ${parseInt(BRAND.primaryColor.slice(5, 7), 16)}, 0.2)`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  testStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    color: '#999',
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  testInstructions: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  noStudentsAssigned: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  noStudentsText: {
    color: '#ff6b6b',
    fontSize: 14,
    marginBottom: 8,
  },
  assignNowButton: {
    backgroundColor: BRAND.primaryColor,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  assignNowButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  createFirstTestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND.primaryColor,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  createFirstTestButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Modal styles
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
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
    fontWeight: 'bold',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: BRAND.accentColor,
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  statusContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statusButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: BRAND.accentColor,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  statusButtonActive: {
    backgroundColor: BRAND.primaryColor,
    borderColor: BRAND.primaryColor,
  },
  statusButtonInactive: {
    backgroundColor: '#ff6b6b',
    borderColor: '#ff6b6b',
  },
  statusButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusButtonTextActive: {
    color: '#000',
  },
  statusButtonTextInactive: {
    color: '#fff',
  },
  fileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND.accentColor,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
    gap: 12,
  },
  fileButtonActive: {
    borderColor: BRAND.primaryColor,
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
  },
  fileButtonText: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  fileButtonTextActive: {
    color: BRAND.primaryColor,
  },
  removeFileButton: {
    padding: 4,
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  noteText: {
    flex: 1,
    color: BRAND.primaryColor,
    fontSize: 14,
    lineHeight: 20,
  },
  actionContainer: {
    flexDirection: 'row',
    gap: 16,
    padding: 20,
    paddingTop: 0,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  createButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: BRAND.primaryColor,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.6,
  },
  // Assign Students Modal styles
  assignStudentsContainer: {
    flex: 1,
  },
  assignStudentsHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  assignStudentsTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  assignStudentsSubtitle: {
    color: '#ccc',
    fontSize: 14,
  },
  selectAllContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectAllText: {
    color: BRAND.primaryColor,
    fontSize: 16,
    fontWeight: 'bold',
  },
  selectedCount: {
    color: '#ccc',
    fontSize: 14,
  },
  studentsList: {
    flex: 1,
  },
  studentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  studentItemSelected: {
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  studentEmail: {
    color: '#ccc',
    fontSize: 14,
  },
});
