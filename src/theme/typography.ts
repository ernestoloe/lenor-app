import { TextStyle } from 'react-native';

type FontWeight = 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';

interface TypographyStyles {
  fontFamily: {
    primary: string;
    secondary: string;
  };
  fontSize: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  fontWeight: {
    light: FontWeight;
    regular: FontWeight;
    medium: FontWeight;
    semibold: FontWeight;
    bold: FontWeight;
  };
  lineHeight: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  styles: {
    h1: TextStyle;
    h2: TextStyle;
    h3: TextStyle;
    h4: TextStyle;
    body1: TextStyle;
    body2: TextStyle;
    button: TextStyle;
    caption: TextStyle;
    overline: TextStyle;
  };
}

export const typography: TypographyStyles = {
  fontFamily: {
    primary: 'Roboto-Regular',
    secondary: 'System',
  },
  fontSize: {
    xs: 14,
    sm: 16,
    md: 18,
    lg: 20,
    xl: 26,
    xxl: 34,
  },
  fontWeight: {
    light: '300',
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeight: {
    xs: 18,
    sm: 22,
    md: 26,
    lg: 30,
    xl: 34,
    xxl: 42,
  },
  styles: {
    h1: {
      fontFamily: 'Roboto-Bold',
      fontSize: 34,
      fontWeight: '700',
      lineHeight: 42,
    },
    h2: {
      fontFamily: 'Roboto-Bold',
      fontSize: 26,
      fontWeight: '700',
      lineHeight: 34,
    },
    h3: {
      fontFamily: 'Roboto-Medium',
      fontSize: 22,
      fontWeight: '600',
      lineHeight: 30,
    },
    h4: {
      fontFamily: 'Roboto-Medium',
      fontSize: 20,
      fontWeight: '600',
      lineHeight: 28,
    },
    body1: {
      fontFamily: 'Roboto-Regular',
      fontSize: 18,
      fontWeight: '400',
      lineHeight: 26,
    },
    body2: {
      fontFamily: 'Roboto-Regular',
      fontSize: 16,
      fontWeight: '400',
      lineHeight: 22,
    },
    button: {
      fontFamily: 'Roboto-Medium',
      fontSize: 18,
      fontWeight: '600',
      lineHeight: 26,
      textTransform: 'none',
    },
    caption: {
      fontFamily: 'Roboto-Regular',
      fontSize: 14,
      fontWeight: '400',
      lineHeight: 18,
    },
    overline: {
      fontFamily: 'Roboto-Medium',
      fontSize: 14,
      fontWeight: '500',
      lineHeight: 18,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
  },
};
