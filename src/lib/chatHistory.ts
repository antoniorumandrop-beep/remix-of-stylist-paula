import type { Chip } from '@/lib/ai';
import type { ContextPill } from '@/lib/ai';

/**
 * Keeping the conversation across a trip to a product page.
 *
 * The whole conversation lived in component state, so tapping a product and
 * pressing back emptied it: the pills she had built up, what she had asked,
 * and Paula's answers were all gone, and there was nothing to suggest they
 * would be. A conversation that forgets itself the moment you look at
 * something it recommended is not usable as a conversation.
 *
 * `sessionStorage` rather than `localStorage`: this is one visit's thread, not
 * a permanent record, and it should not follow her into next week.
 *
 * PLUG(supabase): a durable thread, if the product ever wants one, belongs in
 * a `conversations` table behind the backend contract — not here.
 */

export interface StoredMessage {
  id: string;
  sender: 'user' | 'paula';
  text: string;
  chips?: Chip[];
  photoUploaded?: boolean;
  photoUrl?: string;
}

export interface StoredChat {
  version: 1;
  messages: StoredMessage[];
  pills: ContextPill[];
  /** Product ids only; the objects are re-resolved against the live catalogue. */
  productIds: string[];
  dupeMode: boolean;
  dupeReference: number;
}

export const CHAT_STORAGE_KEY = 'paula.chat';

/**
 * Photos are read as data URLs, which run to megabytes each. Persisting them
 * would fill the session quota after two or three pictures and throw on the
 * next write. The message is kept without its image — the bubble already has
 * a placeholder for exactly that case — so the thread survives and the photo
 * does not take it down with it.
 */
const MAX_MESSAGES = 100;

function strip(messages: StoredMessage[]): StoredMessage[] {
  return messages.slice(-MAX_MESSAGES).map(({ photoUrl, ...rest }) => rest);
}

export function saveChat(state: Omit<StoredChat, 'version'>): void {
  try {
    const payload: StoredChat = { version: 1, ...state, messages: strip(state.messages) };
    sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // A full or unavailable session store must never cost her the message she
    // is in the middle of sending.
  }
}

export const EMPTY_CHAT: Omit<StoredChat, 'version'> = {
  messages: [],
  pills: [],
  productIds: [],
  dupeMode: false,
  dupeReference: 0,
};

export function loadChat(): Omit<StoredChat, 'version'> {
  try {
    const raw = sessionStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return EMPTY_CHAT;
    const parsed = JSON.parse(raw) as Partial<StoredChat>;
    // An older or hand-edited shape is not worth guessing at.
    if (parsed?.version !== 1 || !Array.isArray(parsed.messages)) return EMPTY_CHAT;
    return {
      messages: parsed.messages.filter(m => m && typeof m.text === 'string' && (m.sender === 'user' || m.sender === 'paula')),
      pills: Array.isArray(parsed.pills) ? parsed.pills : [],
      productIds: Array.isArray(parsed.productIds) ? parsed.productIds : [],
      dupeMode: Boolean(parsed.dupeMode),
      dupeReference: typeof parsed.dupeReference === 'number' ? parsed.dupeReference : 0,
    };
  } catch {
    return EMPTY_CHAT;
  }
}

export function clearChat(): void {
  try {
    sessionStorage.removeItem(CHAT_STORAGE_KEY);
  } catch {
    // Nothing to do; the thread simply outlives the attempt to clear it.
  }
}
