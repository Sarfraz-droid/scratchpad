// Shared types used by both apps/web and apps/server.
// Keep this package framework-agnostic (no React, no Elysia, no LangChain imports).

export type ProjectId = string;
export type ChatId = string;
export type MessageId = string;

export interface Project {
  id: ProjectId;
  name: string;
  emoji: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: MessageId;
  chatId: ChatId;
  projectId: ProjectId;
  role: ChatRole;
  content: string;
  createdAt: string;
}

export interface Chat {
  id: ChatId;
  projectId: ProjectId;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface CanvasDocument {
  id: string;
  projectId: ProjectId;
  // Raw tldraw store snapshot (JSON). Typed as unknown here so this package
  // does not depend on the tldraw SDK.
  snapshot: unknown;
  updatedAt: string;
}

export type FileKind = "image" | "pdf" | "document" | "other";

export interface ProjectFile {
  id: string;
  projectId: ProjectId;
  name: string;
  kind: FileKind;
  sizeBytes: number;
  storagePath: string;
  createdAt: string;
}

export interface ProjectNote {
  id: string;
  projectId: ProjectId;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface SendChatMessageRequest {
  projectId: ProjectId;
  chatId: ChatId;
  content: string;
}

export interface SendChatMessageResponse {
  message: ChatMessage;
}

// Elements the chat model can ask to have created on the canvas (see the
// `create_canvas_elements` tool in apps/server). Applied client-side against
// the live tldraw editor — see apps/web's applyCanvasActions — because shapes
// can only be created correctly through tldraw's own editor API, not by
// writing raw records into the stored snapshot.
export type CanvasElementKind = "note" | "text" | "frame";

export type CanvasNoteColor =
  | "black"
  | "blue"
  | "green"
  | "grey"
  | "light-blue"
  | "light-green"
  | "light-red"
  | "light-violet"
  | "orange"
  | "red"
  | "violet"
  | "white"
  | "yellow";

export interface CanvasElementAction {
  kind: CanvasElementKind;
  text: string;
  color?: CanvasNoteColor;
}
