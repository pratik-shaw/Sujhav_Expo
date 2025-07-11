import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Modal,
  FlatList,
  Platform,
  RefreshControl,
} from 'react-native';
import { API_BASE } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Brand configuration
const BRAND = {
  name: "SUJHAV",
  primaryColor: '#00ff88',
  secondaryColor: '#000000',
  backgroundColor: '#0a1a0a',
  accentColor: '#1a2e1a',
  errorColor: '#ff6b6b',
  warningColor: '#ffa726',
  goldColor: '#ffd700',
};

// API configuration
const API_BASE_URL = API_BASE;

// Types
interface User {
  _id: string;
  name: string;
  email: string;
  role: 'student' | 'teacher';
  createdAt?: string;
}

interface Batch {
  _id?: string;
  batchName: string;
  classes: string[];
  category: 'jee' | 'neet' | 'boards';
  students: User[];
  teachers: User[];
  schedule: string;
  description: string;
  isActive: boolean;
  createdBy?: User;
  createdAt?: string;
  updatedAt?: string;
}

interface BatchForm {
  batchName: string;
  classes: string[];
  category: 'jee' | 'neet' | 'boards';
  students: string[];
  teachers: string[];
  schedule: string;
  description: string;
  isActive: boolean;
}

interface AdminCreateBatchesScreenProps {
  navigation?: any;
  onBack?: () => void;
}

