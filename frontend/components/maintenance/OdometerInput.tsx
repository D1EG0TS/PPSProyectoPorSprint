import React from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, HelperText, Text } from 'react-native-paper';
import { Input } from '../Input';
import { Control, FieldValues, Path } from 'react-hook-form';

interface Props<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  lastOdometer?: number;
  label?: string;
  required?: boolean;
}

export function OdometerInput<T extends FieldValues>({ 
  name, 
  control, 
  lastOdometer, 
  label = "Kilometraje actual",
  required = true 
}: Props<T>) {
  
  const validateOdometer = (value: string) => {
    const num = parseInt(value, 10);
    if (isNaN(num)) return "Debe ser un número válido";
    if (num < 0) return "No puede ser negativo";
    if (lastOdometer && num < lastOdometer) {
      return `No puede ser menor al último registro (${lastOdometer} km)`;
    }
    return true;
  };

  return (
    <View style={styles.container}>
      <Input
        name={name}
        control={control}
        label={label}
        keyboardType="numeric"
        rules={{
          required: required ? "Este campo es requerido" : false,
          validate: validateOdometer
        }}
        right={<TextInput.Icon icon="speedometer" />}
      />
      {lastOdometer !== undefined && (
        <HelperText type="info" visible>
          Último registro: {lastOdometer} km
        </HelperText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  }
});
