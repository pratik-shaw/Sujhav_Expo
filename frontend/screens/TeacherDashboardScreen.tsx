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
  Image,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  FlatList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons, Feather, FontAwesome5, AntDesign, Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../App';
import { API_BASE } from '../config/api';

type TeacherDashboardNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width, height } = Dimensions.get('window');

// Brand configuration (matching the app theme)
const BRAND = {
  name: "SUJHAV",
  subtitle: "Synchronize your Understanding, do Justice to your Hardwork and let others Admire your Victory!",
  primaryColor: '#00ff88',
  secondaryColor: '#000000',
  backgroundColor: '#0a1a0a',
  accentColor: '#1a2e1a',
};

const API_BASE_URL = API_BASE;

// Quick action interface
interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  iconLibrary: 'MaterialIcons' | 'Feather' | 'FontAwesome5' | 'AntDesign' | 'Ionicons';
  color: string;
  backgroundColor: string;
  onPress: () => void;
}

// Batch interface
interface Batch {
  _id: string;
  batchName: string;
  classes: string[];
  category: string;
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

export default function TeacherDashboardScreen() {
  const navigation = useNavigation<TeacherDashboardNavigationProp>();
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [teacherName, setTeacherName] = useState<string>('');
  const [batches, setBatches] = useState<Batch[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-20)).current;
  const quickActionsOpacity = useRef(new Animated.Value(0)).current;
  const quickActionsTranslateY = useRef(new Animated.Value(30)).current;
  const batchListOpacity = useRef(new Animated.Value(0)).current;
  const batchListTranslateY = useRef(new Animated.Value(30)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadTeacherData();
    fetchTeacherBatches();
    startEntranceAnimation();
    startPulseAnimation();
  }, []);

  const loadTeacherData = async () => {
    try {
      const userName = await AsyncStorage.getItem('userName');
      setTeacherName(userName || 'Teacher');
    } catch (error) {
      console.error('Error loading teacher data:', error);
      setTeacherName('Teacher');
    }
  };

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
        // Calculate total students across all batches
        const totalStudentsCount = data.data.reduce((total, batch) => total + batch.students.length, 0);
        setTotalStudents(totalStudentsCount);
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

    // Quick actions animation
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(quickActionsOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(quickActionsTranslateY, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }, 300);

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

  const handleLogout = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              await AsyncStorage.multiRemove([
                'userToken',
                'userRole',
                'userId',
                'userName',
                'userData'
              ]);
              navigation.replace('Intro');
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert("Error", "Failed to sign out. Please try again.");
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const navigateToBatchDetails = (batchId: string) => {
    navigation.navigate('TeacherBatchDetailsScreen', { batchId });
  };

  // Quick action handlers
  const handleAddEvents = () => {
    navigation.navigate('TeacherBatchCalendarScreen', { batchId: '', batchName: '' });
  };

  const handleAddCurriculum = () => {
    navigation.navigate('AdminAccessStudentReportsScreen');
  };

  const handleMarkAttendance = () => {
    navigation.navigate('TeacherBatchAttendanceScreen', { batchId: '', batchName: '' });
  };

  // Quick actions configuration
  const quickActions: QuickAction[] = [
    {
      id: 'events',
      title: 'Events & Calendar',
      description: 'Schedule and manage events',
      icon: 'calendar-today',
      iconLibrary: 'MaterialIcons',
      color: '#4CAF50',
      backgroundColor: '#4CAF5020',
      onPress: handleAddEvents,
    },
    {
      id: 'attendance_reports',
      title: 'Student Attedance Reports',
      description: 'View detailed attendance reports',
      icon: 'stats-chart',
      iconLibrary: 'Ionicons',
      color: '#2196F3',
      backgroundColor: '#2196F320',
      onPress: handleAddCurriculum,
    },
    {
      id: 'attendance',
      title: 'Mark Attendance',
      description: 'Track student attendance',
      icon: 'checkcircleo',
      iconLibrary: 'AntDesign',
      color: '#FF9800',
      backgroundColor: '#FF980020',
      onPress: handleMarkAttendance,
    },
  ];

  const renderIcon = (iconLibrary: string, iconName: string, size: number, color: string) => {
    switch (iconLibrary) {
      case 'MaterialIcons':
        return <MaterialIcons name={iconName as any} size={size} color={color} />;
      case 'Feather':
        return <Feather name={iconName as any} size={size} color={color} />;
      case 'FontAwesome5':
        return <FontAwesome5 name={iconName as any} size={size} color={color} />;
      case 'AntDesign':
        return <AntDesign name={iconName as any} size={size} color={color} />;
      case 'Ionicons':
        return <Ionicons name={iconName as any} size={size} color={color} />;
      default:
        return <MaterialIcons name="help" size={size} color={color} />;
    }
  };

  const renderQuickActionCard = ({ item, index }: { item: QuickAction; index: number }) => (
    <Animated.View
      style={[
        styles.quickActionCard,
        {
          opacity: quickActionsOpacity,
          transform: [
            { translateY: quickActionsTranslateY },
            { scale: pulseScale }
          ],
        },
      ]}
    >
      <TouchableOpacity
        style={[styles.quickActionTouchable, { backgroundColor: item.backgroundColor }]}
        onPress={item.onPress}
        activeOpacity={0.8}
      >
        <View style={[styles.quickActionIconContainer, { backgroundColor: item.color + '30' }]}>
          {renderIcon(item.iconLibrary, item.icon, 24, item.color)}
        </View>
        <View style={styles.quickActionContent}>
          <Text style={styles.quickActionTitle}>{item.title}</Text>
          <Text style={styles.quickActionDescription}>{item.description}</Text>
        </View>
        <View style={[styles.quickActionArrow, { backgroundColor: item.color + '20' }]}>
          <Feather name="arrow-right" size={16} color={item.color} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

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
        onPress={() => navigateToBatchDetails(item._id)}
        activeOpacity={0.8}
      >
        <View style={styles.batchCardHeader}>
          <View style={styles.batchIconContainer}>
            <MaterialIcons name="group" size={24} color={BRAND.primaryColor} />
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
              <MaterialIcons name="people" size={16} color="#888" />
              <Text style={styles.batchInfoText}>
                {item.students.length} Students
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
        </View>

        <View style={styles.batchCardFooter}>
          <Text style={styles.batchStatus}>
            {item.isActive ? 'Active' : 'Inactive'}
          </Text>
          <Text style={styles.batchDate}>
            Created: {new Date(item.createdAt).toLocaleDateString()}
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
      <MaterialIcons name="school" size={64} color="#333" />
      <Text style={styles.emptyStateTitle}>No Batches Assigned</Text>
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
            <View style={styles.logoContainer}>
              <Image
                source={require('../assets/images/logo-sujhav.png')}
                style={styles.headerLogoImage}
                resizeMode="contain"
              />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Teacher Dashboard</Text>
              <Text style={styles.headerSubtitle}>Welcome back, {teacherName}</Text>
            </View>
            <TouchableOpacity 
              style={styles.logoutButton}
              onPress={handleLogout}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#ff6b6b" />
              ) : (
                <MaterialIcons name="logout" size={20} color="#ff6b6b" />
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
              <Text style={styles.statNumber}>{batches.length}</Text>
              <Text style={styles.statLabel}>My Batches</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{totalStudents}</Text>
              <Text style={styles.statLabel}>Total Students</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{batches.filter(b => b.isActive).length}</Text>
              <Text style={styles.statLabel}>Active Batches</Text>
            </View>
          </View>
        </Animated.View>

        {/* Quick Actions Section */}
        <Animated.View 
          style={[
            styles.quickActionsSection,
            { opacity: fadeAnim }
          ]}
        >
          <View style={styles.quickActionsHeader}>
            <Text style={styles.quickActionsTitle}>Quick Actions</Text>
            <Text style={styles.quickActionsSubtitle}>Manage your teaching activities</Text>
          </View>
          
          <FlatList
            data={quickActions}
            renderItem={renderQuickActionCard}
            keyExtractor={(item) => item.id}
            horizontal={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.quickActionsList}
            scrollEnabled={false}
          />
        </Animated.View>

        {/* Batches Section */}
        <Animated.View 
          style={[
            styles.batchesSection,
            { opacity: fadeAnim }
          ]}
        >
          <View style={styles.batchesHeader}>
            <Text style={styles.batchesTitle}>My Batches</Text>
            <TouchableOpacity 
              onPress={onRefresh}
              style={styles.refreshButton}
            >
              <MaterialIcons name="refresh" size={20} color={BRAND.primaryColor} />
            </TouchableOpacity>
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
  logoContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BRAND.accentColor,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BRAND.primaryColor + '30',
  },
  headerLogoImage: {
    width: 24,
    height: 24,
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
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BRAND.accentColor,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ff6b6b30',
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
    fontSize: 24,
    fontWeight: 'bold',
    color: BRAND.primaryColor,
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#333',
  },
  quickActionsSection: {
    paddingHorizontal: 20,
    marginBottom: 25,
  },
  quickActionsHeader: {
    marginBottom: 20,
  },
  quickActionsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  quickActionsSubtitle: {
    fontSize: 14,
    color: '#888',
  },
  quickActionsList: {
    gap: 15,
  },
  quickActionCard: {
    borderRadius: 15,
    overflow: 'hidden',
  },
  quickActionTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  quickActionIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  quickActionContent: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  quickActionDescription: {
    fontSize: 13,
    color: '#aaa',
  },
  quickActionArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  batchesSection: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  batchesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  batchesTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  refreshButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: BRAND.accentColor,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BRAND.primaryColor + '30',
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
  },
  batchCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  batchStatus: {
    fontSize: 12,
    color: BRAND.primaryColor,
    fontWeight: '600',
  },
  batchDate: {
    fontSize: 12,
    color: '#666',
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