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
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { RootStackParamList } from '../App';

type TeacherBatchDetailsNavigationProp = NativeStackNavigationProp<RootStackParamList>;
type TeacherBatchDetailsRouteProp = {
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

// Student interface
interface Student {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
}

// Teacher interface
interface Teacher {
  _id: string;
  name: string;
  email: string;
}

// Batch interface
interface Batch {
  _id: string;
  batchName: string;
  classes: string[];
  category: string;
  students: Student[];
  teachers: Teacher[];
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
  data: Batch;
  message: string;
}

export default function TeacherBatchDetailsScreen() {
  const navigation = useNavigation<TeacherBatchDetailsNavigationProp>();
  const route = useRoute<TeacherBatchDetailsRouteProp>();
  const { batchId } = route.params;

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [batch, setBatch] = useState<Batch | null>(null);
  const [activeTab, setActiveTab] = useState<'students' | 'details' | 'reports'>('students');

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-20)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(30)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchBatchDetails();
    startEntranceAnimation();
  }, [batchId]);

  const fetchBatchDetails = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        Alert.alert('Error', 'No authentication token found');
        return;
      }

      const response = await fetch(`http://192.168.29.148:5000/api/batches/teacher/batch/${batchId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data: BatchResponse = await response.json();
      
      if (data.success) {
        setBatch(data.data);
      } else {
        Alert.alert('Error', data.message || 'Failed to fetch batch details');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error fetching batch details:', error);
      Alert.alert('Error', 'Network error. Please check your connection.');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBatchDetails();
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

  const renderStudentCard = ({ item }: { item: Student }) => (
    <Animated.View 
      style={[
        styles.studentCard,
        { opacity: contentOpacity, transform: [{ translateY: contentTranslateY }] }
      ]}
    >
      <View style={styles.studentCardContent}>
        <View style={styles.studentIconContainer}>
          <MaterialIcons name="person" size={24} color={BRAND.primaryColor} />
        </View>
        <View style={styles.studentInfo}>
          <Text style={styles.studentName}>{item.name}</Text>
          <Text style={styles.studentEmail}>{item.email}</Text>
          <Text style={styles.studentJoinDate}>
            Joined: {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.studentActions}>
          <TouchableOpacity style={styles.actionButton}>
            <MaterialIcons name="chat" size={16} color={BRAND.primaryColor} />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );

  const renderTestReportsSection = () => (
  <Animated.View 
    style={[
      styles.reportsContainer,
      { opacity: contentOpacity, transform: [{ translateY: contentTranslateY }] }
    ]}
  >
    <ScrollView 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.reportsContent}
    >
      {/* Test Management Section */}
      <View style={styles.reportsSection}>
        <Text style={styles.sectionTitle}>Test Management</Text>
        <TouchableOpacity 
          style={styles.reportActionCard}
          onPress={() => navigation.navigate('TeacherHandleTestScreen', { batchId })}
        >
          <View style={styles.reportActionContent}>
            <View style={styles.reportActionIcon}>
              <MaterialIcons name="quiz" size={28} color={BRAND.primaryColor} />
            </View>
            <View style={styles.reportActionText}>
              <Text style={styles.reportActionTitle}>Create & Manage Tests</Text>
              <Text style={styles.reportActionDescription}>
                Create new tests, edit existing ones, and manage test schedules
              </Text>
            </View>
            <MaterialIcons name="arrow-forward-ios" size={20} color="#666" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Reports Section */}
      <View style={styles.reportsSection}>
        <Text style={styles.sectionTitle}>Reports & Analytics</Text>
        <TouchableOpacity 
          style={styles.reportActionCard}
          onPress={() => navigation.navigate('TeacherHandleReportsScreen', { batchId })}
        >
          <View style={styles.reportActionContent}>
            <View style={styles.reportActionIcon}>
              <MaterialIcons name="assessment" size={28} color={BRAND.primaryColor} />
            </View>
            <View style={styles.reportActionText}>
              <Text style={styles.reportActionTitle}>View Test Reports</Text>
              <Text style={styles.reportActionDescription}>
                Analyze student performance and generate detailed reports
              </Text>
            </View>
            <MaterialIcons name="arrow-forward-ios" size={20} color="#666" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Test Scores Section - Updated */}
      <View style={styles.reportsSection}>
        <Text style={styles.sectionTitle}>Test Scores</Text>
        <TouchableOpacity 
          style={styles.reportActionCard}
          onPress={() => navigation.navigate('TeacherTestListScreen', { batchId })}
        >
          <View style={styles.reportActionContent}>
            <View style={styles.reportActionIcon}>
              <MaterialIcons name="quiz" size={28} color={BRAND.primaryColor} />
            </View>
            <View style={styles.reportActionText}>
              <Text style={styles.reportActionTitle}>Score Students Tests</Text>
              <Text style={styles.reportActionDescription}>
                Grade students for the tests you have created and assigned 
              </Text>
            </View>
            <MaterialIcons name="arrow-forward-ios" size={20} color="#666" />
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  </Animated.View>
);

  const renderBatchDetails = () => (
    <Animated.View 
      style={[
        styles.detailsContainer,
        { opacity: contentOpacity, transform: [{ translateY: contentTranslateY }] }
      ]}
    >
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.detailsContent}
      >
        {/* Batch Information */}
        <View style={styles.detailSection}>
          <Text style={styles.sectionTitle}>Batch Information</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Batch Name:</Text>
            <Text style={styles.detailValue}>{batch?.batchName}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Category:</Text>
            <Text style={styles.detailValue}>{batch?.category}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Classes:</Text>
            <Text style={styles.detailValue}>{batch?.classes.join(', ')}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status:</Text>
            <Text style={[styles.detailValue, { color: batch?.isActive ? BRAND.primaryColor : '#ff6b6b' }]}>
              {batch?.isActive ? 'Active' : 'Inactive'}
            </Text>
          </View>
          {batch?.schedule && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Schedule:</Text>
              <Text style={styles.detailValue}>{batch.schedule}</Text>
            </View>
          )}
        </View>

        {/* Description */}
        {batch?.description && (
          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.descriptionText}>{batch.description}</Text>
          </View>
        )}

        {/* Statistics */}
        <View style={styles.detailSection}>
          <Text style={styles.sectionTitle}>Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{batch?.students.length || 0}</Text>
              <Text style={styles.statLabel}>Students</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{batch?.teachers.length || 0}</Text>
              <Text style={styles.statLabel}>Teachers</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{batch?.classes.length || 0}</Text>
              <Text style={styles.statLabel}>Classes</Text>
            </View>
          </View>
        </View>

        {/* Created By */}
        <View style={styles.detailSection}>
          <Text style={styles.sectionTitle}>Created By</Text>
          <View style={styles.creatorInfo}>
            <View style={styles.creatorIcon}>
              <MaterialIcons name="person" size={20} color={BRAND.primaryColor} />
            </View>
            <View style={styles.creatorText}>
              <Text style={styles.creatorName}>{batch?.createdBy.name}</Text>
              <Text style={styles.creatorEmail}>{batch?.createdBy.email}</Text>
            </View>
          </View>
        </View>

        {/* Timestamps */}
        <View style={styles.detailSection}>
          <Text style={styles.sectionTitle}>Timeline</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Created:</Text>
            <Text style={styles.detailValue}>
              {batch ? new Date(batch.createdAt).toLocaleDateString() : ''}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Last Updated:</Text>
            <Text style={styles.detailValue}>
              {batch ? new Date(batch.updatedAt).toLocaleDateString() : ''}
            </Text>
          </View>
        </View>
      </ScrollView>
    </Animated.View>
  );

  const renderEmptyStudents = () => (
    <Animated.View 
      style={[
        styles.emptyState,
        { opacity: fadeAnim }
      ]}
    >
      <MaterialIcons name="group" size={64} color="#333" />
      <Text style={styles.emptyStateTitle}>No Students Yet</Text>
      <Text style={styles.emptyStateDescription}>
        This batch doesn't have any students enrolled yet.
      </Text>
    </Animated.View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={BRAND.backgroundColor} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BRAND.primaryColor} />
          <Text style={styles.loadingText}>Loading batch details...</Text>
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
            <Text style={styles.headerTitle}>{batch?.batchName}</Text>
            <Text style={styles.headerSubtitle}>{batch?.category}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.refreshButton}
              onPress={onRefresh}
            >
              <MaterialIcons name="refresh" size={20} color={BRAND.primaryColor} />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      {/* Tab Navigation */}
      <Animated.View 
        style={[
          styles.tabContainer,
          { opacity: fadeAnim }
        ]}
      >
        <View style={styles.tabNavigation}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'students' && styles.activeTabButton]}
            onPress={() => setActiveTab('students')}
          >
            <Text style={[styles.tabText, activeTab === 'students' && styles.activeTabText]}>
              Students
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'details' && styles.activeTabButton]}
            onPress={() => setActiveTab('details')}
          >
            <Text style={[styles.tabText, activeTab === 'details' && styles.activeTabText]}>
              Details
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'reports' && styles.activeTabButton]}
            onPress={() => setActiveTab('reports')}
          >
            <Text style={[styles.tabText, activeTab === 'reports' && styles.activeTabText]}>
              Tests & Reports
            </Text>
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
        {activeTab === 'students' ? (
          batch?.students.length ? (
            <FlatList
              data={batch.students}
              renderItem={renderStudentCard}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.studentsList}
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
          ) : (
            renderEmptyStudents()
          )
        ) : activeTab === 'details' ? (
          renderBatchDetails()
        ) : (
          renderTestReportsSection()
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    marginTop: 10,
    fontSize: 14,
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
    color: BRAND.primaryColor,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
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
  tabContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  tabNavigation: {
    flexDirection: 'row',
    backgroundColor: BRAND.accentColor,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: BRAND.primaryColor + '20',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTabButton: {
    backgroundColor: BRAND.primaryColor,
  },
  tabText: {
    fontSize: 12,
    color: '#888',
    fontWeight: '600',
    textAlign: 'center',
  },
  activeTabText: {
    color: BRAND.backgroundColor,
    fontWeight: 'bold',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  studentsList: {
    paddingBottom: 20,
  },
  studentCard: {
    marginBottom: 12,
    backgroundColor: BRAND.accentColor,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: BRAND.primaryColor + '20',
    overflow: 'hidden',
  },
  studentCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  studentIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: BRAND.primaryColor + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  studentEmail: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 2,
  },
  studentJoinDate: {
    fontSize: 12,
    color: '#666',
  },
  studentActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: BRAND.primaryColor + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsContainer: {
    flex: 1,
  },
  detailsContent: {
    paddingBottom: 20,
  },
  detailSection: {
    backgroundColor: BRAND.accentColor,
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: BRAND.primaryColor + '20',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 14,
    color: '#aaa',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: 10,
  },
  descriptionText: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
    padding: 15,
    backgroundColor: BRAND.primaryColor + '10',
    borderRadius: 10,
    minWidth: 80,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: BRAND.primaryColor,
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
  },
  creatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  creatorIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BRAND.primaryColor + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  creatorText: {
    flex: 1,
  },
  creatorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  creatorEmail: {
    fontSize: 14,
    color: '#aaa',
  },
  emptyState: {
    flex: 1,
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
  // Reports section styles
  reportsContainer: {
    flex: 1,
  },
  reportsContent: {
    paddingBottom: 20,
  },
  reportsSection: {
    backgroundColor: BRAND.accentColor,
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: BRAND.primaryColor + '20',
  },
  reportActionCard: {
    backgroundColor: BRAND.primaryColor + '10',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BRAND.primaryColor + '20',
  },
  reportActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reportActionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: BRAND.primaryColor + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  reportActionText: {
    flex: 1,
  },
  reportActionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  reportActionDescription: {
    fontSize: 14,
    color: '#aaa',
    lineHeight: 18,
  },
});