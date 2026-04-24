'use client';

import { useEffect, useMemo, useState } from 'react';

type Locale = 'es' | 'en' | 'pt';

type Copy = {
  nav: {
    loop: string;
    training: string;
    ranks: string;
  };
  cta: string;
  stores: {
    soon: string;
  };
  hero: {
    title: [string, string, string];
    subtitle: string;
    promptLabel: string;
    prompt: string;
    writing: string;
    victory: string;
    creativity: string;
    grammar: string;
  };
  loop: {
    title: string;
    intro: string;
    cards: {
      title: string;
      body: string;
    }[];
  };
  thesis: {
    line: string;
    highlight: string;
    gymTitle: string;
    gymBody: string;
    adaptability: string;
    vocabulary: string;
    resultsTitle: string;
    resultsBody: string;
    rhythm: string;
    tension: string;
  };
  progression: {
    title: string;
    body: string;
    ranks: string[];
    currentElo: string;
  };
  finalCta: {
    line1: string;
    line2: string;
    line3: string;
    body: string;
  };
  footer: {
    tagline: string;
    privacyPolicy: string;
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
      loop: 'El Loop',
      training: 'Entrenamiento',
      ranks: 'Rangos',
    },
    cta: 'Unirse a la beta',
    stores: {
      soon: 'Próximamente en',
    },
    hero: {
      title: ['ESCRIBE.', 'COMPITE.', 'MEJORA.'],
      subtitle:
        'La arena competitiva donde escribir deja de ser algo solitario. Un sistema diseñado para forzarte a crecer bajo presión real, contra rivales de tu nivel.',
      promptLabel: 'Prompt Generado',
      prompt: '"Escribe la historia de una ciudad que ha olvidado su propio nombre..."',
      writing: 'Escribiendo...',
      victory: 'Victoria',
      creativity: 'Creatividad',
      grammar: 'Gramática',
    },
    loop: {
      title: 'El Loop de Combate',
      intro:
        'Un ciclo rápido y exigente diseñado para la retención y la mejora constante del escritor.',
      cards: [
        {
          title: 'El Encuentro',
          body: 'Emparejamiento instantáneo con un escritor de tu nivel para que cada duelo se sienta justo, tenso y posible.',
        },
        {
          title: 'El Desafío',
          body: 'Un prompt dinámico. Sin tiempo para el bloqueo del escritor. Entregas todo lo que tienes en pocos minutos.',
        },
        {
          title: 'Rivalidad Real',
          body: 'Del otro lado, la presión es simétrica. Tu oponente intenta dominar el mismo prompt.',
        },
        {
          title: 'El Veredicto',
          body: 'Ambos textos son analizados al instante por nuestro Motor de Jueces. Solo uno gana.',
        },
        {
          title: 'Feedback Instantáneo',
          body: 'No esperamos días. En milisegundos recibes un desglose exacto de tus aciertos y errores: estructura, vocabulario, y cierre.',
        },
      ],
    },
    thesis: {
      line: 'Tú no compites para ganar.',
      highlight: 'Compites para mejorar.',
      gymTitle: 'Gimnasio del Escritor',
      gymBody:
        'InkDuel te arranca tu zona de confort. Descubres nuevos estilos, géneros y formatos empujado por la urgencia de vencer al reloj.',
      adaptability: 'Adaptabilidad +15 XP',
      vocabulary: 'Vocabulario +10 XP',
      resultsTitle: 'Resultados Visibles',
      resultsBody:
        'El feedback no es abstracto. El sistema evalúa mecánicas puntuales de desarrollo para acelerar tu aprendizaje.',
      rhythm: 'Ritmo',
      tension: 'Tensión',
    },
    progression: {
      title: 'Progreso que se siente.',
      body: 'Escalar aquí no depende de jugar mucho tiempo, depende de escribir mejor. La maestría cuesta, y el estatus se gana.',
      ranks: ['Aprendiz', 'Escriba', 'Narrador', 'Duellista', 'Maestro de Tinta', 'Leyenda'],
      currentElo: 'Tu ELO actual',
    },
    finalCta: {
      line1: 'CADA DUELO',
      line2: 'TE HACE MEJOR',
      line3: 'ESCRITOR.',
      body: 'Entra en la arena. Pon a prueba tus palabras. Sube de rango.',
    },
    footer: {
      tagline: 'Acepta el duelo.',
      privacyPolicy: 'Politica de privacidad',
    },
  },
  en: {
    nav: {
      loop: 'The Loop',
      training: 'Training',
      ranks: 'Ranks',
    },
    cta: 'Join the beta',
    stores: {
      soon: 'Coming soon to',
    },
    hero: {
      title: ['WRITE.', 'COMPETE.', 'IMPROVE.'],
      subtitle:
        'The competitive arena where writing stops being solitary. A system designed to force growth under real pressure, against rivals at your level.',
      promptLabel: 'Generated Prompt',
      prompt: '"Write the story of a city that has forgotten its own name..."',
      writing: 'Writing...',
      victory: 'Victory',
      creativity: 'Creativity',
      grammar: 'Grammar',
    },
    loop: {
      title: 'The Combat Loop',
      intro: 'A fast, demanding cycle built for retention and constant writer improvement.',
      cards: [
        {
          title: 'The Match',
          body: 'Instant matchmaking with a writer at your level so every duel feels fair, tense, and winnable.',
        },
        {
          title: 'The Challenge',
          body: 'A dynamic prompt. No time for writer’s block. You put everything you have on the page in minutes.',
        },
        {
          title: 'Real Rivalry',
          body: 'On the other side, the pressure is symmetrical. Your opponent is trying to master the same prompt.',
        },
        {
          title: 'The Verdict',
          body: 'Both texts are analyzed instantly by our Judge Engine. Only one wins.',
        },
        {
          title: 'Instant Feedback',
          body: 'No waiting days. In milliseconds you receive a precise breakdown of your strengths and mistakes: structure, vocabulary, and ending.',
        },
      ],
    },
    thesis: {
      line: 'You do not compete to win.',
      highlight: 'You compete to improve.',
      gymTitle: 'Writer’s Gym',
      gymBody:
        'InkDuel pulls you out of your comfort zone. You discover new styles, genres, and formats driven by the urgency of beating the clock.',
      adaptability: 'Adaptability +15 XP',
      vocabulary: 'Vocabulary +10 XP',
      resultsTitle: 'Visible Results',
      resultsBody:
        'Feedback is not abstract. The system evaluates specific craft mechanics to accelerate your learning.',
      rhythm: 'Rhythm',
      tension: 'Tension',
    },
    progression: {
      title: 'Progress you can feel.',
      body: 'Climbing here is not about playing longer. It is about writing better. Mastery has a cost, and status is earned.',
      ranks: ['Apprentice', 'Scribe', 'Narrator', 'Duelist', 'Ink Master', 'Legend'],
      currentElo: 'Your current ELO',
    },
    finalCta: {
      line1: 'EVERY DUEL',
      line2: 'MAKES YOU A BETTER',
      line3: 'WRITER.',
      body: 'Enter the arena. Test your words. Climb the ranks.',
    },
    footer: {
      tagline: 'Accept the duel.',
      privacyPolicy: 'Privacy Policy',
    },
  },
  pt: {
    nav: {
      loop: 'O Loop',
      training: 'Treinamento',
      ranks: 'Ranks',
    },
    cta: 'Entrar na beta',
    stores: {
      soon: 'Em breve na',
    },
    hero: {
      title: ['ESCREVA.', 'COMPITA.', 'MELHORE.'],
      subtitle:
        'A arena competitiva onde escrever deixa de ser algo solitário. Um sistema criado para forçar seu crescimento sob pressão real, contra rivais do seu nível.',
      promptLabel: 'Prompt Gerado',
      prompt: '"Escreva a história de uma cidade que esqueceu o próprio nome..."',
      writing: 'Escrevendo...',
      victory: 'Vitória',
      creativity: 'Criatividade',
      grammar: 'Gramática',
    },
    loop: {
      title: 'O Loop de Combate',
      intro:
        'Um ciclo rápido e exigente criado para retenção e melhoria constante de quem escreve.',
      cards: [
        {
          title: 'O Encontro',
          body: 'Pareamento instantâneo com alguém do seu nível para que cada duelo pareça justo, tenso e possível de vencer.',
        },
        {
          title: 'O Desafio',
          body: 'Um prompt dinâmico. Sem tempo para bloqueio criativo. Você entrega tudo o que tem em poucos minutos.',
        },
        {
          title: 'Rivalidade Real',
          body: 'Do outro lado, a pressão é simétrica. Seu oponente tenta dominar o mesmo prompt.',
        },
        {
          title: 'O Veredito',
          body: 'Os dois textos são analisados instantaneamente pelo nosso Motor de Juízes. Só um vence.',
        },
        {
          title: 'Feedback Instantâneo',
          body: 'Nada de esperar dias. Em milissegundos você recebe uma análise precisa dos seus acertos e erros: estrutura, vocabulário e fechamento.',
        },
      ],
    },
    thesis: {
      line: 'Você não compete para vencer.',
      highlight: 'Você compete para melhorar.',
      gymTitle: 'Academia do Escritor',
      gymBody:
        'InkDuel tira você da zona de conforto. Você descobre novos estilos, gêneros e formatos impulsionado pela urgência de vencer o relógio.',
      adaptability: 'Adaptabilidade +15 XP',
      vocabulary: 'Vocabulário +10 XP',
      resultsTitle: 'Resultados Visíveis',
      resultsBody:
        'O feedback não é abstrato. O sistema avalia mecânicas específicas de desenvolvimento para acelerar seu aprendizado.',
      rhythm: 'Ritmo',
      tension: 'Tensão',
    },
    progression: {
      title: 'Progresso que dá para sentir.',
      body: 'Subir aqui não depende de jogar por muito tempo, depende de escrever melhor. A maestria custa, e o status se conquista.',
      ranks: ['Aprendiz', 'Escriba', 'Narrador', 'Duelista', 'Mestre da Tinta', 'Lenda'],
      currentElo: 'Seu ELO atual',
    },
    finalCta: {
      line1: 'CADA DUELO',
      line2: 'FAZ DE VOCÊ',
      line3: 'UM ESCRITOR MELHOR.',
      body: 'Entre na arena. Teste suas palavras. Suba de rank.',
    },
    footer: {
      tagline: 'Aceite o duelo.',
      privacyPolicy: 'Politica de Privacidade',
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
        <div className="logo">
          Ink<span className="accent">Duel</span>
        </div>

        <nav className="nav-links" aria-label="Main navigation">
          <a href="#como-funciona">{copy.nav.loop}</a>
          <a href="#entrenamiento">{copy.nav.training}</a>
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
          <h1 className="hero-title">
            {copy.hero.title[0]} <br />
            {copy.hero.title[1]}
            <br />
            <span className="text-stroke">{copy.hero.title[2]}</span>
          </h1>
          <p className="hero-subtitle">{copy.hero.subtitle}</p>
          <div className="hero-actions">
            <button className="cta-button large">{copy.cta}</button>
            <div className="store-buttons">
              <div className="store-btn">
                <div className="s-icon"></div>
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
        <div className="hero-visual">
          <div className="floating-card product-card prompt-card">
            <span className="ink-icon">✦</span>
            <h4>{copy.hero.promptLabel}</h4>
            <p className="ui-text">{copy.hero.prompt}</p>
          </div>
          <div className="floating-card product-card timer-card">
            <div className="timer-ring">04:59</div>
            <h4>{copy.hero.writing}</h4>
            <div className="pulse-bar"></div>
          </div>
          <div className="floating-card product-card verdict-card">
            <h4>{copy.hero.victory}</h4>
            <div className="score-row">
              <span className="score-label">{copy.hero.creativity}</span>
              <div className="s-bar">
                <div className="fill w-90"></div>
              </div>
              <span className="score-num">90</span>
            </div>
            <div className="score-row">
              <span className="score-label">{copy.hero.grammar}</span>
              <div className="s-bar">
                <div className="fill w-85"></div>
              </div>
              <span className="score-num">85</span>
            </div>
          </div>
        </div>
      </section>

      <section id="como-funciona" className="bento-loop">
        <div className="bento-intro">
          <h2>{copy.loop.title}</h2>
          <p>{copy.loop.intro}</p>
        </div>
        <div className="bento-grid">
          {copy.loop.cards.map((card, index) => (
            <div
              key={card.title}
              className={`bento-card ${index === 0 || index === 4 ? 'b-wide' : ''} ${
                index === 0 ? 'gradient-aura' : ''
              } ${index === 1 ? 'b-tall' : ''} ${index === 4 ? 'dark-accent' : ''}`}
            >
              {index === 4 ? <div className="glow-orb"></div> : <div className="bento-num">0{index + 1}</div>}
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="entrenamiento" className="core-thesis">
        <h2>
          {copy.thesis.line} <br />
          <span className="highlight-thesis">{copy.thesis.highlight}</span>
        </h2>
        <div className="features-container">
          <div className="f-item workout-card">
            <h4>{copy.thesis.gymTitle}</h4>
            <p>{copy.thesis.gymBody}</p>
            <div className="ui-simulation">
              <div className="ui-badge">{copy.thesis.adaptability}</div>
              <div className="ui-badge">{copy.thesis.vocabulary}</div>
            </div>
          </div>
          <div className="f-item stats-card">
            <h4>{copy.thesis.resultsTitle}</h4>
            <p>{copy.thesis.resultsBody}</p>
            <div className="ui-simulation vertical">
              <div className="score-row loose">
                <span className="score-label">{copy.thesis.rhythm}</span>
                <div className="s-bar">
                  <div className="fill w-80"></div>
                </div>
              </div>
              <div className="score-row loose">
                <span className="score-label">{copy.thesis.tension}</span>
                <div className="s-bar">
                  <div className="fill w-95 amber"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="rangos" className="progression-path">
        <div className="progression-text">
          <h2>{copy.progression.title}</h2>
          <p>{copy.progression.body}</p>
        </div>

        <div className="ranks-timeline">
          <div className="line-connector"></div>

          {copy.progression.ranks.map((rank, index) => (
            <div
              key={rank}
              className={`rank-node ${
                ['r-aprendiz', 'r-escriba', 'r-narrador', 'r-duellista', 'r-maestro', 'r-leyenda'][
                  index
                ]
              } ${index === 3 ? 'focused' : ''} ${index > 3 ? 'dormant' : ''}`}
            >
              <div className="r-icon"></div>
              <div className={index === 3 ? 'r-label glow-text' : 'r-label'}>{rank}</div>
              {index === 3 ? <div className="focused-indicator">{copy.progression.currentElo}</div> : null}
            </div>
          ))}
        </div>
      </section>

      <section className="hero-footer-cta">
        <h2 className="massive-cta">
          {copy.finalCta.line1} <br /> {copy.finalCta.line2} <br />{' '}
          <span className="accent">{copy.finalCta.line3}</span>
        </h2>
        <p>{copy.finalCta.body}</p>
        <button className="cta-button primary glow large-mega">{copy.cta}</button>
      </section>

      <footer className="footer-bar">
        <span>
          © {new Date().getFullYear()} INKDUEL. {copy.footer.tagline}
        </span>
        <a href={`/privacy?lang=${locale}`}>{copy.footer.privacyPolicy}</a>
      </footer>
    </main>
  );
}
