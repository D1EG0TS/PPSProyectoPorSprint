import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, Platform } from 'react-native';
import { DataTable, Text, ActivityIndicator } from 'react-native-paper';

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
  minWidth = 600
}: TableProps<T>) {
  const [internalPage, setInternalPage] = useState(page);

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

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={Platform.OS === 'web'}>
        <View style={{ minWidth: minWidth }}>
          <DataTable>
            <DataTable.Header>
              {columns.map((col) => (
                <DataTable.Title 
                  key={col.key} 
                  numeric={col.numeric}
                  style={[
                    col.numeric ? styles.numericCol : undefined,
                    col.width ? { width: col.width, minWidth: col.width, maxWidth: col.width, flex: 0 } : { flex: col.flex || 1 }
                  ]}
                >
                  <Text numberOfLines={1} style={styles.headerText}>
                    {col.label}
                  </Text>
                </DataTable.Title>
              ))}
            </DataTable.Header>

            {loading ? (
              <View style={styles.emptyContainer}>
                <ActivityIndicator size="large" />
              </View>
            ) : displayData.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text variant="bodyMedium" style={styles.emptyText}>
                  {emptyMessage || 'No hay datos disponibles'}
                </Text>
              </View>
            ) : (
              displayData.map((item) => (
                <DataTable.Row key={keyExtractor(item)}>
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
                        <Text numberOfLines={1}>
                          {(item as any)[col.key]}
                        </Text>
                      )}
                    </DataTable.Cell>
                  ))}
                </DataTable.Row>
              ))
            )}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  numericCol: {
    justifyContent: 'flex-end',
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    opacity: 0.6,
  },
  headerText: {
    width: '100%',
  },
});
