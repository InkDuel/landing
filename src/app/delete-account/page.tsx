'use client';

import { useEffect, useMemo, useState } from 'react';

type Locale = 'es' | 'en' | 'pt';

type DeleteAccountCopy = {
  backToHome: string;
  eyebrow: string;
  title: string;
  intro: string;
  lastUpdatedLabel: string;
  lastUpdatedValue: string;
  contactLabel: string;
  contactValue: string;
  sections: {
    title: string;
    paragraphs: string[];
    bullets?: string[];
  }[];
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

const withLocalePath = (path: string, locale: Locale) => `${path}?lang=${locale}`;

const copies: Record<Locale, DeleteAccountCopy> = {
  es: {
    backToHome: 'Volver al inicio',
    eyebrow: 'Eliminación de cuenta',
    title: 'Cómo solicitar la eliminación de tu cuenta y tus datos en InkDuel.',
    intro:
      'Si quieres eliminar tu cuenta o solicitar la eliminación de tus datos, puedes hacerlo desde la app o a través de nuestros canales de privacidad.',
    lastUpdatedLabel: 'Última actualización',
    lastUpdatedValue: '24 de abril de 2026',
    contactLabel: 'Contacto de privacidad',
    contactValue: 'privacy@inkduel.com',
    sections: [
      {
        title: '1. Eliminar tu cuenta desde la app',
        paragraphs: [
          'Si todavía tienes acceso a InkDuel, la forma principal de solicitar la eliminación de tu cuenta es desde la propia app.',
        ],
        bullets: [
          'Abre InkDuel e inicia sesión.',
          'Ve a Configuración.',
          'Selecciona la opción Eliminar cuenta.',
          'Confirma la solicitud siguiendo las instrucciones que aparezcan en pantalla.',
        ],
      },
      {
        title: '2. Solicitud por correo',
        paragraphs: [
          'Si no puedes acceder a la app o prefieres hacerlo por otro canal, puedes escribirnos a privacy@inkduel.com.',
          'Para ayudarnos a localizar tu cuenta, incluye en el mensaje la mayor cantidad posible de información asociada a ella.',
        ],
        bullets: [
          'Correo electrónico de la cuenta.',
          'Nombre de usuario en InkDuel.',
          'Idioma o país aproximado de uso.',
          'Detalle de si quieres eliminar solo la cuenta o también solicitar eliminación de datos asociados, en la medida aplicable.',
        ],
      },
      {
        title: '3. Qué ocurre después de la solicitud',
        paragraphs: [
          'Cuando procesemos una solicitud válida, podremos eliminar o anonimizar la información asociada a la cuenta.',
          'En algunos casos, ciertos registros vinculados a duelos, rankings, reportes, seguridad o prevención de abuso podrían conservarse de forma limitada o anonimizada para preservar la integridad del servicio y cumplir obligaciones legales.',
        ],
      },
      {
        title: '4. Tiempo de gestión',
        paragraphs: [
          'Intentaremos revisar y responder las solicitudes en un plazo razonable. Si necesitamos verificar identidad o pedir información adicional para procesar el pedido, te lo haremos saber por el mismo canal.',
        ],
      },
      {
        title: '5. Más información',
        paragraphs: [
          'Para entender mejor cómo tratamos tus datos, consulta también nuestra Política de privacidad.',
        ],
        bullets: ['Política de privacidad: https://inkduel.com/privacy'],
      },
    ],
  },
  en: {
    backToHome: 'Back to home',
    eyebrow: 'Account deletion',
    title: 'How to request deletion of your InkDuel account and data.',
    intro:
      'If you want to delete your account or request deletion of your data, you can do it from the app or through our privacy channels.',
    lastUpdatedLabel: 'Last updated',
    lastUpdatedValue: 'April 24, 2026',
    contactLabel: 'Privacy contact',
    contactValue: 'privacy@inkduel.com',
    sections: [
      {
        title: '1. Delete your account from the app',
        paragraphs: [
          'If you still have access to InkDuel, the main way to request account deletion is from inside the app.',
        ],
        bullets: [
          'Open InkDuel and sign in.',
          'Go to Settings.',
          'Select Delete account.',
          'Confirm the request by following the on-screen instructions.',
        ],
      },
      {
        title: '2. Request by email',
        paragraphs: [
          'If you cannot access the app or prefer another channel, you can email privacy@inkduel.com.',
        ],
      },
    ],
  },
  pt: {
    backToHome: 'Voltar ao inicio',
    eyebrow: 'Exclusão de conta',
    title: 'Como solicitar a exclusão da sua conta e dos seus dados no InkDuel.',
    intro:
      'Se voce quiser excluir a sua conta ou solicitar a exclusao dos seus dados, pode fazer isso pelo app ou pelos nossos canais de privacidade.',
    lastUpdatedLabel: 'Ultima atualizacao',
    lastUpdatedValue: '24 de abril de 2026',
    contactLabel: 'Contato de privacidade',
    contactValue: 'privacy@inkduel.com',
    sections: [
      {
        title: '1. Excluir a conta pelo app',
        paragraphs: [
          'Se voce ainda tem acesso ao InkDuel, a forma principal de solicitar a exclusao da conta e pelo proprio app.',
        ],
        bullets: [
          'Abra o InkDuel e faca login.',
          'Vá para Configuracoes.',
          'Selecione Excluir conta.',
          'Confirme a solicitacao seguindo as instrucoes exibidas na tela.',
        ],
      },
      {
        title: '2. Solicitação por e-mail',
        paragraphs: [
          'Se voce nao conseguir acessar o app ou preferir outro canal, pode escrever para privacy@inkduel.com.',
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

export default function DeleteAccountPage() {
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
        </div>
      </section>
    </main>
  );
}
