import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { theme } from '../theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'destructive' | 'default';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  style?: object;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  fullWidth = false,
  icon,
  style,
}) => {
  const getButtonStyle = () => {
    switch (variant) {
      case 'primary':
        return styles.primaryButton;
      case 'secondary':
        return styles.secondaryButton;
      case 'outline':
        return styles.outlineButton;
      case 'destructive':
        return styles.destructiveButton;
      case 'default':
        return styles.secondaryButton;
      default:
        return styles.primaryButton;
    }
  };

  const getButtonTextStyle = () => {
    switch (variant) {
      case 'primary':
        return styles.primaryButtonText;
      case 'secondary':
        return styles.secondaryButtonText;
      case 'outline':
        return styles.outlineButtonText;
      case 'destructive':
        return styles.destructiveButtonText;
      case 'default':
        return styles.secondaryButtonText;
      default:
        return styles.primaryButtonText;
    }
  };

  const getSizeStyle = () => {
    switch (size) {
      case 'small':
        return styles.smallButton;
      case 'medium':
        return styles.mediumButton;
      case 'large':
        return styles.largeButton;
      default:
        return styles.mediumButton;
    }
  };

  const getTextSizeStyle = () => {
    switch (size) {
      case 'small':
        return styles.smallButtonText;
      case 'medium':
        return styles.mediumButtonText;
      case 'large':
        return styles.largeButtonText;
      default:
        return styles.mediumButtonText;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        getButtonStyle(),
        getSizeStyle(),
        fullWidth && styles.fullWidth,
        disabled && styles.disabledButton,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      {disabled ? (
        <ActivityIndicator color={variant === 'primary' ? theme.colors.text.primary : theme.colors.accent.primary} />
      ) : (
        <View style={styles.buttonContent}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text
            style={[
              styles.buttonText,
              getButtonTextStyle(),
              getTextSizeStyle(),
              disabled && styles.disabledButtonText,
            ]}
          >
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
  },
  buttonContent: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonText: {
    ...theme.typography.styles.button,
    textAlign: 'center',
  },
  disabledButton: {
    backgroundColor: theme.colors.ui.button.disabled,
    opacity: 0.7,
  },
  disabledButtonText: {
    color: theme.colors.text.disabled,
  },
  fullWidth: {
    width: '100%',
  },
  iconContainer: {
    marginRight: theme.spacing.sm,
  },
  largeButton: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
  },
  largeButtonText: {
    fontSize: theme.typography.fontSize.lg,
  },
  mediumButton: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  mediumButtonText: {
    fontSize: theme.typography.fontSize.md,
  },
  outlineButton: {
    backgroundColor: theme.colors.transparent,
    borderColor: theme.colors.accent.primary,
    borderWidth: 1,
  },
  outlineButtonText: {
    color: theme.colors.accent.primary,
  },
  primaryButton: {
    backgroundColor: theme.colors.ui.button.primary,
  },
  primaryButtonText: {
    color: theme.colors.text.primary,
  },
  secondaryButton: {
    backgroundColor: theme.colors.ui.button.secondary,
  },
  secondaryButtonText: {
    color: theme.colors.text.primary,
  },
  smallButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  smallButtonText: {
    fontSize: theme.typography.fontSize.sm,
  },
  destructiveButton: {
    backgroundColor: theme.colors.status.error,
  },
  destructiveButtonText: {
    color: theme.colors.text.primary,
  },
});
