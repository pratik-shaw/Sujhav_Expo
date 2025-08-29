import React, { useState, useEffect } from 'react';
import {
  View, Text, Modal, FlatList, TouchableOpacity, TextInput,
  Alert, SafeAreaView, StyleSheet, ScrollView, ActivityIndicator,
  RefreshControl, StatusBar, GestureResponderEvent
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

const API_BASE_URL = API_BASE;

// Enhanced timeout wrapper with proper typing
const fetchWithTimeout = (url: string, options: RequestInit, timeoutMs: number = 15000): Promise<Response> => {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      reject(new Error('Request timeout'));
    }, timeoutMs);

    fetch(url, { ...options, signal: controller.signal })
      .then((response) => {
        clearTimeout(timeoutId);
        resolve(response);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          reject(new Error('Request timeout'));
        } else {
          reject(error);
        }
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
  enrolledAt?: string;
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
  onSuccess?: () => void; // Added for refresh callback
}

interface ApiResponse {
  success: boolean;
  data?: BatchData;
  message?: string;
}

interface ApiError {
  message?: string;
}

export default function BatchAssignmentModal({
  visible,
  onClose,
  batch,
  type,
  onAssign,
  onRemove,
  onSuccess
}: BatchAssignmentModalProps) {
  const [searchText, setSearchText] = useState<string>('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [studentAssignments, setStudentAssignments] = useState<Record<string, StudentAssignment>>({});
  const [teacherAssignments, setTeacherAssignments] = useState<Record<string, TeacherAssignment>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [batchData, setBatchData] = useState<BatchData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [networkRetryCount, setNetworkRetryCount] = useState<number>(0);

  useEffect(() => {
    if (visible && batch) {
      loadBatchData();
      resetState();
    }
  }, [visible, type, batch?._id]);

  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    try {
      const tokenKeys = ['authToken', 'token', 'userToken', 'accessToken'];
      let token: string | null = null;
      
      for (const key of tokenKeys) {
        token = await AsyncStorage.getItem(key);
        if (token) break;
      }
      
      const headers: Record<string, string> = { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
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
    setNetworkRetryCount(0);
  };

  const loadBatchData = async (retryCount: number = 0) => {
    if (!batch?._id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const headers = await getAuthHeaders();
      let endpoint = '';
      
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

      console.log('Loading data from:', endpoint);

      const response = await fetchWithTimeout(endpoint, {
        method: 'GET',
        headers,
      }, 15000);

      console.log('Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        
        if (response.status === 401) {
          throw new Error('Authentication failed. Please login again.');
        } else if (response.status === 403) {
          throw new Error('Access denied. Administrator privileges required.');
        } else if (response.status === 404) {
          throw new Error('Batch not found or endpoint unavailable.');
        } else if (response.status >= 500) {
          throw new Error('Server error. Please try again later.');
        } else {
          throw new Error(`Request failed: ${response.status} ${response.statusText}`);
        }
      }

      const data: ApiResponse = await response.json();
      console.log('Received data structure:', JSON.stringify(data, null, 2));
      
      if (data.success && data.data) {
        setBatchData(data.data);
        setNetworkRetryCount(0); // Reset retry count on success
      } else {
        throw new Error(data.message || 'Failed to load batch data');
      }
    } catch (error: unknown) {
      console.error('Error loading batch data:', error);
      
      let errorMessage = 'Failed to load data';
      const err = error as Error;
      
      if (err.message === 'Request timeout') {
        errorMessage = 'Request timed out. Please check your connection and try again.';
      } else if (err.message.includes('Network request failed') || err.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your internet connection.';
        // Auto-retry network errors up to 2 times
        if (retryCount < 2) {
          console.log(`Retrying network request, attempt ${retryCount + 1}`);
          setTimeout(() => {
            setNetworkRetryCount(retryCount + 1);
            loadBatchData(retryCount + 1);
          }, 2000 * (retryCount + 1)); // Progressive backoff
          return;
        }
      } else if (err.message.includes('Authentication failed')) {
        errorMessage = 'Please login again to continue.';
      } else if (err.message.includes('Access denied')) {
        errorMessage = 'You do not have permission to perform this action.';
      } else {
        errorMessage = err.message || 'An unexpected error occurred';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setError(null);
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

  const getUsers = (): User[] => {
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

  const filteredUsers = getUsers().filter((user: User) =>
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
            ? assignment.assignedClasses.filter((c: string) => c !== className)
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
              ? assignment.assignedSubjects.filter((s: string) => s !== subjectName)
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
              ? assignment.assignedSubjects.filter((s: string) => s !== subjectName)
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
        await removeStudents(selectedUsers);
      } else if (type === 'assign_students') {
        const assignments = Object.values(studentAssignments);
        const invalidAssignments = assignments.filter((a: StudentAssignment) => 
          a.assignedClasses.length === 0 && a.assignedSubjects.length === 0
        );
        
        if (invalidAssignments.length > 0) {
          Alert.alert('Error', 'Please assign at least one class or subject to each selected student');
          return;
        }
        
        await assignStudentsEnhanced(assignments);
      } else if (type === 'assign_teachers') {
        const assignments = Object.values(teacherAssignments);
        const invalidAssignments = assignments.filter((a: TeacherAssignment) => a.assignedSubjects.length === 0);
        
        if (invalidAssignments.length > 0) {
          Alert.alert('Error', 'Please assign at least one subject to each selected teacher');
          return;
        }
        
        await assignTeachersEnhanced(assignments);
      }
      
      // Call success callback to refresh parent component
      if (onSuccess) {
        onSuccess();
      }
      
      Alert.alert('Success', 'Assignment completed successfully', [
        { text: 'OK', onPress: onClose }
      ]);
      
    } catch (error: unknown) {
      console.error('Assignment error:', error);
      const err = error as Error;
      Alert.alert('Error', err.message || 'Failed to complete assignment');
    } finally {
      setLoading(false);
    }
  };

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
      15000
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Assignment failed: ${response.status}`;
      
      try {
        const errorData: ApiError = JSON.parse(errorText);
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        // Keep default error message if JSON parsing fails
      }
      
      throw new Error(errorMessage);
    }

    const result: ApiResponse = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Assignment failed');
    }
  };

  const removeStudents = async (studentIds: string[]) => {
    if (!batch?._id) throw new Error('Batch ID is required');
    
    const headers = await getAuthHeaders();
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/batches/${batch._id}/remove-students`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ studentIds })
      },
      15000
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Removal failed: ${response.status}`;
      
      try {
        const errorData: ApiError = JSON.parse(errorText);
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        // Keep default error message
      }
      
      throw new Error(errorMessage);
    }

    const result: ApiResponse = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Removal failed');
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
      15000
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Teacher assignment failed: ${response.status}`;
      
      try {
        const errorData: ApiError = JSON.parse(errorText);
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        // Keep default error message
      }
      
      throw new Error(errorMessage);
    }

    const result: ApiResponse = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Teacher assignment failed');
    }
  };

  const renderStatistics = () => {
    if (!batchData?.statistics || type === 'view_assignments') return null;

    return (
      <View style={styles.statisticsContainer}>
        <Text style={styles.statisticsTitle}>Batch Statistics</Text>
        <View style={styles.statisticsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{batchData.statistics.totalStudents || 0}</Text>
            <Text style={styles.statLabel}>Students</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{batchData.statistics.assignedTeachers || 0}</Text>
            <Text style={styles.statLabel}>Teachers</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{batchData.statistics.totalSubjects || 0}</Text>
            <Text style={styles.statLabel}>Subjects</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{batchData.statistics.totalClasses || 0}</Text>
            <Text style={styles.statLabel}>Classes</Text>
          </View>
        </View>
        {batchData.statistics.unassignedSubjects > 0 && (
          <View style={styles.warningContainer}>
            <Text style={styles.warningText}>
              {batchData.statistics.unassignedSubjects} subject(s) without teachers
            </Text>
          </View>
        )}
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
                {item.enrolledAt && (
                  <View style={styles.assignmentInfo}>
                    <Text style={styles.assignmentLabel}>Enrolled: </Text>
                    <Text style={styles.assignmentText}>
                      {new Date(item.enrolledAt).toLocaleDateString()}
                    </Text>
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
                  {batchData.availableClasses.map((className: string, index: number) => (
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
                  {batchData.availableSubjects.map((subject: Subject, index: number) => {
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
          <Text style={styles.loadingText}>
            {networkRetryCount > 0 ? `Retrying... (${networkRetryCount}/2)` : 'Loading data...'}
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadBatchData()}>
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
          {!batchData && (
            <TouchableOpacity style={styles.retryButton} onPress={() => loadBatchData()}>
              <Text style={styles.retryButtonText}>Load Data</Text>
            </TouchableOpacity>
          )}
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

  const handleButtonPress = () => {
    handleAssign();
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
                  (selectedUsers.length === 0 || loading) && styles.confirmButtonDisabled
                ]}
                onPress={handleButtonPress}
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
    color: '#aaa',
    marginTop: 4,
  },
  errorBanner: {
    backgroundColor: BRAND.errorColor,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 8,
  },
  errorBannerText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  statisticsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.accentColor,
  },
  statisticsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: BRAND.primaryColor,
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: '#aaa',
    marginTop: 2,
  },
  warningContainer: {
    backgroundColor: BRAND.warningColor,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 10,
  },
  warningText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  searchInput: {
    backgroundColor: BRAND.accentColor,
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: BRAND.primaryColor,
  },
  selectionSummary: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: BRAND.accentColor,
  },
  selectionText: {
    color: BRAND.primaryColor,
    fontSize: 14,
    textAlign: 'center',
  },
  contentContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    color: '#aaa',
    fontSize: 16,
    marginTop: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    color: BRAND.errorColor,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: BRAND.primaryColor,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: BRAND.secondaryColor,
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    color: '#aaa',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
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
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  userItemSelected: {
    borderColor: BRAND.primaryColor,
    backgroundColor: `${BRAND.primaryColor}20`,
  },
  userItemAssigned: {
    borderColor: BRAND.successColor,
    backgroundColor: `${BRAND.successColor}20`,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  userEmail: {
    fontSize: 14,
    color: '#aaa',
    marginTop: 2,
  },
  currentAssignments: {
    marginTop: 8,
  },
  assignmentInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  assignmentLabel: {
    fontSize: 12,
    color: BRAND.primaryColor,
    fontWeight: 'bold',
  },
  assignmentText: {
    fontSize: 12,
    color: '#ccc',
    flex: 1,
  },
  selectionCheck: {
    fontSize: 20,
    color: BRAND.primaryColor,
    fontWeight: 'bold',
  },
  assignedBadge: {
    fontSize: 10,
    color: BRAND.successColor,
    fontWeight: 'bold',
    backgroundColor: `${BRAND.successColor}30`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  assignmentContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  assignmentSection: {
    marginBottom: 12,
  },
  assignmentTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: BRAND.primaryColor,
    marginBottom: 8,
  },
  assignmentChip: {
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  assignmentChipSelected: {
    backgroundColor: BRAND.primaryColor,
    borderColor: BRAND.primaryColor,
  },
  assignmentChipText: {
    fontSize: 12,
    color: '#fff',
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
    backgroundColor: '#333',
    paddingVertical: 15,
    borderRadius: 8,
    marginRight: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: BRAND.primaryColor,
    paddingVertical: 15,
    borderRadius: 8,
    marginLeft: 10,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#555',
  },
  confirmButtonText: {
    color: BRAND.secondaryColor,
    fontSize: 16,
    fontWeight: 'bold',
  },
});