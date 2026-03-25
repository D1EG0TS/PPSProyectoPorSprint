import React, { useState, useRef } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Platform } from 'react-native';
import { Text, IconButton, Surface, useTheme } from 'react-native-paper';
import { Colors } from '../../constants/Colors';

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  onClear?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export function BarcodeScanner({ 
  onScan, 
  onClear, 
  disabled = false,
  placeholder = 'Escanea o escribe el código...'
}: BarcodeScannerProps) {
  const [code, setCode] = useState('');
  const inputRef = useRef<TextInput>(null);
  const theme = useTheme();

  const handleSubmit = () => {
    if (code.trim()) {
      onScan(code.trim());
    }
  };

  const handleClear = () => {
    setCode('');
    onClear?.();
    inputRef.current?.focus();
  };

  return (
    <Surface style={styles.container} elevation={1}>
      <View style={styles.inputRow}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={code}
          onChangeText={setCode}
          placeholder={placeholder}
          placeholderTextColor={Colors.gray}
          editable={!disabled}
          onSubmitEditing={handleSubmit}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {code.length > 0 && (
          <IconButton
            icon="close-circle"
            size={24}
            onPress={handleClear}
            disabled={disabled}
          />
        )}
      </View>
      
      <View style={styles.actions}>
        <TouchableOpacity 
          style={[styles.scanButton, disabled && styles.scanButtonDisabled]} 
          onPress={handleSubmit}
          disabled={disabled || !code.trim()}
        >
          <IconButton 
            icon="barcode-scan" 
            size={28} 
            iconColor={Colors.white}
          />
          <Text style={styles.scanButtonText}>Buscar</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.cameraButton}
          onPress={() => {
            // TODO: Implement camera scanning with expo-camera
          }}
          disabled={disabled}
        >
          <IconButton 
            icon="camera" 
            size={28} 
            iconColor={Colors.primary}
          />
          <Text style={styles.cameraButtonText}>Cámara</Text>
        </TouchableOpacity>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: Colors.text,
  },
  actions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 12,
  },
  scanButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  scanButtonDisabled: {
    opacity: 0.5,
  },
  scanButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  cameraButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  cameraButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
