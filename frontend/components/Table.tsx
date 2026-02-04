import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { DataTable, Text } from 'react-native-paper';
import { Colors } from '../constants/Colors';

interface Column {
  key: string;
  label: string;
  numeric?: boolean;
}

interface TableProps<T> {
  columns: Column[];
  data: T[];
  keyExtractor: (item: T) => string;
  page?: number;
  itemsPerPage?: number;
  onPageChange?: (page: number) => void;
  totalItems?: number; // Optional, for server-side pagination
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  page = 0,
  itemsPerPage = 10,
  onPageChange,
  totalItems
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
  const from = internalPage * itemsPerPage;
  const to = Math.min((internalPage + 1) * itemsPerPage, total);

  return (
    <View style={styles.container}>
      <DataTable>
        <DataTable.Header>
          {columns.map((col) => (
            <DataTable.Title key={col.key} numeric={col.numeric}>
              <Text style={styles.headerText}>{col.label}</Text>
            </DataTable.Title>
          ))}
        </DataTable.Header>

        {displayData.map((item) => (
          <DataTable.Row key={keyExtractor(item)}>
            {columns.map((col) => (
              <DataTable.Cell key={col.key} numeric={col.numeric}>
                {(item as any)[col.key]}
              </DataTable.Cell>
            ))}
          </DataTable.Row>
        ))}

        <DataTable.Pagination
          page={internalPage}
          numberOfPages={Math.ceil(total / itemsPerPage)}
          onPageChange={handlePageChange}
          label={`${from + 1}-${to} of ${total}`}
          numberOfItemsPerPage={itemsPerPage}
          // onItemsPerPageChange={onItemsPerPageChange}
          showFastPaginationControls
          selectPageDropdownLabel={'Rows per page'}
        />
      </DataTable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  headerText: {
    fontWeight: 'bold',
    color: Colors.text,
  },
});
