import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Modal, Portal, Text, Button, useTheme, Chip, Divider, IconButton, ActivityIndicator, ProgressBar } from 'react-native-paper';
import { warehouseService, Location, LocationHierarchy, ContainerCheck } from '../../services/warehouseService';

interface LocationPickerProps {
  visible: boolean;
  onDismiss: () => void;
  onSelect: (location: Location) => void;
  warehouseId: number;
  title?: string;
  mode?: 'single' | 'hierarchy';
  excludeProductId?: number;
}

interface SelectedPath {
  aisle?: string;
  rack?: string;
  shelf?: string;
  position?: string;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  visible,
  onDismiss,
  onSelect,
  warehouseId,
  title = 'Seleccionar Ubicación',
  mode = 'hierarchy',
  excludeProductId,
}) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [loadingContainers, setLoadingContainers] = useState(false);
  const [hierarchy, setHierarchy] = useState<LocationHierarchy | null>(null);
  const [selectedPath, setSelectedPath] = useState<SelectedPath>({});
  const [availableLocations, setAvailableLocations] = useState<Location[]>([]);
  const [containerCheck, setContainerCheck] = useState<ContainerCheck | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [containerCheckCache, setContainerCheckCache] = useState<Record<number, ContainerCheck>>({});

  useEffect(() => {
    if (visible && warehouseId) {
      loadHierarchy();
    }
  }, [visible, warehouseId]);

  useEffect(() => {
    if (selectedPath.aisle || selectedPath.rack || selectedPath.shelf || selectedPath.position) {
      loadAvailableLocations();
    }
  }, [selectedPath]);

  const loadHierarchy = async () => {
    try {
      const data = await warehouseService.getLocationHierarchy(warehouseId);
      setHierarchy(data);
    } catch (error) {
      console.error('Error loading hierarchy:', error);
    }
  };

  const loadAvailableLocations = async () => {
    setLoadingContainers(true);
    try {
      const children = await warehouseService.getLocationChildren(warehouseId, null);
      
      let filtered = children;
      if (selectedPath.aisle) {
        filtered = filtered.filter(l => l.aisle === selectedPath.aisle);
      }
      if (selectedPath.rack) {
        filtered = filtered.filter(l => l.rack === selectedPath.rack);
      }
      if (selectedPath.shelf) {
        filtered = filtered.filter(l => l.shelf === selectedPath.shelf);
      }
      if (selectedPath.position) {
        filtered = filtered.filter(l => l.position === selectedPath.position);
      }

      setAvailableLocations(filtered);
      
      if (filtered.length > 0 && !selectedPath.position) {
        const firstContainer = filtered.find(l => l.location_type === 'bin' || l.location_type === 'shelf');
        if (firstContainer) {
          checkContainer(firstContainer.id, firstContainer.code);
        }
      }
    } catch (error) {
      console.error('Error loading locations:', error);
    } finally {
      setLoadingContainers(false);
    }
  };

  const checkContainer = async (locationId: number, code: string) => {
    if (containerCheckCache[locationId]) {
      setContainerCheck(containerCheckCache[locationId]);
      return;
    }

    try {
      const result = await warehouseService.checkContainer(code, excludeProductId);
      setContainerCheck(result);
      setContainerCheckCache(prev => ({ ...prev, [locationId]: result }));
    } catch (error: any) {
      if (error.response?.status === 404) {
        const result = {
          available: true,
          current_quantity: 0,
          remaining_capacity: undefined,
        };
        setContainerCheck(result);
        setContainerCheckCache(prev => ({ ...prev, [locationId]: result }));
      } else {
        setContainerCheck(null);
      }
    }
  };

  const handleSelectLocation = (location: Location) => {
    setSelectedLocation(location);
    setSelectedPath({
      aisle: location.aisle,
      rack: location.rack,
      shelf: location.shelf,
      position: location.position,
    });
    checkContainer(location.id, location.code);
  };

  const handleSelectAisle = (aisle: string) => {
    setSelectedPath(prev => ({ aisle, rack: undefined, shelf: undefined, position: undefined }));
    setSelectedLocation(null);
    setContainerCheck(null);
    setContainerCheckCache({});
  };

  const handleSelectRack = (rack: string) => {
    setSelectedPath(prev => ({ ...prev, rack, shelf: undefined, position: undefined }));
    setSelectedLocation(null);
    setContainerCheck(null);
    setContainerCheckCache({});
  };

  const handleSelectShelf = (shelf: string) => {
    setSelectedPath(prev => ({ ...prev, shelf, position: undefined }));
    setSelectedLocation(null);
    setContainerCheck(null);
    setContainerCheckCache({});
  };

  const handleSelectPosition = (position: string) => {
    setSelectedPath(prev => ({ ...prev, position }));
    setSelectedLocation(null);
    setContainerCheck(null);
    setContainerCheckCache({});
  };

  const handleConfirm = () => {
    if (selectedLocation) {
      onSelect(selectedLocation);
      handleDismiss();
    }
  };

  const handleDismiss = () => {
    setSelectedPath({});
    setSelectedLocation(null);
    setContainerCheck(null);
    setContainerCheckCache({});
    setAvailableLocations([]);
    onDismiss();
  };

  const getCurrentLevelOptions = (): string[] => {
    if (!hierarchy) return [];
    
    if (!selectedPath.aisle) return hierarchy.aisles;
    if (!selectedPath.rack) return hierarchy.racks.filter(r => {
      return availableLocations.some(l => l.rack === r);
    });
    if (!selectedPath.shelf) return hierarchy.shelves.filter(s => {
      return availableLocations.some(l => l.shelf === s);
    });
    if (!selectedPath.position) return hierarchy.positions.filter(p => {
      return availableLocations.some(l => l.position === p);
    });
    return [];
  };

  const getLocationDisplay = () => {
    const parts = [
      selectedPath.aisle,
      selectedPath.rack,
      selectedPath.shelf,
      selectedPath.position,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(' > ') : 'Sin seleccionar';
  };

  const isCompletePath = () => {
    return selectedPath.aisle && selectedPath.rack && selectedPath.shelf && selectedPath.position;
  };

  const getOccupancyPercentage = (location: Location) => {
    if (!location.capacity || location.capacity === 0) return 0;
    return Math.min((location.current_occupancy || 0) / location.capacity, 1);
  };

  const getOccupancyColor = (percentage: number) => {
    if (percentage >= 0.9) return theme.colors.error;
    if (percentage >= 0.7) return '#ff9800';
    return '#4caf50';
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={handleDismiss}
        contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
      >
        <View style={styles.header}>
          <Text variant="titleLarge" style={styles.title}>{title}</Text>
          <IconButton icon="close" onPress={handleDismiss} />
        </View>

        <View style={styles.breadcrumb}>
          <Chip
            selected={!selectedPath.aisle}
            onPress={() => {
              setSelectedPath({});
              setSelectedLocation(null);
              setContainerCheck(null);
            }}
            style={styles.chip}
            icon="road"
          >
            Pasillo
          </Chip>
          <Chip
            selected={!!selectedPath.aisle && !selectedPath.rack}
            onPress={() => selectedPath.aisle && setSelectedPath(prev => ({ ...prev, rack: undefined, shelf: undefined, position: undefined }))}
            disabled={!selectedPath.aisle}
            style={styles.chip}
            icon="view-dashboard"
          >
            Rack
          </Chip>
          <Chip
            selected={!!selectedPath.rack && !selectedPath.shelf}
            onPress={() => selectedPath.rack && setSelectedPath(prev => ({ ...prev, shelf: undefined, position: undefined }))}
            disabled={!selectedPath.rack}
            style={styles.chip}
            icon="layers-triple"
          >
            Fila
          </Chip>
          <Chip
            selected={!!selectedPath.shelf && !selectedPath.position}
            onPress={() => selectedPath.shelf && setSelectedPath(prev => ({ ...prev, position: undefined }))}
            disabled={!selectedPath.shelf}
            style={styles.chip}
            icon="cube-outline"
          >
            Posición
          </Chip>
        </View>

        <View style={[styles.pathDisplay, { backgroundColor: theme.colors.primaryContainer }]}>
          <Text variant="bodyMedium" style={{ color: theme.colors.onPrimaryContainer }}>
            📍 {getLocationDisplay()}
          </Text>
        </View>

        <Divider style={styles.divider} />

        {loadingContainers ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" />
            <Text style={styles.loaderText}>Cargando ubicaciones...</Text>
          </View>
        ) : (
          <ScrollView style={styles.content}>
            {!isCompletePath() ? (
              <>
                <Text variant="labelLarge" style={styles.levelTitle}>
                  {selectedPath.shelf ? 'Selecciona la Posición' :
                   selectedPath.rack ? 'Selecciona la Fila' :
                   selectedPath.aisle ? 'Selecciona el Rack' : 'Selecciona el Pasillo'}
                </Text>
                
                {getCurrentLevelOptions().length > 0 ? (
                  <View style={styles.optionsGrid}>
                    {getCurrentLevelOptions().map(option => (
                      <TouchableOpacity
                        key={option}
                        style={[
                          styles.optionButton,
                          {
                            backgroundColor: theme.colors.surfaceVariant,
                          }
                        ]}
                        onPress={() => {
                          if (!selectedPath.aisle) handleSelectAisle(option);
                          else if (!selectedPath.rack) handleSelectRack(option);
                          else if (!selectedPath.shelf) handleSelectShelf(option);
                          else if (!selectedPath.position) handleSelectPosition(option);
                        }}
                      >
                        <Text style={{ color: theme.colors.onSurfaceVariant, fontWeight: '600' }}>
                          {option}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.noOptions}>
                    {selectedPath.aisle 
                      ? 'No hay opciones disponibles para esta selección'
                      : 'No hay ubicaciones registradas'}
                  </Text>
                )}
              </>
            ) : (
              <>
                <Text variant="labelLarge" style={styles.levelTitle}>
                  Selecciona el Contenedor
                </Text>
                
                {availableLocations.length > 0 ? (
                  <View style={styles.containerList}>
                    {availableLocations.map(loc => {
                      const isSelected = selectedLocation?.id === loc.id;
                      const occupancy = getOccupancyPercentage(loc);
                      const cachedCheck = containerCheckCache[loc.id];
                      
                      return (
                        <TouchableOpacity
                          key={loc.id}
                          style={[
                            styles.containerCard,
                            {
                              backgroundColor: isSelected 
                                ? theme.colors.primaryContainer 
                                : theme.colors.surfaceVariant,
                              borderColor: isSelected 
                                ? theme.colors.primary 
                                : 'transparent',
                              borderWidth: isSelected ? 2 : 0,
                            }
                          ]}
                          onPress={() => handleSelectLocation(loc)}
                        >
                          <View style={styles.containerHeader}>
                            <View>
                              <Text variant="titleMedium" style={{ 
                                color: isSelected 
                                  ? theme.colors.onPrimaryContainer 
                                  : theme.colors.onSurface,
                                fontWeight: 'bold'
                              }}>
                                {loc.code}
                              </Text>
                              <Text variant="bodySmall" style={{ 
                                color: isSelected 
                                  ? theme.colors.onPrimaryContainer 
                                  : theme.colors.onSurfaceVariant
                              }}>
                                {loc.name}
                              </Text>
                            </View>
                            {cachedCheck && (
                              <View style={[
                                styles.statusBadge,
                                { backgroundColor: cachedCheck.available ? '#e8f5e9' : '#ffebee' }
                              ]}>
                                <Text style={{ 
                                  fontSize: 10,
                                  color: cachedCheck.available ? '#2e7d32' : '#c62828',
                                  fontWeight: 'bold'
                                }}>
                                  {cachedCheck.available ? '✓ DISPONIBLE' : '✗ OCUPADO'}
                                </Text>
                              </View>
                            )}
                          </View>
                          
                          <View style={styles.containerOccupancy}>
                            <ProgressBar 
                              progress={occupancy} 
                              color={getOccupancyColor(occupancy)}
                              style={styles.occupancyBar}
                            />
                            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                              {loc.current_occupancy || 0}/{loc.capacity || '∞'}
                            </Text>
                          </View>
                          
                          {cachedCheck && !cachedCheck.available && (
                            <View style={styles.containerDetails}>
                              <Text variant="bodySmall" style={{ color: theme.colors.error }}>
                                Contiene: {cachedCheck.current_product} ({cachedCheck.current_quantity})
                              </Text>
                            </View>
                          )}
                          
                          {cachedCheck && cachedCheck.available && cachedCheck.remaining_capacity !== undefined && (
                            <View style={styles.containerDetails}>
                              <Text variant="bodySmall" style={{ color: '#4caf50' }}>
                                Disponible: {cachedCheck.remaining_capacity} espacios
                              </Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <Text style={styles.noOptions}>
                    No hay contenedores en esta ubicación
                  </Text>
                )}
              </>
            )}
          </ScrollView>
        )}

        <Divider style={styles.divider} />

        <View style={styles.actions}>
          <Button mode="outlined" onPress={handleDismiss}>
            Cancelar
          </Button>
          <Button
            mode="contained"
            onPress={handleConfirm}
            disabled={!selectedLocation}
          >
            Seleccionar
          </Button>
        </View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modal: {
    margin: 20,
    padding: 0,
    borderRadius: 16,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    fontWeight: 'bold',
  },
  breadcrumb: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginBottom: 4,
  },
  pathDisplay: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
  },
  divider: {
    marginVertical: 12,
  },
  content: {
    paddingHorizontal: 16,
    maxHeight: 350,
  },
  loaderContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 12,
    color: '#666',
  },
  levelTitle: {
    marginBottom: 12,
    fontWeight: '600',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionButton: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 10,
    minWidth: 90,
    alignItems: 'center',
  },
  noOptions: {
    textAlign: 'center',
    color: '#999',
    padding: 20,
  },
  containerList: {
    gap: 12,
  },
  containerCard: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  containerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  containerOccupancy: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  occupancyBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
  },
  containerDetails: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    gap: 12,
  },
});
