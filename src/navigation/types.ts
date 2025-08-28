export type RootTabParamList = {
  Conversations: undefined;
  Chat: { conversationId?: string } | undefined;
  VoiceMode: undefined;
  Profile: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Main: undefined;
  Auth: undefined;
};