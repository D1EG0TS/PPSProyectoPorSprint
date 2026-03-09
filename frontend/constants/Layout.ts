import { Dimensions } from 'react-native';

const width = Dimensions.get('window').width;
const height = Dimensions.get('window').height;

export const Layout = {
  window: {
    width,
    height,
  },
  isSmallDevice: width < 375,
  isTablet: width >= 768 && width < 1024,
  isDesktop: width >= 1024,
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 16,
    xl: 24,
  },
  breakpoints: {
    phone: 0,
    tablet: 768,
    desktop: 1024,
    largeDesktop: 1280,
  },
};
