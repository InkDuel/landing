'use client';

import { useEffect, useMemo, useState } from 'react';

type Locale = 'es' | 'en' | 'pt';

type PolicySection = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
  cta?: {
    href: string;
    label: string;
  };
};

type PolicyCopy = {
  backToHome: string;
  eyebrow: string;
  title: string;
  intro: string;
  lastUpdatedLabel: string;
  lastUpdatedValue: string;
  contactLabel: string;
  contactValue: string;
  sections: PolicySection[];
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

const copies: Record<Locale, PolicyCopy> = {
  es: {
    backToHome: 'Volver al inicio',
    eyebrow: 'Política de privacidad',
    title: 'Cómo InkDuel recopila, usa y protege tus datos.',
    intro:
      'Esta política explica qué datos podemos tratar cuando usas InkDuel, por qué los tratamos y qué opciones tienes sobre tu información.',
    lastUpdatedLabel: 'Última actualización',
    lastUpdatedValue: '24 de abril de 2026',
    contactLabel: 'Contacto de privacidad',
    contactValue: 'privacy@inkduel.com',
    sections: [
      {
        title: '1. Quién es responsable de InkDuel',
        paragraphs: [
          'InkDuel es una app móvil y una plataforma digital para retos y duelos de escritura. Esta política se aplica al sitio web, a la app móvil y a los servicios relacionados publicados bajo la marca InkDuel.',
          'El objetivo de InkDuel es ayudar a los usuarios a desarrollar sus habilidades como escritores mediante retos creativos, retroalimentación y progreso visible. El tratamiento de datos está orientado a sostener y mejorar esa experiencia.',
          'Al usar InkDuel, trataremos tu información según lo descrito en esta política y conforme a la normativa aplicable en tu jurisdicción.',
        ],
      },
      {
        title: '2. Qué información podemos recopilar',
        paragraphs: [
          'La información que tratamos depende de cómo uses InkDuel y de las funciones que tengas activadas.',
        ],
        bullets: [
          'Datos de cuenta, como correo electrónico, identificadores de autenticación y proveedor de inicio de sesión.',
          'Datos de perfil, como nombre de usuario, idioma preferido, biografía, foto u otra información que decidas completar.',
          'Datos de uso y actividad, como historial básico de interacción, participación en duelos, votos, rankings, resultados y preferencias dentro de la app.',
          'Datos técnicos, como identificadores de dispositivo, registros básicos de actividad, información de errores, rendimiento, versión de la app y configuraciones generales.',
          'Datos de notificaciones, como el token necesario para enviarte avisos sobre resultados, actividad relevante o mensajes operativos.',
        ],
      },
      {
        title: '3. Contenido generado por los usuarios',
        paragraphs: [
          'El contenido generado por los usuarios, como relatos, respuestas a consignas, votos, resultados de duelos, estadísticas y reportes, puede ser tratado para operar las funcionalidades principales de InkDuel, incluyendo la participación en duelos, la evaluación de resultados, la generación de retroalimentación, la prevención de abusos y la mejora de la experiencia creativa.',
          'InkDuel no reclama la titularidad sobre los relatos o textos que los usuarios crean dentro de la plataforma. Sin embargo, al usar el servicio, el usuario nos autoriza a procesar, mostrar, almacenar y organizar dicho contenido en la medida necesaria para prestar las funciones de la app.',
        ],
      },
      {
        title: '4. Cómo usamos tu información',
        paragraphs: [
          'Usamos la información para operar InkDuel, permitir el acceso a tu cuenta y ofrecer las funciones principales del producto.',
          'Algunas funciones de InkDuel pueden utilizar procesos automatizados para analizar contenido, comparar relatos, calcular resultados de duelos, generar retroalimentación y mantener una experiencia justa y dinámica. Estos procesos se utilizan para operar el producto y ayudar a los usuarios a desarrollar sus habilidades como escritores.',
          'Los resultados de los duelos pueden generarse total o parcialmente mediante procesos automatizados. Estos resultados forman parte de la experiencia competitiva de InkDuel y no producen efectos legales sobre los usuarios.',
          'También podemos utilizar información de forma agregada o anonimizada para analizar el funcionamiento de InkDuel, mejorar la calidad de los duelos, detectar errores, prevenir abusos y desarrollar nuevas funcionalidades.',
        ],
        bullets: [
          'Crear y mantener tu cuenta.',
          'Emparejar duelos, mostrar resultados, rankings y guardar tu progreso.',
          'Personalizar idioma, experiencia, consignas, configuraciones y visibilidad del perfil.',
          'Enviar comunicaciones operativas, incluidas notificaciones relacionadas con la actividad de la app.',
          'Generar evaluaciones, recomendaciones y resultados dentro de la experiencia de InkDuel.',
          'Prevenir fraude, abuso, accesos no autorizados y otros usos indebidos.',
          'Utilizar herramientas de analítica básica, monitoreo de errores y rendimiento para entender cómo se usa la app, detectar fallos técnicos y mejorar la estabilidad del servicio.',
        ],
      },
      {
        title: '5. Qué información puede ser visible para otros usuarios',
        paragraphs: [
          'Algunas funciones de InkDuel implican que cierta información sea visible para otros usuarios, como nombre de usuario, perfil público, relatos publicados, participación en duelos, resultados, rankings, votos o estadísticas asociadas a la actividad dentro de la plataforma.',
          'La visibilidad concreta puede depender de la configuración del producto, de la naturaleza pública o competitiva de determinadas funciones y de los ajustes de privacidad que ofrezca la app en cada momento.',
        ],
      },
      {
        title: '6. Cuándo compartimos información',
        paragraphs: [
          'No vendemos tus datos personales. Podemos compartir información solo en los supuestos necesarios para prestar el servicio, operar funciones específicas o cumplir obligaciones legales.',
          'Para operar ciertas funciones, InkDuel puede procesar contenido mediante sistemas automatizados propios o de proveedores externos. Esto puede incluir el análisis de relatos, comparación de respuestas, generación de retroalimentación, detección de abuso y cálculo de resultados de duelos.',
          'Podemos revisar contenido, reportes o actividad de usuarios cuando sea necesario para moderar la plataforma, investigar abusos o hacer cumplir nuestras reglas.',
        ],
        bullets: [
          'Con proveedores de infraestructura y autenticación que nos ayudan a operar InkDuel, como Firebase, Google Cloud y proveedores de inicio de sesión.',
          'Con proveedores que intervienen en notificaciones, almacenamiento seguro, analítica básica, monitoreo de errores, rendimiento o soporte técnico.',
          'Con proveedores externos de procesamiento automatizado, cuando sea necesario para operar funciones del producto.',
          'Cuando exista una obligación legal, un requerimiento válido de autoridad o una necesidad razonable de proteger derechos, seguridad y funcionamiento de InkDuel, de sus usuarios o de terceros.',
          'Como parte de una reorganización, fusión o transferencia del negocio, si eso llegara a ocurrir.',
        ],
      },
      {
        title: '7. Edad mínima',
        paragraphs: [
          'InkDuel no está dirigida a menores de 13 años ni a personas que no alcancen la edad mínima requerida para consentir el tratamiento de datos personales en su jurisdicción.',
          'Si detectamos que recopilamos información de un menor sin el consentimiento correspondiente, tomaremos medidas razonables para eliminarla.',
        ],
      },
      {
        title: '8. Conservación y eliminación de datos',
        paragraphs: [
          'Conservamos la información durante el tiempo necesario para operar InkDuel, mantener la seguridad del servicio y cumplir obligaciones legales o de prevención de fraude.',
          'Si solicitas eliminar tu cuenta desde la app o a través de nuestros canales de privacidad, eliminaremos o anonimizaremos la información asociada, salvo cuando debamos conservar ciertos datos por motivos legales, de seguridad o defensa frente a abusos.',
          'Cuando una cuenta sea eliminada, podremos eliminar o anonimizar la información asociada. En algunos casos, ciertos registros vinculados a duelos, rankings, reportes, seguridad o prevención de abuso podrían conservarse de forma limitada o anonimizada para preservar la integridad del servicio.',
          'También puedes solicitar la eliminación de tu cuenta o datos desde nuestro canal web: https://inkduel.com/delete-account',
        ],
        cta: {
          href: '/delete-account',
          label: 'Solicitar eliminación de cuenta o datos',
        },
      },
      {
        title: '9. Tus opciones y derechos',
        paragraphs: [
          'Según tu país o región, puedes tener derecho a acceder, corregir, eliminar u oponerte a determinados tratamientos de datos personales.',
          'También puedes actualizar parte de tu información desde la propia app, como idioma, ajustes del perfil y solicitud de eliminación de cuenta.',
        ],
      },
      {
        title: '10. Seguridad',
        paragraphs: [
          'Aplicamos medidas técnicas y organizativas razonables para proteger la información contra acceso no autorizado, pérdida, alteración o divulgación indebida.',
          'Aun así, ningún sistema es completamente infalible, por lo que no podemos garantizar seguridad absoluta.',
        ],
      },
      {
        title: '11. Transferencias internacionales',
        paragraphs: [
          'Algunos de nuestros proveedores pueden procesar información en distintos países. Cuando eso ocurre, adoptamos medidas razonables para que la transferencia y el tratamiento mantengan un nivel adecuado de protección.',
        ],
      },
      {
        title: '12. Cambios en esta política',
        paragraphs: [
          'Podemos actualizar esta política cuando cambien nuestras prácticas, el producto o los requisitos legales. Publicaremos la versión vigente en esta misma página e indicaremos la fecha de última actualización.',
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
    lastUpdatedValue: 'April 24, 2026',
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
    lastUpdatedValue: '24 de abril de 2026',
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
              {section.cta ? (
                <p>
                  <a href={withLocalePath(section.cta.href, locale)}>{section.cta.label}</a>
                </p>
              ) : null}
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}
