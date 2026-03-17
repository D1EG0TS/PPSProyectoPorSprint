import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { IconButton, Text, useTheme } from 'react-native-paper';
import { Location } from '../../services/warehouseService';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';

interface LocationTreeProps {
  roots: Location[];
  onAddChild: (node: Location) => void;
  onEdit: (node: Location) => void;
  onDelete: (node: Location) => void;
  onAssignProduct?: (node: Location) => void;
}

const Node: React.FC<{
  node: Location;
  level?: number;
  onAddChild: (node: Location) => void;
  onEdit: (node: Location) => void;
  onDelete: (node: Location) => void;
  onAssignProduct?: (node: Location) => void;
}> = ({ node, level = 0, onAddChild, onEdit, onDelete, onAssignProduct }) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const hasChildren = !!node.children && node.children.length > 0;

  return (
    <View>
      <View style={[styles.nodeContainer, { paddingLeft: level * 20 }]}>
        <TouchableOpacity 
          style={styles.nodeContent} 
          onPress={() => setExpanded(!expanded)}
          disabled={!hasChildren}
        >
          <View style={styles.nodeIcon}>
            {hasChildren ? (
              <IconButton 
                icon={expanded ? "chevron-down" : "chevron-right"} 
                size={20} 
                onPress={() => setExpanded(!expanded)} 
              />
            ) : (
              <View style={{ width: 36 }} />
            )}
          </View>
          <View style={styles.nodeTextContainer}>
            <Text variant="bodyLarge" style={styles.nodeName}>{node.name}</Text>
            <Text variant="bodySmall" style={styles.nodeCode}>{node.code}</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.nodeActions}>
          <IconButton icon="plus" size={18} onPress={() => onAddChild(node)} />
          <IconButton icon="pencil" size={18} onPress={() => onEdit(node)} />
          <IconButton 
            icon="delete" 
            size={18} 
            iconColor={theme.colors.error} 
            onPress={() => onDelete(node)} 
          />
          {onAssignProduct && (
            <IconButton icon="cube-outline" size={18} onPress={() => onAssignProduct(node)} />
          )}
        </View>
      </View>

      {expanded && hasChildren && node.children && (
        <View>
          {node.children.map(child => (
            <Node 
              key={child.id}
              node={child}
              level={level + 1}
              onAddChild={onAddChild}
              onEdit={onEdit}
              onDelete={onDelete}
              onAssignProduct={onAssignProduct}
            />
          ))}
        </View>
      )}
    </View>
  );
};

export const LocationTree: React.FC<LocationTreeProps> = ({ roots, onAddChild, onEdit, onDelete, onAssignProduct }) => {
  if (!roots || roots.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={{ color: Colors.gray }}>No hay ubicaciones registradas.</Text>
      </View>
    );
  }

  return (
    <View>
      {roots.map(root => (
        <Node 
          key={root.id}
          node={root}
          onAddChild={onAddChild}
          onEdit={onEdit}
          onDelete={onDelete}
          onAssignProduct={onAssignProduct}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  nodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    minHeight: 56,
  },
  nodeContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
  },
  nodeIcon: {
    marginRight: 8,
  },
  nodeTextContainer: {
    flex: 1,
  },
  nodeName: {
    fontWeight: '500',
  },
  nodeCode: {
    color: Colors.gray,
    fontSize: 12,
  },
  nodeActions: {
    flexDirection: 'row',
  },
  emptyState: {
    alignItems: 'center',
    marginTop: Layout.spacing.md,
  }
});
