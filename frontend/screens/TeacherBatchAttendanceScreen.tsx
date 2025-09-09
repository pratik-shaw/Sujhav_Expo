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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { RootStackParamList } from '../App';
import { API_BASE } from '../config/api';

type TeacherBatchAttendanceNavigationProp = NativeStackNavigationProp<RootStackParamList>;

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

// Subject interface
interface Subject {
  name: string;
  teacher: string;
  _id?: string;
}

// Batch interface
interface Batch {
  _id: string;
  batchName: string;
  classes: string[];
  category: string;
  subjects: Subject[];
  students: Array<{
    _id: string;
    name: string;
    email: string;
  }>;
  teachers: Array<{
    _id: string;
    name: string;
    email: string;
  }>;
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  schedule?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// API response interface
interface BatchResponse {
  success: boolean;
  data: Batch[];
  count: number;
  message: string;
}

export default function TeacherBatchAttendanceScreen() {
  const navigation = useNavigation<TeacherBatchAttendanceNavigationProp>();
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [totalSubjects, setTotalSubjects] = useState(0);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-20)).current;
  const batchListOpacity = useRef(new Animated.Value(0)).current;
  const batchListTranslateY = useRef(new Animated.Value(30)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fetchTeacherBatches();
    startEntranceAnimation();
    startPulseAnimation();
  }, []);

  const fetchTeacherBatches = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        Alert.alert('Error', 'No authentication token found');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/batches/teacher/my-batches`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data: BatchResponse = await response.json();
      
      if (data.success) {
        setBatches(data.data);
        // Calculate total subjects taught by this teacher
        const subjectCount = data.data.reduce((total, batch) => {
          return total + batch.subjects.length;
        }, 0);
        setTotalSubjects(subjectCount);
      } else {
        Alert.alert('Error', data.message || 'Failed to fetch batches');
      }
    } catch (error) {
      console.error('Error fetching teacher batches:', error);
      Alert.alert('Error', 'Network error. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTeacherBatches();
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

    // Batch list animation
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(batchListOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(batchListTranslateY, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }, 500);

    // Content fade in
    setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    }, 700);
  };

  const startPulseAnimation = () => {
    const pulse = () => {
      Animated.sequence([
        Animated.timing(pulseScale, {
          toValue: 1.02,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseScale, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
      ]).start(() => pulse());
    };
    pulse();
  };

  const handleBatchPress = (batch: Batch) => {
    navigation.navigate('TeacherHandleBatchAttendanceScreen', { 
      batchId: batch._id,
      batchName: batch.batchName,
      subjects: batch.subjects
    });
  };

  const goBack = () => {
    navigation.goBack();
  };

  const renderBatchCard = ({ item }: { item: Batch }) => (
    <Animated.View
      style={[
        styles.batchCard,
        {
          opacity: batchListOpacity,
          transform: [
            { translateY: batchListTranslateY },
            { scale: pulseScale }
          ],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.batchCardTouchable}
        onPress={() => handleBatchPress(item)}
        activeOpacity={0.8}
      >
        <View style={styles.batchCardHeader}>
          <View style={styles.batchIconContainer}>
            <MaterialIcons name="people" size={24} color={BRAND.primaryColor} />
          </View>
          <View style={styles.batchHeaderText}>
            <Text style={styles.batchName}>{item.batchName}</Text>
            <Text style={styles.batchCategory}>{item.category.toUpperCase()}</Text>
          </View>
          <View style={styles.batchArrow}>
            <Feather name="arrow-right" size={18} color={BRAND.primaryColor} />
          </View>
        </View>

        <View style={styles.batchCardContent}>
          <View style={styles.batchInfo}>
            <View style={styles.batchInfoItem}>
              <MaterialIcons name="school" size={16} color="#888" />
              <Text style={styles.batchInfoText}>
                Classes: {item.classes.join(', ')}
              </Text>
            </View>
            
            <View style={styles.batchInfoItem}>
              <MaterialIcons name="group" size={16} color="#888" />
              <Text style={styles.batchInfoText}>
                {item.students.length} Students
              </Text>
            </View>

            <View style={styles.batchInfoItem}>
              <MaterialIcons name="book" size={16} color="#888" />
              <Text style={styles.batchInfoText}>
                {item.subjects.length} Subjects
              </Text>
            </View>

            {item.schedule && (
              <View style={styles.batchInfoItem}>
                <MaterialIcons name="schedule" size={16} color="#888" />
                <Text style={styles.batchInfoText}>
                  {item.schedule}
                </Text>
              </View>
            )}
          </View>

          {item.description && (
            <Text style={styles.batchDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}

          {/* Subject Pills */}
          <View style={styles.subjectPills}>
            {item.subjects.slice(0, 3).map((subject, index) => (
              <View key={index} style={styles.subjectPill}>
                <Text style={styles.subjectPillText}>{subject.name}</Text>
              </View>
            ))}
            {item.subjects.length > 3 && (
              <View style={styles.subjectPillMore}>
                <Text style={styles.subjectPillMoreText}>
                  +{item.subjects.length - 3} more
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.batchCardFooter}>
          <View style={styles.attendanceInfo}>
            <MaterialIcons name="check-circle" size={16} color={BRAND.primaryColor} />
            <Text style={styles.attendanceText}>Tap to mark attendance</Text>
          </View>
          <Text style={styles.batchStatus}>
            {item.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderEmptyState = () => (
    <Animated.View 
      style={[
        styles.emptyState,
        { opacity: fadeAnim }
      ]}
    >
      <MaterialIcons name="assignment-late" size={64} color="#333" />
      <Text style={styles.emptyStateTitle}>No Batches Available</Text>
      <Text style={styles.emptyStateDescription}>
        You haven't been assigned to any batches yet. Contact your administrator for batch assignments.
      </Text>
    </Animated.View>
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
        <Animated.View 
          style={[
            styles.glowCircle,
            styles.glowCircle3,
            { opacity: Animated.multiply(glowOpacity, 0.04) }
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
              onPress={goBack}
            >
              <MaterialIcons name="arrow-back" size={24} color={BRAND.primaryColor} />
            </TouchableOpacity>
            
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Attendance Management</Text>
              <Text style={styles.headerSubtitle}>Select a batch to mark attendance</Text>
            </View>
            
            <TouchableOpacity 
              onPress={onRefresh}
              style={styles.refreshButton}
              disabled={isLoading}
            >
              {isLoading || refreshing ? (
                <ActivityIndicator size="small" color={BRAND.primaryColor} />
              ) : (
                <MaterialIcons name="refresh" size={20} color={BRAND.primaryColor} />
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Stats Section */}
        <Animated.View 
          style={[
            styles.statsSection,
            { opacity: fadeAnim }
          ]}
        >
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <MaterialIcons name="group" size={24} color={BRAND.primaryColor} />
              <Text style={styles.statNumber}>{batches.length}</Text>
              <Text style={styles.statLabel}>Total Batches</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <MaterialIcons name="book" size={24} color="#4CAF50" />
              <Text style={styles.statNumber}>{totalSubjects}</Text>
              <Text style={styles.statLabel}>Subjects Teaching</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <MaterialIcons name="people" size={24} color="#FF9800" />
              <Text style={styles.statNumber}>
                {batches.reduce((total, batch) => total + batch.students.length, 0)}
              </Text>
              <Text style={styles.statLabel}>Total Students</Text>
            </View>
          </View>
        </Animated.View>

        {/* Batches Section */}
        <Animated.View 
          style={[
            styles.batchesSection,
            { opacity: fadeAnim }
          ]}
        >
          <View style={styles.batchesHeader}>
            <Text style={styles.batchesTitle}>Select Batch</Text>
            <Text style={styles.batchesSubtitle}>Tap any batch to mark student attendance</Text>
          </View>

          {isLoading && !refreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={BRAND.primaryColor} />
              <Text style={styles.loadingText}>Loading your batches...</Text>
            </View>
          ) : batches.length > 0 ? (
            <FlatList
              data={batches}
              renderItem={renderBatchCard}
              keyExtractor={(item) => item._id}
              showsVerticalScrollIndicator={false}
              scrollEnabled={false}
              contentContainerStyle={styles.batchesList}
            />
          ) : (
            renderEmptyState()
          )}
        </Animated.View>
      </ScrollView>
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
  glowCircle3: {
    width: 200,
    height: 200,
    top: height * 0.4,
    right: -100,
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
    justifyContent: 'space-between',
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
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BRAND.accentColor,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BRAND.primaryColor + '30',
  },
  statsSection: {
    marginHorizontal: 20,
    marginBottom: 25,
    backgroundColor: BRAND.accentColor,
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: BRAND.primaryColor + '20',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 5,
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 50,
    backgroundColor: '#333',
  },
  batchesSection: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  batchesHeader: {
    marginBottom: 20,
  },
  batchesTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  batchesSubtitle: {
    fontSize: 14,
    color: '#888',
  },
  loadingContainer: {
    paddingVertical: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    marginTop: 10,
    fontSize: 14,
  },
  batchesList: {
    gap: 15,
  },
  batchCard: {
    borderRadius: 15,
    backgroundColor: BRAND.accentColor,
    borderWidth: 1,
    borderColor: BRAND.primaryColor + '20',
    overflow: 'hidden',
  },
  batchCardTouchable: {
    padding: 20,
  },
  batchCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  batchIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BRAND.primaryColor + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  batchHeaderText: {
    flex: 1,
  },
  batchName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  batchCategory: {
    fontSize: 12,
    color: BRAND.primaryColor,
    fontWeight: '600',
  },
  batchArrow: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: BRAND.primaryColor + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  batchCardContent: {
    marginBottom: 15,
  },
  batchInfo: {
    marginBottom: 10,
  },
  batchInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  batchInfoText: {
    fontSize: 14,
    color: '#ccc',
    marginLeft: 8,
  },
  batchDescription: {
    fontSize: 13,
    color: '#aaa',
    lineHeight: 18,
    marginBottom: 10,
  },
  subjectPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  subjectPill: {
    backgroundColor: BRAND.primaryColor + '15',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: BRAND.primaryColor + '30',
  },
  subjectPillText: {
    fontSize: 11,
    color: BRAND.primaryColor,
    fontWeight: '600',
  },
  subjectPillMore: {
    backgroundColor: '#333',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  subjectPillMoreText: {
    fontSize: 11,
    color: '#888',
    fontWeight: '500',
  },
  batchCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  attendanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attendanceText: {
    fontSize: 12,
    color: BRAND.primaryColor,
    marginLeft: 5,
    fontWeight: '600',
  },
  batchStatus: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  emptyState: {
    paddingVertical: 60,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyStateDescription: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
});