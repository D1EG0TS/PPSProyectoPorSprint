import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { TextInput, HelperText, TextInputProps } from 'react-native-paper';
import { Control, Controller, FieldValues, Path } from 'react-hook-form';

interface InputProps<T extends FieldValues> extends Omit<TextInputProps, 'theme' | 'error'> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export function Input<T extends FieldValues>({
  name,
  control,
  label,
  error: propError,
  containerStyle,
  ...props
}: InputProps<T>) {
  return (
    <View style={[styles.container, containerStyle]}>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => {
          const errorMessage = propError || error?.message;
          return (
            <>
              <TextInput
                label={label}
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                mode="outlined"
                error={!!errorMessage}
                {...props}
              />
              <HelperText type="error" visible={!!errorMessage}>
                {errorMessage}
              </HelperText>
            </>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
    width: '100%',
  },
});
