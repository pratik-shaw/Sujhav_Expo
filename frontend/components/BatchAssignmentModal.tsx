import React, { useState, useEffect } from 'react';
import {
  View, Text, Modal, FlatList, TouchableOpacity, TextInput,
  Alert, SafeAreaView, StyleSheet, ScrollView, ActivityIndicator
} from 'react-native';

// Brand configuration
const BRAND = {
  primaryColor: '#00ff88',
  secondaryColor: '#000000',
  backgroundColor: '#0a1a0a',
  accentColor: '#1a2e1a',
  errorColor: '#ff6b6b',
  warningColor: '#ffa726',
  goldColor: '#ffd700',
};

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'user' | 'teacher';
}

interface Subject {
  _id?: string;
  name: string;
  teacher?: string;
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

interface BatchAssignmentModalProps {
  visible: boolean;
  onClose: () => void;
  batch: Batch | null;
  availableUsers: User[];
  allTeachers: User[];
  type: 'assign_students' | 'remove_students' | 'assign_teachers';
  onAssign: (assignments: StudentAssignment[] | TeacherAssignment[]) => void;
}

export default function BatchAssignmentModal({
  visible,
  onClose,
  batch,
  availableUsers,
  allTeachers,
  type,
  onAssign
}: BatchAssignmentModalProps) {
  const [searchText, setSearchText] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [studentAssignments, setStudentAssignments] = useState<Record<string, StudentAssignment>>({});
  const [teacherAssignments, setTeacherAssignments] = useState<Record<string, TeacherAssignment>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      resetState();
    }
  }, [visible, type]);

  const resetState = () => {
    setSearchText('');
    setSelectedUsers([]);
    setStudentAssignments({});
    setTeacherAssignments({});
  };

  const getModalTitle = () => {
    switch (type) {
      case 'assign_students': return 'Assign Students';
      case 'remove_students': return 'Remove Students';
      case 'assign_teachers': return 'Assign Teachers';
      default: return 'Assignment';
    }
  };

  const getUsers = () => {
    switch (type) {
      case 'assign_students':
        return availableUsers.filter(user => user.role === 'user');
      case 'remove_students':
        return batch?.students || [];
      case 'assign_teachers':
        return allTeachers;
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
      if (type === 'assign_students' || type === 'remove_students') {
        setStudentAssignments(prev => {
          const newAssignments = { ...prev };
          delete newAssignments[userId];
          return newAssignments;
        });
      } else {
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

  const handleAssign = () => {
    if (selectedUsers.length === 0) {
      Alert.alert('Error', 'Please select at least one user');
      return;
    }

    if (type === 'remove_students') {
      // For removal, we just need the student IDs
      onAssign(selectedUsers.map(id => ({ studentId: id, assignedClasses: [], assignedSubjects: [] })));
      return;
    }

    if (type === 'assign_students') {
      const assignments = Object.values(studentAssignments);
      const invalidAssignments = assignments.filter(a => 
        a.assignedClasses.length === 0 && a.assignedSubjects.length === 0
      );
      
      if (invalidAssignments.length > 0) {
        Alert.alert('Error', 'Please assign at least one class or subject to each selected student');
        return;
      }
      
      onAssign(assignments);
    } else if (type === 'assign_teachers') {
      const assignments = Object.values(teacherAssignments);
      const invalidAssignments = assignments.filter(a => a.assignedSubjects.length === 0);
      
      if (invalidAssignments.length > 0) {
        Alert.alert('Error', 'Please assign at least one subject to each selected teacher');
        return;
      }
      
      onAssign(assignments);
    }
  };

  const renderUserItem = ({ item }: { item: User }) => {
    const isSelected = selectedUsers.includes(item._id);
    // Fix: Use type-specific assignment access
    const studentAssignment = type !== 'assign_teachers' ? studentAssignments[item._id] : undefined;
    const teacherAssignment = type === 'assign_teachers' ? teacherAssignments[item._id] : undefined;

    return (
      <View style={styles.userContainer}>
        <TouchableOpacity
          style={[styles.userItem, isSelected && styles.userItemSelected]}
          onPress={() => toggleUserSelection(item._id)}
        >
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{item.name}</Text>
            <Text style={styles.userEmail}>{item.email}</Text>
          </View>
          {isSelected && <Text style={styles.selectionCheck}>✓</Text>}
        </TouchableOpacity>

        {isSelected && type !== 'remove_students' && (
          <View style={styles.assignmentContainer}>
            {(type === 'assign_students' || type === 'assign_teachers') && (
              <>
                {type === 'assign_students' && batch?.classes && batch.classes.length > 0 && (
                  <View style={styles.assignmentSection}>
                    <Text style={styles.assignmentTitle}>Classes:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {batch.classes.map((className, index) => (
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

                {batch?.subjects && batch.subjects.length > 0 && (
                  <View style={styles.assignmentSection}>
                    <Text style={styles.assignmentTitle}>Subjects:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {batch.subjects.map((subject, index) => {
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
              </>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.modalCloseText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>{getModalTitle()}</Text>
          <TouchableOpacity onPress={handleAssign} disabled={loading || selectedUsers.length === 0}>
            <Text style={[
              styles.modalSaveText,
              (loading || selectedUsers.length === 0) && styles.modalSaveTextDisabled
            ]}>
              {loading ? 'Processing...' : 'Assign'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            placeholder={`Search ${type === 'assign_teachers' ? 'teachers' : 'students'}...`}
            placeholderTextColor={BRAND.accentColor}
          />
        </View>

        {selectedUsers.length > 0 && (
          <View style={styles.selectedCountContainer}>
            <Text style={styles.selectedCountText}>
              {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected
            </Text>
          </View>
        )}

        <FlatList
          data={filteredUsers}
          renderItem={renderUserItem}
          keyExtractor={(item) => item._id}
          style={styles.modalContent}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  modalCloseText: {
    color: BRAND.primaryColor,
    fontSize: 16,
    fontWeight: '600',
  },
  modalTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalSaveText: {
    color: BRAND.primaryColor,
    fontSize: 16,
    fontWeight: '600',
  },
  modalSaveTextDisabled: {
    color: BRAND.accentColor,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  searchInput: {
    backgroundColor: BRAND.accentColor,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    color: 'white',
    fontSize: 16,
  },
  selectedCountContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: BRAND.accentColor,
    marginHorizontal: 20,
    borderRadius: 8,
    marginBottom: 10,
  },
  selectedCountText: {
    color: BRAND.primaryColor,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  userContainer: {
    marginBottom: 15,
  },
  userItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: BRAND.accentColor,
    padding: 15,
    borderRadius: 8,
    marginBottom: 5,
  },
  userItemSelected: {
    backgroundColor: BRAND.primaryColor + '20',
    borderColor: BRAND.primaryColor,
    borderWidth: 1,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  userEmail: {
    color: '#888',
    fontSize: 14,
  },
  selectionCheck: {
    color: BRAND.primaryColor,
    fontSize: 20,
    fontWeight: 'bold',
  },
  assignmentContainer: {
    backgroundColor: BRAND.accentColor + '80',
    padding: 15,
    borderRadius: 8,
    marginTop: 5,
  },
  assignmentSection: {
    marginBottom: 15,
  },
  assignmentTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
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
    backgroundColor: BRAND.primaryColor + '20',
    borderColor: BRAND.primaryColor,
  },
  assignmentChipText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '500',
  },
  assignmentChipTextSelected: {
    color: BRAND.primaryColor,
    fontWeight: '600',
  },
});