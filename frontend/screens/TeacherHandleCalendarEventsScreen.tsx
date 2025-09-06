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
import { MaterialIcons, Feather, AntDesign } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { RootStackParamList } from '../App';
import { API_BASE } from '../config/api';

type TeacherHandleCalendarEventsNavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = {
  batchId: string;
  batchName: string;
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

const API_BASE_URL = API_BASE;

// Event interface
interface CalendarEvent {
  _id: string;
  title: string;
  description?: string;
  date: string;
  startTime: string;
  endTime: string;
  type: 'class' | 'exam' | 'assignment' | 'meeting' | 'other';
  batchId: string;
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// API response interfaces
interface EventsResponse {
  success: boolean;
  data: CalendarEvent[];
  count: number;
  message: string;
}

interface EventResponse {
  success: boolean;
  data: CalendarEvent;
  message: string;
}

// Event form data
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
    endTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour later
    type: 'class',
  });

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-20)).current;
  const eventsListOpacity = useRef(new Animated.Value(0)).current;
  const eventsListTranslateY = useRef(new Animated.Value(30)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const fabScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchEvents();
    startEntranceAnimation();
  }, []);

  // Add this debug version of fetchEvents function to your component

const fetchEvents = async () => {
  try {
    setIsLoading(true);
    const token = await AsyncStorage.getItem('userToken');
    
    if (!token) {
      Alert.alert('Error', 'No authentication token found');
      return;
    }

    const url = `${API_BASE_URL}/calendar/events/${batchId}`;
    console.log('🔍 Debug Info:');
    console.log('API_BASE_URL:', API_BASE_URL);
    console.log('batchId:', batchId);
    console.log('Full URL:', url);
    console.log('Token exists:', !!token);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);

    // Get the raw text first to see what we're actually receiving
    const responseText = await response.text();
    console.log('Raw response:', responseText.substring(0, 200)); // First 200 chars

    // Try to parse as JSON
    let data;
    try {
      data = JSON.parse(responseText);
      console.log('Parsed JSON successfully:', data);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.error('Response was:', responseText);
      Alert.alert('Error', `Server returned: ${responseText.substring(0, 100)}...`);
      return;
    }
    
    if (data.success) {
      setEvents(data.data);
      console.log('Events set successfully:', data.data.length, 'events');
    } else {
      console.error('API Error:', data);
      Alert.alert('Error', data.message || 'Failed to fetch events');
    }
  } catch (error) {
    console.error('Network Error:', error);
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

    // Events list animation
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(eventsListOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(eventsListTranslateY, {
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

    // FAB animation
    setTimeout(() => {
      Animated.spring(fabScale, {
        toValue: 1,
        tension: 150,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }, 1000);
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

  const formatDateTime = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const formatTime = (date: Date) => {
    return date.toTimeString().split(' ')[0].substring(0, 5);
  };

  const createEvent = async () => {
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
        batchId: batchId,
      };

      const response = await fetch(`${API_BASE_URL}/calendar/events`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      });

      const data: EventResponse = await response.json();

      if (data.success) {
        Alert.alert('Success', 'Event created successfully');
        closeModal();
        fetchEvents();
      } else {
        Alert.alert('Error', data.message || 'Failed to create event');
      }
    } catch (error) {
      console.error('Error creating event:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateEvent = async () => {
    try {
      if (!formData.title.trim() || !editingEvent) {
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
      };

      const response = await fetch(`${API_BASE_URL}/calendar/events/${editingEvent._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      });

      const data: EventResponse = await response.json();

      if (data.success) {
        Alert.alert('Success', 'Event updated successfully');
        closeModal();
        fetchEvents();
      } else {
        Alert.alert('Error', data.message || 'Failed to update event');
      }
    } catch (error) {
      console.error('Error updating event:', error);
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
          onPress: () => confirmDeleteEvent(event._id),
        },
      ]
    );
  };

  const confirmDeleteEvent = async (eventId: string) => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('userToken');

      const response = await fetch(`${API_BASE_URL}/calendar/events/${eventId}`, {
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
      console.error('Error deleting event:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const goBack = () => {
    navigation.goBack();
  };

  const getEventTypeConfig = (type: string) => {
    return EVENT_TYPES.find(t => t.key === type) || EVENT_TYPES[0];
  };

  const renderEventCard = ({ item }: { item: CalendarEvent }) => {
    const eventType = getEventTypeConfig(item.type);
    const eventDate = new Date(item.date);
    const formattedDate = eventDate.toLocaleDateString();
    const formattedDay = eventDate.toLocaleDateString('en-US', { weekday: 'short' });

    return (
      <Animated.View
        style={[
          styles.eventCard,
          {
            opacity: eventsListOpacity,
            transform: [{ translateY: eventsListTranslateY }],
          },
        ]}
      >
        <View style={styles.eventCardContent}>
          <View style={styles.eventHeader}>
            <View style={[styles.eventTypeIcon, { backgroundColor: eventType.color + '20' }]}>
              <MaterialIcons name={eventType.icon as any} size={20} color={eventType.color} />
            </View>
            <View style={styles.eventHeaderText}>
              <Text style={styles.eventTitle}>{item.title}</Text>
              <Text style={[styles.eventType, { color: eventType.color }]}>
                {eventType.label}
              </Text>
            </View>
            <View style={styles.eventActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => openEditModal(item)}
              >
                <MaterialIcons name="edit" size={18} color={BRAND.primaryColor} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => deleteEvent(item)}
              >
                <MaterialIcons name="delete" size={18} color="#f44336" />
              </TouchableOpacity>
            </View>
          </View>

          {item.description && (
            <Text style={styles.eventDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}

          <View style={styles.eventDetails}>
            <View style={styles.eventDetailItem}>
              <MaterialIcons name="calendar-today" size={16} color="#888" />
              <Text style={styles.eventDetailText}>
                {formattedDate} ({formattedDay})
              </Text>
            </View>
            <View style={styles.eventDetailItem}>
              <MaterialIcons name="access-time" size={16} color="#888" />
              <Text style={styles.eventDetailText}>
                {item.startTime} - {item.endTime}
              </Text>
            </View>
          </View>

          <View style={styles.eventFooter}>
            <Text style={styles.eventCreatedBy}>
              Created by: {item.createdBy.name}
            </Text>
            <View style={[
              styles.eventStatus,
              { backgroundColor: item.isActive ? '#4CAF50' : '#666' }
            ]}>
              <Text style={styles.eventStatusText}>
                {item.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>
    );
  };

  const renderEmptyState = () => (
    <Animated.View 
      style={[
        styles.emptyState,
        { opacity: fadeAnim }
      ]}
    >
      <MaterialIcons name="event-busy" size={64} color="#333" />
      <Text style={styles.emptyStateTitle}>No Events Found</Text>
      <Text style={styles.emptyStateDescription}>
        No calendar events have been created for this batch yet. Tap the + button to create your first event.
      </Text>
    </Animated.View>
  );

  const renderEventForm = () => (
    <Modal
      visible={isModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={closeModal}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingEvent ? 'Edit Event' : 'Create New Event'}
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <MaterialIcons name="close" size={24} color="#888" />
              </TouchableOpacity>
            </View>

            {/* Form Fields */}
            <View style={styles.formContainer}>
              {/* Title */}
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

              {/* Description */}
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

              {/* Event Type */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Event Type</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.typeSelector}
                >
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
                      <Text style={[
                        styles.typeOptionText,
                        formData.type === type.key && { color: type.color }
                      ]}>
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Date */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Date</Text>
                <TouchableOpacity
                  style={styles.dateTimeButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <MaterialIcons name="calendar-today" size={20} color={BRAND.primaryColor} />
                  <Text style={styles.dateTimeText}>
                    {formData.date.toDateString()}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Start Time */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Start Time</Text>
                <TouchableOpacity
                  style={styles.dateTimeButton}
                  onPress={() => setShowStartTimePicker(true)}
                >
                  <MaterialIcons name="access-time" size={20} color={BRAND.primaryColor} />
                  <Text style={styles.dateTimeText}>
                    {formData.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* End Time */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>End Time</Text>
                <TouchableOpacity
                  style={styles.dateTimeButton}
                  onPress={() => setShowEndTimePicker(true)}
                >
                  <MaterialIcons name="access-time" size={20} color={BRAND.primaryColor} />
                  <Text style={styles.dateTimeText}>
                    {formData.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={closeModal}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={editingEvent ? updateEvent : createEvent}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editingEvent ? 'Update' : 'Create'}
                  </Text>
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
            if (selectedDate) {
              setFormData(prev => ({ ...prev, date: selectedDate }));
            }
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
            if (selectedTime) {
              setFormData(prev => ({ ...prev, startTime: selectedTime }));
            }
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
            if (selectedTime) {
              setFormData(prev => ({ ...prev, endTime: selectedTime }));
            }
          }}
        />
      )}
    </Modal>
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
              <Text style={styles.headerTitle}>{batchName}</Text>
              <Text style={styles.headerSubtitle}>Calendar Events</Text>
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
              <MaterialIcons name="event" size={24} color={BRAND.primaryColor} />
              <Text style={styles.statNumber}>{events.length}</Text>
              <Text style={styles.statLabel}>Total Events</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <MaterialIcons name="today" size={24} color="#4CAF50" />
              <Text style={styles.statNumber}>
                {events.filter(e => new Date(e.date).toDateString() === new Date().toDateString()).length}
              </Text>
              <Text style={styles.statLabel}>Today's Events</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <MaterialIcons name="upcoming" size={24} color="#FF9800" />
              <Text style={styles.statNumber}>
                {events.filter(e => new Date(e.date) > new Date()).length}
              </Text>
              <Text style={styles.statLabel}>Upcoming</Text>
            </View>
          </View>
        </Animated.View>

        {/* Events List */}
        <Animated.View 
          style={[
            styles.eventsSection,
            { opacity: fadeAnim }
          ]}
        >
          <View style={styles.eventsHeader}>
            <Text style={styles.eventsTitle}>Events</Text>
            <Text style={styles.eventsSubtitle}>
              {events.length > 0 ? 'Tap to edit or delete events' : 'No events created yet'}
            </Text>
          </View>

          {isLoading && !refreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={BRAND.primaryColor} />
              <Text style={styles.loadingText}>Loading events...</Text>
            </View>
          ) : events.length > 0 ? (
            <FlatList
              data={events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())}
              renderItem={renderEventCard}
              keyExtractor={(item) => item._id}
              showsVerticalScrollIndicator={false}
              scrollEnabled={false}
              contentContainerStyle={styles.eventsList}
            />
          ) : (
            renderEmptyState()
          )}
        </Animated.View>
      </ScrollView>

      {/* Floating Action Button */}
      <Animated.View
        style={[
          styles.fab,
          {
            transform: [{ scale: fabScale }],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.fabButton}
          onPress={openCreateModal}
          activeOpacity={0.8}
        >
          <MaterialIcons name="add" size={24} color="#000" />
        </TouchableOpacity>
      </Animated.View>

      {/* Event Form Modal */}
      {renderEventForm()}
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
    width: 300,
    height: 300,
    top: -150,
    right: -150,
  },
  glowCircle2: {
    width: 250,
    height: 250,
    bottom: -125,
    left: -125,
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
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BRAND.primaryColor + '30',
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: BRAND.primaryColor,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 2,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BRAND.accentColor,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BRAND.primaryColor + '30',
  },
  statsSection: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: BRAND.accentColor,
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: BRAND.primaryColor + '20',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: BRAND.primaryColor,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#333',
    marginHorizontal: 15,
  },
  eventsSection: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  eventsHeader: {
    marginBottom: 20,
  },
  eventsTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  eventsSubtitle: {
    fontSize: 14,
    color: '#888',
  },
  eventsList: {
    paddingBottom: 20,
  },
  eventCard: {
    marginBottom: 15,
    backgroundColor: BRAND.accentColor,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: BRAND.primaryColor + '20',
    overflow: 'hidden',
  },
  eventCardContent: {
    padding: 20,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
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
    marginBottom: 4,
  },
  eventType: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  eventActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  deleteButton: {
    backgroundColor: '#f4433620',
  },
  eventDescription: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
    marginBottom: 12,
  },
  eventDetails: {
    marginBottom: 15,
  },
  eventDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  eventDetailText: {
    fontSize: 13,
    color: '#aaa',
    marginLeft: 8,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  eventCreatedBy: {
    fontSize: 12,
    color: '#888',
    flex: 1,
  },
  eventStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  eventStatusText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    color: '#888',
    marginTop: 10,
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyStateDescription: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    zIndex: 10,
  },
  fabButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: BRAND.primaryColor,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BRAND.primaryColor,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: BRAND.accentColor,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.9,
    borderWidth: 1,
    borderColor: BRAND.primaryColor + '30',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  formContainer: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: BRAND.primaryColor,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#555',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  typeSelector: {
    flexDirection: 'row',
    marginTop: 5,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    backgroundColor: '#333',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#555',
  },
  typeOptionSelected: {
    backgroundColor: '#444',
    borderWidth: 2,
  },
  typeOptionText: {
    fontSize: 12,
    color: '#ccc',
    marginLeft: 6,
    fontWeight: '600',
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#555',
  },
  dateTimeText: {
    fontSize: 16,
    color: '#fff',
    marginLeft: 10,
  },
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#333',
    borderWidth: 1,
    borderColor: '#555',
  },
  cancelButtonText: {
    color: '#ccc',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: BRAND.primaryColor,
  },
  saveButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});