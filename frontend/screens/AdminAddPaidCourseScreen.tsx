import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Modal,
  FlatList,
  Dimensions,
  Image,
  Platform,
} from 'react-native';
import { API_BASE } from '../config/api';
// Add these imports for image picking
import * as ImagePicker from 'expo-image-picker';
// Alternative for React Native CLI:
// import {launchImageLibrary} from 'react-native-image-picker';

const { width } = Dimensions.get('window');

// Brand configuration
const BRAND = {
  name: "SUJHAV",
  primaryColor: '#00ff88',
  secondaryColor: '#000000',
  backgroundColor: '#0a1a0a',
  accentColor: '#1a2e1a',
  errorColor: '#ff6b6b',
  warningColor: '#ffa726',
  goldColor: '#ffd700',
};

// Mock API configuration (replace with your actual API)
const API_BASE_URL = API_BASE;

// Types
interface PaidCourse {
  _id?: string;
  courseTitle: string;
  tutor: string;
  rating: number;
  price: number;
  category: 'jee' | 'neet' | 'boards';
  class: string;
  courseDetails: {
    subtitle: string;
    description: string;
  };
  videoLinks: VideoLink[];
  courseThumbnail: string;
  thumbnailUri?: string; // For local image handling
  thumbnailMetadata?: {
    originalName: string;
    size: number;
    mimeType: string;
    uploadedAt: Date;
  };
  isActive: boolean;
  studentsEnrolled?: StudentEnrollment[];
  createdAt?: string;
}

interface VideoLink {
  _id?: string;
  videoTitle: string;
  videoDescription: string;
  videoLink: string;
  duration: string;
}

interface StudentEnrollment {
  _id?: string;
  studentId: string;
  mode: string;
  schedule: string;
  enrolledAt?: Date;
}

interface AdminPaidCourseScreenProps {
  navigation?: any;
  onBack?: () => void;
}

