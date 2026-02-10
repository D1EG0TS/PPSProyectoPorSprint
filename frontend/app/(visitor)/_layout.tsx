import { Stack } from 'expo-router';

export default function VisitorLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="catalog/index" />
      <Stack.Screen name="catalog/public" />
      <Stack.Screen name="catalog/[id]" />
      <Stack.Screen name="categories/index" />
    </Stack>
  );
}
