import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, X, Link, ImagePlus, UserRound, HelpCircle } from 'lucide-react';
import { bodyShapes, aestheticOptions, fitOptions, occasionOptions, brands } from '@/data/mockData';
import { MeasureGuide, type MeasureKey } from '@/components/MeasureGuide';
import { useLanguage } from '@/i18n/LanguageContext';
import type { TranslationKey } from '@/i18n/translations';
import { useBodyProfile } from '@/lib/profile';
import { useUserPrefs } from '@/lib/prefs';
import { classifyShape } from '@/lib/fit/shape';
import { checkMeasurement, inchesToCm } from '@/lib/fit/validate';
import type { BodyShape } from '@/lib/fit/types';
import { shapeKey } from '@/lib/fit/copy';

const TOTAL_STEPS = 10;

// The picker still uses the five everyday names; FFIT is finer-grained.
const SHAPE_FROM_PICKER: Record<string, BodyShape> = {
  'hourglass': 'hourglass',
  'pear': 'triangle',
  'rectangle': 'rectangle',
  'inverted-triangle': 'inverted-triangle',
  'apple': 'oval',
};

export default function Onboarding() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [proportions, setProportions] = useState({
    shoulders: 38,
    bust: 88,
    waist: 68,
    hips: 96,
    // 0 means "not given". FFIT falls back to merging Spoon into Bottom
    // Hourglass without it, so it stays optional and never blocks the step.
    highHip: 0,
    torsoLength: 'Average',
    legLength: 'Long',
  });
  const [showHighHip, setShowHighHip] = useState(false);
  const [guide, setGuide] = useState<{ open: boolean; focus?: MeasureKey }>({ open: false });
  const openGuide = (focus?: MeasureKey) => setGuide({ open: true, focus });
  const [height, setHeight] = useState('165');
  const [selectedAesthetics, setSelectedAesthetics] = useState<string[]>([]);
  const [selectedFit, setSelectedFit] = useState<string[]>([]);
  const [selectedOccasions, setSelectedOccasions] = useState<string[]>([]);
  const [budgetRange, setBudgetRange] = useState([100, 300]);

  /**
   * The two sliders describe one range, so each has to respect the other.
   * Their raw bounds overlap (minimum runs 50–500, maximum 100–500), so
   * dragging the minimum past the maximum used to store budgetMin > budgetMax
   * — a range that matches nothing, and that every screen downstream reads as
   * an empty budget rather than as a mistake.
   */
  const setBudgetMin = (value: number) =>
    setBudgetRange(([, max]) => [Math.min(value, max), max]);
  const setBudgetMax = (value: number) =>
    setBudgetRange(([min]) => [min, Math.max(value, min)]);
  const [pinterestLinks, setPinterestLinks] = useState<string[]>([]);
  const [pinterestInput, setPinterestInput] = useState('');
  const [inspirationPeople, setInspirationPeople] = useState<string[]>([]);
  const [inspirationInput, setInspirationInput] = useState('');
  const [uploadedInspoPhotos, setUploadedInspoPhotos] = useState<string[]>([]);
  const [brandInput, setBrandInput] = useState('');
  const [noTape, setNoTape] = useState(false);
  const [pickedShape, setPickedShape] = useState<BodyShape | null>(null);
  const { setProfile } = useBodyProfile();
  const { prefs: savedPrefs, update: updatePrefs } = useUserPrefs();

  const measurementsValid = proportions.bust > 0 && proportions.waist > 0 && proportions.hips > 0;

  /**
   * A warning, never a block. A slipped digit produces a confident Fit Score
   * built on nonsense, but we do not know every body — so this points at the
   * number and leaves the decision with the person holding the tape.
   */
  const measurementNote = (field: Parameters<typeof checkMeasurement>[0], value: number): string | null => {
    const issue = checkMeasurement(field, value);
    if (issue === null) return null;
    return issue === 'maybe-inches' ? t('measureMaybeInches', inchesToCm(value)) : t('measureLooksOff');
  };
  const highHip = proportions.highHip > 0 ? proportions.highHip : undefined;
  const liveShape = noTape
    ? (pickedShape ? { shape: pickedShape, merged: false, diffs: null } : null)
    : measurementsValid
      ? classifyShape({ bust: proportions.bust, waist: proportions.waist, hips: proportions.hips, highHip })
      : null;

  const persistProfile = () => {
    const heightCm = Number(height) > 0 ? Number(height) : undefined;
    const updatedAt = new Date().toISOString();
    if (noTape) {
      if (pickedShape) setProfile({ source: 'selected', shape: pickedShape, heightCm, updatedAt });
      return;
    }
    if (measurementsValid) {
      setProfile({ source: 'measured', bust: proportions.bust, waist: proportions.waist, hips: proportions.hips, highHip, heightCm, updatedAt });
    }
  };

  // Every answer is saved as soon as its step is left, so closing the tab
  // halfway through loses nothing. The last step saves the whole set again.
  const next = () => {
    if (step === 0 && name.trim()) void updatePrefs({ name: name.trim() });
    if (step === 1 || step === 2) persistProfile();
    if (step === 3) void updatePrefs({ inspirations: inspirationPeople, pinterestLinks });
    if (step === 4) void updatePrefs({ aesthetics: selectedAesthetics });
    if (step === 5) void updatePrefs({ fitPrefs: selectedFit });
    if (step === TOTAL_STEPS - 1) {
      void updatePrefs({
        name: name.trim() || savedPrefs.name,
        aesthetics: selectedAesthetics,
        fitPrefs: selectedFit,
        occasions: selectedOccasions,
        budgetMin: budgetRange[0],
        budgetMax: budgetRange[1],
        brands: brandInput.split(',').map(b => b.trim()).filter(Boolean),
        inspirations: inspirationPeople,
        pinterestLinks,
      });
    }
    if (step < TOTAL_STEPS - 1) setStep(step + 1);
    else navigate('/app/for-you');
  };

  const toggleSelection = (arr: string[], setArr: (v: string[]) => void, item: string) => {
    setArr(arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item]);
  };

  const canProceed = () => {
    if (step === 0) return name.length > 0;
    if (step === 1) return noTape ? pickedShape !== null : measurementsValid;
    return true;
  };

  const lengthLabels: Record<string, string> = {
    Short: t('short'),
    Average: t('average'),
    Long: t('long'),
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div>
            <h2 className="font-display text-3xl md:text-4xl mb-3">{t('whatShouldICallYou')}</h2>
            <p className="text-muted-foreground mb-8">{t('letsStartWithName')}</p>
            <input
              type="text"
              placeholder={t('yourName')}
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
              className="w-full px-4 py-4 bg-card rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-foreground/10"
            />
          </div>
        );

      case 1:
        return (
          <div>
            <h2 className="font-display text-3xl md:text-4xl mb-3">{t('yourProportions')}</h2>
            <p className="text-muted-foreground mb-6">
              {noTape ? t('pickYourShape') : t('proportionsManual')}
            </p>

            {/* Read before measuring, not after: the instructions are what takes
                tape error from 13,2% to 5,7% (research-04-body-analysis.md). */}
            {!noTape && (
              <button
                type="button"
                onClick={() => openGuide()}
                className="w-full flex items-center justify-between gap-3 px-5 py-4 mb-6 border border-border rounded-2xl hover:bg-card transition-colors text-left"
              >
                <span className="flex items-center gap-3">
                  <HelpCircle className="w-4 h-4 flex-shrink-0" />
                  <span>
                    <span className="text-sm font-medium block">{t('howToMeasure')}</span>
                    <span className="text-xs text-muted-foreground">{t('measureGuideIntro')}</span>
                  </span>
                </span>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </button>
            )}

            {noTape ? (
              <div className="grid grid-cols-1 gap-3 mb-6">
                {bodyShapes.map(shape => {
                  const mapped = SHAPE_FROM_PICKER[shape.id];
                  const active = pickedShape === mapped;
                  return (
                    <button
                      key={shape.id}
                      onClick={() => setPickedShape(mapped)}
                      className={`text-left px-5 py-4 rounded-xl transition-all ${
                        active ? 'bg-foreground text-background' : 'bg-card hover:bg-card/80'
                      }`}
                    >
                      <div className="text-sm font-medium">{t(shapeKey(mapped))}</div>
                      <div className={`text-xs mt-1 ${active ? 'text-background/70' : 'text-muted-foreground'}`}>
                        {t(shape.descriptionKey)}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <>
                <div className="bg-card rounded-2xl p-6 mb-4">
                  <div className="flex gap-6 items-center mb-6">
                    <div className="w-16 flex-shrink-0">
                      <svg viewBox="0 0 40 80" className="w-full text-foreground">
                        <circle cx="20" cy="8" r="5" fill="none" stroke="currentColor" strokeWidth="1.2" />
                        <line x1="10" y1="18" x2="30" y2="18" stroke="currentColor" strokeWidth="1.2" />
                        <path d={`M${20 - proportions.shoulders / 5},18 L${20 - proportions.bust / 10},30 L${20 - proportions.waist / 10},42 L${20 - proportions.hips / 8},55 L${20 - 4},75 M${20 + proportions.shoulders / 5},18 L${20 + proportions.bust / 10},30 L${20 + proportions.waist / 10},42 L${20 + proportions.hips / 8},55 L${20 + 4},75`} fill="none" stroke="currentColor" strokeWidth="1.2" />
                      </svg>
                    </div>
                    <div className="flex-1 space-y-1 text-sm">
                      <div className="flex justify-between text-muted-foreground">
                        <span>{t('bust')}</span>
                        <span className="font-medium text-foreground">{proportions.bust} cm</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>{t('waist')}</span>
                        <span className="font-medium text-foreground">{proportions.waist} cm</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>{t('hips')}</span>
                        <span className="font-medium text-foreground">{proportions.hips} cm</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {[
                      { key: 'bust' as const, label: t('bust'), hint: t('measureBust') },
                      { key: 'waist' as const, label: t('waist'), hint: t('measureWaist') },
                      { key: 'hips' as const, label: t('hips'), hint: t('measureHips') },
                      ...(showHighHip
                        ? [{ key: 'highHip' as const, label: t('highHip'), hint: t('highHipHint') }]
                        : []),
                    ].map(({ key, label, hint }) => (
                      <div key={key}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm">{label}</span>
                            <button
                              type="button"
                              onClick={() => openGuide(key)}
                              aria-label={`${t('howToMeasure')}: ${label}`}
                              className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <HelpCircle className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              inputMode="numeric"
                              // The visible label is a sibling span, so a
                              // screen reader would otherwise announce four
                              // identical unnamed number fields.
                              aria-label={`${label} (cm)`}
                              value={proportions[key] || ''}
                              onChange={e => setProportions(p => ({ ...p, [key]: Number(e.target.value) }))}
                              className="w-20 px-3 py-2 bg-background rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-foreground/10"
                            />
                            <span className="text-xs text-muted-foreground w-6">cm</span>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{hint}</p>
                        {measurementNote(key, proportions[key]) && (
                          <p className="text-xs mt-1 text-amber-700">{measurementNote(key, proportions[key])}</p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Offered, never demanded: without it FFIT merges Spoon into
                      Bottom Hourglass, which is a worse answer but still a valid one. */}
                  {!showHighHip && (
                    <button
                      type="button"
                      onClick={() => setShowHighHip(true)}
                      className="text-xs text-muted-foreground underline underline-offset-4 mt-4"
                    >
                      {t('addHighHip')}
                    </button>
                  )}
                </div>
              </>
            )}

            {liveShape && (
              <div className="border border-border rounded-2xl p-5 mb-6">
                <div className="text-xs text-muted-foreground mb-1">{t('yourShapeIs')}</div>
                <div className="font-display text-xl">{t(shapeKey(liveShape.shape))}</div>
                {liveShape.diffs && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {t('shapeExplain', liveShape.diffs.hipsWaist, liveShape.diffs.bustHips)}
                  </p>
                )}
                {liveShape.merged && (
                  <button
                    type="button"
                    onClick={() => { setShowHighHip(true); openGuide('highHip'); }}
                    className="text-xs text-muted-foreground underline underline-offset-4 mt-2 text-left"
                  >
                    {t('shapeMerged')}
                  </button>
                )}
              </div>
            )}

            <button
              onClick={() => { setNoTape(v => !v); setPickedShape(null); }}
              className="text-sm text-muted-foreground underline underline-offset-4 mb-6 block"
            >
              {noTape ? t('backToMeasurements') : t('noTapeMeasure')}
            </button>

            {!noTape && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground mb-2">{t('torsoLength')}</div>
                  <div className="flex gap-2">
                    {['Short', 'Average', 'Long'].map(v => (
                      <button
                        key={v}
                        onClick={() => setProportions(p => ({ ...p, torsoLength: v }))}
                        className={`flex-1 px-3 py-2 rounded-lg text-xs transition-all ${
                          proportions.torsoLength === v
                            ? 'bg-foreground text-background'
                            : 'bg-card hover:bg-card/80'
                        }`}
                      >
                        {lengthLabels[v]}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-2">{t('legLength')}</div>
                  <div className="flex gap-2">
                    {['Short', 'Average', 'Long'].map(v => (
                      <button
                        key={v}
                        onClick={() => setProportions(p => ({ ...p, legLength: v }))}
                        className={`flex-1 px-3 py-2 rounded-lg text-xs transition-all ${
                          proportions.legLength === v
                            ? 'bg-foreground text-background'
                            : 'bg-card hover:bg-card/80'
                        }`}
                      >
                        {lengthLabels[v]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div>
            <h2 className="font-display text-3xl md:text-4xl mb-3">{t('howTallAreYou')}</h2>
            <p className="text-muted-foreground mb-8">{t('heightHelps')}</p>
            <div className="flex items-center gap-4">
              <input
                type="number"
                aria-label={`${t('height')} (cm)`}
                value={height}
                onChange={e => setHeight(e.target.value)}
                className="w-32 px-4 py-4 bg-card rounded-xl text-2xl text-center focus:outline-none focus:ring-2 focus:ring-foreground/10"
              />
              <span className="text-lg text-muted-foreground">cm</span>
            </div>
            {measurementNote('height', Number(height)) && (
              <p className="text-xs mt-3 text-amber-700">{measurementNote('height', Number(height))}</p>
            )}
          </div>
        );

      case 3:
        return (
          <div>
            <h2 className="font-display text-3xl md:text-4xl mb-3">{t('showMeYourStyle')}</h2>
            <p className="text-muted-foreground mb-8">{t('styleInspirationDesc')}</p>

            <div className="mb-6">
              <label className="flex items-center gap-2 text-sm font-medium mb-3">
                <Link className="w-4 h-4" /> {t('pinterestBoards')}
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  type="url"
                  placeholder="https://pinterest.com/..."
                  value={pinterestInput}
                  onChange={e => setPinterestInput(e.target.value)}
                  className="flex-1 px-4 py-3 bg-card rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10"
                />
                <button
                  onClick={() => {
                    if (pinterestInput.trim()) {
                      setPinterestLinks([...pinterestLinks, pinterestInput.trim()]);
                      setPinterestInput('');
                    }
                  }}
                  className="px-4 py-3 bg-foreground text-background rounded-xl text-sm font-medium"
                >
                  {t('add')}
                </button>
              </div>
              {pinterestLinks.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {pinterestLinks.map((link, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-card rounded-full text-xs">
                      <Link className="w-3 h-3 text-muted-foreground" />
                      <span className="max-w-[180px] truncate">{link}</span>
                      <button onClick={() => setPinterestLinks(pinterestLinks.filter((_, j) => j !== i))}>
                        <X className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-6">
              <label className="flex items-center gap-2 text-sm font-medium mb-3">
                <UserRound className="w-4 h-4" /> {t('styleInspirations')}
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  placeholder={t('inspirationPlaceholder')}
                  value={inspirationInput}
                  onChange={e => setInspirationInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && inspirationInput.trim()) {
                      setInspirationPeople([...inspirationPeople, inspirationInput.trim()]);
                      setInspirationInput('');
                    }
                  }}
                  className="flex-1 px-4 py-3 bg-card rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10"
                />
                <button
                  onClick={() => {
                    if (inspirationInput.trim()) {
                      setInspirationPeople([...inspirationPeople, inspirationInput.trim()]);
                      setInspirationInput('');
                    }
                  }}
                  className="px-4 py-3 bg-foreground text-background rounded-xl text-sm font-medium"
                >
                  {t('add')}
                </button>
              </div>
              {inspirationPeople.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {inspirationPeople.map((person, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-card rounded-full text-xs">
                      <UserRound className="w-3 h-3 text-muted-foreground" />
                      <span>{person}</span>
                      <button onClick={() => setInspirationPeople(inspirationPeople.filter((_, j) => j !== i))}>
                        <X className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-3">
                <ImagePlus className="w-4 h-4" /> {t('inspirationPhotos')}
              </label>
              <div className="grid grid-cols-3 gap-3">
                {uploadedInspoPhotos.map((photo, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-card">
                    <img src={photo} alt="Inspiration" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setUploadedInspoPhotos(uploadedInspoPhotos.filter((_, j) => j !== i))}
                      className="absolute top-2 right-2 w-6 h-6 bg-foreground/80 text-background rounded-full flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <label className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-foreground/30 transition-colors">
                  <ImagePlus className="w-6 h-6 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{t('add')}</span>
                  <input
                    type="file"
                    aria-label={t('addInspirationPhoto')}
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={e => {
                      const files = e.target.files;
                      if (files) {
                        Array.from(files).forEach(file => {
                          const reader = new FileReader();
                          reader.onload = ev => {
                            if (ev.target?.result) {
                              setUploadedInspoPhotos(prev => [...prev, ev.target!.result as string]);
                            }
                          };
                          reader.readAsDataURL(file);
                        });
                      }
                    }}
                  />
                </label>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-6">{t('paulaAnalyze')}</p>
          </div>
        );

      case 4:
        return (
          <div>
            <h2 className="font-display text-3xl md:text-4xl mb-3">{t('whichAesthetics')}</h2>
            <p className="text-muted-foreground mb-8">{t('selectAllThatApply')}</p>
            <div className="grid grid-cols-2 gap-3">
              {aestheticOptions.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => toggleSelection(selectedAesthetics, setSelectedAesthetics, opt.id)}
                  className={`px-5 py-4 rounded-xl text-sm text-left transition-all flex items-center gap-3 ${
                    selectedAesthetics.includes(opt.id)
                      ? 'bg-foreground text-background'
                      : 'bg-card hover:bg-card/80'
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded-full border border-border flex-shrink-0"
                    style={{ backgroundColor: opt.color }}
                    aria-hidden="true"
                  />
                  {t(opt.name as TranslationKey)}
                </button>
              ))}
            </div>
          </div>
        );

      case 5:
        return (
          <div>
            <h2 className="font-display text-3xl md:text-4xl mb-3">{t('howShouldClothesSit')}</h2>
            {/* Descriptive, not corrective: this asks how she likes a garment to
                sit, never what her body "needs". The answer feeds Fit Score as a
                preference, alongside the risk arithmetic — it does not override it. */}
            <p className="text-muted-foreground mb-8">{t('howShouldClothesSitDesc')}</p>
            <div className="grid grid-cols-2 gap-3">
              {fitOptions.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => toggleSelection(selectedFit, setSelectedFit, opt.id)}
                  className={`px-5 py-4 rounded-xl text-sm text-left transition-all ${
                    selectedFit.includes(opt.id)
                      ? 'bg-foreground text-background'
                      : 'bg-card hover:bg-card/80'
                  }`}
                >
                  {t(opt.label as TranslationKey)}
                </button>
              ))}
            </div>
          </div>
        );

      case 6:
        return (
          <div>
            <h2 className="font-display text-3xl md:text-4xl mb-3">{t('whatDoYouDressFor')}</h2>
            <p className="text-muted-foreground mb-8">{t('selectAllThatApply')}</p>
            <div className="grid grid-cols-2 gap-3">
              {occasionOptions.map(opt => (
                <button
                  key={opt}
                  onClick={() => toggleSelection(selectedOccasions, setSelectedOccasions, opt)}
                  className={`px-5 py-4 rounded-xl text-sm text-left transition-all ${
                    selectedOccasions.includes(opt)
                      ? 'bg-foreground text-background'
                      : 'bg-card hover:bg-card/80'
                  }`}
                >
                  {t(opt as TranslationKey)}
                </button>
              ))}
            </div>
          </div>
        );

      case 7:
        return (
          <div>
            <h2 className="font-display text-3xl md:text-4xl mb-3">{t('usualBudget')}</h2>
            <p className="text-muted-foreground mb-8">{t('canAlwaysAdjust')}</p>
            <div className="space-y-8">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{budgetRange[0]} PLN</span>
                <span>{budgetRange[1]}+ PLN</span>
              </div>
              {/* Two sliders that look different only by position; without
                  names a screen reader announces the same control twice. */}
              <input
                type="range"
                aria-label={t('budgetMinLabel')}
                min={50}
                max={500}
                step={25}
                value={budgetRange[0]}
                onChange={e => setBudgetMin(Number(e.target.value))}
                className="w-full accent-foreground"
              />
              <input
                type="range"
                aria-label={t('budgetMaxLabel')}
                min={100}
                max={500}
                step={25}
                value={budgetRange[1]}
                onChange={e => setBudgetMax(Number(e.target.value))}
                className="w-full accent-foreground"
              />
              <div className="flex gap-3">
                {[100, 200, 300, 500].map(v => (
                  <button
                    key={v}
                    onClick={() => setBudgetRange([50, v])}
                    className={`px-4 py-2 rounded-full text-sm transition-all ${
                      budgetRange[1] === v ? 'bg-foreground text-background' : 'bg-card'
                    }`}
                  >
                    {t('upTo')} {v} PLN
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 8:
        return (
          <div>
            <h2 className="font-display text-3xl md:text-4xl mb-3">{t('anyBrandsYouLove')}</h2>
            <p className="text-muted-foreground mb-8">{t('optionalBrands')}</p>
            <input
              type="text"
              placeholder={t('brandsPlaceholder')}
              value={brandInput}
              onChange={e => setBrandInput(e.target.value)}
              className="w-full px-4 py-4 bg-card rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10 mb-4"
            />
            <button onClick={next} className="text-sm text-muted-foreground underline underline-offset-4 mt-6 block">
              {t('skip')}
            </button>
          </div>
        );

      case 9:
        return (
          <div className="text-center">
            <h2 className="font-display text-4xl md:text-5xl mb-4">{t('paulaIsReady')}</h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">{t('profileSetUp')}</p>
            <div className="bg-card rounded-2xl p-6 text-left max-w-md mx-auto mb-8">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('name')}</span>
                  <span className="font-medium">{name || 'Kasia'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('proportions')}</span>
                  <span className="font-medium">
                    {noTape ? t('selected') : `${proportions.bust}/${proportions.waist}/${proportions.hips}`}
                  </span>
                </div>
                {liveShape && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('bodyShape')}</span>
                    <span className="font-medium">{t(shapeKey(liveShape.shape))}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('height')}</span>
                  <span className="font-medium">{height} cm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('style')}</span>
                  <span className="font-medium">
                    {selectedAesthetics.length > 0
                      ? aestheticOptions.filter(a => selectedAesthetics.includes(a.id)).map(a => a.name).join(', ')
                      : t('notSet')}
                  </span>
                </div>
                {inspirationPeople.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('styleInspirations')}</span>
                    <span className="font-medium">{inspirationPeople.join(', ')}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('budget')}</span>
                  <span className="font-medium">{budgetRange[0]}–{budgetRange[1]} PLN</span>
                </div>
              </div>
            </div>
            {/* Must go through next(): the summary step is the only place the
                whole answer set is written to prefs, and the footer that
                normally calls next() is hidden here. Navigating straight to
                /app dropped budget, occasions, brands and style on the floor. */}
            <button
              onClick={next}
              className="px-8 py-3.5 bg-foreground text-background rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
            >
              {t('startExploring')}
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="fixed top-0 left-0 right-0 z-50 bg-background">
        <div className="h-1 bg-card">
          <div
            className="h-full bg-foreground transition-all duration-500 ease-out"
            style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
          />
        </div>
        <div className="flex items-center justify-between px-6 py-4">
          <button onClick={() => navigate('/')} className="font-display text-xl">Paula</button>
          <span className="text-xs text-muted-foreground">{step + 1} / {TOTAL_STEPS}</span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 pt-24 pb-32">
        <div className="w-full max-w-lg">{renderStep()}</div>
      </div>

      <MeasureGuide
        open={guide.open}
        focus={guide.focus}
        onOpenChange={open => setGuide(g => ({ ...g, open }))}
      />


      {step < TOTAL_STEPS - 1 && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-6 py-4">
          <div className="max-w-lg mx-auto flex justify-between items-center">
            <button
              onClick={() => step > 0 && setStep(step - 1)}
              className={`text-sm ${step === 0 ? 'invisible' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {t('back')}
            </button>
            <button
              onClick={next}
              disabled={!canProceed()}
              className="flex items-center gap-2 px-6 py-3 bg-foreground text-background rounded-full text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {t('continue')}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
