import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
} from "react-native";
import Markdown from "react-native-markdown-display";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useTheme } from "../contexts/ThemeContext";
import { messageStore } from "../services/messageStore";
import type { Message } from "../types/chat";
import type { AppTheme } from "../types/app";

type Props = {
  messageObject: Message;
};

export const MessageBubble: React.FC<Props> = ({ messageObject }) => {
  const { id, text, isUser, hasBeenDisplayed, imageUrl } = messageObject;
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [visibleText, setVisibleText] = useState(
    isUser || hasBeenDisplayed ? text : ""
  );
  const [showCopyButton, setShowCopyButton] = useState(false);

  useEffect(() => {
    if (!isUser && !hasBeenDisplayed && text) {
      let i = 0;
      const interval = setInterval(() => {
        setVisibleText((prev) => prev + text[i]);
        i++;
        if (i >= text.length) {
          clearInterval(interval);
          messageStore.markMessageAsDisplayed(id);
        }
      }, 30);
      return () => clearInterval(interval);
    }
  }, [hasBeenDisplayed, id, text, isUser]);

  const handleCopyText = async () => {
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert("✅ Copiado", "Texto copiado al portapapeles");
      setShowCopyButton(false);
    } catch {
      Alert.alert("❌ Error", "No se pudo copiar el texto");
    }
  };

  if (isUser) {
    return (
      <View style={styles.userBubble}>
        <Text style={styles.userText}>{text}</Text>
        {imageUrl && (
          <Image source={{ uri: imageUrl }} style={styles.image} />
        )}
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={styles.aiMessageWrapper}
      activeOpacity={0.8}
      onPress={() => setShowCopyButton((prev) => !prev)}
    >
      <Markdown style={markdownStyles(theme)}>
        {visibleText || "*...*"}
      </Markdown>

      {imageUrl && (
        <Image source={{ uri: imageUrl }} style={styles.image} />
      )}

      {showCopyButton && (
        <TouchableOpacity style={styles.copyButton} onPress={handleCopyText}>
          <Ionicons
            name="copy-outline"
            size={16}
            color={theme.colors.text.secondary}
          />
          <Text style={styles.copyButtonText}>Copiar</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    userBubble: {
      alignSelf: "flex-end",
      backgroundColor: theme.colors.accent.primary,
      borderRadius: 24,
      marginVertical: 4,
      maxWidth: "80%",
      paddingHorizontal: 18,
      paddingVertical: 12,
    },
    userText: {
      color: theme.colors.text.onAccent,
      fontSize: 16,
    },
    aiMessageWrapper: {
      alignSelf: "flex-start",
      backgroundColor: theme.colors.background.secondary,
      borderRadius: 18,
      marginVertical: 4,
      padding: 12,
      maxWidth: "90%",
    },
    copyButton: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 8,
      paddingVertical: 4,
      paddingHorizontal: 10,
      backgroundColor: theme.colors.background.secondary,
      borderRadius: 12,
      alignSelf: "flex-start",
    },
    copyButtonText: {
      color: theme.colors.text.secondary,
      fontSize: 14,
      marginLeft: 6,
    },
    image: {
      width: 180,
      height: 180,
      borderRadius: 12,
      marginTop: 8,
    },
  });

const markdownStyles = (theme: AppTheme) => ({
  body: {
    color: theme.colors.text.primary,
    fontSize: 16,
    lineHeight: 22,
  },
});
