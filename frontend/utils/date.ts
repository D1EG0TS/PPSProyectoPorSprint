export const getExpirationStatus = (expirationDate: string | null | undefined) => {
  if (!expirationDate) return { color: 'gray', label: 'N/A' };
  
  const today = new Date();
  const exp = new Date(expirationDate);
  const diffTime = exp.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return { color: '#B00020', label: 'Expired' }; // Error red
  if (diffDays <= 30) return { color: '#F57C00', label: 'Expiring Soon' }; // Warning orange
  return { color: '#4CAF50', label: 'Valid' }; // Success green
};
