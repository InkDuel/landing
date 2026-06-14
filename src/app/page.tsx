'use client';

import { useEffect, useMemo, useState } from 'react';

type Locale = 'es' | 'en' | 'pt';

type ScoreTone = 'pink' | 'blue' | 'green' | 'orange';

type Copy = {
  nav: {
    duel: string;
    judge: string;
    ranks: string;
  };
  cta: string;
  stores: {
    soon: string;
  };
  hero: {
    badge: string;
    titleTop: string;
    titleAccent: string;
    tagline: string;
    subtitle: string;
    searching: string;
    searchingSub: string;
    promptLabel: string;
    prompt: string;
    writingLabel: string;
    verdictTitle: string;
    youLabel: string;
    rivalLabel: string;
    youScore: string;
    rivalScore: string;
    victory: string;
  };
  rules: {
    kicker: string;
    titleTop: string;
    titleAccent: string;
    intro: string;
    steps: { icon: string; title: string; body: string }[];
  };
  judge: {
    kicker: string;
    line: string;
    highlight: string;
    body: string;
    adviceLabel: string;
    advice: string;
    breakdownLabel: string;
    criteria: { label: string; score: string; tone: ScoreTone; width: number }[];
  };
  ranks: {
    kicker: string;
    titleTop: string;
    titleAccent: string;
    body: string;
    divisionLabel: string;
    divisionRank: string;
    divisionPts: string;
    divisionNext: string;
    list: string[];
    currentElo: string;
  };
  finalCta: {
    line: string;
    accent: string;
    body: string;
    micro: string;
  };
  footer: {
    tagline: string;
    privacyPolicy: string;
    challengeTerms: string;
  };
};

const languageOptions: {
  code: Locale;
  label: string;
  flag: string;
}[] = [
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
];

