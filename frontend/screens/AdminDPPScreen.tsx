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
  Platform,
} from 'react-native';
import { API_BASE } from '../config/api';
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
interface DPP {
  _id?: string;
  title: string;
  class: string;
  category: 'jee' | 'neet' | 'boards';
  questionPDF: {
    originalName: string;
    fileSize: number;
    pages: number;
    uploadedAt: string;
  };
  answerPDF?: {
    originalName: string;
    fileSize: number;
    pages: number;
    uploadedAt: string;
  };
  questionActive: boolean;
  answerActive: boolean;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

interface AdminDPPScreenProps {
  navigation?: any;
  onBack?: () => void;
}

export default function AdminDPPScreen({ 
  navigation, 
  onBack 
}: AdminDPPScreenProps) {
  // State
  const [dpps, setDpps] = useState<DPP[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingDPP, setEditingDPP] = useState<DPP | null>(null);

  // Form state
  const [dppForm, setDppForm] = useState({
    title: '',
    class: '',
    category: 'jee' as 'jee' | 'neet' | 'boards',
    questionActive: true,
    answerActive: false,
    questionPages: 0,
    answerPages: 0,
  });

  // File state
  const [selectedQuestionPDF, setSelectedQuestionPDF] = useState<any>(null);
  const [selectedAnswerPDF, setSelectedAnswerPDF] = useState<any>(null);

  // Load DPPs on mount
  useEffect(() => {
    loadDPPs();
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

  // PDF picker function
  const pickQuestionPDF = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const pdfFile = result.assets[0];
        setSelectedQuestionPDF(pdfFile);
      }
    } catch (error) {
      console.error('Error picking question PDF:', error);
      Alert.alert('Error', 'Failed to pick question PDF file');
    }
  };

