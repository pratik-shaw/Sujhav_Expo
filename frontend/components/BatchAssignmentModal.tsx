import React, { useState, useEffect } from 'react';
import {
  View, Text, Modal, FlatList, TouchableOpacity, TextInput,
  Alert, SafeAreaView, StyleSheet, ScrollView, ActivityIndicator,
  RefreshControl, StatusBar
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '../config/api';

// Brand configuration
const BRAND = {
  primaryColor: '#00ff88',
  secondaryColor: '#000000',
  backgroundColor: '#0a1a0a',
  accentColor: '#1a2e1a',
  errorColor: '#ff6b6b',
  warningColor: '#ffa726',
  goldColor: '#ffd700',
  successColor: '#4caf50',
  infoColor: '#2196f3',
};

// Use the same API base URL as the main screen
const API_BASE_URL = API_BASE;

// Create a timeout wrapper for fetch that works in React Native with proper types
const fetchWithTimeout = (url: string, options: RequestInit, timeoutMs: number = 10000): Promise<Response> => {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Request timeout'));
    }, timeoutMs);

    fetch(url, options)
      .then((response: Response) => {
        clearTimeout(timeoutId);
        resolve(response);
      })
      .catch((error: Error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
};

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'user' | 'teacher';
  isAssigned?: boolean;
  assignedClasses?: string[];
  assignedSubjects?: string[];
}

interface Subject {
  _id?: string;
  name: string;
  teacher?: User | string;
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

interface StudentAssignment {
  studentId: string;
  assignedClasses: string[];
  assignedSubjects: string[];
}

interface TeacherAssignment {
  teacherId: string;
  assignedSubjects: string[];
}

interface BatchData {
  batch: Batch;
  students?: User[];
  teachers?: User[];
  availableClasses?: string[];
  availableSubjects?: Subject[];
  statistics?: {
    totalStudents: number;
    totalSubjects: number;
    totalClasses: number;
    assignedTeachers: number;
    unassignedSubjects: number;
    isActive: boolean;
  };
}

interface BatchAssignmentModalProps {
  visible: boolean;
  onClose: () => void;
  batch: Batch | null;
  type: 'assign_students' | 'remove_students' | 'assign_teachers' | 'view_assignments';
  onAssign?: (assignments: StudentAssignment[] | TeacherAssignment[]) => void;
  onRemove?: (userIds: string[]) => void;
}

export default function BatchAssignmentModal({
  visible,
  onClose,
  batch,
  type,
  onAssign,
  onRemove
}: BatchAssignmentModalProps) {
  const [searchText, setSearchText] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [studentAssignments, setStudentAssignments] = useState<Record<string, StudentAssignment>>({});
  const [teacherAssignments, setTeacherAssignments] = useState<Record<string, TeacherAssignment>>({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [batchData, setBatchData] = useState<BatchData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible && batch) {
      loadBatchData();
      resetState();
    }
  }, [visible, type, batch?._id]);

