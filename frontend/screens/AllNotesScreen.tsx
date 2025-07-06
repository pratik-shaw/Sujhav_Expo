import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  StatusBar,
  SafeAreaView,
  Animated,
  Image,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native';
import { NavigationProp, RouteProp } from '@react-navigation/native';
import { API_BASE } from '../config/api';

interface AllNotesScreenProps {
  navigation: NavigationProp<any>;
  route: RouteProp<any>;
}

interface Notes {
  _id: string;
  notesTitle: string;
  tutor: string;
  rating: number;
  category: 'jee' | 'neet' | 'boards';
  class: string;
  price?: number; // Optional for paid notes
  notesDetails: {
    subtitle: string;
    description: string;
  };
  pdfs: Array<{
    _id: string;
    pdfTitle: string;
    pdfDescription: string;
    originalName: string;
    fileSize: number;
    pages: number;
  }>;
  thumbnail: {
    mimeType: string;
    originalName: string;
    size: number;
  };
  viewCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  isPaid?: boolean; // Added to distinguish between paid and unpaid notes
}

const { width, height } = Dimensions.get('window');

// Brand configuration
const BRAND = {
  name: "SUJHAV",
  subtitle: "Synchronize your Understanding, do Justice to your Hardwork and let others Admire your Victory!",
  primaryColor: '#00ff88',
  secondaryColor: '#000000',
  backgroundColor: '#0a1a0a',
  accentColor: '#1a2e1a',
};

