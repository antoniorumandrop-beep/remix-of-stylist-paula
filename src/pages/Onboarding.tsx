import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, Upload, X, Link, ImagePlus, UserRound } from 'lucide-react';
import { bodyShapes, aestheticOptions, fitOptions, occasionOptions, brands } from '@/data/mockData';
import { useLanguage } from '@/i18n/LanguageContext';

const TOTAL_STEPS = 9;

export default function Onboarding() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [photoUploaded, setPhotoUploaded] = useState(false);
  const [proportions, setProportions] = useState({
    shoulders: 38,
    bust: 88,
    waist: 68,
    hips: 96,
    torsoLength: 'Average',
    legLength: 'Long',
  });
  const [height, setHeight] = useState('165');
  const [selectedAesthetics, setSelectedAesthetics] = useState<string[]>([]);
  const [selectedFit, setSelectedFit] = useState<string[]>([]);
  const [selectedOccasions, setSelectedOccasions] = useState<string[]>([]);
  const [budgetRange, setBudgetRange] = useState([100, 300]);
  const [pinterestLinks, setPinterestLinks] = useState<string[]>([]);
  const [pinterestInput, setPinterestInput] = useState('');
  const [inspirationPeople, setInspirationPeople] = useState<string[]>([]);
  const [inspirationInput, setInspirationInput] = useState('');
  const [uploadedInspoPhotos, setUploadedInspoPhotos] = useState<string[]>([]);
  const [brandInput, setBrandInput] = useState('');

  const next = () => {
    if (step === 0 && name.trim()) {
      localStorage.setItem('paula-username', name.trim());
    }
    if (step === 4 && inspirationPeople.length > 0) {
      localStorage.setItem('paula-inspirations', JSON.stringify(inspirationPeople));
    }
    if (step < TOTAL_STEPS - 1) setStep(step + 1);
    else navigate('/app/for-you');
  };

  const toggleSelection = (arr: string[], setArr: (v: string[]) => void, item: string) => {
    setArr(arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item]);
  };

  const canProceed = () => {
    if (step === 0) return name.length > 0;
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
            <h2 className="font-display text-3xl md:text-4xl mb-3">{t('bodyScan')}</h2>
            <p className="text-muted-foreground mb-8">{t('bodyScanDesc')}</p>
            <div className="bg-card rounded-2xl p-8 mb-6">
              <div className="flex flex-col items-center gap-6">
                <div className="w-32 h-56 border-2 border-dashed border-border rounded-2xl flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-8 h-8 rounded-full border-2 border-muted-foreground mx-auto mb-2" />
                    <div className="w-6 h-16 border-2 border-muted-foreground mx-auto mb-1 rounded-sm" />
                    <div className="flex gap-1 justify-center">
                      <div className="w-3 h-12 border-2 border-muted-foreground rounded-sm" />
                      <div className="w-3 h-12 border-2 border-muted-foreground rounded-sm" />
                    </div>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground text-center max-w-xs">{t('standStraight')}</div>
                <button
                  onClick={() => setPhotoUploaded(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-foreground text-background rounded-full text-sm font-medium"
                >
                  <Upload className="w-4 h-4" />
                  {t('uploadPhoto')}
                </button>
                {photoUploaded && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4" /> {t('photoUploaded')}
                  </div>
                )}
              </div>
            </div>
            <button onClick={next} className="text-sm text-muted-foreground underline underline-offset-4">
              {t('skipForNow')}
            </button>
          </div>
        );

      case 2:
        return (
          <div>
            <h2 className="font-display text-3xl md:text-4xl mb-3">{t('yourProportions')}</h2>
            <p className="text-muted-foreground mb-8">
              {photoUploaded ? t('proportionsFromPhoto') : t('proportionsManual')}
            </p>

            <div className="bg-card rounded-2xl p-6 mb-6">
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
                    <span>{t('shoulders')}</span>
                    <span className="font-medium text-foreground">{proportions.shoulders} cm</span>
                  </div>
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
                  { key: 'shoulders' as const, label: t('shoulders'), unit: 'cm' },
                  { key: 'bust' as const, label: t('bust'), unit: 'cm' },
                  { key: 'waist' as const, label: t('waist'), unit: 'cm' },
                  { key: 'hips' as const, label: t('hips'), unit: 'cm' },
                ].map(({ key, label, unit }) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{label}</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={proportions[key]}
                        onChange={e => setProportions(p => ({ ...p, [key]: Number(e.target.value) }))}
                        className="w-20 px-3 py-2 bg-background rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-foreground/10"
                      />
                      <span className="text-xs text-muted-foreground w-6">{unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

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
          </div>
        );

      case 3:
        return (
          <div>
            <h2 className="font-display text-3xl md:text-4xl mb-3">{t('howTallAreYou')}</h2>
            <p className="text-muted-foreground mb-8">{t('heightHelps')}</p>
            <div className="flex items-center gap-4">
              <input
                type="number"
                value={height}
                onChange={e => setHeight(e.target.value)}
                className="w-32 px-4 py-4 bg-card rounded-xl text-2xl text-center focus:outline-none focus:ring-2 focus:ring-foreground/10"
              />
              <span className="text-lg text-muted-foreground">cm</span>
            </div>
          </div>
        );

      case 4:
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
                  placeholder="e.g. Hailey Bieber, Zendaya..."
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

      case 5:
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
                  {t(opt as any)}
                </button>
              ))}
            </div>
          </div>
        );

      case 6:
        return (
          <div>
            <h2 className="font-display text-3xl md:text-4xl mb-3">{t('usualBudget')}</h2>
            <p className="text-muted-foreground mb-8">{t('canAlwaysAdjust')}</p>
            <div className="space-y-8">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{budgetRange[0]} PLN</span>
                <span>{budgetRange[1]}+ PLN</span>
              </div>
              <input
                type="range"
                min={50}
                max={500}
                step={25}
                value={budgetRange[0]}
                onChange={e => setBudgetRange([Number(e.target.value), budgetRange[1]])}
                className="w-full accent-foreground"
              />
              <input
                type="range"
                min={100}
                max={500}
                step={25}
                value={budgetRange[1]}
                onChange={e => setBudgetRange([budgetRange[0], Number(e.target.value)])}
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

      case 7:
        return (
          <div>
            <h2 className="font-display text-3xl md:text-4xl mb-3">{t('anyBrandsYouLove')}</h2>
            <p className="text-muted-foreground mb-8">{t('optionalBrands')}</p>
            <input
              type="text"
              placeholder="e.g. Zara, COS, Massimo Dutti..."
              value={brandInput}
              onChange={e => setBrandInput(e.target.value)}
              className="w-full px-4 py-4 bg-card rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10 mb-4"
            />
            <button onClick={next} className="text-sm text-muted-foreground underline underline-offset-4 mt-6 block">
              {t('skip')}
            </button>
          </div>
        );

      case 8:
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
                  <span className="font-medium">{proportions.bust}/{proportions.waist}/{proportions.hips}</span>
                </div>
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
            <button
              onClick={() => navigate('/app/for-you')}
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

      {step < 8 && (
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
