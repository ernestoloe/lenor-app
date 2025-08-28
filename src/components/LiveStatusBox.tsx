import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { AppTheme } from '../types/app';

interface LiveStatusBoxProps {
  title: string;
  status: string | null;
  isLoading?: boolean;
}

const LiveStatusBox: React.FC<LiveStatusBoxProps> = ({ title, status, isLoading = false }) => {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const getStatusColor = () => {
    if (isLoading || !status) {
      return theme.colors.text.secondary;
    }
    const lowerCaseStatus = status.toLowerCase();
    if (lowerCaseStatus.includes('ok') || lowerCaseStatus.includes('conectado')) {
      return theme.colors.status.success;
    }
    if (lowerCaseStatus.includes('error') || lowerCaseStatus.includes('no')) {
      return theme.colors.status.error;
    }
    return theme.colors.text.secondary;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {isLoading ? (
        <ActivityIndicator size="small" color={theme.colors.text.secondary} />
      ) : (
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
          <Text style={[styles.statusText, { color: getStatusColor() }]}>{status || 'N/A'}</Text>
        </View>
      )}
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.background.secondary,
      borderRadius: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
    },
    title: {
      color: theme.colors.text.primary,
      fontSize: theme.typography.fontSize.md,
      fontWeight: 'bold',
    },
    statusContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    statusDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginRight: theme.spacing.sm,
    },
    statusText: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: 'bold',
    },
  });

export default LiveStatusBox; 