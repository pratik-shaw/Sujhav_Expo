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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons, Feather, FontAwesome5 } from '@expo/vector-icons';
import { RootStackParamList } from '../App';

type AdminDashboardNavigationProp = NativeStackNavigationProp<RootStackParamList>;

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

// Quick Actions Configuration
const QUICK_ACTIONS = [
  {
    id: 'paid_notes',
    title: 'Paid Notes',
    icon: 'note-add',
    color: '#FFD700',
    screen: 'AdminPaidNotesScreen',
  },
  {
    id: 'free_notes',
    title: 'Free Notes',
    icon: 'note',
    color: '#4CAF50',
    screen: 'AdminAddFreeNotesScreen',
  },
  {
    id: 'paid_materials',
    title: 'Paid Materials',
    icon: 'library-books',
    color: '#FF6B6B',
    screen: 'AdminAddPaidMaterialsScreen',
  },
  {
    id: 'free_materials',
    title: 'Free Materials',
    icon: 'menu-book',
    color: '#4ECDC4',
    screen: 'AdminAddFreeMaterialsScreen',
  },
  {
    id: 'paid_dpp',
    title: 'Paid DPPs',
    icon: 'assignment',
    color: '#9C27B0',
    screen: 'AdminAddPaidDPPScreen',
  },
  {
    id: 'free_dpp',
    title: 'Free DPPs',
    icon: 'assignment-turned-in',
    color: '#2196F3',
    screen: 'AdminAddFreeDPPScreen',
  },
  {
    id: 'paid_test_series',
    title: 'Paid Tests',
    icon: 'quiz',
    color: '#FF5722',
    screen: 'AdminAddPaidTestSeriesScreen',
  },
  {
    id: 'free_test_series',
    title: 'Free Tests',
    icon: 'fact-check',
    color: '#8BC34A',
    screen: 'AdminAddFreeTestSeriesScreen',
  },
];

