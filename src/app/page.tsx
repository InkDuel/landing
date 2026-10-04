'use client';

import { Consigna } from '@/components/ink/consigna';
import { InkButton } from '@/components/ink/ink-button';
import { InkCard } from '@/components/ink/ink-card';
import { InkChip } from '@/components/ink/ink-chip';
import { InkHeadline } from '@/components/ink/ink-headline';
import { Kicker } from '@/components/ink/kicker';
import { NumberedRule } from '@/components/ink/numbered-rule';
import { PencilTrack } from '@/components/ink/pencil-track';
import { PlayerIdentity } from '@/components/ink/player-identity';
import { InkPage, PageColumn } from '@/components/shell/ink-page';
import { SiteFooter } from '@/components/shell/site-footer';
import { SiteHeader } from '@/components/shell/site-header';
import { StoreButtons } from '@/components/shell/store-buttons';
import { type Locale, withLang } from '@/lib/i18n';
import { LEAGUE_NAMES, LEAGUE_ORDER } from '@/lib/league';
import { useLocale } from '@/lib/use-locale';

type Copy = {
  nav: { duel: string; judge: string; ranks: string; about: string };
  hero: {
    kicker: string;
    title: string;
    tagline: string;
    subtitle: string;
    searching: string;
    searchingSub: string;
    consignaLabel: string;
    consigna: string;
    timeLeft: string;
    verdictTitle: string;
    youLabel: string;
    rivalLabel: string;
    youScore: string;
    rivalScore: string;
    victory: string;
  };
  rules: { kicker: string; title: string; intro: string; steps: { title: string; body: string }[] };
  judge: {
    kicker: string;
    title: string;
    highlight: string;
    body: string;
    adviceLabel: string;
    advice: string;
    breakdownLabel: string;
    criteria: { label: string; score: number }[];
  };
  ranks: {
    kicker: string;
    title: string;
    body: string;
    divisionLabel: string;
    divisionRank: string;
    divisionLp: string;
    divisionNext: string;
    trackLabel: string;
    ladderLabel: string;
    current: string;
  };
  finalCta: { title: string; body: string; micro: string };
};

