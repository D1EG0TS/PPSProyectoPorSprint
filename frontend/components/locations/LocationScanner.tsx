import React, { useState } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';

interface LocationScannerProps {
  onScan: (code: string) => void;
  isLoading?: boolean;
}

export const LocationScanner: React.FC<LocationScannerProps> = ({ onScan, isLoading }) => {
  const [code, setCode] = useState('');

  const handleScan = () => {
    if (code.trim()) {
      onScan(code.trim());
      setCode('');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <Ionicons name="barcode-outline" size={24} color={Colors.textSecondary} style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder="Escanear o buscar (código/nombre)..."
          value={code}
          onChangeText={setCode}
          onSubmitEditing={handleScan}
          autoCapitalize="characters"
        />
        {isLoading ? (
          <ActivityIndicator size="small" color={Colors.primary} />
        ) : (
          <TouchableOpacity onPress={handleScan} disabled={!code.trim()}>
            <Ionicons 
              name="arrow-forward-circle" 
              size={32} 
              color={code.trim() ? Colors.primary : Colors.gray} 
            />
          </TouchableOpacity>
        )}
      </View>
      <TouchableOpacity style={styles.cameraButton} onPress={() => alert("Cámara no implementada aún")}>
        <Ionicons name="camera" size={20} color={Colors.white} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
  },
  cameraButton: {
    backgroundColor: Colors.secondary,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