  const pickAnswerPDF = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const pdfFile = result.assets[0];
        setSelectedAnswerPDF(pdfFile);
      }
    } catch (error) {
      console.error('Error picking answer PDF:', error);
      Alert.alert('Error', 'Failed to pick answer PDF file');
    }
  };

  // API functions
  const loadDPPs = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/dpp`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setDpps(data.data || []);
      } else {
        Alert.alert('Error', data.message || 'Failed to load DPPs');
      }
    } catch (error) {
      console.error('Error loading DPPs:', error);
      Alert.alert('Error', 'Failed to load DPPs. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const saveDPP = async () => {
    try {
      if (!validateDPP()) return;
      
      setLoading(true);
      const url = editingDPP 
        ? `${API_BASE_URL}/dpp/${editingDPP._id}`
        : `${API_BASE_URL}/dpp`;
      
      const method = editingDPP ? 'PUT' : 'POST';
      
      const formData = new FormData();
      
      // Add text fields
      formData.append('title', dppForm.title.trim());
      formData.append('class', dppForm.class.trim());
      formData.append('category', dppForm.category);
      formData.append('questionActive', dppForm.questionActive.toString());
      formData.append('answerActive', dppForm.answerActive.toString());
      formData.append('questionPages', dppForm.questionPages.toString());
      formData.append('answerPages', dppForm.answerPages.toString());
      
      // Add question PDF file (required for new DPP)
      if (selectedQuestionPDF) {
        formData.append('questionPDF', {
          uri: selectedQuestionPDF.uri,
          type: 'application/pdf',
          name: selectedQuestionPDF.name || 'question.pdf',
        } as any);
      }
      
      // Add answer PDF file (optional)
      if (selectedAnswerPDF) {
        formData.append('answerPDF', {
          uri: selectedAnswerPDF.uri,
          type: 'application/pdf',
          name: selectedAnswerPDF.name || 'answer.pdf',
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
        Alert.alert('Success', editingDPP ? 'DPP updated successfully!' : 'DPP created successfully!');
        resetForm();
        setShowModal(false);
        loadDPPs();
      } else {
        Alert.alert('Error', data.message || 'Failed to save DPP');
      }
    } catch (error) {
      console.error('Error saving DPP:', error);
      Alert.alert('Error', 'Failed to save DPP. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const deleteDPP = async (dppId: string) => {
    if (!dppId) {
      Alert.alert('Error', 'DPP ID is required');
      return;
    }

    Alert.alert(
      'Delete DPP',
      'Are you sure you want to delete this DPP? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const response = await fetch(`${API_BASE_URL}/dpp/${dppId}`, {
                method: 'DELETE',
              });
              
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              
              const data = await response.json();
              
              if (data.success) {
                Alert.alert('Success', 'DPP deleted successfully!');
                loadDPPs();
              } else {
                Alert.alert('Error', data.message || 'Failed to delete DPP');
              }
            } catch (error) {
              console.error('Error deleting DPP:', error);
              Alert.alert('Error', 'Failed to delete DPP. Please check your internet connection.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const toggleAnswerAccessibility = async (dppId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/dpp/${dppId}/toggle-answer`, {
        method: 'PATCH',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        Alert.alert('Success', data.message);
        loadDPPs();
      } else {
        Alert.alert('Error', data.message || 'Failed to toggle answer accessibility');
      }
    } catch (error) {
      console.error('Error toggling answer accessibility:', error);
      Alert.alert('Error', 'Failed to toggle answer accessibility.');
    } finally {
      setLoading(false);
    }
  };

  // Validation functions
  const validateDPP = () => {
    if (!dppForm.title.trim()) {
      Alert.alert('Error', 'Title is required');
      return false;
    }
    if (!dppForm.class.trim()) {
      Alert.alert('Error', 'Class is required');
      return false;
    }
    if (!editingDPP && !selectedQuestionPDF) {
      Alert.alert('Error', 'Question PDF is required');
      return false;
    }
    return true;
  };

  // Helper functions
  const resetForm = () => {
    setDppForm({
      title: '',
      class: '',
      category: 'jee',
      questionActive: true,
      answerActive: false,
      questionPages: 0,
      answerPages: 0,
    });
    setSelectedQuestionPDF(null);
    setSelectedAnswerPDF(null);
    setEditingDPP(null);
  };

  const editDPP = (dpp: DPP) => {
    setDppForm({
      title: dpp.title,
      class: dpp.class,
      category: dpp.category,
      questionActive: dpp.questionActive,
      answerActive: dpp.answerActive,
      questionPages: dpp.questionPDF.pages || 0,
      answerPages: dpp.answerPDF?.pages || 0,
    });
    setEditingDPP(dpp);
    setSelectedQuestionPDF(null);
    setSelectedAnswerPDF(null);
    setShowModal(true);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  // Render functions
  const renderDPPItem = ({ item }: { item: DPP }) => (
    <View style={styles.dppCard}>
      <View style={styles.dppHeader}>
        <View style={styles.dppHeaderLeft}>
          <Text style={styles.dppTitle}>{item.title}</Text>
          <Text style={styles.dppClass}>Class: {item.class}</Text>
        </View>
        <View style={styles.categoryBadgeContainer}>
          <Text style={styles.categoryText}>{item.category.toUpperCase()}</Text>
        </View>
      </View>
      
      <View style={styles.dppInfo}>
        <Text style={styles.infoText}>Views: {item.viewCount || 0}</Text>
        <Text style={styles.infoText}>Created: {formatDate(item.createdAt)}</Text>
        <Text style={[styles.infoText, { color: item.questionActive ? BRAND.primaryColor : BRAND.errorColor }]}>
          Question: {item.questionActive ? 'Active' : 'Inactive'}
        </Text>
        <Text style={[styles.infoText, { color: item.answerActive ? BRAND.primaryColor : BRAND.errorColor }]}>
          Answer: {item.answerActive ? 'Active' : 'Inactive'}
        </Text>
      </View>

      <View style={styles.pdfInfo}>
        <Text style={styles.pdfInfoTitle}>Files:</Text>
        <Text style={styles.pdfInfoText}>
          Question: {item.questionPDF.originalName} ({formatFileSize(item.questionPDF.fileSize)})
        </Text>
        {item.answerPDF && (
          <Text style={styles.pdfInfoText}>
            Answer: {item.answerPDF.originalName} ({formatFileSize(item.answerPDF.fileSize)})
          </Text>
        )}
      </View>
      
      <View style={styles.dppActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => editDPP(item)}
        >
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.toggleButton]}
          onPress={() => item._id && toggleAnswerAccessibility(item._id)}
        >
          <Text style={styles.actionButtonText}>
            {item.answerActive ? 'Hide Answer' : 'Show Answer'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => item._id && deleteDPP(item._id)}
        >
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
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
        
        <Text style={styles.headerTitle}>DPP Admin</Text>
        
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowModal(true)}
        >
          <Text style={styles.addButtonText}>+ Add DPP</Text>
        </TouchableOpacity>
      </View>

      {/* DPP List */}
      {loading && dpps.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BRAND.primaryColor} />
          <Text style={styles.loadingText}>Loading DPPs...</Text>
        </View>
      ) : (
        <FlatList
          data={dpps}
          renderItem={renderDPPItem}
          keyExtractor={(item, index) => item._id || index.toString()}
          contentContainerStyle={styles.listContainer}
          refreshing={loading}
          onRefresh={loadDPPs}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No DPPs found</Text>
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => setShowModal(true)}
              >
                <Text style={styles.createButtonText}>Create Your First DPP</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Add/Edit DPP Modal */}
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
              {editingDPP ? 'Edit DPP' : 'Add New DPP'}
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowModal(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Title */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Title *</Text>
              <TextInput
                style={styles.textInput}
                value={dppForm.title}
                onChangeText={(text) => setDppForm({ ...dppForm, title: text })}
                placeholder="Enter DPP title"
                placeholderTextColor="#666"
              />
            </View>

            {/* Class */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Class *</Text>
              <TextInput
                style={styles.textInput}
                value={dppForm.class}
                onChangeText={(text) => setDppForm({ ...dppForm, class: text })}
                placeholder="e.g., 11, 12"
                placeholderTextColor="#666"
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
                      dppForm.category === cat && styles.categoryButtonActive,
                    ]}
                    onPress={() => setDppForm({ ...dppForm, category: cat })}
                  >
                    <Text
                      style={[
                        styles.categoryButtonText,
                        dppForm.category === cat && styles.categoryButtonTextActive,
                      ]}
                    >
                      {cat.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Question PDF Upload */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Question PDF *</Text>
              <TouchableOpacity
                style={styles.pdfUploadButton}
                onPress={pickQuestionPDF}
              >
                <Text style={styles.pdfUploadButtonText}>
                  {selectedQuestionPDF ? 'Change Question PDF' : 'Select Question PDF'}
                </Text>
              </TouchableOpacity>
              
              {selectedQuestionPDF && (
                <View style={styles.filePreview}>
                  <Text style={styles.filePreviewName}>{selectedQuestionPDF.name}</Text>
                  <Text style={styles.filePreviewSize}>
                    {formatFileSize(selectedQuestionPDF.size || 0)}
                  </Text>
                </View>
              )}
              
              {editingDPP && !selectedQuestionPDF && (
                <View style={styles.existingFileInfo}>
                  <Text style={styles.existingFileText}>
                    Current: {editingDPP.questionPDF.originalName}
                  </Text>
                </View>
              )}
            </View>

            {/* Question Pages */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Question Pages</Text>
              <TextInput
                style={styles.textInput}
                value={dppForm.questionPages.toString()}
                onChangeText={(text) => setDppForm({ ...dppForm, questionPages: parseInt(text) || 0 })}
                placeholder="Number of pages"
                placeholderTextColor="#666"
                keyboardType="numeric"
              />
            </View>

            {/* Answer PDF Upload */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Answer PDF (Optional)</Text>
              <TouchableOpacity
                style={styles.pdfUploadButton}
                onPress={pickAnswerPDF}
              >
                <Text style={styles.pdfUploadButtonText}>
                  {selectedAnswerPDF ? 'Change Answer PDF' : 'Select Answer PDF'}
                </Text>
              </TouchableOpacity>
              
              {selectedAnswerPDF && (
                <View style={styles.filePreview}>
                  <Text style={styles.filePreviewName}>{selectedAnswerPDF.name}</Text>
                  <Text style={styles.filePreviewSize}>
                    {formatFileSize(selectedAnswerPDF.size || 0)}
                  </Text>
                </View>
              )}
              
              {editingDPP && editingDPP.answerPDF && !selectedAnswerPDF && (
                <View style={styles.existingFileInfo}>
                  <Text style={styles.existingFileText}>
                    Current: {editingDPP.answerPDF.originalName}
                  </Text>
                </View>
              )}
            </View>

            {/* Answer Pages */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Answer Pages</Text>
              <TextInput
                style={styles.textInput}
                value={dppForm.answerPages.toString()}
                onChangeText={(text) => setDppForm({ ...dppForm, answerPages: parseInt(text) || 0 })}
                placeholder="Number of pages"
                placeholderTextColor="#666"
                keyboardType="numeric"
              />
            </View>

            {/* Question Active Status */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Question Status</Text>
              <TouchableOpacity
                style={[
                  styles.statusButton,
                  dppForm.questionActive ? styles.statusButtonActive : styles.statusButtonInactive
                ]}
                onPress={() => setDppForm({ ...dppForm, questionActive: !dppForm.questionActive })}
              >
                <Text style={[
                  styles.statusButtonText,
                  dppForm.questionActive ? styles.statusButtonTextActive : styles.statusButtonTextInactive
                ]}>
                  {dppForm.questionActive ? '✓ Active' : '✕ Inactive'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Answer Active Status */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Answer Status</Text>
              <TouchableOpacity
                style={[
                  styles.statusButton,
                  dppForm.answerActive ? styles.statusButtonActive : styles.statusButtonInactive
                ]}
                onPress={() => setDppForm({ ...dppForm, answerActive: !dppForm.answerActive })}
              >
                <Text style={[
                  styles.statusButtonText,
                  dppForm.answerActive ? styles.statusButtonTextActive : styles.statusButtonTextInactive
                ]}>
                  {dppForm.answerActive ? '✓ Active' : '✕ Inactive'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveButton, loading && styles.saveButtonDisabled]}
              onPress={saveDPP}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={BRAND.backgroundColor} />
              ) : (
                <Text style={styles.saveButtonText}>
                  {editingDPP ? 'Update DPP' : 'Create DPP'}
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
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.accentColor,
  },
  backButton: {
    padding: 10,
  },
  backButtonText: {
    color: BRAND.primaryColor,
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    color: BRAND.primaryColor,
    fontSize: 20,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: BRAND.primaryColor,
    paddingHorizontal: 15,
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
    color: BRAND.primaryColor,
    fontSize: 16,
    marginTop: 10,
  },
  listContainer: {
    padding: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
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
    color: BRAND.backgroundColor,
    fontSize: 16,
    fontWeight: '600',
  },
  dppCard: {
    backgroundColor: BRAND.accentColor,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#2a4a2a',
  },
  dppHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  dppHeaderLeft: {
    flex: 1,
  },
  dppTitle: {
    color: BRAND.primaryColor,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  dppClass: {
    color: '#ccc',
    fontSize: 14,
  },
  categoryBadgeContainer: {
    backgroundColor: BRAND.primaryColor,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    color: BRAND.backgroundColor,
    fontSize: 12,
    fontWeight: 'bold',
  },
  dppInfo: {
    marginBottom: 10,
  },
  infoText: {
    color: '#999',
    fontSize: 12,
    marginBottom: 2,
  },
  pdfInfo: {
    backgroundColor: '#1a3a1a',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  pdfInfoTitle: {
    color: BRAND.primaryColor,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
  },
  pdfInfoText: {
    color: '#ccc',
    fontSize: 12,
    marginBottom: 2,
  },
  dppActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  editButton: {
    backgroundColor: '#4a9eff',
  },
  toggleButton: {
    backgroundColor: BRAND.warningColor,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.accentColor,
  },
  modalBackButton: {
    padding: 10,
  },
  modalBackButtonText: {
    color: BRAND.primaryColor,
    fontSize: 16,
    fontWeight: '600',
  },
  modalTitle: {
    color: BRAND.primaryColor,
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 10,
  },
  closeButtonText: {
    color: BRAND.errorColor,
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
    padding: 20,
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
    color: 'white',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#2a4a2a',
  },
  categoryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  categoryButton: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: BRAND.accentColor,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a4a2a',
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
  pdfUploadButton: {
    backgroundColor: BRAND.accentColor,
    borderWidth: 2,
    borderColor: BRAND.primaryColor,
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 20,
    paddingHorizontal: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  pdfUploadButtonText: {
    color: BRAND.primaryColor,
    fontSize: 16,
    fontWeight: '600',
  },
  filePreview: {
    backgroundColor: '#1a3a1a',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: BRAND.primaryColor,
  },
  filePreviewName: {
    color: BRAND.primaryColor,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  filePreviewSize: {
    color: '#999',
    fontSize: 12,
  },
  existingFileInfo: {
    backgroundColor: '#2a2a1a',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: BRAND.goldColor,
  },
  existingFileText: {
    color: BRAND.goldColor,
    fontSize: 14,
    fontWeight: '500',
  },
  statusButton: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
  },
  statusButtonActive: {
    backgroundColor: BRAND.primaryColor,
    borderColor: BRAND.primaryColor,
  },
  statusButtonInactive: {
    backgroundColor: BRAND.accentColor,
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
    color: BRAND.errorColor,
  },
  saveButton: {
    backgroundColor: BRAND.primaryColor,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 20,
  },
  saveButtonDisabled: {
    backgroundColor: '#666',
    opacity: 0.6,
  },
  saveButtonText: {
    color: BRAND.backgroundColor,
    fontSize: 18,
    fontWeight: 'bold',
  },
});
