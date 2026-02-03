/**
 * PartyKit Yjs server: room id = documentId.
 * Load/save document state via Next.js API (which uses Supabase).
 * Set PARTYKIT_APP_URL and PARTYKIT_SECRET in env.
 */
import type * as Party from "partykit/server";
import { onConnect } from "y-partykit";
import * as Y from "yjs";

const APP_URL = process.env.PARTYKIT_APP_URL ?? "http://127.0.0.1:3000";
const SECRET = process.env.PARTYKIT_SECRET ?? "";

async function loadDoc(roomId: string): Promise<Y.Doc | null> {
  const url = `${APP_URL}/api/partykit/load?documentId=${encodeURIComponent(roomId)}`;
  const res = await fetch(url, {
    headers: SECRET ? { Authorization: `Bearer ${SECRET}` } : {},
  });
  if (!res.ok || res.status === 404) return null;
  const json = (await res.json()) as { contentYjsBase64?: string };
  const base64 = json.contentYjsBase64;
  if (!base64 || typeof base64 !== "string") return null;
  const binary = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const doc = new Y.Doc();
  Y.applyUpdate(doc, binary);
  return doc;
}

async function saveDoc(roomId: string, doc: Y.Doc): Promise<void> {
  const state = Y.encodeStateAsUpdate(doc);
  const base64 = btoa(String.fromCharCode(...state));
  const url = `${APP_URL}/api/partykit/save`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(SECRET ? { Authorization: `Bearer ${SECRET}` } : {}),
    },
    body: JSON.stringify({ documentId: roomId, contentYjsBase64: base64 }),
  });
  if (!res.ok) {
    console.error("[partykit] save failed", roomId, res.status);
  }
}

export default class YjsRoom implements Party.Server {
  constructor(readonly room: Party.Room) {}

  async onConnect(conn: Party.Connection) {
    const documentId = this.room.id;
    return onConnect(conn, this.room, {
      load: () => loadDoc(documentId),
      callback: {
        handler: (doc: Y.Doc) => saveDoc(documentId, doc),
        debounceWait: 2000,
        debounceMaxWait: 10000,
      },
    });
  }
}
