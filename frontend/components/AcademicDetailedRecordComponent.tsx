import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '../config/api';

const API_URL = API_BASE;

const BRAND = {
  primaryColor: '#00ff88',
  backgroundColor: '#0a1a0a',
  cardBackground: 'rgba(0, 0, 0, 0.4)',
  textPrimary: '#ffffff',
  textSecondary: '#cccccc',
};

interface TestScore {
  testId: string;
  testTitle: string;
  fullMarks: number;
  marksScored: number | null;
  className: string;
  createdAt: string;
  evaluatedAt: string | null;
  percentage: number | null;
  status: 'evaluated' | 'pending';
}

interface SubjectReport {
  subjectName: string;
  batch: {
    _id: string;
    batchName: string;
    category: string;
  };
  tests: TestScore[];
  totalTests: number;
  evaluatedTests: number;
  totalMarksScored: number;
  totalFullMarks: number;
  averagePercentage: number;
  highestScore: number;
  lowestScore: number | null;
  grade: string;
}

interface StudentReportCard {
  student: {
    _id: string;
    name: string;
    email: string;
  };
  reportCard: SubjectReport[];
  overallStats: {
    totalTests: number;
    evaluatedTests: number;
    pendingTests: number;
    totalMarksScored: number;
    totalFullMarks: number;
    averagePercentage: number;
    overallGrade: string;
  };
}

interface AcademicDetailedRecordProps {
  studentId: string;
  studentName: string;
  studentEmail: string;
}

