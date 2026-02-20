import React from 'react';
import { View, ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { AssetType } from '../../types/assets';

interface Props {
    selectedType: AssetType | 'ALL';
    onSelect: (type: AssetType | 'ALL') => void;
}

export const AssetTypeSelector = ({ selectedType, onSelect }: Props) => {
    const types = [
        { label: 'TODOS', value: 'ALL' },
        { label: 'HERRAMIENTAS', value: AssetType.HERRAMIENTA },
        { label: 'MEDICIÓN', value: AssetType.EQUIPO_MEDICION },
        { label: 'INFORMÁTICA', value: AssetType.ACTIVO_INFORMATICO }
    ];

    return (
        <View style={styles.container}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {types.map((type) => (
                    <TouchableOpacity
                        key={type.value}
                        style={[
                            styles.tab,
                            selectedType === type.value && styles.activeTab
                        ]}
                        onPress={() => onSelect(type.value as AssetType | 'ALL')}
                    >
                        <Text style={[
                            styles.tabText,
                            selectedType === type.value && styles.activeTabText
                        ]}>
                            {type.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    scrollContent: {
        paddingHorizontal: 16,
        gap: 8,
    },
    tab: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#f5f5f5',
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    activeTab: {
        backgroundColor: '#007AFF',
        borderColor: '#007AFF',
    },
    tabText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    activeTabText: {
        color: '#fff',
    },
});
