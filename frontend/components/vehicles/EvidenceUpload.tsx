import React, { useState } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Button, Text, HelperText, ActivityIndicator } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';

interface EvidenceUploadProps {
  onUploadComplete: (evidenceId: string) => void;
  label?: string;
  error?: string;
}

const EvidenceUpload: React.FC<EvidenceUploadProps> = ({ onUploadComplete, label = "Evidence (Photo/PDF)", error }) => {
  const [loading, setLoading] = useState(false);
  const [uploadedId, setUploadedId] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);

  const pickImage = async () => {
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled) {
        const uri = result.assets[0].uri;
        setImageUri(uri);
        handleUpload(uri);
      }
    } catch (e) {
      console.error("Error picking image:", e);
    }
  };

  const handleUpload = (uri: string) => {
    // Simulate upload process
    setLoading(true);
    setTimeout(() => {
      const mockId = `EV-${Math.floor(Math.random() * 10000)}`;
      setUploadedId(mockId);
      onUploadComplete(mockId);
      setLoading(false);
    }, 1500);
  };

  const reset = () => {
    setUploadedId(null);
    setImageUri(null);
  };

  return (
    <View style={styles.container}>
      <Text variant="bodyMedium" style={styles.label}>{label}</Text>
      
      {imageUri && (
          <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
      )}

      {!uploadedId ? (
        <Button 
          mode="outlined" 
          onPress={pickImage} 
          icon="camera" 
          disabled={loading}
        >
          {loading ? "Uploading..." : "Select Image"}
        </Button>
      ) : (
        <View style={styles.successContainer}>
          <Text style={styles.successText}>Uploaded: {uploadedId}</Text>
          <Button mode="text" onPress={reset}>Change</Button>
        </View>
      )}

      {loading && <ActivityIndicator style={styles.loader} animating={true} />}
      
      {error && (
        <HelperText type="error" visible={!!error}>
          {error}
        </HelperText>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  label: {
    marginBottom: 4,
    fontWeight: 'bold',
  },
  preview: {
    width: '100%',
    height: 200,
    marginBottom: 10,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  loader: {
    marginTop: 8,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    backgroundColor: '#e8f5e9',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#c8e6c9',
  },
  successText: {
    color: '#2e7d32',
  },
});

export default EvidenceUpload;
