import React, { useState, useRef } from 'react';
import { View, StyleSheet, useWindowDimensions, PanResponder, Platform } from 'react-native';
import { Slot } from 'expo-router';
import { Sidebar } from '../../components/Sidebar';
import { Topbar } from '../../components/Topbar';

export default function DashboardLayout() {
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(280);
  
  const dimensions = useWindowDimensions();
  const isLargeScreen = dimensions.width >= 768; // Tablet/Desktop breakpoint
  
  const initialWidthRef = useRef(280);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        initialWidthRef.current = sidebarWidth;
      },
      onPanResponderMove: (_, gestureState) => {
        const newWidth = initialWidthRef.current + gestureState.dx;
        // Limit width between 200 and 600
        const clampedWidth = Math.max(200, Math.min(newWidth, 600));
        setSidebarWidth(clampedWidth);
      },
    })
  ).current;

  // Effective width depends on collapsed state
  const currentWidth = isSidebarCollapsed ? 80 : sidebarWidth;

  return (
    <View style={styles.container}>
      {/* Permanent Sidebar for large screens */}
      {isLargeScreen && (
        <>
          <View style={[
            styles.sidebarContainer, 
            { width: currentWidth },
            // If we have a resizer, we don't need the border right on the container itself
            // strictly speaking, but the resizer acts as the border.
            !isSidebarCollapsed && { borderRightWidth: 0 } 
          ]}>
             <Sidebar 
               collapsed={isSidebarCollapsed}
               onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
             />
          </View>
          
          {/* Resizer Handle - Only visible when not collapsed */}
          {!isSidebarCollapsed && (
            <View 
              {...panResponder.panHandlers}
              style={[
                styles.resizer, 
                Platform.OS === 'web' ? { cursor: 'col-resize' } as any : {}
              ]} 
            />
          )}
        </>
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
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
    overflow: 'hidden',
    backgroundColor: '#fff', // Ensure background is white
  },
  resizer: {
    width: 6,
    backgroundColor: '#f0f0f0',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
    borderLeftWidth: 1,
    borderLeftColor: '#fff', // visual effect
    zIndex: 10,
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
