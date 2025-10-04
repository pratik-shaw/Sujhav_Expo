import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet,
  Alert, SafeAreaView, StatusBar, ActivityIndicator, Modal, FlatList,
  RefreshControl,
} from 'react-native';
import { API_BASE } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BatchAssignmentModal from '../components/BatchAssignmentModal';

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

const API_BASE_URL = API_BASE;

// Types
interface Subject {
  _id?: string;
  name: string;
  teacher?: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'user' | 'teacher';
}

interface Batch {
  _id?: string;
  batchName: string;
  classes: string[];
  subjects: Subject[];
  category: 'jee' | 'neet' | 'boards';
  students: User[];
  schedule: string;
  description: string;
  isActive: boolean;
}

interface BatchForm {
  batchName: string;
  classes: string[];
  subjects: Subject[];
  category: 'jee' | 'neet' | 'boards';
  students: string[];
  schedule: string;
  description: string;
  isActive: boolean;
}

interface StudentAssignment {
  studentId: string;
  assignedClasses: string[];
  assignedSubjects: string[];
}

interface TeacherAssignment {
  teacherId: string;
  assignedSubjects: string[];
}

interface AdminCreateBatchesScreenProps {
  navigation?: {
    goBack?: () => void;
    navigate?: (screen: string) => void;
  };
  onBack?: () => void;
}

