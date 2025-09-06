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
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import EventCalendar from '../components/EventCalendar';
import { RootStackParamList } from '../App';
import { API_BASE } from '../config/api';

type TeacherHandleCalendarEventsNavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = { batchId: string; batchName: string; };

const { width, height } = Dimensions.get('window');

const BRAND = {
  name: "SUJHAV",
  primaryColor: '#00ff88',
  secondaryColor: '#000000',
  backgroundColor: '#0a1a0a',
  accentColor: '#1a2e1a',
  // New complementary green shades
  cardBackground: '#0f2f1a',      // Dark green for cards
  cardBorder: '#1a4d2e',          // Medium green for borders
  statsGreen: '#00cc6a',          // Slightly darker primary for stats
  lightGreen: '#33ff99',          // Light green for highlights
  deepGreen: '#0d4d20',           // Deep green for backgrounds
  emeraldGreen: '#00b366',        // Emerald shade for accents
};

interface CalendarEvent {
  _id: string;
  title: string;
  description?: string;
  date: string;
  startTime: string;
  endTime: string;
  type: 'class' | 'exam' | 'assignment' | 'meeting' | 'other';
  batchId: string;
  createdBy: { _id: string; name: string; email: string; };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface EventFormData {
  title: string;
  description: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  type: 'class' | 'exam' | 'assignment' | 'meeting' | 'other';
}

const EVENT_TYPES = [
  { key: 'class', label: 'Class', icon: 'school', color: '#4CAF50' },
  { key: 'exam', label: 'Exam', icon: 'assignment', color: '#f44336' },
  { key: 'assignment', label: 'Assignment', icon: 'edit', color: '#FF9800' },
  { key: 'meeting', label: 'Meeting', icon: 'people', color: '#2196F3' },
  { key: 'other', label: 'Other', icon: 'event', color: '#9C27B0' },
];

export default function TeacherHandleCalendarEventsScreen() {
  const navigation = useNavigation<TeacherHandleCalendarEventsNavigationProp>();
  const route = useRoute();
  const { batchId, batchName } = route.params as RouteProps;

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    date: new Date(),
    startTime: new Date(),
    endTime: new Date(Date.now() + 60 * 60 * 1000),
    type: 'class',
  });

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const fabScale = useRef(new Animated.Value(0)).current;
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

      const response = await fetch(`${API_BASE}/calendar/events/${batchId}`, {
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
      Animated.spring(fabScale, { toValue: 1, tension: 150, friction: 8, useNativeDriver: true }).start();
      Animated.timing(statsAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    }, 1000);
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

    return { totalEvents, todaysEvents, upcomingEvents };
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      date: new Date(),
      startTime: new Date(),
      endTime: new Date(Date.now() + 60 * 60 * 1000),
      type: 'class',
    });
    setEditingEvent(null);
  };

  const openCreateModal = () => {
    resetForm();
    if (selectedDate) {
      setFormData(prev => ({ ...prev, date: selectedDate }));
    }
    setIsModalVisible(true);
  };

  const openEditModal = (event: CalendarEvent) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description || '',
      date: new Date(event.date),
      startTime: new Date(`${event.date}T${event.startTime}`),
      endTime: new Date(`${event.date}T${event.endTime}`),
      type: event.type,
    });
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setIsModalVisible(false);
    resetForm();
  };

  const formatDateTime = (date: Date) => date.toISOString().split('T')[0];
  const formatTime = (date: Date) => date.toTimeString().split(' ')[0].substring(0, 5);

  const handleEventAction = async (isEdit: boolean) => {
    try {
      if (!formData.title.trim()) {
        Alert.alert('Error', 'Please enter event title');
        return;
      }

      setIsLoading(true);
      const token = await AsyncStorage.getItem('userToken');

      const eventData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        date: formatDateTime(formData.date),
        startTime: formatTime(formData.startTime),
        endTime: formatTime(formData.endTime),
        type: formData.type,
        ...(isEdit ? {} : { batchId }),
      };

      const url = isEdit ? `${API_BASE}/calendar/events/${editingEvent!._id}` : `${API_BASE}/calendar/events`;
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert('Success', `Event ${isEdit ? 'updated' : 'created'} successfully`);
        closeModal();
        fetchEvents();
      } else {
        Alert.alert('Error', data.message || `Failed to ${isEdit ? 'update' : 'create'} event`);
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteEvent = (event: CalendarEvent) => {
    Alert.alert(
      'Delete Event',
      `Are you sure you want to delete "${event.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              const token = await AsyncStorage.getItem('userToken');
              const response = await fetch(`${API_BASE}/calendar/events/${event._id}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              });
              const data = await response.json();
              if (data.success) {
                Alert.alert('Success', 'Event deleted successfully');
                fetchEvents();
              } else {
                Alert.alert('Error', data.message || 'Failed to delete event');
              }
            } catch (error) {
              Alert.alert('Error', 'Network error. Please try again.');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
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
      <View style={[styles.statsIcon, { backgroundColor: color + '20' }]}>
        <MaterialIcons name={icon as any} size={24} color={color} />
      </View>
      <View style={styles.statsContent}>
        <Text style={styles.statsCount}>{count}</Text>
        <Text style={styles.statsTitle}>{title}</Text>
      </View>
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
            <View style={styles.eventActions}>
              <TouchableOpacity style={styles.actionButton} onPress={() => openEditModal(item)}>
                <MaterialIcons name="edit" size={18} color={BRAND.primaryColor} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={() => deleteEvent(item)}>
                <MaterialIcons name="delete" size={18} color="#f44336" />
              </TouchableOpacity>
            </View>
          </View>

          {item.description && (
            <Text style={styles.eventDescription} numberOfLines={2}>{item.description}</Text>
          )}

          <View style={styles.eventDetails}>
            <View style={styles.eventDetailItem}>
              <MaterialIcons name="calendar-today" size={16} color="#888" />
              <Text style={styles.eventDetailText}>
                {eventDate.toLocaleDateString()} ({eventDate.toLocaleDateString('en-US', { weekday: 'short' })})
              </Text>
            </View>
            <View style={styles.eventDetailItem}>
              <MaterialIcons name="access-time" size={16} color="#888" />
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[BRAND.primaryColor]} tintColor={BRAND.primaryColor} />}
      >
        {/* Header */}
        <Animated.View style={[styles.headerSection, { opacity: headerOpacity }]}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <MaterialIcons name="arrow-back" size={24} color={BRAND.primaryColor} />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>{batchName}</Text>
              <Text style={styles.headerSubtitle}>Calendar Events</Text>
            </View>
            <TouchableOpacity onPress={onRefresh} style={styles.refreshButton} disabled={isLoading}>
              {isLoading || refreshing ? (
                <ActivityIndicator size="small" color={BRAND.primaryColor} />
              ) : (
                <MaterialIcons name="refresh" size={20} color={BRAND.primaryColor} />
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Statistics Section */}
        <View style={styles.statsSection}>
          <Text style={styles.statsSectionTitle}>Overview</Text>
          <View style={styles.statsContainer}>
            {renderStatsCard({
              title: 'Total Events',
              count: stats.totalEvents,
              icon: 'event',
              color: BRAND.primaryColor,
            })}
            {renderStatsCard({
              title: "Today's Events",
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
          </View>
        </View>

        {/* Calendar Section */}
        <Animated.View style={[styles.calendarSection, { opacity: fadeAnim }]}>
          <EventCalendar
            events={events}
            onDateSelect={setSelectedDate}
            onEventPress={openEditModal}
          />
        </Animated.View>

        {/* Events List */}
        <Animated.View style={[styles.eventsSection, { opacity: fadeAnim }]}>
          <View style={styles.eventsHeader}>
            <Text style={styles.eventsTitle}>
              {selectedDate ? `Events on ${selectedDate.toLocaleDateString()}` : 'All Events'}
            </Text>
            <Text style={styles.eventsSubtitle}>
              {selectedDate && 'Tap calendar to view all events'}
            </Text>
          </View>

          {isLoading && !refreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={BRAND.primaryColor} />
              <Text style={styles.loadingText}>Loading events...</Text>
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
                  ? 'No events scheduled for this date. Tap + to create one.'
                  : 'No events created yet. Tap + to create your first event.'
                }
              </Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Floating Action Button */}
      <Animated.View style={[styles.fab, { transform: [{ scale: fabScale }] }]}>
        <TouchableOpacity style={styles.fabButton} onPress={openCreateModal} activeOpacity={0.8}>
          <MaterialIcons name="add" size={24} color="#000" />
        </TouchableOpacity>
      </Animated.View>

      {/* Event Form Modal */}
      <Modal visible={isModalVisible} animationType="slide" transparent={true} onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editingEvent ? 'Edit Event' : 'Create New Event'}</Text>
                <TouchableOpacity onPress={closeModal}>
                  <MaterialIcons name="close" size={24} color="#888" />
                </TouchableOpacity>
              </View>

              <View style={styles.formContainer}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Event Title *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.title}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
                    placeholder="Enter event title"
                    placeholderTextColor="#666"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Description</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    value={formData.description}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                    placeholder="Enter event description (optional)"
                    placeholderTextColor="#666"
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Event Type</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeSelector}>
                    {EVENT_TYPES.map((type) => (
                      <TouchableOpacity
                        key={type.key}
                        style={[
                          styles.typeOption,
                          formData.type === type.key && styles.typeOptionSelected,
                          { borderColor: type.color }
                        ]}
                        onPress={() => setFormData(prev => ({ ...prev, type: type.key as any }))}
                      >
                        <MaterialIcons name={type.icon as any} size={20} color={type.color} />
                        <Text style={[styles.typeOptionText, formData.type === type.key && { color: type.color }]}>
                          {type.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Date</Text>
                  <TouchableOpacity style={styles.dateTimeButton} onPress={() => setShowDatePicker(true)}>
                    <MaterialIcons name="calendar-today" size={20} color={BRAND.primaryColor} />
                    <Text style={styles.dateTimeText}>{formData.date.toDateString()}</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Start Time</Text>
                  <TouchableOpacity style={styles.dateTimeButton} onPress={() => setShowStartTimePicker(true)}>
                    <MaterialIcons name="access-time" size={20} color={BRAND.primaryColor} />
                    <Text style={styles.dateTimeText}>
                      {formData.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>End Time</Text>
                  <TouchableOpacity style={styles.dateTimeButton} onPress={() => setShowEndTimePicker(true)}>
                    <MaterialIcons name="access-time" size={20} color={BRAND.primaryColor} />
                    <Text style={styles.dateTimeText}>
                      {formData.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={closeModal}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={() => handleEventAction(!!editingEvent)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>{editingEvent ? 'Update' : 'Create'}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>

        {/* Date/Time Pickers */}
        {showDatePicker && (
          <DateTimePicker
            value={formData.date}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event: any, selectedDate: any) => {
              setShowDatePicker(false);
              if (selectedDate) setFormData(prev => ({ ...prev, date: selectedDate }));
            }}
          />
        )}

        {showStartTimePicker && (
          <DateTimePicker
            value={formData.startTime}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event: any, selectedTime: any) => {
              setShowStartTimePicker(false);
              if (selectedTime) setFormData(prev => ({ ...prev, startTime: selectedTime }));
            }}
          />
        )}

        {showEndTimePicker && (
          <DateTimePicker
            value={formData.endTime}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event: any, selectedTime: any) => {
              setShowEndTimePicker(false);
              if (selectedTime) setFormData(prev => ({ ...prev, endTime: selectedTime }));
            }}
          />
        )}
      </Modal>
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
  backButton: {
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
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: BRAND.primaryColor,
    marginTop: 2,
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
  // Statistics Section Styles
  statsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statsSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  statsCard: {
    flex: 1,
    backgroundColor: BRAND.cardBackground,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: BRAND.cardBorder,
    alignItems: 'center',
    shadowColor: BRAND.primaryColor,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 4,
  },
  statsIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statsContent: {
    alignItems: 'center',
  },
  statsCount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statsTitle: {
    fontSize: 12,
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
    paddingBottom: 100,
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
  eventActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: BRAND.deepGreen,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BRAND.cardBorder,
  },
  deleteButton: {
    backgroundColor: '#f44336' + '20',
    borderColor: '#f44336' + '40',
  },
  eventDescription: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 12,
    lineHeight: 20,
  },
  eventDetails: {
    marginBottom: 12,
    gap: 8,
  },
  eventDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventDetailText: {
    fontSize: 13,
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
  // FAB Styles
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
  },
  fabButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: BRAND.primaryColor,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: BRAND.primaryColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: BRAND.backgroundColor,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.9,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopWidth: 2,
    borderTopColor: BRAND.cardBorder,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderLeftColor: BRAND.cardBorder,
    borderRightColor: BRAND.cardBorder,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.cardBorder,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  // Form Styles
  formContainer: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: BRAND.cardBackground,
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: BRAND.cardBorder,
    shadowColor: BRAND.primaryColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  // Type Selector Styles
  typeSelector: {
    flexDirection: 'row',
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND.cardBackground,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 8,
    shadowColor: BRAND.primaryColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  typeOptionSelected: {
    backgroundColor: BRAND.deepGreen,
    borderColor: BRAND.primaryColor,
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  typeOptionText: {
    fontSize: 14,
    color: '#ccc',
    fontWeight: '500',
  },
  // Date Time Button Styles
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND.cardBackground,
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: BRAND.cardBorder,
    gap: 12,
    shadowColor: BRAND.primaryColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dateTimeText: {
    fontSize: 16,
    color: '#fff',
    flex: 1,
  },
  // Modal Actions Styles
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 15,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  cancelButton: {
    backgroundColor: BRAND.cardBackground,
    borderWidth: 1,
    borderColor: BRAND.cardBorder,
    shadowColor: BRAND.primaryColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ccc',
  },
  saveButton: {
    backgroundColor: BRAND.primaryColor,
    shadowColor: BRAND.primaryColor,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
});