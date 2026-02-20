import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { getProducts, Product } from '../../services/productService';
import { getTools, Tool } from '../../services/toolService';
import { getEPPs, EPP } from '../../services/eppService';
import vehicleService, { Vehicle } from '../../services/vehicleService';
import { Ionicons } from '@expo/vector-icons';
import debounce from 'lodash/debounce';

type ItemType = 'PRODUCT' | 'TOOL' | 'EPP' | 'VEHICLE';

interface ItemSelectorProps {
    type: ItemType;
    onSelect: (item: any, quantity?: number) => void;
    placeholder?: string;
}

export const ItemSelector: React.FC<ItemSelectorProps> = ({ type, onSelect, placeholder }) => {
    const [search, setSearch] = useState('');
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any | null>(null);
    const [quantity, setQuantity] = useState('1');

    const fetchItems = async (query: string) => {
        setLoading(true);
        try {
            let data: any[] = [];
            if (type === 'PRODUCT') {
                const res = await getProducts({ search: query, limit: 10 });
                data = res;
            } else if (type === 'TOOL') {
                const res = await getTools({ search: query, limit: 10 });
                data = res;
            } else if (type === 'EPP') {
                const res = await getEPPs({ search: query, limit: 10 });
                data = res;
            } else if (type === 'VEHICLE') {
                const res = await vehicleService.getAll({ search: query, limit: 10 });
                data = res;
            }
            setItems(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const debouncedFetch = useCallback(debounce(fetchItems, 500), [type]);

    useEffect(() => {
        debouncedFetch(search);
    }, [search, debouncedFetch]);

    const handleSelect = (item: any) => {
        if (type === 'PRODUCT') {
            setSelectedItem(item);
        } else {
            onSelect(item);
        }
    };

    const confirmProductSelection = () => {
        if (selectedItem) {
            onSelect(selectedItem, parseInt(quantity));
            setSelectedItem(null);
            setQuantity('1');
            setSearch('');
        }
    };

    const renderItem = ({ item }: { item: any }) => {
        let title = '';
        let subtitle = '';
        let image = '';

        if (type === 'PRODUCT') {
            title = item.name;
            subtitle = `SKU: ${item.sku} | Stock: ${item.stock || 'N/A'}`; // Stock logic?
            image = item.image_url;
        } else if (type === 'TOOL') {
            title = item.name;
            subtitle = `Code: ${item.code} | Status: ${item.status}`;
            image = item.image_url;
        } else if (type === 'EPP') {
            title = item.name;
            subtitle = `Code: ${item.code} | Type: ${item.type}`;
            image = item.image_url;
        } else if (type === 'VEHICLE') {
            title = `${item.brand} ${item.model}`;
            subtitle = `Plate: ${item.plate} | Status: ${item.status}`;
            image = item.image_url;
        }

        return (
            <TouchableOpacity style={styles.item} onPress={() => handleSelect(item)}>
                {image ? (
                    <Image source={{ uri: image }} style={styles.image} />
                ) : (
                    <View style={[styles.image, styles.placeholderImage]}>
                        <Ionicons name="cube-outline" size={24} color="#666" />
                    </View>
                )}
                <View style={styles.itemInfo}>
                    <Text style={styles.itemTitle}>{title}</Text>
                    <Text style={styles.itemSubtitle}>{subtitle}</Text>
                </View>
                <Ionicons name="add-circle-outline" size={24} color="#007bff" />
            </TouchableOpacity>
        );
    };

    if (selectedItem && type === 'PRODUCT') {
        return (
            <View style={styles.quantityContainer}>
                <Text style={styles.selectedTitle}>Selected: {selectedItem.name}</Text>
                <View style={styles.row}>
                    <TextInput
                        style={styles.quantityInput}
                        value={quantity}
                        onChangeText={setQuantity}
                        keyboardType="numeric"
                        placeholder="Qty"
                    />
                    <TouchableOpacity style={styles.confirmButton} onPress={confirmProductSelection}>
                        <Text style={styles.confirmButtonText}>Add</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cancelButton} onPress={() => setSelectedItem(null)}>
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder={placeholder || "Search items..."}
                    value={search}
                    onChangeText={setSearch}
                />
                {loading && <ActivityIndicator size="small" color="#007bff" />}
            </View>
            <FlatList
                data={items}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                style={styles.list}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 20,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        paddingHorizontal: 10,
        marginBottom: 10,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        height: 40,
    },
    list: {
        maxHeight: 200,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    image: {
        width: 40,
        height: 40,
        borderRadius: 4,
        marginRight: 10,
    },
    placeholderImage: {
        backgroundColor: '#ddd',
        justifyContent: 'center',
        alignItems: 'center',
    },
    itemInfo: {
        flex: 1,
    },
    itemTitle: {
        fontWeight: 'bold',
    },
    itemSubtitle: {
        fontSize: 12,
        color: '#666',
    },
    quantityContainer: {
        padding: 10,
        backgroundColor: '#e3f2fd',
        borderRadius: 8,
    },
    selectedTitle: {
        fontWeight: 'bold',
        marginBottom: 10,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    quantityInput: {
        backgroundColor: 'white',
        borderRadius: 4,
        padding: 5,
        width: 60,
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#ddd',
        textAlign: 'center',
    },
    confirmButton: {
        backgroundColor: '#007bff',
        padding: 8,
        borderRadius: 4,
        marginRight: 10,
    },
    confirmButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    cancelButton: {
        padding: 8,
    },
    cancelButtonText: {
        color: '#666',
    },
});
