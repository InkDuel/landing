'use client';

import { useEffect, useMemo, useState } from 'react';

export type Locale = 'es' | 'en' | 'pt';

type TermsSection = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

type ChallengeTermsCopy = {
  backToHome: string;
  eyebrow: string;
  title: string;
  intro: string;
  lastUpdatedLabel: string;
  lastUpdatedValue: string;
  contactLabel: string;
  contactValue: string;
  privacyLabel: string;
  sections: TermsSection[];
};

const CONTACT_EMAIL = 'inkduel.app@gmail.com';
const PRIVACY_URL = 'https://inkduel.com/privacy';

const languageOptions: {
  code: Locale;
  label: string;
  flag: string;
}[] = [
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
];

const withLocalePath = (path: string, locale: Locale) => `${path}?lang=${locale}`;

const copies: Record<Locale, ChallengeTermsCopy> = {
  es: {
    backToHome: 'Volver al inicio',
    eyebrow: 'Bases y condiciones',
    title: 'Desafíos especiales de escritura en InkDuel.',
    intro:
      'Estas bases regulan la participación en desafíos especiales destacados dentro de InkDuel, incluyendo campañas con creadoras, menciones públicas y premios cuando correspondan.',
    lastUpdatedLabel: 'Última actualización',
    lastUpdatedValue: '31 de mayo de 2026',
    contactLabel: 'Contacto',
    contactValue: CONTACT_EMAIL,
    privacyLabel: 'Política de privacidad',
    sections: [
      {
        title: '1. Organizador y alcance',
        paragraphs: [
          'Los desafíos especiales son organizados por InkDuel y, cuando se indique en la app, pueden contar con la participación de una creadora, autora, marca o invitada especial.',
          'Cada desafío puede mostrar una descripción, fechas, consigna teaser, reglas resumidas, premio o reconocimiento y estado de resultados dentro de la app o en esta página.',
          'Al participar, aceptas estas bases, las reglas específicas visibles en el desafío y las políticas generales de InkDuel.',
        ],
      },
      {
        title: '2. Quién puede participar',
        paragraphs: [
          'Puede participar cualquier usuario registrado de InkDuel que cumpla la edad mínima y los requisitos de uso de la app.',
          'La participación puede estar limitada por idioma, país, disponibilidad técnica, moderación, integridad de cuenta o reglas específicas de la campaña.',
        ],
        bullets: [
          'Se permite un solo intento oficial por usuario y por desafío.',
          'No se permite usar cuentas múltiples para aumentar chances de selección.',
          'InkDuel puede excluir participaciones asociadas a fraude, abuso, plagio, automatización no autorizada o incumplimiento de estas bases.',
        ],
      },
      {
        title: '3. Mecánica del desafío',
        paragraphs: [
          'Para participar, el usuario debe iniciar el desafío desde la app. Al iniciar, se revela la consigna completa y comienza el tiempo de escritura.',
          'El primer piloto de desafíos especiales no consume energía, no afecta ranking competitivo y puede otorgar la experiencia normal de escritura si el flujo vigente de InkDuel lo permite.',
          'Si un usuario inicia antes del cierre general, conserva su ventana completa de escritura aunque el cierre ocurra durante su intento. El cierre impide nuevos inicios, pero no corta intentos ya iniciados.',
        ],
        bullets: [
          'Duración estándar del intento: 5 minutos, salvo que el desafío indique otra duración.',
          'El relato debe enviarse desde la app antes de que venza la ventana individual del intento.',
          'La participación queda registrada oficialmente aunque la evaluación o feedback automatizado falle, demore o esté desactivado.',
        ],
      },
      {
        title: '4. Contenido y originalidad',
        paragraphs: [
          'El relato enviado debe ser creación del participante y no debe infringir derechos de terceros.',
          'No se aceptan contenidos ilegales, abusivos, discriminatorios, sexualmente explícitos, violentos de forma gratuita, difamatorios o contrarios a las reglas de comunidad de InkDuel.',
          'InkDuel puede moderar, ocultar, descalificar o retirar relatos cuando detecte incumplimientos, reportes fundados o riesgos para la comunidad.',
        ],
      },
      {
        title: '5. Privacidad y publicación',
        paragraphs: [
          'Los relatos enviados a un desafío especial no se publican automáticamente en Galería ni en vistas públicas para no participantes.',
          'Hasta que haya un resultado publicado, el relato y la consigna completa se mantienen visibles solo para su autor y para los equipos o personas necesarias para operar, moderar y seleccionar el desafío.',
          'Si un relato resulta ganador o recibe una mención publicada, InkDuel podrá mostrar el texto, la consigna, el nombre de usuario y datos mínimos asociados al resultado dentro de la app, en la landing o en comunicaciones del desafío.',
        ],
      },
      {
        title: '6. Selección de ganador y menciones',
        paragraphs: [
          'La selección puede realizarse manualmente por InkDuel, por la creadora invitada o por el equipo designado para la campaña.',
          'Los criterios pueden incluir creatividad, adaptación a la consigna, impacto narrativo, estilo, claridad, cierre, originalidad y cumplimiento de reglas.',
          'La decisión final de selección corresponde a InkDuel o al equipo indicado en el desafío. La selección puede declararse desierta si no hay participaciones válidas o elegibles.',
        ],
      },
      {
        title: '7. Publicación de resultados',
        paragraphs: [
          'Un resultado se considera publicado cuando InkDuel habilita el ganador o las menciones en la app o en la página correspondiente.',
          'Para el MVP, InkDuel puede registrar internamente el identificador del duelo ganador y el backend resolverá la información necesaria para mostrar el relato ganador, la consigna y el autor en el frontend.',
          'Los participantes podrán enterarse del resultado mediante la app, notificaciones, vistas del desafío o comunicaciones asociadas a la campaña.',
        ],
      },
      {
        title: '8. Feedback automatizado e IA',
        paragraphs: [
          'Algunos desafíos pueden ofrecer feedback automatizado o evaluación asistida por IA como parte de la experiencia de escritura.',
          'El feedback automatizado es orientativo y puede demorarse, fallar o desactivarse por control de costos, mantenimiento, seguridad o alta demanda.',
          'La elegibilidad de una participación no depende del éxito del feedback automatizado.',
        ],
      },
      {
        title: '9. Premios o reconocimientos',
        paragraphs: [
          'Si un desafío incluye premio, beneficio o reconocimiento específico, sus detalles se informarán en la app, en la campaña o en comunicaciones asociadas.',
          'Los premios, cuando existan, pueden estar sujetos a verificación de identidad, disponibilidad geográfica, cumplimiento de requisitos, coordinación con la persona ganadora y reglas adicionales del desafío.',
          'Si no se indica un premio específico, la participación implica únicamente reconocimiento dentro de la experiencia InkDuel.',
        ],
      },
      {
        title: '10. Cambios, suspensión o cancelación',
        paragraphs: [
          'InkDuel puede modificar fechas, reglas operativas, criterios, visibilidad o disponibilidad del desafío cuando sea necesario por razones técnicas, legales, de seguridad, moderación, fraude o fuerza mayor.',
          'InkDuel también puede suspender o cancelar un desafío si no puede operar de forma justa, segura o conforme a estas bases.',
        ],
      },
      {
        title: '11. Datos personales',
        paragraphs: [
          `El tratamiento de datos personales se rige por la Política de privacidad de InkDuel, disponible en ${PRIVACY_URL}.`,
          'Al participar, autorizas el tratamiento de los datos necesarios para operar el desafío, registrar tu participación, seleccionar resultados, publicar ganadores o menciones y comunicar novedades relacionadas.',
        ],
      },
      {
        title: '12. Contacto',
        paragraphs: [
          `Para consultas sobre estas bases o sobre un desafío especial, puedes escribir a ${CONTACT_EMAIL}.`,
        ],
      },
    ],
  },
  en: {
    backToHome: 'Back to home',
    eyebrow: 'Terms and conditions',
    title: 'Special writing challenges on InkDuel.',
    intro:
      'These terms govern participation in featured special challenges inside InkDuel, including creator campaigns, public mentions, and prizes when applicable.',
    lastUpdatedLabel: 'Last updated',
    lastUpdatedValue: 'May 31, 2026',
    contactLabel: 'Contact',
    contactValue: CONTACT_EMAIL,
    privacyLabel: 'Privacy Policy',
    sections: [
      {
        title: '1. Organizer and scope',
        paragraphs: [
          'Special challenges are organized by InkDuel and, when indicated in the app, may involve a creator, author, brand, or special guest.',
          'Each challenge may display a description, dates, prompt teaser, summary rules, prize or recognition, and result status inside the app or on this page.',
          'By participating, you accept these terms, the specific rules shown for the challenge, and InkDuel’s general policies.',
        ],
      },
      {
        title: '2. Who may participate',
        paragraphs: [
          'Any registered InkDuel user who meets the minimum age and app usage requirements may participate.',
          'Participation may be limited by language, country, technical availability, moderation, account integrity, or campaign-specific rules.',
        ],
        bullets: [
          'Only one official attempt is allowed per user and per challenge.',
          'Multiple accounts may not be used to increase chances of selection.',
          'InkDuel may exclude entries associated with fraud, abuse, plagiarism, unauthorized automation, or breach of these terms.',
        ],
      },
      {
        title: '3. Challenge mechanics',
        paragraphs: [
          'To participate, the user must start the challenge from the app. Once started, the full prompt is revealed and the writing timer begins.',
          'The first pilot of special challenges does not consume energy, does not affect competitive ranking, and may grant normal writing XP if the current InkDuel flow allows it.',
          'If a user starts before the general closing time, they keep their full individual writing window even if the general close happens during the attempt. The close blocks new starts, but does not cut off attempts already started.',
        ],
        bullets: [
          'Standard attempt duration: 5 minutes, unless the challenge states a different duration.',
          'The story must be submitted from the app before the individual attempt window expires.',
          'The entry is officially recorded even if automated evaluation or feedback fails, is delayed, or is disabled.',
        ],
      },
      {
        title: '4. Content and originality',
        paragraphs: [
          'The submitted story must be created by the participant and must not infringe third-party rights.',
          'Illegal, abusive, discriminatory, sexually explicit, gratuitously violent, defamatory, or community-rule-breaking content is not allowed.',
          'InkDuel may moderate, hide, disqualify, or remove stories when it detects violations, substantiated reports, or risks to the community.',
        ],
      },
      {
        title: '5. Privacy and publication',
        paragraphs: [
          'Stories submitted to a special challenge are not automatically published in Gallery or in public views for non-participants.',
          'Until a result is published, the story and full prompt remain visible only to the author and to the teams or people needed to operate, moderate, and select the challenge.',
          'If a story wins or receives a published mention, InkDuel may display the text, prompt, username, and minimal result-related data inside the app, on the landing page, or in challenge communications.',
        ],
      },
      {
        title: '6. Winner selection and mentions',
        paragraphs: [
          'Selection may be performed manually by InkDuel, by the guest creator, or by the team designated for the campaign.',
          'Criteria may include creativity, fit to prompt, narrative impact, style, clarity, ending, originality, and rule compliance.',
          'The final selection decision belongs to InkDuel or the team indicated in the challenge. Selection may be declared void if there are no valid or eligible entries.',
        ],
      },
      {
        title: '7. Publication of results',
        paragraphs: [
          'A result is considered published when InkDuel enables the winner or mentions in the app or on the corresponding page.',
          'For the MVP, InkDuel may internally register the winning duel identifier and the backend will resolve the necessary information to show the winning story, prompt, and author on the frontend.',
          'Participants may learn about the result through the app, notifications, challenge views, or campaign-related communications.',
        ],
      },
      {
        title: '8. Automated feedback and AI',
        paragraphs: [
          'Some challenges may offer automated feedback or AI-assisted evaluation as part of the writing experience.',
          'Automated feedback is guidance only and may be delayed, fail, or be disabled due to cost control, maintenance, safety, or high demand.',
          'Entry eligibility does not depend on successful automated feedback.',
        ],
      },
      {
        title: '9. Prizes or recognition',
        paragraphs: [
          'If a challenge includes a specific prize, benefit, or recognition, details will be communicated in the app, campaign, or related communications.',
          'Prizes, when applicable, may be subject to identity verification, geographic availability, requirement compliance, coordination with the winner, and additional challenge rules.',
          'If no specific prize is indicated, participation only implies recognition within the InkDuel experience.',
        ],
      },
      {
        title: '10. Changes, suspension, or cancellation',
        paragraphs: [
          'InkDuel may modify dates, operational rules, criteria, visibility, or availability when needed for technical, legal, safety, moderation, fraud-prevention, or force-majeure reasons.',
          'InkDuel may also suspend or cancel a challenge if it cannot be operated fairly, safely, or in accordance with these terms.',
        ],
      },
      {
        title: '11. Personal data',
        paragraphs: [
          `Personal data processing is governed by InkDuel’s Privacy Policy, available at ${PRIVACY_URL}.`,
          'By participating, you authorize the processing of the data needed to operate the challenge, record your entry, select results, publish winners or mentions, and communicate related updates.',
        ],
      },
      {
        title: '12. Contact',
        paragraphs: [
          `For questions about these terms or a special challenge, contact ${CONTACT_EMAIL}.`,
        ],
      },
    ],
  },
  pt: {
    backToHome: 'Voltar ao inicio',
    eyebrow: 'Termos e condições',
    title: 'Desafios especiais de escrita no InkDuel.',
    intro:
      'Estes termos regulam a participacao em desafios especiais destacados dentro do InkDuel, incluindo campanhas com criadoras, mencoes publicas e premios quando aplicavel.',
    lastUpdatedLabel: 'Ultima atualizacao',
    lastUpdatedValue: '31 de maio de 2026',
    contactLabel: 'Contato',
    contactValue: CONTACT_EMAIL,
    privacyLabel: 'Politica de privacidade',
    sections: [
      {
        title: '1. Organizador e alcance',
        paragraphs: [
          'Os desafios especiais sao organizados pelo InkDuel e, quando indicado no app, podem contar com a participacao de uma criadora, autora, marca ou convidada especial.',
          'Cada desafio pode mostrar descricao, datas, teaser da consigna, regras resumidas, premio ou reconhecimento e status de resultado dentro do app ou nesta pagina.',
          'Ao participar, voce aceita estes termos, as regras especificas visiveis no desafio e as politicas gerais do InkDuel.',
        ],
      },
      {
        title: '2. Quem pode participar',
        paragraphs: [
          'Pode participar qualquer usuario registrado do InkDuel que cumpra a idade minima e os requisitos de uso do app.',
          'A participacao pode ser limitada por idioma, pais, disponibilidade tecnica, moderacao, integridade da conta ou regras especificas da campanha.',
        ],
        bullets: [
          'E permitido apenas um intento oficial por usuario e por desafio.',
          'Nao e permitido usar varias contas para aumentar chances de selecao.',
          'O InkDuel pode excluir participacoes associadas a fraude, abuso, plagio, automacao nao autorizada ou descumprimento destes termos.',
        ],
      },
      {
        title: '3. Mecanica do desafio',
        paragraphs: [
          'Para participar, o usuario deve iniciar o desafio pelo app. Ao iniciar, a consigna completa e revelada e o tempo de escrita comeca.',
          'O primeiro piloto de desafios especiais nao consome energia, nao afeta ranking competitivo e pode conceder a experiencia normal de escrita se o fluxo vigente do InkDuel permitir.',
          'Se um usuario iniciar antes do fechamento geral, conserva sua janela completa de escrita mesmo que o fechamento ocorra durante o intento. O fechamento impede novos inicios, mas nao corta intentos ja iniciados.',
        ],
        bullets: [
          'Duracao padrao do intento: 5 minutos, salvo se o desafio indicar outra duracao.',
          'A historia deve ser enviada pelo app antes do vencimento da janela individual do intento.',
          'A participacao fica registrada oficialmente mesmo que a avaliacao ou feedback automatizado falhe, demore ou esteja desativado.',
        ],
      },
      {
        title: '4. Conteudo e originalidade',
        paragraphs: [
          'A historia enviada deve ser criada pelo participante e nao deve infringir direitos de terceiros.',
          'Nao sao permitidos conteudos ilegais, abusivos, discriminatorios, sexualmente explicitos, violentos de forma gratuita, difamatorios ou contrarios as regras da comunidade do InkDuel.',
          'O InkDuel pode moderar, ocultar, desclassificar ou remover historias quando detectar violacoes, denuncias fundamentadas ou riscos para a comunidade.',
        ],
      },
      {
        title: '5. Privacidade e publicacao',
        paragraphs: [
          'As historias enviadas a um desafio especial nao sao publicadas automaticamente na Galeria nem em visualizacoes publicas para nao participantes.',
          'Ate que haja um resultado publicado, a historia e a consigna completa ficam visiveis apenas para seu autor e para as equipes ou pessoas necessarias para operar, moderar e selecionar o desafio.',
          'Se uma historia vencer ou receber uma mencao publicada, o InkDuel podera mostrar o texto, a consigna, o nome de usuario e dados minimos associados ao resultado dentro do app, na landing ou em comunicacoes do desafio.',
        ],
      },
      {
        title: '6. Selecao de vencedor e mencoes',
        paragraphs: [
          'A selecao pode ser realizada manualmente pelo InkDuel, pela criadora convidada ou pela equipe designada para a campanha.',
          'Os criterios podem incluir criatividade, adequacao a consigna, impacto narrativo, estilo, clareza, fechamento, originalidade e cumprimento das regras.',
          'A decisao final de selecao cabe ao InkDuel ou a equipe indicada no desafio. A selecao pode ser declarada sem vencedor se nao houver participacoes validas ou elegiveis.',
        ],
      },
      {
        title: '7. Publicacao de resultados',
        paragraphs: [
          'Um resultado e considerado publicado quando o InkDuel habilita o vencedor ou as mencoes no app ou na pagina correspondente.',
          'Para o MVP, o InkDuel pode registrar internamente o identificador do duelo vencedor e o backend resolvera as informacoes necessarias para mostrar a historia vencedora, a consigna e o autor no frontend.',
          'Os participantes poderao saber do resultado pelo app, notificacoes, visualizacoes do desafio ou comunicacoes associadas a campanha.',
        ],
      },
      {
        title: '8. Feedback automatizado e IA',
        paragraphs: [
          'Alguns desafios podem oferecer feedback automatizado ou avaliacao assistida por IA como parte da experiencia de escrita.',
          'O feedback automatizado e orientativo e pode demorar, falhar ou ser desativado por controle de custos, manutencao, seguranca ou alta demanda.',
          'A elegibilidade de uma participacao nao depende do sucesso do feedback automatizado.',
        ],
      },
      {
        title: '9. Premios ou reconhecimentos',
        paragraphs: [
          'Se um desafio incluir premio, beneficio ou reconhecimento especifico, os detalhes serao informados no app, na campanha ou em comunicacoes associadas.',
          'Os premios, quando existirem, podem estar sujeitos a verificacao de identidade, disponibilidade geografica, cumprimento de requisitos, coordenacao com a pessoa vencedora e regras adicionais do desafio.',
          'Se nao houver premio especifico indicado, a participacao implica apenas reconhecimento dentro da experiencia InkDuel.',
        ],
      },
      {
        title: '10. Alteracoes, suspensao ou cancelamento',
        paragraphs: [
          'O InkDuel pode modificar datas, regras operacionais, criterios, visibilidade ou disponibilidade do desafio quando necessario por motivos tecnicos, legais, de seguranca, moderacao, fraude ou forca maior.',
          'O InkDuel tambem pode suspender ou cancelar um desafio se nao puder operar de forma justa, segura ou conforme estes termos.',
        ],
      },
      {
        title: '11. Dados pessoais',
        paragraphs: [
          `O tratamento de dados pessoais e regido pela Politica de privacidade do InkDuel, disponivel em ${PRIVACY_URL}.`,
          'Ao participar, voce autoriza o tratamento dos dados necessarios para operar o desafio, registrar sua participacao, selecionar resultados, publicar vencedores ou mencoes e comunicar novidades relacionadas.',
        ],
      },
      {
        title: '12. Contato',
        paragraphs: [
          `Para consultas sobre estes termos ou sobre um desafio especial, escreva para ${CONTACT_EMAIL}.`,
        ],
      },
    ],
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

type ChallengeTermsClientProps = {
  initialLocale: Locale;
  resolveLocaleOnClient: boolean;
};

export default function ChallengeTermsClient({
  initialLocale,
  resolveLocaleOnClient,
}: ChallengeTermsClientProps) {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const copy = copies[locale];
  const currentLanguage = useMemo(
    () => languageOptions.find((option) => option.code === locale) ?? languageOptions[0],
    [locale],
  );

  useEffect(() => {
    if (resolveLocaleOnClient) {
      setLocale(getInitialLocale());
    }
  }, [resolveLocaleOnClient]);

  useEffect(() => {
    document.documentElement.lang = locale;
    window.localStorage.setItem('inkduel-locale', locale);
  }, [locale]);

  return (
    <main className="policy-page">
      <div className="mesh-bg">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>

      <section className="policy-shell">
        <div className="policy-topbar">
          <a className="policy-backlink" href={withLocalePath('/', locale)}>
            {copy.backToHome}
          </a>

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
        </div>

        <header className="policy-hero">
          <span className="policy-eyebrow">{copy.eyebrow}</span>
          <h1>{copy.title}</h1>
          <p>{copy.intro}</p>

          <div className="policy-meta">
            <div className="policy-meta-card">
              <span>{copy.lastUpdatedLabel}</span>
              <strong>{copy.lastUpdatedValue}</strong>
            </div>
            <div className="policy-meta-card">
              <span>{copy.contactLabel}</span>
              <a href={`mailto:${copy.contactValue}`}>{copy.contactValue}</a>
            </div>
          </div>
        </header>

        <div className="policy-content">
          {copy.sections.map((section) => (
            <section key={section.title} className="policy-section">
              <h2>{section.title}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {section.bullets ? (
                <ul>
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}

          <section className="policy-section">
            <h2>{copy.privacyLabel}</h2>
            <p>
              <a href={withLocalePath('/privacy', locale)}>{PRIVACY_URL}</a>
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