const copies: Record<Locale, Copy> = {
  es: {
    nav: { duel: 'El duelo', judge: 'El jurado', ranks: 'Rangos', about: 'Sobre InkDuel' },
    hero: {
      kicker: 'Duelos de escritura · 5 minutos',
      title: 'Una consigna.\nUn oponente.',
      tagline: 'La mejor historia gana.',
      subtitle:
        'InkDuel es la arena donde escribir deja de ser solitario. Recibes una consigna, escribes contra el reloj y un jurado de tinta decide quién contó la mejor historia.',
      searching: 'Afilando plumas…',
      searchingSub: 'Buscamos a alguien de tu nivel',
      consignaLabel: 'Consigna',
      consigna:
        'Una persona recibe una carta escrita por alguien que murió hace años. La carta dice: «No confíes en la versión de mí que todavía está viva».',
      timeLeft: 'Tiempo restante',
      verdictTitle: 'Veredicto del jurado',
      youLabel: 'Tú',
      rivalLabel: 'Rival',
      youScore: '33.4',
      rivalScore: '21.1',
      victory: 'Victoria',
    },
    rules: {
      kicker: 'El duelo',
      title: 'Esto va en serio.',
      intro: '5 reglas. Nada más.',
      steps: [
        { title: 'Consigna al azar', body: 'La revelamos cuando entras. Sin tiempo para el bloqueo creativo.' },
        { title: '5 minutos', body: 'El reloj empieza al tocar el botón. Entregas todo lo que tienes.' },
        {
          title: 'Un rival de tu nivel',
          body: 'Del otro lado, la presión es simétrica: tu oponente pelea la misma consigna.',
        },
        { title: 'Jurado de tinta', body: 'Creatividad, estilo, emoción y desenlace. Solo una historia gana.' },
        { title: 'Veredicto al instante', body: 'En segundos recibes un desglose exacto de tus aciertos y errores.' },
      ],
    },
    judge: {
      kicker: 'El jurado',
      title: 'No compites para ganar.',
      highlight: 'Compites para mejorar.',
      body: 'Cada duelo termina con un consejo concreto: dónde tu relato fue más fuerte, dónde perdiste al lector y qué trabajar en el próximo. El progreso no es una sensación. Se mide.',
      adviceLabel: 'Para tu próximo duelo',
      advice:
        'Tu mayor fortaleza es el gancho narrativo: generas intriga con muy pocas palabras. Para el próximo duelo, cuida el desenlace: un cierre más fuerte te habría dado la victoria.',
      breakdownLabel: 'Desglose del jurado',
      criteria: [
        { label: 'Creatividad', score: 9.2 },
        { label: 'Estilo', score: 8.5 },
        { label: 'Emoción', score: 7.8 },
        { label: 'Desenlace', score: 6.4 },
      ],
    },
    ranks: {
      kicker: 'Progresión',
      title: 'El estatus se gana.',
      body: 'Subir no depende de jugar más horas: depende de escribir mejor. Seis ligas entre tu primer duelo y la leyenda.',
      divisionLabel: 'División actual',
      divisionRank: 'Aprendiz I',
      divisionLp: '20 LP',
      divisionNext: 'Faltan 80 LP para Aprendiz II',
      trackLabel: '20 LP · faltan 80 para Aprendiz II',
      ladderLabel: 'Las seis ligas',
      current: 'Tu liga',
    },
    finalCta: {
      title: 'Cada duelo mejora tu escritura.',
      body: 'Entra en la arena. Pon a prueba tus palabras. Sube de rango.',
      micro: 'Una vez dentro, el tiempo corre.',
    },
  },
  en: {
    nav: { duel: 'The duel', judge: 'The judge', ranks: 'Ranks', about: 'About' },
    hero: {
      kicker: 'Writing duels · 5 minutes',
      title: 'One prompt.\nOne opponent.',
      tagline: 'Best story wins.',
      subtitle:
        'InkDuel is the arena where writing stops being solitary. You get a prompt, write against the clock, and an ink judge decides who told the better story.',
      searching: 'Sharpening quills…',
      searchingSub: 'Finding someone at your level',
      consignaLabel: 'Prompt',
      consigna:
        'Someone receives a letter written by a person who died years ago. It reads: “Don’t trust the version of me that is still alive.”',
      timeLeft: 'Time left',
      verdictTitle: 'The judge’s verdict',
      youLabel: 'You',
      rivalLabel: 'Rival',
      youScore: '33.4',
      rivalScore: '21.1',
      victory: 'Victory',
    },
    rules: {
      kicker: 'The duel',
      title: 'This is for real.',
      intro: '5 rules. Nothing else.',
      steps: [
        { title: 'Random prompt', body: 'Revealed the moment you enter. No time for writer’s block.' },
        { title: '5 minutes', body: 'The clock starts when you tap the button. You give everything you have.' },
        {
          title: 'A rival at your level',
          body: 'On the other side, the pressure is symmetrical: your opponent fights the same prompt.',
        },
        { title: 'Ink judge', body: 'Creativity, style, emotion, and the ending. Only one story wins.' },
        { title: 'Instant verdict', body: 'In seconds you get a precise breakdown of what worked and what didn’t.' },
      ],
    },
    judge: {
      kicker: 'The judge',
      title: 'You don’t compete to win.',
      highlight: 'You compete to improve.',
      body: 'Every duel ends with concrete advice: where your story was strongest, where you lost the reader, and what to work on next. Progress isn’t a feeling. It’s measured.',
      adviceLabel: 'For your next duel',
      advice:
        'Your greatest strength is the narrative hook: you create intrigue with very few words. Next duel, watch your ending: a stronger close would have won you the match.',
      breakdownLabel: 'Judge’s breakdown',
      criteria: [
        { label: 'Creativity', score: 9.2 },
        { label: 'Style', score: 8.5 },
        { label: 'Emotion', score: 7.8 },
        { label: 'Ending', score: 6.4 },
      ],
    },
    ranks: {
      kicker: 'Progression',
      title: 'Status is earned.',
      body: 'Climbing isn’t about playing longer: it’s about writing better. Six leagues between your first duel and legend.',
      divisionLabel: 'Current division',
      divisionRank: 'Apprentice I',
      divisionLp: '20 LP',
      divisionNext: '80 LP to Apprentice II',
      trackLabel: '20 LP · 80 to Apprentice II',
      ladderLabel: 'The six leagues',
      current: 'Your league',
    },
    finalCta: {
      title: 'Every duel makes you a better writer.',
      body: 'Enter the arena. Test your words. Climb the ranks.',
      micro: 'Once you’re in, the clock is running.',
    },
  },
  pt: {
    nav: { duel: 'O duelo', judge: 'O júri', ranks: 'Ranks', about: 'Sobre' },
    hero: {
      kicker: 'Duelos de escrita · 5 minutos',
      title: 'Uma proposta.\nUm oponente.',
      tagline: 'A melhor história vence.',
      subtitle:
        'InkDuel é a arena onde escrever deixa de ser solitário. Você recebe uma proposta, escreve contra o relógio e um júri de tinta decide quem contou a melhor história.',
      searching: 'Afiando as penas…',
      searchingSub: 'Procurando alguém do seu nível',
      consignaLabel: 'Proposta',
      consigna:
        'Uma pessoa recebe uma carta escrita por alguém que morreu há anos. A carta diz: «Não confie na versão de mim que ainda está viva».',
      timeLeft: 'Tempo restante',
      verdictTitle: 'Veredito do júri',
      youLabel: 'Você',
      rivalLabel: 'Rival',
      youScore: '33.4',
      rivalScore: '21.1',
      victory: 'Vitória',
    },
    rules: {
      kicker: 'O duelo',
      title: 'Isto é pra valer.',
      intro: '5 regras. Nada mais.',
      steps: [
        { title: 'Proposta aleatória', body: 'Revelada quando você entra. Sem tempo para bloqueio criativo.' },
        { title: '5 minutos', body: 'O relógio começa ao tocar o botão. Você entrega tudo o que tem.' },
        {
          title: 'Um rival do seu nível',
          body: 'Do outro lado, a pressão é simétrica: seu oponente enfrenta a mesma proposta.',
        },
        { title: 'Júri de tinta', body: 'Criatividade, estilo, emoção e desfecho. Só uma história vence.' },
        { title: 'Veredito na hora', body: 'Em segundos você recebe uma análise exata dos seus acertos e erros.' },
      ],
    },
    judge: {
      kicker: 'O júri',
      title: 'Você não compete para vencer.',
      highlight: 'Você compete para melhorar.',
      body: 'Cada duelo termina com um conselho concreto: onde sua história foi mais forte, onde você perdeu o leitor e o que trabalhar no próximo. Progresso não é sensação. É medido.',
      adviceLabel: 'Para o seu próximo duelo',
      advice:
        'Sua maior força é o gancho narrativo: você cria intriga com pouquíssimas palavras. No próximo duelo, cuide do desfecho: um final mais forte teria garantido a vitória.',
      breakdownLabel: 'Análise do júri',
      criteria: [
        { label: 'Criatividade', score: 9.2 },
        { label: 'Estilo', score: 8.5 },
        { label: 'Emoção', score: 7.8 },
        { label: 'Desfecho', score: 6.4 },
      ],
    },
    ranks: {
      kicker: 'Progressão',
      title: 'O status se conquista.',
      body: 'Subir não depende de jogar por mais tempo: depende de escrever melhor. Seis ligas entre o seu primeiro duelo e a lenda.',
      divisionLabel: 'Divisão atual',
      divisionRank: 'Aprendiz I',
      divisionLp: '20 LP',
      divisionNext: 'Faltam 80 LP para Aprendiz II',
      trackLabel: '20 LP · faltam 80 para Aprendiz II',
      ladderLabel: 'As seis ligas',
      current: 'Sua liga',
    },
    finalCta: {
      title: 'Cada duelo melhora sua escrita.',
      body: 'Entre na arena. Teste suas palavras. Suba de rank.',
      micro: 'Uma vez dentro, o relógio corre.',
    },
  },
};