export default function AdminPaidCourseScreen({ 
  navigation, 
  onBack 
}: AdminPaidCourseScreenProps) {
  // State
  const [courses, setCourses] = useState<PaidCourse[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<PaidCourse | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<PaidCourse | null>(null);

  // Form state
  const [courseForm, setCourseForm] = useState<PaidCourse>({
    courseTitle: '',
    tutor: '',
    rating: 0,
    price: 1, // Default to 1 for paid courses
    category: 'jee',
    class: '',
    courseDetails: {
      subtitle: '',
      description: '',
    },
    videoLinks: [],
    courseThumbnail: '',
    thumbnailUri: '',
    isActive: true,
    studentsEnrolled: [],
  });

  // Video form state
  const [videoForm, setVideoForm] = useState<VideoLink>({
    videoTitle: '',
    videoDescription: '',
    videoLink: '',
    duration: '',
  });

  const [editingVideo, setEditingVideo] = useState<VideoLink | null>(null);
  const [editingVideoIndex, setEditingVideoIndex] = useState<number | null>(null);

  // Load courses on mount
  useEffect(() => {
    loadCourses();
    requestPermissions();
  }, []);

  // Request permissions for image picker
  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions to upload images.');
      }
    }
  };

  // Image picker function
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        setCourseForm({ 
          ...courseForm, 
          thumbnailUri: imageUri,
          courseThumbnail: imageUri // For display purposes
        });
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  // Handle back navigation
  const handleBackPress = () => {
    if (onBack) {
      onBack();
    } else if (navigation) {
      if (navigation.goBack) {
        navigation.goBack();
      } else if (navigation.navigate) {
        navigation.navigate('AdminDashboard');
      }
    }
  };

  // API functions
  const loadCourses = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/paidCourses`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setCourses(data.data || []);
      } else {
        Alert.alert('Error', data.message || 'Failed to load paid courses');
      }
    } catch (error) {
      console.error('Error loading paid courses:', error);
      Alert.alert('Error', 'Failed to load paid courses. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const saveCourse = async () => {
    try {
      if (!validateCourse()) return;
      
      setLoading(true);
      const url = editingCourse 
        ? `${API_BASE_URL}/paidCourses/${editingCourse._id}`
        : `${API_BASE_URL}/paidCourses`;
      
      const method = editingCourse ? 'PUT' : 'POST';
      
      // Create FormData for multipart/form-data
      const formData = new FormData();
      
      // Add course data
      formData.append('courseTitle', courseForm.courseTitle);
      formData.append('tutor', courseForm.tutor);
      formData.append('rating', courseForm.rating.toString());
      formData.append('price', courseForm.price.toString());
      formData.append('category', courseForm.category);
      formData.append('class', courseForm.class);
      formData.append('courseDetails', JSON.stringify(courseForm.courseDetails));
      formData.append('videoLinks', JSON.stringify(courseForm.videoLinks));
      formData.append('isActive', courseForm.isActive.toString());
      
      // Add thumbnail if selected
      if (courseForm.thumbnailUri) {
        const filename = courseForm.thumbnailUri.split('/').pop() || 'thumbnail.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        
        formData.append('thumbnail', {
          uri: courseForm.thumbnailUri,
          type: type,
          name: filename,
        } as any);
      }
      
      const response = await fetch(url, {
        method,
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        Alert.alert('Success', editingCourse ? 'Paid course updated!' : 'Paid course created!');
        resetForm();
        setShowAddModal(false);
        loadCourses();
      } else {
        Alert.alert('Error', data.message || 'Failed to save paid course');
      }
    } catch (error) {
      console.error('Error saving paid course:', error);
      Alert.alert('Error', 'Failed to save paid course. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const deleteCourse = async (courseId: string) => {
    if (!courseId) {
      Alert.alert('Error', 'Course ID is required');
      return;
    }

    Alert.alert(
      'Delete Paid Course',
      'Are you sure you want to delete this paid course? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const response = await fetch(`${API_BASE_URL}/paidCourses/${courseId}`, {
                method: 'DELETE',
              });
              
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              
              const data = await response.json();
              
              if (data.success) {
                Alert.alert('Success', 'Paid course deleted!');
                loadCourses();
              } else {
                Alert.alert('Error', data.message || 'Failed to delete paid course');
              }
            } catch (error) {
              console.error('Error deleting paid course:', error);
              Alert.alert('Error', 'Failed to delete paid course. Please check your internet connection.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const addVideoToCourse = async () => {
    try {
      if (!validateVideo()) return;
      if (!selectedCourse?._id) {
        Alert.alert('Error', 'Course not selected');
        return;
      }
      
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/paidCourses/${selectedCourse._id}/videos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(videoForm),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        Alert.alert('Success', 'Video added to paid course!');
        setVideoForm({
          videoTitle: '',
          videoDescription: '',
          videoLink: '',
          duration: '',
        });
        setSelectedCourse(data.data);
        loadCourses();
      } else {
        Alert.alert('Error', data.message || 'Failed to add video');
      }
    } catch (error) {
      console.error('Error adding video:', error);
      Alert.alert('Error', 'Failed to add video. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const updateVideoInCourse = async () => {
    try {
      if (!validateVideo()) return;
      if (!selectedCourse?._id || !editingVideo?._id) {
        Alert.alert('Error', 'Invalid course or video selection');
        return;
      }
      
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/paidCourses/${selectedCourse._id}/videos/${editingVideo._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(videoForm),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        Alert.alert('Success', 'Video updated in paid course!');
        setVideoForm({
          videoTitle: '',
          videoDescription: '',
          videoLink: '',
          duration: '',
        });
        setEditingVideo(null);
        setEditingVideoIndex(null);
        setSelectedCourse(data.data);
        loadCourses();
      } else {
        Alert.alert('Error', data.message || 'Failed to update video');
      }
    } catch (error) {
      console.error('Error updating video:', error);
      Alert.alert('Error', 'Failed to update video. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const deleteVideoFromCourse = async (videoId: string) => {
    if (!selectedCourse?._id || !videoId) {
      Alert.alert('Error', 'Invalid course or video selection');
      return;
    }

    Alert.alert(
      'Delete Video',
      'Are you sure you want to delete this video from the paid course?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const response = await fetch(`${API_BASE_URL}/paidCourses/${selectedCourse._id}/videos/${videoId}`, {
                method: 'DELETE',
              });
              
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              
              const data = await response.json();
              
              if (data.success) {
                Alert.alert('Success', 'Video deleted from paid course!');
                setSelectedCourse(data.data);
                loadCourses();
              } else {
                Alert.alert('Error', data.message || 'Failed to delete video');
              }
            } catch (error) {
              console.error('Error deleting video:', error);
              Alert.alert('Error', 'Failed to delete video. Please check your internet connection.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // Validation functions
  const validateCourse = () => {
    if (!courseForm.courseTitle?.trim()) {
      Alert.alert('Error', 'Course title is required');
      return false;
    }
    if (!courseForm.tutor?.trim()) {
      Alert.alert('Error', 'Tutor name is required');
      return false;
    }
    if (!courseForm.class?.trim()) {
      Alert.alert('Error', 'Class is required');
      return false;
    }
    if (!courseForm.courseDetails?.subtitle?.trim()) {
      Alert.alert('Error', 'Subtitle is required');
      return false;
    }
    if (!courseForm.courseDetails?.description?.trim()) {
      Alert.alert('Error', 'Description is required');
      return false;
    }
    if (!courseForm.thumbnailUri && !courseForm.courseThumbnail) {
      Alert.alert('Error', 'Thumbnail is required');
      return false;
    }
    // Price validation - must be at least 1 for paid courses
    if (courseForm.price < 1) {
      Alert.alert('Error', 'Price must be at least ₹1 for paid courses');
      return false;
    }
    // Rating validation
    if (courseForm.rating < 0 || courseForm.rating > 5) {
      Alert.alert('Error', 'Rating must be between 0 and 5');
      return false;
    }
    return true;
  };

  const validateVideo = () => {
    if (!videoForm.videoTitle?.trim()) {
      Alert.alert('Error', 'Video title is required');
      return false;
    }
    if (!videoForm.videoDescription?.trim()) {
      Alert.alert('Error', 'Video description is required');
      return false;
    }
    if (!videoForm.videoLink?.trim()) {
      Alert.alert('Error', 'Video link is required');
      return false;
    }
    // Basic URL validation
    try {
      new URL(videoForm.videoLink);
    } catch {
      Alert.alert('Error', 'Please enter a valid video URL');
      return false;
    }
    if (!videoForm.duration?.trim()) {
      Alert.alert('Error', 'Video duration is required');
      return false;
    }
    return true;
  };

  // Helper functions
  const resetForm = () => {
    setCourseForm({
      courseTitle: '',
      tutor: '',
      rating: 0,
      price: 1, // Default to 1 for paid courses
      category: 'jee',
      class: '',
      courseDetails: {
        subtitle: '',
        description: '',
      },
      videoLinks: [],
      courseThumbnail: '',
      thumbnailUri: '',
      isActive: true,
      studentsEnrolled: [],
    });
    setEditingCourse(null);
  };

  const editCourse = (course: PaidCourse) => {
    setCourseForm({
      ...course,
      courseDetails: course.courseDetails || { subtitle: '', description: '' },
      videoLinks: course.videoLinks || [],
      rating: course.rating || 0,
      price: course.price || 1,
      isActive: course.isActive !== undefined ? course.isActive : true,
      studentsEnrolled: course.studentsEnrolled || [],
      thumbnailUri: '', // Reset local URI for editing
    });
    setEditingCourse(course);
    setShowAddModal(true);
  };

  const editVideo = (video: VideoLink, index: number) => {
    setVideoForm({
      videoTitle: video.videoTitle,
      videoDescription: video.videoDescription,
      videoLink: video.videoLink,
      duration: video.duration,
    });
    setEditingVideo(video);
    setEditingVideoIndex(index);
  };

  const cancelVideoEdit = () => {
    setVideoForm({
      videoTitle: '',
      videoDescription: '',
      videoLink: '',
      duration: '',
    });
    setEditingVideo(null);
    setEditingVideoIndex(null);
  };

  const manageVideos = (course: PaidCourse) => {
    setSelectedCourse(course);
    setShowVideoModal(true);
  };

  const handleBackFromCourseModal = () => {
    resetForm();
    setShowAddModal(false);
  };

  const handleBackFromVideoModal = () => {
    setVideoForm({
      videoTitle: '',
      videoDescription: '',
      videoLink: '',
      duration: '',
    });
    setEditingVideo(null);
    setEditingVideoIndex(null);
    setSelectedCourse(null);
    setShowVideoModal(false);
  };

  // Format price for display
  const formatPrice = (price: number) => {
    return price >= 1000 ? `₹${(price / 1000).toFixed(1)}K` : `₹${price}`;
  };

  // Render functions
  const renderCourseItem = ({ item }: { item: PaidCourse }) => (
    <View style={styles.courseCard}>
      <View style={styles.courseHeader}>
        <View style={styles.courseHeaderLeft}>
          <Text style={styles.courseTitle}>{item.courseTitle || 'Untitled Course'}</Text>
          <Text style={styles.courseTutor}>by {item.tutor || 'Unknown'}</Text>
        </View>
        <View style={styles.priceContainer}>
          <Text style={styles.priceText}>{formatPrice(item.price || 1)}</Text>
          <Text style={styles.priceLabel}>PREMIUM</Text>
        </View>
      </View>
      
      <View style={styles.courseInfo}>
        <Text style={styles.infoText}>Category: {item.category ? item.category.toUpperCase() : 'N/A'}</Text>
        <Text style={styles.infoText}>Class: {item.class || 'N/A'}</Text>
        <Text style={styles.infoText}>Rating: ⭐ {item.rating || 0}</Text>
        <Text style={styles.infoText}>
          Students: {item.studentsEnrolled?.length || 0}
        </Text>
        <Text style={[styles.infoText, { color: item.isActive ? BRAND.primaryColor : BRAND.errorColor }]}>
          {item.isActive ? 'Active' : 'Inactive'}
        </Text>
      </View>
      
      <Text style={styles.courseSubtitle}>
        {item.courseDetails?.subtitle || 'No subtitle available'}
      </Text>      
      
      <View style={styles.courseActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => editCourse(item)}
        >
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.videoButton]}
          onPress={() => manageVideos(item)}
        >
          <Text style={styles.actionButtonText}>Videos ({item.videoLinks?.length || 0})</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => item._id && deleteCourse(item._id)}
        >
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderVideoItem = ({ item, index }: { item: VideoLink; index: number }) => (
    <View style={styles.videoItem}>
      <View style={styles.videoContent}>
        <Text style={styles.videoTitle}>{item.videoTitle || 'Untitled Video'}</Text>
        <Text style={styles.videoDescription}>{item.videoDescription || 'No description'}</Text>
        <Text style={styles.videoDuration}>Duration: {item.duration || 'N/A'}</Text>
      </View>
      
      <View style={styles.videoActions}>
        <TouchableOpacity
          style={[styles.videoActionButton, styles.videoEditButton]}
          onPress={() => editVideo(item, index)}
        >
          <Text style={styles.videoActionButtonText}>Edit</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.videoActionButton, styles.videoDeleteButton]}
          onPress={() => item._id && deleteVideoFromCourse(item._id)}
        >
          <Text style={styles.videoActionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND.backgroundColor} />
      
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackPress}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Paid Courses Admin</Text>
        
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Text style={styles.addButtonText}>+ Add Course</Text>
        </TouchableOpacity>
      </View>

      {/* Course List */}
      {loading && courses.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BRAND.primaryColor} />
          <Text style={styles.loadingText}>Loading paid courses...</Text>
        </View>
      ) : (
        <FlatList
          data={courses}
          renderItem={renderCourseItem}
          keyExtractor={(item, index) => item._id || index.toString()}
          contentContainerStyle={styles.listContainer}
          refreshing={loading}
          onRefresh={loadCourses}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No paid courses found</Text>
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => setShowAddModal(true)}
              >
                <Text style={styles.createButtonText}>Create Your First Paid Course</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Add/Edit Course Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleBackFromCourseModal}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalBackButton}
              onPress={handleBackFromCourseModal}
            >
              <Text style={styles.modalBackButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingCourse ? 'Edit Paid Course' : 'Add New Paid Course'}
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleBackFromCourseModal}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Course Title */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Course Title *</Text>
              <TextInput
                style={styles.textInput}
                value={courseForm.courseTitle || ''}
                onChangeText={(text) => setCourseForm({ ...courseForm, courseTitle: text })}
                placeholder="Enter course title"
                placeholderTextColor="#666"
              />
            </View>

            {/* Tutor */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Tutor Name *</Text>
              <TextInput
                style={styles.textInput}
                value={courseForm.tutor || ''}
                onChangeText={(text) => setCourseForm({ ...courseForm, tutor: text })}
                placeholder="Enter tutor name"
                placeholderTextColor="#666"
              />
            </View>

            {/* Rating and Price */}
            <View style={styles.rowContainer}>
              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>Rating (0-5)</Text>
                <TextInput
                  style={styles.textInput}
                  value={courseForm.rating?.toString() || '0'}
                  onChangeText={(text) => {
                    const rating = parseFloat(text) || 0;
                    setCourseForm({ ...courseForm, rating: Math.min(Math.max(rating, 0), 5) });
                  }}
                  placeholder="0"
                  placeholderTextColor="#666"
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>Price (₹) - Min ₹1 *</Text>
                <TextInput
                  style={styles.textInput}
                  value={courseForm.price?.toString() || '1'}
                  onChangeText={(text) => {
                    const price = parseFloat(text) || 1;
                    setCourseForm({ ...courseForm, price: Math.max(price, 1) });
                  }}
                  placeholder="1"
                  placeholderTextColor="#666"
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Price Helper Text */}
            <Text style={styles.helperText}>
              💰 This is a paid course. Price must be at least ₹1
            </Text>

            {/* Category */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Category *</Text>
              <View style={styles.categoryContainer}>
                {(['jee', 'neet', 'boards'] as const).map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryButton,
                      courseForm.category === cat && styles.categoryButtonActive,
                    ]}
                    onPress={() => setCourseForm({ ...courseForm, category: cat })}
                  >
                    <Text
                      style={[
                        styles.categoryButtonText,
                        courseForm.category === cat && styles.categoryButtonTextActive,
                      ]}
                    >
                      {cat.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Class */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Class *</Text>
              <TextInput
                style={styles.textInput}
                value={courseForm.class || ''}
                onChangeText={(text) => setCourseForm({ ...courseForm, class: text })}
                placeholder="e.g., 11, 12"
                placeholderTextColor="#666"
              />
            </View>

            {/* Subtitle */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Subtitle *</Text>
              <TextInput
                style={styles.textInput}
                value={courseForm.courseDetails?.subtitle || ''}
                onChangeText={(text) => setCourseForm({
                  ...courseForm,
                  courseDetails: { ...courseForm.courseDetails, subtitle: text }
                })}
                placeholder="Enter course subtitle"
                placeholderTextColor="#666"
              />
            </View>

            {/* Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description *</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={courseForm.courseDetails?.description || ''}
                onChangeText={(text) => setCourseForm({
                  ...courseForm,
                  courseDetails: { ...courseForm.courseDetails, description: text }
                })}
                placeholder="Enter detailed course description"
                placeholderTextColor="#666"
                multiline
                numberOfLines={4}
              />
            </View>

            {/* Thumbnail Upload */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Course Thumbnail *</Text>
              <TouchableOpacity
                style={styles.thumbnailButton}
                onPress={pickImage}
              >
                <Text style={styles.thumbnailButtonText}>
                  {courseForm.thumbnailUri ? 'Change Thumbnail' : 'Select Thumbnail'}
                </Text>
              </TouchableOpacity>
              
              {(courseForm.thumbnailUri || courseForm.courseThumbnail) && (
                <Image
                  source={{ uri: courseForm.thumbnailUri || courseForm.courseThumbnail }}
                  style={styles.thumbnailPreview}
                  resizeMode="cover"
                />
              )}
            </View>

            {/* Active Status */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Course Status</Text>
              <TouchableOpacity
                style={[
                  styles.statusButton,
                  courseForm.isActive ? styles.statusButtonActive : styles.statusButtonInactive
                ]}
                onPress={() => setCourseForm({ ...courseForm, isActive: !courseForm.isActive })}
              >
                <Text style={[
                  styles.statusButtonText,
                  courseForm.isActive ? styles.statusButtonTextActive : styles.statusButtonTextInactive
                ]}>
                  {courseForm.isActive ? '✓ Active' : '✕ Inactive'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveButton, loading && styles.saveButtonDisabled]}
              onPress={saveCourse}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={BRAND.backgroundColor} />
              ) : (
                <Text style={styles.saveButtonText}>
                  {editingCourse ? 'Update Paid Course' : 'Create Paid Course'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Bottom Spacing */}
            <View style={{ height: 50 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Video Management Modal */}
      <Modal
        visible={showVideoModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleBackFromVideoModal}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalBackButton}
              onPress={handleBackFromVideoModal}
            >
              <Text style={styles.modalBackButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              Manage Videos: {selectedCourse?.courseTitle || 'Unknown Course'}
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleBackFromVideoModal}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Video Form */}
            <View style={styles.videoFormContainer}>
              <Text style={styles.sectionTitle}>
                {editingVideo ? 'Edit Video' : 'Add New Video'}
              </Text>

              {/* Video Title */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Video Title *</Text>
                <TextInput
                  style={styles.textInput}
                  value={videoForm.videoTitle}
                  onChangeText={(text) => setVideoForm({ ...videoForm, videoTitle: text })}
                  placeholder="Enter video title"
                  placeholderTextColor="#666"
                />
              </View>

              {/* Video Description */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Video Description *</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={videoForm.videoDescription}
                  onChangeText={(text) => setVideoForm({ ...videoForm, videoDescription: text })}
                  placeholder="Enter video description"
                  placeholderTextColor="#666"
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Video Link */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Video Link *</Text>
                <TextInput
                  style={styles.textInput}
                  value={videoForm.videoLink}
                  onChangeText={(text) => setVideoForm({ ...videoForm, videoLink: text })}
                  placeholder="https://youtube.com/watch?v=..."
                  placeholderTextColor="#666"
                  keyboardType="url"
                  autoCapitalize="none"
                />
              </View>

              {/* Duration */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Duration *</Text>
                <TextInput
                  style={styles.textInput}
                  value={videoForm.duration}
                  onChangeText={(text) => setVideoForm({ ...videoForm, duration: text })}
                  placeholder="e.g., 15:30, 1h 20m"
                  placeholderTextColor="#666"
                />
              </View>

              {/* Video Action Buttons */}
              <View style={styles.videoFormActions}>
                {editingVideo ? (
                  <>
                    <TouchableOpacity
                      style={[styles.videoFormButton, styles.updateButton]}
                      onPress={updateVideoInCourse}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator size="small" color={BRAND.backgroundColor} />
                      ) : (
                        <Text style={styles.videoFormButtonText}>Update Video</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.videoFormButton, styles.cancelButton]}
                      onPress={cancelVideoEdit}
                    >
                      <Text style={styles.videoFormButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    style={[styles.videoFormButton, styles.addVideoButton]}
                    onPress={addVideoToCourse}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color={BRAND.backgroundColor} />
                    ) : (
                      <Text style={styles.videoFormButtonText}>Add Video</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Existing Videos List */}
            <View style={styles.videosListContainer}>
              <Text style={styles.sectionTitle}>
                Existing Videos ({selectedCourse?.videoLinks?.length || 0})
              </Text>

              {selectedCourse?.videoLinks && selectedCourse.videoLinks.length > 0 ? (
                <FlatList
                  data={selectedCourse.videoLinks}
                  renderItem={renderVideoItem}
                  keyExtractor={(item, index) => item._id || index.toString()}
                  scrollEnabled={false}
                  ItemSeparatorComponent={() => <View style={styles.videoSeparator} />}
                />
              ) : (
                <View style={styles.noVideosContainer}>
                  <Text style={styles.noVideosText}>No videos added yet</Text>
                  <Text style={styles.noVideosSubtext}>Add your first video above</Text>
                </View>
              )}
            </View>

            {/* Bottom Spacing */}
            <View style={{ height: 50 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Loading Overlay */}
      {loading && courses.length > 0 && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={BRAND.primaryColor} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND.backgroundColor,
  },
  
  // Header Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: BRAND.accentColor,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.primaryColor,
  },
  backButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: BRAND.primaryColor,
  },
  backButtonText: {
    color: BRAND.backgroundColor,
    fontSize: 14,
    fontWeight: '600',
  },
  headerTitle: {
    color: BRAND.primaryColor,
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: BRAND.primaryColor,
  },
  addButtonText: {
    color: BRAND.backgroundColor,
    fontSize: 14,
    fontWeight: '600',
  },

  // List Styles
  listContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: BRAND.primaryColor,
    fontSize: 16,
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    color: '#666',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  createButton: {
    backgroundColor: BRAND.primaryColor,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: BRAND.backgroundColor,
    fontSize: 16,
    fontWeight: '600',
  },

  // Course Card Styles
  courseCard: {
    backgroundColor: BRAND.accentColor,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BRAND.primaryColor + '20',
  },
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  courseHeaderLeft: {
    flex: 1,
  },
  courseTitle: {
    color: BRAND.primaryColor,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  courseTutor: {
    color: '#aaa',
    fontSize: 14,
  },
  priceContainer: {
    alignItems: 'center',
    backgroundColor: BRAND.goldColor + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BRAND.goldColor,
  },
  priceText: {
    color: BRAND.goldColor,
    fontSize: 16,
    fontWeight: 'bold',
  },
  priceLabel: {
    color: BRAND.goldColor,
    fontSize: 10,
    fontWeight: '600',
  },
  courseInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  infoText: {
    color: '#ccc',
    fontSize: 12,
    marginRight: 16,
    marginBottom: 4,
  },
  courseSubtitle: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  courseActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: BRAND.primaryColor,
  },
  videoButton: {
    backgroundColor: BRAND.warningColor,
  },
  deleteButton: {
    backgroundColor: BRAND.errorColor,
  },
  actionButtonText: {
    color: BRAND.backgroundColor,
    fontSize: 12,
    fontWeight: '600',
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: BRAND.backgroundColor,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: BRAND.accentColor,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.primaryColor,
  },
  modalBackButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: BRAND.primaryColor,
  },
  modalBackButtonText: {
    color: BRAND.backgroundColor,
    fontSize: 14,
    fontWeight: '600',
  },
  modalTitle: {
    color: BRAND.primaryColor,
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: BRAND.errorColor,
  },
  closeButtonText: {
    color: BRAND.backgroundColor,
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },

  // Form Styles
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: BRAND.primaryColor,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: BRAND.accentColor,
    borderWidth: 1,
    borderColor: BRAND.primaryColor + '40',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  helperText: {
    color: BRAND.goldColor,
    fontSize: 12,
    marginTop: -8,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  categoryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  categoryButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginHorizontal: 4,
    backgroundColor: BRAND.accentColor,
    borderWidth: 1,
    borderColor: BRAND.primaryColor + '40',
    alignItems: 'center',
  },
  categoryButtonActive: {
    backgroundColor: BRAND.primaryColor,
    borderColor: BRAND.primaryColor,
  },
  categoryButtonText: {
    color: '#ccc',
    fontSize: 12,
    fontWeight: '600',
  },
  categoryButtonTextActive: {
    color: BRAND.backgroundColor,
  },
  thumbnailButton: {
    backgroundColor: BRAND.accentColor,
    borderWidth: 1,
    borderColor: BRAND.primaryColor + '40',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  thumbnailButtonText: {
    color: BRAND.primaryColor,
    fontSize: 14,
    fontWeight: '600',
  },
  thumbnailPreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginTop: 8,
  },
  statusButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  statusButtonActive: {
    backgroundColor: BRAND.primaryColor,
    borderColor: BRAND.primaryColor,
  },
  statusButtonInactive: {
    backgroundColor: BRAND.errorColor,
    borderColor: BRAND.errorColor,
  },
  statusButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusButtonTextActive: {
    color: BRAND.backgroundColor,
  },
  statusButtonTextInactive: {
    color: BRAND.backgroundColor,
  },
  saveButton: {
    backgroundColor: BRAND.primaryColor,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonDisabled: {
    backgroundColor: BRAND.primaryColor + '60',
  },
  saveButtonText: {
    color: BRAND.backgroundColor,
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Video Management Styles
  videoFormContainer: {
    backgroundColor: BRAND.accentColor,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: BRAND.primaryColor + '20',
  },
  sectionTitle: {
    color: BRAND.primaryColor,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  videoFormActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  videoFormButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  addVideoButton: {
    backgroundColor: BRAND.primaryColor,
  },
  updateButton: {
    backgroundColor: BRAND.warningColor,
  },
  cancelButton: {
    backgroundColor: BRAND.errorColor,
  },
  videoFormButtonText: {
    color: BRAND.backgroundColor,
    fontSize: 14,
    fontWeight: '600',
  },
  videosListContainer: {
    backgroundColor: BRAND.accentColor,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: BRAND.primaryColor + '20',
  },
  videoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: BRAND.backgroundColor,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BRAND.primaryColor + '20',
  },
  videoContent: {
    flex: 1,
  },
  videoTitle: {
    color: BRAND.primaryColor,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  videoDescription: {
    color: '#ccc',
    fontSize: 12,
    marginBottom: 4,
  },
  videoDuration: {
    color: '#aaa',
    fontSize: 11,
  },
  videoActions: {
    flexDirection: 'row',
    marginLeft: 12,
  },
  videoActionButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginHorizontal: 2,
  },
  videoEditButton: {
    backgroundColor: BRAND.warningColor,
  },
  videoDeleteButton: {
    backgroundColor: BRAND.errorColor,
  },
  videoActionButtonText: {
    color: BRAND.backgroundColor,
    fontSize: 10,
    fontWeight: '600',
  },
  videoSeparator: {
    height: 8,
  },
  noVideosContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noVideosText: {
    color: '#666',
    fontSize: 16,
    marginBottom: 4,
  },
  noVideosSubtext: {
    color: '#888',
    fontSize: 12,
  },

  // Loading Overlay
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});