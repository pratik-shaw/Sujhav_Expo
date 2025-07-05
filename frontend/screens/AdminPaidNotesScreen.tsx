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
  Image,
  Platform,
} from 'react-native';
import { API_BASE } from '../config/api';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

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

// Mock API configuration
const API_BASE_URL = API_BASE;

// Types
interface PaidNotes {
  _id?: string;
  notesTitle: string;
  tutor: string;
  rating: number;
  price: number;
  category: 'jee' | 'neet' | 'boards';
  class: string;
  notesDetails: {
    subtitle: string;
    description: string;
  };
  pdfLinks: PDFLink[];
  notesThumbnail: string;
  thumbnailUri?: string;
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

interface PDFLink {
  _id?: string;
  pdfTitle: string;
  pdfDescription: string;
  pdfUrl: string;
  fileSize: string;
  pages?: number;
}

interface StudentEnrollment {
  _id?: string;
  studentId: string;
  enrolledAt?: Date;
}

interface AdminPaidNotesScreenProps {
  navigation?: any;
  onBack?: () => void;
}

export default function AdminPaidNotesScreen({ 
  navigation, 
  onBack 
}: AdminPaidNotesScreenProps) {
  // State
  const [notes, setNotes] = useState<PaidNotes[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [editingNotes, setEditingNotes] = useState<PaidNotes | null>(null);
  const [selectedNotes, setSelectedNotes] = useState<PaidNotes | null>(null);

  // Form state
  const [notesForm, setNotesForm] = useState<PaidNotes>({
    notesTitle: '',
    tutor: '',
    rating: 0,
    price: 1,
    category: 'jee',
    class: '',
    notesDetails: {
      subtitle: '',
      description: '',
    },
    pdfLinks: [],
    notesThumbnail: '',
    thumbnailUri: '',
    isActive: true,
    studentsEnrolled: [],
  });

  // PDF form state
  const [pdfForm, setPdfForm] = useState<PDFLink>({
    pdfTitle: '',
    pdfDescription: '',
    pdfUrl: '',
    fileSize: '',
    pages: 0,
  });

  const [editingPDF, setEditingPDF] = useState<PDFLink | null>(null);
  const [selectedPDFFile, setSelectedPDFFile] = useState<any>(null);

  // Load notes on mount
  useEffect(() => {
    loadNotes();
    requestPermissions();
  }, []);

  // Request permissions
  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant media library permissions to upload files.');
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
        setNotesForm({ 
          ...notesForm, 
          thumbnailUri: imageUri,
          notesThumbnail: imageUri
        });
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  // PDF picker function
  const pickPDF = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const pdfFile = result.assets[0];
        setSelectedPDFFile(pdfFile);
        setPdfForm({
          ...pdfForm,
          pdfTitle: pdfFile.name || 'PDF Document',
          fileSize: pdfFile.size ? `${(pdfFile.size / 1024 / 1024).toFixed(2)} MB` : 'Unknown',
        });
      }
    } catch (error) {
      console.error('Error picking PDF:', error);
      Alert.alert('Error', 'Failed to pick PDF file');
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
  const loadNotes = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/paidNotes`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setNotes(data.data || []);
      } else {
        Alert.alert('Error', data.message || 'Failed to load paid notes');
      }
    } catch (error) {
      console.error('Error loading paid notes:', error);
      Alert.alert('Error', 'Failed to load paid notes. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const saveNotes = async () => {
  try {
    if (!validateNotes()) return;
    
    setLoading(true);
    const url = editingNotes 
      ? `${API_BASE_URL}/paidNotes/${editingNotes._id}`
      : `${API_BASE_URL}/paidNotes`;
    
    const method = editingNotes ? 'PUT' : 'POST';
    
    const formData = new FormData();
    
    // Add text fields
    formData.append('notesTitle', notesForm.notesTitle);
    formData.append('tutor', notesForm.tutor);
    formData.append('rating', notesForm.rating.toString());
    formData.append('price', notesForm.price.toString());
    formData.append('category', notesForm.category);
    formData.append('class', notesForm.class);
    formData.append('isActive', notesForm.isActive.toString());
    
    // Add notesDetails as individual fields instead of JSON string
    formData.append('notesDetails[subtitle]', notesForm.notesDetails.subtitle);
    formData.append('notesDetails[description]', notesForm.notesDetails.description);
    
    // Add pdfLinks as JSON string (empty array if no PDFs)
    formData.append('pdfLinks', JSON.stringify(notesForm.pdfLinks || []));
    
    // Add thumbnail file if exists
    if (notesForm.thumbnailUri) {
      const filename = notesForm.thumbnailUri.split('/').pop() || 'thumbnail.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      
      formData.append('thumbnail', {
        uri: notesForm.thumbnailUri,
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
      const errorText = await response.text();
      console.error('Server response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.success) {
      Alert.alert('Success', editingNotes ? 'Paid notes updated!' : 'Paid notes created!');
      resetForm();
      setShowAddModal(false);
      loadNotes();
    } else {
      Alert.alert('Error', data.message || 'Failed to save paid notes');
    }
  } catch (error) {
    console.error('Error saving paid notes:', error);
    Alert.alert('Error', 'Failed to save paid notes. Please check your internet connection.');
  } finally {
    setLoading(false);
  }
};

  const deleteNotes = async (notesId: string) => {
    if (!notesId) {
      Alert.alert('Error', 'Notes ID is required');
      return;
    }

    Alert.alert(
      'Delete Paid Notes',
      'Are you sure you want to delete this paid notes? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const response = await fetch(`${API_BASE_URL}/paidNotes/${notesId}`, {
                method: 'DELETE',
              });
              
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              
              const data = await response.json();
              
              if (data.success) {
                Alert.alert('Success', 'Paid notes deleted!');
                loadNotes();
              } else {
                Alert.alert('Error', data.message || 'Failed to delete paid notes');
              }
            } catch (error) {
              console.error('Error deleting paid notes:', error);
              Alert.alert('Error', 'Failed to delete paid notes. Please check your internet connection.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const addPDFToNotes = async () => {
    try {
      if (!validatePDF()) return;
      if (!selectedNotes?._id) {
        Alert.alert('Error', 'Notes not selected');
        return;
      }
      
      setLoading(true);
      const formData = new FormData();
      
      formData.append('pdfTitle', pdfForm.pdfTitle);
      formData.append('pdfDescription', pdfForm.pdfDescription);
      formData.append('fileSize', pdfForm.fileSize);
      formData.append('pages', pdfForm.pages?.toString() || '0');
      
      if (selectedPDFFile) {
        formData.append('pdf', {
          uri: selectedPDFFile.uri,
          type: 'application/pdf',
          name: selectedPDFFile.name,
        } as any);
      }
      
      const response = await fetch(`${API_BASE_URL}/paidNotes/${selectedNotes._id}/pdfs`, {
        method: 'POST',
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
        Alert.alert('Success', 'PDF added to paid notes!');
        resetPDFForm();
        setSelectedNotes(data.data);
        loadNotes();
      } else {
        Alert.alert('Error', data.message || 'Failed to add PDF');
      }
    } catch (error) {
      console.error('Error adding PDF:', error);
      Alert.alert('Error', 'Failed to add PDF. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const deletePDFFromNotes = async (pdfId: string) => {
    if (!selectedNotes?._id || !pdfId) {
      Alert.alert('Error', 'Invalid notes or PDF selection');
      return;
    }

    Alert.alert(
      'Delete PDF',
      'Are you sure you want to delete this PDF from the paid notes?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const response = await fetch(`${API_BASE_URL}/paidNotes/${selectedNotes._id}/pdfs/${pdfId}`, {
                method: 'DELETE',
              });
              
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              
              const data = await response.json();
              
              if (data.success) {
                Alert.alert('Success', 'PDF deleted from paid notes!');
                setSelectedNotes(data.data);
                loadNotes();
              } else {
                Alert.alert('Error', data.message || 'Failed to delete PDF');
              }
            } catch (error) {
              console.error('Error deleting PDF:', error);
              Alert.alert('Error', 'Failed to delete PDF. Please check your internet connection.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // Validation functions
  const validateNotes = () => {
    if (!notesForm.notesTitle?.trim()) {
      Alert.alert('Error', 'Notes title is required');
      return false;
    }
    if (!notesForm.tutor?.trim()) {
      Alert.alert('Error', 'Tutor name is required');
      return false;
    }
    if (!notesForm.class?.trim()) {
      Alert.alert('Error', 'Class is required');
      return false;
    }
    if (!notesForm.notesDetails?.subtitle?.trim()) {
      Alert.alert('Error', 'Subtitle is required');
      return false;
    }
    if (!notesForm.notesDetails?.description?.trim()) {
      Alert.alert('Error', 'Description is required');
      return false;
    }
    if (!notesForm.thumbnailUri && !notesForm.notesThumbnail) {
      Alert.alert('Error', 'Thumbnail is required');
      return false;
    }
    if (notesForm.price < 1) {
      Alert.alert('Error', 'Price must be at least ₹1 for paid notes');
      return false;
    }
    if (notesForm.rating < 0 || notesForm.rating > 5) {
      Alert.alert('Error', 'Rating must be between 0 and 5');
      return false;
    }
    return true;
  };

  const validatePDF = () => {
    if (!pdfForm.pdfTitle?.trim()) {
      Alert.alert('Error', 'PDF title is required');
      return false;
    }
    if (!pdfForm.pdfDescription?.trim()) {
      Alert.alert('Error', 'PDF description is required');
      return false;
    }
    if (!selectedPDFFile && !editingPDF) {
      Alert.alert('Error', 'Please select a PDF file');
      return false;
    }
    return true;
  };

  // Helper functions
  const resetForm = () => {
    setNotesForm({
      notesTitle: '',
      tutor: '',
      rating: 0,
      price: 1,
      category: 'jee',
      class: '',
      notesDetails: {
        subtitle: '',
        description: '',
      },
      pdfLinks: [],
      notesThumbnail: '',
      thumbnailUri: '',
      isActive: true,
      studentsEnrolled: [],
    });
    setEditingNotes(null);
  };

  const resetPDFForm = () => {
    setPdfForm({
      pdfTitle: '',
      pdfDescription: '',
      pdfUrl: '',
      fileSize: '',
      pages: 0,
    });
    setSelectedPDFFile(null);
    setEditingPDF(null);
  };

  const editNotes = (notes: PaidNotes) => {
    setNotesForm({
      ...notes,
      notesDetails: notes.notesDetails || { subtitle: '', description: '' },
      pdfLinks: notes.pdfLinks || [],
      rating: notes.rating || 0,
      price: notes.price || 1,
      isActive: notes.isActive !== undefined ? notes.isActive : true,
      studentsEnrolled: notes.studentsEnrolled || [],
      thumbnailUri: '',
    });
    setEditingNotes(notes);
    setShowAddModal(true);
  };

  const managePDFs = (notes: PaidNotes) => {
    setSelectedNotes(notes);
    setShowPDFModal(true);
  };

  const formatPrice = (price: number) => {
    return price >= 1000 ? `₹${(price / 1000).toFixed(1)}K` : `₹${price}`;
  };

  // Render functions
  const renderNotesItem = ({ item }: { item: PaidNotes }) => (
    <View style={styles.notesCard}>
      <View style={styles.notesHeader}>
        <View style={styles.notesHeaderLeft}>
          <Text style={styles.notesTitle}>{item.notesTitle || 'Untitled Notes'}</Text>
          <Text style={styles.notesTutor}>by {item.tutor || 'Unknown'}</Text>
        </View>
        <View style={styles.priceContainer}>
          <Text style={styles.priceText}>{formatPrice(item.price || 1)}</Text>
          <Text style={styles.priceLabel}>PREMIUM</Text>
        </View>
      </View>
      
      <View style={styles.notesInfo}>
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
      
      <Text style={styles.notesSubtitle}>
        {item.notesDetails?.subtitle || 'No subtitle available'}
      </Text>      
      
      <View style={styles.notesActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => editNotes(item)}
        >
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.pdfButton]}
          onPress={() => managePDFs(item)}
        >
          <Text style={styles.actionButtonText}>PDFs ({item.pdfLinks?.length || 0})</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => item._id && deleteNotes(item._id)}
        >
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPDFItem = ({ item }: { item: PDFLink }) => (
    <View style={styles.pdfItem}>
      <View style={styles.pdfContent}>
        <Text style={styles.pdfTitle}>{item.pdfTitle || 'Untitled PDF'}</Text>
        <Text style={styles.pdfDescription}>{item.pdfDescription || 'No description'}</Text>
        <Text style={styles.pdfSize}>Size: {item.fileSize || 'N/A'}</Text>
        {item.pages && item.pages > 0 && (
          <Text style={styles.pdfPages}>Pages: {item.pages}</Text>
        )}
      </View>
      
      <TouchableOpacity
        style={[styles.pdfActionButton, styles.pdfDeleteButton]}
        onPress={() => item._id && deletePDFFromNotes(item._id)}
      >
        <Text style={styles.pdfActionButtonText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND.backgroundColor} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackPress}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Paid Notes Admin</Text>
        
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Text style={styles.addButtonText}>+ Add Notes</Text>
        </TouchableOpacity>
      </View>

      {/* Notes List */}
      {loading && notes.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BRAND.primaryColor} />
          <Text style={styles.loadingText}>Loading paid notes...</Text>
        </View>
      ) : (
        <FlatList
          data={notes}
          renderItem={renderNotesItem}
          keyExtractor={(item, index) => item._id || index.toString()}
          contentContainerStyle={styles.listContainer}
          refreshing={loading}
          onRefresh={loadNotes}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No paid notes found</Text>
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => setShowAddModal(true)}
              >
                <Text style={styles.createButtonText}>Create Your First Paid Notes</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Add/Edit Notes Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalBackButton}
              onPress={() => setShowAddModal(false)}
            >
              <Text style={styles.modalBackButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingNotes ? 'Edit Paid Notes' : 'Add New Paid Notes'}
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowAddModal(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Notes Title */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Notes Title *</Text>
              <TextInput
                style={styles.textInput}
                value={notesForm.notesTitle || ''}
                onChangeText={(text) => setNotesForm({ ...notesForm, notesTitle: text })}
                placeholder="Enter notes title"
                placeholderTextColor="#666"
              />
            </View>

            {/* Tutor */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Tutor Name *</Text>
              <TextInput
                style={styles.textInput}
                value={notesForm.tutor || ''}
                onChangeText={(text) => setNotesForm({ ...notesForm, tutor: text })}
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
                  value={notesForm.rating?.toString() || '0'}
                  onChangeText={(text) => {
                    const rating = parseFloat(text) || 0;
                    setNotesForm({ ...notesForm, rating: Math.min(Math.max(rating, 0), 5) });
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
                  value={notesForm.price?.toString() || '1'}
                  onChangeText={(text) => {
                    const price = parseFloat(text) || 1;
                    setNotesForm({ ...notesForm, price: Math.max(price, 1) });
                  }}
                  placeholder="1"
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
                      notesForm.category === cat && styles.categoryButtonActive,
                    ]}
                    onPress={() => setNotesForm({ ...notesForm, category: cat })}
                  >
                    <Text
                      style={[
                        styles.categoryButtonText,
                        notesForm.category === cat && styles.categoryButtonTextActive,
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
                value={notesForm.class || ''}
                onChangeText={(text) => setNotesForm({ ...notesForm, class: text })}
                placeholder="e.g., 11, 12"
                placeholderTextColor="#666"
              />
            </View>

            {/* Subtitle */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Subtitle *</Text>
              <TextInput
                style={styles.textInput}
                value={notesForm.notesDetails?.subtitle || ''}
                onChangeText={(text) => setNotesForm({
                  ...notesForm,
                  notesDetails: { ...notesForm.notesDetails, subtitle: text }
                })}
                placeholder="Enter notes subtitle"
                placeholderTextColor="#666"
              />
            </View>

            {/* Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description *</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={notesForm.notesDetails?.description || ''}
                onChangeText={(text) => setNotesForm({
                  ...notesForm,
                  notesDetails: { ...notesForm.notesDetails, description: text }
                })}
                placeholder="Enter detailed notes description"
                placeholderTextColor="#666"
                multiline
                numberOfLines={4}
              />
            </View>

            {/* Thumbnail Upload */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Notes Thumbnail *</Text>
              <TouchableOpacity
                style={styles.thumbnailButton}
                onPress={pickImage}
              >
                <Text style={styles.thumbnailButtonText}>
                  {notesForm.thumbnailUri ? 'Change Thumbnail' : 'Select Thumbnail'}
                </Text>
              </TouchableOpacity>
              
              {(notesForm.thumbnailUri || notesForm.notesThumbnail) && (
                <Image
                  source={{ uri: notesForm.thumbnailUri || notesForm.notesThumbnail }}
                  style={styles.thumbnailPreview}
                  resizeMode="cover"
                />
              )}
            </View>

            {/* Active Status */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Notes Status</Text>
              <TouchableOpacity
                style={[
                  styles.statusButton,
                  notesForm.isActive ? styles.statusButtonActive : styles.statusButtonInactive
                ]}
                onPress={() => setNotesForm({ ...notesForm, isActive: !notesForm.isActive })}
              >
                <Text style={[
                  styles.statusButtonText,
                  notesForm.isActive ? styles.statusButtonTextActive : styles.statusButtonTextInactive
                ]}>
                  {notesForm.isActive ? '✓ Active' : '✕ Inactive'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveButton, loading && styles.saveButtonDisabled]}
              onPress={saveNotes}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={BRAND.backgroundColor} />
              ) : (
                <Text style={styles.saveButtonText}>
                  {editingNotes ? 'Update Paid Notes' : 'Create Paid Notes'}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* PDF Management Modal */}
      <Modal
        visible={showPDFModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPDFModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalBackButton}
              onPress={() => setShowPDFModal(false)}
            >
              <Text style={styles.modalBackButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              Manage PDFs: {selectedNotes?.notesTitle || 'Unknown'}
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowPDFModal(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Add PDF Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Add New PDF</Text>
              
              {/* PDF Title */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>PDF Title *</Text>
                <TextInput
                  style={styles.textInput}
                  value={pdfForm.pdfTitle || ''}
                  onChangeText={(text) => setPdfForm({ ...pdfForm, pdfTitle: text })}
                  placeholder="Enter PDF title"
                  placeholderTextColor="#666"
                />
              </View>

              {/* PDF Description */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>PDF Description *</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={pdfForm.pdfDescription || ''}
                  onChangeText={(text) => setPdfForm({ ...pdfForm, pdfDescription: text })}
                  placeholder="Enter PDF description"
                  placeholderTextColor="#666"
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* PDF Pages */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Number of Pages</Text>
                <TextInput
                  style={styles.textInput}
                  value={pdfForm.pages?.toString() || ''}
                  onChangeText={(text) => {
                    const pages = parseInt(text) || 0;
                    setPdfForm({ ...pdfForm, pages: Math.max(pages, 0) });
                  }}
                  placeholder="Enter number of pages"
                  placeholderTextColor="#666"
                  keyboardType="numeric"
                />
              </View>

              {/* PDF File Selection */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>PDF File *</Text>
                <TouchableOpacity
                  style={styles.pdfPickerButton}
                  onPress={pickPDF}
                >
                  <Text style={styles.pdfPickerButtonText}>
                    {selectedPDFFile ? selectedPDFFile.name : 'Select PDF File'}
                  </Text>
                </TouchableOpacity>
                
                {selectedPDFFile && (
                  <View style={styles.selectedFileInfo}>
                    <Text style={styles.selectedFileName}>📄 {selectedPDFFile.name}</Text>
                    <Text style={styles.selectedFileSize}>
                      Size: {pdfForm.fileSize || 'Calculating...'}
                    </Text>
                  </View>
                )}
              </View>

              {/* Add PDF Button */}
              <TouchableOpacity
                style={[styles.addPDFButton, loading && styles.addPDFButtonDisabled]}
                onPress={addPDFToNotes}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={BRAND.backgroundColor} />
                ) : (
                  <Text style={styles.addPDFButtonText}>Add PDF to Notes</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Existing PDFs Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Existing PDFs ({selectedNotes?.pdfLinks?.length || 0})
              </Text>
              
              {selectedNotes?.pdfLinks && selectedNotes.pdfLinks.length > 0 ? (
                <FlatList
                  data={selectedNotes.pdfLinks}
                  renderItem={renderPDFItem}
                  keyExtractor={(item, index) => item._id || index.toString()}
                  scrollEnabled={false}
                  ItemSeparatorComponent={() => <View style={styles.pdfSeparator} />}
                />
              ) : (
                <View style={styles.noPDFsContainer}>
                  <Text style={styles.noPDFsText}>No PDFs added yet</Text>
                  <Text style={styles.noPDFsSubtext}>
                    Add your first PDF to get started
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={BRAND.primaryColor} />
          <Text style={styles.loadingOverlayText}>Please wait...</Text>
        </View>
      )}
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: BRAND.backgroundColor,
  },
  backButtonText: {
    color: BRAND.primaryColor,
    fontSize: 14,
    fontWeight: '600',
  },
  headerTitle: {
    color: BRAND.primaryColor,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
  },
  addButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: BRAND.primaryColor,
  },
  addButtonText: {
    color: BRAND.backgroundColor,
    fontSize: 14,
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
  },
  notesCard: {
    backgroundColor: BRAND.accentColor,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BRAND.primaryColor + '20',
  },
  notesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  notesHeaderLeft: {
    flex: 1,
  },
  notesTitle: {
    color: BRAND.primaryColor,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  notesTutor: {
    color: '#999',
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
    marginTop: 2,
  },
  notesInfo: {
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
  notesSubtitle: {
    color: '#ddd',
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  notesActions: {
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
    backgroundColor: BRAND.primaryColor + '20',
    borderWidth: 1,
    borderColor: BRAND.primaryColor,
  },
  pdfButton: {
    backgroundColor: BRAND.warningColor + '20',
    borderWidth: 1,
    borderColor: BRAND.warningColor,
  },
  deleteButton: {
    backgroundColor: BRAND.errorColor + '20',
    borderWidth: 1,
    borderColor: BRAND.errorColor,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: BRAND.primaryColor,
    fontSize: 16,
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#999',
    fontSize: 16,
    marginBottom: 20,
  },
  createButton: {
    backgroundColor: BRAND.primaryColor,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: BRAND.backgroundColor,
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: BRAND.backgroundColor,
  },
  modalBackButtonText: {
    color: BRAND.primaryColor,
    fontSize: 14,
    fontWeight: '600',
  },
  modalTitle: {
    color: BRAND.primaryColor,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    color: BRAND.primaryColor,
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
    color: BRAND.primaryColor,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: BRAND.accentColor,
    borderWidth: 1,
    borderColor: BRAND.primaryColor + '30',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
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
    flex: 0.48,
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
    borderColor: BRAND.primaryColor + '30',
    backgroundColor: BRAND.accentColor,
    alignItems: 'center',
    marginHorizontal: 4,
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
    borderColor: BRAND.primaryColor + '30',
    borderRadius: 8,
    paddingVertical: 12,
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
    height: 120,
    borderRadius: 8,
    backgroundColor: BRAND.accentColor,
  },
  statusButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  statusButtonActive: {
    backgroundColor: BRAND.primaryColor + '20',
    borderColor: BRAND.primaryColor,
  },
  statusButtonInactive: {
    backgroundColor: BRAND.errorColor + '20',
    borderColor: BRAND.errorColor,
  },
  statusButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusButtonTextActive: {
    color: BRAND.primaryColor,
  },
  statusButtonTextInactive: {
    color: BRAND.errorColor,
  },
  saveButton: {
    backgroundColor: BRAND.primaryColor,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  saveButtonDisabled: {
    backgroundColor: BRAND.primaryColor + '60',
  },
  saveButtonText: {
    color: BRAND.backgroundColor,
    fontSize: 16,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    color: BRAND.primaryColor,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.primaryColor + '30',
  },
  pdfPickerButton: {
    backgroundColor: BRAND.accentColor,
    borderWidth: 1,
    borderColor: BRAND.primaryColor + '30',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  pdfPickerButtonText: {
    color: BRAND.primaryColor,
    fontSize: 14,
    fontWeight: '600',
  },
  selectedFileInfo: {
    marginTop: 12,
    padding: 12,
    backgroundColor: BRAND.accentColor,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BRAND.primaryColor + '20',
  },
  selectedFileName: {
    color: BRAND.primaryColor,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  selectedFileSize: {
    color: '#999',
    fontSize: 12,
  },
  addPDFButton: {
    backgroundColor: BRAND.primaryColor,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  addPDFButtonDisabled: {
    backgroundColor: BRAND.primaryColor + '60',
  },
  addPDFButtonText: {
    color: BRAND.backgroundColor,
    fontSize: 14,
    fontWeight: 'bold',
  },
  pdfItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND.accentColor,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: BRAND.primaryColor + '20',
  },
  pdfContent: {
    flex: 1,
    marginRight: 12,
  },
  pdfTitle: {
    color: BRAND.primaryColor,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  pdfDescription: {
    color: '#ccc',
    fontSize: 12,
    marginBottom: 4,
  },
  pdfSize: {
    color: '#999',
    fontSize: 11,
  },
  pdfPages: {
    color: '#999',
    fontSize: 11,
  },
  pdfActionButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  pdfDeleteButton: {
    backgroundColor: BRAND.errorColor + '20',
    borderWidth: 1,
    borderColor: BRAND.errorColor,
  },
  pdfActionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: BRAND.errorColor,
  },
  pdfSeparator: {
    height: 12,
  },
  noPDFsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noPDFsText: {
    color: '#999',
    fontSize: 16,
    marginBottom: 8,
  },
  noPDFsSubtext: {
    color: '#666',
    fontSize: 14,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlayText: {
    color: BRAND.primaryColor,
    fontSize: 16,
    marginTop: 12,
  },
});