function DuelPreview({ copy }: { copy: Copy['hero'] }) {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      <InkCard className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <PlayerIdentity name="L" rankTier="Aprendiz" size={56} emphasis="primary" />
          <span className="type-label text-tertiary">vs</span>
          <PlayerIdentity name="?" size={56} />
        </div>
        <div className="min-w-0">
          <p className="type-body-strong text-primary">{copy.searching}</p>
          <p className="type-caption text-secondary">{copy.searchingSub}</p>
        </div>
      </InkCard>

      <div className="flex flex-col gap-3 rounded-card border-quiet border-divider bg-reader p-3 ctx-reading">
        <Consigna label={copy.consignaLabel} text={copy.consigna} />
        <div className="flex items-center gap-3 px-1">
          <span className="type-numeric text-[17px] text-primary">04:55</span>
          <span className="h-1.5 flex-1 overflow-hidden rounded-pill bg-sunken">
            <span className="block h-full w-[98%] rounded-pill bg-inverse" />
          </span>
          <span className="sr-only">{copy.timeLeft}</span>
        </div>
      </div>

      <InkCard tone="brand">
        <div className="flex items-center justify-between gap-3">
          <p className="type-title-section text-primary">{copy.verdictTitle}</p>
          <InkChip tone="victory">{copy.victory}</InkChip>
        </div>
        <dl className="mt-4 grid grid-cols-[1fr_auto_1fr] items-end gap-3">
          <div>
            <dt className="type-caption text-secondary">{copy.youLabel}</dt>
            <dd className="type-numeric text-[28px] text-primary">{copy.youScore}</dd>
          </div>
          <span className="pb-2 type-label text-tertiary">vs</span>
          <div className="text-right">
            <dt className="type-caption text-secondary">{copy.rivalLabel}</dt>
            <dd className="type-numeric text-[28px] text-secondary">{copy.rivalScore}</dd>
          </div>
        </dl>
      </InkCard>
    </div>
  );
}

