import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { API_BASE } from '../config/api';
import AcademicDetailedRecordComponent from '../components/AcademicDetailedRecordComponent';

const API_URL = API_BASE;

const BRAND = {
  primaryColor: '#00ff88',
  backgroundColor: '#0a1a0a',
  cardBackground: 'rgba(0, 0, 0, 0.4)',
  textPrimary: '#ffffff',
  textSecondary: '#cccccc',
};

const { width } = Dimensions.get('window');

interface StudentAttendance {
  studentId: string;
  studentName: string;
  studentEmail: string;
  batchId: string;
  batchName: string;
  overallStatistics: {
    totalClasses: number;
    present: number;
    absent: number;
    attendancePercentage: number;
    totalSubjects: number;
  };
  subjects: Array<{
    subjectName: string;
    teacher: {
      name: string;
    } | null;
    statistics: {
      totalClasses: number;
      present: number;
      absent: number;
      attendancePercentage: number;
    };
  }>;
}

interface BatchGroup {
  batchId: string;
  batchName: string;
  students: StudentAttendance[];
  averageAttendance: number;
}

type ViewMode = 'attendance' | 'academic';

export default function AdminAccessStudentReportsScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [batchGroups, setBatchGroups] = useState<BatchGroup[]>([]);
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('attendance');
  const [selectedStudent, setSelectedStudent] = useState<{
    id: string;
    name: string;
    email: string;
  } | null>(null);

  useEffect(() => {
    fetchAttendanceData();
  }, []);

  const fetchAttendanceData = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Error', 'Authentication required');
        return;
      }

      const response = await fetch(`${API_URL}/attendance/comprehensive`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Non-JSON response received:', await response.text());
        throw new Error('Server returned non-JSON response');
      }

      const data = await response.json();

      if (data.success) {
        const grouped = groupStudentsByBatch(data.data.students);
        setBatchGroups(grouped);
      } else {
        Alert.alert('Error', data.message || 'Failed to fetch attendance data');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      Alert.alert('Error', 'Failed to load attendance data. Please check your connection and try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const groupStudentsByBatch = (students: StudentAttendance[]): BatchGroup[] => {
    const batchMap = new Map<string, StudentAttendance[]>();

    students.forEach((student) => {
      if (!batchMap.has(student.batchId)) {
        batchMap.set(student.batchId, []);
      }
      batchMap.get(student.batchId)!.push(student);
    });

    return Array.from(batchMap.entries()).map(([batchId, students]) => {
      const sortedStudents = students.sort((a, b) => 
        a.overallStatistics.attendancePercentage - b.overallStatistics.attendancePercentage
      );

      const averageAttendance = students.length > 0
        ? students.reduce((sum, s) => sum + s.overallStatistics.attendancePercentage, 0) / students.length
        : 0;

      return {
        batchId,
        batchName: students[0].batchName,
        students: sortedStudents,
        averageAttendance,
      };
    });
  };

  const toggleBatch = (batchId: string) => {
    setExpandedBatches((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(batchId)) {
        newSet.delete(batchId);
      } else {
        newSet.add(batchId);
      }
      return newSet;
    });
  };

  const toggleStudent = (studentId: string) => {
    setExpandedStudents((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  };

  const viewAcademicRecord = (studentId: string, studentName: string, studentEmail: string) => {
    setSelectedStudent({ id: studentId, name: studentName, email: studentEmail });
    setViewMode('academic');
  };

  const backToAttendance = () => {
    setViewMode('attendance');
    setSelectedStudent(null);
  };

  const getAttendanceColor = (percentage: number): string => {
    if (percentage >= 75) return '#4CAF50';
    if (percentage >= 50) return '#FF9800';
    return '#F44336';
  };

  const getAttendanceStatus = (percentage: number): string => {
    if (percentage >= 75) return 'Good';
    if (percentage >= 50) return 'Warning';
    return 'Critical';
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAttendanceData();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={BRAND.backgroundColor} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BRAND.primaryColor} />
          <Text style={styles.loadingText}>Loading student reports...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Academic Record View
  if (viewMode === 'academic' && selectedStudent) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={BRAND.backgroundColor} />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={backToAttendance}
          >
            <MaterialIcons name="arrow-back" size={24} color={BRAND.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Academic Record</Text>
            <Text style={styles.headerSubtitle}>{selectedStudent.name}</Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        {/* Academic Component */}
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <AcademicDetailedRecordComponent
            studentId={selectedStudent.id}
            studentName={selectedStudent.name}
            studentEmail={selectedStudent.email}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Attendance View (Default)
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND.backgroundColor} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color={BRAND.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Student Reports</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={BRAND.primaryColor}
          />
        }
      >
        {batchGroups.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="inbox" size={64} color="#666" />
            <Text style={styles.emptyText}>No attendance data available</Text>
          </View>
        ) : (
          batchGroups.map((batch) => (
            <View key={batch.batchId} style={styles.batchContainer}>
              {/* Batch Header */}
              <TouchableOpacity
                style={styles.batchHeader}
                onPress={() => toggleBatch(batch.batchId)}
                activeOpacity={0.7}
              >
                <View style={styles.batchHeaderLeft}>
                  <MaterialIcons name="class" size={24} color={BRAND.primaryColor} />
                  <View style={styles.batchInfo}>
                    <Text style={styles.batchName}>{batch.batchName}</Text>
                    <Text style={styles.batchStudentCount}>
                      {batch.students.length} students • Avg: {batch.averageAttendance.toFixed(1)}%
                    </Text>
                  </View>
                </View>
                <MaterialIcons
                  name={expandedBatches.has(batch.batchId) ? 'expand-less' : 'expand-more'}
                  size={24}
                  color={BRAND.textSecondary}
                />
              </TouchableOpacity>

              {/* Students List */}
              {expandedBatches.has(batch.batchId) &&
                batch.students.map((student) => (
                  <View key={student.studentId} style={styles.studentCard}>
                    {/* Student Summary */}
                    <TouchableOpacity
                      style={styles.studentHeader}
                      onPress={() => toggleStudent(student.studentId)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.studentHeaderLeft}>
                        <View
                          style={[
                            styles.attendanceIndicator,
                            {
                              backgroundColor: getAttendanceColor(
                                student.overallStatistics.attendancePercentage
                              ),
                            },
                          ]}
                        />
                        <View style={styles.studentInfo}>
                          <Text style={styles.studentName}>{student.studentName}</Text>
                          <Text style={styles.studentEmail}>{student.studentEmail}</Text>
                          <View style={styles.statsRow}>
                            <Text style={styles.statText}>
                              {student.overallStatistics.present}/{student.overallStatistics.totalClasses} classes •{' '}
                              {student.overallStatistics.totalSubjects} subjects
                            </Text>
                          </View>
                        </View>
                      </View>
                      <View style={styles.studentHeaderRight}>
                        <Text
                          style={[
                            styles.attendancePercentage,
                            {
                              color: getAttendanceColor(
                                student.overallStatistics.attendancePercentage
                              ),
                            },
                          ]}
                        >
                          {student.overallStatistics.attendancePercentage.toFixed(1)}%
                        </Text>
                        <Text
                          style={[
                            styles.statusBadge,
                            {
                              color: getAttendanceColor(
                                student.overallStatistics.attendancePercentage
                              ),
                              borderColor: getAttendanceColor(
                                student.overallStatistics.attendancePercentage
                              ),
                            },
                          ]}
                        >
                          {getAttendanceStatus(student.overallStatistics.attendancePercentage)}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {/* Expanded Student Details */}
                    {expandedStudents.has(student.studentId) && (
                      <>
                        {/* Action Buttons */}
                        <View style={styles.actionButtons}>
                          <TouchableOpacity
                            style={styles.academicButton}
                            onPress={() => viewAcademicRecord(
                              student.studentId,
                              student.studentName,
                              student.studentEmail
                            )}
                          >
                            <MaterialIcons name="school" size={20} color={BRAND.primaryColor} />
                            <Text style={styles.academicButtonText}>View Academic Record</Text>
                          </TouchableOpacity>
                        </View>

                        {/* Subject Details */}
                        <View style={styles.subjectDetails}>
                          <Text style={styles.subjectDetailsTitle}>Subject-wise Attendance</Text>
                          {student.subjects.map((subject, index) => (
                            <View key={index} style={styles.subjectRow}>
                              <View style={styles.subjectLeft}>
                                <Text style={styles.subjectName}>{subject.subjectName}</Text>
                                <Text style={styles.subjectTeacher}>
                                  {subject.teacher ? subject.teacher.name : 'No teacher assigned'}
                                </Text>
                                <Text style={styles.subjectStats}>
                                  {subject.statistics.present}/{subject.statistics.totalClasses} classes
                                </Text>
                              </View>
                              <View style={styles.subjectRight}>
                                <View
                                  style={[
                                    styles.progressBar,
                                    {
                                      backgroundColor: getAttendanceColor(
                                        subject.statistics.attendancePercentage
                                      ) + '20',
                                    },
                                  ]}
                                >
                                  <View
                                    style={[
                                      styles.progressFill,
                                      {
                                        width: `${subject.statistics.attendancePercentage}%`,
                                        backgroundColor: getAttendanceColor(
                                          subject.statistics.attendancePercentage
                                        ),
                                      },
                                    ]}
                                  />
                                </View>
                                <Text
                                  style={[
                                    styles.subjectPercentage,
                                    {
                                      color: getAttendanceColor(
                                        subject.statistics.attendancePercentage
                                      ),
                                    },
                                  ]}
                                >
                                  {subject.statistics.attendancePercentage.toFixed(1)}%
                                </Text>
                              </View>
                            </View>
                          ))}
                        </View>
                      </>
                    )}
                  </View>
                ))}
            </View>
          ))
        )}
      </ScrollView>
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
    color: BRAND.textSecondary,
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: BRAND.textPrimary,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: BRAND.textSecondary,
    marginTop: 2,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    color: BRAND.textSecondary,
    fontSize: 16,
    marginTop: 16,
  },
  batchContainer: {
    marginBottom: 16,
    backgroundColor: BRAND.cardBackground,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  batchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'rgba(0, 255, 136, 0.05)',
  },
  batchHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  batchInfo: {
    marginLeft: 12,
    flex: 1,
  },
  batchName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: BRAND.textPrimary,
    marginBottom: 4,
  },
  batchStudentCount: {
    fontSize: 14,
    color: BRAND.textSecondary,
  },
  studentCard: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  studentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  studentHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: 12,
  },
  attendanceIndicator: {
    width: 4,
    height: '100%',
    borderRadius: 2,
    marginRight: 12,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: BRAND.textPrimary,
    marginBottom: 4,
  },
  studentEmail: {
    fontSize: 14,
    color: BRAND.textSecondary,
    marginBottom: 6,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 13,
    color: BRAND.textSecondary,
  },
  studentHeaderRight: {
    alignItems: 'flex-end',
  },
  attendancePercentage: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    overflow: 'hidden',
  },
  actionButtons: {
    padding: 16,
    paddingTop: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  academicButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BRAND.primaryColor,
  },
  academicButtonText: {
    color: BRAND.primaryColor,
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  subjectDetails: {
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  subjectDetailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: BRAND.primaryColor,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subjectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  subjectLeft: {
    flex: 1,
    marginRight: 16,
  },
  subjectName: {
    fontSize: 15,
    fontWeight: '600',
    color: BRAND.textPrimary,
    marginBottom: 4,
  },
  subjectTeacher: {
    fontSize: 13,
    color: BRAND.textSecondary,
    marginBottom: 4,
  },
  subjectStats: {
    fontSize: 12,
    color: BRAND.textSecondary,
  },
  subjectRight: {
    alignItems: 'flex-end',
    minWidth: 80,
  },
  progressBar: {
    width: 80,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  subjectPercentage: {
    fontSize: 14,
    fontWeight: '600',
  },
});