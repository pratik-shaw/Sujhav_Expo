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
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { RootStackParamList } from '../App';
import { API_BASE } from '../config/api';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

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

// Interfaces
interface Subject {
  name: string;
  teacher: string;
  _id?: string;
}

interface Student {
  _id: string;
  name: string;
  email: string;
  enrolledAt?: string;
}

interface AttendanceRecord {
  student: string;
  status: 'present' | 'absent' | 'no_class';
}

interface StudentStats {
  present: number;
  absent: number;
  noClass: number;
  totalClasses: number;
  attendancePercentage: number;
}

interface StudentWithStats extends Student {
  stats?: StudentStats;
  todayStatus?: 'present' | 'absent' | 'no_class';
}

interface RouteParams {
  batchId: string;
  batchName: string;
  subjects: Subject[];
}

export default function TeacherHandleBatchAttendanceScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const { batchId, batchName, subjects } = route.params as RouteParams;

  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [students, setStudents] = useState<StudentWithStats[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentWithStats | null>(null);
  const [isMarkingAttendance, setIsMarkingAttendance] = useState(false);
  const [isAttendanceAlreadyMarked, setIsAttendanceAlreadyMarked] = useState(false);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-20)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(30)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (subjects.length > 0) {
      setSelectedSubject(subjects[0]);
    }
    startEntranceAnimation();
  }, []);

  useEffect(() => {
    if (selectedSubject) {
      loadSubjectData();
    }
  }, [selectedSubject, selectedDate]);

  // Combined function to load both students and attendance data
  const loadSubjectData = async () => {
    if (!selectedSubject) return;
    
    setIsLoading(true);
    try {
      // Load students and today's attendance in parallel
      await Promise.all([
        fetchStudentsForSubject(),
        fetchTodayAttendance()
      ]);
    } catch (error) {
      console.error('Error loading subject data:', error);
    } finally {
      setIsLoading(false);
    }
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
    }, 500);

    // Fade in animation
    setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    }, 700);
  };

  const fetchStudentsForSubject = async () => {
    if (!selectedSubject) return;

    try {
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        Alert.alert('Error', 'No authentication token found');
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/attendance/students/${batchId}/${encodeURIComponent(selectedSubject.name)}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();
      
      if (data.success) {
        const studentsWithStats = await Promise.all(
          data.data.students.map(async (studentData: any) => {
            const stats = await fetchStudentStats(studentData.student._id);
            return {
              ...studentData.student,
              stats,
              enrolledAt: studentData.enrolledAt
            };
          })
        );
        setStudents(studentsWithStats);
      } else {
        Alert.alert('Error', data.message || 'Failed to fetch students');
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      Alert.alert('Error', 'Network error. Please check your connection.');
    }
  };

  const fetchStudentStats = async (studentId: string): Promise<StudentStats | undefined> => {
    if (!selectedSubject) return undefined;

    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(
        `${API_BASE_URL}/attendance/stats/${batchId}/${encodeURIComponent(selectedSubject.name)}/${studentId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();
      
      if (data.success) {
        return data.data.statistics;
      }
    } catch (error) {
      console.error('Error fetching student stats:', error);
    }
    return undefined;
  };

  const fetchTodayAttendance = async () => {
    if (!selectedSubject) return;

    try {
      const token = await AsyncStorage.getItem('userToken');
      const dateStr = selectedDate.toISOString().split('T')[0];
      
      const response = await fetch(
        `${API_BASE_URL}/attendance/date/${batchId}/${encodeURIComponent(selectedSubject.name)}/${dateStr}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();
      
      if (data.success && data.data) {
        const records = data.data.studentAttendance.map((record: any) => ({
          student: record.student._id,
          status: record.status
        }));
        setAttendanceRecords(records);
        setIsAttendanceAlreadyMarked(true);
        
        // Update students with today's status
        setStudents(prevStudents => 
          prevStudents.map(student => ({
            ...student,
            todayStatus: records.find((r: AttendanceRecord) => r.student === student._id)?.status
          }))
        );
      } else {
        setAttendanceRecords([]);
        setIsAttendanceAlreadyMarked(false);
        setStudents(prevStudents => 
          prevStudents.map(student => ({
            ...student,
            todayStatus: undefined
          }))
        );
      }
    } catch (error) {
      console.error('Error fetching today attendance:', error);
      setIsAttendanceAlreadyMarked(false);
    }
  };

  const toggleStudentAttendance = (studentId: string) => {
    const currentRecord = attendanceRecords.find(r => r.student === studentId);
    let newStatus: 'present' | 'absent' | 'no_class';
    
    if (!currentRecord || currentRecord.status === 'absent') {
      newStatus = 'present';
    } else if (currentRecord.status === 'present') {
      newStatus = 'no_class';
    } else {
      newStatus = 'absent';
    }

    const updatedRecords = attendanceRecords.filter(r => r.student !== studentId);
    updatedRecords.push({ student: studentId, status: newStatus });
    
    setAttendanceRecords(updatedRecords);
    
    // Update students with new status
    setStudents(prevStudents => 
      prevStudents.map(student => 
        student._id === studentId 
          ? { ...student, todayStatus: newStatus }
          : student
      )
    );
  };

  const markAllPresent = () => {
    const allPresentRecords = students.map(student => ({
      student: student._id,
      status: 'present' as const
    }));
    
    setAttendanceRecords(allPresentRecords);
    setStudents(prevStudents => 
      prevStudents.map(student => ({
        ...student,
        todayStatus: 'present'
      }))
    );
  };

  const markAllAbsent = () => {
    const allAbsentRecords = students.map(student => ({
      student: student._id,
      status: 'absent' as const
    }));
    
    setAttendanceRecords(allAbsentRecords);
    setStudents(prevStudents => 
      prevStudents.map(student => ({
        ...student,
        todayStatus: 'absent'
      }))
    );
  };

  const submitAttendance = async () => {
    if (!selectedSubject || attendanceRecords.length === 0) {
      Alert.alert('Error', 'Please mark attendance for at least one student');
      return;
    }

    try {
      setIsMarkingAttendance(true);
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_BASE_URL}/attendance/mark`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          batchId,
          subject: selectedSubject.name,
          date: selectedDate.toISOString().split('T')[0],
          studentAttendance: attendanceRecords
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setIsAttendanceAlreadyMarked(true);
        Alert.alert('Success', 'Attendance saved successfully');
        await loadSubjectData(); // Refresh to get updated stats
      } else {
        Alert.alert('Error', data.message || 'Failed to save attendance');
      }
    } catch (error) {
      console.error('Error marking attendance:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setIsMarkingAttendance(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (selectedSubject) {
      await loadSubjectData();
    }
    setRefreshing(false);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status?: 'present' | 'absent' | 'no_class') => {
    switch (status) {
      case 'present': return '#4CAF50';
      case 'absent': return '#F44336';
      case 'no_class': return '#FF9800';
      default: return '#666';
    }
  };

  const getStatusIcon = (status?: 'present' | 'absent' | 'no_class') => {
    switch (status) {
      case 'present': return 'check-circle';
      case 'absent': return 'cancel';
      case 'no_class': return 'remove-circle';
      default: return 'radio-button-unchecked';
    }
  };

  const getStatusText = (status?: 'present' | 'absent' | 'no_class') => {
    switch (status) {
      case 'present': return 'Present';
      case 'absent': return 'Absent';
      case 'no_class': return 'No Class';
      default: return 'Not Marked';
    }
  };

  const getNextStatusText = (status?: 'present' | 'absent' | 'no_class') => {
    if (!status || status === 'absent') return 'Mark Present';
    if (status === 'present') return 'Mark No Class';
    return 'Mark Absent';
  };

  const renderSubjectTab = ({ item }: { item: Subject }) => (
    <TouchableOpacity
      style={[
        styles.subjectTab,
        selectedSubject?.name === item.name && styles.activeSubjectTab
      ]}
      onPress={() => setSelectedSubject(item)}
    >
      <Text style={[
        styles.subjectTabText,
        selectedSubject?.name === item.name && styles.activeSubjectTabText
      ]}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderStudentCard = ({ item }: { item: StudentWithStats }) => (
    <Animated.View
      style={[
        styles.studentCard,
        {
          opacity: contentOpacity,
          transform: [{ translateY: contentTranslateY }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.studentCardTouchable}
        onPress={() => toggleStudentAttendance(item._id)}
        activeOpacity={0.8}
      >
        <View style={styles.studentCardHeader}>
          <View style={styles.studentInfo}>
            <View style={styles.studentAvatar}>
              <Text style={styles.studentAvatarText}>
                {item.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.studentDetails}>
              <Text style={styles.studentName}>{item.name}</Text>
              <Text style={styles.studentEmail}>{item.email}</Text>
              <View style={styles.statusContainer}>
                <Text style={[styles.statusText, { color: getStatusColor(item.todayStatus) }]}>
                  {getStatusText(item.todayStatus)}
                </Text>
                <Text style={styles.tapHint}>
                  • Tap to {getNextStatusText(item.todayStatus)}
                </Text>
              </View>
            </View>
          </View>
          
          <TouchableOpacity
            style={[
              styles.attendanceButton,
              { backgroundColor: getStatusColor(item.todayStatus) }
            ]}
            onPress={() => toggleStudentAttendance(item._id)}
          >
            <MaterialIcons 
              name={getStatusIcon(item.todayStatus)} 
              size={20} 
              color="#fff" 
            />
          </TouchableOpacity>
        </View>

        {item.stats && (
          <View style={styles.studentStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{item.stats.attendancePercentage.toFixed(1)}%</Text>
              <Text style={styles.statLabel}>Attendance</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{item.stats.present}</Text>
              <Text style={styles.statLabel}>Present</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{item.stats.absent}</Text>
              <Text style={styles.statLabel}>Absent</Text>
            </View>
            <TouchableOpacity 
              style={styles.viewStatsButton}
              onPress={() => {
                setSelectedStudent(item);
                setShowStatsModal(true);
              }}
            >
              <MaterialIcons name="bar-chart" size={16} color={BRAND.primaryColor} />
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );

  const renderStatsModal = () => (
    <Modal
      visible={showStatsModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowStatsModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {selectedStudent?.name} - Attendance Details
            </Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowStatsModal(false)}
            >
              <MaterialIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {selectedStudent?.stats && (
            <ScrollView style={styles.modalBody}>
              <View style={styles.detailedStats}>
                <View style={styles.detailedStatCard}>
                  <MaterialIcons name="check-circle" size={32} color="#4CAF50" />
                  <Text style={styles.detailedStatValue}>{selectedStudent.stats.present}</Text>
                  <Text style={styles.detailedStatLabel}>Days Present</Text>
                </View>
                
                <View style={styles.detailedStatCard}>
                  <MaterialIcons name="cancel" size={32} color="#F44336" />
                  <Text style={styles.detailedStatValue}>{selectedStudent.stats.absent}</Text>
                  <Text style={styles.detailedStatLabel}>Days Absent</Text>
                </View>
                
                <View style={styles.detailedStatCard}>
                  <MaterialIcons name="remove-circle" size={32} color="#FF9800" />
                  <Text style={styles.detailedStatValue}>{selectedStudent.stats.noClass}</Text>
                  <Text style={styles.detailedStatLabel}>No Class</Text>
                </View>
                
                <View style={styles.detailedStatCard}>
                  <MaterialIcons name="assessment" size={32} color={BRAND.primaryColor} />
                  <Text style={styles.detailedStatValue}>
                    {selectedStudent.stats.attendancePercentage.toFixed(1)}%
                  </Text>
                  <Text style={styles.detailedStatLabel}>Attendance Rate</Text>
                </View>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );

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
            { opacity: Animated.multiply(glowOpacity, 0.06) }
          ]} 
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[BRAND.primaryColor]}
            tintColor={BRAND.primaryColor}
          />
        }
      >
        {/* Header */}
        <Animated.View 
          style={[
            styles.headerSection,
            {
              opacity: headerOpacity,
              transform: [{ translateY: headerTranslateY }],
            },
          ]}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <MaterialIcons name="arrow-back" size={24} color={BRAND.primaryColor} />
            </TouchableOpacity>
            
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>{batchName}</Text>
              <Text style={styles.headerSubtitle}>Mark Daily Attendance</Text>
            </View>
          </View>
          
          <View style={styles.dateContainer}>
            <MaterialIcons name="calendar-today" size={16} color={BRAND.primaryColor} />
            <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
            {isAttendanceAlreadyMarked && (
              <View style={styles.markedIndicator}>
                <MaterialIcons name="check" size={14} color="#4CAF50" />
                <Text style={styles.markedText}>Marked</Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* Subject Tabs */}
        <Animated.View 
          style={[
            styles.subjectTabsSection,
            { opacity: fadeAnim }
          ]}
        >
          <Text style={styles.sectionTitle}>Select Subject</Text>
          <FlatList
            data={subjects}
            renderItem={renderSubjectTab}
            keyExtractor={(item, index) => `${item.name}-${index}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.subjectTabsList}
          />
        </Animated.View>

        {/* Attendance Controls */}
        {selectedSubject && (
          <Animated.View 
            style={[
              styles.controlsSection,
              { opacity: fadeAnim }
            ]}
          >
            <View style={styles.controlsHeader}>
              <Text style={styles.sectionTitle}>
                Attendance for {selectedSubject.name}
              </Text>
              <View style={styles.attendanceCount}>
                <Text style={styles.attendanceCountText}>
                  {attendanceRecords.filter(r => r.status === 'present').length} / {students.length} Present
                </Text>
              </View>
            </View>
            
            <View style={styles.quickActions}>
              <TouchableOpacity
                style={[styles.quickActionButton, styles.markAllPresentButton]}
                onPress={markAllPresent}
              >
                <MaterialIcons name="check-circle" size={20} color="#fff" />
                <Text style={styles.quickActionText}>All Present</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.quickActionButton, styles.markAllAbsentButton]}
                onPress={markAllAbsent}
              >
                <MaterialIcons name="cancel" size={20} color="#fff" />
                <Text style={styles.quickActionText}>All Absent</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* Students List */}
        {selectedSubject && (
          <Animated.View 
            style={[
              styles.studentsSection,
              { opacity: fadeAnim }
            ]}
          >
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={BRAND.primaryColor} />
                <Text style={styles.loadingText}>Loading students...</Text>
              </View>
            ) : students.length > 0 ? (
              <FlatList
                data={students}
                renderItem={renderStudentCard}
                keyExtractor={(item) => item._id}
                showsVerticalScrollIndicator={false}
                scrollEnabled={false}
                contentContainerStyle={styles.studentsList}
              />
            ) : (
              <View style={styles.emptyState}>
                <MaterialIcons name="people-outline" size={64} color="#333" />
                <Text style={styles.emptyStateTitle}>No Students Found</Text>
                <Text style={styles.emptyStateDescription}>
                  No students are assigned to this subject.
                </Text>
              </View>
            )}
          </Animated.View>
        )}

        {/* Submit Button */}
        {selectedSubject && students.length > 0 && (
          <Animated.View 
            style={[
              styles.submitSection,
              { opacity: fadeAnim }
            ]}
          >
            <TouchableOpacity
              style={[
                styles.submitButton,
                isMarkingAttendance && styles.submitButtonDisabled
              ]}
              onPress={submitAttendance}
              disabled={isMarkingAttendance}
            >
              {isMarkingAttendance ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <MaterialIcons name="save" size={24} color="#fff" />
              )}
              <Text style={styles.submitButtonText}>
                {isMarkingAttendance 
                  ? 'Saving Attendance...' 
                  : isAttendanceAlreadyMarked 
                    ? 'Update Attendance' 
                    : 'Save Attendance'
                }
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </ScrollView>

      {renderStatsModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND.backgroundColor,
  },
  scrollView: {
    flex: 1,
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
    borderRadius: 200,
    backgroundColor: BRAND.primaryColor,
  },
  glowCircle1: {
    width: 400,
    height: 400,
    top: -200,
    right: -200,
  },
  glowCircle2: {
    width: 300,
    height: 300,
    bottom: -150,
    left: -150,
  },
  headerSection: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    zIndex: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BRAND.accentColor,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BRAND.primaryColor + '30',
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#aaa',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND.accentColor,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BRAND.primaryColor + '30',
    alignSelf: 'flex-start',
  },
  dateText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
  },
  markedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#4CAF50' + '20',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#4CAF50' + '40',
  },
  markedText: {
    color: '#4CAF50',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  subjectTabsSection: {
    paddingHorizontal: 20,
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  subjectTabsList: {
    paddingVertical: 5,
  },
  subjectTab: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginRight: 12,
    backgroundColor: BRAND.accentColor,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#333',
    minWidth: 100,
    alignItems: 'center',
  },
  activeSubjectTab: {
    backgroundColor: BRAND.primaryColor + '20',
    borderColor: BRAND.primaryColor,
  },
  subjectTabText: {
    color: '#aaa',
    fontSize: 14,
    fontWeight: '500',
  },
  activeSubjectTabText: {
    color: BRAND.primaryColor,
    fontWeight: 'bold',
  },
  controlsSection: {
    paddingHorizontal: 20,
    marginBottom: 25,
  },
  controlsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  attendanceCount: {
    backgroundColor: BRAND.accentColor,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: BRAND.primaryColor + '30',
  },
  attendanceCountText: {
    color: BRAND.primaryColor,
    fontSize: 12,
    fontWeight: 'bold',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  markAllPresentButton: {
    backgroundColor: '#4CAF50',
  },
  markAllAbsentButton: {
    backgroundColor: '#F44336',
  },
  quickActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  studentsSection: {
    paddingHorizontal: 20,
    marginBottom: 25,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    color: '#aaa',
    marginTop: 10,
    fontSize: 14,
  },
  studentsList: {
    paddingBottom: 10,
  },
  studentCard: {
    backgroundColor: BRAND.accentColor,
    borderRadius: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#333',
    overflow: 'hidden',
  },
  studentCardTouchable: {
    padding: 16,
  },
  studentCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  studentAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: BRAND.primaryColor + '20',
    borderWidth: 2,
    borderColor: BRAND.primaryColor + '40',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  studentAvatarText: {
    color: BRAND.primaryColor,
    fontSize: 18,
    fontWeight: 'bold',
  },
  studentDetails: {
    flex: 1,
  },
  studentName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  studentEmail: {
    color: '#aaa',
    fontSize: 13,
    marginBottom: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tapHint: {
    color: '#666',
    fontSize: 11,
    marginLeft: 4,
  },
  attendanceButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  studentStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: BRAND.backgroundColor + '40',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statLabel: {
    color: '#aaa',
    fontSize: 11,
    textAlign: 'center',
  },
  viewStatsButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: BRAND.primaryColor + '20',
    borderWidth: 1,
    borderColor: BRAND.primaryColor + '40',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateDescription: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 40,
  },
  submitSection: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  submitButton: {
    backgroundColor: BRAND.primaryColor,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 12,
    shadowColor: BRAND.primaryColor,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    backgroundColor: '#666',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: BRAND.accentColor,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.8,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: BRAND.primaryColor + '30',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 15,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BRAND.backgroundColor,
    borderWidth: 1,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  detailedStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 15,
  },
  detailedStatCard: {
    backgroundColor: BRAND.backgroundColor,
    width: (width - 75) / 2,
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  detailedStatValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 8,
  },
  detailedStatLabel: {
    color: '#aaa',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
});