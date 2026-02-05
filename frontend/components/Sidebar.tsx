import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Drawer, useTheme, Avatar, Divider, List, IconButton } from 'react-native-paper';
import { useRouter, usePathname } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SIDEBAR_ITEMS, NavigationItem } from '../config/navigation';
import { getRoleName } from '../constants/roles';

interface SidebarProps {
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({ onClose, collapsed = false, onToggleCollapse }: SidebarProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const theme = useTheme();

  const handleNavigate = (route: string) => {
    router.push(route as any);
    if (onClose) onClose();
  };

  const isActive = (route: string) => pathname === route || pathname.startsWith(route + '/');

  // Helper to filter items recursively
  const filterItems = (items: NavigationItem[], roleId: number): NavigationItem[] => {
    return items.reduce((acc, item) => {
      // If item has children, filter them
      if (item.children) {
        const filteredChildren = filterItems(item.children, roleId);
        // If there are visible children, show the group
        if (filteredChildren.length > 0) {
          acc.push({ ...item, children: filteredChildren });
        }
      } 
      // If item is a leaf, check allowedRoles
      else if (item.allowedRoles.includes(roleId)) {
        acc.push(item);
      }
      return acc;
    }, [] as NavigationItem[]);
  };

  const menuItems = useMemo(() => {
    if (!user?.role_id) return [];
    return filterItems(SIDEBAR_ITEMS, user.role_id);
  }, [user?.role_id]);

  // State for expanded groups
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Initialize expanded state based on active route
  useEffect(() => {
    const newExpanded: Record<string, boolean> = {};
    let hasUpdates = false;
    
    const checkActive = (items: NavigationItem[]) => {
      items.forEach(item => {
        if (item.children) {
           const isChildActive = item.children.some(child => child.path && isActive(child.path));
           if (isChildActive && !expandedGroups[item.label]) {
             newExpanded[item.label] = true;
             hasUpdates = true;
           }
           // Recursive check if we had deeper nesting
           checkActive(item.children);
        }
      });
    };
    
    checkActive(menuItems);
    
    if (hasUpdates) {
      setExpandedGroups(prev => ({ ...prev, ...newExpanded }));
    }
  }, [pathname, menuItems]);

  const toggleGroup = (label: string) => {
    if (collapsed && onToggleCollapse) {
      // If collapsed, expand first, then toggle
      onToggleCollapse();
      // We also need to ensure it opens
      setExpandedGroups(prev => ({ ...prev, [label]: true }));
    } else {
      setExpandedGroups(prev => ({ ...prev, [label]: !prev[label] }));
    }
  };

  const renderCollapsedItem = (item: NavigationItem, index: number) => {
    const active = item.path ? isActive(item.path) : false;
    // Check if any child is active for groups
    const isGroupActive = item.children?.some(child => child.path && isActive(child.path));
    
    return (
      <TouchableOpacity
        key={index}
        style={[
          styles.collapsedItem,
          (active || isGroupActive) && { backgroundColor: theme.colors.secondaryContainer }
        ]}
        onPress={() => {
            if (item.children) {
                toggleGroup(item.label);
            } else if (item.path) {
                handleNavigate(item.path);
            }
        }}
      >
        <List.Icon icon={item.icon} color={theme.colors.onSurface} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <View style={[styles.header, collapsed && styles.headerCollapsed]}>
        <Avatar.Text 
            size={collapsed ? 40 : 50} 
            label={user?.full_name?.substring(0, 2).toUpperCase() || 'US'} 
            style={{ backgroundColor: theme.colors.primary }}
        />
        {!collapsed && (
          <View style={styles.userInfo}>
              <Text variant="titleMedium" style={styles.username} numberOfLines={1}>
              {user?.full_name || user?.email}
              </Text>
              <Text variant="bodySmall" style={styles.role}>
              {getRoleName(user?.role_id)}
              </Text>
          </View>
        )}
      </View>

      {/* Toggle Button - Only visible if onToggleCollapse is provided (Desktop) */}
      {onToggleCollapse && (
         <View style={[styles.toggleContainer, collapsed && styles.toggleContainerCollapsed]}>
             <IconButton 
                icon={collapsed ? "chevron-right" : "chevron-left"} 
                onPress={onToggleCollapse} 
                size={20}
             />
         </View>
      )}

      <Divider />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Drawer.Section showDivider={false} style={styles.drawerSection}>
            {menuItems.map((item, index) => {
                if (collapsed) {
                    return renderCollapsedItem(item, index);
                }

                if (item.children) {
                    return (
                        <List.Accordion
                            key={index}
                            title={item.label}
                            left={props => <List.Icon {...props} icon={item.icon} />}
                            expanded={expandedGroups[item.label]}
                            onPress={() => toggleGroup(item.label)}
                            style={{ backgroundColor: theme.colors.surface }}
                        >
                            {item.children.map((child, childIndex) => (
                                <Drawer.Item
                                    key={`${index}-${childIndex}`}
                                    label={child.label}
                                    icon={child.icon}
                                    active={child.path ? isActive(child.path) : false}
                                    onPress={() => child.path && handleNavigate(child.path)}
                                    style={{ marginLeft: 12 }}
                                />
                            ))}
                        </List.Accordion>
                    );
                } else {
                    return (
                        <Drawer.Item
                            key={index}
                            label={item.label}
                            icon={item.icon}
                            active={item.path ? isActive(item.path) : false}
                            onPress={() => item.path && handleNavigate(item.path)}
                        />
                    );
                }
            })}
        </Drawer.Section>
      </ScrollView>
      
      <Divider />
      
      <Drawer.Section showDivider={false}>
          {collapsed ? (
              <TouchableOpacity style={styles.collapsedItem} onPress={logout}>
                  <List.Icon icon="logout" color={theme.colors.onSurface} />
              </TouchableOpacity>
          ) : (
            <Drawer.Item
            label="Cerrar Sesión"
            icon="logout"
            onPress={logout}
            />
          )}
      </Drawer.Section>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 90,
  },
  headerCollapsed: {
    padding: 10,
    justifyContent: 'center',
    flexDirection: 'column',
    gap: 10,
  },
  userInfo: {
    marginLeft: 16,
    flex: 1,
  },
  username: {
    fontWeight: 'bold',
  },
  role: {
    opacity: 0.7,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 10,
  },
  drawerSection: {
    marginTop: 10,
  },
  toggleContainer: {
      alignItems: 'flex-end',
      paddingRight: 10,
      paddingBottom: 10,
  },
  toggleContainerCollapsed: {
      alignItems: 'center',
      paddingRight: 0,
  },
  collapsedItem: {
      alignItems: 'center',
      paddingVertical: 10,
      justifyContent: 'center',
  }
});
