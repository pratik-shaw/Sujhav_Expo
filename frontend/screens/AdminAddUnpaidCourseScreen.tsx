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
};

// Mock API configuration (replace with your actual API)
const API_BASE_URL = API_BASE;

// Types
interface Course {
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
  isActive: boolean;
  studentsEnrolled?: any[];
  createdAt?: string;
}

interface VideoLink {
  _id?: string;
  videoTitle: string;
  videoDescription: string;
  videoLink: string;
  duration: string;
}

interface AdminUnpaidCourseScreenProps {
  navigation?: any;
  onBack?: () => void;
}

export default function AdminUnpaidCourseScreen({ 
  navigation, 
  onBack 
}: AdminUnpaidCourseScreenProps) {
  // State
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  // Form state
  const [courseForm, setCourseForm] = useState<Course>({
    courseTitle: '',
    tutor: '',
    rating: 0,
    price: 0,
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

  // Image picker function - FIXED
  const pickImage = async () => {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], // Fixed: Use string literal
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
      const response = await fetch(`${API_BASE_URL}/unpaidCourses`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setCourses(data.data || []);
      } else {
        Alert.alert('Error', data.message || 'Failed to load courses');
      }
    } catch (error) {
      console.error('Error loading courses:', error);
      Alert.alert('Error', 'Failed to load courses. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const saveCourse = async () => {
    try {
      if (!validateCourse()) return;
      
      setLoading(true);
      const url = editingCourse 
        ? `${API_BASE_URL}/unpaidCourses/${editingCourse._id}`
        : `${API_BASE_URL}/unpaidCourses`;
      
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
      
      // Add thumbnail if selected - FIXED
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
        Alert.alert('Success', editingCourse ? 'Course updated!' : 'Course created!');
        resetForm();
        setShowAddModal(false);
        loadCourses();
      } else {
        Alert.alert('Error', data.message || 'Failed to save course');
      }
    } catch (error) {
      console.error('Error saving course:', error);
      Alert.alert('Error', 'Failed to save course. Please check your internet connection.');
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
      'Delete Course',
      'Are you sure you want to delete this course?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const response = await fetch(`${API_BASE_URL}/unpaidCourses/${courseId}`, {
                method: 'DELETE',
              });
              
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              
              const data = await response.json();
              
              if (data.success) {
                Alert.alert('Success', 'Course deleted!');
                loadCourses();
              } else {
                Alert.alert('Error', data.message || 'Failed to delete course');
              }
            } catch (error) {
              console.error('Error deleting course:', error);
              Alert.alert('Error', 'Failed to delete course. Please check your internet connection.');
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
      const response = await fetch(`${API_BASE_URL}/unpaidCourses/${selectedCourse._id}/videos`, {
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
        Alert.alert('Success', 'Video added!');
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
      const response = await fetch(`${API_BASE_URL}/unpaidCourses/${selectedCourse._id}/videos/${editingVideo._id}`, {
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
        Alert.alert('Success', 'Video updated!');
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
      'Are you sure you want to delete this video?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const response = await fetch(`${API_BASE_URL}/unpaidCourses/${selectedCourse._id}/videos/${videoId}`, {
                method: 'DELETE',
              });
              
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              
              const data = await response.json();
              
              if (data.success) {
                Alert.alert('Success', 'Video deleted!');
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
    // Price validation - allow 0 or any positive number
    if (courseForm.price < 0) {
      Alert.alert('Error', 'Price cannot be negative');
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
      price: 0,
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
    });
    setEditingCourse(null);
  };

  const editCourse = (course: Course) => {
    setCourseForm({
      ...course,
      courseDetails: course.courseDetails || { subtitle: '', description: '' },
      videoLinks: course.videoLinks || [],
      rating: course.rating || 0,
      price: course.price || 0,
      isActive: course.isActive !== undefined ? course.isActive : true,
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

  const manageVideos = (course: Course) => {
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

  // Render functions
  const renderCourseItem = ({ item }: { item: Course }) => (
    <View style={styles.courseCard}>
      <View style={styles.courseHeader}>
        <Text style={styles.courseTitle}>{item.courseTitle || 'Untitled Course'}</Text>
        <Text style={styles.courseTutor}>by {item.tutor || 'Unknown'}</Text>
      </View>
      
      <View style={styles.courseInfo}>
        <Text style={styles.infoText}>Category: {item.category ? item.category.toUpperCase() : 'N/A'}</Text>
        <Text style={styles.infoText}>Class: {item.class || 'N/A'}</Text>
        <Text style={styles.infoText}>Rating: ⭐ {item.rating || 0}</Text>
        <Text style={styles.infoText}>
          Price: {item.price === 0 ? 'Free' : `₹${item.price}`}
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
        
        <Text style={styles.headerTitle}>Free Courses Admin</Text>
        
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
          <Text style={styles.loadingText}>Loading courses...</Text>
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
              <Text style={styles.emptyText}>No courses found</Text>
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => setShowAddModal(true)}
              >
                <Text style={styles.createButtonText}>Create Your First Course</Text>
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
              {editingCourse ? 'Edit Course' : 'Add New Course'}
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
                <Text style={styles.inputLabel}>Price (₹) - 0 for Free</Text>
                <TextInput
                  style={styles.textInput}
                  value={courseForm.price?.toString() || '0'}
                  onChangeText={(text) => {
                    const price = parseFloat(text) || 0;
                    setCourseForm({ ...courseForm, price: Math.max(price, 0) });
                  }}
                  placeholder="0"
                  placeholderTextColor="#666"
                  keyboardType="numeric"
                />
              </View>
            </View>

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
                placeholder="Enter course description"
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
                <View style={styles.thumbnailPreview}>
                  <Image
                    source={{ uri: courseForm.thumbnailUri || courseForm.courseThumbnail }}
                    style={styles.thumbnailImage}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={styles.removeThumbnailButton}
                    onPress={() => setCourseForm({ ...courseForm, thumbnailUri: '', courseThumbnail: '' })}
                  >
                    <Text style={styles.removeThumbnailButtonText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Active Status */}
            <View style={styles.inputGroup}>
              <TouchableOpacity
                style={styles.switchContainer}
                onPress={() => setCourseForm({ ...courseForm, isActive: !courseForm.isActive })}
              >
                <Text style={styles.inputLabel}>Active Status</Text>
                <View style={[styles.switch, courseForm.isActive && styles.switchActive]}>
                  <View style={[styles.switchThumb, courseForm.isActive && styles.switchThumbActive]} />
                </View>
                <Text style={styles.switchText}>
                  {courseForm.isActive ? 'Active' : 'Inactive'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={saveCourse}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {editingCourse ? 'Update Course' : 'Create Course'}
                </Text>
              )}
            </TouchableOpacity>
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
              Manage Videos - {selectedCourse?.courseTitle || 'Unknown Course'}
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleBackFromVideoModal}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Add/Edit Video Form */}
            <View style={styles.videoFormContainer}>
              <Text style={styles.sectionTitle}>
                {editingVideo ? 'Edit Video' : 'Add New Video'}
              </Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Video Title *</Text>
                <TextInput
                  style={styles.textInput}
                  value={videoForm.videoTitle || ''}
                  onChangeText={(text) => setVideoForm({ ...videoForm, videoTitle: text })}
                  placeholder="Enter video title"
                  placeholderTextColor="#666"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Video Description *</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={videoForm.videoDescription || ''}
                  onChangeText={(text) => setVideoForm({ ...videoForm, videoDescription: text })}
                  placeholder="Enter video description"
                  placeholderTextColor="#666"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Video Link *</Text>
                <TextInput
                  style={styles.textInput}
                  value={videoForm.videoLink || ''}
                  onChangeText={(text) => setVideoForm({ ...videoForm, videoLink: text })}
                  placeholder="Enter video URL"
                  placeholderTextColor="#666"
                  keyboardType="url"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Duration *</Text>
                <TextInput
                  style={styles.textInput}
                  value={videoForm.duration || ''}
                  onChangeText={(text) => setVideoForm({ ...videoForm, duration: text })}
                  placeholder="e.g., 10:30"
                  placeholderTextColor="#666"
                />
              </View>

              <View style={styles.videoFormButtons}>
                <TouchableOpacity
                  style={[styles.videoFormButton, styles.videoSubmitButton, loading && styles.videoFormButtonDisabled]}
                  onPress={editingVideo ? updateVideoInCourse : addVideoToCourse}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <Text style={styles.videoFormButtonText}>
                      {editingVideo ? 'Update Video' : 'Add Video'}
                    </Text>
                  )}
                </TouchableOpacity>

                {editingVideo && (
                  <TouchableOpacity
                    style={[styles.videoFormButton, styles.videoCancelButton]}
                    onPress={cancelVideoEdit}
                  >
                    <Text style={styles.videoFormButtonText}>Cancel</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Video List */}
            <View style={styles.videoListContainer}>
              <Text style={styles.sectionTitle}>
                Videos ({selectedCourse?.videoLinks?.length || 0})
              </Text>
              
              {selectedCourse?.videoLinks && selectedCourse.videoLinks.length > 0 ? (
                <FlatList
                  data={selectedCourse.videoLinks}
                  renderItem={renderVideoItem}
                  keyExtractor={(item, index) => item._id || index.toString()}
                  scrollEnabled={false}
                />
              ) : (
                <View style={styles.emptyVideoContainer}>
                  <Text style={styles.emptyVideoText}>No videos added yet</Text>
                </View>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND.backgroundColor,
  },
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
    padding: 8,
  },
  backButtonText: {
    color: BRAND.primaryColor,
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: BRAND.primaryColor,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  listContainer: {
    padding: 16,
  },
  courseCard: {
    backgroundColor: BRAND.accentColor,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BRAND.primaryColor,
  },
  courseHeader: {
    marginBottom: 12,
  },
  courseTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  courseTutor: {
    color: BRAND.primaryColor,
    fontSize: 14,
    fontWeight: '500',
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
  },
  actionButtonText: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#aaa',
    fontSize: 16,
    marginBottom: 20,
  },
  createButton: {
    backgroundColor: BRAND.primaryColor,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
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
    padding: 8,
  },
  modalBackButtonText: {
    color: BRAND.primaryColor,
    fontSize: 16,
    fontWeight: '600',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    color: BRAND.errorColor,
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: BRAND.accentColor,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  categoryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  categoryButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    marginHorizontal: 4,
    alignItems: 'center',
  },
  categoryButtonActive: {
    backgroundColor: BRAND.primaryColor,
    borderColor: BRAND.primaryColor,
  },
  categoryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  categoryButtonTextActive: {
    color: '#000',
  },
  thumbnailButton: {
    backgroundColor: BRAND.accentColor,
    borderWidth: 1,
    borderColor: BRAND.primaryColor,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  thumbnailButtonText: {
    color: BRAND.primaryColor,
    fontSize: 16,
    fontWeight: '600',
  },
  thumbnailPreview: {
    marginTop: 12,
    alignItems: 'center',
  },
  thumbnailImage: {
    width: 200,
    height: 120,
    borderRadius: 8,
    marginBottom: 8,
  },
  removeThumbnailButton: {
    backgroundColor: BRAND.errorColor,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  removeThumbnailButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switch: {
    width: 50,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#333',
    marginHorizontal: 12,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  switchActive: {
    backgroundColor: BRAND.primaryColor,
  },
  switchThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
  },
  switchThumbActive: {
    alignSelf: 'flex-end',
  },
  switchText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: BRAND.primaryColor,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  videoFormContainer: {
    backgroundColor: BRAND.accentColor,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: BRAND.primaryColor,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  videoFormButtons: {
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
  videoFormButtonDisabled: {
    opacity: 0.5,
  },
  videoFormButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  videoSubmitButton: {
    backgroundColor: BRAND.primaryColor,
  },
  videoCancelButton: {
    backgroundColor: BRAND.errorColor,
  },
  videoListContainer: {
    marginTop: 20,
  },
  videoItem: {
    backgroundColor: BRAND.accentColor,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  videoContent: {
    marginBottom: 12,
  },
  videoTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  videoDescription: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 4,
  },
  videoDuration: {
    color: BRAND.primaryColor,
    fontSize: 12,
    fontWeight: '500',
  },
  videoActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  videoActionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  videoActionButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  videoEditButton: {
    backgroundColor: BRAND.primaryColor,
  },
  videoDeleteButton: {
    backgroundColor: BRAND.errorColor,
  },
  emptyVideoContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyVideoText: {
    color: '#aaa',
    fontSize: 16,
  },
});