const copies: Record<Locale, Copy> = {
  es: {
    nav: {
      duel: 'El duelo',
      judge: 'El jurado',
      ranks: 'Rangos',
    },
    cta: 'Unirse a la beta',
    stores: {
      soon: 'Próximamente en',
    },
    hero: {
      badge: 'Duelos de escritura · 5 minutos',
      titleTop: 'Un tema.',
      titleAccent: 'Un oponente.',
      tagline: 'La mejor historia gana.',
      subtitle:
        'InkDuel es la arena donde escribir deja de ser solitario. Recibís una consigna, escribís contra el reloj y un jurado de tinta decide quién contó la mejor historia.',
      searching: 'Afilando plumas…',
      searchingSub: 'Buscamos a alguien de tu nivel',
      promptLabel: 'Tu prompt',
      prompt:
        '«Una persona recibe una carta escrita por alguien que murió hace años. La carta dice: “No confíes en la versión de mí que todavía está viva”.»',
      writingLabel: 'Escribiendo',
      verdictTitle: 'Veredicto del jurado',
      youLabel: 'Tú',
      rivalLabel: 'Rival',
      youScore: '33.4',
      rivalScore: '21.1',
      victory: 'Victoria',
    },
    rules: {
      kicker: 'El duelo',
      titleTop: 'Esto va',
      titleAccent: 'en serio.',
      intro: '5 reglas. Nada más.',
      steps: [
        {
          icon: '🎲',
          title: 'Tema al azar',
          body: 'Lo revelamos cuando entras. Sin tiempo para el bloqueo del escritor.',
        },
        {
          icon: '⏱️',
          title: '5 minutos',
          body: 'El reloj empieza al tocar el botón. Entregas todo lo que tienes.',
        },
        {
          icon: '⚔️',
          title: 'Un rival de tu nivel',
          body: 'Del otro lado, la presión es simétrica: tu oponente pelea el mismo prompt.',
        },
        {
          icon: '✒️',
          title: 'Jurado de tinta',
          body: 'Creatividad, estilo, emoción y desenlace. Solo una historia gana.',
        },
        {
          icon: '⚡',
          title: 'Veredicto al instante',
          body: 'En segundos recibes un desglose exacto de tus aciertos y errores.',
        },
      ],
    },
    judge: {
      kicker: 'El jurado',
      line: 'No compites para ganar.',
      highlight: 'Compites para mejorar.',
      body: 'Cada duelo termina con feedback concreto: dónde tu relato fue más fuerte, dónde perdiste al lector y qué trabajar en el próximo. El progreso no es una sensación. Se mide.',
      adviceLabel: 'Consejo para mejorar',
      advice:
        'Tu mayor fortaleza es el gancho narrativo: generas intriga con muy pocas palabras. Para el próximo duelo, cuida el desenlace — un cierre más fuerte te habría dado la victoria.',
      breakdownLabel: 'Desglose del jurado',
      criteria: [
        { label: 'Creatividad', score: '9.2', tone: 'pink', width: 92 },
        { label: 'Estilo', score: '8.5', tone: 'blue', width: 85 },
        { label: 'Emoción', score: '7.8', tone: 'green', width: 78 },
        { label: 'Desenlace', score: '6.4', tone: 'orange', width: 64 },
      ],
    },
    ranks: {
      kicker: 'Progresión',
      titleTop: 'El estatus',
      titleAccent: 'se gana.',
      body: 'Subir no depende de jugar más horas: depende de escribir mejor. Seis rangos entre tu primer duelo y la leyenda.',
      divisionLabel: 'División actual',
      divisionRank: 'Aprendiz I',
      divisionPts: '20 pts',
      divisionNext: '80 pts para Aprendiz II →',
      list: ['Aprendiz', 'Escriba', 'Narrador', 'Duellista', 'Maestro de Tinta', 'Leyenda'],
      currentElo: 'Tu rango actual',
    },
    finalCta: {
      line: 'Cada duelo te hace',
      accent: 'mejor escritor.',
      body: 'Entra en la arena. Pon a prueba tus palabras. Sube de rango.',
      micro: 'Una vez dentro, el tiempo corre.',
    },
    footer: {
      tagline: 'Acepta el duelo.',
      privacyPolicy: 'Política de privacidad',
      challengeTerms: 'Bases y condiciones',
    },
  },
  en: {
    nav: {
      duel: 'The duel',
      judge: 'The judge',
      ranks: 'Ranks',
    },
    cta: 'Join the beta',
    stores: {
      soon: 'Coming soon to',
    },
    hero: {
      badge: 'Writing duels · 5 minutes',
      titleTop: 'One prompt.',
      titleAccent: 'One opponent.',
      tagline: 'Best story wins.',
      subtitle:
        'InkDuel is the arena where writing stops being solitary. You get a prompt, write against the clock, and an ink judge decides who told the better story.',
      searching: 'Sharpening quills…',
      searchingSub: 'Finding someone at your level',
      promptLabel: 'Your prompt',
      prompt:
        '“Someone receives a letter written by a person who died years ago. It reads: ‘Don’t trust the version of me that is still alive.’”',
      writingLabel: 'Writing',
      verdictTitle: 'The judge’s verdict',
      youLabel: 'You',
      rivalLabel: 'Rival',
      youScore: '33.4',
      rivalScore: '21.1',
      victory: 'Victory',
    },
    rules: {
      kicker: 'The duel',
      titleTop: 'This is',
      titleAccent: 'for real.',
      intro: '5 rules. Nothing else.',
      steps: [
        {
          icon: '🎲',
          title: 'Random prompt',
          body: 'Revealed the moment you enter. No time for writer’s block.',
        },
        {
          icon: '⏱️',
          title: '5 minutes',
          body: 'The clock starts when you tap the button. You give everything you have.',
        },
        {
          icon: '⚔️',
          title: 'A rival at your level',
          body: 'On the other side, the pressure is symmetrical: your opponent fights the same prompt.',
        },
        {
          icon: '✒️',
          title: 'Ink judge',
          body: 'Creativity, style, emotion, and the ending. Only one story wins.',
        },
        {
          icon: '⚡',
          title: 'Instant verdict',
          body: 'In seconds you get a precise breakdown of what worked and what didn’t.',
        },
      ],
    },
    judge: {
      kicker: 'The judge',
      line: 'You don’t compete to win.',
      highlight: 'You compete to improve.',
      body: 'Every duel ends with concrete feedback: where your story was strongest, where you lost the reader, and what to work on next. Progress isn’t a feeling. It’s measured.',
      adviceLabel: 'Advice to improve',
      advice:
        'Your greatest strength is the narrative hook: you create intrigue with very few words. Next duel, watch your ending — a stronger close would have won you the match.',
      breakdownLabel: 'Judge’s breakdown',
      criteria: [
        { label: 'Creativity', score: '9.2', tone: 'pink', width: 92 },
        { label: 'Style', score: '8.5', tone: 'blue', width: 85 },
        { label: 'Emotion', score: '7.8', tone: 'green', width: 78 },
        { label: 'Ending', score: '6.4', tone: 'orange', width: 64 },
      ],
    },
    ranks: {
      kicker: 'Progression',
      titleTop: 'Status is',
      titleAccent: 'earned.',
      body: 'Climbing isn’t about playing longer — it’s about writing better. Six ranks between your first duel and legend.',
      divisionLabel: 'Current division',
      divisionRank: 'Apprentice I',
      divisionPts: '20 pts',
      divisionNext: '80 pts to Apprentice II →',
      list: ['Apprentice', 'Scribe', 'Narrator', 'Duelist', 'Ink Master', 'Legend'],
      currentElo: 'Your current rank',
    },
    finalCta: {
      line: 'Every duel makes you a',
      accent: 'better writer.',
      body: 'Enter the arena. Test your words. Climb the ranks.',
      micro: 'Once you’re in, the clock is running.',
    },
    footer: {
      tagline: 'Accept the duel.',
      privacyPolicy: 'Privacy Policy',
      challengeTerms: 'Challenge Terms',
    },
  },
  pt: {
    nav: {
      duel: 'O duelo',
      judge: 'O júri',
      ranks: 'Ranks',
    },
    cta: 'Entrar na beta',
    stores: {
      soon: 'Em breve na',
    },
    hero: {
      badge: 'Duelos de escrita · 5 minutos',
      titleTop: 'Um tema.',
      titleAccent: 'Um oponente.',
      tagline: 'A melhor história vence.',
      subtitle:
        'InkDuel é a arena onde escrever deixa de ser solitário. Você recebe um tema, escreve contra o relógio e um júri de tinta decide quem contou a melhor história.',
      searching: 'Afiando as penas…',
      searchingSub: 'Procurando alguém do seu nível',
      promptLabel: 'Seu prompt',
      prompt:
        '«Uma pessoa recebe uma carta escrita por alguém que morreu há anos. A carta diz: “Não confie na versão de mim que ainda está viva”.»',
      writingLabel: 'Escrevendo',
      verdictTitle: 'Veredito do júri',
      youLabel: 'Você',
      rivalLabel: 'Rival',
      youScore: '33.4',
      rivalScore: '21.1',
      victory: 'Vitória',
    },
    rules: {
      kicker: 'O duelo',
      titleTop: 'Isto é',
      titleAccent: 'pra valer.',
      intro: '5 regras. Nada mais.',
      steps: [
        {
          icon: '🎲',
          title: 'Tema aleatório',
          body: 'Revelado quando você entra. Sem tempo para bloqueio criativo.',
        },
        {
          icon: '⏱️',
          title: '5 minutos',
          body: 'O relógio começa ao tocar o botão. Você entrega tudo o que tem.',
        },
        {
          icon: '⚔️',
          title: 'Um rival do seu nível',
          body: 'Do outro lado, a pressão é simétrica: seu oponente enfrenta o mesmo prompt.',
        },
        {
          icon: '✒️',
          title: 'Júri de tinta',
          body: 'Criatividade, estilo, emoção e desfecho. Só uma história vence.',
        },
        {
          icon: '⚡',
          title: 'Veredito na hora',
          body: 'Em segundos você recebe uma análise exata dos seus acertos e erros.',
        },
      ],
    },
    judge: {
      kicker: 'O júri',
      line: 'Você não compete para vencer.',
      highlight: 'Você compete para melhorar.',
      body: 'Cada duelo termina com feedback concreto: onde sua história foi mais forte, onde você perdeu o leitor e o que trabalhar no próximo. Progresso não é sensação. É medido.',
      adviceLabel: 'Conselho para melhorar',
      advice:
        'Sua maior força é o gancho narrativo: você cria intriga com pouquíssimas palavras. No próximo duelo, cuide do desfecho — um final mais forte teria garantido a vitória.',
      breakdownLabel: 'Análise do júri',
      criteria: [
        { label: 'Criatividade', score: '9.2', tone: 'pink', width: 92 },
        { label: 'Estilo', score: '8.5', tone: 'blue', width: 85 },
        { label: 'Emoção', score: '7.8', tone: 'green', width: 78 },
        { label: 'Desfecho', score: '6.4', tone: 'orange', width: 64 },
      ],
    },
    ranks: {
      kicker: 'Progressão',
      titleTop: 'O status',
      titleAccent: 'se conquista.',
      body: 'Subir não depende de jogar por mais tempo: depende de escrever melhor. Seis ranks entre o seu primeiro duelo e a lenda.',
      divisionLabel: 'Divisão atual',
      divisionRank: 'Aprendiz I',
      divisionPts: '20 pts',
      divisionNext: '80 pts para Aprendiz II →',
      list: ['Aprendiz', 'Escriba', 'Narrador', 'Duelista', 'Mestre da Tinta', 'Lenda'],
      currentElo: 'Seu rank atual',
    },
    finalCta: {
      line: 'Cada duelo faz de você',
      accent: 'um escritor melhor.',
      body: 'Entre na arena. Teste suas palavras. Suba de rank.',
      micro: 'Uma vez dentro, o relógio corre.',
    },
    footer: {
      tagline: 'Aceite o duelo.',
      privacyPolicy: 'Política de Privacidade',
      challengeTerms: 'Termos do desafio',
    },
  },
};

