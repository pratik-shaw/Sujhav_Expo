import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  StatusBar,
  SafeAreaView,
  Animated,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { NavigationProp, RouteProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebView } from 'react-native-webview';
import { API_BASE } from '../config/api';

// Define the RootStackParamList type
export type RootStackParamList = {
  Intro: undefined;
  Home: undefined;
  UserProfile: undefined;
  SignIn: undefined;
  SignUp: undefined;
  TeacherDashboard: undefined;
  AdminDashboard: undefined;
  AdminAddUnpaidCourseScreen: undefined;
  AdminAddPaidCourseScreen: undefined;
  AllCoursesScreen: undefined;
  AdminPaidNotesScreen: undefined;
  AdminUnpaidNotesScreen: undefined;
  AdminPaidMaterialsScreen: undefined;
  AllNotesScreen: undefined;
  CourseDetails: { courseId: string };
  CourseContent: { courseId: string; enrollmentId?: string };
};

interface CourseContentScreenProps {
  navigation: NavigationProp<RootStackParamList, 'CourseContent'>;
  route: RouteProp<RootStackParamList, 'CourseContent'>;
}

interface VideoItem {
  _id?: string;
  videoTitle: string;
  videoDescription: string;
  videoLink: string;
  duration: string;
  thumbnail?: string;
}

interface Course {
  _id: string;
  courseTitle: string;
  tutor: string;
  videoLinks: VideoItem[];
  type: 'paid' | 'free';
}

interface UserData {
  id: string;
  email: string;
  name: string;
  token: string;
  role?: string;
}

const { width, height } = Dimensions.get('window');

// Brand configuration
const BRAND = {
  name: "SUJHAV",
  primaryColor: '#00ff88',
  secondaryColor: '#000000',
  backgroundColor: '#0a1a0a',
  accentColor: '#1a2e1a',
};

