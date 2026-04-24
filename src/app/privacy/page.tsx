'use client';

import { useEffect, useMemo, useState } from 'react';

type Locale = 'es' | 'en' | 'pt';

type PolicyCopy = {
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

const copies: Record<Locale, PolicyCopy> = {
  es: {
    backToHome: 'Volver al inicio',
    eyebrow: 'Politica de privacidad',
    title: 'Como InkDuel recopila, usa y protege tus datos.',
    intro:
      'Esta politica explica que datos podemos tratar cuando usas InkDuel, por que los tratamos y que opciones tienes sobre tu informacion.',
    lastUpdatedLabel: 'Ultima actualizacion',
    lastUpdatedValue: '23 de abril de 2026',
    contactLabel: 'Contacto de privacidad',
    contactValue: 'privacy@inkduel.com',
    sections: [
      {
        title: '1. Quien es responsable de InkDuel',
        paragraphs: [
          'InkDuel es una plataforma para retos y duelos de escritura. Esta politica se aplica al sitio web, a la app movil y a los servicios relacionados publicados bajo la marca InkDuel.',
          'Si utilizas InkDuel, aceptas que tratemos tu informacion segun lo descrito en esta politica y en la normativa aplicable en tu jurisdiccion.',
        ],
      },
      {
        title: '2. Que informacion podemos recopilar',
        paragraphs: [
          'La informacion que tratamos depende de como uses InkDuel y de las funciones que tengas activadas.',
        ],
        bullets: [
          'Datos de cuenta, como correo electronico, identificadores de autenticacion y proveedor de inicio de sesion.',
          'Datos de perfil, como nombre de usuario, idioma preferido, biografia u otra informacion que decidas completar.',
          'Contenido generado dentro de la app, como relatos, respuestas a prompts, resultados de duelos y reportes enviados por usuarios.',
          'Datos tecnicos y de uso, como identificadores de dispositivo, registros basicos de actividad, informacion de errores y configuraciones generales de la app.',
          'Datos de notificaciones, como el token necesario para enviarte avisos sobre resultados o actividad relevante.',
        ],
      },
      {
        title: '3. Como usamos tu informacion',
        paragraphs: [
          'Usamos la informacion para operar InkDuel, permitir el acceso a tu cuenta y ofrecer las funciones principales del producto.',
        ],
        bullets: [
          'Crear y mantener tu cuenta.',
          'Emparejar duelos, mostrar resultados y guardar tu progreso.',
          'Personalizar idioma, experiencia y configuraciones.',
          'Enviar comunicaciones operativas, incluidas notificaciones relacionadas con la actividad de la app.',
          'Prevenir fraude, abuso, accesos no autorizados y otros usos indebidos.',
          'Analizar fallos, mejorar estabilidad y desarrollar nuevas funciones.',
        ],
      },
      {
        title: '4. Cuando compartimos informacion',
        paragraphs: [
          'No vendemos tus datos personales. Podemos compartir informacion solo en los supuestos necesarios para prestar el servicio o cumplir obligaciones legales.',
        ],
        bullets: [
          'Con proveedores de infraestructura y autenticacion que nos ayudan a operar InkDuel, como servicios de Firebase, Google Cloud o proveedores de inicio de sesion.',
          'Con proveedores que intervienen en notificaciones, almacenamiento seguro, analitica basica o soporte tecnico.',
          'Cuando exista una obligacion legal, requerimiento valido de autoridad o necesidad de proteger derechos, seguridad y funcionamiento de InkDuel.',
          'Como parte de una reorganizacion, fusion o transferencia del negocio, si eso llegara a ocurrir.',
        ],
      },
      {
        title: '5. Conservacion y eliminacion de datos',
        paragraphs: [
          'Conservamos la informacion durante el tiempo necesario para operar InkDuel, mantener la seguridad del servicio y cumplir obligaciones legales o de prevencion de fraude.',
          'Si solicitas eliminar tu cuenta desde la app o a traves de nuestros canales de privacidad, eliminaremos o anonimizaremos la informacion asociada, salvo cuando debamos conservar ciertos datos por motivos legales, de seguridad o defensa frente a abusos.',
          'La opcion de eliminacion de cuenta dentro de la app es el canal principal para iniciar este proceso. Tambien puedes escribir a privacy@inkduel.com.',
        ],
      },
      {
        title: '6. Tus opciones y derechos',
        paragraphs: [
          'Segun tu pais o region, puedes tener derecho a acceder, corregir, eliminar u oponerte a determinados tratamientos de datos personales.',
          'Tambien puedes actualizar parte de tu informacion desde la propia app, como idioma, ajustes del perfil y solicitud de eliminacion de cuenta.',
        ],
      },
      {
        title: '7. Seguridad',
        paragraphs: [
          'Aplicamos medidas tecnicas y organizativas razonables para proteger la informacion contra acceso no autorizado, perdida, alteracion o divulgacion indebida.',
          'Aun asi, ningun sistema es completamente infalible, por lo que no podemos garantizar seguridad absoluta.',
        ],
      },
      {
        title: '8. Transferencias internacionales',
        paragraphs: [
          'Algunos de nuestros proveedores pueden procesar informacion en distintos paises. Cuando eso ocurre, adoptamos medidas razonables para que la transferencia y el tratamiento mantengan un nivel adecuado de proteccion.',
        ],
      },
      {
        title: '9. Cambios en esta politica',
        paragraphs: [
          'Podemos actualizar esta politica cuando cambien nuestras practicas, el producto o los requisitos legales. Publicaremos la version vigente en esta misma pagina e indicaremos la fecha de ultima actualizacion.',
        ],
      },
    ],
  },
  en: {
    backToHome: 'Back to home',
    eyebrow: 'Privacy Policy',
    title: 'How InkDuel collects, uses, and protects your data.',
    intro:
      'This policy explains what data we may process when you use InkDuel, why we process it, and what choices you have over your information.',
    lastUpdatedLabel: 'Last updated',
    lastUpdatedValue: 'April 23, 2026',
    contactLabel: 'Privacy contact',
    contactValue: 'privacy@inkduel.com',
    sections: [
      {
        title: '1. Who is responsible for InkDuel',
        paragraphs: [
          'InkDuel is a platform for writing challenges and duels. This policy applies to the website, the mobile app, and related services published under the InkDuel brand.',
          'If you use InkDuel, you agree that we may process your information as described in this policy and under the laws that apply in your jurisdiction.',
        ],
      },
      {
        title: '2. What information we may collect',
        paragraphs: [
          'The information we process depends on how you use InkDuel and which features you enable.',
        ],
        bullets: [
          'Account data, such as email address, authentication identifiers, and sign-in provider.',
          'Profile data, such as username, preferred language, bio, or any other information you choose to complete.',
          'Content generated inside the app, such as stories, prompt responses, duel results, and reports submitted by users.',
          'Technical and usage data, such as device identifiers, basic activity logs, crash information, and general app settings.',
          'Notification data, such as the token needed to send you results or other relevant app activity updates.',
        ],
      },
      {
        title: '3. How we use your information',
        paragraphs: [
          'We use information to operate InkDuel, give you access to your account, and provide the core product experience.',
        ],
        bullets: [
          'Create and maintain your account.',
          'Match duels, show results, and store your progress.',
          'Personalize language, experience, and settings.',
          'Send operational communications, including notifications related to app activity.',
          'Prevent fraud, abuse, unauthorized access, and other misuse.',
          'Analyze failures, improve stability, and develop new features.',
        ],
      },
      {
        title: '4. When we share information',
        paragraphs: [
          'We do not sell your personal data. We may share information only when needed to provide the service or comply with legal obligations.',
        ],
        bullets: [
          'With infrastructure and authentication providers that help us operate InkDuel, such as Firebase services, Google Cloud, or sign-in providers.',
          'With providers involved in notifications, secure storage, basic analytics, or technical support.',
          'When required by law, a valid authority request, or a need to protect rights, safety, and the operation of InkDuel.',
          'As part of a reorganization, merger, or transfer of the business, if that ever occurs.',
        ],
      },
      {
        title: '5. Data retention and deletion',
        paragraphs: [
          'We keep information for as long as needed to operate InkDuel, maintain service security, and comply with legal obligations or fraud-prevention needs.',
          'If you request deletion of your account from inside the app or through our privacy channels, we will delete or anonymize the associated information unless we must keep certain data for legal, security, or abuse-prevention reasons.',
          'The in-app account deletion option is the main way to start this process. You can also contact privacy@inkduel.com.',
        ],
      },
      {
        title: '6. Your choices and rights',
        paragraphs: [
          'Depending on your country or region, you may have rights to access, correct, delete, or object to certain processing of personal data.',
          'You can also update part of your information directly in the app, including language, profile settings, and account deletion requests.',
        ],
      },
      {
        title: '7. Security',
        paragraphs: [
          'We apply reasonable technical and organizational measures to protect information against unauthorized access, loss, alteration, or improper disclosure.',
          'Even so, no system is completely fail-safe, and we cannot guarantee absolute security.',
        ],
      },
      {
        title: '8. International transfers',
        paragraphs: [
          'Some of our providers may process information in different countries. When that happens, we take reasonable steps to ensure the transfer and processing maintain an appropriate level of protection.',
        ],
      },
      {
        title: '9. Changes to this policy',
        paragraphs: [
          'We may update this policy when our practices, product, or legal requirements change. We will publish the current version on this page and indicate the latest update date.',
        ],
      },
    ],
  },
  pt: {
    backToHome: 'Voltar ao inicio',
    eyebrow: 'Politica de Privacidade',
    title: 'Como o InkDuel coleta, usa e protege os seus dados.',
    intro:
      'Esta politica explica quais dados podemos tratar quando voce usa o InkDuel, por que tratamos esses dados e quais escolhas voce tem sobre as suas informacoes.',
    lastUpdatedLabel: 'Ultima atualizacao',
    lastUpdatedValue: '23 de abril de 2026',
    contactLabel: 'Contato de privacidade',
    contactValue: 'privacy@inkduel.com',
    sections: [
      {
        title: '1. Quem e responsavel pelo InkDuel',
        paragraphs: [
          'InkDuel e uma plataforma para desafios e duelos de escrita. Esta politica se aplica ao site, ao aplicativo movel e aos servicos relacionados publicados sob a marca InkDuel.',
          'Ao usar o InkDuel, voce concorda que podemos tratar as suas informacoes conforme descrito nesta politica e de acordo com a legislacao aplicavel na sua jurisdicao.',
        ],
      },
      {
        title: '2. Quais informacoes podemos coletar',
        paragraphs: [
          'As informacoes tratadas dependem de como voce usa o InkDuel e das funcoes que estiverem ativas.',
        ],
        bullets: [
          'Dados da conta, como endereco de e-mail, identificadores de autenticacao e provedor de login.',
          'Dados de perfil, como nome de usuario, idioma preferido, biografia ou qualquer outra informacao que voce decidir preencher.',
          'Conteudo gerado dentro do app, como historias, respostas a prompts, resultados de duelos e denuncias enviadas por usuarios.',
          'Dados tecnicos e de uso, como identificadores do dispositivo, registros basicos de atividade, informacoes de falhas e configuracoes gerais do app.',
          'Dados de notificacoes, como o token necessario para enviar avisos sobre resultados ou atividade relevante do app.',
        ],
      },
      {
        title: '3. Como usamos as suas informacoes',
        paragraphs: [
          'Usamos as informacoes para operar o InkDuel, permitir o acesso a sua conta e oferecer a experiencia principal do produto.',
        ],
        bullets: [
          'Criar e manter a sua conta.',
          'Fazer o pareamento de duelos, mostrar resultados e armazenar o seu progresso.',
          'Personalizar idioma, experiencia e configuracoes.',
          'Enviar comunicacoes operacionais, incluindo notificacoes relacionadas a atividade do app.',
          'Prevenir fraude, abuso, acesso nao autorizado e outros usos indevidos.',
          'Analisar falhas, melhorar a estabilidade e desenvolver novos recursos.',
        ],
      },
      {
        title: '4. Quando compartilhamos informacoes',
        paragraphs: [
          'Nao vendemos os seus dados pessoais. Podemos compartilhar informacoes apenas quando isso for necessario para prestar o servico ou cumprir obrigacoes legais.',
        ],
        bullets: [
          'Com provedores de infraestrutura e autenticacao que ajudam a operar o InkDuel, como servicos do Firebase, Google Cloud ou provedores de login.',
          'Com provedores envolvidos em notificacoes, armazenamento seguro, analise basica ou suporte tecnico.',
          'Quando houver exigencia legal, solicitacao valida de autoridade ou necessidade de proteger direitos, seguranca e funcionamento do InkDuel.',
          'Como parte de uma reorganizacao, fusao ou transferencia do negocio, caso isso venha a acontecer.',
        ],
      },
      {
        title: '5. Retencao e exclusao de dados',
        paragraphs: [
          'Mantemos as informacoes pelo tempo necessario para operar o InkDuel, preservar a seguranca do servico e cumprir obrigacoes legais ou necessidades de prevencao a fraude.',
          'Se voce solicitar a exclusao da conta dentro do app ou pelos nossos canais de privacidade, excluiremos ou anonimizaremos as informacoes associadas, salvo quando precisarmos manter certos dados por motivos legais, de seguranca ou prevencao de abuso.',
          'A opcao de exclusao de conta dentro do app e a principal forma de iniciar esse processo. Voce tambem pode entrar em contato por privacy@inkduel.com.',
        ],
      },
      {
        title: '6. Suas escolhas e direitos',
        paragraphs: [
          'Dependendo do seu pais ou regiao, voce pode ter direitos de acesso, correcao, exclusao ou oposicao a determinados tratamentos de dados pessoais.',
          'Voce tambem pode atualizar parte das suas informacoes diretamente no app, incluindo idioma, configuracoes de perfil e solicitacao de exclusao da conta.',
        ],
      },
      {
        title: '7. Seguranca',
        paragraphs: [
          'Aplicamos medidas tecnicas e organizacionais razoaveis para proteger as informacoes contra acesso nao autorizado, perda, alteracao ou divulgacao indevida.',
          'Ainda assim, nenhum sistema e completamente infalivel, e nao podemos garantir seguranca absoluta.',
        ],
      },
      {
        title: '8. Transferencias internacionais',
        paragraphs: [
          'Alguns dos nossos provedores podem processar informacoes em diferentes paises. Quando isso acontece, adotamos medidas razoaveis para que a transferencia e o tratamento mantenham um nivel adequado de protecao.',
        ],
      },
      {
        title: '9. Alteracoes nesta politica',
        paragraphs: [
          'Podemos atualizar esta politica quando as nossas praticas, o produto ou os requisitos legais mudarem. Publicaremos a versao vigente nesta mesma pagina e indicaremos a data da ultima atualizacao.',
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

export default function PrivacyPage() {
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
          <a className="policy-backlink" href={`/?lang=${locale}`}>
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
