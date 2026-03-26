import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { DataTable, Searchbar, FAB, Portal, Dialog, Button, Text, Chip, Card, Divider } from 'react-native-paper';
import { supplierService, Supplier, SupplierStatus } from '../../../../services/supplierService';

const statusColors: Record<SupplierStatus, string> = {
  active: '#4CAF50',
  inactive: '#9E9E9E',
  pending: '#FF9800',
  blocked: '#F44336',
};

const statusLabels: Record<SupplierStatus, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  pending: 'Pendiente',
  blocked: 'Bloqueado',
};

export default function SuppliersListScreen() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  const itemsPerPage = 10;
  const numberOfPages = Math.ceil(total / itemsPerPage);

  const loadSuppliers = useCallback(async (search?: string) => {
    try {
      setLoading(true);
      const response = await supplierService.list({
        skip: page * itemsPerPage,
        limit: itemsPerPage,
        search: search || searchQuery || undefined,
        is_active: true,
      });
      setSuppliers(response.suppliers);
      setTotal(response.total);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery]);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSuppliers();
    setRefreshing(false);
  };

  const onSearch = () => {
    setPage(0);
    loadSuppliers(searchQuery);
  };

  const showDetail = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setDetailVisible(true);
  };

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Buscar proveedor..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        onSubmitEditing={onSearch}
        style={styles.searchbar}
      />

      <DataTable>
        <DataTable.Header>
          <DataTable.Title>Código</DataTable.Title>
          <DataTable.Title>Nombre</DataTable.Title>
          <DataTable.Title>Contacto</DataTable.Title>
          <DataTable.Title>Estado</DataTable.Title>
        </DataTable.Header>

        {suppliers.map((supplier) => (
          <DataTable.Row key={supplier.id} onPress={() => showDetail(supplier)}>
            <DataTable.Cell>{supplier.code}</DataTable.Cell>
            <DataTable.Cell>{supplier.name}</DataTable.Cell>
            <DataTable.Cell>{supplier.contact_person || '-'}</DataTable.Cell>
            <DataTable.Cell>
              <Chip
                style={{ backgroundColor: statusColors[supplier.status] }}
                textStyle={{ color: '#fff', fontSize: 10 }}
              >
                {statusLabels[supplier.status]}
              </Chip>
            </DataTable.Cell>
          </DataTable.Row>
        ))}
      </DataTable>

      <DataTable.Pagination
        page={page}
        numberOfPages={numberOfPages}
        onPageChange={setPage}
        label={`${page + 1} de ${numberOfPages}`}
        showFastPaginationControls
        numberOfItemsPerPage={itemsPerPage}
      />

      <Portal>
        <Dialog visible={detailVisible} onDismiss={() => setDetailVisible(false)}>
          <Dialog.Title>Detalle del Proveedor</Dialog.Title>
          <Dialog.ScrollArea>
            <ScrollView contentContainerStyle={styles.dialogContent}>
              {selectedSupplier && (
                <>
                  <Card style={styles.detailCard}>
                    <Card.Title title={selectedSupplier.name} />
                    <Card.Content>
                      <Text style={styles.label}>Código: {selectedSupplier.code}</Text>
                      <Text style={styles.label}>Estado: {statusLabels[selectedSupplier.status]}</Text>
                      <Divider style={styles.divider} />
                      <Text style={styles.subtitle}>Información de Contacto</Text>
                      <Text style={styles.label}>Contacto: {selectedSupplier.contact_person || '-'}</Text>
                      <Text style={styles.label}>Email: {selectedSupplier.email || '-'}</Text>
                      <Text style={styles.label}>Teléfono: {selectedSupplier.phone || '-'}</Text>
                      <Text style={styles.label}>Móvil: {selectedSupplier.mobile || '-'}</Text>
                      <Divider style={styles.divider} />
                      <Text style={styles.subtitle}>Dirección</Text>
                      <Text style={styles.label}>{selectedSupplier.address || '-'}</Text>
                      <Text style={styles.label}>
                        {selectedSupplier.city && selectedSupplier.state
                          ? `${selectedSupplier.city}, ${selectedSupplier.state}`
                          : selectedSupplier.city || selectedSupplier.state || '-'}
                      </Text>
                      <Text style={styles.label}>
                        {selectedSupplier.country || 'México'} {selectedSupplier.postal_code || ''}
                      </Text>
                    </Card.Content>
                  </Card>
                </>
              )}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setDetailVisible(false)}>Cerrar</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => console.log('Create supplier')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchbar: {
    margin: 16,
  },
  dialogContent: {
    padding: 16,
  },
  detailCard: {
    marginBottom: 16,
  },
  divider: {
    marginVertical: 12,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1976d2',
  },
  label: {
    fontSize: 14,
    marginBottom: 4,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#1976d2',
  },
});
