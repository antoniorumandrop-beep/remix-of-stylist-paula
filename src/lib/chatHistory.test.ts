import { describe, it, expect, beforeEach } from 'vitest';
import { saveChat, loadChat, clearChat, EMPTY_CHAT, CHAT_STORAGE_KEY } from './chatHistory';

/**
 * The whole conversation lived in component state, so tapping a product and
 * pressing back emptied it — the pills, the questions, and Paula's answers.
 */
const message = (id: string, text: string) => ({ id, sender: 'user' as const, text });

describe('chatHistory', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('gives an empty thread when nothing was ever stored', () => {
    expect(loadChat()).toEqual(EMPTY_CHAT);
  });

  it('brings the conversation back', () => {
    saveChat({
      messages: [message('1', 'szukam sukienki'), { id: '2', sender: 'paula', text: 'Na jaką okazję?' }],
      pills: [{ key: 'category', label: 'Kategoria', value: 'Sukienki' }],
      productIds: ['p1', 'p2'],
      dupeMode: true,
      dupeReference: 899,
    });

    const loaded = loadChat();
    expect(loaded.messages).toHaveLength(2);
    expect(loaded.messages[1].text).toBe('Na jaką okazję?');
    expect(loaded.pills[0].value).toBe('Sukienki');
    expect(loaded.productIds).toEqual(['p1', 'p2']);
    expect(loaded.dupeMode).toBe(true);
    expect(loaded.dupeReference).toBe(899);
  });

  it('keeps a photo message but drops the image itself', () => {
    // Photos are read as data URLs running to megabytes; storing two or three
    // would fill the session quota and the next write would throw.
    saveChat({
      ...EMPTY_CHAT,
      messages: [{ id: '1', sender: 'user', text: 'zdjęcie', photoUploaded: true, photoUrl: 'data:image/jpeg;base64,AAAA' }],
    });

    const [restoredMessage] = loadChat().messages;
    expect(restoredMessage.photoUploaded).toBe(true);
    expect(restoredMessage.photoUrl).toBeUndefined();
  });

  it('keeps only the most recent hundred messages', () => {
    const many = Array.from({ length: 150 }, (_, i) => message(String(i), `wiadomość ${i}`));
    saveChat({ ...EMPTY_CHAT, messages: many });

    const loaded = loadChat();
    expect(loaded.messages).toHaveLength(100);
    expect(loaded.messages[0].text).toBe('wiadomość 50');
    expect(loaded.messages[99].text).toBe('wiadomość 149');
  });

  it('ignores stored rubbish rather than crashing the screen', () => {
    sessionStorage.setItem(CHAT_STORAGE_KEY, 'to nie jest json');
    expect(loadChat()).toEqual(EMPTY_CHAT);
  });

  it('ignores a payload from a shape it does not know', () => {
    sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify({ version: 99, messages: [message('1', 'x')] }));
    expect(loadChat()).toEqual(EMPTY_CHAT);
  });

  it('drops individual messages that are malformed', () => {
    sessionStorage.setItem(
      CHAT_STORAGE_KEY,
      JSON.stringify({ version: 1, messages: [message('1', 'dobra'), { id: '2' }, { id: '3', sender: 'kto', text: 'x' }] }),
    );
    expect(loadChat().messages).toHaveLength(1);
  });

  it('clears the thread on request', () => {
    saveChat({ ...EMPTY_CHAT, messages: [message('1', 'x')] });
    clearChat();
    expect(loadChat()).toEqual(EMPTY_CHAT);
  });
});
