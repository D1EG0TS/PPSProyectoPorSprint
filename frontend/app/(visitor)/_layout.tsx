import { Stack } from 'expo-router';

export default function VisitorLayout() {
  return (
    <Stack>
      <Stack.Screen name="catalog" options={{ headerShown: false }} />
    </Stack>
  );
}
