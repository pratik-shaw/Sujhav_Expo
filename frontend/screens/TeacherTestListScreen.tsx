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
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { RootStackParamList } from '../App';

type TeacherTestListNavigationProp = NativeStackNavigationProp<RootStackParamList>;
type TeacherTestListRouteProp = {
  key: string;
  name: string;
  params: {
    batchId: string;
  };
};

const { width, height } = Dimensions.get('window');

// Brand configuration
const BRAND = {
  name: "SUJHAV",
  primaryColor: '#00ff88',
  secondaryColor: '#000000',
  backgroundColor: '#0a1a0a',
  accentColor: '#1a2e1a',
};

interface Test {
  _id: string;
  testTitle: string;
  fullMarks: number;
  instructions: string;
  dueDate: Date | null;
  isActive: boolean;
  batch: {
    _id: string;
    batchName: string;
    category: string;
  };
  assignedStudents: Array<{
    student: {
      _id: string;
      name: string;
      email: string;
    };
    marksScored: number | null;
    submittedAt: Date | null;
    evaluatedAt: Date | null;
  }>;
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface TestListResponse {
  success: boolean;
  data: Test[];
  message: string;
}

export default function TeacherTestListScreen() {
  const navigation = useNavigation<TeacherTestListNavigationProp>();
  const route = useRoute<TeacherTestListRouteProp>();
  const { batchId } = route.params;

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tests, setTests] = useState<Test[]>([]);
  const [batchName, setBatchName] = useState('');

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-20)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(30)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchTests();
    startEntranceAnimation();
  }, [batchId]);

  const fetchTests = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        Alert.alert('Error', 'No authentication token found');
        return;
      }

      const response = await fetch(`http://192.168.29.148:5000/api/tests/batch/${batchId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data: TestListResponse = await response.json();
      
      if (data.success) {
        setTests(data.data);
        if (data.data.length > 0) {
          setBatchName(data.data[0].batch.batchName);
        }
      } else {
        Alert.alert('Error', data.message || 'Failed to fetch tests');
      }
    } catch (error) {
      console.error('Error fetching tests:', error);
      Alert.alert('Error', 'Network error. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTests();
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
    }, 400);

    // Fade in
    setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    }, 600);
  };

  const handleTestPress = (test: Test) => {
    navigation.navigate('TeacherHandleScoresScreen', {
      testId: test._id,
      testTitle: test.testTitle,
      fullMarks: test.fullMarks,
    });
  };

  const getTestStats = (test: Test) => {
  const totalStudents = test.assignedStudents.length;
  const submittedStudents = test.assignedStudents.filter(s => s.submittedAt);
  const submittedCount = submittedStudents.length;
  
  // Only count evaluations for students who have actually submitted
  const evaluatedCount = submittedStudents.filter(s => s.evaluatedAt).length;
  
  // Pending count should be submitted but not evaluated
  const pendingCount = submittedCount - evaluatedCount;
  
  return {
    totalStudents,
    submittedCount,
    evaluatedCount,
    pendingCount: Math.max(0, pendingCount), // Ensure it's never negative
  };
};

  const renderTestCard = ({ item }: { item: Test }) => {
    const stats = getTestStats(item);
    const isOverdue = item.dueDate && new Date(item.dueDate) < new Date();

    return (
      <Animated.View 
        style={[
          styles.testCard,
          { opacity: contentOpacity, transform: [{ translateY: contentTranslateY }] }
        ]}
      >
        <TouchableOpacity
          style={styles.testCardContent}
          onPress={() => handleTestPress(item)}
          activeOpacity={0.7}
        >
          <View style={styles.testHeader}>
            <View style={styles.testTitleContainer}>
              <Text style={styles.testTitle}>{item.testTitle}</Text>
              <View style={styles.testMeta}>
                <Text style={styles.testMarks}>{item.fullMarks} marks</Text>
                <Text style={[
                  styles.testStatus,
                  { color: item.isActive ? BRAND.primaryColor : '#ff6b6b' }
                ]}>
                  {item.isActive ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>
            <View style={styles.testActions}>
              <MaterialIcons name="arrow-forward-ios" size={20} color="#666" />
            </View>
          </View>

          {item.dueDate && (
            <View style={styles.dueDateContainer}>
              <MaterialIcons 
                name="schedule" 
                size={16} 
                color={isOverdue ? '#ff6b6b' : '#666'} 
              />
              <Text style={[
                styles.dueDateText,
                { color: isOverdue ? '#ff6b6b' : '#666' }
              ]}>
                Due: {new Date(item.dueDate).toLocaleDateString()} at {new Date(item.dueDate).toLocaleTimeString()}
                {isOverdue && ' (Overdue)'}
              </Text>
            </View>
          )}

          <View style={styles.testStats}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.totalStudents}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#ffa500' }]}>
                {stats.submittedCount}
              </Text>
              <Text style={styles.statLabel}>Submitted</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: BRAND.primaryColor }]}>
                {stats.evaluatedCount}
              </Text>
              <Text style={styles.statLabel}>Evaluated</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#ff6b6b' }]}>
                {stats.pendingCount}
              </Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
          </View>

          {stats.pendingCount > 0 && (
            <View style={styles.pendingAlert}>
              <MaterialIcons name="warning" size={16} color="#ffa500" />
              <Text style={styles.pendingAlertText}>
                {stats.pendingCount} submission{stats.pendingCount > 1 ? 's' : ''} pending evaluation
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderEmptyState = () => (
    <Animated.View 
      style={[
        styles.emptyState,
        { opacity: contentOpacity, transform: [{ translateY: contentTranslateY }] }
      ]}
    >
      <MaterialIcons name="assignment" size={80} color="#333" />
      <Text style={styles.emptyStateTitle}>No Tests Found</Text>
      <Text style={styles.emptyStateSubtitle}>
        No tests have been created for this batch yet.
      </Text>
      <TouchableOpacity
        style={styles.createTestButton}
        onPress={() => navigation.navigate('TeacherHandleTestScreen', { batchId })}
      >
        <MaterialIcons name="add" size={20} color="#000" />
        <Text style={styles.createTestButtonText}>Create Test</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={BRAND.backgroundColor} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BRAND.primaryColor} />
          <Text style={styles.loadingText}>Loading tests...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
            <Text style={styles.headerTitle}>Test Scores</Text>
            <Text style={styles.headerSubtitle}>{batchName}</Text>
          </View>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={onRefresh}
          >
            <MaterialIcons name="refresh" size={20} color={BRAND.primaryColor} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Content */}
      <Animated.View 
        style={[
          styles.contentContainer,
          { opacity: fadeAnim }
        ]}
      >
        {tests.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={tests}
            renderItem={renderTestCard}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.testsList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[BRAND.primaryColor]}
                tintColor={BRAND.primaryColor}
              />
            }
          />
        )}
      </Animated.View>
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
    color: '#fff',
    fontSize: 16,
    marginTop: 10,
  },
  backgroundElements: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  glowCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: BRAND.primaryColor,
  },
  glowCircle1: {
    width: 200,
    height: 200,
    top: 100,
    right: -50,
  },
  glowCircle2: {
    width: 150,
    height: 150,
    top: 300,
    left: -75,
  },
  glowCircle3: {
    width: 100,
    height: 100,
    bottom: 200,
    right: 50,
  },
  headerSection: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
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
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BRAND.accentColor,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  testsList: {
    paddingBottom: 20,
  },
  testCard: {
    marginBottom: 15,
    borderRadius: 12,
    backgroundColor: BRAND.accentColor,
    borderWidth: 1,
    borderColor: '#333',
    overflow: 'hidden',
  },
  testCardContent: {
    padding: 20,
  },
  testHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  testTitleContainer: {
    flex: 1,
  },
  testTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  testMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  testMarks: {
    fontSize: 14,
    color: '#888',
  },
  testStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  testActions: {
    marginLeft: 10,
  },
  dueDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 8,
  },
  dueDateText: {
    fontSize: 14,
  },
  testStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
    paddingVertical: 15,
    backgroundColor: '#0f2f0f',
    borderRadius: 8,
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
    color: '#888',
    marginTop: 2,
  },
  pendingAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    backgroundColor: '#2a1f00',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#ffa500',
  },
  pendingAlertText: {
    color: '#ffa500',
    fontSize: 12,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 22,
  },
  createTestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: BRAND.primaryColor,
    borderRadius: 8,
    marginTop: 20,
  },
  createTestButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
});