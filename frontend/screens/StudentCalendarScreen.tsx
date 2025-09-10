import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
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
import { MaterialIcons } from '@expo/vector-icons';
import EventCalendar from '../components/EventCalendar';
import { RootStackParamList } from '../App';
import { API_BASE } from '../config/api';

type StudentCalendarScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width, height } = Dimensions.get('window');

const BRAND = {
  name: "SUJHAV",
  primaryColor: '#00ff88',
  secondaryColor: '#000000',
  backgroundColor: '#0a1a0a',
  accentColor: '#1a2e1a',
  // Green shades for consistency
  cardBackground: '#0f2f1a',
  cardBorder: '#1a4d2e',
  statsGreen: '#00cc6a',
  lightGreen: '#33ff99',
  deepGreen: '#0d4d20',
  emeraldGreen: '#00b366',
};

interface CalendarEvent {
  _id: string;
  title: string;
  description?: string;
  date: string;
  startTime: string;
  endTime: string;
  type: 'class' | 'exam' | 'assignment' | 'meeting' | 'other';
  batchId: {
    _id: string;
    batchName: string;
  };
  createdBy: { 
    _id: string; 
    name: string; 
    email: string; 
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Transform function to convert our CalendarEvent to EventCalendar expected format
interface EventCalendarEvent {
  _id: string;
  title: string;
  description?: string;
  date: string;
  startTime: string;
  endTime: string;
  type: 'class' | 'exam' | 'assignment' | 'meeting' | 'other';
  batchId: string; // EventCalendar expects string
  createdBy: { 
    _id: string; 
    name: string; 
    email: string; 
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const EVENT_TYPES = [
  { key: 'class', label: 'Class', icon: 'school', color: '#4CAF50' },
  { key: 'exam', label: 'Exam', icon: 'assignment', color: '#f44336' },
  { key: 'assignment', label: 'Assignment', icon: 'edit', color: '#FF9800' },
  { key: 'meeting', label: 'Meeting', icon: 'people', color: '#2196F3' },
  { key: 'other', label: 'Other', icon: 'event', color: '#9C27B0' },
];

export default function StudentCalendarScreen() {
  const navigation = useNavigation<StudentCalendarScreenNavigationProp>();

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const statsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchEvents();
    startEntranceAnimation();
  }, []);

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        Alert.alert('Error', 'No authentication token found');
        return;
      }

      const response = await fetch(`${API_BASE}/calendar/student/my-events`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const responseText = await response.text();
      let data;
      
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        Alert.alert('Error', `Server returned: ${responseText.substring(0, 100)}...`);
        return;
      }
      
      if (data.success) {
        setEvents(data.data);
      } else {
        Alert.alert('Error', data.message || 'Failed to fetch events');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEvents();
    setRefreshing(false);
  };

  const startEntranceAnimation = () => {
    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
    ]).start();

    setTimeout(() => {
      Animated.timing(statsAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    }, 1000);
  };

  // Transform events for EventCalendar component
  const transformEventsForCalendar = (events: CalendarEvent[]): EventCalendarEvent[] => {
    return events.map(event => ({
      ...event,
      batchId: event.batchId._id, // Convert object to string
    }));
  };

  // Statistics calculations
  const getEventStats = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalEvents = events.length;
    
    const todaysEvents = events.filter(event => {
      const eventDate = new Date(event.date);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate.getTime() === today.getTime();
    }).length;

    const upcomingEvents = events.filter(event => {
      const eventDate = new Date(event.date);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate.getTime() > today.getTime();
    }).length;

    // Get unique batch count
    const uniqueBatches = new Set(events.map(event => event.batchId._id));
    const batchCount = uniqueBatches.size;

