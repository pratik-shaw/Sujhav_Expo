import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  RefreshControl,
  Alert,
  Animated,
  ActivityIndicator,
  StatusBar,
  FlatList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationProp, RouteProp } from '@react-navigation/native';
import { API_BASE } from '../config/api';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import BottomNavigation from '../components/BottomNavigation';

// Brand configuration
const BRAND = {
  name: "SUJHAV",
  primaryColor: '#00ff88',
  secondaryColor: '#000000',
  backgroundColor: '#0a1a0a',
  accentColor: '#1a2e1a',
  cardBackground: '#1a2e1a',
  borderColor: '#2a3e2a',
  textPrimary: '#ffffff',
  textSecondary: '#b0b0b0',
  successColor: '#00ff88',
  warningColor: '#ffaa00',
  dangerColor: '#ff4444',
};

const { width, height } = Dimensions.get('window');

interface StudentAttendanceScreenProps {
  navigation: NavigationProp<any>;
  route?: RouteProp<any>;
}

interface UserData {
  id: string;
  email: string;
  name: string;
  token: string;
  role?: string;
}

interface BatchAssignment {
  batchId: string;
  batchName: string;
  category: string;
  assignedSubjects: Array<{
    subjectName: string;
    teacherId: string;
    teacherName: string;
  }>;
}

interface AttendanceRecord {
  date: string;
  status: 'present' | 'absent' | 'no_class';
  markedAt: string;
}

interface SubjectAttendanceStats {
  subjectName: string;
  batchId: string;
  batchName: string;
  teacherName: string;
  statistics: {
    present: number;
    absent: number;
    noClass: number;
    totalClasses: number;
    attendancePercentage: number;
  };
  recentAttendance: AttendanceRecord[];
}

interface AttendanceData {
  batches: BatchAssignment[];
  subjectAttendance: SubjectAttendanceStats[];
  overallStats: {
    totalClassesAcrossSubjects: number;
    totalPresentAcrossSubjects: number;
    overallAttendancePercentage: number;
    totalSubjects: number;
  };
}