  // Get auth headers using the same method as the main screen
  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    try {
      const token = await AsyncStorage.getItem('authToken') || 
                    await AsyncStorage.getItem('token') || 
                    await AsyncStorage.getItem('userToken') ||
                    await AsyncStorage.getItem('accessToken');
      
      const headers: Record<string, string> = { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      return headers;
    } catch (error) {
      console.error('Error getting auth headers:', error);
      return { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
    }
  };

  const resetState = () => {
    setSearchText('');
    setSelectedUsers([]);
    setStudentAssignments({});
    setTeacherAssignments({});
    setError(null);
  };

  const loadBatchData = async () => {
    if (!batch?._id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const headers = await getAuthHeaders();
      let endpoint = '';
      
      // Construct proper endpoint URLs
      switch (type) {
        case 'assign_students':
        case 'remove_students':
        case 'view_assignments':
          endpoint = `${API_BASE_URL}/batches/${batch._id}/students-assignments`;
          break;
        case 'assign_teachers':
          endpoint = `${API_BASE_URL}/batches/${batch._id}/teachers-assignments`;
          break;
        default:
          throw new Error('Invalid assignment type');
      }

      console.log('Making request to:', endpoint);

      // Use the React Native compatible timeout wrapper with proper typing
      const response: Response = await fetchWithTimeout(endpoint, {
        method: 'GET',
        headers,
      }, 10000); // 10 second timeout

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('Error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText || 'Request failed'}`);
      }

      const data = await response.json();
      console.log('Response data:', data);
      
      if (data.success) {
        setBatchData(data.data);
      } else {
        throw new Error(data.message || 'Failed to load data');
      }
    } catch (error: any) {
      console.error('Error loading batch data:', error);
      let errorMessage = 'Network error occurred';
      
      if (error.message === 'Request timeout') {
        errorMessage = 'Request timed out. Please try again.';
      } else if (error.message.includes('Network request failed')) {
        errorMessage = 'Cannot connect to server. Please check your internet connection.';
      } else if (error.message.includes('404')) {
        errorMessage = 'API endpoint not found. Please verify the server routes.';
      } else if (error.message.includes('401')) {
        errorMessage = 'Authentication failed. Please login again.';
      } else if (error.message.includes('403')) {
        errorMessage = 'Access denied. Administrator privileges required.';
      } else if (error.message.includes('500')) {
        errorMessage = 'Server error. Please try again later.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBatchData();
    setRefreshing(false);
  };

  const getModalTitle = () => {
    switch (type) {
      case 'assign_students': return 'Assign Students';
      case 'remove_students': return 'Remove Students';
      case 'assign_teachers': return 'Assign Teachers';
      case 'view_assignments': return 'View Assignments';
      default: return 'Assignment';
    }
  };

  const getUsers = () => {
    if (!batchData) return [];
    
    switch (type) {
      case 'assign_students':
        return batchData.students?.filter(user => !user.isAssigned) || [];
      case 'remove_students':
      case 'view_assignments':
        return batchData.students?.filter(user => user.isAssigned) || [];
      case 'assign_teachers':
        return batchData.teachers || [];
      default:
        return [];
    }
  };

  const filteredUsers = getUsers().filter(user =>
    user.name.toLowerCase().includes(searchText.toLowerCase()) ||
    user.email.toLowerCase().includes(searchText.toLowerCase())
  );

  const toggleUserSelection = (userId: string) => {
    const isSelected = selectedUsers.includes(userId);
    
    if (isSelected) {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
      // Remove from assignments
      if (type === 'assign_students') {
        setStudentAssignments(prev => {
          const newAssignments = { ...prev };
          delete newAssignments[userId];
          return newAssignments;
        });
      } else if (type === 'assign_teachers') {
        setTeacherAssignments(prev => {
          const newAssignments = { ...prev };
          delete newAssignments[userId];
          return newAssignments;
        });
      }
    } else {
      setSelectedUsers(prev => [...prev, userId]);
      // Initialize assignment
      if (type === 'assign_students') {
        setStudentAssignments(prev => ({
          ...prev,
          [userId]: {
            studentId: userId,
            assignedClasses: [],
            assignedSubjects: []
          }
        }));
      } else if (type === 'assign_teachers') {
        setTeacherAssignments(prev => ({
          ...prev,
          [userId]: {
            teacherId: userId,
            assignedSubjects: []
          }
        }));
      }
    }
  };

  const toggleClassForStudent = (studentId: string, className: string) => {
    setStudentAssignments(prev => {
      const assignment = prev[studentId];
      if (!assignment) return prev;
      
      const isSelected = assignment.assignedClasses.includes(className);
      return {
        ...prev,
        [studentId]: {
          ...assignment,
          assignedClasses: isSelected
            ? assignment.assignedClasses.filter(c => c !== className)
            : [...assignment.assignedClasses, className]
        }
      };
    });
  };

  const toggleSubjectForUser = (userId: string, subjectName: string, isTeacher: boolean = false) => {
    if (isTeacher) {
      setTeacherAssignments(prev => {
        const assignment = prev[userId];
        if (!assignment) return prev;
        
        const isSelected = assignment.assignedSubjects.includes(subjectName);
        return {
          ...prev,
          [userId]: {
            ...assignment,
            assignedSubjects: isSelected
              ? assignment.assignedSubjects.filter(s => s !== subjectName)
              : [...assignment.assignedSubjects, subjectName]
          }
        };
      });
    } else {
      setStudentAssignments(prev => {
        const assignment = prev[userId];
        if (!assignment) return prev;
        
        const isSelected = assignment.assignedSubjects.includes(subjectName);
        return {
          ...prev,
          [userId]: {
            ...assignment,
            assignedSubjects: isSelected
              ? assignment.assignedSubjects.filter(s => s !== subjectName)
              : [...assignment.assignedSubjects, subjectName]
          }
        };
      });
    }
  };

  const handleAssign = async () => {
    if (selectedUsers.length === 0) {
      Alert.alert('Error', 'Please select at least one user');
      return;
    }

    setLoading(true);
    try {
      if (type === 'remove_students') {
        if (onRemove) {
          await onRemove(selectedUsers);
        }
      } else if (type === 'assign_students') {
        // Fixed: Use the enhanced assignment endpoint
        const assignments = Object.values(studentAssignments);
        const invalidAssignments = assignments.filter(a => 
          a.assignedClasses.length === 0 && a.assignedSubjects.length === 0
        );
        
        if (invalidAssignments.length > 0) {
          Alert.alert('Error', 'Please assign at least one class or subject to each selected student');
          return;
        }
        
        // Make the API call directly here instead of relying on onAssign
        await assignStudentsEnhanced(assignments);
      } else if (type === 'assign_teachers') {
        // Fixed: Use the enhanced assignment endpoint
        const assignments = Object.values(teacherAssignments);
        const invalidAssignments = assignments.filter(a => a.assignedSubjects.length === 0);
        
        if (invalidAssignments.length > 0) {
          Alert.alert('Error', 'Please assign at least one subject to each selected teacher');
          return;
        }
        
        // Make the API call directly here instead of relying on onAssign
        await assignTeachersEnhanced(assignments);
      }
      
      onClose();
    } catch (error) {
      console.error('Assignment error:', error);
      Alert.alert('Error', 'Failed to complete assignment');
    } finally {
      setLoading(false);
    }
  };

  // Fixed: Add the enhanced assignment functions
  const assignStudentsEnhanced = async (assignments: StudentAssignment[]) => {
    if (!batch?._id) throw new Error('Batch ID is required');
    
    const headers = await getAuthHeaders();
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/batches/${batch._id}/assign-students-enhanced`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ studentAssignments: assignments })
      },
      10000
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Assignment failed: ${errorText}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Assignment failed');
    }
  };

  const assignTeachersEnhanced = async (assignments: TeacherAssignment[]) => {
    if (!batch?._id) throw new Error('Batch ID is required');
    
    const headers = await getAuthHeaders();
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/batches/${batch._id}/assign-teachers-enhanced`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ teacherAssignments: assignments })
      },
      10000
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Assignment failed: ${errorText}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Assignment failed');
    }
  };

  const renderStatistics = () => {
    if (!batchData?.statistics || type === 'view_assignments') return null;

    return (
      <View style={styles.statisticsContainer}>
        <Text style={styles.statisticsTitle}>Batch Statistics</Text>
        <View style={styles.statisticsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{batchData.statistics.totalStudents}</Text>
            <Text style={styles.statLabel}>Students</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{batchData.statistics.assignedTeachers}</Text>
            <Text style={styles.statLabel}>Teachers</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{batchData.statistics.totalSubjects}</Text>
            <Text style={styles.statLabel}>Subjects</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{batchData.statistics.totalClasses}</Text>
            <Text style={styles.statLabel}>Classes</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderUserItem = ({ item }: { item: User }) => {
    const isSelected = selectedUsers.includes(item._id);
    const studentAssignment = type !== 'assign_teachers' ? studentAssignments[item._id] : undefined;
    const teacherAssignment = type === 'assign_teachers' ? teacherAssignments[item._id] : undefined;

    return (
      <View style={styles.userContainer}>
        <TouchableOpacity
          style={[
            styles.userItem,
            isSelected && styles.userItemSelected,
            item.isAssigned && type === 'view_assignments' && styles.userItemAssigned
          ]}
          onPress={() => type !== 'view_assignments' && toggleUserSelection(item._id)}
          disabled={type === 'view_assignments'}
        >
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{item.name}</Text>
            <Text style={styles.userEmail}>{item.email}</Text>
            
            {/* Show current assignments in view mode */}
            {type === 'view_assignments' && item.isAssigned && (
              <View style={styles.currentAssignments}>
                {item.assignedClasses && item.assignedClasses.length > 0 && (
                  <View style={styles.assignmentInfo}>
                    <Text style={styles.assignmentLabel}>Classes: </Text>
                    <Text style={styles.assignmentText}>{item.assignedClasses.join(', ')}</Text>
                  </View>
                )}
                {item.assignedSubjects && item.assignedSubjects.length > 0 && (
                  <View style={styles.assignmentInfo}>
                    <Text style={styles.assignmentLabel}>Subjects: </Text>
                    <Text style={styles.assignmentText}>{item.assignedSubjects.join(', ')}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
          
          {isSelected && type !== 'view_assignments' && <Text style={styles.selectionCheck}>✓</Text>}
          {item.isAssigned && type === 'view_assignments' && <Text style={styles.assignedBadge}>ASSIGNED</Text>}
        </TouchableOpacity>

        {/* Assignment controls for selected users */}
        {isSelected && type !== 'remove_students' && type !== 'view_assignments' && (
          <View style={styles.assignmentContainer}>
            {type === 'assign_students' && batchData?.availableClasses && batchData.availableClasses.length > 0 && (
              <View style={styles.assignmentSection}>
                <Text style={styles.assignmentTitle}>Classes:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {batchData.availableClasses.map((className, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.assignmentChip,
                        studentAssignment?.assignedClasses?.includes(className) && styles.assignmentChipSelected
                      ]}
                      onPress={() => toggleClassForStudent(item._id, className)}
                    >
                      <Text style={[
                        styles.assignmentChipText,
                        studentAssignment?.assignedClasses?.includes(className) && styles.assignmentChipTextSelected
                      ]}>
                        {className}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {batchData?.availableSubjects && batchData.availableSubjects.length > 0 && (
              <View style={styles.assignmentSection}>
                <Text style={styles.assignmentTitle}>Subjects:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {batchData.availableSubjects.map((subject, index) => {
                    const currentAssignment = type === 'assign_teachers' ? teacherAssignment : studentAssignment;
                    return (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.assignmentChip,
                          currentAssignment?.assignedSubjects?.includes(subject.name) && styles.assignmentChipSelected
                        ]}
                        onPress={() => toggleSubjectForUser(item._id, subject.name, type === 'assign_teachers')}
                      >
                        <Text style={[
                          styles.assignmentChipText,
                          currentAssignment?.assignedSubjects?.includes(subject.name) && styles.assignmentChipTextSelected
                        ]}>
                          {subject.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderContent = () => {
    if (loading && !refreshing) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BRAND.primaryColor} />
          <Text style={styles.loadingText}>Loading data...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadBatchData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!batchData || filteredUsers.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {type === 'assign_students' ? 'No eligible students found' :
             type === 'remove_students' ? 'No assigned students found' :
             type === 'assign_teachers' ? 'No teachers found' :
             'No assignments found'}
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item._id}
        renderItem={renderUserItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[BRAND.primaryColor]}
            tintColor={BRAND.primaryColor}
          />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalOverlay}>
        <StatusBar barStyle="light-content" backgroundColor={BRAND.backgroundColor} />
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{getModalTitle()}</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Batch Info */}
          <View style={styles.batchInfo}>
            <Text style={styles.batchName}>{batch?.batchName}</Text>
            <Text style={styles.batchCategory}>
              {batch?.category?.toUpperCase()} • {batch?.classes.join(', ')}
            </Text>
          </View>

          {/* Error Display */}
          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          )}

          {/* Statistics */}
          {renderStatistics()}

          {/* Search */}
          {type !== 'view_assignments' && (
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search users..."
                placeholderTextColor="#666"
                value={searchText}
                onChangeText={setSearchText}
              />
            </View>
          )}

          {/* Selection Summary */}
          {selectedUsers.length > 0 && type !== 'view_assignments' && (
            <View style={styles.selectionSummary}>
              <Text style={styles.selectionText}>
                {selectedUsers.length} user(s) selected
              </Text>
            </View>
          )}

          {/* Content */}
          <View style={styles.contentContainer}>
            {renderContent()}
          </View>

          {/* Action Buttons */}
          {type !== 'view_assignments' && (
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  selectedUsers.length === 0 && styles.confirmButtonDisabled
                ]}
                onPress={handleAssign}
                disabled={loading || selectedUsers.length === 0}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={BRAND.secondaryColor} />
                ) : (
                  <Text style={styles.confirmButtonText}>
                    {type === 'assign_students' ? 'Assign Students' :
                     type === 'remove_students' ? 'Remove Students' :
                     type === 'assign_teachers' ? 'Assign Teachers' : 'Confirm'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: BRAND.backgroundColor,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: BRAND.backgroundColor,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.accentColor,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: BRAND.primaryColor,
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 20,
    color: BRAND.primaryColor,
  },
  batchInfo: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.accentColor,
  },
  batchName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  batchCategory: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 5,
  },
  errorBanner: {
    backgroundColor: BRAND.errorColor,
    padding: 15,
    marginHorizontal: 20,
    marginVertical: 10,
    borderRadius: 8,
  },
  errorBannerText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 14,
  },
  statisticsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  statisticsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  statisticsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: BRAND.primaryColor,
  },
  statLabel: {
    fontSize: 12,
    color: '#ccc',
    marginTop: 2,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  searchInput: {
    backgroundColor: BRAND.accentColor,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
  },
  selectionSummary: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: BRAND.accentColor,
    marginHorizontal: 20,
    borderRadius: 8,
    marginBottom: 10,
  },
  selectionText: {
    color: BRAND.primaryColor,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
  contentContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ccc',
    marginTop: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    color: BRAND.errorColor,
    textAlign: 'center',
    fontSize: 16,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: BRAND.primaryColor,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: BRAND.secondaryColor,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyText: {
    color: '#ccc',
    textAlign: 'center',
    fontSize: 16,
  },
  listContainer: {
    paddingBottom: 20,
  },
  userContainer: {
    marginHorizontal: 20,
    marginVertical: 8,
  },
  userItem: {
    backgroundColor: BRAND.accentColor,
    borderRadius: 8,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userItemSelected: {
    backgroundColor: BRAND.primaryColor + '20',
    borderWidth: 2,
    borderColor: BRAND.primaryColor,
  },
  userItemAssigned: {
    backgroundColor: BRAND.successColor + '20',
    borderWidth: 1,
    borderColor: BRAND.successColor,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userEmail: {
    color: '#ccc',
    fontSize: 14,
    marginTop: 2,
  },
  currentAssignments: {
    marginTop: 8,
  },
  assignmentInfo: {
    flexDirection: 'row',
    marginTop: 4,
  },
  assignmentLabel: {
    color: BRAND.primaryColor,
    fontSize: 12,
    fontWeight: 'bold',
  },
  assignmentText: {
    color: '#ccc',
    fontSize: 12,
    flex: 1,
  },
  selectionCheck: {
    color: BRAND.primaryColor,
    fontSize: 18,
    fontWeight: 'bold',
  },
  assignedBadge: {
    color: BRAND.successColor,
    fontSize: 10,
    fontWeight: 'bold',
    backgroundColor: BRAND.successColor + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  assignmentContainer: {
    backgroundColor: BRAND.backgroundColor,
    borderRadius: 8,
    padding: 15,
    marginTop: 8,
  },
  assignmentSection: {
    marginBottom: 15,
  },
  assignmentTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  assignmentChip: {
    backgroundColor: BRAND.accentColor,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  assignmentChipSelected: {
    backgroundColor: BRAND.primaryColor,
    borderColor: BRAND.primaryColor,
  },
  assignmentChipText: {
    color: '#ccc',
    fontSize: 12,
  },
  assignmentChipTextSelected: {
    color: BRAND.secondaryColor,
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: BRAND.accentColor,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: BRAND.primaryColor,
    borderRadius: 8,
    paddingVertical: 12,
    marginRight: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: BRAND.primaryColor,
    fontSize: 16,
    fontWeight: 'bold',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: BRAND.primaryColor,
    borderRadius: 8,
    paddingVertical: 12,
    marginLeft: 10,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: BRAND.accentColor,
    opacity: 0.5,
  },
  confirmButtonText: {
    color: BRAND.secondaryColor,
    fontSize: 16,
    fontWeight: 'bold',
  },
});