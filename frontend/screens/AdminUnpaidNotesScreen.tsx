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

// API configuration
const API_BASE_URL = API_BASE;

// Types
interface UnpaidNotes {
  _id?: string;
  notesTitle: string;
  tutor: string;
  rating: number;
  category: 'jee' | 'neet' | 'boards';
  class: string;
  notesDetails: {
    subtitle: string;
    description: string;
  };
  pdfs: PDF[];
  thumbnailUri?: string;
  isActive: boolean;
  viewCount?: number;
  createdAt?: string;
}

interface PDF {
  _id?: string;
  pdfTitle: string;
  pdfDescription: string;
  originalName: string;
  fileSize: number;
  pages?: number;
}

interface AdminUnpaidNotesScreenProps {
  navigation?: any;
  onBack?: () => void;
}

export default function AdminUnpaidNotesScreen({ 
  navigation, 
  onBack 
}: AdminUnpaidNotesScreenProps) {
  // State
  const [notes, setNotes] = useState<UnpaidNotes[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [editingNotes, setEditingNotes] = useState<UnpaidNotes | null>(null);
  const [selectedNotes, setSelectedNotes] = useState<UnpaidNotes | null>(null);

  // Form state
  const [notesForm, setNotesForm] = useState<UnpaidNotes>({
    notesTitle: '',
    tutor: '',
    rating: 0,
    category: 'jee',
    class: '',
    notesDetails: {
      subtitle: '',
      description: '',
    },
    pdfs: [],
    thumbnailUri: '',
    isActive: true,
  });

  // PDF form state
  const [pdfForm, setPdfForm] = useState<PDF>({
    pdfTitle: '',
    pdfDescription: '',
    originalName: '',
    fileSize: 0,
    pages: 0,
  });

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
          thumbnailUri: imageUri
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
          originalName: pdfFile.name || 'document.pdf',
          fileSize: pdfFile.size || 0,
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
      const response = await fetch(`${API_BASE_URL}/unpaidNotes`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setNotes(data.data || []);
      } else {
        Alert.alert('Error', data.message || 'Failed to load unpaid notes');
      }
    } catch (error) {
      console.error('Error loading unpaid notes:', error);
      Alert.alert('Error', 'Failed to load unpaid notes. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const saveNotes = async () => {
    try {
      if (!validateNotes()) return;
      
      setLoading(true);
      const url = editingNotes 
        ? `${API_BASE_URL}/unpaidNotes/${editingNotes._id}`
        : `${API_BASE_URL}/unpaidNotes`;
      
      const method = editingNotes ? 'PUT' : 'POST';
      
      const formData = new FormData();
      
      // Add text fields
      formData.append('notesTitle', notesForm.notesTitle);
      formData.append('tutor', notesForm.tutor);
      formData.append('rating', notesForm.rating.toString());
      formData.append('category', notesForm.category);
      formData.append('class', notesForm.class);
      formData.append('isActive', notesForm.isActive.toString());
      formData.append('notesDetails', JSON.stringify(notesForm.notesDetails));
      
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
        Alert.alert('Success', editingNotes ? 'Unpaid notes updated!' : 'Unpaid notes created!');
        resetForm();
        setShowAddModal(false);
        loadNotes();
      } else {
        Alert.alert('Error', data.message || 'Failed to save unpaid notes');
      }
    } catch (error) {
      console.error('Error saving unpaid notes:', error);
      Alert.alert('Error', 'Failed to save unpaid notes. Please check your internet connection.');
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
      'Delete Unpaid Notes',
      'Are you sure you want to delete this unpaid notes? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const response = await fetch(`${API_BASE_URL}/unpaidNotes/${notesId}`, {
                method: 'DELETE',
              });
              
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              
              const data = await response.json();
              
              if (data.success) {
                Alert.alert('Success', 'Unpaid notes deleted!');
                loadNotes();
              } else {
                Alert.alert('Error', data.message || 'Failed to delete unpaid notes');
              }
            } catch (error) {
              console.error('Error deleting unpaid notes:', error);
              Alert.alert('Error', 'Failed to delete unpaid notes. Please check your internet connection.');
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
    console.log('Adding PDF to notes:', selectedNotes._id);
    console.log('PDF Form:', pdfForm);
    console.log('Selected PDF File:', selectedPDFFile);
    
    const formData = new FormData();
    
    // Add text fields
    formData.append('pdfTitle', pdfForm.pdfTitle.trim());
    formData.append('pdfDescription', pdfForm.pdfDescription.trim());
    formData.append('pages', (pdfForm.pages || 0).toString());
    
    // Add PDF file
    if (selectedPDFFile) {
      formData.append('pdf', {
        uri: selectedPDFFile.uri,
        type: 'application/pdf',
        name: selectedPDFFile.name || 'document.pdf',
      } as any);
    }
    
    console.log('FormData prepared, making request...');
    
    const response = await fetch(`${API_BASE_URL}/unpaidNotes/${selectedNotes._id}/pdfs`, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Success response:', data);
    
    if (data.success) {
      Alert.alert('Success', 'PDF added to unpaid notes!');
      resetPDFForm();
      setSelectedNotes(data.data);
      loadNotes();
    } else {
      Alert.alert('Error', data.message || 'Failed to add PDF');
    }
  } catch (error) {
    console.error('Error adding PDF:', error);
    Alert.alert('Error', 'Failed to add PDF. Please check your internet connection and try again.');
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
      'Are you sure you want to delete this PDF from the unpaid notes?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const response = await fetch(`${API_BASE_URL}/unpaidNotes/${selectedNotes._id}/pdfs/${pdfId}`, {
                method: 'DELETE',
              });
              
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              
              const data = await response.json();
              
              if (data.success) {
                Alert.alert('Success', 'PDF deleted from unpaid notes!');
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
    if (!notesForm.thumbnailUri && !editingNotes) {
      Alert.alert('Error', 'Thumbnail is required');
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
    if (!selectedPDFFile) {
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
      category: 'jee',
      class: '',
      notesDetails: {
        subtitle: '',
        description: '',
      },
      pdfs: [],
      thumbnailUri: '',
      isActive: true,
    });
    setEditingNotes(null);
  };

  const resetPDFForm = () => {
    setPdfForm({
      pdfTitle: '',
      pdfDescription: '',
      originalName: '',
      fileSize: 0,
      pages: 0,
    });
    setSelectedPDFFile(null);
  };

  const editNotes = (notes: UnpaidNotes) => {
    setNotesForm({
      ...notes,
      notesDetails: notes.notesDetails || { subtitle: '', description: '' },
      pdfs: notes.pdfs || [],
      rating: notes.rating || 0,
      isActive: notes.isActive !== undefined ? notes.isActive : true,
      thumbnailUri: '',
    });
    setEditingNotes(notes);
    setShowAddModal(true);
  };

  const managePDFs = (notes: UnpaidNotes) => {
    setSelectedNotes(notes);
    setShowPDFModal(true);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Render functions
  const renderNotesItem = ({ item }: { item: UnpaidNotes }) => (
    <View style={styles.notesCard}>
      <View style={styles.notesHeader}>
        <View style={styles.notesHeaderLeft}>
          <Text style={styles.notesTitle}>{item.notesTitle || 'Untitled Notes'}</Text>
          <Text style={styles.notesTutor}>by {item.tutor || 'Unknown'}</Text>
        </View>
        <View style={styles.freeContainer}>
          <Text style={styles.freeText}>FREE</Text>
        </View>
      </View>
      
      <View style={styles.notesInfo}>
        <Text style={styles.infoText}>Category: {item.category ? item.category.toUpperCase() : 'N/A'}</Text>
        <Text style={styles.infoText}>Class: {item.class || 'N/A'}</Text>
        <Text style={styles.infoText}>Rating: ⭐ {item.rating || 0}</Text>
        <Text style={styles.infoText}>Views: {item.viewCount || 0}</Text>
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
          <Text style={styles.actionButtonText}>PDFs ({item.pdfs?.length || 0})</Text>
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

  const renderPDFItem = ({ item }: { item: PDF }) => (
    <View style={styles.pdfItem}>
      <View style={styles.pdfContent}>
        <Text style={styles.pdfTitle}>{item.pdfTitle || 'Untitled PDF'}</Text>
        <Text style={styles.pdfDescription}>{item.pdfDescription || 'No description'}</Text>
        <Text style={styles.pdfSize}>Size: {formatFileSize(item.fileSize || 0)}</Text>
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
        
        <Text style={styles.headerTitle}>Unpaid Notes Admin</Text>
        
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
          <Text style={styles.loadingText}>Loading unpaid notes...</Text>
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
              <Text style={styles.emptyText}>No unpaid notes found</Text>
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => setShowAddModal(true)}
              >
                <Text style={styles.createButtonText}>Create Your First Unpaid Notes</Text>
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
              {editingNotes ? 'Edit Unpaid Notes' : 'Add New Unpaid Notes'}
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

            {/* Rating */}
            <View style={styles.inputGroup}>
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
              
              {notesForm.thumbnailUri && (
                <Image
                  source={{ uri: notesForm.thumbnailUri }}
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
                  {editingNotes ? 'Update Unpaid Notes' : 'Create Unpaid Notes'}
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
                  onChangeText={(text) => setPdfForm({ ...pdfForm, pages: parseInt(text) || 0 })}
                  placeholder="Enter number of pages"
                  placeholderTextColor="#666"
                  keyboardType="numeric"
                />
              </View>

              {/* PDF File Upload */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>PDF File *</Text>
                <TouchableOpacity
                  style={styles.pdfUploadButton}
                  onPress={pickPDF}
                >
                  <Text style={styles.pdfUploadButtonText}>
                    {selectedPDFFile ? 'Change PDF File' : 'Select PDF File'}
                  </Text>
                </TouchableOpacity>
                
                {selectedPDFFile && (
                  <View style={styles.filePreview}>
                    <Text style={styles.filePreviewName}>{selectedPDFFile.name}</Text>
                    <Text style={styles.filePreviewSize}>
                      {formatFileSize(selectedPDFFile.size || 0)}
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
                Existing PDFs ({selectedNotes?.pdfs?.length || 0})
              </Text>
              
              {selectedNotes?.pdfs && selectedNotes.pdfs.length > 0 ? (
                <FlatList
                  data={selectedNotes.pdfs}
                  renderItem={renderPDFItem}
                  keyExtractor={(item, index) => item._id || index.toString()}
                  scrollEnabled={false}
                  ItemSeparatorComponent={() => <View style={styles.separator} />}
                />
              ) : (
                <View style={styles.emptyPDFContainer}>
                  <Text style={styles.emptyPDFText}>No PDFs added yet</Text>
                  <Text style={styles.emptyPDFSubtext}>
                    Add your first PDF to get started
                  </Text>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.accentColor,
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
    color: BRAND.primaryColor,
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: BRAND.primaryColor,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: BRAND.backgroundColor,
    fontSize: 14,
    fontWeight: '600',
  },
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
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#666',
    fontSize: 18,
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
  notesCard: {
    backgroundColor: BRAND.accentColor,
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a4a2a',
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
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  notesTutor: {
    color: '#ccc',
    fontSize: 14,
  },
  freeContainer: {
    backgroundColor: BRAND.goldColor,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 12,
  },
  freeText: {
    color: BRAND.backgroundColor,
    fontSize: 12,
    fontWeight: 'bold',
  },
  notesInfo: {
    marginBottom: 12,
  },
  infoText: {
    color: '#aaa',
    fontSize: 12,
    marginBottom: 2,
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
    alignItems: 'center',
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 70,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#4CAF50',
  },
  pdfButton: {
    backgroundColor: '#2196F3',
  },
  deleteButton: {
    backgroundColor: BRAND.errorColor,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
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
    borderBottomWidth: 1,
    borderBottomColor: BRAND.accentColor,
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
    color: BRAND.primaryColor,
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
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
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: BRAND.accentColor,
    borderWidth: 1,
    borderColor: '#2a4a2a',
    borderRadius: 8,
    padding: 12,
    color: 'white',
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  categoryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  categoryButton: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2a4a2a',
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  categoryButtonActive: {
    backgroundColor: BRAND.primaryColor,
    borderColor: BRAND.primaryColor,
  },
  categoryButtonText: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: '600',
  },
  categoryButtonTextActive: {
    color: BRAND.backgroundColor,
  },
  thumbnailButton: {
    backgroundColor: BRAND.accentColor,
    borderWidth: 1,
    borderColor: '#2a4a2a',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  thumbnailButtonText: {
    color: BRAND.primaryColor,
    fontSize: 16,
    fontWeight: '600',
  },
  thumbnailPreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginTop: 12,
  },
  statusButton: {
    padding: 12,
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
    fontSize: 16,
    fontWeight: '600',
  },
  statusButtonTextActive: {
    color: BRAND.backgroundColor,
  },
  statusButtonTextInactive: {
    color: 'white',
  },
  saveButton: {
    backgroundColor: BRAND.primaryColor,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: BRAND.backgroundColor,
    fontSize: 18,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: BRAND.primaryColor,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  pdfUploadButton: {
    backgroundColor: BRAND.accentColor,
    borderWidth: 1,
    borderColor: '#2a4a2a',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  pdfUploadButtonText: {
    color: BRAND.primaryColor,
    fontSize: 16,
    fontWeight: '600',
  },
  filePreview: {
    backgroundColor: '#2a4a2a',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  filePreviewName: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  filePreviewSize: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 4,
  },
  addPDFButton: {
    backgroundColor: BRAND.primaryColor,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  addPDFButtonDisabled: {
    opacity: 0.7,
  },
  addPDFButtonText: {
    color: BRAND.backgroundColor,
    fontSize: 16,
    fontWeight: 'bold',
  },
  pdfItem: {
    backgroundColor: '#2a4a2a',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pdfContent: {
    flex: 1,
  },
  pdfTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  pdfDescription: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 8,
  },
  pdfSize: {
    color: '#aaa',
    fontSize: 12,
  },
  pdfPages: {
    color: '#aaa',
    fontSize: 12,
  },
  pdfActionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 12,
  },
  pdfDeleteButton: {
    backgroundColor: BRAND.errorColor,
  },
  pdfActionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  separator: {
    height: 12,
  },
  emptyPDFContainer: {
    backgroundColor: '#2a4a2a',
    padding: 32,
    borderRadius: 8,
    alignItems: 'center',
  },
  emptyPDFText: {
    color: '#ccc',
    fontSize: 16,
    marginBottom: 8,
  },
  emptyPDFSubtext: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
  },
});
