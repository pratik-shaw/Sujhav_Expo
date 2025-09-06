import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// Brand configuration
const BRAND = {
  name: "SUJHAV",
  primaryColor: '#00ff88',
  secondaryColor: '#000000',
  backgroundColor: '#0a1a0a',
  accentColor: '#1a2e1a',
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
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface EventCalendarProps {
  events: CalendarEvent[];
  onDateSelect?: (date: Date) => void;
  onEventPress?: (event: CalendarEvent) => void;
}

const EVENT_TYPE_COLORS = {
  'class': '#4CAF50',
  'exam': '#f44336',
  'assignment': '#FF9800',
  'meeting': '#2196F3',
  'other': '#9C27B0',
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function EventCalendar({ events, onDateSelect, onEventPress }: EventCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const isSameDay = (date1: Date, date2: Date) => {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return isSameDay(eventDate, date);
    });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const handleDatePress = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(date);
    onDateSelect?.(date);
  };

  const renderCalendarGrid = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const today = new Date();

    const days = [];

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <View key={`empty-${i}`} style={styles.dayCell} />
      );
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dayEvents = getEventsForDate(date);
      const isToday = isSameDay(date, today);
      const isSelected = selectedDate && isSameDay(date, selectedDate);
      const isPast = date < today && !isToday;

      days.push(
        <TouchableOpacity
          key={day}
          style={[
            styles.dayCell,
            isToday && styles.todayCell,
            isSelected && styles.selectedCell,
            isPast && styles.pastCell,
          ]}
          onPress={() => handleDatePress(day)}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.dayText,
            isToday && styles.todayText,
            isSelected && styles.selectedText,
            isPast && styles.pastText,
          ]}>
            {day}
          </Text>
          
          {/* Event indicators */}
          {dayEvents.length > 0 && (
            <View style={styles.eventIndicators}>
              {dayEvents.slice(0, 3).map((event, index) => (
                <View
                  key={event._id}
                  style={[
                    styles.eventDot,
                    { backgroundColor: EVENT_TYPE_COLORS[event.type] || BRAND.primaryColor }
                  ]}
                />
              ))}
              {dayEvents.length > 3 && (
                <Text style={styles.moreEventsText}>+{dayEvents.length - 3}</Text>
              )}
            </View>
          )}
        </TouchableOpacity>
      );
    }

    return days;
  };

  const renderSelectedDateEvents = () => {
    if (!selectedDate) return null;

    const dayEvents = getEventsForDate(selectedDate);
    if (dayEvents.length === 0) return null;

    return (
      <View style={styles.selectedDateEvents}>
        <View style={styles.selectedDateHeader}>
          <MaterialIcons name="event" size={20} color={BRAND.primaryColor} />
          <Text style={styles.selectedDateTitle}>
            Events on {selectedDate.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric' 
            })}
          </Text>
        </View>
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.eventsScrollView}
        >
          {dayEvents.map((event) => (
            <TouchableOpacity
              key={event._id}
              style={[
                styles.eventCard,
                { borderLeftColor: EVENT_TYPE_COLORS[event.type] || BRAND.primaryColor }
              ]}
              onPress={() => onEventPress?.(event)}
              activeOpacity={0.8}
            >
              <Text style={styles.eventTitle} numberOfLines={1}>
                {event.title}
              </Text>
              <Text style={styles.eventTime}>
                {event.startTime} - {event.endTime}
              </Text>
              <Text style={[
                styles.eventType,
                { color: EVENT_TYPE_COLORS[event.type] || BRAND.primaryColor }
              ]}>
                {event.type.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Calendar Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.navButton} 
          onPress={() => navigateMonth('prev')}
        >
          <MaterialIcons name="chevron-left" size={24} color={BRAND.primaryColor} />
        </TouchableOpacity>
        
        <View style={styles.monthYearContainer}>
          <Text style={styles.monthText}>
            {MONTHS[currentDate.getMonth()]}
          </Text>
          <Text style={styles.yearText}>
            {currentDate.getFullYear()}
          </Text>
        </View>
        
        <TouchableOpacity 
          style={styles.navButton} 
          onPress={() => navigateMonth('next')}
        >
          <MaterialIcons name="chevron-right" size={24} color={BRAND.primaryColor} />
        </TouchableOpacity>
      </View>

      {/* Days of week header */}
      <View style={styles.daysHeader}>
        {DAYS.map((day) => (
          <View key={day} style={styles.dayHeaderCell}>
            <Text style={styles.dayHeaderText}>{day}</Text>
          </View>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={styles.calendar}>
        {renderCalendarGrid()}
      </View>

      {/* Selected Date Events */}
      {renderSelectedDateEvents()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: BRAND.accentColor,
    borderRadius: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: BRAND.primaryColor + '20',
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BRAND.primaryColor + '30',
  },
  monthYearContainer: {
    alignItems: 'center',
  },
  monthText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  yearText: {
    fontSize: 14,
    color: BRAND.primaryColor,
    marginTop: 2,
  },
  daysHeader: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  dayHeaderCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  dayHeaderText: {
    fontSize: 12,
    color: '#888',
    fontWeight: '600',
  },
  calendar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: width * 0.12,
    height: width * 0.12,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 1,
    borderRadius: 8,
    position: 'relative',
  },
  todayCell: {
    backgroundColor: BRAND.primaryColor + '20',
    borderWidth: 1,
    borderColor: BRAND.primaryColor,
  },
  selectedCell: {
    backgroundColor: BRAND.primaryColor,
  },
  pastCell: {
    opacity: 0.5,
  },
  dayText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
    marginBottom: 2,
  },
  todayText: {
    color: BRAND.primaryColor,
    fontWeight: 'bold',
  },
  selectedText: {
    color: '#000',
    fontWeight: 'bold',
  },
  pastText: {
    color: '#666',
  },
  eventIndicators: {
    position: 'absolute',
    bottom: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginHorizontal: 0.5,
  },
  moreEventsText: {
    fontSize: 8,
    color: BRAND.primaryColor,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  selectedDateEvents: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  selectedDateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  selectedDateTitle: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  eventsScrollView: {
    flexDirection: 'row',
  },
  eventCard: {
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 10,
    marginRight: 10,
    borderLeftWidth: 3,
    minWidth: 120,
    maxWidth: 150,
  },
  eventTitle: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 4,
  },
  eventTime: {
    fontSize: 10,
    color: '#aaa',
    marginBottom: 4,
  },
  eventType: {
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
});