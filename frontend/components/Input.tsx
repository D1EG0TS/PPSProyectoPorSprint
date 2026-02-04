import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { TextInput, HelperText, TextInputProps } from 'react-native-paper';
import { Control, Controller, FieldValues, Path, RegisterOptions } from 'react-hook-form';

interface InputProps<T extends FieldValues> extends Omit<TextInputProps, 'theme' | 'error'> {
  name?: Path<T>;
  control?: Control<T>;
  rules?: RegisterOptions<T, Path<T>>;
  label?: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export function Input<T extends FieldValues>({
  name,
  control,
  rules,
  label,
  error: propError,
  containerStyle,
  ...props
}: InputProps<T>) {
  const [isPasswordVisible, setIsPasswordVisible] = React.useState(false);
  const isPassword = props.secureTextEntry;

  const rightIcon = isPassword ? (
    <TextInput.Icon
      icon={isPasswordVisible ? "eye-off" : "eye"}
      onPress={() => setIsPasswordVisible(!isPasswordVisible)}
      forceTextInputFocus={false}
      testID="password-toggle"
    />
  ) : props.right;

  const secureTextEntry = isPassword ? !isPasswordVisible : props.secureTextEntry;

  // If control and name are provided, use React Hook Form Controller
  if (control && name) {
    return (
      <View style={[styles.container, containerStyle]}>
        <Controller
          control={control}
          name={name}
          rules={rules}
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
                  secureTextEntry={secureTextEntry}
                  right={rightIcon}
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

  // Otherwise, use standard TextInput
  return (
    <View style={[styles.container, containerStyle]}>
      <TextInput
        label={label}
        mode="outlined"
        error={!!propError}
        {...props}
        secureTextEntry={secureTextEntry}
        right={rightIcon}
      />
      <HelperText type="error" visible={!!propError}>
        {propError}
      </HelperText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
    width: '100%',
  },
});
