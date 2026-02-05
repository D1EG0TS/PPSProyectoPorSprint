import React, { useState } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { Slot } from 'expo-router';
import { Drawer as PaperDrawer } from 'react-native-paper';
import { Sidebar } from '../../components/Sidebar';
import { Topbar } from '../../components/Topbar';

export default function DashboardLayout() {
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const dimensions = useWindowDimensions();
  const isLargeScreen = dimensions.width >= 768; // Tablet/Desktop breakpoint

  // On large screens, sidebar is always visible
  // On small screens, it's a drawer
  const showSidebar = isLargeScreen || isSidebarOpen;

  return (
    <View style={styles.container}>
      {/* Permanent Sidebar for large screens */}
      {isLargeScreen && (
        <View style={styles.sidebarContainer}>
           <Sidebar />
        </View>
      )}

      {/* Main Content Area */}
      <View style={styles.contentContainer}>
        <Topbar onMenuPress={() => setIsSidebarOpen(!isSidebarOpen)} />
        
        {/* Overlay Sidebar for small screens */}
        {!isLargeScreen && isSidebarOpen && (
           <View style={[styles.overlaySidebar, { width: dimensions.width * 0.8 }]}>
              <Sidebar onClose={() => setIsSidebarOpen(false)} />
           </View>
        )}
        
        {/* Backdrop for mobile sidebar */}
        {!isLargeScreen && isSidebarOpen && (
             <View 
                style={styles.backdrop} 
                onTouchEnd={() => setIsSidebarOpen(false)}
             />
        )}

        <View style={styles.slotContainer}>
          <Slot />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebarContainer: {
    width: 250,
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  slotContainer: {
    flex: 1,
    padding: 16,
  },
  overlaySidebar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    zIndex: 100,
    backgroundColor: 'white',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 90,
  }
});
