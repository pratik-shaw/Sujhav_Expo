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
} from 'react-native';
import { API_BASE } from '../config/api';

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
  navigation?: any; // Add navigation prop
  onBack?: () => void; // Add callback for back action
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

  // Load courses on mount
  useEffect(() => {
    loadCourses();
  }, []);

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
      const data = await response.json();
      
      if (data.success) {
        setCourses(data.data || []);
      } else {
        Alert.alert('Error', 'Failed to load courses');
      }
    } catch (error) {
      console.error('Error loading courses:', error);
      Alert.alert('Error', 'Failed to load courses');
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
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(courseForm),
      });
      
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
      Alert.alert('Error', 'Failed to save course');
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
              
              const data = await response.json();
              
              if (data.success) {
                Alert.alert('Success', 'Course deleted!');
                loadCourses();
              } else {
                Alert.alert('Error', data.message || 'Failed to delete course');
              }
            } catch (error) {
              console.error('Error deleting course:', error);
              Alert.alert('Error', 'Failed to delete course');
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
      Alert.alert('Error', 'Failed to add video');
    } finally {
      setLoading(false);
    }
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
    if (!courseForm.courseThumbnail?.trim()) {
      Alert.alert('Error', 'Thumbnail URL is required');
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
      isActive: true,
    });
    setEditingCourse(null);
  };

  const editCourse = (course: Course) => {
    // Ensure all required fields are properly set
    setCourseForm({
      ...course,
      courseDetails: course.courseDetails || { subtitle: '', description: '' },
      videoLinks: course.videoLinks || [],
      rating: course.rating || 0,
      price: course.price || 0,
      isActive: course.isActive !== undefined ? course.isActive : true,
    });
    setEditingCourse(course);
    setShowAddModal(true);
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
        <Text style={styles.infoText}>Price: ₹{item.price || 0}</Text>
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

  const renderVideoItem = ({ item }: { item: VideoLink }) => (
    <View style={styles.videoItem}>
      <Text style={styles.videoTitle}>{item.videoTitle || 'Untitled Video'}</Text>
      <Text style={styles.videoDescription}>{item.videoDescription || 'No description'}</Text>
      <Text style={styles.videoDuration}>Duration: {item.duration || 'N/A'}</Text>
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
                  onChangeText={(text) => setCourseForm({ ...courseForm, rating: parseFloat(text) || 0 })}
                  placeholder="0"
                  placeholderTextColor="#666"
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>Price (₹)</Text>
                <TextInput
                  style={styles.textInput}
                  value={courseForm.price?.toString() || '0'}
                  onChangeText={(text) => setCourseForm({ ...courseForm, price: parseFloat(text) || 0 })}
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
                {['jee', 'neet', 'boards'].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryButton,
                      courseForm.category === cat && styles.categoryButtonActive,
                    ]}
                    onPress={() => setCourseForm({ ...courseForm, category: cat as any })}
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

            {/* Thumbnail URL */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Thumbnail URL *</Text>
              <TextInput
                style={styles.textInput}
                value={courseForm.courseThumbnail || ''}
                onChangeText={(text) => setCourseForm({ ...courseForm, courseThumbnail: text })}
                placeholder="Enter thumbnail URL"
                placeholderTextColor="#666"
              />
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
            {/* Add Video Form */}
            <View style={styles.videoFormContainer}>
              <Text style={styles.sectionTitle}>Add New Video</Text>
              
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
                <Text style={styles.inputLabel}>Description *</Text>
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
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Duration *</Text>
                <TextInput
                  style={styles.textInput}
                  value={videoForm.duration || ''}
                  onChangeText={(text) => setVideoForm({ ...videoForm, duration: text })}
                  placeholder="e.g., 15:30"
                  placeholderTextColor="#666"
                />
              </View>

              <TouchableOpacity
                style={styles.addVideoButton}
                onPress={addVideoToCourse}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text style={styles.addVideoButtonText}>Add Video</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Existing Videos */}
            <View style={styles.videosContainer}>
              <Text style={styles.sectionTitle}>
                Existing Videos ({selectedCourse?.videoLinks?.length || 0})
              </Text>
              
              {selectedCourse?.videoLinks && selectedCourse.videoLinks.length > 0 ? (
                <FlatList
                  data={selectedCourse.videoLinks}
                  renderItem={renderVideoItem}
                  keyExtractor={(item, index) => item._id || index.toString()}
                  scrollEnabled={false}
                />
              ) : (
                <Text style={styles.noVideosText}>No videos added yet</Text>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND.backgroundColor,
  },
  header: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingHorizontal: 16, // Reduced from 20
  paddingVertical: 12,   // Reduced from 15
  backgroundColor: BRAND.accentColor,
  borderBottomWidth: 1,
  borderBottomColor: '#333',
  minHeight: 60, // Ensure consistent height
},
  headerTitle: {
  color: '#fff',
  fontSize: 16, // Reduced from 20
  fontWeight: 'bold',
  flex: 1, // Allow it to take available space
  textAlign: 'center',
  marginHorizontal: 8, // Add margin to prevent overlap
},
 addButton: {
  backgroundColor: BRAND.primaryColor,
  paddingHorizontal: 12, // Reduced from 15
  paddingVertical: 6,    // Reduced from 8
  borderRadius: 6,       // Reduced from 8
  minWidth: 80,          // Set minimum width
  justifyContent: 'center',
  alignItems: 'center',
},

addButtonText: {
  color: '#000',
  fontWeight: 'bold',
  fontSize: 12, // Reduced from default
},
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
  },
  listContainer: {
    padding: 20,
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
    fontWeight: 'bold',
  },
  courseCard: {
    backgroundColor: BRAND.accentColor,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  courseHeader: {
    marginBottom: 10,
  },
  courseTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  courseTutor: {
    color: BRAND.primaryColor,
    fontSize: 14,
  },
  courseInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  infoText: {
    color: '#ccc',
    fontSize: 12,
    marginRight: 15,
    marginBottom: 5,
  },
  courseSubtitle: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 15,
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
    marginHorizontal: 2,
  },
  editButton: {
    backgroundColor: BRAND.primaryColor,
  },
  videoButton: {
    backgroundColor: '#007BFF',
  },
  deleteButton: {
    backgroundColor: BRAND.errorColor,
  },
  actionButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 12,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: BRAND.backgroundColor,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: BRAND.accentColor,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 20,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: BRAND.accentColor,
    color: '#fff',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
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
    flex: 1,
    marginRight: 10,
  },
  categoryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  categoryButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    backgroundColor: BRAND.accentColor,
    borderWidth: 1,
    borderColor: '#333',
    marginHorizontal: 5,
  },
  categoryButtonActive: {
    backgroundColor: BRAND.primaryColor,
    borderColor: BRAND.primaryColor,
  },
  categoryButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  categoryButtonTextActive: {
    color: '#000',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switch: {
    width: 50,
    height: 25,
    borderRadius: 12.5,
    backgroundColor: '#333',
    marginLeft: 10,
    marginRight: 10,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  switchActive: {
    backgroundColor: BRAND.primaryColor,
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#666',
    alignSelf: 'flex-start',
  },
  switchThumbActive: {
    backgroundColor: '#000',
    alignSelf: 'flex-end',
  },
  switchText: {
    color: '#fff',
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: BRAND.primaryColor,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  videoFormContainer: {
    marginBottom: 30,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  addVideoButton: {
    backgroundColor: BRAND.primaryColor,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  addVideoButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  videosContainer: {
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 20,
  },
  videoItem: {
    backgroundColor: BRAND.accentColor,
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  videoTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  videoDescription: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 5,
  },
  videoDuration: {
    color: BRAND.primaryColor,
    fontSize: 12,
    fontWeight: 'bold',
  },
  noVideosText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 20,
  },
  backButton: {
  paddingVertical: 8,
  paddingHorizontal: 8, // Reduced padding
  minWidth: 60, // Set minimum width
  justifyContent: 'center',
},

backButtonText: {
  color: '#fff',
  fontSize: 14, // Reduced from 16
  fontWeight: '500',
},
  // Add these missing styles to your existing stylesheet
modalBackButton: {
  padding: 8,
  paddingHorizontal: 12,
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
  borderRadius: 6,
},
modalBackButtonText: {
  color: '#fff',
  fontSize: 16,
  fontWeight: '500',
},
});