export default function AdminDashboardScreen() {
  const navigation = useNavigation<AdminDashboardNavigationProp>();
  const [isLoading, setIsLoading] = useState(false);
  const [adminName, setAdminName] = useState<string>('');

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-20)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.8)).current;
  const quickActionsOpacity = useRef(new Animated.Value(0)).current;
  const quickActionsTranslateY = useRef(new Animated.Value(30)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadAdminData();
    startEntranceAnimation();
    startPulseAnimation();
  }, []);

  const loadAdminData = async () => {
    try {
      const userName = await AsyncStorage.getItem('userName');
      setAdminName(userName || 'Administrator');
    } catch (error) {
      console.error('Error loading admin data:', error);
      setAdminName('Administrator');
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

    // Quick Actions animation
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
    }, 400);

    // Cards animation
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(cardScale, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }, 600);

    // Content fade in
    setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    }, 1000);
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

  // Simplified quick action handler - direct navigation
  const handleQuickAction = (action: typeof QUICK_ACTIONS[0]) => {
    console.log(`Navigating to ${action.screen}`);
    navigation.navigate(action.screen as keyof RootStackParamList);
  };

  // Simplified course handlers - direct navigation
  const handleAddPaidCourse = () => {
    console.log("Navigate to Add Paid Course Screen");
    navigation.navigate('AdminAddPaidCourseScreen');
  };

  const handleAddFreeCourse = () => {
    console.log("Navigate to Add Free Course Screen");
    navigation.navigate('AdminAddUnpaidCourseScreen');
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

  const renderQuickActionButton = (action: typeof QUICK_ACTIONS[0], index: number) => (
    <Animated.View
      key={action.id}
      style={[
        styles.quickActionButton,
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
        style={[
          styles.quickActionTouchable,
          { borderColor: action.color + '40' }
        ]}
        onPress={() => handleQuickAction(action)}
        activeOpacity={0.7}
      >
        <View style={[styles.quickActionIconContainer, { backgroundColor: action.color + '20' }]}>
          <MaterialIcons name={action.icon as keyof typeof MaterialIcons.glyphMap} size={24} color={action.color} />
        </View>
        <Text style={styles.quickActionTitle}>{action.title}</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderActionCard = (
    title: string,
    description: string,
    icon: keyof typeof MaterialIcons.glyphMap,
    color: string,
    onPress: () => void,
    isPrimary: boolean = false
  ) => (
    <Animated.View
      style={[
        styles.actionCard,
        isPrimary && styles.primaryCard,
        {
          opacity: cardOpacity,
          transform: [
            { scale: Animated.multiply(cardScale, pulseScale) }
          ],
        },
      ]}
    >
      <TouchableOpacity
        style={[styles.cardTouchable, { borderColor: color }]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        {isPrimary && (
          <Animated.View
            style={[
              styles.cardGlow,
              { opacity: Animated.multiply(glowOpacity, 0.3) }
            ]}
          />
        )}
        
        <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
          <MaterialIcons name={icon} size={32} color={color} />
        </View>
        
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardDescription}>{description}</Text>
        
        <View style={styles.cardArrow}>
          <Feather name="arrow-right" size={20} color={color} />
        </View>
      </TouchableOpacity>
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
            <Text style={styles.headerTitle}>Admin Dashboard</Text>
            <Text style={styles.headerSubtitle}>Welcome back, {adminName}</Text>
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

      {/* Scrollable Content */}
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Main Content */}
        <View style={styles.contentContainer}>
          {/* Quick Actions Section */}
          <Animated.View 
            style={[
              styles.quickActionsSection,
              {
                opacity: quickActionsOpacity,
                transform: [{ translateY: quickActionsTranslateY }],
              },
            ]}
          >
            <Text style={styles.quickActionsTitle}>Quick Actions</Text>
            <View style={styles.quickActionsGrid}>
              {QUICK_ACTIONS.map((action, index) => renderQuickActionButton(action, index))}
            </View>
          </Animated.View>

          <Animated.View style={[styles.welcomeSection, { opacity: fadeAnim }]}>
            <Text style={styles.sectionTitle}>Course Management</Text>
            <Text style={styles.sectionSubtitle}>
              Create and manage courses for your students
            </Text>
          </Animated.View>

          {/* Action Cards */}
          <View style={styles.cardsContainer}>
            {renderActionCard(
              "Add Paid Course",
              "Create premium courses with paid access",
              "school",
              BRAND.primaryColor,
              handleAddPaidCourse,
              true
            )}
            
            {renderActionCard(
              "Add Free Course",
              "Create free courses accessible to all",
              "book",
              "#4CAF50",
              handleAddFreeCourse
            )}
          </View>

          {/* Stats Section */}
          <Animated.View 
            style={[styles.statsSection, { opacity: fadeAnim }]}
          >
            <Text style={styles.statsTitle}>Quick Stats</Text>
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>0</Text>
                <Text style={styles.statLabel}>Total Courses</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>0</Text>
                <Text style={styles.statLabel}>Active Students</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>0</Text>
                <Text style={styles.statLabel}>Revenue</Text>
              </View>
            </View>
          </Animated.View>

          {/* Development Note */}
          <Animated.View 
            style={[styles.noteSection, { opacity: fadeAnim }]}
          >
            <View style={styles.noteContainer}>
              <MaterialIcons name="info" size={16} color={BRAND.primaryColor} />
              <Text style={styles.noteText}>
                More features will be added as development progresses
              </Text>
            </View>
          </Animated.View>
        </View>
      </ScrollView>
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
    width: '100%',
    height: '100%',
  },
  glowCircle: {
    position: 'absolute',
    borderRadius: 200,
    backgroundColor: 'rgba(0, 255, 136, 0.2)',
  },
  glowCircle1: {
    width: 400,
    height: 400,
    top: -200,
    right: -150,
  },
  glowCircle2: {
    width: 300,
    height: 300,
    bottom: 100,
    left: -100,
  },
  glowCircle3: {
    width: 200,
    height: 200,
    top: height * 0.4,
    left: width * 0.8 - 100,
  },

  // Header Section
  headerSection: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(10, 26, 10, 0.95)',
    zIndex: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogoImage: {
    width: 35,
    height: 35,
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#cccccc',
    marginTop: 2,
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },

  // Scroll Container
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },

  // Content
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  // Quick Actions Section
  quickActionsSection: {
    marginBottom: 30,
  },
  quickActionsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 15,
    letterSpacing: 0.5,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 5,
  },
  quickActionButton: {
    width: (width - 60) / 4, // 4 buttons per row with spacing
    marginBottom: 15,
  },
  quickActionTouchable: {
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  quickActionIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionTitle: {
    fontSize: 10,
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 12,
  },

  welcomeSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
    letterSpacing: 0.5,
    textShadowColor: BRAND.primaryColor,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: '#cccccc',
    opacity: 0.8,
    lineHeight: 22,
  },

  // Action Cards
  cardsContainer: {
    marginBottom: 30,
  },
  actionCard: {
    marginBottom: 20,
  },
  primaryCard: {
    // Special styling for primary card if needed
  },
  cardTouchable: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    position: 'relative',
    overflow: 'hidden',
  },
  cardGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    borderRadius: 15,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  cardDescription: {
    fontSize: 14,
    color: '#cccccc',
    lineHeight: 20,
    marginBottom: 15,
  },
  cardArrow: {
    position: 'absolute',
    top: 20,
    right: 20,
  },

  // Stats Section
  statsSection: {
    marginBottom: 30,
  },
  statsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 15,
    letterSpacing: 0.5,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.2)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: BRAND.primaryColor,
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#cccccc',
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 15,
  },

  // Note Section
  noteSection: {
    marginBottom: 20,
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.2)',
  },
  noteText: {
    color: '#cccccc',
    fontSize: 12,
    marginLeft: 10,
    fontStyle: 'italic',
    flex: 1,
  },
});