import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { NavigationProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/FontAwesome5';

interface BottomNavigationProps {
  navigation: NavigationProp<any>;
  activeTab: string;
}

const { width } = Dimensions.get('window');

// Brand configuration
const BRAND = {
  name: "SUJHAV",
  primaryColor: '#00ff88',
  secondaryColor: '#000000',
  backgroundColor: '#0a1a0a',
  accentColor: '#1a2e1a',
};

// Navigation items configuration
const NAV_ITEMS = [
  {
    key: 'reports',
    label: 'Reports',
    icon: 'chart-line',
    route: 'UserReportsScreen', // Updated to use UserReportsScreen
  },
  {
    key: 'tests',
    label: 'Tests',
    icon: 'tasks',
    route: 'UpcomingTests',
  },
  {
    key: 'home',
    label: 'Home',
    icon: 'home',
    route: 'Home',
  },
  {
    key: 'content',
    label: 'Content',
    icon: 'book-open',
    route: 'MyContent',
  },
  {
    key: 'profile',
    label: 'Profile',
    icon: 'user',
    route: 'UserProfile',
  },
];

const BottomNavigation: React.FC<BottomNavigationProps> = ({ navigation, activeTab }) => {
  const slideUpAnim = useRef(new Animated.Value(100)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [userInfo, setUserInfo] = useState({
    userId: '',
    userName: '',
    userRole: '',
  });

  useEffect(() => {
    // Simple entrance animation
    Animated.parallel([
      Animated.spring(slideUpAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Load user information from AsyncStorage
    loadUserInfo();
  }, []);

  const loadUserInfo = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      const userName = await AsyncStorage.getItem('userName');
      const userRole = await AsyncStorage.getItem('userRole');
      
      setUserInfo({
        userId: userId || '',
        userName: userName || '',
        userRole: userRole || 'user',
      });
    } catch (error) {
      console.error('Error loading user info:', error);
    }
  };

  const handleTabPress = (item: typeof NAV_ITEMS[0]) => {
    if (item.key !== activeTab) {
      // Special handling for UserReportsScreen with required parameters
      if (item.route === 'UserReportsScreen') {
        navigation.navigate(item.route, {
          userId: userInfo.userId,
          userName: userInfo.userName,
          userRole: userInfo.userRole,
        });
      } else {
        navigation.navigate(item.route);
      }
    }
  };

  const renderTabItem = (item: typeof NAV_ITEMS[0], index: number) => {
    const isActive = item.key === activeTab;
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }).start();
    };

    return (
      <TouchableOpacity
        key={item.key}
        style={styles.tabItem}
        onPress={() => handleTabPress(item)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.7}
      >
        <Animated.View
          style={[
            styles.tabContent,
            { transform: [{ scale: scaleAnim }] }
          ]}
        >
          {/* Active background */}
          {isActive && (
            <View style={styles.activeBackground} />
          )}

          {/* Icon */}
          <View style={[
            styles.iconContainer,
            isActive && styles.activeIconContainer
          ]}>
            <Icon
              name={item.icon}
              size={20}
              color={isActive ? BRAND.primaryColor : '#888888'}
              solid={isActive}
            />
          </View>

          {/* Label */}
          <Text style={[
            styles.label,
            isActive && styles.activeLabel
          ]}>
            {item.label}
          </Text>

          {/* Active indicator dot */}
          {isActive && (
            <View style={styles.activeDot} />
          )}
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideUpAnim }],
        },
      ]}
    >
      {/* Glass morphism background */}
      <View style={styles.backgroundBlur} />
      
      {/* Border glow */}
      <View style={styles.borderGlow} />
      
      {/* Navigation items */}
      <View style={styles.tabsContainer}>
        {NAV_ITEMS.map((item, index) => renderTabItem(item, index))}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(10, 26, 10, 0.85)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
    overflow: 'hidden',
  },
  backgroundBlur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 24,
  },
  borderGlow: {
    position: 'absolute',
    top: -1,
    left: -1,
    right: -1,
    bottom: -1,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.3)',
    shadowColor: BRAND.primaryColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    minHeight: 52,
  },
  activeBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.2)',
  },
  iconContainer: {
    marginBottom: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIconContainer: {
    // Additional styling for active icons if needed
  },
  label: {
    fontSize: 10,
    color: '#888888',
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  activeLabel: {
    color: '#ffffff',
    fontWeight: '600',
  },
  activeDot: {
    position: 'absolute',
    top: -2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: BRAND.primaryColor,
    shadowColor: BRAND.primaryColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
});

export default BottomNavigation;