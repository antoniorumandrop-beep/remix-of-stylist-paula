import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, ImagePlus, X } from 'lucide-react';
import type { Product } from '@/lib/catalog/types';
import { ProductCard } from '@/components/ProductCard';
import { useLanguage } from '@/i18n/LanguageContext';
import { useBodyProfile } from '@/lib/profile';
import { useUserPrefs } from '@/lib/prefs';
import { useCatalog } from '@/lib/catalog/useCatalog';
import { sortByFit } from '@/lib/fit/product';
import { sortProducts, type SortMode } from '@/lib/catalog/sort';
import { findDupes, discountPercent, DEMO_REFERENCE_PRICE } from '@/lib/catalog/dupes';
import { loadChat, saveChat } from '@/lib/chatHistory';
import { shapeKey } from '@/lib/fit/copy';
import { stylist, type ContextPill, type Chip } from '@/lib/ai';

interface Message {
  id: string;
  sender: 'user' | 'paula';
  text: string;
  chips?: Chip[];
  photoUploaded?: boolean;
  photoUrl?: string;
}


export default function SearchPage() {
  const navigate = useNavigate();
  const { lang, t } = useLanguage();
  const { prefs } = useUserPrefs();
  const userName = prefs.name ?? '';
  const inspirations = prefs.inspirations;
  const { profile, shape } = useBodyProfile();
  const { products: catalog } = useCatalog();
  // Restored once, at mount: the conversation has to survive a trip to a
  // product page and back, which is the single most likely thing she does
  // next after Paula shows her something.
  const [restored] = useState(loadChat);
  const [messages, setMessages] = useState<Message[]>(restored.messages);
  const [inputValue, setInputValue] = useState('');
  const [contextPills, setContextPills] = useState<ContextPill[]>(restored.pills);
  const [currentProducts, setCurrentProducts] = useState<Product[]>([]);
  const [editingPill, setEditingPill] = useState<string | null>(null);
  const [pillEditValue, setPillEditValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dupeMode, setDupeMode] = useState(restored.dupeMode);
  const [dupeReference, setDupeReference] = useState(restored.dupeReference);
  const [sortMode, setSortMode] = useState<SortMode>('fit');
  // Between sending and the answer nothing moved on screen, so a slow turn was
  // indistinguishable from a message that never sent.
  const [paulaThinking, setPaulaThinking] = useState(false);

  const runSimilarSearch = () => {
    const similar = sortByFit(catalog, profile, (a, b) => a.price - b.price).slice(0, 12);
    setDupeReference(DEMO_REFERENCE_PRICE);
    setDupeMode(false);
    setCurrentProducts(similar);
    setMessages(prev => [...prev, {
      id: `p-${Date.now()}`,
      sender: 'paula',
      text: t('paulaSimilarFound', similar.length),
      chips: [
        { id: 'second-hand', label: t('chipSecondHand') },
        { id: 'under-100', label: t('chipUnder100') },
      ],
    }]);
  };

  const runDupeSearch = () => {
    const dupes = findDupes(catalog, profile, DEMO_REFERENCE_PRICE);
    setDupeReference(DEMO_REFERENCE_PRICE);
    setDupeMode(true);
    setCurrentProducts(dupes);
    setMessages(prev => [...prev, {
      id: `p-${Date.now()}`,
      sender: 'paula',
      text: t('paulaDupesFound', dupes.length, DEMO_REFERENCE_PRICE),
      chips: [
        { id: 'second-hand', label: t('chipSecondHand') },
        { id: 'under-100', label: t('chipUnder100') },
      ],
    }]);
  };

  const runBothSearch = () => {
    const both = sortByFit(catalog, profile, (a, b) => a.price - b.price).slice(0, 12);
    setDupeReference(DEMO_REFERENCE_PRICE);
    setDupeMode(true);
    setCurrentProducts(both);
    setMessages(prev => [...prev, {
      id: `p-${Date.now()}`,
      sender: 'paula',
      text: t('paulaBothFound', both.length, DEMO_REFERENCE_PRICE),
      chips: [
        { id: 'second-hand', label: t('chipSecondHand') },
        { id: 'under-100', label: t('chipUnder100') },
      ],
    }]);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result);
      setMessages(prev => [...prev, {
        id: `u-${Date.now()}`,
        sender: 'user',
        text: t('photoUploaded'),
        photoUploaded: true,
        photoUrl: url,
      }]);
      setPaulaThinking(true);
      setTimeout(() => {
        setPaulaThinking(false);
        setMessages(prev => [...prev, {
          id: `p-${Date.now()}`,
          sender: 'paula',
          text: t('paulaPhotoReceived'),
          chips: [
            { id: 'find-same', label: t('findSame') },
            { id: 'find-dupes', label: t('findDupes') },
            { id: 'find-both', label: t('findBoth') },
          ],
        }]);
      }, 500);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, paulaThinking]);

  const removePill = (key: string) => {
    setContextPills(prev => prev.filter(p => p.key !== key));
  };

  const startEditPill = (pill: ContextPill) => {
    setEditingPill(pill.key);
    setPillEditValue(pill.value);
  };

  const savePillEdit = (key: string) => {
    if (pillEditValue.trim()) {
      setContextPills(prev => prev.map(p => p.key === key ? { ...p, value: pillEditValue.trim() } : p));
    }
    setEditingPill(null);
  };

  const addMessage = (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: text.trim(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');

    // One turn to Paula's brain. Local rules today, the model once
    // VITE_AI_ENDPOINT is set — this screen does not change either way.
    const history = messages.map(m => ({ sender: m.sender, text: m.text }));
    setPaulaThinking(true);
    void stylist
      .respond({ text: text.trim(), history, pills: contextPills, profile, catalog, lang })
      .then(({ reply, chips, products, pills }) => {
        setPaulaThinking(false);
        setContextPills(pills);
        if (products) setCurrentProducts(products);
        setMessages(prev => [...prev, {
          id: `p-${Date.now()}`,
          sender: 'paula',
          text: reply,
          chips,
        }]);
      })
      .catch(() => {
        setPaulaThinking(false);
        setMessages(prev => [...prev, { id: `p-${Date.now()}`, sender: 'paula', text: t('paulaUnavailable') }]);
      });
  };

  const handleSend = () => addMessage(inputValue);
  /**
   * Branch on the chip's id, never on its text. The visible label is
   * translated copy — matching against it meant a reworded Polish string, or a
   * language switch mid-conversation, silently turned a photo-search chip into
   * an ordinary message to Paula.
   */
  const PHOTO_SEARCHES: Record<string, () => void> = {
    'find-same': runSimilarSearch,
    'find-dupes': runDupeSearch,
    'find-both': runBothSearch,
  };

  const handleChipClick = (chip: Chip) => {
    const search = PHOTO_SEARCHES[chip.id];
    if (!search) {
      addMessage(chip.label);
      return;
    }
    setMessages(prev => [...prev, { id: `u-${Date.now()}`, sender: 'user', text: chip.label }]);
    setPaulaThinking(true);
    setTimeout(() => {
      setPaulaThinking(false);
      search();
    }, 500);
  };


  const restoredIds = restored.productIds;
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current || restoredIds.length === 0 || catalog.length === 0) return;
    restoredRef.current = true;
    const byId = new Map(catalog.map(p => [p.id, p]));
    const found = restoredIds.map(id => byId.get(id)).filter((p): p is Product => Boolean(p));
    if (found.length > 0) setCurrentProducts(found);
  }, [restoredIds, catalog]);

  // Persisting ids rather than product objects keeps the payload small and
  // stops a stale copy of a product outliving the catalogue it came from.
  useEffect(() => {
    saveChat({
      messages,
      pills: contextPills,
      productIds: currentProducts.map(p => p.id),
      dupeMode,
      dupeReference,
    });
  }, [messages, contextPills, currentProducts, dupeMode, dupeReference]);

  const sortedProducts = useMemo(
    () => sortProducts(currentProducts, profile, sortMode),
    [currentProducts, profile, sortMode],
  );

  const lastPaulaMsg = [...messages].reverse().find(m => m.sender === 'paula');
  const activeChips = lastPaulaMsg?.chips;

  return (
    <div className="h-full flex flex-col lg:flex-row overflow-hidden">
      <div className={`flex flex-col lg:w-1/2 lg:max-w-xl lg:border-r border-border min-h-0 ${currentProducts.length > 0 ? 'shrink-0 h-2/5 lg:h-full' : 'flex-1 lg:h-full'}`}>
        <div className="border-b border-border px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-card flex items-center justify-center font-display text-sm">P</div>
          <div>
            <div className="text-sm font-medium">Paula</div>
          <div className="text-[11px] text-muted-foreground">
              {userName}{shape ? ` · ${t(shapeKey(shape.shape))}` : ''}{profile?.heightCm ? ` · ${profile.heightCm} cm` : ''}
              {inspirations.length > 0 && ` · ${t('pillInspo')}: ${inspirations.slice(0, 2).join(', ')}`}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          {messages.length === 0 && (
            <div className="pt-8 pb-4 text-center">
              <h1 className="font-display text-3xl lg:text-4xl tracking-tight text-foreground">
                {t('hiThere')} {userName}
              </h1>
              <p className="font-display text-muted-foreground mt-1 text-base">{t('whatLookingFor')}</p>
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-foreground text-background rounded-br-md'
                    : 'bg-card text-foreground rounded-bl-md'
                }`}
              >
                {msg.photoUploaded && (
                  msg.photoUrl ? (
                    <img src={msg.photoUrl} alt={t('photoUploaded')} className="w-32 h-40 object-cover rounded-lg mb-2" />
                  ) : (
                    <div className="w-32 h-40 bg-muted rounded-lg mb-2 flex items-center justify-center">
                      <ImagePlus className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )
                )}

                {msg.text}
              </div>
            </div>
          ))}

          {activeChips && activeChips.length > 0 && (
            <div className="flex flex-wrap gap-2 pl-0">
              {activeChips.map(chip => (
                <button
                  key={chip.id}
                  onClick={() => handleChipClick(chip)}
                  className="px-4 py-2 border border-border rounded-full text-sm hover:bg-card transition-colors"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          )}

          {paulaThinking && (
            <div className="flex justify-start" aria-live="polite">
              <div className="bg-card text-muted-foreground px-4 py-3 rounded-2xl rounded-bl-md text-sm flex items-center gap-2">
                <span className="flex gap-1" aria-hidden="true">
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse [animation-delay:300ms]" />
                </span>
                {t('paulaTyping')}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-border px-4 py-2 mb-[env(safe-area-inset-bottom)]">
          {contextPills.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              {contextPills.map(pill => (
                <span
                  key={pill.key}
                  className="text-[11px] px-2.5 py-1 bg-card rounded-full flex items-center gap-1.5 text-muted-foreground group"
                >
                  {editingPill === pill.key ? (
                    <input
                      type="text"
                      // Names the pill being edited; without it the field is
                      // announced as an anonymous textbox inside a chip.
                      aria-label={pill.label}
                      value={pillEditValue}
                      onChange={e => setPillEditValue(e.target.value)}
                      onBlur={() => savePillEdit(pill.key)}
                      onKeyDown={e => e.key === 'Enter' && savePillEdit(pill.key)}
                      className="bg-transparent border-none outline-none text-[11px] w-16 text-foreground"
                      autoFocus
                    />
                  ) : (
                    <button
                      onClick={() => startEditPill(pill)}
                      className="hover:text-foreground transition-colors"
                    >
                      {pill.label}: {pill.value}
                    </button>
                  )}
                  <button onClick={() => removePill(pill.key)} className="hover:text-foreground">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              aria-label={t('attachPhoto')}
              accept="image/*"
              onChange={handlePhotoSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              title={t('findDupesHint')}
              aria-label={t('findDupes')}
              className="p-2 rounded-full hover:bg-card shrink-0"
            >
              <ImagePlus className="w-5 h-5 text-muted-foreground" />
            </button>

            <input
              type="text"
              aria-label={t('yourMessage')}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder={t('askPaulaAnything')}
              className="flex-1 py-2.5 px-4 bg-card rounded-full text-sm focus:outline-none min-w-0"
            />
            <button
              onClick={handleSend}
              className="p-2.5 bg-foreground text-background rounded-full hover:opacity-90 transition-opacity shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {currentProducts.length > 0 ? (
        <div className="flex-1 border-t lg:border-t-0 overflow-y-auto">
          <div className="p-3 lg:p-8">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground">
                {dupeMode
                  ? `${t('dupesTitle')} · ${t('estimatedOriginal')} ~${dupeReference} PLN`
                  : `${currentProducts.length} ${t('results')}`}
              </span>
              <select
                value={sortMode}
                onChange={e => setSortMode(e.target.value as SortMode)}
                aria-label={t('sortBy')}
                className="text-xs bg-card rounded-full px-3 py-1 border-0 focus:outline-none"
              >
                <option value="fit">{t('sortFitScore')}</option>
                <option value="price-asc">{t('priceLowHigh')}</option>
                <option value="price-desc">{t('priceHighLow')}</option>
                <option value="newest">{t('newest')}</option>
              </select>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 lg:gap-4">
              {sortedProducts.map(product => (
                <div key={product.id} className="relative">
                  {dupeMode && discountPercent(product.price, dupeReference) !== null && (
                    <span className="absolute z-10 top-11 left-3 text-[10px] font-medium px-2 py-0.5 rounded-full bg-background/90 backdrop-blur-sm text-foreground shadow-sm">
                      {t('cheaperBy', discountPercent(product.price, dupeReference))}
                    </span>
                  )}
                  <ProductCard
                    product={product}
                    onBrandClick={b => navigate(`/app/brand/${encodeURIComponent(b)}`)}
                  />
                </div>
              ))}
            </div>

          </div>
        </div>
      ) : (
        <div className="hidden lg:flex items-center justify-center flex-1">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">{t('resultsWillAppear')}</p>
            <p className="text-xs mt-1">{t('startConversation')}</p>
          </div>
        </div>
      )}
    </div>
  );
}
