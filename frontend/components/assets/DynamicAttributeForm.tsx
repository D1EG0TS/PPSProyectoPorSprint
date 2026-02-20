import React from 'react';
import { View, Text, TextInput, StyleSheet, Switch } from 'react-native';
import { AssetType, AssetAttributeCreate, AttributeType } from '../../types/assets';

interface Props {
    assetType: AssetType;
    attributes: AssetAttributeCreate[];
    onChange: (attributes: AssetAttributeCreate[]) => void;
    readOnly?: boolean;
}

export const DynamicAttributeForm = ({ assetType, attributes, onChange, readOnly = false }: Props) => {
    
    // Define schema per type
    const getFields = (type: AssetType) => {
        switch (type) {
            case AssetType.HERRAMIENTA:
                return [
                    { name: 'potencia_watts', label: 'Potencia (Watts)', type: AttributeType.NUMERO },
                    { name: 'velocidad_rpm', label: 'Velocidad (RPM)', type: AttributeType.NUMERO },
                    { name: 'capacidad_mm', label: 'Capacidad (mm)', type: AttributeType.NUMERO },
                    { name: 'inalambrica', label: 'Inalámbrica', type: AttributeType.BOOLEANO },
                    { name: 'voltaje', label: 'Voltaje (V)', type: AttributeType.NUMERO },
                ];
            case AssetType.EQUIPO_MEDICION:
                return [
                    { name: 'precision', label: 'Precisión', type: AttributeType.TEXTO },
                    { name: 'rango_min', label: 'Rango Mínimo', type: AttributeType.NUMERO },
                    { name: 'rango_max', label: 'Rango Máximo', type: AttributeType.NUMERO },
                    { name: 'unidad_medida', label: 'Unidad de Medida', type: AttributeType.TEXTO },
                    { name: 'certificado', label: 'Certificado', type: AttributeType.BOOLEANO },
                ];
            case AssetType.ACTIVO_INFORMATICO:
                return [
                    { name: 'procesador', label: 'Procesador', type: AttributeType.TEXTO },
                    { name: 'ram_gb', label: 'RAM (GB)', type: AttributeType.NUMERO },
                    { name: 'almacenamiento_gb', label: 'Almacenamiento (GB)', type: AttributeType.NUMERO },
                    { name: 'sistema_operativo', label: 'Sistema Operativo', type: AttributeType.TEXTO },
                    { name: 'licencias', label: 'Licencias', type: AttributeType.TEXTO },
                ];
            default:
                return [];
        }
    };

    const fields = getFields(assetType);

    const updateAttribute = (name: string, value: string, type: AttributeType) => {
        const newAttrs = [...attributes];
        const index = newAttrs.findIndex(a => a.attribute_name === name);
        
        if (index >= 0) {
            newAttrs[index] = { ...newAttrs[index], attribute_value: value };
        } else {
            newAttrs.push({ attribute_name: name, attribute_value: value, attribute_type: type });
        }
        onChange(newAttrs);
    };

    const getValue = (name: string) => {
        return attributes.find(a => a.attribute_name === name)?.attribute_value || '';
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Especificaciones Técnicas</Text>
            {fields.map((field) => (
                <View key={field.name} style={styles.fieldContainer}>
                    <Text style={styles.label}>{field.label}</Text>
                    
                    {field.type === AttributeType.BOOLEANO ? (
                        <Switch
                            value={getValue(field.name) === 'true'}
                            onValueChange={(val) => {
                                if (!readOnly) updateAttribute(field.name, String(val), field.type);
                            }}
                            disabled={readOnly}
                        />
                    ) : (
                        <TextInput
                            style={[styles.input, readOnly && styles.readOnlyInput]}
                            value={getValue(field.name)}
                            onChangeText={(val) => updateAttribute(field.name, val, field.type)}
                            editable={!readOnly}
                            placeholder={readOnly ? '-' : `Ingrese ${field.label.toLowerCase()}`}
                            keyboardType={field.type === AttributeType.NUMERO ? 'numeric' : 'default'}
                        />
                    )}
                </View>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 8,
        marginTop: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
        color: '#333',
    },
    fieldContainer: {
        marginBottom: 12,
    },
    label: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 10,
        fontSize: 16,
        color: '#333',
    },
    readOnlyInput: {
        backgroundColor: '#f9f9f9',
        color: '#666',
    },
});