const AllNotesScreen: React.FC<AllNotesScreenProps> = ({ navigation, route }) => {
  // Get initial data from route params
  const initialNotes = route.params?.notes || [];
  const initialCategory = route.params?.selectedCategory || 'all';
  const initialClass = route.params?.selectedClass || 'all';

  // State management
  const [notes, setNotes] = useState<Notes[]>(initialNotes);
  const [filteredNotes, setFilteredNotes] = useState<Notes[]>(initialNotes);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'jee' | 'neet' | 'boards'>(initialCategory);
  const [selectedClass, setSelectedClass] = useState<'all' | '11th' | '12th'>(initialClass);
  const [selectedType, setSelectedType] = useState<'all' | 'free' | 'paid'>('all');

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-20)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  // API Base URL
  const API_BASE_URL = API_BASE;

  // Fetch all notes from both APIs
  const fetchAllNotes = async () => {
    try {
      setLoading(true);
      
      // Fetch both unpaid and paid notes simultaneously
      const [unpaidResponse, paidResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/unpaidNotes`),
        fetch(`${API_BASE_URL}/paidNotes`)
      ]);

      let unpaidNotes = [];
      let paidNotes = [];

      // Handle unpaid notes response
      if (unpaidResponse.ok) {
        const unpaidText = await unpaidResponse.text();
        const unpaidData = JSON.parse(unpaidText);
        unpaidNotes = Array.isArray(unpaidData) ? unpaidData : (unpaidData.data || []);
        // Mark as unpaid
        unpaidNotes = unpaidNotes.map((note: any) => ({ ...note, isPaid: false }));
      }

      // Handle paid notes response
      if (paidResponse.ok) {
        const paidText = await paidResponse.text();
        const paidData = JSON.parse(paidText);
        paidNotes = Array.isArray(paidData) ? paidData : (paidData.data || []);
        // Mark as paid
        paidNotes = paidNotes.map((note: any) => ({ ...note, isPaid: true }));
      }

      // Combine both arrays
      const allNotes = [...unpaidNotes, ...paidNotes];
      
      // Sort by creation date (newest first)
      allNotes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setNotes(allNotes);
      
    } catch (error) {
      console.error('Error fetching notes:', error);
      setNotes([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter notes based on search and filters
  const applyFilters = () => {
    let filtered = notes;

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(note =>
        note.notesTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.tutor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.notesDetails.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(note => note.category === selectedCategory);
    }

    // Apply class filter
    if (selectedClass !== 'all') {
      filtered = filtered.filter(note => note.class === selectedClass);
    }

    // Apply type filter (free/paid)
    if (selectedType !== 'all') {
      if (selectedType === 'free') {
        filtered = filtered.filter(note => !note.isPaid);
      } else if (selectedType === 'paid') {
        filtered = filtered.filter(note => note.isPaid);
      }
    }

    // Only show active notes
    filtered = filtered.filter(note => note.isActive);

    setFilteredNotes(filtered);
  };

  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAllNotes();
    setRefreshing(false);
  };

  // Handle notes press
  const handleNotesPress = (notesId: string, isPaid: boolean) => {
    if (isPaid) {
      navigation.navigate('PaidNotesDetails', { notesId });
    } else {
      navigation.navigate('NotesDetails', { notesId });
    }
  };

  // Handle back button
  const handleBackPress = () => {
    navigation.goBack();
  };

  // Helper function to get proper image source
  const getImageSource = (notesId: string, isPaid: boolean) => {
    if (!notesId) {
      return { uri: 'https://via.placeholder.com/80x60/1a2e1a/00ff88?text=No+Image' };
    }
    
    const endpoint = isPaid ? 'paidNotes' : 'unpaidNotes';
    return { uri: `${API_BASE_URL}/${endpoint}/${notesId}/thumbnail` };
  };

  // Helper function to format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Helper function to format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Helper function to format price
  const formatPrice = (price: number) => {
    return `₹${price.toLocaleString('en-IN')}`;
  };

  useEffect(() => {
    // If no notes were passed, fetch them
    if (initialNotes.length === 0) {
      fetchAllNotes();
    }
    startEntranceAnimation();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchQuery, selectedCategory, selectedClass, selectedType, notes]);

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

    // Content fade in
    setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    }, 600);
  };

  const renderFilterButton = (title: string, value: string, selectedValue: string, onPress: (value: any) => void) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        selectedValue === value && styles.filterButtonActive
      ]}
      onPress={() => onPress(value)}
    >
      <Text style={[
        styles.filterButtonText,
        selectedValue === value && styles.filterButtonTextActive
      ]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  const renderNotesItem = (note: Notes) => (
    <TouchableOpacity
      key={note._id}
      style={styles.notesItem}
      onPress={() => handleNotesPress(note._id, note.isPaid || false)}
      activeOpacity={0.7}
    >
      {/* Notes thumbnail */}
      <View style={styles.notesImageContainer}>
        <Image
          source={getImageSource(note._id, note.isPaid || false)}
          style={styles.notesImage}
          resizeMode="cover"
        />
        <View style={[
          styles.notesTypeBadge,
          note.isPaid && styles.notesTypeBadgePaid
        ]}>
          <Text style={[
            styles.notesTypeBadgeText,
            note.isPaid && styles.notesTypeBadgeTextPaid
          ]}>
            {note.isPaid ? 'PAID' : 'FREE'}
          </Text>
        </View>
      </View>

      {/* Notes info */}
      <View style={styles.notesInfo}>
        <View style={styles.notesHeader}>
          <Text style={styles.notesTitle} numberOfLines={2}>
            {note.notesTitle}
          </Text>
          <View style={styles.notesBadges}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{note.category.toUpperCase()}</Text>
            </View>
            <View style={styles.classBadge}>
              <Text style={styles.classBadgeText}>{note.class}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.notesSubtitle} numberOfLines={1}>
          {note.notesDetails.subtitle}
        </Text>

        <Text style={styles.notesTutor} numberOfLines={1}>
          by {note.tutor}
        </Text>

        {/* Price display for paid notes */}
        {note.isPaid && note.price && (
          <View style={styles.priceContainer}>
            <Text style={styles.priceText}>
              {formatPrice(note.price)}
            </Text>
          </View>
        )}

        <View style={styles.notesStats}>
          <View style={styles.statItem}>
            <Text style={styles.ratingText}>⭐ {note.rating}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.pdfsText}>{note.pdfs?.length || 0} PDFs</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.viewsText}>
              {note.viewCount || 0} views
            </Text>
          </View>
        </View>

        <View style={styles.dateContainer}>
          <Text style={styles.dateText}>
            Updated: {formatDate(note.updatedAt)}
          </Text>
        </View>
      </View>

      {/* File info */}
      <View style={styles.fileInfoContainer}>
        <Text style={styles.fileCountText}>
          {note.pdfs?.length || 0}
        </Text>
        <Text style={styles.fileCountLabel}>PDFs</Text>
        {note.pdfs && note.pdfs.length > 0 && (
          <Text style={styles.fileSizeText}>
            {note.pdfs.reduce((total, pdf) => total + pdf.pages, 0)} pages
          </Text>
        )}
      </View>
    </TouchableOpacity>
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
            onPress={handleBackPress}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>All Notes</Text>
            <Text style={styles.headerSubtitle}>
              {filteredNotes.length} notes available
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Search Bar */}
      <Animated.View style={[styles.searchSection, { opacity: fadeAnim }]}>
        <View style={styles.searchInputContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search notes, tutors, categories..."
            placeholderTextColor="#666666"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <Text style={styles.searchIcon}>🔍</Text>
        </View>
      </Animated.View>

      {/* Filters Section */}
      <Animated.View style={[styles.filtersSection, { opacity: fadeAnim }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterRow}>
            {/* Type Filters */}
            {renderFilterButton('All', 'all', selectedType, setSelectedType)}
            {renderFilterButton('Free', 'free', selectedType, setSelectedType)}
            {renderFilterButton('Paid', 'paid', selectedType, setSelectedType)}
            
            {/* Category Filters */}
            {renderFilterButton('All Subjects', 'all', selectedCategory, setSelectedCategory)}
            {renderFilterButton('JEE', 'jee', selectedCategory, setSelectedCategory)}
            {renderFilterButton('NEET', 'neet', selectedCategory, setSelectedCategory)}
            {renderFilterButton('Boards', 'boards', selectedCategory, setSelectedCategory)}
            
            {/* Class Filters */}
            {renderFilterButton('All Classes', 'all', selectedClass, setSelectedClass)}
            {renderFilterButton('11th', '11th', selectedClass, setSelectedClass)}
            {renderFilterButton('12th', '12th', selectedClass, setSelectedClass)}
          </View>
        </ScrollView>
      </Animated.View>

      {/* Notes List */}
      <Animated.View style={[styles.notesContainer, { opacity: fadeAnim }]}>
        <ScrollView
          style={styles.notesList}
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
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading notes...</Text>
            </View>
          ) : filteredNotes.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No notes found</Text>
              <Text style={styles.emptySubtext}>
                Try adjusting your search or filters
              </Text>
            </View>
          ) : (
            <View style={styles.notesListContent}>
              {filteredNotes.map((note) => renderNotesItem(note))}
              <View style={styles.bottomPadding} />
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
};

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

  // Header Section
  headerSection: {
    height: 60,
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(10, 26, 10, 0.95)',
    zIndex: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  backButtonText: {
    color: BRAND.primaryColor,
    fontSize: 20,
    fontWeight: '600',
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: BRAND.primaryColor,
    marginTop: 2,
    fontWeight: '500',
  },

  // Search Section
  searchSection: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  searchIcon: {
    fontSize: 16,
    marginLeft: 10,
  },

  // Filters Section
  filtersSection: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  filterButtonActive: {
    backgroundColor: BRAND.primaryColor,
    borderColor: BRAND.primaryColor,
  },
  filterButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: BRAND.backgroundColor,
    fontWeight: '600',
  },

  // Notes Container
  notesContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  notesList: {
    flex: 1,
  },
  notesListContent: {
    paddingTop: 10,
  },

  // Notes Item (List Style)
  notesItem: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.2)',
    shadowColor: BRAND.primaryColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  notesImageContainer: {
    width: 80,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  notesImage: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  notesTypeBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  notesTypeBadgePaid: {
    backgroundColor: 'rgba(255, 165, 0, 0.9)',
  },
  notesTypeBadgeText: {
    color: BRAND.primaryColor,
    fontSize: 8,
    fontWeight: '700',
  },
  notesTypeBadgeTextPaid: {
    color: '#ffffff',
  },

  // Notes Info
  notesInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  notesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  notesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
    lineHeight: 18,
    marginRight: 8,
  },
  notesBadges: {
    flexDirection: 'row',
    gap: 4,
  },
  categoryBadge: {
    backgroundColor: 'rgba(0, 255, 136, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryBadgeText: {
    color: BRAND.primaryColor,
    fontSize: 8,
    fontWeight: '700',
  },
  classBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  classBadgeText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '700',
  },
  notesSubtitle: {
    fontSize: 11,
    color: '#cccccc',
    marginBottom: 4,
    fontWeight: '500',
  },
  notesTutor: {
    fontSize: 12,
    color: BRAND.primaryColor,
    marginBottom: 6,
    fontWeight: '500',
  },
  
  // Price Container
  priceContainer: {
    marginBottom: 6,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFA500',
  },

  notesStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '500',
  },
  pdfsText: {
    fontSize: 10,
    color: '#cccccc',
    fontWeight: '500',
  },
  viewsText: {
    fontSize: 10,
    color: '#aaaaaa',
    fontWeight: '500',
  },
  dateContainer: {
    marginTop: 2,
  },
  dateText: {
    fontSize: 9,
    color: '#888888',
    fontWeight: '400',
  },

  // File Info Container
  fileInfoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    minWidth: 60,
  },
  fileCountText: {
    fontSize: 18,
    fontWeight: '700',
    color: BRAND.primaryColor,
    textAlign: 'center',
  },
  fileCountLabel: {
    fontSize: 10,
    color: '#cccccc',
    textAlign: 'center',
    marginTop: 2,
  },
  fileSizeText: {
    fontSize: 8,
    color: '#aaaaaa',
    textAlign: 'center',
    marginTop: 2,
  },

  // Loading and Empty States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#aaaaaa',
    fontSize: 14,
    textAlign: 'center',
  },

  // Bottom padding
  bottomPadding: {
    height: 20,
  },
});

export default AllNotesScreen;