    return { totalEvents, todaysEvents, upcomingEvents, batchCount };
  };

  const getFilteredEvents = () => {
    if (!selectedDate) return events;
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.toDateString() === selectedDate.toDateString();
    });
  };

  const getEventTypeConfig = (type: string) => {
    return EVENT_TYPES.find(t => t.key === type) || EVENT_TYPES[0];
  };

  const renderStatsCard = ({ title, count, icon, color }: { title: string; count: number; icon: string; color: string }) => (
    <Animated.View style={[styles.statsCard, { opacity: statsAnim }]}>
      <View style={[styles.statsIcon, { backgroundColor: color + '15' }]}>
        <MaterialIcons name={icon as any} size={16} color={color} />
      </View>
      <Text style={styles.statsCount}>{count}</Text>
      <Text style={styles.statsTitle}>{title}</Text>
    </Animated.View>
  );

  const renderEventCard = ({ item }: { item: CalendarEvent }) => {
    const eventType = getEventTypeConfig(item.type);
    const eventDate = new Date(item.date);

    return (
      <Animated.View style={[styles.eventCard, { opacity: fadeAnim }]}>
        <View style={styles.eventCardContent}>
          <View style={styles.eventHeader}>
            <View style={[styles.eventTypeIcon, { backgroundColor: eventType.color + '20' }]}>
              <MaterialIcons name={eventType.icon as any} size={20} color={eventType.color} />
            </View>
            <View style={styles.eventHeaderText}>
              <Text style={styles.eventTitle}>{item.title}</Text>
              <Text style={[styles.eventType, { color: eventType.color }]}>{eventType.label}</Text>
            </View>
            <View style={styles.batchBadge}>
              <MaterialIcons name="class" size={12} color={BRAND.primaryColor} />
              <Text style={styles.batchName}>{item.batchId.batchName}</Text>
            </View>
          </View>

          {item.description && (
            <Text style={styles.eventDescription} numberOfLines={3}>{item.description}</Text>
          )}

          <View style={styles.eventDetails}>
            <View style={styles.eventDetailItem}>
              <MaterialIcons name="calendar-today" size={14} color="#888" />
              <Text style={styles.eventDetailText}>
                {eventDate.toLocaleDateString()} ({eventDate.toLocaleDateString('en-US', { weekday: 'short' })})
              </Text>
            </View>
            <View style={styles.eventDetailItem}>
              <MaterialIcons name="access-time" size={14} color="#888" />
              <Text style={styles.eventDetailText}>{item.startTime} - {item.endTime}</Text>
            </View>
          </View>

          <View style={styles.eventFooter}>
            <Text style={styles.eventCreatedBy}>Created by: {item.createdBy.name}</Text>
            <View style={[styles.eventStatus, { backgroundColor: item.isActive ? '#4CAF50' : '#666' }]}>
              <Text style={styles.eventStatusText}>{item.isActive ? 'Active' : 'Inactive'}</Text>
            </View>
          </View>
        </View>
      </Animated.View>
    );
  };

  const stats = getEventStats();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND.backgroundColor} />
      
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
        <Animated.View style={[styles.headerSection, { opacity: headerOpacity }]}>
          <View style={styles.headerContent}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>My Calendar</Text>
              <Text style={styles.headerSubtitle}>View Your Events & Schedule</Text>
            </View>
            <View style={styles.refreshButton}>
              {isLoading || refreshing ? (
                <ActivityIndicator size="small" color={BRAND.primaryColor} />
              ) : (
                <MaterialIcons name="calendar-today" size={20} color={BRAND.primaryColor} />
              )}
            </View>
          </View>
        </Animated.View>

        {/* Statistics Section - Compact Design */}
        <View style={styles.statsSection}>
          <Text style={styles.statsSectionTitle}>Overview</Text>
          <View style={styles.statsContainer}>
            {renderStatsCard({
              title: 'Total',
              count: stats.totalEvents,
              icon: 'event',
              color: BRAND.primaryColor,
            })}
            {renderStatsCard({
              title: 'Today',
              count: stats.todaysEvents,
              icon: 'today',
              color: '#2196F3',
            })}
            {renderStatsCard({
              title: 'Upcoming',
              count: stats.upcomingEvents,
              icon: 'schedule',
              color: '#FF9800',
            })}
            {renderStatsCard({
              title: 'Batches',
              count: stats.batchCount,
              icon: 'class',
              color: '#9C27B0',
            })}
          </View>
        </View>

        {/* Calendar Section */}
        <Animated.View style={[styles.calendarSection, { opacity: fadeAnim }]}>
          <EventCalendar
            events={transformEventsForCalendar(events)}
            onDateSelect={setSelectedDate}
            onEventPress={() => {}} // No action for students - read only
          />
        </Animated.View>

        {/* Events List */}
        <Animated.View style={[styles.eventsSection, { opacity: fadeAnim }]}>
          <View style={styles.eventsHeader}>
            <Text style={styles.eventsTitle}>
              {selectedDate ? `Events on ${selectedDate.toLocaleDateString()}` : 'All My Events'}
            </Text>
            <Text style={styles.eventsSubtitle}>
              {selectedDate 
                ? 'Tap calendar to view all events' 
                : `Events from all your ${stats.batchCount} assigned batches`
              }
            </Text>
          </View>

          {isLoading && !refreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={BRAND.primaryColor} />
              <Text style={styles.loadingText}>Loading your events...</Text>
            </View>
          ) : getFilteredEvents().length > 0 ? (
            <FlatList
              data={getFilteredEvents().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())}
              renderItem={renderEventCard}
              keyExtractor={(item) => item._id}
              showsVerticalScrollIndicator={false}
              scrollEnabled={false}
              contentContainerStyle={styles.eventsList}
            />
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcons name="event-busy" size={64} color="#333" />
              <Text style={styles.emptyStateTitle}>No Events Found</Text>
              <Text style={styles.emptyStateDescription}>
                {selectedDate 
                  ? 'No events scheduled for this date.'
                  : 'No events have been created for your batches yet.'
                }
              </Text>
            </View>
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
  headerSection: {
    padding: 20,
    paddingBottom: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: BRAND.primaryColor,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BRAND.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BRAND.cardBorder,
    shadowColor: BRAND.primaryColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  // Compact Statistics Section Styles
  statsSection: {
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  statsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 10,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: BRAND.cardBackground,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: BRAND.cardBorder,
    shadowColor: BRAND.primaryColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsCard: {
    alignItems: 'center',
    flex: 1,
  },
  statsIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statsCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  statsTitle: {
    fontSize: 10,
    color: '#aaa',
    textAlign: 'center',
    fontWeight: '500',
  },
  calendarSection: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  eventsSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  eventsHeader: {
    marginBottom: 15,
  },
  eventsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  eventsSubtitle: {
    fontSize: 14,
    color: '#888',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    color: '#888',
    marginTop: 10,
    fontSize: 14,
  },
  eventsList: {
    paddingBottom: 20,
  },
  eventCard: {
    backgroundColor: BRAND.cardBackground,
    borderRadius: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: BRAND.cardBorder,
    overflow: 'hidden',
    shadowColor: BRAND.primaryColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  eventCardContent: {
    padding: 15,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  eventTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  eventHeaderText: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  eventType: {
    fontSize: 12,
    fontWeight: '500',
  },
  batchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND.deepGreen,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BRAND.cardBorder,
    gap: 3,
  },
  batchName: {
    fontSize: 10,
    color: BRAND.primaryColor,
    fontWeight: '600',
  },
  eventDescription: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 12,
    lineHeight: 20,
  },
  eventDetails: {
    marginBottom: 12,
    gap: 6,
  },
  eventDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eventDetailText: {
    fontSize: 12,
    color: '#aaa',
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: BRAND.cardBorder,
  },
  eventCreatedBy: {
    fontSize: 12,
    color: '#888',
    flex: 1,
  },
  eventStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  eventStatusText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '500',
  },
  // Empty State Styles
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
});