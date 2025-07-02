import React, { useState, useEffect, useRef } from 'react';
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
  Animated,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { RootStackParamList } from '../App';
import { API_BASE_URL} from '../config/api';

type AdminUnpaidCourseNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width, height } = Dimensions.get('window');

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

// Base API URL - Replace with your actual backend URL
const API = API_BASE_URL;

interface VideoLecture {
  _id?: string;
  title: string;
  description: string;
  youtubeUrl: string;
  duration: string;
  order: number;
}

interface UnpaidCourse {
  _id?: string;
  courseTitle: string;
  tutor: string;
  rating: number;
  categoryTab: 'jee' | 'neet' | 'boards';
  class: string;
  about: {
    mode: 'online' | 'offline' | 'hybrid';
    schedule: string;
  };
  details: {
    subtitle: string;
    description: string;
  };
  videoLectures: VideoLecture[];
  isActive: boolean;
  studentsEnrolled?: string[];
  createdAt?: string;
  updatedAt?: string;
}

interface ApiResponse<T> {
  message: string;
  course?: T;
  courses?: T[];
  pagination?: any;
}

export default function AdminAddUnpaidCourseScreen() {
  const navigation = useNavigation<AdminUnpaidCourseNavigationProp>();
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  
  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [courses, setCourses] = useState<UnpaidCourse[]>([]);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showCourseDetailsModal, setShowCourseDetailsModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<UnpaidCourse | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<UnpaidCourse | null>(null);
  const [currentCourseVideos, setCurrentCourseVideos] = useState<VideoLecture[]>([]);
  
  // Form state
  const [formData, setFormData] = useState<UnpaidCourse>({
    courseTitle: '',
    tutor: '',
    rating: 0,
    categoryTab: 'jee',
    class: '',
    about: {
      mode: 'online',
      schedule: '',
    },
    details: {
      subtitle: '',
      description: '',
    },
    videoLectures: [],
    isActive: true,
  });

  // Video lecture form state
  const [videoForm, setVideoForm] = useState<VideoLecture>({
    title: '',
    description: '',
    youtubeUrl: '',
    duration: '',
    order: 0,
  });

  const [editingVideo, setEditingVideo] = useState<VideoLecture | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      checkAdminAccess();
      fetchCourses();
      startEntranceAnimation();
    }, [])
  );

  const startEntranceAnimation = () => {
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
    ]).start();
  };

  const checkAdminAccess = async () => {
    try {
      const userRole = await AsyncStorage.getItem('userRole');
      if (userRole !== 'admin') {
        Alert.alert(
          'Access Denied',
          'You do not have permission to access this screen.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      console.error('Error checking admin access:', error);
      navigation.goBack();
    }
  };

  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        return {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        };
      } else {
        return {
          'Content-Type': 'application/json',
        };
      }
    } catch (error) {
      console.error('Error getting auth headers:', error);
      return {
        'Content-Type': 'application/json',
      };
    }
  };

  const fetchCourses = async () => {
    try {
      setIsLoading(true);
      const headers = await getAuthHeaders();
      
      const response = await fetch(`${API}/unpaidCourses`, {
        method: 'GET',
        headers,
      });

      if (response.ok) {
        const data: ApiResponse<UnpaidCourse> = await response.json();
        setCourses(data.courses || []);
      } else {
        throw new Error('Failed to fetch courses');
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      Alert.alert('Error', 'Failed to fetch courses. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof UnpaidCourse] as any,
          [child]: value,
        },
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const validateForm = (): boolean => {
    const requiredFields = [
      'courseTitle',
      'tutor',
      'class',
      'about.schedule',
      'details.subtitle',
      'details.description',
    ];

    for (const field of requiredFields) {
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        if (!(formData[parent as keyof UnpaidCourse] as any)?.[child]) {
          Alert.alert('Validation Error', `${field} is required`);
          return false;
        }
      } else {
        if (!formData[field as keyof UnpaidCourse]) {
          Alert.alert('Validation Error', `${field} is required`);
          return false;
        }
      }
    }

    if (formData.rating < 0 || formData.rating > 5) {
      Alert.alert('Validation Error', 'Rating must be between 0 and 5');
      return false;
    }

    return true;
  };

  const handleCreateCourse = async () => {
    if (!validateForm()) return;

    try {
      setIsLoading(true);
      const headers = await getAuthHeaders();

      // Don't include video lectures in the initial course creation
      const courseData = {
        ...formData,
        videoLectures: [], // Videos will be added separately
      };

      const response = await fetch(`${API}/unpaidCourses`, {
        method: 'POST',
        headers,
        body: JSON.stringify(courseData),
      });

      if (response.ok) {
        const data: ApiResponse<UnpaidCourse> = await response.json();
        Alert.alert('Success', 'Course created successfully!');
        resetForm();
        setShowCourseModal(false);
        fetchCourses();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create course');
      }
    } catch (error: any) {
      console.error('Error creating course:', error);
      Alert.alert('Error', error.message || 'Failed to create course');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateCourse = async () => {
    if (!validateForm() || !editingCourse?._id) return;

    try {
      setIsLoading(true);
      const headers = await getAuthHeaders();

      const response = await fetch(`${API}/unpaidCourses/${editingCourse._id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data: ApiResponse<UnpaidCourse> = await response.json();
        Alert.alert('Success', 'Course updated successfully!');
        resetForm();
        setEditingCourse(null);
        setShowCourseModal(false);
        fetchCourses();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update course');
      }
    } catch (error: any) {
      console.error('Error updating course:', error);
      Alert.alert('Error', error.message || 'Failed to update course');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    Alert.alert(
      'Delete Course',
      'Are you sure you want to delete this course? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              const headers = await getAuthHeaders();

              const response = await fetch(`${API}/unpaidCourses/${courseId}`, {
                method: 'DELETE',
                headers,
              });

              if (response.ok) {
                Alert.alert('Success', 'Course deleted successfully!');
                fetchCourses();
              } else {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to delete course');
              }
            } catch (error: any) {
              console.error('Error deleting course:', error);
              Alert.alert('Error', error.message || 'Failed to delete course');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleEditCourse = (course: UnpaidCourse) => {
    setFormData(course);
    setEditingCourse(course);
    setShowCourseModal(true);
  };

  const handleViewCourseDetails = (course: UnpaidCourse) => {
    setSelectedCourse(course);
    setShowCourseDetailsModal(true);
  };

  const resetForm = () => {
    setFormData({
      courseTitle: '',
      tutor: '',
      rating: 0,
      categoryTab: 'jee',
      class: '',
      about: {
        mode: 'online',
        schedule: '',
      },
      details: {
        subtitle: '',
        description: '',
      },
      videoLectures: [],
      isActive: true,
    });
    setEditingCourse(null);
  };

  const handleManageVideos = (course: UnpaidCourse) => {
    setSelectedCourse(course);
    setCurrentCourseVideos(course.videoLectures || []);
    setShowVideoModal(true);
  };

  const handleAddVideo = async () => {
    if (!videoForm.title || !videoForm.description || !videoForm.youtubeUrl) {
      Alert.alert('Validation Error', 'Please fill all required video fields');
      return;
    }

    // YouTube URL validation
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]{11}$/;
    if (!youtubeRegex.test(videoForm.youtubeUrl)) {
      Alert.alert('Validation Error', 'Please provide a valid YouTube URL');
      return;
    }

    if (editingVideo) {
      // Update existing video
      const updatedVideos = currentCourseVideos.map(video =>
        video._id === editingVideo._id ? { ...videoForm, _id: editingVideo._id } : video
      );
      setCurrentCourseVideos(updatedVideos);
      setEditingVideo(null);
    } else {
      // Add new video
      const newVideo: VideoLecture = {
        ...videoForm,
        order: currentCourseVideos.length,
        _id: Date.now().toString(), // Temporary ID for new videos
      };
      setCurrentCourseVideos([...currentCourseVideos, newVideo]);
    }

    // Reset video form
    setVideoForm({
      title: '',
      description: '',
      youtubeUrl: '',
      duration: '',
      order: 0,
    });
  };

  const handleEditVideo = (video: VideoLecture) => {
    setVideoForm(video);
    setEditingVideo(video);
  };

  const handleDeleteVideo = (videoId: string) => {
    Alert.alert(
      'Delete Video',
      'Are you sure you want to delete this video?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updatedVideos = currentCourseVideos.filter(video => video._id !== videoId);
            setCurrentCourseVideos(updatedVideos);
          },
        },
      ]
    );
  };

  const handleSaveVideos = async () => {
    if (!selectedCourse?._id) return;

    try {
      setIsLoading(true);
      const headers = await getAuthHeaders();

      const response = await fetch(`${API}/unpaidCourses/${selectedCourse._id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          ...selectedCourse,
          videoLectures: currentCourseVideos,
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Video lectures updated successfully!');
        setShowVideoModal(false);
        fetchCourses();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update video lectures');
      }
    } catch (error: any) {
      console.error('Error updating video lectures:', error);
      Alert.alert('Error', error.message || 'Failed to update video lectures');
    } finally {
      setIsLoading(false);
    }
  };

  const renderCourseItem = ({ item }: { item: UnpaidCourse }) => (
    <Animated.View style={[styles.courseCard, { opacity: fadeAnim }]}>
      <TouchableOpacity 
        style={styles.courseContent}
        onPress={() => handleViewCourseDetails(item)}
        activeOpacity={0.7}
      >
        <View style={styles.courseHeader}>
          <View style={styles.courseInfo}>
            <Text style={styles.courseTitle}>{item.courseTitle}</Text>
            <Text style={styles.courseTutor}>by {item.tutor}</Text>
            <View style={styles.courseMetadata}>
              <Text style={styles.courseCategory}>{item.categoryTab.toUpperCase()}</Text>
              <Text style={styles.courseClass}>Class {item.class}</Text>
              <Text style={styles.courseRating}>★ {item.rating}</Text>
            </View>
          </View>
        </View>
        <Text style={styles.courseSubtitle} numberOfLines={2}>{item.details.subtitle}</Text>
        <View style={styles.courseStats}>
          <Text style={styles.statText}>
            {item.studentsEnrolled?.length || 0} Students
          </Text>
          <Text style={styles.statText}>
            {item.videoLectures?.length || 0} Videos
          </Text>
          <Text style={[styles.statText, { color: item.isActive ? BRAND.primaryColor : BRAND.errorColor }]}>
            {item.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </TouchableOpacity>
      
      <View style={styles.courseActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => handleEditCourse(item)}
        >
          <MaterialIcons name="edit" size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.videoButton]}
          onPress={() => handleManageVideos(item)}
        >
          <MaterialIcons name="video-library" size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteCourse(item._id!)}
        >
          <MaterialIcons name="delete" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const renderVideoItem = ({ item, index }: { item: VideoLecture; index: number }) => (
    <View style={styles.videoItem}>
      <View style={styles.videoInfo}>
        <Text style={styles.videoTitle}>{item.title}</Text>
        <Text style={styles.videoDescription} numberOfLines={2}>{item.description}</Text>
        <Text style={styles.videoDuration}>{item.duration || 'No duration'}</Text>
      </View>
      <View style={styles.videoActions}>
        <TouchableOpacity
          style={[styles.videoActionButton, styles.editVideoButton]}
          onPress={() => handleEditVideo(item)}
        >
          <MaterialIcons name="edit" size={16} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.videoActionButton, styles.deleteVideoButton]}
          onPress={() => handleDeleteVideo(item._id || index.toString())}
        >
          <MaterialIcons name="delete" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND.backgroundColor} />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Free Courses</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowCourseModal(true)}
        >
          <MaterialIcons name="add" size={24} color={BRAND.primaryColor} />
        </TouchableOpacity>
      </View>

      {isLoading && courses.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BRAND.primaryColor} />
          <Text style={styles.loadingText}>Loading courses...</Text>
        </View>
      ) : (
        <FlatList
          data={courses}
          renderItem={renderCourseItem}
          keyExtractor={(item) => item._id || Math.random().toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshing={isLoading}
          onRefresh={fetchCourses}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="school" size={64} color="#666" />
              <Text style={styles.emptyText}>No courses found</Text>
              <TouchableOpacity
                style={styles.createFirstButton}
                onPress={() => setShowCourseModal(true)}
              >
                <Text style={styles.createFirstButtonText}>Create Your First Course</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Course Creation/Edit Modal */}
      <Modal
        visible={showCourseModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          resetForm();
          setShowCourseModal(false);
        }}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => {
                resetForm();
                setShowCourseModal(false);
              }}
            >
              <MaterialIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingCourse ? 'Edit Course' : 'Create New Course'}
            </Text>
            <View style={styles.headerPlaceholder} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <Animated.View
              style={[
                styles.formContent,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              {/* Course Title */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Course Title *</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.courseTitle}
                  onChangeText={(value) => handleInputChange('courseTitle', value)}
                  placeholder="Enter course title"
                  placeholderTextColor="#666"
                  maxLength={200}
                />
              </View>

              {/* Tutor */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tutor Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.tutor}
                  onChangeText={(value) => handleInputChange('tutor', value)}
                  placeholder="Enter tutor name"
                  placeholderTextColor="#666"
                  maxLength={100}
                />
              </View>

              {/* Rating and Class Row */}
              <View style={styles.rowContainer}>
                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.inputLabel}>Rating</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.rating.toString()}
                    onChangeText={(value) => handleInputChange('rating', parseFloat(value) || 0)}
                    placeholder="0-5"
                    placeholderTextColor="#666"
                    keyboardType="numeric"
                  />
                </View>

                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.inputLabel}>Class *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.class}
                    onChangeText={(value) => handleInputChange('class', value)}
                    placeholder="e.g., 11, 12"
                    placeholderTextColor="#666"
                  />
                </View>
              </View>

              {/* Category */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Category *</Text>
                <View style={styles.categoryContainer}>
                  {(['jee', 'neet', 'boards'] as const).map((category) => (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.categoryButton,
                        formData.categoryTab === category && styles.categoryButtonActive,
                      ]}
                      onPress={() => handleInputChange('categoryTab', category)}
                    >
                      <Text
                        style={[
                          styles.categoryButtonText,
                          formData.categoryTab === category && styles.categoryButtonTextActive,
                        ]}
                      >
                        {category.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Mode */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Mode *</Text>
                <View style={styles.categoryContainer}>
                  {(['online', 'offline', 'hybrid'] as const).map((mode) => (
                    <TouchableOpacity
                      key={mode}
                      style={[
                        styles.categoryButton,
                        formData.about.mode === mode && styles.categoryButtonActive,
                      ]}
                      onPress={() => handleInputChange('about.mode', mode)}
                    >
                      <Text
                        style={[
                          styles.categoryButtonText,
                          formData.about.mode === mode && styles.categoryButtonTextActive,
                        ]}
                      >
                        {mode.charAt(0).toUpperCase() + mode.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Schedule */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Schedule *</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={formData.about.schedule}
                  onChangeText={(value) => handleInputChange('about.schedule', value)}
                  placeholder="Enter course schedule"
                  placeholderTextColor="#666"
                  multiline
                  numberOfLines={3}
                  maxLength={500}
                />
              </View>

              {/* Subtitle */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Subtitle *</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.details.subtitle}
                  onChangeText={(value) => handleInputChange('details.subtitle', value)}
                  placeholder="Enter course subtitle"
                  placeholderTextColor="#666"
                  maxLength={300}
                />
              </View>

              {/* Description */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description *</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={formData.details.description}
                  onChangeText={(value) => handleInputChange('details.description', value)}
                  placeholder="Enter course description"
                  placeholderTextColor="#666"
                  multiline
                  numberOfLines={4}
                  maxLength={2000}
                />
              </View>

              {/* Active Status */}
              <View style={styles.inputGroup}>
                <TouchableOpacity
                  style={styles.statusContainer}
                  onPress={() => handleInputChange('isActive', !formData.isActive)}
                >
                  <Text style={styles.inputLabel}>Active Status</Text>
                  <View style={styles.switchContainer}>
                    <View
                      style={[
                        styles.switch,
                        formData.isActive && styles.switchActive,
                      ]}
                    >
                      <View
                        style={[
                          styles.switchThumb,
                          formData.isActive && styles.switchThumbActive,
                        ]}
                      />
                    </View>
                    <Text style={styles.switchText}>
                      {formData.isActive ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                onPress={editingCourse ? handleUpdateCourse : handleCreateCourse}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {editingCourse ? 'Update Course' : 'Create Course'}
                  </Text>
                )}
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Course Details Modal */}
      <Modal
        visible={showCourseDetailsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCourseDetailsModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowCourseDetailsModal(false)}
            >
              <MaterialIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Course Overview</Text>
            <TouchableOpacity
              style={styles.manageVideosButton}
              onPress={() => {
                setShowCourseDetailsModal(false);
                handleManageVideos(selectedCourse!);
              }}
            >
              <MaterialIcons name="video-library" size={20} color={BRAND.primaryColor} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedCourse && (
              <View style={styles.courseDetailsContent}>
                <Text style={styles.courseDetailsTitle}>{selectedCourse.courseTitle}</Text>
                <Text style={styles.courseDetailsTutor}>by {selectedCourse.tutor}</Text>
                
                <View style={styles.courseDetailsMetadata}>
                  <View style={styles.metadataItem}>
                    <Text style={styles.metadataLabel}>Category</Text>
                    <Text style={styles.metadataValue}>{selectedCourse.categoryTab.toUpperCase()}</Text>
                  </View>
                  <View style={styles.metadataItem}>
                    <Text style={styles.metadataLabel}>Class</Text>
                    <Text style={styles.metadataValue}>{selectedCourse.class}</Text>
                  </View>
                  <View style={styles.metadataItem}>
                    <Text style={styles.metadataLabel}>Rating</Text>
                    <Text style={styles.metadataValue}>★ {selectedCourse.rating}</Text>
                  </View>
                  <View style={styles.metadataItem}>
                    <Text style={styles.metadataLabel}>Mode</Text>
                    <Text style={styles.metadataValue}>{selectedCourse.about.mode}</Text>
                  </View>
                  <View style={styles.metadataItem}>
                    <Text style={styles.metadataLabel}>Status</Text>
                    <Text style={[styles.metadataValue, { color: selectedCourse.isActive ? BRAND.primaryColor : BRAND.errorColor }]}>
                      {selectedCourse.isActive ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                  <View style={styles.metadataItem}>
                    <Text style={styles.metadataLabel}>Students Enrolled</Text>
                    <Text style={styles.metadataValue}>{selectedCourse.studentsEnrolled?.length || 0}</Text>
                  </View>
                </View>

                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionTitle}>Subtitle</Text>
                  <Text style={styles.sectionContent}>{selectedCourse.details.subtitle}</Text>
                </View>

                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionTitle}>Description</Text>
                  <Text style={styles.sectionContent}>{selectedCourse.details.description}</Text>
                </View>

                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionTitle}>Schedule</Text>
                  <Text style={styles.sectionContent}>{selectedCourse.about.schedule}</Text>
                </View>

                <View style={styles.sectionContainer}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Video Lectures ({selectedCourse.videoLectures?.length || 0})</Text>
                    <TouchableOpacity
                      style={styles.addVideoButton}
                      onPress={() => {
                        setShowCourseDetailsModal(false);
                        handleManageVideos(selectedCourse);
                      }}
                    >
                      <MaterialIcons name="add" size={20} color={BRAND.primaryColor} />
                      <Text style={styles.addVideoButtonText}>Add Videos</Text>
                    </TouchableOpacity>
                  </View>
                  
                  {selectedCourse.videoLectures && selectedCourse.videoLectures.length > 0 ? (
                    <View style={styles.videosList}>
                      {selectedCourse.videoLectures.map((video, index) => (
                        <View key={video._id || index} style={styles.videoPreviewItem}>
                          <View style={styles.videoPreviewInfo}>
                            <Text style={styles.videoPreviewTitle}>{video.title}</Text>
                            <Text style={styles.videoPreviewDescription} numberOfLines={2}>
                              {video.description}
                            </Text>
                            <Text style={styles.videoPreviewDuration}>
                              Duration: {video.duration || 'Not specified'}
                            </Text>
                          </View>
                          <View style={styles.videoPreviewOrder}>
                            <Text style={styles.videoOrderText}>#{video.order + 1}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <View style={styles.noVideosContainer}>
                      <MaterialIcons name="video-library" size={48} color="#666" />
                      <Text style={styles.noVideosText}>No video lectures added yet</Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Video Management Modal */}
      <Modal
        visible={showVideoModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowVideoModal(false);
          setCurrentCourseVideos([]);
          setVideoForm({
            title: '',
            description: '',
            youtubeUrl: '',
            duration: '',
            order: 0,
          });
          setEditingVideo(null);
        }}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => {
                setShowVideoModal(false);
                setCurrentCourseVideos([]);
                setVideoForm({
                  title: '',
                  description: '',
                  youtubeUrl: '',
                  duration: '',
                  order: 0,
                });
                setEditingVideo(null);
              }}
            >
              <MaterialIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              Manage Videos - {selectedCourse?.courseTitle}
            </Text>
            <TouchableOpacity
              style={styles.saveVideosButton}
              onPress={handleSaveVideos}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={BRAND.primaryColor} />
              ) : (
                <Text style={styles.saveVideosButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Video Form */}
            <View style={styles.videoFormContainer}>
              <Text style={styles.formSectionTitle}>
                {editingVideo ? 'Edit Video Lecture' : 'Add New Video Lecture'}
              </Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Video Title *</Text>
                <TextInput
                  style={styles.textInput}
                  value={videoForm.title}
                  onChangeText={(value) => setVideoForm(prev => ({ ...prev, title: value }))}
                  placeholder="Enter video title"
                  placeholderTextColor="#666"
                  maxLength={200}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description *</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={videoForm.description}
                  onChangeText={(value) => setVideoForm(prev => ({ ...prev, description: value }))}
                  placeholder="Enter video description"
                  placeholderTextColor="#666"
                  multiline
                  numberOfLines={3}
                  maxLength={500}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>YouTube URL *</Text>
                <TextInput
                  style={styles.textInput}
                  value={videoForm.youtubeUrl}
                  onChangeText={(value) => setVideoForm(prev => ({ ...prev, youtubeUrl: value }))}
                  placeholder="https://www.youtube.com/watch?v=..."
                  placeholderTextColor="#666"
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Duration (optional)</Text>
                <TextInput
                  style={styles.textInput}
                  value={videoForm.duration}
                  onChangeText={(value) => setVideoForm(prev => ({ ...prev, duration: value }))}
                  placeholder="e.g., 15:30"
                  placeholderTextColor="#666"
                />
              </View>

              <TouchableOpacity
                style={styles.addVideoSubmitButton}
                onPress={handleAddVideo}
              >
                <MaterialIcons 
                  name={editingVideo ? "update" : "add"} 
                  size={20} 
                  color="#fff" 
                />
                <Text style={styles.addVideoSubmitButtonText}>
                  {editingVideo ? 'Update Video' : 'Add Video'}
                </Text>
              </TouchableOpacity>

              {editingVideo && (
                <TouchableOpacity
                  style={styles.cancelEditButton}
                  onPress={() => {
                    setEditingVideo(null);
                    setVideoForm({
                      title: '',
                      description: '',
                      youtubeUrl: '',
                      duration: '',
                      order: 0,
                    });
                  }}
                >
                  <Text style={styles.cancelEditButtonText}>Cancel Edit</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Videos List */}
            <View style={styles.videosListContainer}>
              <Text style={styles.formSectionTitle}>
                Video Lectures ({currentCourseVideos.length})
              </Text>
              
              {currentCourseVideos.length > 0 ? (
                <FlatList
                  data={currentCourseVideos}
                  renderItem={renderVideoItem}
                  keyExtractor={(item, index) => item._id || index.toString()}
                  scrollEnabled={false}
                  ItemSeparatorComponent={() => <View style={styles.videoSeparator} />}
                />
              ) : (
                <View style={styles.noVideosContainer}>
                  <MaterialIcons name="video-library" size={48} color="#666" />
                  <Text style={styles.noVideosText}>No videos added yet</Text>
                  <Text style={styles.noVideosSubtext}>Add your first video lecture above</Text>
                </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  addButton: {
    padding: 8,
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
    padding: 20,
  },
  courseCard: {
    backgroundColor: BRAND.accentColor,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#333',
    overflow: 'hidden',
  },
  courseContent: {
    padding: 20,
  },
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  courseInfo: {
    flex: 1,
  },
  courseTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  courseTutor: {
    fontSize: 14,
    color: BRAND.primaryColor,
    marginBottom: 8,
  },
  courseMetadata: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  courseCategory: {
    fontSize: 12,
    color: '#fff',
    backgroundColor: BRAND.primaryColor,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: 'bold',
  },
  courseClass: {
    fontSize: 12,
    color: '#fff',
    backgroundColor: '#666',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  courseRating: {
    fontSize: 12,
    color: '#ffa726',
    fontWeight: 'bold',
  },
  courseSubtitle: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 10,
    lineHeight: 20,
  },
  courseStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statText: {
    fontSize: 12,
    color: '#999',
  },
  courseActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    backgroundColor: '#4caf50',
  },
  videoButton: {
    backgroundColor: '#2196f3',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#333',
  },
  deleteButton: {
    backgroundColor: BRAND.errorColor,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 15,
    marginBottom: 20,
  },
  createFirstButton: {
    backgroundColor: BRAND.primaryColor,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createFirstButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: BRAND.backgroundColor,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  headerPlaceholder: {
    width: 40,
  },
  manageVideosButton: {
    padding: 8,
  },
  modalContent: {
    flex: 1,
  },
  formContent: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: BRAND.accentColor,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#333',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  halfWidth: {
    flex: 1,
  },
  categoryContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#666',
  },
  categoryButtonActive: {
    backgroundColor: BRAND.primaryColor,
    borderColor: BRAND.primaryColor,
  },
  categoryButtonText: {
    color: '#666',
    fontWeight: '500',
  },
  categoryButtonTextActive: {
    color: '#000',
    fontWeight: 'bold',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  switch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#333',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  switchActive: {
    backgroundColor: BRAND.primaryColor,
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
  },
  switchThumbActive: {
    alignSelf: 'flex-end',
  },
  switchText: {
    color: '#fff',
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: BRAND.primaryColor,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  courseDetailsContent: {
    padding: 20,
  },
  courseDetailsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  courseDetailsTutor: {
    fontSize: 16,
    color: BRAND.primaryColor,
    marginBottom: 20,
  },
  courseDetailsMetadata: {
    backgroundColor: BRAND.accentColor,
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
  },
  metadataItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  metadataLabel: {
    fontSize: 14,
    color: '#ccc',
  },
  metadataValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  sectionContent: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
  },
  addVideoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND.accentColor,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 5,
  },
  addVideoButtonText: {
    color: BRAND.primaryColor,
    fontWeight: '500',
    fontSize: 14,
  },
  videosList: {
    marginTop: 10,
  },
  videoPreviewItem: {
    flexDirection: 'row',
    backgroundColor: BRAND.accentColor,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  videoPreviewInfo: {
    flex: 1,
  },
  videoPreviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  videoPreviewDescription: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 4,
  },
  videoPreviewDuration: {
    fontSize: 12,
    color: '#999',
  },
  videoPreviewOrder: {
    backgroundColor: BRAND.primaryColor,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  videoOrderText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 12,
  },
  noVideosContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noVideosText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  noVideosSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
  },
  saveVideosButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: BRAND.accentColor,
  },
  saveVideosButtonText: {
    color: BRAND.primaryColor,
    fontWeight: 'bold',
  },
  videoFormContainer: {
    backgroundColor: BRAND.accentColor,
    margin: 20,
    padding: 20,
    borderRadius: 12,
    marginBottom: 10,
  },
  formSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  addVideoSubmitButton: {
    flexDirection: 'row',
    backgroundColor: BRAND.primaryColor,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
  },
  addVideoSubmitButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelEditButton: {
    backgroundColor: '#666',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  cancelEditButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  videosListContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  videoItem: {
    flexDirection: 'row',
    backgroundColor: BRAND.accentColor,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  videoInfo: {
    flex: 1,
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  videoDescription: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 4,
  },
  videoDuration: {
    fontSize: 12,
    color: '#999',
  },
  videoActions: {
    flexDirection: 'row',
    gap: 8,
  },
  videoActionButton: {
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editVideoButton: {
    backgroundColor: '#4caf50',
  },
  deleteVideoButton: {
    backgroundColor: BRAND.errorColor,
  },
  videoSeparator: {
    height: 10,
  },
});