export default function AdminCreateBatchesScreen({ 
  navigation, 
  onBack 
}: AdminCreateBatchesScreenProps) {
  // State
  const [batches, setBatches] = useState<Batch[]>([]);
  const [eligibleStudents, setEligibleStudents] = useState<User[]>([]);
  const [eligibleTeachers, setEligibleTeachers] = useState<User[]>([]);
  const [availableStudents, setAvailableStudents] = useState<User[]>([]);
  const [availableTeachers, setAvailableTeachers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStudentSelector, setShowStudentSelector] = useState(false);
  const [showTeacherSelector, setShowTeacherSelector] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [assigningBatch, setAssigningBatch] = useState<Batch | null>(null);
  const [classInput, setClassInput] = useState('');
  const [selectedAssignStudents, setSelectedAssignStudents] = useState<string[]>([]);
  const [selectedAssignTeachers, setSelectedAssignTeachers] = useState<string[]>([]);

  // Form state
  const [batchForm, setBatchForm] = useState<BatchForm>({
    batchName: '',
    classes: [],
    category: 'jee',
    students: [],
    teachers: [],
    schedule: '',
    description: '',
    isActive: true,
  });

  // Load data on mount
  useEffect(() => {
    loadBatches();
    loadEligibleUsers();
  }, []);

  // Handle back navigation
  const handleBackPress = () => {
    if (onBack) {
      onBack();
    } else if (navigation) {
      if (navigation.goBack) {
        navigation.goBack();
      } else if (navigation.navigate) {
        navigation.navigate('AdminDashboard');
      }
    }
  };

  // Fixed getAuthHeaders function
  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    try {
      // Try different possible token keys
      let token = await AsyncStorage.getItem('authToken') || 
                  await AsyncStorage.getItem('token') || 
                  await AsyncStorage.getItem('userToken') ||
                  await AsyncStorage.getItem('accessToken');
      
      console.log('Using token:', token ? 'Token found' : 'No token found');
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      return headers;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return {
        'Content-Type': 'application/json',
      };
    }
  };

  // API functions
  const loadBatches = async () => {
    try {
      setLoading(true);
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/batches`, {
        method: 'GET',
        headers,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setBatches(data.data || []);
      } else {
        Alert.alert('Error', data.message || 'Failed to load batches');
      }
    } catch (error) {
      console.error('Error loading batches:', error);
      Alert.alert('Error', 'Failed to load batches. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const loadEligibleUsers = async () => {
    try {
      const headers = await getAuthHeaders();
      
      // Load eligible students (not assigned to any batch)
      const studentsResponse = await fetch(`${API_BASE_URL}/batches/eligible-students`, {
        method: 'GET',
        headers,
      });
      
      if (studentsResponse.ok) {
        const studentsData = await studentsResponse.json();
        if (studentsData.success) {
          setEligibleStudents(studentsData.data || []);
          console.log('Eligible students loaded:', studentsData.data?.length || 0);
        } else {
          console.error('Failed to load eligible students:', studentsData.message);
        }
      } else {
        console.error('Failed to fetch eligible students:', studentsResponse.status);
      }

      // Load eligible teachers (not assigned to any batch)
      const teachersResponse = await fetch(`${API_BASE_URL}/batches/eligible-teachers`, {
        method: 'GET',
        headers,
      });
      
      if (teachersResponse.ok) {
        const teachersData = await teachersResponse.json();
        if (teachersData.success) {
          setEligibleTeachers(teachersData.data || []);
          console.log('Eligible teachers loaded:', teachersData.data?.length || 0);
        } else {
          console.error('Failed to load eligible teachers:', teachersData.message);
        }
      } else {
        console.error('Failed to fetch eligible teachers:', teachersResponse.status);
      }
    } catch (error) {
      console.error('Error loading eligible users:', error);
    }
  };

  const loadAvailableUsersForBatch = async (batchId?: string) => {
    if (!batchId) return;
    
    try {
      const headers = await getAuthHeaders();
      
      // Load available students for this batch
      setLoadingStudents(true);
      const studentsResponse = await fetch(`${API_BASE_URL}/batches/${batchId}/available-students`, {
        method: 'GET',
        headers,
      });
      
      if (studentsResponse.ok) {
        const studentsData = await studentsResponse.json();
        if (studentsData.success) {
          setAvailableStudents(studentsData.data || []);
          console.log('Available students for batch loaded:', studentsData.data?.length || 0);
        }
      }
      
      // Load available teachers for this batch
      setLoadingTeachers(true);
      const teachersResponse = await fetch(`${API_BASE_URL}/batches/${batchId}/available-teachers`, {
        method: 'GET',
        headers,
      });
      
      if (teachersResponse.ok) {
        const teachersData = await teachersResponse.json();
        if (teachersData.success) {
          setAvailableTeachers(teachersData.data || []);
          console.log('Available teachers for batch loaded:', teachersData.data?.length || 0);
        }
      }
    } catch (error) {
      console.error('Error loading available users for batch:', error);
    } finally {
      setLoadingStudents(false);
      setLoadingTeachers(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadBatches(),
      loadEligibleUsers()
    ]);
    setRefreshing(false);
  };

  const saveBatch = async () => {
    try {
      if (!validateBatch()) return;
      
      setLoading(true);
      const headers = await getAuthHeaders();
      const url = editingBatch 
        ? `${API_BASE_URL}/batches/${editingBatch._id}`
        : `${API_BASE_URL}/batches`;
      
      const method = editingBatch ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(batchForm),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        Alert.alert('Success', editingBatch ? 'Batch updated successfully!' : 'Batch created successfully!');
        resetForm();
        setShowCreateModal(false);
        await Promise.all([
          loadBatches(),
          loadEligibleUsers() // Reload eligible users after creating/updating batch
        ]);
      } else {
        Alert.alert('Error', data.message || 'Failed to save batch');
      }
    } catch (error) {
      console.error('Error saving batch:', error);
      const errorMessage = (error instanceof Error && error.message) ? error.message : 'Failed to save batch. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // NEW: Assign students to batch
  const assignStudentsToBatch = async (batchId: string, studentIds: string[]) => {
    try {
      setLoading(true);
      const headers = await getAuthHeaders();
      
      const response = await fetch(`${API_BASE_URL}/batches/${batchId}/assign-students`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ studentIds }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        Alert.alert('Success', 'Students assigned successfully!');
        await Promise.all([
          loadBatches(),
          loadEligibleUsers()
        ]);
      } else {
        Alert.alert('Error', data.message || 'Failed to assign students');
      }
    } catch (error) {
      console.error('Error assigning students:', error);
      const errorMessage = (error instanceof Error && error.message) ? error.message : 'Failed to assign students. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // NEW: Assign teachers to batch
  const assignTeachersToBatch = async (batchId: string, teacherIds: string[]) => {
    try {
      setLoading(true);
      const headers = await getAuthHeaders();
      
      const response = await fetch(`${API_BASE_URL}/batches/${batchId}/assign-teachers`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ teacherIds }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        Alert.alert('Success', 'Teachers assigned successfully!');
        await Promise.all([
          loadBatches(),
          loadEligibleUsers()
        ]);
      } else {
        Alert.alert('Error', data.message || 'Failed to assign teachers');
      }
    } catch (error) {
      console.error('Error assigning teachers:', error);
      const errorMessage = (error instanceof Error && error.message) ? error.message : 'Failed to assign teachers. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // NEW: Remove students from batch
  const removeStudentsFromBatch = async (batchId: string, studentIds: string[]) => {
    try {
      setLoading(true);
      const headers = await getAuthHeaders();
      
      const response = await fetch(`${API_BASE_URL}/batches/${batchId}/remove-students`, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ studentIds }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        Alert.alert('Success', 'Students removed successfully!');
        await Promise.all([
          loadBatches(),
          loadEligibleUsers()
        ]);
      } else {
        Alert.alert('Error', data.message || 'Failed to remove students');
      }
    } catch (error) {
      console.error('Error removing students:', error);
      const errorMessage = (error instanceof Error && error.message) ? error.message : 'Failed to remove students. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // NEW: Remove teachers from batch
  const removeTeachersFromBatch = async (batchId: string, teacherIds: string[]) => {
    try {
      setLoading(true);
      const headers = await getAuthHeaders();
      
      const response = await fetch(`${API_BASE_URL}/batches/${batchId}/remove-teachers`, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ teacherIds }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        Alert.alert('Success', 'Teachers removed successfully!');
        await Promise.all([
          loadBatches(),
          loadEligibleUsers()
        ]);
      } else {
        Alert.alert('Error', data.message || 'Failed to remove teachers');
      }
    } catch (error) {
      console.error('Error removing teachers:', error);
      const errorMessage = (error instanceof Error && error.message) ? error.message : 'Failed to remove teachers. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const deleteBatch = async (batchId: string) => {
    if (!batchId) {
      Alert.alert('Error', 'Batch ID is required');
      return;
    }

    Alert.alert(
      'Delete Batch',
      'Are you sure you want to delete this batch? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const headers = await getAuthHeaders();
              const response = await fetch(`${API_BASE_URL}/batches/${batchId}`, {
                method: 'DELETE',
                headers,
              });
              
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              
              const data = await response.json();
              
              if (data.success) {
                Alert.alert('Success', 'Batch deleted successfully!');
                await Promise.all([
                  loadBatches(),
                  loadEligibleUsers() // Reload eligible users after deleting batch
                ]);
              } else {
                Alert.alert('Error', data.message || 'Failed to delete batch');
              }
            } catch (error) {
              console.error('Error deleting batch:', error);
              Alert.alert('Error', 'Failed to delete batch. Please try again.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // Validation functions
  const validateBatch = () => {
    if (!batchForm.batchName?.trim()) {
      Alert.alert('Error', 'Batch name is required');
      return false;
    }
    if (!batchForm.classes || batchForm.classes.length === 0) {
      Alert.alert('Error', 'At least one class must be specified');
      return false;
    }
    if (!batchForm.category) {
      Alert.alert('Error', 'Category is required');
      return false;
    }
    return true;
  };

  // Helper functions
  const resetForm = () => {
    setBatchForm({
      batchName: '',
      classes: [],
      category: 'jee',
      students: [],
      teachers: [],
      schedule: '',
      description: '',
      isActive: true,
    });
    setEditingBatch(null);
    setClassInput('');
    setAvailableStudents([]);
    setAvailableTeachers([]);
  };

  const resetAssignForm = () => {
    setSelectedAssignStudents([]);
    setSelectedAssignTeachers([]);
    setAssigningBatch(null);
    setAvailableStudents([]);
    setAvailableTeachers([]);
  };

  const editBatch = (batch: Batch) => {
    setBatchForm({
      batchName: batch.batchName,
      classes: batch.classes || [],
      category: batch.category,
      students: batch.students?.map(s => s._id) || [],
      teachers: batch.teachers?.map(t => t._id) || [],
      schedule: batch.schedule || '',
      description: batch.description || '',
      isActive: batch.isActive !== undefined ? batch.isActive : true,
    });
    setEditingBatch(batch);
    
    // Load available users for this batch
    if (batch._id) {
      loadAvailableUsersForBatch(batch._id);
    }
    
    setShowCreateModal(true);
  };

  // NEW: Open assign users modal
  const openAssignModal = (batch: Batch) => {
    setAssigningBatch(batch);
    setSelectedAssignStudents([]);
    setSelectedAssignTeachers([]);
    
    // Load available users for this batch
    if (batch._id) {
      loadAvailableUsersForBatch(batch._id);
    }
    
    setShowAssignModal(true);
  };

  // NEW: Handle assignment submission
  const handleAssignUsers = async () => {
    if (!assigningBatch || !assigningBatch._id) {
      Alert.alert('Error', 'No batch selected for assignment');
      return;
    }

    if (selectedAssignStudents.length === 0 && selectedAssignTeachers.length === 0) {
      Alert.alert('Error', 'Please select at least one student or teacher to assign');
      return;
    }

    try {
      // Assign students if selected
      if (selectedAssignStudents.length > 0) {
        await assignStudentsToBatch(assigningBatch._id, selectedAssignStudents);
      }

      // Assign teachers if selected
      if (selectedAssignTeachers.length > 0) {
        await assignTeachersToBatch(assigningBatch._id, selectedAssignTeachers);
      }

      resetAssignForm();
      setShowAssignModal(false);
    } catch (error) {
      console.error('Error assigning users:', error);
    }
  };

  // NEW: Handle remove users from batch
  const handleRemoveUsers = (batch: Batch) => {
    if (!batch._id) return;

    const currentStudents = batch.students || [];
    const currentTeachers = batch.teachers || [];

    if (currentStudents.length === 0 && currentTeachers.length === 0) {
      Alert.alert('Info', 'No users assigned to this batch');
      return;
    }

    const message = `Current assignment:\n${currentStudents.length} students\n${currentTeachers.length} teachers\n\nWhat would you like to remove?`;

    Alert.alert(
      'Remove Users',
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove All Students',
          style: 'destructive',
          onPress: () => {
            if (currentStudents.length > 0) {
              removeStudentsFromBatch(batch._id!, currentStudents.map(s => s._id));
            }
          },
        },
        {
          text: 'Remove All Teachers',
          style: 'destructive',
          onPress: () => {
            if (currentTeachers.length > 0) {
              removeTeachersFromBatch(batch._id!, currentTeachers.map(t => t._id));
            }
          },
        },
      ]
    );
  };

  const addClass = () => {
    if (classInput.trim() && !batchForm.classes.includes(classInput.trim())) {
      setBatchForm({
        ...batchForm,
        classes: [...batchForm.classes, classInput.trim()]
      });
      setClassInput('');
    }
  };

  const removeClass = (classToRemove: string) => {
    setBatchForm({
      ...batchForm,
      classes: batchForm.classes.filter(cls => cls !== classToRemove)
    });
  };

  const toggleStudentSelection = (studentId: string) => {
    const isSelected = batchForm.students.includes(studentId);
    setBatchForm({
      ...batchForm,
      students: isSelected
        ? batchForm.students.filter(id => id !== studentId)
        : [...batchForm.students, studentId]
    });
  };

  const toggleTeacherSelection = (teacherId: string) => {
    const isSelected = batchForm.teachers.includes(teacherId);
    setBatchForm({
      ...batchForm,
      teachers: isSelected
        ? batchForm.teachers.filter(id => id !== teacherId)
        : [...batchForm.teachers, teacherId]
    });
  };

  // NEW: Toggle assignment selection
  const toggleAssignStudentSelection = (studentId: string) => {
    const isSelected = selectedAssignStudents.includes(studentId);
    setSelectedAssignStudents(isSelected
      ? selectedAssignStudents.filter(id => id !== studentId)
      : [...selectedAssignStudents, studentId]
    );
  };

  const toggleAssignTeacherSelection = (teacherId: string) => {
    const isSelected = selectedAssignTeachers.includes(teacherId);
    setSelectedAssignTeachers(isSelected
      ? selectedAssignTeachers.filter(id => id !== teacherId)
      : [...selectedAssignTeachers, teacherId]
    );
  };

  const getSelectedStudentsText = () => {
    const studentList = editingBatch ? availableStudents : eligibleStudents;
    const selectedStudents = studentList.filter(s => batchForm.students.includes(s._id));
    return selectedStudents.length > 0 
      ? `${selectedStudents.length} student${selectedStudents.length > 1 ? 's' : ''} selected`
      : 'No students selected';
  };

  const getSelectedTeachersText = () => {
    const teacherList = editingBatch ? availableTeachers : eligibleTeachers;
    const selectedTeachers = teacherList.filter(t => batchForm.teachers.includes(t._id));
    return selectedTeachers.length > 0 
      ? `${selectedTeachers.length} teacher${selectedTeachers.length > 1 ? 's' : ''} selected`
      : 'No teachers selected';
  };

  const openStudentSelector = () => {
    // For new batch, use eligible students
    // For editing batch, use available students (which includes current batch students)
    if (!editingBatch) {
      setShowStudentSelector(true);
    } else {
      // Make sure available students are loaded
      if (availableStudents.length === 0 && !loadingStudents) {
        loadAvailableUsersForBatch(editingBatch._id);
      }
      setShowStudentSelector(true);
    }
  };

  const openTeacherSelector = () => {
    // For new batch, use eligible teachers
    // For editing batch, use available teachers (which includes current batch teachers)
    if (!editingBatch) {
      setShowTeacherSelector(true);
    } else {
      // Make sure available teachers are loaded
      if (availableTeachers.length === 0 && !loadingTeachers) {
        loadAvailableUsersForBatch(editingBatch._id);
      }
      setShowTeacherSelector(true);
    }
  };

  // Render functions
  const renderBatchItem = ({ item }: { item: Batch }) => (
    <View style={styles.batchCard}>
      <View style={styles.batchHeader}>
        <View style={styles.batchHeaderLeft}>
          <Text style={styles.batchName}>{item.batchName}</Text>
          <Text style={styles.batchCategory}>{item.category.toUpperCase()}</Text>
        </View>
        <View style={styles.statusContainer}>
          <Text style={[
            styles.statusText,
            { color: item.isActive ? BRAND.primaryColor : BRAND.errorColor }
          ]}>
            {item.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>
      
      <View style={styles.batchInfo}>
        <Text style={styles.infoText}>
          Classes: {item.classes?.join(', ') || 'No classes'}
        </Text>
        <Text style={styles.infoText}>
          Students: {item.students?.length || 0}
        </Text>
        <Text style={styles.infoText}>
          Teachers: {item.teachers?.length || 0}
        </Text>
        {item.schedule && (
          <Text style={styles.infoText}>Schedule: {item.schedule}</Text>
        )}
      </View>
      
      {item.description && (
        <Text style={styles.batchDescription}>{item.description}</Text>
      )}
      
      <View style={styles.batchActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => editBatch(item)}
        >
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.assignButton]}
          onPress={() => openAssignModal(item)}
        >
          <Text style={styles.actionButtonText}>Assign</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.removeButton]}
          onPress={() => handleRemoveUsers(item)}
        >
          <Text style={styles.actionButtonText}>Remove</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => item._id && deleteBatch(item._id)}
        >
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStudentItem = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={[
        styles.userItem,
        batchForm.students.includes(item._id) && styles.userItemSelected
      ]}
      onPress={() => toggleStudentSelection(item._id)}
    >
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
      </View>
      <View style={styles.selectionIndicator}>
        {batchForm.students.includes(item._id) && (
          <Text style={styles.selectionCheck}>✓</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderTeacherItem = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={[
        styles.userItem,
        batchForm.teachers.includes(item._id) && styles.userItemSelected
      ]}
      onPress={() => toggleTeacherSelection(item._id)}
    >
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
      </View>
      <View style={styles.selectionIndicator}>
        {batchForm.teachers.includes(item._id) && (
          <Text style={styles.selectionCheck}>✓</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  // NEW: Render assignment student item
  // NEW: Render assignment student item
  const renderAssignStudentItem = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={[
        styles.userItem,
        selectedAssignStudents.includes(item._id) && styles.userItemSelected
      ]}
      onPress={() => toggleAssignStudentSelection(item._id)}
    >
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
      </View>
      <View style={styles.selectionIndicator}>
        {selectedAssignStudents.includes(item._id) && (
          <Text style={styles.selectionCheck}>✓</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  // NEW: Render assignment teacher item
  const renderAssignTeacherItem = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={[
        styles.userItem,
        selectedAssignTeachers.includes(item._id) && styles.userItemSelected
      ]}
      onPress={() => toggleAssignTeacherSelection(item._id)}
    >
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
      </View>
      <View style={styles.selectionIndicator}>
        {selectedAssignTeachers.includes(item._id) && (
          <Text style={styles.selectionCheck}>✓</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderClassItem = ({ item }: { item: string }) => (
    <View style={styles.classItem}>
      <Text style={styles.classText}>{item}</Text>
      <TouchableOpacity
        style={styles.removeClassButton}
        onPress={() => removeClass(item)}
      >
        <Text style={styles.removeClassText}>×</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND.backgroundColor} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackPress}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Batch Management</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => {
            resetForm();
            setShowCreateModal(true);
          }}
        >
          <Text style={styles.createButtonText}>+ Create</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[BRAND.primaryColor]}
            tintColor={BRAND.primaryColor}
          />
        }
      >
        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{batches.length}</Text>
            <Text style={styles.statLabel}>Total Batches</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {batches.filter(b => b.isActive).length}
            </Text>
            <Text style={styles.statLabel}>Active Batches</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{eligibleStudents.length}</Text>
            <Text style={styles.statLabel}>Available Students</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{eligibleTeachers.length}</Text>
            <Text style={styles.statLabel}>Available Teachers</Text>
          </View>
        </View>

        {/* Batches List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={BRAND.primaryColor} />
            <Text style={styles.loadingText}>Loading batches...</Text>
          </View>
        ) : (
          <FlatList
            data={batches}
            renderItem={renderBatchItem}
            keyExtractor={(item) => item._id || Math.random().toString()}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.batchesList}
          />
        )}
      </ScrollView>

      {/* Create/Edit Batch Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowCreateModal(false)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingBatch ? 'Edit Batch' : 'Create New Batch'}
            </Text>
            <TouchableOpacity
              style={styles.modalSaveButton}
              onPress={saveBatch}
              disabled={loading}
            >
              <Text style={styles.modalSaveText}>
                {loading ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Batch Name */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Batch Name *</Text>
              <TextInput
                style={styles.formInput}
                value={batchForm.batchName}
                onChangeText={(text) => setBatchForm({...batchForm, batchName: text})}
                placeholder="Enter batch name"
                placeholderTextColor={BRAND.accentColor}
              />
            </View>

            {/* Category */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Category *</Text>
              <View style={styles.categoryContainer}>
                {['jee', 'neet', 'boards'].map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryButton,
                      batchForm.category === category && styles.categoryButtonSelected
                    ]}
                    onPress={() => setBatchForm({...batchForm, category: category as 'jee' | 'neet' | 'boards'})}
                  >
                    <Text style={[
                      styles.categoryButtonText,
                      batchForm.category === category && styles.categoryButtonTextSelected
                    ]}>
                      {category.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Classes */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Classes *</Text>
              <View style={styles.classInputContainer}>
                <TextInput
                  style={styles.classInput}
                  value={classInput}
                  onChangeText={setClassInput}
                  placeholder="Enter class (e.g., 11th, 12th)"
                  placeholderTextColor={BRAND.accentColor}
                />
                <TouchableOpacity
                  style={styles.addClassButton}
                  onPress={addClass}
                >
                  <Text style={styles.addClassText}>Add</Text>
                </TouchableOpacity>
              </View>
              {batchForm.classes.length > 0 && (
                <FlatList
                  data={batchForm.classes}
                  renderItem={renderClassItem}
                  keyExtractor={(item, index) => `${item}-${index}`}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.classesContainer}
                />
              )}
            </View>

            {/* Schedule */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Schedule</Text>
              <TextInput
                style={styles.formInput}
                value={batchForm.schedule}
                onChangeText={(text) => setBatchForm({...batchForm, schedule: text})}
                placeholder="Enter schedule (e.g., Mon-Fri 9:00 AM)"
                placeholderTextColor={BRAND.accentColor}
              />
            </View>

            {/* Description */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Description</Text>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                value={batchForm.description}
                onChangeText={(text) => setBatchForm({...batchForm, description: text})}
                placeholder="Enter batch description"
                placeholderTextColor={BRAND.accentColor}
                multiline
                numberOfLines={4}
              />
            </View>

            {/* Students Selection */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Students</Text>
              <TouchableOpacity
                style={styles.selectorButton}
                onPress={openStudentSelector}
              >
                <Text style={styles.selectorButtonText}>
                  {getSelectedStudentsText()}
                </Text>
                <Text style={styles.selectorArrow}>→</Text>
              </TouchableOpacity>
            </View>

            {/* Teachers Selection */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Teachers</Text>
              <TouchableOpacity
                style={styles.selectorButton}
                onPress={openTeacherSelector}
              >
                <Text style={styles.selectorButtonText}>
                  {getSelectedTeachersText()}
                </Text>
                <Text style={styles.selectorArrow}>→</Text>
              </TouchableOpacity>
            </View>

            {/* Active Status */}
            <View style={styles.formGroup}>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setBatchForm({...batchForm, isActive: !batchForm.isActive})}
              >
                <View style={[
                  styles.checkbox,
                  batchForm.isActive && styles.checkboxChecked
                ]}>
                  {batchForm.isActive && <Text style={styles.checkboxCheck}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>Active Batch</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Student Selector Modal */}
      <Modal
        visible={showStudentSelector}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowStudentSelector(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowStudentSelector(false)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Students</Text>
            <TouchableOpacity
              style={styles.modalSaveButton}
              onPress={() => setShowStudentSelector(false)}
            >
              <Text style={styles.modalSaveText}>Done</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            {loadingStudents ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={BRAND.primaryColor} />
                <Text style={styles.loadingText}>Loading students...</Text>
              </View>
            ) : (
              <FlatList
                data={editingBatch ? availableStudents : eligibleStudents}
                renderItem={renderStudentItem}
                keyExtractor={(item) => item._id}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        </SafeAreaView>
      </Modal>

      {/* Teacher Selector Modal */}
      <Modal
        visible={showTeacherSelector}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTeacherSelector(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowTeacherSelector(false)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Teachers</Text>
            <TouchableOpacity
              style={styles.modalSaveButton}
              onPress={() => setShowTeacherSelector(false)}
            >
              <Text style={styles.modalSaveText}>Done</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            {loadingTeachers ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={BRAND.primaryColor} />
                <Text style={styles.loadingText}>Loading teachers...</Text>
              </View>
            ) : (
              <FlatList
                data={editingBatch ? availableTeachers : eligibleTeachers}
                renderItem={renderTeacherItem}
                keyExtractor={(item) => item._id}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        </SafeAreaView>
      </Modal>

      {/* NEW: Assign Users Modal */}
      <Modal
        visible={showAssignModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAssignModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => {
                setShowAssignModal(false);
                resetAssignForm();
              }}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Assign Users</Text>
            <TouchableOpacity
              style={styles.modalSaveButton}
              onPress={handleAssignUsers}
              disabled={loading}
            >
              <Text style={styles.modalSaveText}>
                {loading ? 'Assigning...' : 'Assign'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Students Section */}
            <View style={styles.assignSection}>
              <Text style={styles.assignSectionTitle}>
                Available Students ({availableStudents.length})
              </Text>
              {loadingStudents ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={BRAND.primaryColor} />
                  <Text style={styles.loadingText}>Loading students...</Text>
                </View>
              ) : availableStudents.length > 0 ? (
                <FlatList
                  data={availableStudents}
                  renderItem={renderAssignStudentItem}
                  keyExtractor={(item) => item._id}
                  showsVerticalScrollIndicator={false}
                  scrollEnabled={false}
                />
              ) : (
                <Text style={styles.noDataText}>No students available</Text>
              )}
            </View>

            {/* Teachers Section */}
            <View style={styles.assignSection}>
              <Text style={styles.assignSectionTitle}>
                Available Teachers ({availableTeachers.length})
              </Text>
              {loadingTeachers ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={BRAND.primaryColor} />
                  <Text style={styles.loadingText}>Loading teachers...</Text>
                </View>
              ) : availableTeachers.length > 0 ? (
                <FlatList
                  data={availableTeachers}
                  renderItem={renderAssignTeacherItem}
                  keyExtractor={(item) => item._id}
                  showsVerticalScrollIndicator={false}
                  scrollEnabled={false}
                />
              ) : (
                <Text style={styles.noDataText}>No teachers available</Text>
              )}
            </View>

            {/* Selection Summary */}
            <View style={styles.selectionSummary}>
              <Text style={styles.summaryText}>
                Selected: {selectedAssignStudents.length} students, {selectedAssignTeachers.length} teachers
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND.backgroundColor,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: BRAND.accentColor,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.primaryColor,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    color: BRAND.primaryColor,
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    color: BRAND.primaryColor,
    fontSize: 18,
    fontWeight: 'bold',
  },
  createButton: {
    backgroundColor: BRAND.primaryColor,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  createButtonText: {
    color: BRAND.backgroundColor,
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: BRAND.accentColor,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    width: '48%',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: BRAND.primaryColor + '20',
  },
  statNumber: {
    color: BRAND.primaryColor,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    color: '#ffffff',
    fontSize: 12,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    color: '#ffffff',
    marginTop: 12,
    fontSize: 16,
  },
  batchesList: {
    paddingBottom: 20,
  },
  batchCard: {
    backgroundColor: BRAND.accentColor,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BRAND.primaryColor + '20',
  },
  batchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  batchHeaderLeft: {
    flex: 1,
  },
  batchName: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  batchCategory: {
    color: BRAND.primaryColor,
    fontSize: 14,
    fontWeight: '600',
  },
  statusContainer: {
    backgroundColor: BRAND.primaryColor + '20',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  batchInfo: {
    marginBottom: 12,
  },
  infoText: {
    color: '#cccccc',
    fontSize: 14,
    marginBottom: 4,
  },
  batchDescription: {
    color: '#aaaaaa',
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 16,
  },
  batchActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    minWidth: '22%',
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: BRAND.primaryColor + '20',
    borderWidth: 1,
    borderColor: BRAND.primaryColor,
  },
  assignButton: {
    backgroundColor: BRAND.goldColor + '20',
    borderWidth: 1,
    borderColor: BRAND.goldColor,
  },
  removeButton: {
    backgroundColor: BRAND.warningColor + '20',
    borderWidth: 1,
    borderColor: BRAND.warningColor,
  },
  deleteButton: {
    backgroundColor: BRAND.errorColor + '20',
    borderWidth: 1,
    borderColor: BRAND.errorColor,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: BRAND.backgroundColor,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: BRAND.accentColor,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.primaryColor,
  },
  modalCloseButton: {
    paddingVertical: 8,
  },
  modalCloseText: {
    color: BRAND.errorColor,
    fontSize: 16,
  },
  modalTitle: {
    color: BRAND.primaryColor,
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalSaveButton: {
    paddingVertical: 8,
  },
  modalSaveText: {
    color: BRAND.primaryColor,
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: BRAND.accentColor,
    borderWidth: 1,
    borderColor: BRAND.primaryColor + '30',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#ffffff',
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  categoryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  categoryButton: {
    flex: 1,
    backgroundColor: BRAND.accentColor,
    borderWidth: 1,
    borderColor: BRAND.primaryColor + '30',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  categoryButtonSelected: {
    backgroundColor: BRAND.primaryColor + '20',
    borderColor: BRAND.primaryColor,
  },
  categoryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  categoryButtonTextSelected: {
    color: BRAND.primaryColor,
  },
  classInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  classInput: {
    flex: 1,
    backgroundColor: BRAND.accentColor,
    borderWidth: 1,
    borderColor: BRAND.primaryColor + '30',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#ffffff',
    fontSize: 16,
    marginRight: 8,
  },
  addClassButton: {
    backgroundColor: BRAND.primaryColor,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  addClassText: {
    color: BRAND.backgroundColor,
    fontSize: 14,
    fontWeight: '600',
  },
  classesContainer: {
    marginTop: 8,
  },
  classItem: {
    backgroundColor: BRAND.primaryColor + '20',
    borderWidth: 1,
    borderColor: BRAND.primaryColor,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  classText: {
    color: BRAND.primaryColor,
    fontSize: 14,
    marginRight: 8,
  },
  removeClassButton: {
    backgroundColor: BRAND.errorColor,
    borderRadius: 4,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeClassText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  selectorButton: {
    backgroundColor: BRAND.accentColor,
    borderWidth: 1,
    borderColor: BRAND.primaryColor + '30',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectorButtonText: {
    color: '#ffffff',
    fontSize: 16,
  },
  selectorArrow: {
    color: BRAND.primaryColor,
    fontSize: 16,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: BRAND.primaryColor + '30',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: BRAND.primaryColor,
    borderColor: BRAND.primaryColor,
  },
  checkboxCheck: {
    color: BRAND.backgroundColor,
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    color: '#ffffff',
    fontSize: 16,
  },
  userItem: {
    backgroundColor: BRAND.accentColor,
    borderWidth: 1,
    borderColor: BRAND.primaryColor + '20',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userItemSelected: {
    backgroundColor: BRAND.primaryColor + '20',
    borderColor: BRAND.primaryColor,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  userEmail: {
    color: '#cccccc',
    fontSize: 14,
  },
  selectionIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: BRAND.primaryColor,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionCheck: {
    color: BRAND.backgroundColor,
    fontSize: 16,
    fontWeight: 'bold',
  },
  assignSection: {
    marginBottom: 24,
  },
  assignSectionTitle: {
    color: BRAND.primaryColor,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  noDataText: {
    color: '#aaaaaa',
    fontSize: 16,
    textAlign: 'center',
    paddingVertical: 20,
    fontStyle: 'italic',
  },
  selectionSummary: {
    backgroundColor: BRAND.accentColor,
    borderWidth: 1,
    borderColor: BRAND.primaryColor + '30',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 16,
  },
  summaryText: {
    color: BRAND.primaryColor,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});