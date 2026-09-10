import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { Reveal } from '@/components/Reveal';
import { Globe, Ruler, Shirt, History, ListOrdered, MoveRight } from 'lucide-react';

export default function Welcome() {
  const navigate = useNavigate();
  const { lang, setLang, t } = useLanguage();

  const steps = [
    { title: t('landStep1Title'), desc: t('landStep1Desc') },
    { title: t('landStep2Title'), desc: t('landStep2Desc') },
    { title: t('landStep3Title'), desc: t('landStep3Desc') },
  ];

  const pillars = [
    { icon: Shirt, title: t('landFabricTitle'), desc: t('landFabricDesc') },
    { icon: History, title: t('landMemoryTitle'), desc: t('landMemoryDesc') },
    { icon: ListOrdered, title: t('landRankTitle'), desc: t('landRankDesc') },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="flex items-center justify-between px-6 py-6 max-w-3xl mx-auto w-full">
        <span className="font-display text-2xl">Paula</span>
        <button
          onClick={() => setLang(lang === 'en' ? 'pl' : 'en')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-card text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <Globe className="w-3.5 h-3.5" />
          {lang.toUpperCase()}
        </button>
      </header>

      <main className="max-w-3xl mx-auto px-6">
        {/* Hero */}
        <section className="pt-10 pb-16 md:pt-20 md:pb-24">
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-muted-foreground mb-6">
            {t('landKicker')}
          </p>
          <h1 className="font-display text-5xl md:text-7xl leading-[1.05] mb-6">
            {t('landHeadline')}
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-xl mb-10">
            {t('landLead')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto px-8 py-3.5 bg-foreground text-background rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
            >
              {t('getStarted')}
            </button>
            <button
              onClick={() => navigate('/login?mode=login')}
              className="w-full sm:w-auto px-8 py-3.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('logIn')}
            </button>
          </div>
        </section>

        {/* Example of a real answer */}
        <Reveal>
          <section className="bg-card rounded-2xl p-6 md:p-8 mb-16 md:mb-24">
            <p className="text-xs font-medium tracking-[0.2em] uppercase text-muted-foreground mb-6">
              {t('landExampleLabel')}
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Ruler className="w-4 h-4 shrink-0" />
              <span>{t('landExampleYou')}</span>
            </div>
            <p className="leading-relaxed mb-4">{t('landExampleVerdict')}</p>
            <p className="leading-relaxed pt-4 border-t border-border font-medium">
              {t('landExampleSize')}
            </p>
          </section>
        </Reveal>

        {/* How it works */}
        <section className="mb-16 md:mb-24">
          <Reveal>
            <h2 className="font-display text-3xl md:text-4xl mb-10">{t('landHowTitle')}</h2>
          </Reveal>
          <ol className="flex flex-col gap-10">
            {steps.map((step, i) => (
              <Reveal key={step.title} delay={i * 100}>
                <li className="flex gap-6">
                  <span className="font-display text-3xl text-muted-foreground/60 shrink-0 w-10">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <h3 className="font-medium mb-2">{step.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{step.desc}</p>
                  </div>
                </li>
              </Reveal>
            ))}
          </ol>
        </section>

        {/* Pillars */}
        <section className="grid sm:grid-cols-3 gap-4 mb-16 md:mb-24">
          {pillars.map((pillar, i) => (
            <Reveal key={pillar.title} delay={i * 100}>
              <div className="bg-card rounded-2xl p-6 h-full">
                <pillar.icon className="w-5 h-5 mb-4 text-muted-foreground" />
                <h3 className="font-medium mb-2">{pillar.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{pillar.desc}</p>
              </div>
            </Reveal>
          ))}
        </section>

        {/* Closing */}
        <Reveal>
          <section className="pb-20 md:pb-28 text-center">
            <h2 className="font-display text-3xl md:text-5xl mb-8">{t('landClosingTitle')}</h2>
            <button
              onClick={() => navigate('/login')}
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-foreground text-background rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
            >
              {t('getStarted')}
              <MoveRight className="w-4 h-4" />
            </button>
          </section>
        </Reveal>
      </main>
    </div>
  );
}
