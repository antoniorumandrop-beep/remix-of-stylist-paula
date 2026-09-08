import { describe, expect, it } from 'vitest';
import { enrichFromText } from './enrich';

describe('enrichFromText', () => {
  it('reads silhouette, length and closure out of an English product name', () => {
    const a = enrichFromText({ name: 'Floral Wrap Midi Dress' });
    expect(a.silhouette?.value).toBe('wrap');
    expect(a.lengthClass?.value).toBe('midi');
    expect(a.closureType?.value).toBe('wrap-tie');
    expect(a.waistDefinition?.value).toBe('natural');
  });

  it('reads the same things out of a Polish product name', () => {
    const a = enrichFromText({ name: 'Sukienka midi kopertowa z dekoltem w serek' });
    expect(a.silhouette?.value).toBe('wrap');
    expect(a.lengthClass?.value).toBe('midi');
    expect(a.neckline?.value).toBe('v');
  });

  it('gets rise from "high-waist" and from "wysoki stan"', () => {
    expect(enrichFromText({ name: 'High-Waist Jeans' }).rise?.value).toBe('high');
    expect(enrichFromText({ name: 'Jeansy z wysokim stanem' }).rise?.value).toBe('high');
  });

  it('marks tanks and camisoles sleeveless', () => {
    expect(enrichFromText({ name: 'Ribbed Tank Top' }).sleeveLength?.value).toBe('sleeveless');
    expect(enrichFromText({ name: 'Silk Camisole' }).sleeveLength?.value).toBe('sleeveless');
  });

  it('trusts the name more than the description', () => {
    const a = enrichFromText({ name: 'Oversized Blazer', description: 'A fitted look for the office' });
    expect(a.silhouette?.value).toBe('oversized');
    expect(a.silhouette?.confidence).toBeGreaterThan(0.6);
  });

  it('falls back to the description when the name is silent', () => {
    const a = enrichFromText({ name: 'Summer Dress', description: 'Flared skirt, square neckline' });
    expect(a.silhouette?.value).toBe('flared');
    expect(a.neckline?.value).toBe('square');
    expect(a.silhouette?.confidence).toBe(0.6);
  });

  it('derives stretch from the material', () => {
    const a = enrichFromText({ name: 'Basic Top', material: '95% cotton, 5% elastane' });
    expect(a.stretchLevel?.value).toBe('high');
  });

  it('leaves out what it cannot see instead of guessing', () => {
    const a = enrichFromText({ name: 'Structured Tote Bag' });
    expect(a.silhouette).toBeUndefined();
    expect(a.lengthClass).toBeUndefined();
    expect(a.stretchLevel).toBeUndefined();
  });

  it('never invents a length for a dress that does not state one', () => {
    expect(enrichFromText({ name: 'Garden Party Dress' }).lengthClass).toBeUndefined();
  });
});