export default function AdminCreateBatchesScreen({ navigation, onBack }: AdminCreateBatchesScreenProps) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [eligibleStudents, setEligibleStudents] = useState<User[]>([]);
  const [allTeachers, setAllTeachers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStudentSelector, setShowStudentSelector] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [classInput, setClassInput] = useState('');
  const [subjectInput, setSubjectInput] = useState('');

  // Assignment modal states
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [assignmentModalType, setAssignmentModalType] = useState<'assign_students' | 'remove_students' | 'assign_teachers'>('assign_students');
  const [selectedBatchForAssignment, setSelectedBatchForAssignment] = useState<Batch | null>(null);

  const [batchForm, setBatchForm] = useState<BatchForm>({
    batchName: '',
    classes: [],
    subjects: [],
    category: 'jee',
    students: [],
    schedule: '',
    description: '',
    isActive: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const handleBackPress = () => {
    if (onBack) onBack();
    else if (navigation?.goBack) navigation.goBack();
    else if (navigation?.navigate) navigation.navigate('AdminDashboard');
  };

  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    try {
      const token = await AsyncStorage.getItem('authToken') || 
                    await AsyncStorage.getItem('token') || 
                    await AsyncStorage.getItem('userToken') ||
                    await AsyncStorage.getItem('accessToken');
      
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      return headers;
    } catch (error) {
      return { 'Content-Type': 'application/json' };
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const headers = await getAuthHeaders();
      
      const [batchesRes, studentsRes, teachersRes] = await Promise.all([
        fetch(`${API_BASE_URL}/batches`, { headers }),
        fetch(`${API_BASE_URL}/batches/eligible-students`, { headers }),
        fetch(`${API_BASE_URL}/batches/all-teachers`, { headers })
      ]);

      if (batchesRes.ok) {
        const data = await batchesRes.json();
        if (data.success) setBatches(data.data || []);
      }

      if (studentsRes.ok) {
        const data = await studentsRes.json();
        if (data.success) setEligibleStudents(data.data || []);
      }

      if (teachersRes.ok) {
        const data = await teachersRes.json();
        if (data.success) setAllTeachers(data.data || []);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Assignment handlers
  const handleAssignStudents = (batch: Batch) => {
    setSelectedBatchForAssignment(batch);
    setAssignmentModalType('assign_students');
    setShowAssignmentModal(true);
  };

  const handleRemoveStudents = (batch: Batch) => {
    if (!batch.students?.length) {
      Alert.alert('Info', 'No students to remove');
      return;
    }
    setSelectedBatchForAssignment(batch);
    setAssignmentModalType('remove_students');
    setShowAssignmentModal(true);
  };

  const handleAssignTeachers = (batch: Batch) => {
    if (!batch.subjects?.length) {
      Alert.alert('Info', 'No subjects available for teacher assignment');
      return;
    }
    setSelectedBatchForAssignment(batch);
    setAssignmentModalType('assign_teachers');
    setShowAssignmentModal(true);
  };

  const handleStudentAssignment = async (assignments: StudentAssignment[] | TeacherAssignment[]) => {
    if (!selectedBatchForAssignment?._id) return;

    try {
      setLoading(true);
      const headers = await getAuthHeaders();
      
      if (assignmentModalType === 'assign_students') {
        const studentAssignments = assignments as StudentAssignment[];
        const response = await fetch(`${API_BASE_URL}/batches/${selectedBatchForAssignment._id}/assign-students-detailed`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ assignments: studentAssignments }),
        });
        
        const data = await response.json();
        if (data.success) {
          Alert.alert('Success', 'Students assigned successfully!');
          setShowAssignmentModal(false);
          loadData();
        } else {
          Alert.alert('Error', data.message || 'Failed to assign students');
        }
      } else if (assignmentModalType === 'remove_students') {
        const studentIds = (assignments as StudentAssignment[]).map(a => a.studentId);
        const response = await fetch(`${API_BASE_URL}/batches/${selectedBatchForAssignment._id}/remove-students`, {
          method: 'DELETE',
          headers,
          body: JSON.stringify({ studentIds }),
        });
        
        const data = await response.json();
        if (data.success) {
          Alert.alert('Success', 'Students removed successfully!');
          setShowAssignmentModal(false);
          loadData();
        } else {
          Alert.alert('Error', data.message || 'Failed to remove students');
        }
      } else if (assignmentModalType === 'assign_teachers') {
        const teacherAssignments = assignments as TeacherAssignment[];
        const response = await fetch(`${API_BASE_URL}/batches/${selectedBatchForAssignment._id}/assign-teachers`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ assignments: teacherAssignments }),
        });
        
        const data = await response.json();
        if (data.success) {
          Alert.alert('Success', 'Teachers assigned successfully!');
          setShowAssignmentModal(false);
          loadData();
        } else {
          Alert.alert('Error', data.message || 'Failed to assign teachers');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to process assignment');
    } finally {
      setLoading(false);
    }
  };

  // Rest of your existing functions remain the same
  const saveBatch = async () => {
    if (!validateBatch()) return;
    
    try {
      setLoading(true);
      const headers = await getAuthHeaders();
      const url = editingBatch ? `${API_BASE_URL}/batches/${editingBatch._id}` : `${API_BASE_URL}/batches`;
      const method = editingBatch ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(batchForm),
      });
      
      const data = await response.json();
      
      if (data.success) {
        Alert.alert('Success', editingBatch ? 'Batch updated!' : 'Batch created!');
        resetForm();
        setShowCreateModal(false);
        loadData();
      } else {
        Alert.alert('Error', data.message || 'Failed to save batch');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save batch');
    } finally {
      setLoading(false);
    }
  };

  const deleteBatch = async (batchId: string) => {
    Alert.alert(
      'Delete Batch',
      'Are you sure?',
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
              
              const data = await response.json();
              
              if (data.success) {
                Alert.alert('Success', 'Batch deleted!');
                loadData();
              } else {
                Alert.alert('Error', data.message);
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete batch');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const validateBatch = () => {
    if (!batchForm.batchName?.trim()) {
      Alert.alert('Error', 'Batch name is required');
      return false;
    }
    if (batchForm.classes.length === 0) {
      Alert.alert('Error', 'At least one class is required');
      return false;
    }
    return true;
  };

  const resetForm = () => {
    setBatchForm({
      batchName: '',
      classes: [],
      subjects: [],
      category: 'jee',
      students: [],
      schedule: '',
      description: '',
      isActive: true,
    });
    setEditingBatch(null);
    setClassInput('');
    setSubjectInput('');
  };

  const editBatch = (batch: Batch) => {
    setBatchForm({
      batchName: batch.batchName,
      classes: batch.classes || [],
      subjects: batch.subjects || [],
      category: batch.category,
      students: batch.students?.map(s => s._id) || [],
      schedule: batch.schedule || '',
      description: batch.description || '',
      isActive: batch.isActive !== undefined ? batch.isActive : true,
    });
    setEditingBatch(batch);
    setShowCreateModal(true);
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

  const addSubject = () => {
    if (subjectInput.trim() && !batchForm.subjects.some(s => s.name === subjectInput.trim())) {
      setBatchForm({
        ...batchForm,
        subjects: [...batchForm.subjects, { name: subjectInput.trim() }]
      });
      setSubjectInput('');
    }
  };

  const removeSubject = (subjectToRemove: string) => {
    setBatchForm({
      ...batchForm,
      subjects: batchForm.subjects.filter(s => s.name !== subjectToRemove)
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

  const getAvailableStudentsForAssignment = () => {
    if (!selectedBatchForAssignment) return [];
    return eligibleStudents.filter(student => 
      !selectedBatchForAssignment.students?.some(bs => bs._id === student._id)
    );
  };

  const renderBatchItem = ({ item }: { item: Batch }) => (
    <View style={styles.batchCard}>
      <View style={styles.batchHeader}>
        <View>
          <Text style={styles.batchName}>{item.batchName}</Text>
          <Text style={styles.batchCategory}>{item.category.toUpperCase()}</Text>
        </View>
        <Text style={[
          styles.statusText,
          { color: item.isActive ? BRAND.primaryColor : BRAND.errorColor }
        ]}>
          {item.isActive ? 'Active' : 'Inactive'}
        </Text>
      </View>
      
      <View style={styles.batchInfo}>
        <Text style={styles.infoText}>Classes: {item.classes?.join(', ') || 'None'}</Text>
        <Text style={styles.infoText}>Subjects: {item.subjects?.length || 0}</Text>
        <Text style={styles.infoText}>Students: {item.students?.length || 0}</Text>
        {item.schedule && <Text style={styles.infoText}>Schedule: {item.schedule}</Text>}
      </View>
      
      {item.description && <Text style={styles.batchDescription}>{item.description}</Text>}
      
      <ScrollView horizontal style={styles.subjectsContainer}>
        {item.subjects?.map((subject, index) => (
          <View key={index} style={styles.subjectChip}>
            <Text style={styles.subjectName}>{subject.name}</Text>
            {subject.teacher && (
              <Text style={styles.teacherName}>
                {allTeachers.find(t => t._id === subject.teacher)?.name || 'Teacher'}
              </Text>
            )}
          </View>
        ))}
      </ScrollView>
      
      <View style={styles.batchActions}>
        <TouchableOpacity style={[styles.actionButton, styles.editButton]} onPress={() => editBatch(item)}>
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.assignButton]} onPress={() => handleAssignStudents(item)}>
          <Text style={styles.actionButtonText}>+Students</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.removeButton]} onPress={() => handleRemoveStudents(item)}>
          <Text style={styles.actionButtonText}>-Students</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.warningButton]} onPress={() => handleAssignTeachers(item)}>
          <Text style={styles.actionButtonText}>Teachers</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={() => item._id && deleteBatch(item._id)}>
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStudentItem = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={[styles.userItem, batchForm.students.includes(item._id) && styles.userItemSelected]}
      onPress={() => toggleStudentSelection(item._id)}
    >
      <View>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
      </View>
      {batchForm.students.includes(item._id) && <Text style={styles.selectionCheck}>✓</Text>}
    </TouchableOpacity>
  );

  const renderClassItem = ({ item }: { item: string }) => (
    <View style={styles.classItem}>
      <Text style={styles.classText}>{item}</Text>
      <TouchableOpacity onPress={() => removeClass(item)}>
        <Text style={styles.removeText}>×</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSubjectItem = ({ item }: { item: Subject }) => (
    <View style={styles.classItem}>
      <Text style={styles.classText}>{item.name}</Text>
      <TouchableOpacity onPress={() => removeSubject(item.name)}>
        <Text style={styles.removeText}>×</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND.backgroundColor} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Batch Management</Text>
        <TouchableOpacity onPress={() => { resetForm(); setShowCreateModal(true); }}>
          <Text style={styles.createButtonText}>+ Create</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[BRAND.primaryColor]} />}
      >
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{batches.length}</Text>
            <Text style={styles.statLabel}>Total Batches</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{batches.filter(b => b.isActive).length}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{eligibleStudents.length}</Text>
            <Text style={styles.statLabel}>Available Students</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{allTeachers.length}</Text>
            <Text style={styles.statLabel}>Teachers</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={BRAND.primaryColor} />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : (
          <FlatList
            data={batches}
            renderItem={renderBatchItem}
            keyExtractor={(item) => item._id || Math.random().toString()}
            scrollEnabled={false}
          />
        )}
      </ScrollView>

      {/* Assignment Modal */}
      <BatchAssignmentModal
        visible={showAssignmentModal}
        onClose={() => setShowAssignmentModal(false)}
        batch={selectedBatchForAssignment}
        type={assignmentModalType}
        onAssign={handleStudentAssignment}
      />

      {/* Create/Edit Modal */}
      <Modal visible={showCreateModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{editingBatch ? 'Edit' : 'Create'} Batch</Text>
            <TouchableOpacity onPress={saveBatch} disabled={loading}>
              <Text style={styles.modalSaveText}>{loading ? 'Saving...' : 'Save'}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
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

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Category *</Text>
              <View style={styles.categoryContainer}>
                {['jee', 'neet', 'boards'].map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[styles.categoryButton, batchForm.category === category && styles.categoryButtonSelected]}
                    onPress={() => setBatchForm({...batchForm, category: category as 'jee' | 'neet' | 'boards'})}
                  >
                    <Text style={[styles.categoryButtonText, batchForm.category === category && styles.categoryButtonTextSelected]}>
                      {category.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Classes *</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  value={classInput}
                  onChangeText={setClassInput}
                  placeholder="Enter class"
                  placeholderTextColor={BRAND.accentColor}
                />
                <TouchableOpacity style={styles.addButton} onPress={addClass}>
                  <Text style={styles.addButtonText}>Add</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={batchForm.classes}
                renderItem={renderClassItem}
                keyExtractor={(item, index) => `${item}-${index}`}
                horizontal
                showsHorizontalScrollIndicator={false}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Subjects</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  value={subjectInput}
                  onChangeText={setSubjectInput}
                  placeholder="Enter subject"
                  placeholderTextColor={BRAND.accentColor}
                />
                <TouchableOpacity style={styles.addButton} onPress={addSubject}>
                  <Text style={styles.addButtonText}>Add</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={batchForm.subjects}
                renderItem={renderSubjectItem}
                keyExtractor={(item, index) => `${item.name}-${index}`}
                horizontal
                showsHorizontalScrollIndicator={false}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Schedule</Text>
              <TextInput
                style={styles.formInput}
                value={batchForm.schedule}
                onChangeText={(text) => setBatchForm({...batchForm, schedule: text})}
                placeholder="Enter schedule"
                placeholderTextColor={BRAND.accentColor}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Description</Text>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                value={batchForm.description}
                onChangeText={(text) => setBatchForm({...batchForm, description: text})}
                placeholder="Enter description"
                placeholderTextColor={BRAND.accentColor}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formGroup}>
              <TouchableOpacity
                style={styles.selectorButton}
                onPress={() => setShowStudentSelector(true)}
              >
                <Text style={styles.selectorButtonText}>
                  Select Students ({batchForm.students.length} selected)
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setBatchForm({...batchForm, isActive: !batchForm.isActive})}
              >
                <View style={[styles.checkbox, batchForm.isActive && styles.checkboxChecked]}>
                  {batchForm.isActive && <Text style={styles.checkboxCheck}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>Active Batch</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Student Selector Modal */}
      <Modal visible={showStudentSelector} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowStudentSelector(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Students</Text>
            <TouchableOpacity onPress={() => setShowStudentSelector(false)}>
              <Text style={styles.modalSaveText}>Done</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={eligibleStudents}
            renderItem={renderStudentItem}
            keyExtractor={(item) => item._id}
            style={styles.modalContent}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // ============================================================================
  // MAIN CONTAINER & LAYOUT
  // ============================================================================
  container: { 
    flex: 1, 
    backgroundColor: BRAND.backgroundColor 
  },

  // ============================================================================
  // HEADER SECTION
  // ============================================================================
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: BRAND.accentColor 
  },
  
  backButtonText: { 
    color: BRAND.primaryColor, 
    fontSize: 16 
  },
  
  headerTitle: { 
    color: 'white', 
    fontSize: 18, 
    fontWeight: 'bold' 
  },
  
  createButtonText: { 
    color: BRAND.primaryColor, 
    fontSize: 16, 
    fontWeight: 'bold' 
  },

  // ============================================================================
  // CONTENT & SCROLLABLE AREAS
  // ============================================================================
  content: { 
    flex: 1, 
    padding: 16 
  },

  // ============================================================================
  // STATISTICS CARDS
  // ============================================================================
  statsContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 20 
  },
  
  statCard: { 
    flex: 1, 
    backgroundColor: BRAND.accentColor, 
    padding: 12, 
    borderRadius: 8, 
    marginHorizontal: 4, 
    alignItems: 'center' 
  },
  
  statNumber: { 
    color: BRAND.primaryColor, 
    fontSize: 20, 
    fontWeight: 'bold' 
  },
  
  statLabel: { 
    color: 'white', 
    fontSize: 12, 
    marginTop: 4 
  },

  // ============================================================================
  // LOADING STATES
  // ============================================================================
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingVertical: 40 
  },
  
  loadingText: { 
    color: 'white', 
    marginTop: 10 
  },

  // ============================================================================
  // BATCH CARDS
  // ============================================================================
  batchCard: { 
    backgroundColor: BRAND.accentColor, 
    borderRadius: 12, 
    padding: 16, 
    marginBottom: 16 
  },
  
  batchHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    marginBottom: 12 
  },
  
  batchName: { 
    color: 'white', 
    fontSize: 18, 
    fontWeight: 'bold' 
  },
  
  batchCategory: { 
    color: BRAND.primaryColor, 
    fontSize: 12, 
    fontWeight: 'bold', 
    marginTop: 4 
  },
  
  statusText: { 
    fontSize: 12, 
    fontWeight: 'bold' 
  },
  
  batchInfo: { 
    marginBottom: 12 
  },
  
  infoText: { 
    color: '#ccc', 
    fontSize: 14, 
    marginBottom: 4 
  },
  
  batchDescription: { 
    color: '#aaa', 
    fontSize: 14, 
    fontStyle: 'italic', 
    marginBottom: 12 
  },

  // ============================================================================
  // SUBJECTS & CHIPS
  // ============================================================================
  subjectsContainer: { 
    marginBottom: 12 
  },
  
  subjectChip: { 
    backgroundColor: BRAND.backgroundColor, 
    padding: 8, 
    borderRadius: 6, 
    marginRight: 8 
  },
  
  subjectName: { 
    color: 'white', 
    fontSize: 12, 
    fontWeight: 'bold' 
  },
  
  teacherName: { 
    color: BRAND.primaryColor, 
    fontSize: 10 
  },

  // ============================================================================
  // ACTION BUTTONS
  // ============================================================================
  batchActions: { 
    flexDirection: 'row', 
    justifyContent: 'space-between' 
  },
  
  actionButton: { 
    flex: 1, 
    padding: 8, 
    borderRadius: 6, 
    marginHorizontal: 2 
  },
  
  editButton: { 
    backgroundColor: BRAND.warningColor 
  },
  
  assignButton: { 
    backgroundColor: BRAND.primaryColor 
  },
  
  removeButton: { 
    backgroundColor: BRAND.errorColor 
  },
  
  deleteButton: { 
    backgroundColor: '#666' 
  },
  
  actionButtonText: { 
    color: 'white', 
    fontSize: 12, 
    fontWeight: 'bold', 
    textAlign: 'center' 
  },

  // ============================================================================
  // MODAL COMPONENTS
  // ============================================================================
  modalContainer: { 
    flex: 1, 
    backgroundColor: BRAND.backgroundColor 
  },
  
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: BRAND.accentColor 
  },
  
  modalCloseText: { 
    color: BRAND.errorColor, 
    fontSize: 16 
  },
  
  modalTitle: { 
    color: 'white', 
    fontSize: 18, 
    fontWeight: 'bold' 
  },
  
  modalSaveText: { 
    color: BRAND.primaryColor, 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  
  modalContent: { 
    flex: 1, 
    padding: 16 
  },

  // ============================================================================
  // FORM COMPONENTS
  // ============================================================================
  formGroup: { 
    marginBottom: 20 
  },
  
  formLabel: { 
    color: 'white', 
    fontSize: 16, 
    fontWeight: 'bold', 
    marginBottom: 8 
  },
  
  formInput: { 
    backgroundColor: BRAND.accentColor, 
    color: 'white', 
    padding: 12, 
    borderRadius: 8, 
    fontSize: 16 
  },
  
  textArea: { 
    height: 80, 
    textAlignVertical: 'top' 
  },

  // ============================================================================
  // CATEGORY SELECTION
  // ============================================================================
  categoryContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between' 
  },
  
  categoryButton: { 
    flex: 1, 
    padding: 12, 
    backgroundColor: BRAND.accentColor, 
    borderRadius: 8, 
    marginHorizontal: 4, 
    alignItems: 'center' 
  },
  
  categoryButtonSelected: { 
    backgroundColor: BRAND.primaryColor 
  },
  
  categoryButtonText: { 
    color: 'white', 
    fontSize: 14, 
    fontWeight: 'bold' 
  },
  
  categoryButtonTextSelected: { 
    color: BRAND.backgroundColor 
  },

  // ============================================================================
  // INPUT CONTAINERS
  // ============================================================================
  inputContainer: { 
    flexDirection: 'row', 
    marginBottom: 12 
  },
  
  textInput: { 
    flex: 1, 
    backgroundColor: BRAND.accentColor, 
    color: 'white', 
    padding: 12, 
    borderRadius: 8, 
    fontSize: 16, 
    marginRight: 8 
  },
  
  addButton: { 
    backgroundColor: BRAND.primaryColor, 
    paddingHorizontal: 16, 
    justifyContent: 'center', 
    borderRadius: 8 
  },
  
  addButtonText: { 
    color: BRAND.backgroundColor, 
    fontSize: 14, 
    fontWeight: 'bold' 
  },

  // ============================================================================
  // LIST ITEMS (Classes & Subjects)
  // ============================================================================
  classItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: BRAND.backgroundColor, 
    padding: 8, 
    borderRadius: 6, 
    marginRight: 8, 
    marginBottom: 8 
  },
  
  classText: { 
    color: 'white', 
    fontSize: 14, 
    marginRight: 8 
  },
  
  removeText: { 
    color: BRAND.errorColor, 
    fontSize: 16, 
    fontWeight: 'bold' 
  },

  // ============================================================================
  // SELECTOR BUTTONS
  // ============================================================================
  selectorButton: { 
    backgroundColor: BRAND.accentColor, 
    padding: 16, 
    borderRadius: 8, 
    alignItems: 'center' 
  },
  
  selectorButtonText: { 
    color: 'white', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },

  // ============================================================================
  // CHECKBOX COMPONENTS
  // ============================================================================
  checkboxContainer: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  
  checkbox: { 
    width: 20, 
    height: 20, 
    borderWidth: 2, 
    borderColor: BRAND.primaryColor, 
    borderRadius: 4, 
    marginRight: 12, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  
  checkboxChecked: { 
    backgroundColor: BRAND.primaryColor 
  },
  
  checkboxCheck: { 
    color: BRAND.backgroundColor, 
    fontSize: 12, 
    fontWeight: 'bold' 
  },
  
  checkboxLabel: { 
    color: 'white', 
    fontSize: 16 
  },

  // ============================================================================
  // USER SELECTION ITEMS
  // ============================================================================
  userItem: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    backgroundColor: BRAND.accentColor, 
    padding: 16, 
    marginBottom: 8, 
    borderRadius: 8 
  },
  
  userItemSelected: { 
    backgroundColor: BRAND.primaryColor + '20', 
    borderWidth: 1, 
    borderColor: BRAND.primaryColor 
  },
  
  userName: { 
    color: 'white', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  
  userEmail: { 
    color: '#ccc', 
    fontSize: 14 
  },
  
  selectionCheck: { 
    color: BRAND.primaryColor, 
    fontSize: 20, 
    fontWeight: 'bold' 
  },
  warningButton: { 
  backgroundColor: BRAND.warningColor 
},
});

