import { Redirect } from 'expo-router';

export default function PublicCatalogRedirect() {
  return <Redirect href="/(visitor)/catalog" />;
}
