import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

// Brand configuration - matches your existing theme
const BRAND = {
  name: "SUJHAV",
  primaryColor: '#00ff88',
  secondaryColor: '#000000',
  backgroundColor: '#0a1a0a',
  accentColor: '#1a2e1a',
  cardBackground: '#0f1f0f',
  borderColor: '#1a2e1a',
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
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Extended quick action items configuration for better row display
  const quickActions = [
    {
      id: 'attendance',
      title: 'Attendance',
      subtitle: 'View records',
      icon: 'event-available',
      color: BRAND.successColor,
      onPress: () => handleAttendancePress(),
    },
    {
      id: 'calendar',
      title: 'Calendar',
      subtitle: 'Events & dates',
      icon: 'calendar-today',
      color: BRAND.warningColor,
      onPress: () => handleCalendarPress(),
    },
    {
      id: 'curriculum',
      title: 'Curriculum',
      subtitle: 'Course content',
      icon: 'menu-book',
      color: BRAND.primaryColor,
      onPress: () => handleCurriculumPress(),
    },
    {
      id: 'notifications',
      title: 'Notifications',
      subtitle: 'Updates & alerts',
      icon: 'notifications',
      color: '#ff6b6b',
      onPress: () => handleNotificationsPress(),
    },
    {
      id: 'profile',
      title: 'Profile',
      subtitle: 'Edit details',
      icon: 'person',
      color: '#4ecdc4',
      onPress: () => handleProfilePress(),
    },
  ];

  // Handler functions for each action
  const handleAttendancePress = () => {
    if (navigation) {
      navigation.navigate('StudentAttendanceRecords');
    }
  };

  const handleCalendarPress = () => {
    if (navigation) {
      navigation.navigate('StudentCalendar');
    }
  };

  const handleCurriculumPress = () => {
    Alert.alert(
      'Curriculum',
      'Loading curriculum content...',
      [{ text: 'OK' }]
    );
    // Future navigation: navigation.navigate('StudentCurriculum');
  };

  const handleNotificationsPress = () => {
    Alert.alert(
      'Notifications',
      'Opening notifications...',
      [{ text: 'OK' }]
    );
    // Future navigation: navigation.navigate('Notifications');
  };

  const handleProfilePress = () => {
    Alert.alert(
      'Profile',
      'Opening profile settings...',
      [{ text: 'OK' }]
    );
    // Future navigation: navigation.navigate('Profile');
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
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1000,
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
            new Animated.Value(index * 4)
          ),
        },
        { scale: scaleAnim },
      ],
    };

    return (
      <Animated.View key={action.id} style={[styles.actionItemContainer, animatedStyle]}>
        <TouchableOpacity
          style={styles.actionItem}
          onPress={action.onPress}
          activeOpacity={0.8}
        >
          {/* Icon Container with Glow Effect */}
          <View style={[styles.iconContainer, { backgroundColor: action.color + '15' }]}>
            <Animated.View
              style={[
                styles.iconGlow,
                { 
                  backgroundColor: action.color,
                  opacity: Animated.multiply(glowAnim, 0.3)
                }
              ]}
            />
            <MaterialIcons 
              name={action.icon as any} 
              size={24} 
              color={action.color} 
              style={styles.actionIcon}
            />
          </View>
          
          {/* Text Content */}
          <View style={styles.textContainer}>
            <Text style={styles.actionTitle} numberOfLines={1}>{action.title}</Text>
            <Text style={styles.actionSubtitle} numberOfLines={1}>{action.subtitle}</Text>
          </View>
          
          {/* Arrow Indicator */}
          <MaterialIcons 
            name="chevron-right" 
            size={20} 
            color={BRAND.textSecondary} 
            style={styles.chevron}
          />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }]
        }
      ]}
    >
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      
      {/* Alternative: Vertical Stack for smaller screens */}
      <View style={styles.verticalContainer}>
        {quickActions.slice(0, 3).map((action, index) => (
          <Animated.View key={`vertical-${action.id}`} style={[styles.verticalActionItem, {
            opacity: fadeAnim,
            transform: [{ translateX: slideAnim }],
          }]}>
            <TouchableOpacity
              style={styles.verticalAction}
              onPress={action.onPress}
              activeOpacity={0.8}
            >
              <View style={[styles.verticalIconContainer, { backgroundColor: action.color + '15' }]}>
                <Animated.View
                  style={[
                    styles.verticalIconGlow,
                    { 
                      backgroundColor: action.color,
                      opacity: Animated.multiply(glowAnim, 0.2)
                    }
                  ]}
                />
                <MaterialIcons 
                  name={action.icon as any} 
                  size={22} 
                  color={action.color} 
                />
              </View>
              
              <View style={styles.verticalTextContainer}>
                <Text style={styles.verticalActionTitle}>{action.title}</Text>
                <Text style={styles.verticalActionSubtitle}>{action.subtitle}</Text>
              </View>
              
              <MaterialIcons 
                name="chevron-right" 
                size={18} 
                color={BRAND.textSecondary} 
              />
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: BRAND.textPrimary,
    marginBottom: 15,
    letterSpacing: 0.3,
    paddingHorizontal: 5,
  },
  
  // Horizontal Scroll Styles
  scrollView: {
    marginBottom: 20,
  },
  scrollContainer: {
    paddingHorizontal: 5,
    gap: 15,
  },
  actionItemContainer: {
    width: 280,
  },
  actionItem: {
    backgroundColor: BRAND.cardBackground,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: BRAND.borderColor,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
    shadowColor: BRAND.primaryColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  iconContainer: {
    position: 'relative',
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  iconGlow: {
    position: 'absolute',
    width: '130%',
    height: '130%',
    borderRadius: 15,
    top: -7,
    left: -7,
  },
  actionIcon: {
    zIndex: 2,
  },
  textContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: BRAND.textPrimary,
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 13,
    color: BRAND.textSecondary,
    lineHeight: 16,
  },
  chevron: {
    marginLeft: 10,
    opacity: 0.7,
  },
  
  // Vertical Stack Styles (Alternative Layout)
  verticalContainer: {
    gap: 12,
  },
  verticalActionItem: {
    backgroundColor: BRAND.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BRAND.borderColor,
    elevation: 2,
    shadowColor: BRAND.primaryColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  verticalAction: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  verticalIconContainer: {
    position: 'relative',
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  verticalIconGlow: {
    position: 'absolute',
    width: '120%',
    height: '120%',
    borderRadius: 12,
    top: -4,
    left: -4,
  },
  verticalTextContainer: {
    flex: 1,
  },
  verticalActionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: BRAND.textPrimary,
    marginBottom: 2,
  },
  verticalActionSubtitle: {
    fontSize: 12,
    color: BRAND.textSecondary,
    lineHeight: 14,
  },
});

export default UserProfileQuickActions;