const CourseContentScreen: React.FC<CourseContentScreenProps> = ({ navigation, route }) => {
  const { courseId, enrollmentId } = route.params;

  // State management
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [videoProgress, setVideoProgress] = useState<{[key: string]: number}>({});
  const [webViewKey, setWebViewKey] = useState(0);
  const [preloadedHtml, setPreloadedHtml] = useState<{[key: string]: string}>({});

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-20)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const webViewRef = useRef<WebView>(null);

  // API Base URL
  const API_BASE_URL = API_BASE;

  // Authentication check
  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userId = await AsyncStorage.getItem('userId');
      const userName = await AsyncStorage.getItem('userName');
      const userRole = await AsyncStorage.getItem('userRole');
      const storedUserData = await AsyncStorage.getItem('userData');
      
      if (token && userId && userName) {
        let parsedUserData = null;
        if (storedUserData) {
          try {
            parsedUserData = JSON.parse(storedUserData);
          } catch (e) {
            console.error('Error parsing stored user data:', e);
          }
        }
        
        const userDataObj: UserData = {
          id: userId,
          name: userName,
          email: parsedUserData?.email || '',
          token: token,
          role: userRole || 'user'
        };
        
        setUserData(userDataObj);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Auth check error:', error);
      return false;
    }
  };

  // Fetch course content
  const fetchCourseContent = async () => {
    try {
      setLoading(true);
      
      // Check authentication first
      const isAuthenticated = await checkAuthStatus();
      if (!isAuthenticated) {
        Alert.alert('Authentication Required', 'Please log in to access course content.');
        navigation.goBack();
        return;
      }

      // Fetch course details
      let response = await fetch(`${API_BASE_URL}/paidCourses/${courseId}`, {
        headers: {
          'Authorization': `Bearer ${userData?.token}`,
          'Content-Type': 'application/json',
        },
      });
      
      let courseData = null;
      let courseType = 'paid';

      if (response.ok) {
        const text = await response.text();
        courseData = JSON.parse(text);
      } else {
        // Try unpaid courses
        response = await fetch(`${API_BASE_URL}/unpaidCourses/${courseId}`, {
          headers: {
            'Authorization': `Bearer ${userData?.token}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const text = await response.text();
          courseData = JSON.parse(text);
          courseType = 'free';
        }
      }

      if (courseData) {
        const course = courseData.data || courseData;
        setCourse({ ...course, type: courseType });
        
        // Set first video as selected if available
        if (course.videoLinks && course.videoLinks.length > 0) {
          setSelectedVideo(course.videoLinks[0]);
          setCurrentVideoIndex(0);
          // Preload first few videos
          preloadVideos(course.videoLinks);
        }
      } else {
        throw new Error('Course not found');
      }
      
    } catch (error) {
      console.error('Error fetching course content:', error);
      Alert.alert('Error', 'Failed to load course content. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Enhanced video ID extraction with multiple patterns
  const getVideoId = (url: string) => {
    // Handle various YouTube URL formats
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/watch\?.*&v=)([^&\n?#]+)/,
      /youtube\.com\/watch\?v=([^&\n?#]+)/,
      /youtu\.be\/([^&\n?#]+)/,
      /youtube\.com\/embed\/([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return null;
  };

  // Ultra-optimized HTML generation for lightning-fast loading
  const generateVideoHTML = (videoUrl: string, title: string) => {
    const videoId = getVideoId(videoUrl);
    
    if (!videoId) {
      return `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {
                margin: 0;
                padding: 0;
                background: #000;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
                font-family: Arial, sans-serif;
              }
              .error {
                color: #fff;
                text-align: center;
                padding: 20px;
              }
            </style>
          </head>
          <body>
            <div class="error">
              <h3>Unable to load video</h3>
              <p>Invalid video URL format</p>
            </div>
          </body>
        </html>
      `;
    }

    // Ultra-optimized HTML with minimal parameters for fastest loading
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta name="referrer" content="no-referrer">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              background: #000;
              overflow: hidden;
              font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            }
            .container {
              position: relative;
              width: 100vw;
              height: 100vh;
              background: #000;
            }
            .video-wrapper {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
            }
            iframe {
              width: 100%;
              height: 100%;
              border: none;
              background: #000;
            }
            .loading {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              color: #fff;
              font-size: 14px;
              z-index: 1;
            }
            .error-overlay {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background: #000;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #fff;
              font-size: 16px;
              z-index: 2;
              display: none;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="loading" id="loading">Loading video...</div>
            <div class="error-overlay" id="error">
              <div>
                <h3>Video unavailable</h3>
                <p>Please try again later</p>
              </div>
            </div>
            <div class="video-wrapper">
              <iframe 
                id="youtube-player"
                src="https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&controls=1&showinfo=0&rel=0&modestbranding=1&playsinline=1&enablejsapi=1&origin=https://www.youtube.com"
                frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowfullscreen
                referrerpolicy="strict-origin-when-cross-origin"
                onload="hideLoading()"
                onerror="showError()"
              ></iframe>
            </div>
          </div>
          
          <script>
            function hideLoading() {
              const loading = document.getElementById('loading');
              if (loading) {
                loading.style.display = 'none';
              }
            }
            
            function showError() {
              const loading = document.getElementById('loading');
              const error = document.getElementById('error');
              if (loading) loading.style.display = 'none';
              if (error) error.style.display = 'flex';
            }
            
            // Auto-hide loading after 3 seconds as fallback
            setTimeout(() => {
              hideLoading();
            }, 3000);
            
            // Prevent context menu and text selection for cleaner UX
            document.addEventListener('contextmenu', e => e.preventDefault());
            document.addEventListener('selectstart', e => e.preventDefault());
          </script>
        </body>
      </html>
    `;
  };

  // Preload videos for instant switching
  const preloadVideos = (videos: VideoItem[]) => {
    const preloaded: {[key: string]: string} = {};
    
    // Preload first 5 videos for instant access
    videos.slice(0, 5).forEach((video, index) => {
      if (video.videoLink) {
        preloaded[video._id || index.toString()] = generateVideoHTML(video.videoLink, video.videoTitle);
      }
    });
    
    setPreloadedHtml(preloaded);
  };

  // Preload next video for seamless experience
  const preloadNextVideo = () => {
    if (course && currentVideoIndex < course.videoLinks.length - 1) {
      const nextVideo = course.videoLinks[currentVideoIndex + 1];
      const nextVideoId = nextVideo._id || (currentVideoIndex + 1).toString();
      
      if (!preloadedHtml[nextVideoId]) {
        const nextVideoHTML = generateVideoHTML(nextVideo.videoLink, nextVideo.videoTitle);
        setPreloadedHtml(prev => ({
          ...prev,
          [nextVideoId]: nextVideoHTML
        }));
      }
    }
  };

  // Lightning-fast video selection
  const handleVideoSelect = (video: VideoItem, index: number) => {
    setSelectedVideo(video);
    setCurrentVideoIndex(index);
    setVideoError(false);
    setVideoLoading(false);
    
    // Instant WebView reload
    setWebViewKey(prev => prev + 1);
    
    // Save progress for previous video
    if (selectedVideo && selectedVideo._id) {
      setVideoProgress(prev => ({
        ...prev,
        [selectedVideo._id!]: 0.5
      }));
    }
    
    // Preload next video immediately
    setTimeout(preloadNextVideo, 100);
  };

  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCourseContent();
    setRefreshing(false);
  };

  // Handle back button
  const handleBackPress = () => {
    navigation.goBack();
  };

  // Navigation controls
  const handlePreviousVideo = () => {
    if (currentVideoIndex > 0 && course) {
      handleVideoSelect(course.videoLinks[currentVideoIndex - 1], currentVideoIndex - 1);
    }
  };

  const handleNextVideo = () => {
    if (course && currentVideoIndex < course.videoLinks.length - 1) {
      handleVideoSelect(course.videoLinks[currentVideoIndex + 1], currentVideoIndex + 1);
    }
  };

  // Optimized WebView event handlers
  const onWebViewLoad = () => {
    setVideoLoading(false);
    setVideoError(false);
  };

  const onWebViewError = () => {
    setVideoError(true);
    setVideoLoading(false);
  };

  // Get current video HTML (preloaded if available)
  const getCurrentVideoHTML = () => {
    if (!selectedVideo) return '';
    
    const videoId = selectedVideo._id || currentVideoIndex.toString();
    const preloadedHTML = preloadedHtml[videoId];
    
    if (preloadedHTML) {
      return preloadedHTML;
    }
    
    return generateVideoHTML(selectedVideo.videoLink, selectedVideo.videoTitle);
  };

  // Initial effects
  useEffect(() => {
    if (courseId) {
      fetchCourseContent();
      startEntranceAnimation();
    }
  }, [courseId]);

  useEffect(() => {
    if (selectedVideo) {
      preloadNextVideo();
    }
  }, [selectedVideo, currentVideoIndex]);

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

  // Optimized video item rendering
  const renderVideoItem = (video: VideoItem, index: number) => {
    const isSelected = selectedVideo?._id === video._id || (selectedVideo?.videoTitle === video.videoTitle && index === currentVideoIndex);
    const progressForVideo = video._id ? (videoProgress[video._id] || 0) : 0;
    
    return (
      <TouchableOpacity
        key={video._id || index}
        style={[styles.videoItem, isSelected && styles.videoItemSelected]}
        onPress={() => handleVideoSelect(video, index)}
        activeOpacity={0.8}
      >
        <View style={styles.videoIcon}>
          <Text style={styles.videoIconText}>
            {isSelected ? '🎬' : '▶️'}
          </Text>
        </View>
        <View style={styles.videoInfo}>
          <Text style={[styles.videoTitle, isSelected && styles.videoTitleSelected]} numberOfLines={2}>
            {video.videoTitle}
          </Text>
          <View style={styles.videoMeta}>
            <Text style={[styles.videoDuration, isSelected && styles.videoDurationSelected]}>
              {video.duration}
            </Text>
            {progressForVideo > 0 && (
              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${progressForVideo * 100}%` }]} />
              </View>
            )}
          </View>
        </View>
        <View style={[styles.videoNumber, isSelected && styles.videoNumberSelected]}>
          <Text style={[styles.videoNumberText, isSelected && styles.videoNumberTextSelected]}>
            {index + 1}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={BRAND.backgroundColor} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BRAND.primaryColor} />
          <Text style={styles.loadingText}>Loading course content...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!course) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={BRAND.backgroundColor} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Course content not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
            <Text style={styles.headerTitle} numberOfLines={1}>
              {course.courseTitle}
            </Text>
            <Text style={styles.headerSubtitle}>
              {course.videoLinks.length} Videos • {course.tutor}
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Content */}
      <Animated.View style={[styles.contentContainer, { opacity: fadeAnim }]}>
        {/* Video Player */}
        {selectedVideo && (
          <View style={styles.videoPlayerContainer}>
            <View style={styles.videoPlayer}>
              {videoError ? (
                <View style={styles.videoErrorContainer}>
                  <Text style={styles.videoErrorText}>Unable to load video</Text>
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={() => {
                      setVideoError(false);
                      setWebViewKey(prev => prev + 1);
                    }}
                  >
                    <Text style={styles.retryButtonText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <WebView
                  key={webViewKey}
                  ref={webViewRef}
                  source={{ 
                    html: getCurrentVideoHTML()
                  }}
                  style={styles.webView}
                  onLoad={onWebViewLoad}
                  onError={onWebViewError}
                  allowsFullscreenVideo={true}
                  allowsInlineMediaPlayback={true}
                  mediaPlaybackRequiresUserAction={false}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                  startInLoadingState={false}
                  scalesPageToFit={false}
                  bounces={false}
                  scrollEnabled={false}
                  cacheEnabled={true}
                  incognito={false}
                  renderLoading={() => <></>}
                  onShouldStartLoadWithRequest={() => true}
                  mixedContentMode="compatibility"
                  thirdPartyCookiesEnabled={true}
                  sharedCookiesEnabled={true}
                  allowFileAccess={true}
                  allowUniversalAccessFromFileURLs={true}
                />
              )}
            </View>
            
            {/* Video Navigation Controls */}
            <View style={styles.videoNavigationControls}>
              <TouchableOpacity
                style={[styles.navButton, currentVideoIndex === 0 && styles.navButtonDisabled]}
                onPress={handlePreviousVideo}
                disabled={currentVideoIndex === 0}
              >
                <Text style={styles.navButtonText}>⏮️ Previous</Text>
              </TouchableOpacity>
              
              <View style={styles.videoInfoNav}>
                <Text style={styles.currentVideoTitle} numberOfLines={1}>
                  {selectedVideo.videoTitle}
                </Text>
                <Text style={styles.videoCounter}>
                  {currentVideoIndex + 1} of {course.videoLinks.length}
                </Text>
              </View>
              
              <TouchableOpacity
                style={[
                  styles.navButton,
                  currentVideoIndex === course.videoLinks.length - 1 && styles.navButtonDisabled
                ]}
                onPress={handleNextVideo}
                disabled={currentVideoIndex === course.videoLinks.length - 1}
              >
                <Text style={styles.navButtonText}>Next ⏭️</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Video List */}
        <View style={styles.videoListContainer}>
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
            <View style={styles.videoListHeader}>
              <Text style={styles.sectionTitle}>Course Videos</Text>
              <Text style={styles.videoCount}>
                {currentVideoIndex + 1} of {course.videoLinks.length}
              </Text>
            </View>
            
            <View style={styles.videoList}>
              {course.videoLinks.map((video, index) => renderVideoItem(video, index))}
            </View>
            
            <View style={styles.bottomPadding} />
          </ScrollView>
        </View>
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
    width: 400,
    height: 400,
    top: -200,
    right: -200,
  },
  glowCircle2: {
    width: 300,
    height: 300,
    bottom: -150,
    left: -150,
  },
  headerSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    zIndex: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BRAND.accentColor,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  backButtonText: {
    color: BRAND.primaryColor,
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    color: '#ccc',
    fontSize: 14,
  },
  contentContainer: {
    flex: 1,
    zIndex: 1,
  },
  videoPlayerContainer: {
    margin: 20,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  videoPlayer: {
    height: 250,
    position: 'relative',
  },
  webView: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoErrorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  videoErrorText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: BRAND.primaryColor,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryButtonText: {
    color: '#000',
    fontWeight: 'bold',
  },
  videoNavigationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: BRAND.accentColor,
  },
  navButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: BRAND.primaryColor,
    borderRadius: 20,
  },
  navButtonDisabled: {
    backgroundColor: '#555',
    opacity: 0.5,
  },
  navButtonText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  videoInfoNav: {
    flex: 1,
    marginHorizontal: 15,
    alignItems: 'center',
  },
  currentVideoTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  videoCounter: {
    color: BRAND.primaryColor,
    fontSize: 12,
    marginTop: 2,
  },
  videoListContainer: {
    flex: 1,
    marginTop: 10,
  },
  scrollView: {
    flex: 1,
  },
  videoListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  videoCount: {
    color: BRAND.primaryColor,
    fontSize: 14,
  },
  videoList: {
    paddingHorizontal: 20,
  },
  videoItem: {
    flexDirection: 'row',
    backgroundColor: BRAND.accentColor,
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    alignItems: 'center',
  },
  videoItemSelected: {
    backgroundColor: BRAND.primaryColor,
  },
  videoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  videoIconText: {
    fontSize: 16,
  },
  videoInfo: {
    flex: 1,
  },
  videoTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  videoTitleSelected: {
    color: '#000',
  },
  videoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  videoDuration: {
    color: '#aaa',
    fontSize: 12,
    fontWeight: '500',
  },
  videoDurationSelected: {
    color: '#000',
    opacity: 0.7,
  },
  progressContainer: {
    width: 80,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 1.5,
  },
  videoNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  videoNumberSelected: {
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  videoNumberText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  videoNumberTextSelected: {
    color: '#000',
  },
  bottomPadding: {
    height: 50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 14,
    marginTop: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
});

export default CourseContentScreen;