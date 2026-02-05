import { useWindowDimensions } from 'react-native';

export const useResponsive = () => {
  const { width, height } = useWindowDimensions();

  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;
  const isSmallDevice = width < 375;

  return {
    width,
    height,
    isMobile,
    isTablet,
    isDesktop,
    isSmallDevice,
    // Dynamic values based on breakpoints
    contentWidth: isDesktop ? 480 : isTablet ? 400 : '100%',
    paddingHorizontal: isSmallDevice ? 16 : isDesktop ? 48 : 24,
    fontSize: {
      title: isSmallDevice ? 20 : 24,
      subtitle: isSmallDevice ? 12 : 14,
      body: isSmallDevice ? 13 : 14,
    }
  };
};
