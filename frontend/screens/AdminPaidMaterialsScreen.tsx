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
interface MaterialPhoto {
  _id?: string;
  originalName: string;
  mimeType: string;
  size: number;
}

interface PaidMaterial {
  _id?: string;
  materialTitle: string;
  description: string;
  price: number;
  category: 'jee' | 'neet' | 'boards';
  class: string;
  rating: number;
  materialPhotos: MaterialPhoto[];
  isActive: boolean;
  viewCount?: number;
  createdAt?: string;
}

interface AdminPaidMaterialsScreenProps {
  navigation?: any;
  onBack?: () => void;
}

export default function AdminPaidMaterialsScreen({ 
  navigation, 
  onBack 
}: AdminPaidMaterialsScreenProps) {
  // State
  const [materials, setMaterials] = useState<PaidMaterial[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<PaidMaterial | null>(null);

  // Form state
  const [materialForm, setMaterialForm] = useState<PaidMaterial>({
    materialTitle: '',
    description: '',
    price: 0,
    category: 'jee',
    class: '',
    rating: 0,
    materialPhotos: [],
    isActive: true,
  });

  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  // Load materials on mount
  useEffect(() => {
    loadMaterials();
    requestPermissions();
  }, []);

  // Request permissions
  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant media library permissions to upload photos.');
      }
    }
  };

  // Image picker function
  const pickImages = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        allowsEditing: false,
        quality: 0.8,
        selectionLimit: 10,
      });

      if (!result.canceled && result.assets) {
        const imageUris = result.assets.map(asset => asset.uri);
        setSelectedImages([...selectedImages, ...imageUris]);
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert('Error', 'Failed to pick images');
    }
  };

  // Remove image from selection
  const removeImage = (index: number) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    setSelectedImages(newImages);
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
  const loadMaterials = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/paidMaterials`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setMaterials(data.data || []);
      } else {
        Alert.alert('Error', data.message || 'Failed to load materials');
      }
    } catch (error) {
      console.error('Error loading materials:', error);
      Alert.alert('Error', 'Failed to load materials. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const saveMaterial = async () => {
    try {
      if (!validateMaterial()) return;
      
      setLoading(true);
      const url = editingMaterial 
        ? `${API_BASE_URL}/paidMaterials/${editingMaterial._id}`
        : `${API_BASE_URL}/paidMaterials`;
      
      const method = editingMaterial ? 'PUT' : 'POST';
      
      const formData = new FormData();
      
      // Add text fields
      formData.append('materialTitle', materialForm.materialTitle);
      formData.append('description', materialForm.description);
      formData.append('price', materialForm.price.toString());
      formData.append('category', materialForm.category);
      formData.append('class', materialForm.class);
      formData.append('rating', materialForm.rating.toString());
      formData.append('isActive', materialForm.isActive.toString());
      
      // Add photos if selected
      if (selectedImages.length > 0) {
        selectedImages.forEach((imageUri, index) => {
          const filename = imageUri.split('/').pop() || `photo_${index}.jpg`;
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : 'image/jpeg';
          
          formData.append('photos', {
            uri: imageUri,
            type: type,
            name: filename,
          } as any);
        });
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
        Alert.alert('Success', editingMaterial ? 'Material updated!' : 'Material created!');
        resetForm();
        setShowModal(false);
        loadMaterials();
      } else {
        Alert.alert('Error', data.message || 'Failed to save material');
      }
    } catch (error) {
      console.error('Error saving material:', error);
      Alert.alert('Error', 'Failed to save material. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const deleteMaterial = async (materialId: string) => {
    if (!materialId) {
      Alert.alert('Error', 'Material ID is required');
      return;
    }

    Alert.alert(
      'Delete Material',
      'Are you sure you want to delete this material? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const response = await fetch(`${API_BASE_URL}/paidMaterials/${materialId}`, {
                method: 'DELETE',
              });
              
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              
              const data = await response.json();
              
              if (data.success) {
                Alert.alert('Success', 'Material deleted!');
                loadMaterials();
              } else {
                Alert.alert('Error', data.message || 'Failed to delete material');
              }
            } catch (error) {
              console.error('Error deleting material:', error);
              Alert.alert('Error', 'Failed to delete material. Please check your internet connection.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // Validation functions
  const validateMaterial = () => {
    if (!materialForm.materialTitle?.trim()) {
      Alert.alert('Error', 'Material title is required');
      return false;
    }
    if (!materialForm.description?.trim()) {
      Alert.alert('Error', 'Description is required');
      return false;
    }
    if (!materialForm.class?.trim()) {
      Alert.alert('Error', 'Class is required');
      return false;
    }
    if (materialForm.price <= 0) {
      Alert.alert('Error', 'Price must be greater than 0');
      return false;
    }
    if (materialForm.rating < 0 || materialForm.rating > 5) {
      Alert.alert('Error', 'Rating must be between 0 and 5');
      return false;
    }
    if (selectedImages.length === 0 && !editingMaterial) {
      Alert.alert('Error', 'At least one photo is required');
      return false;
    }
    return true;
  };

  // Helper functions
  const resetForm = () => {
    setMaterialForm({
      materialTitle: '',
      description: '',
      price: 0,
      category: 'jee',
      class: '',
      rating: 0,
      materialPhotos: [],
      isActive: true,
    });
    setSelectedImages([]);
    setEditingMaterial(null);
  };

  const editMaterial = (material: PaidMaterial) => {
    setMaterialForm({
      ...material,
      materialPhotos: material.materialPhotos || [],
      rating: material.rating || 0,
      price: material.price || 0,
      isActive: material.isActive !== undefined ? material.isActive : true,
    });
    setSelectedImages([]);
    setEditingMaterial(material);
    setShowModal(true);
  };

  const formatPrice = (price: number) => {
    return `₹${price.toLocaleString('en-IN')}`;
  };

  // Render functions
  const renderMaterialItem = ({ item }: { item: PaidMaterial }) => (
    <View style={styles.materialCard}>
      <View style={styles.materialHeader}>
        <View style={styles.materialHeaderLeft}>
          <Text style={styles.materialTitle}>{item.materialTitle || 'Untitled Material'}</Text>
          <Text style={styles.materialDescription} numberOfLines={2}>
            {item.description || 'No description'}
          </Text>
        </View>
        <View style={styles.priceContainer}>
          <Text style={styles.priceText}>{formatPrice(item.price || 0)}</Text>
        </View>
      </View>
      
      <View style={styles.materialInfo}>
        <Text style={styles.infoText}>Category: {item.category ? item.category.toUpperCase() : 'N/A'}</Text>
        <Text style={styles.infoText}>Class: {item.class || 'N/A'}</Text>
        <Text style={styles.infoText}>Rating: ⭐ {item.rating || 0}</Text>
        <Text style={styles.infoText}>Views: {item.viewCount || 0}</Text>
        <Text style={styles.infoText}>Photos: {item.materialPhotos?.length || 0}</Text>
        <Text style={[styles.infoText, { color: item.isActive ? BRAND.primaryColor : BRAND.errorColor }]}>
          {item.isActive ? 'Active' : 'Inactive'}
        </Text>
      </View>
      
      <View style={styles.materialActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => editMaterial(item)}
        >
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => item._id && deleteMaterial(item._id)}
        >
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSelectedImage = ({ item, index }: { item: string, index: number }) => (
    <View style={styles.selectedImageContainer}>
      <Image source={{ uri: item }} style={styles.selectedImage} />
      <TouchableOpacity
        style={styles.removeImageButton}
        onPress={() => removeImage(index)}
      >
        <Text style={styles.removeImageText}>✕</Text>
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
        
        <Text style={styles.headerTitle}>Paid Materials Admin</Text>
        
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowModal(true)}
        >
          <Text style={styles.addButtonText}>+ Add Material</Text>
        </TouchableOpacity>
      </View>

      {/* Materials List */}
      {loading && materials.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BRAND.primaryColor} />
          <Text style={styles.loadingText}>Loading materials...</Text>
        </View>
      ) : (
        <FlatList
          data={materials}
          renderItem={renderMaterialItem}
          keyExtractor={(item, index) => item._id || index.toString()}
          contentContainerStyle={styles.listContainer}
          refreshing={loading}
          onRefresh={loadMaterials}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No materials found</Text>
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => setShowModal(true)}
              >
                <Text style={styles.createButtonText}>Create Your First Material</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Add/Edit Material Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalBackButton}
              onPress={() => setShowModal(false)}
            >
              <Text style={styles.modalBackButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingMaterial ? 'Edit Material' : 'Add New Material'}
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowModal(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Material Title */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Material Title *</Text>
              <TextInput
                style={styles.textInput}
                value={materialForm.materialTitle || ''}
                onChangeText={(text) => setMaterialForm({ ...materialForm, materialTitle: text })}
                placeholder="Enter material title"
                placeholderTextColor="#666"
              />
            </View>

            {/* Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description *</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={materialForm.description || ''}
                onChangeText={(text) => setMaterialForm({ ...materialForm, description: text })}
                placeholder="Enter material description"
                placeholderTextColor="#666"
                multiline
                numberOfLines={4}
              />
            </View>

            {/* Price */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Price (₹) *</Text>
              <TextInput
                style={styles.textInput}
                value={materialForm.price?.toString() || '0'}
                onChangeText={(text) => {
                  const price = parseFloat(text) || 0;
                  setMaterialForm({ ...materialForm, price: Math.max(price, 0) });
                }}
                placeholder="0"
                placeholderTextColor="#666"
                keyboardType="numeric"
              />
            </View>

            {/* Rating */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Rating (0-5)</Text>
              <TextInput
                style={styles.textInput}
                value={materialForm.rating?.toString() || '0'}
                onChangeText={(text) => {
                  const rating = parseFloat(text) || 0;
                  setMaterialForm({ ...materialForm, rating: Math.min(Math.max(rating, 0), 5) });
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
                      materialForm.category === cat && styles.categoryButtonActive,
                    ]}
                    onPress={() => setMaterialForm({ ...materialForm, category: cat })}
                  >
                    <Text
                      style={[
                        styles.categoryButtonText,
                        materialForm.category === cat && styles.categoryButtonTextActive,
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
                value={materialForm.class || ''}
                onChangeText={(text) => setMaterialForm({ ...materialForm, class: text })}
                placeholder="e.g., 11, 12"
                placeholderTextColor="#666"
              />
            </View>

            {/* Photo Upload */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Material Photos *</Text>
              <TouchableOpacity
                style={styles.photoButton}
                onPress={pickImages}
              >
                <Text style={styles.photoButtonText}>
                  {selectedImages.length > 0 ? `Add More Photos (${selectedImages.length})` : 'Select Photos'}
                </Text>
              </TouchableOpacity>
              
              {selectedImages.length > 0 && (
                <FlatList
                  data={selectedImages}
                  renderItem={renderSelectedImage}
                  keyExtractor={(item, index) => index.toString()}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.selectedImagesList}
                />
              )}
            </View>

            {/* Active Status */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Material Status</Text>
              <TouchableOpacity
                style={[
                  styles.statusButton,
                  materialForm.isActive ? styles.statusButtonActive : styles.statusButtonInactive
                ]}
                onPress={() => setMaterialForm({ ...materialForm, isActive: !materialForm.isActive })}
              >
                <Text style={[
                  styles.statusButtonText,
                  materialForm.isActive ? styles.statusButtonTextActive : styles.statusButtonTextInactive
                ]}>
                  {materialForm.isActive ? '✓ Active' : '✕ Inactive'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveButton, loading && styles.saveButtonDisabled]}
              onPress={saveMaterial}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={BRAND.backgroundColor} />
              ) : (
                <Text style={styles.saveButtonText}>
                  {editingMaterial ? 'Update Material' : 'Create Material'}
                </Text>
              )}
            </TouchableOpacity>
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
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 16,
  },
  listContainer: {
    padding: 16,
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
    marginBottom: 16,
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
  materialCard: {
    backgroundColor: BRAND.accentColor,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  materialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  materialHeaderLeft: {
    flex: 1,
    marginRight: 12,
  },
  materialTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  materialDescription: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
  },
  priceContainer: {
    backgroundColor: BRAND.primaryColor,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  priceText: {
    color: BRAND.backgroundColor,
    fontSize: 16,
    fontWeight: 'bold',
  },
  materialInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
  },
  infoText: {
    color: '#999',
    fontSize: 12,
  },
  materialActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: BRAND.warningColor,
  },
  deleteButton: {
    backgroundColor: BRAND.errorColor,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: BRAND.backgroundColor,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    color: '#fff',
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
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: BRAND.accentColor,
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  categoryContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  categoryButton: {
    backgroundColor: BRAND.accentColor,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#333',
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
    color: BRAND.backgroundColor,
  },
  photoButton: {
    backgroundColor: BRAND.accentColor,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  photoButtonText: {
    color: BRAND.primaryColor,
    fontSize: 16,
    fontWeight: '600',
  },
  selectedImagesList: {
    marginTop: 12,
  },
  selectedImageContainer: {
    marginRight: 12,
    position: 'relative',
  },
  selectedImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: BRAND.errorColor,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  statusButtonActive: {
    backgroundColor: BRAND.primaryColor,
  },
  statusButtonInactive: {
    backgroundColor: BRAND.errorColor,
  },
  statusButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusButtonTextActive: {
    color: BRAND.backgroundColor,
  },
  statusButtonTextInactive: {
    color: '#fff',
  },
  saveButton: {
    backgroundColor: BRAND.primaryColor,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  saveButtonDisabled: {
    backgroundColor: '#666',
  },
  saveButtonText: {
    color: BRAND.backgroundColor,
    fontSize: 16,
    fontWeight: 'bold',
  },
});