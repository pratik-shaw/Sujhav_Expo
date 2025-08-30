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
import { Picker } from '@react-native-picker/picker';

type TeacherHandleTestNavigationProp = NativeStackNavigationProp<RootStackParamList>;
type TeacherHandleTestRouteProp = {
  key: string;
  name: string;
  params: {
    batchId: string;
    subjectName: string; // Added required subject parameter
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

// Updated Test interface to match backend
interface Test {
  _id: string;
  testTitle: string;
  fullMarks: number;
  className: string;
  subjectName: string;
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
  hasQuestionPdf?: boolean;
  hasAnswerPdf?: boolean;
}

// Student interface
interface Student {
  _id: string;
  name: string;
  email: string;
}

interface BatchInfo {
  _id: string;
  batchName: string;
  category: string;
  classes: string[];
  subjects: {
    name: string;
    teacher: {
      _id: string;
      name: string;
      email: string;
    };
  }[];
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
  const { batchId, subjectName } = route.params;

  // State management
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tests, setTests] = useState<Test[]>([]);
  const [batchInfo, setBatchInfo] = useState<BatchInfo | null>(null);
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
  const [selectedClass, setSelectedClass] = useState('');
  const [instructions, setInstructions] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [questionPdf, setQuestionPdf] = useState<FileUpload | null>(null);
  const [answerPdf, setAnswerPdf] = useState<FileUpload | null>(null);
  const [isActive, setIsActive] = useState(true);

const [availableSubjects, setAvailableSubjects] = useState<{name: string}[]>([]);
const [selectedSubject, setSelectedSubject] = useState('');

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
  }, [batchId, subjectName]);

  const loadData = async () => {
    setIsLoading(true);
    await Promise.all([
      fetchBatchInfo(),
      fetchBatchSubjectTests()
    ]);
    setIsLoading(false);
  };

  const fetchBatchInfo = async () => {
  try {
    const token = await AsyncStorage.getItem('userToken');
    if (!token) {
      Alert.alert('Error', 'No authentication token found');
      return;
    }

    // Fetch teacher's subjects for this batch
    const response = await fetch(`${API_BASE_URL}/tests/teacher/batch/${batchId}/subjects`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    if (data.success) {
      setBatchInfo(data.data.batch);
      setAvailableSubjects(data.data.subjects);
      
      // If there's only one subject, auto-select it
      if (data.data.subjects.length === 1) {
        setSelectedSubject(data.data.subjects[0].name);
      }
    } else {
      Alert.alert('Error', data.message || 'Failed to fetch batch info');
    }
  } catch (error) {
    console.error('Error fetching batch info:', error);
    Alert.alert('Error', 'Network error. Please check your connection.');
  }
};

  const fetchBatchSubjectTests = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        Alert.alert('Error', 'No authentication token found');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/tests/teacher/batch/${batchId}/subject/${subjectName}`, {
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

  const fetchAvailableStudents = async (className: string) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/tests/teacher/batch/${batchId}/class/${className}/subject/${subjectName}/students`, {
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
    setSelectedClass(test.className);
    setInstructions(test.instructions || '');
    setDueDate(test.dueDate ? new Date(test.dueDate).toISOString().split('T')[0] : '');
    setIsActive(test.isActive);
    setQuestionPdf(null);
    setAnswerPdf(null);
  };

  const resetForm = () => {
  setTestTitle('');
  setFullMarks('');
  setSelectedClass('');
  setSelectedSubject(availableSubjects.length === 1 ? availableSubjects[0].name : '');
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

  const handleAssignStudents = async (test: Test) => {
    setSelectedTestForAssignment(test);
    await fetchAvailableStudents(test.className);
    setSelectedStudentsForAssignment(test.assignedStudents.map(as => as.student._id));
    setShowAssignStudentsModal(true);
  };

  const handleCloseAssignStudentsModal = () => {
    setSelectedTestForAssignment(null);
    setSelectedStudentsForAssignment([]);
    setAvailableStudents([]);
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

  if (!selectedClass.trim()) {
    Alert.alert('Validation Error', 'Please select a class');
    return false;
  }

  if (!selectedSubject.trim()) {
    Alert.alert('Validation Error', 'Please select a subject');
    return false;
  }

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
    formData.append('className', selectedClass);
    formData.append('subjectName', selectedSubject); // Use selectedSubject instead of subjectName from params
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

    const response = await fetch(`${API_BASE_URL}/tests/teacher/`, {
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
            fetchBatchSubjectTests();
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
      formData.append('className', selectedClass);
      formData.append('subjectName', subjectName);
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

      const response = await fetch(`${API_BASE_URL}/tests/teacher/${selectedTestForEdit._id}`, {
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
              fetchBatchSubjectTests();
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

      const response = await fetch(`${API_BASE_URL}/tests/teacher/${selectedTestForAssignment._id}`, {
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
              fetchBatchSubjectTests();
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
              
              const response = await fetch(`${API_BASE_URL}/tests/teacher/${testId}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });

              const data = await response.json();
              
              if (data.success) {
                Alert.alert('Success', 'Test deleted successfully!');
                await fetchBatchSubjectTests();
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

  const handleClassSelectionChange = async (className: string) => {
    setSelectedClass(className);
    if (className && showAssignStudentsModal && selectedTestForAssignment) {
      await fetchAvailableStudents(className);
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
            Full Marks: {item.fullMarks} • Class: {item.className}
          </Text>
          <Text style={styles.testSubtitle}>
            {item.assignedStudents.length} Students Assigned
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

      <View style={styles.testFiles}>
        {item.hasQuestionPdf && (
          <View style={styles.fileIndicator}>
            <MaterialIcons name="description" size={16} color={BRAND.primaryColor} />
            <Text style={styles.fileIndicatorText}>Question PDF</Text>
          </View>
        )}
        {item.hasAnswerPdf && (
          <View style={styles.fileIndicator}>
            <MaterialIcons name="key" size={16} color={BRAND.primaryColor} />
            <Text style={styles.fileIndicatorText}>Answer Key</Text>
          </View>
        )}
      </View>

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
  <Text style={styles.inputLabel}>Subject *</Text>
  <View style={styles.pickerContainer}>
    <Picker
      selectedValue={selectedSubject}
      style={styles.picker}
      onValueChange={setSelectedSubject}
      dropdownIconColor="#fff"
    >
      <Picker.Item label="Select a subject" value="" />
      {availableSubjects.map((subject) => (
        <Picker.Item
          key={subject.name}
          label={subject.name}
          value={subject.name}
        />
      ))}
    </Picker>
  </View>
</View>

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
              <Text style={styles.inputLabel}>Class *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedClass}
                  style={styles.picker}
                  onValueChange={(itemValue: string) => handleClassSelectionChange(itemValue)}
                  dropdownIconColor="#fff"
                >
                  <Picker.Item label="Select a class" value="" />
                  {batchInfo?.classes.map((className) => (
                    <Picker.Item
                      key={className}
                      label={className}
                      value={className}
                    />
                  ))}
                </Picker>
              </View>
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
                  ]}>Active</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.statusButton,
                    !isActive && styles.statusButtonActive
                  ]}
                  onPress={() => setIsActive(false)}
                >
                  <Text style={[
                    styles.statusButtonText,
                    !isActive && styles.statusButtonTextActive
                  ]}>Inactive</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.fileSection}>
              <Text style={styles.sectionTitle}>Files</Text>
              
              <View style={styles.fileGroup}>
                <Text style={styles.inputLabel}>Question PDF</Text>
                <TouchableOpacity
                  style={styles.fileUploadButton}
                  onPress={() => handleFileUpload('question')}
                >
                  <MaterialIcons name="upload-file" size={24} color={BRAND.primaryColor} />
                  <Text style={styles.fileUploadText}>
                    {questionPdf ? questionPdf.name : 'Upload Question PDF'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.fileGroup}>
                <Text style={styles.inputLabel}>Answer PDF</Text>
                <TouchableOpacity
                  style={styles.fileUploadButton}
                  onPress={() => handleFileUpload('answer')}
                >
                  <MaterialIcons name="upload-file" size={24} color={BRAND.primaryColor} />
                  <Text style={styles.fileUploadText}>
                    {answerPdf ? answerPdf.name : 'Upload Answer PDF'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.submitButton,
                (isCreating || isEditing) && styles.submitButtonDisabled
              ]}
              onPress={isEdit ? handleEditTestSubmit : handleCreateTestSubmit}
              disabled={isCreating || isEditing}
            >
              {(isCreating || isEditing) ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {isEdit ? 'Update Test' : 'Create Test'}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
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

        {selectedTestForAssignment && (
          <View style={styles.testInfoBanner}>
            <Text style={styles.testInfoTitle}>{selectedTestForAssignment.testTitle}</Text>
            <Text style={styles.testInfoDetails}>
              Class: {selectedTestForAssignment.className} • Full Marks: {selectedTestForAssignment.fullMarks}
            </Text>
          </View>
        )}

        <View style={styles.studentListContainer}>
          <View style={styles.studentListHeader}>
            <Text style={styles.studentListTitle}>
              Available Students ({availableStudents.length})
            </Text>
            <TouchableOpacity
              style={styles.selectAllButton}
              onPress={handleSelectAllStudents}
            >
              <Text style={styles.selectAllButtonText}>
                {selectedStudentsForAssignment.length === availableStudents.length ? 'Deselect All' : 'Select All'}
              </Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={availableStudents}
            keyExtractor={(item) => item._id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.studentItem}
                onPress={() => handleStudentToggle(item._id)}
              >
                <View style={styles.studentInfo}>
                  <Text style={styles.studentName}>{item.name}</Text>
                  <Text style={styles.studentEmail}>{item.email}</Text>
                </View>
                <View style={[
                  styles.checkbox,
                  selectedStudentsForAssignment.includes(item._id) && styles.checkboxSelected
                ]}>
                  {selectedStudentsForAssignment.includes(item._id) && (
                    <MaterialIcons name="check" size={16} color="#000" />
                  )}
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyStudentList}>
                <MaterialIcons name="school" size={48} color="#666" />
                <Text style={styles.emptyStudentText}>No students available for this class</Text>
              </View>
            }
          />

          <View style={styles.assignButtonContainer}>
            <Text style={styles.selectedCount}>
              {selectedStudentsForAssignment.length} students selected
            </Text>
            <TouchableOpacity
              style={[
                styles.assignSubmitButton,
                isAssigning && styles.assignSubmitButtonDisabled
              ]}
              onPress={handleAssignStudentsSubmit}
              disabled={isAssigning}
            >
              {isAssigning ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Text style={styles.assignSubmitButtonText}>Assign Students</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor={BRAND.backgroundColor} />
        <ActivityIndicator size="large" color={BRAND.primaryColor} />
        <Text style={styles.loadingText}>Loading tests...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND.backgroundColor} />
      
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
            transform: [{ translateY: headerTranslateY }]
          }
        ]}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Tests Management</Text>
          <Text style={styles.headerSubtitle}>
            {batchInfo?.batchName} • {subjectName}
          </Text>
        </View>

        <TouchableOpacity 
          style={styles.createButton}
          onPress={handleCreateTest}
        >
          <MaterialIcons name="add" size={24} color="#000" />
        </TouchableOpacity>
      </Animated.View>

      {/* Content */}
      <Animated.View 
        style={[
          styles.content,
          { opacity: fadeAnim }
        ]}
      >
        <FlatList
          data={tests}
          keyExtractor={(item) => item._id}
          renderItem={renderTestCard}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[BRAND.primaryColor]}
              tintColor={BRAND.primaryColor}
            />
          }
          ListEmptyComponent={
            <Animated.View 
              style={[
                styles.emptyState,
                { opacity: contentOpacity, transform: [{ translateY: contentTranslateY }] }
              ]}
            >
              <MaterialIcons name="quiz" size={80} color="#666" />
              <Text style={styles.emptyStateTitle}>No Tests Created</Text>
              <Text style={styles.emptyStateText}>
                Create your first test for this subject to get started
              </Text>
              <TouchableOpacity 
                style={styles.emptyStateButton}
                onPress={handleCreateTest}
              >
                <MaterialIcons name="add" size={20} color="#000" />
                <Text style={styles.emptyStateButtonText}>Create Test</Text>
              </TouchableOpacity>
            </Animated.View>
          }
          contentContainerStyle={tests.length === 0 ? styles.emptyContentContainer : styles.contentContainer}
        />
      </Animated.View>

      {/* Modals */}
      {renderTestModal(false)}
      {renderTestModal(true)}
      {renderAssignStudentsModal()}
    </View>
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
    backgroundColor: BRAND.backgroundColor,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },
  backgroundGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.4,
    backgroundColor: BRAND.primaryColor,
    opacity: 0.1,
    borderRadius: height * 0.2,
    transform: [{ scaleX: 2 }],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 4,
  },
  createButton: {
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
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  emptyContentContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  testCard: {
    backgroundColor: BRAND.accentColor,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  testCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  testInfo: {
    flex: 1,
    marginRight: 12,
  },
  testTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  testSubtitle: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 2,
  },
  testDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  testActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,165,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  assignButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `rgba(0,255,136,0.2)`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,107,107,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  testStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  testInstructions: {
    fontSize: 14,
    color: '#ccc',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  testFiles: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  fileIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,255,136,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  fileIndicatorText: {
    fontSize: 12,
    color: BRAND.primaryColor,
  },
  noStudentsAssigned: {
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    marginTop: 8,
  },
  noStudentsText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 8,
  },
  assignNowButton: {
    backgroundColor: BRAND.primaryColor,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  assignNowButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 40,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND.primaryColor,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  emptyStateButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
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
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
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
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: BRAND.accentColor,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#fff',
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  readOnlyInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: 12,
  },
  readOnlyInputText: {
    fontSize: 16,
    color: '#ccc',
  },
  pickerContainer: {
    backgroundColor: BRAND.accentColor,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    color: '#fff',
    backgroundColor: 'transparent',
  },
  statusContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statusButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
  },
  statusButtonActive: {
    borderColor: BRAND.primaryColor,
    backgroundColor: `rgba(0,255,136,0.2)`,
  },
  statusButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ccc',
  },
  statusButtonTextActive: {
    color: BRAND.primaryColor,
  },
  fileSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  fileGroup: {
    marginBottom: 16,
  },
  fileUploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND.accentColor,
    borderWidth: 2,
    borderColor: 'rgba(0,255,136,0.3)',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 16,
    gap: 12,
  },
  fileUploadText: {
    fontSize: 16,
    color: '#fff',
    flex: 1,
  },
  submitButton: {
    backgroundColor: BRAND.primaryColor,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  // Assign Students Modal Styles
  testInfoBanner: {
    backgroundColor: BRAND.accentColor,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  testInfoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  testInfoDetails: {
    fontSize: 14,
    color: '#ccc',
  },
  studentListContainer: {
    flex: 1,
    padding: 20,
  },
  studentListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  studentListTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  selectAllButton: {
    backgroundColor: 'rgba(0,255,136,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  selectAllButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: BRAND.primaryColor,
  },
  studentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: BRAND.accentColor,
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  studentInfo: {
    flex: 1,
    marginRight: 12,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  studentEmail: {
    fontSize: 14,
    color: '#ccc',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: BRAND.primaryColor,
    borderColor: BRAND.primaryColor,
  },
  emptyStudentList: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStudentText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
  assignButtonContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 16,
    marginTop: 16,
  },
  selectedCount: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 12,
  },
  assignSubmitButton: {
    backgroundColor: BRAND.primaryColor,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  assignSubmitButtonDisabled: {
    opacity: 0.6,
  },
  assignSubmitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
});