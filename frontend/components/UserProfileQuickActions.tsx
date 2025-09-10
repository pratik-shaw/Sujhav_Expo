import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

// Brand configuration - matches your existing theme
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

interface UserProfileQuickActionsProps {
  navigation?: any; // Navigation prop for future use
}

const UserProfileQuickActions: React.FC<UserProfileQuickActionsProps> = ({ navigation }) => {
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  // Quick action items configuration
  const quickActions = [
    {
      id: 'attendance',
      title: 'Attendance Records',
      subtitle: 'View your attendance history',
      icon: 'event-available',
      color: BRAND.successColor,
      onPress: () => handleAttendancePress(),
    },
    {
      id: 'calendar',
      title: 'View Calendar',
      subtitle: 'Check upcoming events',
      icon: 'calendar-today',
      color: BRAND.warningColor,
      onPress: () => handleCalendarPress(),
    },
    {
      id: 'curriculum',
      title: 'View Curriculum',
      subtitle: 'Explore course content',
      icon: 'menu-book',
      color: BRAND.primaryColor,
      onPress: () => handleCurriculumPress(),
    },
  ];

  // Handler functions for each action
  const handleAttendancePress = () => {
    navigation.navigate('StudentAttendanceRecords');
  };

  const handleCalendarPress = () => {
    navigation.navigate('StudentCalendar');
  };

  const handleCurriculumPress = () => {
    Alert.alert(
      'Curriculum',
      'Loading curriculum content...',
      [{ text: 'OK' }]
    );
    // Future navigation: navigation.navigate('StudentCurriculum');
  };

  // Start entrance animation
  useEffect(() => {
    const startAnimation = () => {
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
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start();
    };

    const timer = setTimeout(startAnimation, 100);
    return () => clearTimeout(timer);
  }, []);

  // Render individual action item
  const renderActionItem = (action: typeof quickActions[0], index: number) => {
    const animatedStyle = {
      opacity: fadeAnim,
      transform: [
        {
          translateY: Animated.add(
            slideAnim,
            new Animated.Value(index * 10)
          ),
        },
        { scale: scaleAnim },
      ],
    };

    return (
      <Animated.View key={action.id} style={[animatedStyle]}>
        <TouchableOpacity
          style={styles.actionItem}
          onPress={action.onPress}
          activeOpacity={0.8}
        >
          <View style={styles.actionContent}>
            <View style={[styles.iconContainer, { backgroundColor: action.color + '20' }]}>
              <MaterialIcons 
                name={action.icon as any} 
                size={24} 
                color={action.color} 
              />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.actionTitle}>{action.title}</Text>
              <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
            </View>
            <View style={styles.chevronContainer}>
              <MaterialIcons 
                name="chevron-right" 
                size={20} 
                color={BRAND.textSecondary} 
              />
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsContainer}>
        {quickActions.map((action, index) => renderActionItem(action, index))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 25,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: BRAND.textPrimary,
    marginBottom: 15,
    letterSpacing: 0.3,
  },
  actionsContainer: {
    backgroundColor: BRAND.cardBackground,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: BRAND.borderColor,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: BRAND.primaryColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionItem: {
    borderBottomWidth: 1,
    borderBottomColor: BRAND.borderColor,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: BRAND.textPrimary,
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  actionSubtitle: {
    fontSize: 13,
    color: BRAND.textSecondary,
    lineHeight: 18,
  },
  chevronContainer: {
    marginLeft: 8,
  },
});

export default UserProfileQuickActions;