export default function AcademicDetailedRecordComponent({
  studentId,
  studentName,
  studentEmail,
}: AcademicDetailedRecordProps) {
  const [loading, setLoading] = useState(true);
  const [reportCard, setReportCard] = useState<StudentReportCard | null>(null);
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchReportCard();
  }, [studentId]);

  const fetchReportCard = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Error', 'Authentication required');
        return;
      }

      const response = await fetch(`${API_URL}/tests/reports/student/${studentId}/report-card`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response');
      }

      const data = await response.json();

      if (data.success) {
        setReportCard(data.data);
      } else {
        Alert.alert('Error', data.message || 'Failed to fetch report card');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      Alert.alert('Error', 'Failed to load academic reports');
    } finally {
      setLoading(false);
    }
  };

  const toggleSubject = (subjectName: string) => {
    setExpandedSubjects((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(subjectName)) {
        newSet.delete(subjectName);
      } else {
        newSet.add(subjectName);
      }
      return newSet;
    });
  };

  const getGradeColor = (grade: string): string => {
    if (grade === 'A+' || grade === 'A') return '#4CAF50';
    if (grade === 'B+' || grade === 'B') return '#8BC34A';
    if (grade === 'C') return '#FF9800';
    if (grade === 'D') return '#FF5722';
    return '#F44336';
  };

  const getPercentageColor = (percentage: number): string => {
    if (percentage >= 90) return '#4CAF50';
    if (percentage >= 80) return '#8BC34A';
    if (percentage >= 70) return '#FFC107';
    if (percentage >= 60) return '#FF9800';
    if (percentage >= 50) return '#FF5722';
    return '#F44336';
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={BRAND.primaryColor} />
        <Text style={styles.loadingText}>Loading academic reports...</Text>
      </View>
    );
  }

  if (!reportCard || reportCard.reportCard.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="school" size={64} color="#666" />
        <Text style={styles.emptyText}>No academic data available</Text>
        <Text style={styles.emptySubtext}>This student has no test records yet</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Overall Statistics Card */}
      <View style={styles.overallCard}>
        <View style={styles.overallHeader}>
          <MaterialIcons name="assessment" size={24} color={BRAND.primaryColor} />
          <Text style={styles.overallTitle}>Overall Performance</Text>
        </View>

        <View style={styles.overallStatsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{reportCard.overallStats.totalTests}</Text>
            <Text style={styles.statLabel}>Total Tests</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{reportCard.overallStats.evaluatedTests}</Text>
            <Text style={styles.statLabel}>Evaluated</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{reportCard.overallStats.pendingTests}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>

        <View style={styles.overallScoreContainer}>
          <View style={styles.overallScoreBox}>
            <Text style={styles.overallScoreLabel}>Overall Average</Text>
            <Text
              style={[
                styles.overallScoreValue,
                { color: getPercentageColor(reportCard.overallStats.averagePercentage) },
              ]}
            >
              {reportCard.overallStats.averagePercentage.toFixed(1)}%
            </Text>
            <View
              style={[
                styles.gradeBadge,
                { backgroundColor: getGradeColor(reportCard.overallStats.overallGrade) },
              ]}
            >
              <Text style={styles.gradeText}>{reportCard.overallStats.overallGrade}</Text>
            </View>
          </View>
          <View style={styles.marksContainer}>
            <Text style={styles.marksText}>
              {reportCard.overallStats.totalMarksScored} / {reportCard.overallStats.totalFullMarks}
            </Text>
            <Text style={styles.marksLabel}>Total Marks</Text>
          </View>
        </View>
      </View>

      {/* Subject-wise Reports */}
      <Text style={styles.sectionTitle}>Subject-wise Performance</Text>

      {reportCard.reportCard.map((subject, index) => (
        <View key={index} style={styles.subjectCard}>
          {/* Subject Header */}
          <TouchableOpacity
            style={styles.subjectHeader}
            onPress={() => toggleSubject(subject.subjectName)}
            activeOpacity={0.7}
          >
            <View style={styles.subjectHeaderLeft}>
              <MaterialIcons name="book" size={20} color={BRAND.primaryColor} />
              <View style={styles.subjectInfo}>
                <Text style={styles.subjectName}>{subject.subjectName}</Text>
                <Text style={styles.batchName}>{subject.batch.batchName}</Text>
              </View>
            </View>

            <View style={styles.subjectHeaderRight}>
              <View style={styles.subjectScoreContainer}>
                <Text
                  style={[
                    styles.subjectPercentage,
                    { color: getPercentageColor(subject.averagePercentage) },
                  ]}
                >
                  {subject.averagePercentage.toFixed(1)}%
                </Text>
                <View
                  style={[
                    styles.miniGradeBadge,
                    { backgroundColor: getGradeColor(subject.grade) },
                  ]}
                >
                  <Text style={styles.miniGradeText}>{subject.grade}</Text>
                </View>
              </View>
              <MaterialIcons
                name={expandedSubjects.has(subject.subjectName) ? 'expand-less' : 'expand-more'}
                size={24}
                color={BRAND.textSecondary}
              />
            </View>
          </TouchableOpacity>

          {/* Subject Stats Summary */}
          <View style={styles.subjectStatsRow}>
            <View style={styles.subjectStatItem}>
              <Text style={styles.subjectStatValue}>{subject.evaluatedTests}/{subject.totalTests}</Text>
              <Text style={styles.subjectStatLabel}>Tests</Text>
            </View>
            <View style={styles.subjectStatItem}>
              <Text style={styles.subjectStatValue}>
                {subject.highestScore.toFixed(0)}%
              </Text>
              <Text style={styles.subjectStatLabel}>Highest</Text>
            </View>
            <View style={styles.subjectStatItem}>
              <Text style={styles.subjectStatValue}>
                {subject.lowestScore !== null ? subject.lowestScore.toFixed(0) : 'N/A'}%
              </Text>
              <Text style={styles.subjectStatLabel}>Lowest</Text>
            </View>
            <View style={styles.subjectStatItem}>
              <Text style={styles.subjectStatValue}>
                {subject.totalMarksScored}/{subject.totalFullMarks}
              </Text>
              <Text style={styles.subjectStatLabel}>Marks</Text>
            </View>
          </View>

          {/* Test Details */}
          {expandedSubjects.has(subject.subjectName) && (
            <View style={styles.testDetailsContainer}>
              <Text style={styles.testDetailsTitle}>Test History</Text>
              {subject.tests.length === 0 ? (
                <Text style={styles.noTestsText}>No tests available</Text>
              ) : (
                subject.tests.map((test, testIndex) => (
                  <View key={testIndex} style={styles.testRow}>
                    <View style={styles.testLeft}>
                      <Text style={styles.testTitle}>{test.testTitle}</Text>
                      <Text style={styles.testClass}>{test.className}</Text>
                      <Text style={styles.testDate}>{formatDate(test.createdAt)}</Text>
                    </View>
                    <View style={styles.testRight}>
                      {test.status === 'evaluated' ? (
                        <>
                          <Text
                            style={[
                              styles.testPercentage,
                              { color: getPercentageColor(test.percentage || 0) },
                            ]}
                          >
                            {test.percentage?.toFixed(1)}%
                          </Text>
                          <Text style={styles.testMarks}>
                            {test.marksScored}/{test.fullMarks}
                          </Text>
                        </>
                      ) : (
                        <View style={styles.pendingBadge}>
                          <Text style={styles.pendingText}>Pending</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: BRAND.textSecondary,
    marginTop: 16,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: BRAND.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    color: BRAND.textSecondary,
    fontSize: 14,
    marginTop: 8,
  },
  overallCard: {
    backgroundColor: BRAND.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.2)',
  },
  overallHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  overallTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: BRAND.textPrimary,
    marginLeft: 8,
  },
  overallStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: BRAND.primaryColor,
  },
  statLabel: {
    fontSize: 12,
    color: BRAND.textSecondary,
    marginTop: 4,
  },
  overallScoreContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  overallScoreBox: {
    alignItems: 'center',
  },
  overallScoreLabel: {
    fontSize: 12,
    color: BRAND.textSecondary,
    marginBottom: 4,
  },
  overallScoreValue: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  gradeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  gradeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  marksContainer: {
    alignItems: 'flex-end',
  },
  marksText: {
    fontSize: 20,
    fontWeight: '600',
    color: BRAND.textPrimary,
  },
  marksLabel: {
    fontSize: 12,
    color: BRAND.textSecondary,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: BRAND.primaryColor,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subjectCard: {
    backgroundColor: BRAND.cardBackground,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  subjectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  subjectHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  subjectInfo: {
    marginLeft: 12,
    flex: 1,
  },
  subjectName: {
    fontSize: 16,
    fontWeight: '600',
    color: BRAND.textPrimary,
    marginBottom: 4,
  },
  batchName: {
    fontSize: 13,
    color: BRAND.textSecondary,
  },
  subjectHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subjectScoreContainer: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  subjectPercentage: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  miniGradeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  miniGradeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  subjectStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  subjectStatItem: {
    alignItems: 'center',
  },
  subjectStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: BRAND.textPrimary,
  },
  subjectStatLabel: {
    fontSize: 11,
    color: BRAND.textSecondary,
    marginTop: 2,
  },
  testDetailsContainer: {
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  testDetailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: BRAND.primaryColor,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  noTestsText: {
    color: BRAND.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 8,
  },
  testRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  testLeft: {
    flex: 1,
    marginRight: 16,
  },
  testTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: BRAND.textPrimary,
    marginBottom: 4,
  },
  testClass: {
    fontSize: 13,
    color: BRAND.textSecondary,
    marginBottom: 2,
  },
  testDate: {
    fontSize: 12,
    color: BRAND.textSecondary,
  },
  testRight: {
    alignItems: 'flex-end',
  },
  testPercentage: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  testMarks: {
    fontSize: 13,
    color: BRAND.textSecondary,
  },
  pendingBadge: {
    backgroundColor: 'rgba(255, 152, 0, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FF9800',
  },
  pendingText: {
    color: '#FF9800',
    fontSize: 13,
    fontWeight: '600',
  },
});