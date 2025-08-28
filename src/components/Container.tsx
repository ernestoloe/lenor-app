import React from 'react';
import { StyleSheet, ViewStyle, ImageBackground, View, ViewProps } from 'react-native';
import { theme } from '../theme';
const watermarkSource = require('../../assets/lenor-icon.png');

interface ContainerProps extends ViewProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const Container: React.FC<ContainerProps> = ({ children, style }) => {
  return (
    <View style={[styles.safeArea, style || {}]}>
      {/* Fondo de marca de agua */}
      <ImageBackground
        source={watermarkSource}
        style={styles.watermark}
        resizeMode="contain"
        imageStyle={styles.watermarkImage}
      />
      {/* Contenido principal */}
      <View style={styles.contentContainer}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
  },
  safeArea: {
    backgroundColor: theme.colors.background.primary,
    flex: 1,
  },
  watermark: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: -1,
  },
  watermarkImage: {
    opacity: 0.07,
  }
});
