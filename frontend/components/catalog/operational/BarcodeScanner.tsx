import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, Dimensions } from 'react-native';
import { Modal, Portal, Button, IconButton } from 'react-native-paper';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Colors } from '../../../constants/Colors';

interface BarcodeScannerProps {
  visible: boolean;
  onDismiss: () => void;
  onScan: (data: string) => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ visible, onDismiss, onScan }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (visible && permission && !permission.granted) {
      requestPermission();
    }
    if (visible) {
      setScanned(false);
    }
  }, [visible, permission]);

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (scanned) return;
    setScanned(true);
    onScan(data);
  };

  if (!visible) return null;

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.container}>
        <View style={styles.scannerContainer}>
          {!permission ? (
            <Text style={styles.text}>Requesting for camera permission</Text>
          ) : !permission.granted ? (
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.text}>No access to camera</Text>
              <Button mode="contained" onPress={requestPermission} style={{ marginTop: 20 }}>
                Grant Permission
              </Button>
            </View>
          ) : (
            <View style={styles.cameraWrapper}>
              <CameraView
                style={StyleSheet.absoluteFillObject}
                facing="back"
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
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