const StudentAttendanceRecordsScreen: React.FC<StudentAttendanceScreenProps> = ({ navigation }) => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [attendanceData, setAttendanceData] = useState<AttendanceData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Check authentication status
  const checkAuthStatus = async (): Promise<UserData | null> => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userId = await AsyncStorage.getItem('userId');
      const userName = await AsyncStorage.getItem('userName');
      const storedUserData = await AsyncStorage.getItem('userData');
      
      if (token && userId && userName) {
        let parsedUserData = null;
        
        if (storedUserData) {
          try {
            parsedUserData = JSON.parse(storedUserData);
          } catch (e) {
            console.error('Error parsing stored user data:', e);
          }
        }
        
        const userDataObj: UserData = {
          id: userId,
          name: userName,
          email: parsedUserData?.email || '',
          token: token,
        };
        
        setUserData(userDataObj);
        return userDataObj;
      } else {
        Alert.alert('Authentication Required', 'Please log in to view attendance records');
        navigation.goBack();
        return null;
      }
    } catch (error) {
      console.error('Auth check error:', error);
      Alert.alert('Error', 'Failed to authenticate');
      navigation.goBack();
      return null;
    }
  };

  // Fetch student attendance data
  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      
      const currentUserData = await checkAuthStatus();
      if (!currentUserData) {
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE}/students/attendance-records`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${currentUserData.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Student attendance response:', data);
        
        if (data.success) {
          setAttendanceData(data.data);
        } else {
          console.error('Failed to fetch attendance data:', data.message);
          Alert.alert('Error', data.message || 'Failed to fetch attendance records');
        }
      } else if (response.status === 404) {
        // Student not assigned to any batch
        setAttendanceData({
          batches: [],
          subjectAttendance: [],
          overallStats: {
            totalClassesAcrossSubjects: 0,
            totalPresentAcrossSubjects: 0,
            overallAttendancePercentage: 0,
            totalSubjects: 0,
          }
        });
      } else {
        console.error('Failed to fetch attendance data:', response.status);
        Alert.alert('Error', 'Failed to fetch attendance records. Please try again.');
      }
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      Alert.alert('Error', 'Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAttendanceData();
    setRefreshing(false);
  };

  // Toggle card expansion
  const toggleCardExpansion = (subjectKey: string) => {
    const newExpandedCards = new Set(expandedCards);
    if (expandedCards.has(subjectKey)) {
      newExpandedCards.delete(subjectKey);
    } else {
      newExpandedCards.add(subjectKey);
    }
    setExpandedCards(newExpandedCards);
  };

  // Get attendance status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return BRAND.successColor;
      case 'absent':
        return BRAND.dangerColor;
      case 'no_class':
        return BRAND.textSecondary;
      default:
        return BRAND.textSecondary;
    }
  };

  // Get attendance percentage color
  const getPercentageColor = (percentage: number) => {
    if (percentage >= 75) return BRAND.successColor;
    if (percentage >= 60) return BRAND.warningColor;
    return BRAND.dangerColor;
  };

  // Start animations
  const startAnimations = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Initialize screen
  useEffect(() => {
    fetchAttendanceData();
  }, []);

  useEffect(() => {
    if (!loading) {
      startAnimations();
    }
  }, [loading]);

  // Overall Statistics Card
  const OverallStatsCard = () => (
    <Animated.View style={[styles.statsCard, { 
      opacity: fadeAnim,
      transform: [{ translateY: slideAnim }],
    }]}>
      <Text style={styles.cardTitle}>Overall Attendance</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{attendanceData?.overallStats.totalSubjects || 0}</Text>
          <Text style={styles.statLabel}>Subjects</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{attendanceData?.overallStats.totalClassesAcrossSubjects || 0}</Text>
          <Text style={styles.statLabel}>Total Classes</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{attendanceData?.overallStats.totalPresentAcrossSubjects || 0}</Text>
          <Text style={styles.statLabel}>Present</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { 
            color: getPercentageColor(attendanceData?.overallStats.overallAttendancePercentage || 0) 
          }]}>
            {attendanceData?.overallStats.overallAttendancePercentage.toFixed(1) || 0}%
          </Text>
          <Text style={styles.statLabel}>Attendance</Text>
        </View>
      </View>
    </Animated.View>
  );

  // Subject Attendance Card
  const SubjectAttendanceCard = ({ item, index }: { item: SubjectAttendanceStats, index: number }) => {
    const subjectKey = `${item.batchId}_${item.subjectName}`;
    const isExpanded = expandedCards.has(subjectKey);
    
    return (
      <Animated.View style={[styles.subjectCard, { 
        opacity: fadeAnim,
        transform: [{ translateY: Animated.add(slideAnim, new Animated.Value(index * 10)) }],
      }]}>
        <TouchableOpacity
          style={styles.subjectHeader}
          onPress={() => toggleCardExpansion(subjectKey)}
          activeOpacity={0.8}
        >
          <View style={styles.subjectInfo}>
            <Text style={styles.subjectName}>{item.subjectName}</Text>
            <Text style={styles.batchInfo}>{item.batchName}</Text>
            <Text style={styles.teacherInfo}>Teacher: {item.teacherName}</Text>
          </View>
          
          <View style={styles.subjectStats}>
            <Text style={[styles.attendancePercentage, { 
              color: getPercentageColor(item.statistics.attendancePercentage) 
            }]}>
              {item.statistics.attendancePercentage.toFixed(1)}%
            </Text>
            <Text style={styles.classCount}>
              {item.statistics.present}/{item.statistics.totalClasses}
            </Text>
            <MaterialIcons 
              name={isExpanded ? "expand-less" : "expand-more"} 
              size={24} 
              color={BRAND.textSecondary} 
            />
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.expandedContent}>
            {/* Detailed Statistics */}
            <View style={styles.detailedStats}>
              <View style={styles.statRow}>
                <View style={styles.statDetailItem}>
                  <MaterialIcons name="check-circle" size={16} color={BRAND.successColor} />
                  <Text style={styles.statDetailText}>Present: {item.statistics.present}</Text>
                </View>
                <View style={styles.statDetailItem}>
                  <MaterialIcons name="cancel" size={16} color={BRAND.dangerColor} />
                  <Text style={styles.statDetailText}>Absent: {item.statistics.absent}</Text>
                </View>
              </View>
              <View style={styles.statRow}>
                <View style={styles.statDetailItem}>
                  <MaterialIcons name="event-busy" size={16} color={BRAND.textSecondary} />
                  <Text style={styles.statDetailText}>No Class: {item.statistics.noClass}</Text>
                </View>
                <View style={styles.statDetailItem}>
                  <MaterialIcons name="class" size={16} color={BRAND.primaryColor} />
                  <Text style={styles.statDetailText}>Total: {item.statistics.totalClasses}</Text>
                </View>
              </View>
            </View>

            {/* Recent Attendance */}
            {item.recentAttendance.length > 0 && (
              <View style={styles.recentAttendance}>
                <Text style={styles.recentTitle}>Recent Attendance</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.attendanceRow}>
                    {item.recentAttendance.slice(0, 10).map((record, recordIndex) => (
                      <View key={recordIndex} style={styles.attendanceItem}>
                        <Text style={styles.attendanceDate}>
                          {new Date(record.date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </Text>
                        <View style={[
                          styles.statusIndicator,
                          { backgroundColor: getStatusColor(record.status) }
                        ]}>
                          <MaterialIcons 
                            name={
                              record.status === 'present' ? 'check' :
                              record.status === 'absent' ? 'close' : 'remove'
                            }
                            size={12} 
                            color="white" 
                          />
                        </View>
                        <Text style={styles.statusText}>
                          {record.status === 'present' ? 'P' : 
                           record.status === 'absent' ? 'A' : 'NC'}
                        </Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}
          </View>
        )}
      </Animated.View>
    );
  };

  // Empty State Component
  const EmptyState = () => (
    <Animated.View style={[styles.emptyState, { opacity: fadeAnim }]}>
      <MaterialIcons name="event-available" size={64} color={BRAND.textSecondary} />
      <Text style={styles.emptyStateTitle}>No Attendance Records</Text>
      <Text style={styles.emptyStateText}>
        You are not currently assigned to any batch or no attendance has been marked yet.
      </Text>
      <TouchableOpacity
        style={styles.refreshButton}
        onPress={onRefresh}
      >
        <MaterialIcons name="refresh" size={20} color={BRAND.textPrimary} />
        <Text style={styles.refreshButtonText}>Refresh</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  // Loading screen
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar 
          barStyle="light-content" 
          backgroundColor={BRAND.backgroundColor} 
        />
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color={BRAND.primaryColor} />
          <Text style={styles.loadingText}>Loading Attendance Records...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.mainContainer}>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor={BRAND.backgroundColor} 
      />

      {/* Header */}
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color={BRAND.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Attendance Records</Text>
        <TouchableOpacity
          style={styles.refreshHeaderButton}
          onPress={onRefresh}
        >
          <MaterialIcons name="refresh" size={24} color={BRAND.textPrimary} />
        </TouchableOpacity>
      </Animated.View>

      {/* Content */}
      {attendanceData && attendanceData.subjectAttendance.length > 0 ? (
        <ScrollView 
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[BRAND.primaryColor]}
              progressBackgroundColor={BRAND.cardBackground}
            />
          }
        >
          {/* Overall Statistics */}
          <OverallStatsCard />

          {/* Subject-wise Attendance */}
          <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
            <Text style={styles.sectionTitle}>Subject-wise Attendance</Text>
            
            <FlatList
              data={attendanceData.subjectAttendance}
              renderItem={({ item, index }) => (
                <SubjectAttendanceCard item={item} index={index} />
              )}
              keyExtractor={(item) => `${item.batchId}_${item.subjectName}`}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          </Animated.View>
        </ScrollView>
      ) : (
        <EmptyState />
      )}

      {/* Bottom Navigation */}
      <BottomNavigation navigation={navigation} activeTab="Reports" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: BRAND.backgroundColor,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: BRAND.backgroundColor,
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: BRAND.textSecondary,
    fontSize: 16,
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.borderColor,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: BRAND.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  refreshHeaderButton: {
    padding: 4,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  statsCard: {
    backgroundColor: BRAND.cardBackground,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: BRAND.borderColor,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: BRAND.textPrimary,
    marginBottom: 15,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: BRAND.primaryColor,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: BRAND.textSecondary,
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: BRAND.textPrimary,
    marginBottom: 15,
  },
  subjectCard: {
    backgroundColor: BRAND.cardBackground,
    borderRadius: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BRAND.borderColor,
    overflow: 'hidden',
  },
  subjectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  subjectInfo: {
    flex: 1,
  },
  subjectName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: BRAND.textPrimary,
    marginBottom: 4,
  },
  batchInfo: {
    fontSize: 14,
    color: BRAND.textSecondary,
    marginBottom: 2,
  },
  teacherInfo: {
    fontSize: 12,
    color: BRAND.textSecondary,
  },
  subjectStats: {
    alignItems: 'flex-end',
  },
  attendancePercentage: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  classCount: {
    fontSize: 12,
    color: BRAND.textSecondary,
    marginBottom: 4,
  },
  expandedContent: {
    borderTopWidth: 1,
    borderTopColor: BRAND.borderColor,
    padding: 16,
  },
  detailedStats: {
    marginBottom: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statDetailText: {
    fontSize: 14,
    color: BRAND.textSecondary,
    marginLeft: 6,
  },
  recentAttendance: {
    marginTop: 8,
  },
  recentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: BRAND.textPrimary,
    marginBottom: 12,
  },
  attendanceRow: {
    flexDirection: 'row',
    paddingHorizontal: 4,
  },
  attendanceItem: {
    alignItems: 'center',
    marginRight: 16,
    minWidth: 40,
  },
  attendanceDate: {
    fontSize: 10,
    color: BRAND.textSecondary,
    marginBottom: 4,
  },
  statusIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 10,
    color: BRAND.textSecondary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: BRAND.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: BRAND.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND.primaryColor,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  refreshButtonText: {
    color: BRAND.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default StudentAttendanceRecordsScreen;