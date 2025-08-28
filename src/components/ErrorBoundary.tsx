import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { theme } from '../theme';

type Props = { children: React.ReactNode };
type State = { hasError: boolean; error?: Error };

export class GlobalErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Unhandled error caught in GlobalErrorBoundary:', error, info);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>¡Oops! La aplicación ha fallado</Text>
          <ScrollView style={styles.scroll}>
            <Text style={styles.errorTitle}>Error:</Text>
            <Text selectable style={styles.errorMessage}>
              {this.state.error.name}: {this.state.error.message}
            </Text>
            <Text style={styles.errorTitle}>Stack Trace:</Text>
            <Text selectable style={styles.stack}>
              {this.state.error.stack}
            </Text>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: theme.colors.background.primary,
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  errorMessage: {
    color: theme.colors.text.primary,
    fontFamily: 'monospace',
    fontSize: 16,
  },
  errorTitle: {
    color: theme.colors.status.error,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    marginTop: 10,
  },
  scroll: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 8,
    flex: 1,
    padding: 15,
    width: '100%',
  },
  stack: {
    color: theme.colors.text.secondary,
    fontFamily: 'monospace',
    fontSize: 14,
    lineHeight: 20,
  },
  title: {
    color: theme.colors.text.primary,
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
}); 