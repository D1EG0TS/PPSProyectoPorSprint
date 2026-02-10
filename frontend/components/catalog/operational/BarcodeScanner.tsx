import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, Dimensions } from 'react-native';
import { Modal, Portal, Button, IconButton } from 'react-native-paper';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { Colors } from '../../../constants/Colors';

interface BarcodeScannerProps {
  visible: boolean;
  onDismiss: () => void;
  onScan: (data: string) => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ visible, onDismiss, onScan }) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (visible) {
      setScanned(false);
      (async () => {
        const { status } = await BarCodeScanner.requestPermissionsAsync();
        setHasPermission(status === 'granted');
      })();
    }
  }, [visible]);

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    setScanned(true);
    onScan(data);
    // Optional: wait a bit before closing or let parent close
    // onDismiss(); // Usually parent handles this or we wait for confirmation
  };

  if (!visible) return null;

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.container}>
        <View style={styles.scannerContainer}>
          {hasPermission === null ? (
            <Text style={styles.text}>Requesting for camera permission</Text>
          ) : hasPermission === false ? (
            <Text style={styles.text}>No access to camera</Text>
          ) : (
            <View style={styles.cameraWrapper}>
              <BarCodeScanner
                onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={styles.overlay}>
                <View style={styles.scanArea} />
              </View>
            </View>
          )}
          
          <IconButton 
            icon="close-circle" 
            size={40} 
            iconColor="white" 
            style={styles.closeButton} 
            onPress={onDismiss} 
          />
        </View>
      </Modal>
    </Portal>
  );
};

const { width, height } = Dimensions.get('window');
const scanSize = width * 0.7;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    margin: 0,
    justifyContent: 'center',
  },
  scannerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  text: {
    color: 'white',
    fontSize: 16,
  },
  cameraWrapper: {
    width: width,
    height: height,
    overflow: 'hidden',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  scanArea: {
    width: scanSize,
    height: scanSize,
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: 'transparent',
  },
  closeButton: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
  }
});
