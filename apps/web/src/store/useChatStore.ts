import { create } from "zustand";
import type { ChatMessage } from "@scratchpad/shared";

interface ChatState {
  messagesByProject: Record<string, ChatMessage[]>;
  isSending: boolean;
  setMessages: (projectId: string, messages: ChatMessage[]) => void;
  appendMessage: (projectId: string, message: ChatMessage) => void;
  setSending: (sending: boolean) => void;
}

// TODO: wire appendMessage to POST /api/chat/:projectId/messages.
export const useChatStore = create<ChatState>((set) => ({
  messagesByProject: {},
  isSending: false,
  setMessages: (projectId, messages) =>
    set((state) => ({ messagesByProject: { ...state.messagesByProject, [projectId]: messages } })),
  appendMessage: (projectId, message) =>
    set((state) => ({
      messagesByProject: {
        ...state.messagesByProject,
        [projectId]: [...(state.messagesByProject[projectId] ?? []), message],
      },
    })),
  setSending: (sending) => set({ isSending: sending }),
}));