const getInitialLocale = (): Locale => {
  if (typeof window === 'undefined') {
    return 'en';
  }

  const params = new URLSearchParams(window.location.search);
  const queryLocale = params.get('lang');
  if (queryLocale === 'es' || queryLocale === 'en' || queryLocale === 'pt') {
    return queryLocale;
  }

  const storedLocale = window.localStorage.getItem('inkduel-locale');
  if (storedLocale === 'es' || storedLocale === 'en' || storedLocale === 'pt') {
    return storedLocale;
  }

  const browserLocale = window.navigator.language.slice(0, 2);
  if (browserLocale === 'es' || browserLocale === 'en' || browserLocale === 'pt') {
    return browserLocale;
  }

  return 'en';
};

export default function Home() {
  const [locale, setLocale] = useState<Locale>('en');
  const copy = copies[locale];
  const currentLanguage = useMemo(
    () => languageOptions.find((option) => option.code === locale) ?? languageOptions[0],
    [locale],
  );

  useEffect(() => {
    setLocale(getInitialLocale());
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    window.localStorage.setItem('inkduel-locale', locale);
  }, [locale]);

  return (
    <main className="landing-container">
      <div className="mesh-bg">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>

      <header className="site-header">
        <a href="#top" className="logo-link" aria-label="InkDuel">
          <span className="brand-icon" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/app-icon.png" alt="" />
          </span>
          <span className="logo">
            Ink<span className="accent">Duel</span>
          </span>
        </a>

        <nav className="nav-links" aria-label="Main navigation">
          <a href="#duelo">{copy.nav.duel}</a>
          <a href="#jurado">{copy.nav.judge}</a>
          <a href="#rangos">{copy.nav.ranks}</a>
        </nav>

        <div className="header-actions">
          <label className="language-picker" aria-label="Select language">
            <span className="language-current" aria-hidden="true">
              <span className="language-flag">{currentLanguage.flag}</span>
              <span>{currentLanguage.label}</span>
            </span>
            <select
              value={locale}
              onChange={(event) => setLocale(event.target.value as Locale)}
              aria-label="Select language"
            >
              {languageOptions.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.flag} {option.label}
                </option>
              ))}
            </select>
          </label>

          <button className="cta-button primary">
            <span>{copy.cta}</span>
          </button>
        </div>
      </header>

      <section className="hero-section">
        <div className="hero-content">
          <span className="hero-badge">{copy.hero.badge}</span>
          <h1 className="hero-title">
            {copy.hero.titleTop}
            <br />
            <em className="accent-italic">{copy.hero.titleAccent}</em>
          </h1>
          <p className="hero-tagline">{copy.hero.tagline}</p>
          <p className="hero-subtitle">{copy.hero.subtitle}</p>
          <div className="hero-actions">
            <button className="cta-button primary large">{copy.cta}</button>
            <div className="store-buttons">
              <div className="store-btn">
                <div className="s-icon"></div>
                <div className="s-text">
                  <span className="s-small">{copy.stores.soon}</span>
                  <span className="s-large">App Store</span>
                </div>
              </div>
              <div className="store-btn">
                <div className="s-icon">▶</div>
                <div className="s-text">
                  <span className="s-small">{copy.stores.soon}</span>
                  <span className="s-large">Google Play</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="hero-visual" aria-hidden="true">
          <div className="duel-flow">
            <div className="flow-card match-card">
              <div className="match-row">
                <div className="duel-avatar you">L</div>
                <span className="vs-mark">vs</span>
                <div className="duel-avatar unknown">?</div>
              </div>
              <p className="match-status">{copy.hero.searching}</p>
              <p className="match-sub">{copy.hero.searchingSub}</p>
              <div className="match-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>

            <div className="flow-card prompt-flow-card">
              <div className="flow-label-row">
                <span className="flow-icon-tile">🎲</span>
                <span className="flow-label">{copy.hero.promptLabel}</span>
              </div>
              <p className="flow-prompt-text">{copy.hero.prompt}</p>
              <div className="flow-timer-row">
                <span className="timer-pill">04:55</span>
                <div className="timer-track">
                  <div className="timer-fill"></div>
                </div>
              </div>
            </div>

            <div className="flow-card verdict-flow-card">
              <div className="verdict-head">
                <h4 className="verdict-title">{copy.hero.verdictTitle}</h4>
                <span className="victory-chip">🏆 {copy.hero.victory}</span>
              </div>
              <div className="verdict-scores">
                <div className="verdict-side winner">
                  <span className="verdict-name">{copy.hero.youLabel}</span>
                  <span className="verdict-pts">
                    {copy.hero.youScore}
                    <small> pts</small>
                  </span>
                </div>
                <span className="verdict-vs">vs</span>
                <div className="verdict-side">
                  <span className="verdict-name">{copy.hero.rivalLabel}</span>
                  <span className="verdict-pts">
                    {copy.hero.rivalScore}
                    <small> pts</small>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="duelo" className="rules-section">
        <span className="section-kicker">{copy.rules.kicker}</span>
        <h2 className="section-title">
          {copy.rules.titleTop} <em className="accent-italic">{copy.rules.titleAccent}</em>
        </h2>
        <p className="section-intro">{copy.rules.intro}</p>

        <div className="rules-list">
          {copy.rules.steps.map((step, index) => (
            <div key={step.title} className="rule-row">
              <span className="rule-icon" aria-hidden="true">
                {step.icon}
              </span>
              <div className="rule-text">
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
              <span className="rule-num">0{index + 1}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="jurado" className="judge-section">
        <div className="judge-grid">
          <div className="judge-text">
            <span className="section-kicker">{copy.judge.kicker}</span>
            <h2 className="section-title left">
              {copy.judge.line}
              <br />
              <em className="accent-italic">{copy.judge.highlight}</em>
            </h2>
            <p className="judge-body">{copy.judge.body}</p>
          </div>

          <div className="judge-mock" aria-hidden="true">
            <div className="advice-card">
              <div className="advice-label">
                <span>💡</span> {copy.judge.adviceLabel}
              </div>
              <p>{copy.judge.advice}</p>
            </div>

            <div className="breakdown-card">
              <span className="breakdown-label">{copy.judge.breakdownLabel}</span>
              {copy.judge.criteria.map((criterion) => (
                <div key={criterion.label} className="score-row">
                  <span className="score-label">{criterion.label}</span>
                  <div className="s-bar">
                    <div
                      className={`fill tone-${criterion.tone}`}
                      style={{ width: `${criterion.width}%` }}
                    ></div>
                  </div>
                  <span className={`score-num tone-${criterion.tone}`}>{criterion.score}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="rangos" className="progression-path">
        <div className="progression-text">
          <span className="section-kicker">{copy.ranks.kicker}</span>
          <h2 className="section-title">
            {copy.ranks.titleTop} <em className="accent-italic">{copy.ranks.titleAccent}</em>
          </h2>
          <p>{copy.ranks.body}</p>
        </div>

        <div className="division-card" aria-hidden="true">
          <div className="division-top">
            <span className="division-icon">✍️</span>
            <div className="division-name">
              <em>{copy.ranks.divisionRank}</em>
              <span>{copy.ranks.divisionLabel}</span>
            </div>
            <span className="division-pts">{copy.ranks.divisionPts}</span>
          </div>
          <div className="division-track">
            <div className="division-fill"></div>
          </div>
          <span className="division-next">{copy.ranks.divisionNext}</span>
        </div>

        <div className="ranks-timeline">
          <div className="line-connector"></div>

          {copy.ranks.list.map((rank, index) => (
            <div
              key={rank}
              className={`rank-node ${
                ['r-aprendiz', 'r-escriba', 'r-narrador', 'r-duellista', 'r-maestro', 'r-leyenda'][
                  index
                ]
              } ${index === 0 ? 'focused' : ''} ${index > 0 ? 'dormant' : ''}`}
            >
              <div className="r-icon"></div>
              <div className={index === 0 ? 'r-label glow-text' : 'r-label'}>{rank}</div>
              {index === 0 ? <div className="focused-indicator">{copy.ranks.currentElo}</div> : null}
            </div>
          ))}
        </div>
      </section>

      <section className="hero-footer-cta">
        <div className="final-brand" aria-hidden="true">
          <span className="brand-mark">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/app-icon.png" alt="" />
            <span className="brand-vs">vs</span>
          </span>
        </div>
        <h2 className="massive-cta">
          {copy.finalCta.line} <em className="accent-italic">{copy.finalCta.accent}</em>
        </h2>
        <p>{copy.finalCta.body}</p>
        <button className="cta-button primary large large-mega">{copy.cta}</button>
        <p className="final-micro">🔒 {copy.finalCta.micro}</p>
      </section>

      <footer className="footer-bar">
        <span>
          © {new Date().getFullYear()} INKDUEL. {copy.footer.tagline}
        </span>
        <div className="footer-links">
          <a href={`/challenge/demo-desafio-especial?lang=${locale}`}>
            {copy.footer.challengeTerms}
          </a>
          <a href={`/privacy?lang=${locale}`}>{copy.footer.privacyPolicy}</a>
        </div>
      </footer>
    </main>
  );
}