function SectionIntro({
  id,
  kicker,
  title,
  highlight,
  children,
}: {
  id: string;
  kicker: string;
  title: string;
  highlight?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Kicker>{kicker}</Kicker>
      <InkHeadline as="h2" id={id} text={title} highlight={highlight} size="title-page-lg" />
      {children}
    </div>
  );
}

export default function Home() {
  const [locale, setLocale] = useLocale();
  const copy = copies[locale];

  const nav = [
    { href: '#duelo', label: copy.nav.duel },
    { href: '#jurado', label: copy.nav.judge },
    { href: '#rangos', label: copy.nav.ranks },
    { href: withLang('/about', locale), label: copy.nav.about },
  ];

  return (
    <InkPage context="arena">
      <SiteHeader locale={locale} onLocaleChange={setLocale} nav={nav} />

      <main id="top">
        {/* Hero */}
        <PageColumn width="wide" className="grid items-center gap-10 pt-6 pb-16 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:pt-12 lg:pb-24">
          <div className="flex flex-col gap-5">
            <Kicker>{copy.hero.kicker}</Kicker>
            <InkHeadline text={copy.hero.title} size="display-lg" className="whitespace-pre-line" />
            <p className="type-title-section-lg text-primary">{copy.hero.tagline}</p>
            <p className="max-w-[52ch] type-body text-secondary">{copy.hero.subtitle}</p>
            <StoreButtons locale={locale} className="mt-2" />
            <InkButton href={withLang('/about', locale)} variant="ghost" fullWidth={false} className="self-start">
              {copy.nav.about}
            </InkButton>
          </div>
          <div className="mx-auto w-full max-w-[440px]">
            <DuelPreview copy={copy.hero} />
          </div>
        </PageColumn>

        {/* The duel */}
        <section aria-labelledby="duelo" className="scroll-mt-6 py-16">
          <PageColumn width="wide" className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
            <SectionIntro id="duelo" kicker={copy.rules.kicker} title={copy.rules.title}>
              <p className="type-body text-secondary">{copy.rules.intro}</p>
            </SectionIntro>
            <ol className="m-0 p-0">
              {copy.rules.steps.map((step, index) => (
                <NumberedRule key={step.title} number={index + 1} title={step.title} body={step.body} divider={index > 0} />
              ))}
            </ol>
          </PageColumn>
        </section>

        {/* The judge */}
        <section aria-labelledby="jurado" className="scroll-mt-6 py-16">
          <PageColumn width="wide" className="grid items-start gap-8 lg:grid-cols-2 lg:gap-16">
            <SectionIntro
              id="jurado"
              kicker={copy.judge.kicker}
              title={`${copy.judge.title}\n${copy.judge.highlight}`}
              highlight={copy.judge.highlight}
            >
              <p className="type-body text-secondary">{copy.judge.body}</p>
            </SectionIntro>
            <div className="flex flex-col gap-4" aria-hidden="true">
              <InkCard>
                <Kicker>{copy.judge.adviceLabel}</Kicker>
                <p className="mt-2 type-body text-primary">{copy.judge.advice}</p>
              </InkCard>
              <InkCard>
                <Kicker>{copy.judge.breakdownLabel}</Kicker>
                <ul className="m-0 mt-3 flex list-none flex-col gap-3 p-0">
                  {copy.judge.criteria.map((criterion) => (
                    <li key={criterion.label} className="grid grid-cols-[96px_1fr_auto] items-center gap-3">
                      <span className="type-caption text-secondary">{criterion.label}</span>
                      <span className="h-1.5 overflow-hidden rounded-pill bg-sunken">
                        <span
                          className="block h-full rounded-pill bg-inverse"
                          style={{ width: `${criterion.score * 10}%` }}
                        />
                      </span>
                      <span className="type-numeric text-primary">{criterion.score.toFixed(1)}</span>
                    </li>
                  ))}
                </ul>
              </InkCard>
            </div>
          </PageColumn>
        </section>

        {/* Ranks */}
        <section aria-labelledby="rangos" className="scroll-mt-6 py-16">
          <PageColumn width="wide" className="grid items-start gap-8 lg:grid-cols-2 lg:gap-16">
            <SectionIntro id="rangos" kicker={copy.ranks.kicker} title={copy.ranks.title}>
              <p className="type-body text-secondary">{copy.ranks.body}</p>
            </SectionIntro>
            <div className="flex flex-col gap-6">
              <div data-league="aprendiz">
                <InkCard tone="outlined" fill="bg-league-tint">
                  <div className="flex items-center gap-3">
                    <PlayerIdentity name="L" rankTier="Aprendiz" size={44} emphasis="primary" />
                    <div className="min-w-0 flex-1">
                      <Kicker>{copy.ranks.divisionLabel}</Kicker>
                      <p className="type-title-section text-primary">{copy.ranks.divisionRank}</p>
                    </div>
                    <span className="type-numeric text-[22px] text-primary">{copy.ranks.divisionLp}</span>
                  </div>
                  <PencilTrack progress={0.2} stroke="league" goalLabel="II" label={copy.ranks.trackLabel} className="mt-4" />
                  <p className="mt-2 type-caption text-secondary">{copy.ranks.divisionNext}</p>
                </InkCard>
              </div>

              <div>
                <h3 className="sr-only">{copy.ranks.ladderLabel}</h3>
                <ol className="m-0 grid list-none grid-cols-2 gap-x-4 gap-y-3 p-0 sm:grid-cols-3">
                  {LEAGUE_ORDER.map((league, index) => (
                    <li key={league} className="flex items-center gap-2">
                      <PlayerIdentity name={LEAGUE_NAMES[league][locale]} rankTier={league} size={32} />
                      <span className="flex min-w-0 flex-col">
                        <span className={index === 0 ? 'type-body-strong text-primary' : 'type-body text-secondary'}>
                          {LEAGUE_NAMES[league][locale]}
                        </span>
                        {index === 0 ? <span className="type-caption text-secondary">{copy.ranks.current}</span> : null}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </PageColumn>
        </section>

        {/* Final call */}
        <section className="py-20">
          <PageColumn width="product" className="flex flex-col items-center gap-5 text-center">
            <InkHeadline as="h2" text={copy.finalCta.title} size="display" />
            <p className="type-body text-secondary">{copy.finalCta.body}</p>
            <StoreButtons locale={locale} className="justify-center" />
            <p className="type-caption text-tertiary">{copy.finalCta.micro}</p>
          </PageColumn>
        </section>
      </main>

      <SiteFooter locale={locale} />
    </InkPage>
  );
}
