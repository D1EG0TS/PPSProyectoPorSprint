
import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, Platform, useWindowDimensions } from 'react-native';
import { DataTable, Text, ActivityIndicator, useTheme, Surface } from 'react-native-paper';
import { Layout } from '../constants/Layout';

export interface Column<T> {
  key: string;
  label: string;
  numeric?: boolean;
  renderCell?: (item: T) => React.ReactNode;
  width?: number;
  flex?: number;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  page?: number;
  itemsPerPage?: number;
  onPageChange?: (page: number) => void;
  totalItems?: number; // Optional, for server-side pagination
  emptyMessage?: string;
  loading?: boolean;
  minWidth?: number;
  renderCard?: (item: T) => React.ReactNode; // Function to render a card view for mobile
  cardBreakpoint?: number; // Breakpoint to switch to card view (default: Layout.breakpoints.tablet)
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  page = 0,
  itemsPerPage = 10,
  onPageChange,
  totalItems,
  emptyMessage,
  loading,
  minWidth = 600,
  renderCard,
  cardBreakpoint = Layout.breakpoints.desktop,
}: TableProps<T>) {
  const [internalPage, setInternalPage] = useState(page);
  const { width } = useWindowDimensions();
  const theme = useTheme();
  const isCardView = width < cardBreakpoint && !!renderCard;

  useEffect(() => {
    setInternalPage(page);
  }, [page]);

  const handlePageChange = (newPage: number) => {
    setInternalPage(newPage);
    if (onPageChange) {
      onPageChange(newPage);
    }
  };

  // Calculate slice if no external pagination
  const displayData = onPageChange 
    ? data 
    : data.slice(internalPage * itemsPerPage, (internalPage + 1) * itemsPerPage);

  const total = totalItems || data.length;

  if (loading) {
    return (
      <View style={styles.emptyContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (displayData.length === 0) {
    // Note: Ideally use EmptyState component here if imported, 
    // but for now keeping it self-contained or simple text to avoid circular deps if not careful.
    return (
      <View style={styles.emptyContainer}>
        <Text variant="bodyMedium" style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
          {emptyMessage || 'No hay datos disponibles'}
        </Text>
      </View>
    );
  }

  if (isCardView && renderCard) {
    return (
      <View style={styles.cardContainer}>
        {displayData.map((item) => (
          <View key={keyExtractor(item)} style={styles.cardWrapper}>
            {renderCard(item)}
          </View>
        ))}
        
        <DataTable.Pagination
          page={internalPage}
          numberOfPages={Math.ceil(total / itemsPerPage)}
          onPageChange={handlePageChange}
          label={`${internalPage * itemsPerPage + 1}-${Math.min((internalPage + 1) * itemsPerPage, total)} de ${total}`}
          numberOfItemsPerPageList={[itemsPerPage]}
          numberOfItemsPerPage={itemsPerPage}
          onItemsPerPageChange={() => {}}
          selectPageDropdownLabel={'Filas por página'}
          style={{ justifyContent: 'center' }}
        />
      </View>
    );
  }

  return (
    <Surface style={[styles.container, { backgroundColor: theme.colors.surface }]} elevation={1}>
      <ScrollView horizontal showsHorizontalScrollIndicator={Platform.OS === 'web'}>
        <View style={{ minWidth: minWidth }}>
          <DataTable>
            <DataTable.Header style={{ backgroundColor: theme.colors.surfaceVariant, borderBottomColor: theme.colors.outline }}>
              {columns.map((col) => (
                <DataTable.Title 
                  key={col.key} 
                  numeric={col.numeric}
                  style={[
                    col.numeric ? styles.numericCol : undefined,
                    col.width ? { width: col.width, minWidth: col.width, maxWidth: col.width, flex: 0 } : { flex: col.flex || 1 }
                  ]}
                >
                  <Text 
                    numberOfLines={1} 
                    style={[styles.headerText, { color: theme.colors.onSurfaceVariant }]}
                    variant="labelMedium"
                  >
                    {col.label.toUpperCase()}
                  </Text>
                </DataTable.Title>
              ))}
            </DataTable.Header>

            {displayData.map((item) => (
              <DataTable.Row key={keyExtractor(item)} style={{ borderBottomColor: theme.colors.outline }}>
                {columns.map((col) => (
                  <DataTable.Cell 
                    key={col.key} 
                    numeric={col.numeric}
                    style={[
                      col.numeric ? styles.numericCol : undefined,
                      col.width ? { width: col.width, minWidth: col.width, maxWidth: col.width, flex: 0 } : { flex: col.flex || 1 }
                    ]}
                  >
                    {col.renderCell ? col.renderCell(item) : (
                      <Text numberOfLines={1} style={{ color: theme.colors.onSurface }}>
                        {(item as any)[col.key]}
                      </Text>
                    )}
                  </DataTable.Cell>
                ))}
              </DataTable.Row>
            ))}
          </DataTable>
        </View>
      </ScrollView>

      <DataTable.Pagination
        page={internalPage}
        numberOfPages={Math.ceil(total / itemsPerPage)}
        onPageChange={handlePageChange}
        label={`${internalPage * itemsPerPage + 1}-${Math.min((internalPage + 1) * itemsPerPage, total)} de ${total}`}
        numberOfItemsPerPageList={[itemsPerPage]}
        numberOfItemsPerPage={itemsPerPage}
        onItemsPerPageChange={() => {}}
        selectPageDropdownLabel={'Filas por página'}
      />
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Layout.borderRadius.md,
    overflow: 'hidden', // Ensures header radius is respected
  },
  cardContainer: {
    paddingBottom: 16,
  },
  cardWrapper: {
    marginBottom: 12,
  },
  numericCol: {
    justifyContent: 'flex-end',
  },
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    opacity: 0.7,
  },
  headerText: {
    fontWeight: 'bold',
  },
});
