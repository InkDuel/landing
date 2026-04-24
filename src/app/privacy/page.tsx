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

const CONTACT_EMAIL = 'inkduel.app@gmail.com';
const PRIVACY_URL = 'https://inkduel.com/privacy';
const DELETE_ACCOUNT_URL = 'https://inkduel.com/delete-account';

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
    contactValue: CONTACT_EMAIL,
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
          `También puedes solicitar la eliminación de tu cuenta o datos desde nuestro canal web: ${DELETE_ACCOUNT_URL}`,
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
    contactValue: CONTACT_EMAIL,
    sections: [
      {
        title: '1. Who is responsible for InkDuel',
        paragraphs: [
          'InkDuel is a mobile app and digital platform for writing challenges and duels. This policy applies to the website, the mobile app, and related services published under the InkDuel brand.',
          'InkDuel is designed to help users develop their skills as writers through creative challenges, feedback, and visible progress. Our data processing is aimed at supporting and improving that experience.',
          'When you use InkDuel, we will process your information as described in this policy and in accordance with the laws that apply in your jurisdiction.',
        ],
      },
      {
        title: '2. What information we may collect',
        paragraphs: [
          'The information we process depends on how you use InkDuel and which features you enable.',
        ],
        bullets: [
          'Account data, such as email address, authentication identifiers, and sign-in provider.',
          'Profile data, such as username, preferred language, bio, photo, or any other information you choose to complete.',
          'Usage and activity data, such as basic interaction history, duel participation, votes, rankings, results, and preferences within the app.',
          'Technical data, such as device identifiers, basic activity logs, crash information, performance data, app version, and general settings.',
          'Notification data, such as the token needed to send you results, relevant activity updates, or operational messages.',
        ],
      },
      {
        title: '3. User-generated content',
        paragraphs: [
          'User-generated content, such as stories, responses to prompts, votes, duel results, statistics, and reports, may be processed in order to operate InkDuel’s core features, including duel participation, result evaluation, feedback generation, abuse prevention, and improvement of the creative experience.',
          'InkDuel does not claim ownership over the stories or texts that users create within the platform. However, by using the service, the user authorizes us to process, display, store, and organize that content to the extent necessary to provide the app’s features.',
        ],
      },
      {
        title: '4. How we use your information',
        paragraphs: [
          'We use information to operate InkDuel, give you access to your account, and provide the core product experience.',
          'Some InkDuel features may use automated processes to analyze content, compare stories, calculate duel outcomes, generate feedback, and maintain a fair and dynamic experience. These processes are used to operate the product and help users develop their writing skills.',
          'Duel results may be generated fully or partially through automated processes. These results are part of InkDuel’s competitive experience and do not produce legal effects on users.',
          'We may also use information in aggregated or anonymized form to analyze how InkDuel works, improve duel quality, detect errors, prevent abuse, and develop new features.',
        ],
        bullets: [
          'Create and maintain your account.',
          'Match duels, show results, rankings, and store your progress.',
          'Personalize language, experience, prompts, settings, and profile visibility.',
          'Send operational communications, including notifications related to app activity.',
          'Generate evaluations, recommendations, and results within the InkDuel experience.',
          'Prevent fraud, abuse, unauthorized access, and other misuse.',
          'Use basic analytics, error monitoring, and performance tools to understand app usage, detect technical issues, and improve service stability.',
        ],
      },
      {
        title: '5. What information may be visible to other users',
        paragraphs: [
          'Some InkDuel features imply that certain information may be visible to other users, such as username, public profile, published stories, duel participation, results, rankings, votes, or statistics associated with activity within the platform.',
          'The specific visibility of this information may depend on product configuration, the public or competitive nature of certain features, and the privacy settings made available by the app at any given time.',
        ],
      },
      {
        title: '6. When we share information',
        paragraphs: [
          'We do not sell your personal data. We may share information only when needed to provide the service, operate specific features, or comply with legal obligations.',
          'To operate certain features, InkDuel may process content through our own automated systems or those of external providers. This may include story analysis, response comparison, feedback generation, abuse detection, and duel result calculation.',
          'We may review content, reports, or user activity when needed to moderate the platform, investigate abuse, or enforce our rules.',
        ],
        bullets: [
          'With infrastructure and authentication providers that help us operate InkDuel, such as Firebase, Google Cloud, and sign-in providers.',
          'With providers involved in notifications, secure storage, basic analytics, error monitoring, performance, or technical support.',
          'With external automated processing providers when necessary to operate product features.',
          'When required by law, a valid authority request, or a reasonable need to protect the rights, safety, or operation of InkDuel, its users, or third parties.',
          'As part of a reorganization, merger, or transfer of the business, if that ever occurs.',
        ],
      },
      {
        title: '7. Minimum age',
        paragraphs: [
          'InkDuel is not directed to children under 13 or to people who have not reached the minimum age required to consent to personal data processing in their jurisdiction.',
          'If we detect that we have collected information from a minor without the required consent, we will take reasonable steps to delete it.',
        ],
      },
      {
        title: '8. Data retention and account deletion',
        paragraphs: [
          'We keep information for as long as needed to operate InkDuel, maintain service security, and comply with legal obligations or fraud-prevention needs.',
          'If you request deletion of your account from inside the app or through our privacy channels, we will delete or anonymize the associated information unless we must retain certain data for legal, security, or abuse-prevention reasons.',
          'When an account is deleted, we may delete or anonymize the associated information. In some cases, certain records related to duels, rankings, reports, security, or abuse prevention may be kept in a limited or anonymized form to preserve service integrity.',
          `You can also request deletion of your account or related data through our web channel: ${DELETE_ACCOUNT_URL}`,
        ],
        cta: {
          href: '/delete-account',
          label: 'Request account or data deletion',
        },
      },
      {
        title: '9. Your choices and rights',
        paragraphs: [
          'Depending on your country or region, you may have rights to access, correct, delete, or object to certain processing of personal data.',
          'You can also update part of your information directly in the app, including language, profile settings, and account deletion requests.',
        ],
      },
      {
        title: '10. Security',
        paragraphs: [
          'We apply reasonable technical and organizational measures to protect information against unauthorized access, loss, alteration, or improper disclosure.',
          'Even so, no system is completely fail-safe, and we cannot guarantee absolute security.',
        ],
      },
      {
        title: '11. International transfers',
        paragraphs: [
          'Some of our providers may process information in different countries. When that happens, we take reasonable steps to ensure that the transfer and processing maintain an appropriate level of protection.',
        ],
      },
      {
        title: '12. Changes to this policy',
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
    contactValue: CONTACT_EMAIL,
    sections: [
      {
        title: '1. Quem e responsavel pelo InkDuel',
        paragraphs: [
          'InkDuel e um app movel e uma plataforma digital para desafios e duelos de escrita. Esta politica se aplica ao site, ao app movel e aos servicos relacionados publicados sob a marca InkDuel.',
          'O objetivo do InkDuel e ajudar usuarios a desenvolver suas habilidades como escritores por meio de desafios criativos, feedback e progresso visivel. O tratamento de dados e orientado a sustentar e melhorar essa experiencia.',
          'Ao usar o InkDuel, trataremos suas informacoes conforme descrito nesta politica e de acordo com a legislacao aplicavel na sua jurisdicao.',
        ],
      },
      {
        title: '2. Quais informacoes podemos coletar',
        paragraphs: [
          'As informacoes tratadas dependem de como voce usa o InkDuel e das funcoes que estiverem ativas.',
        ],
        bullets: [
          'Dados da conta, como endereco de e-mail, identificadores de autenticacao e provedor de login.',
          'Dados de perfil, como nome de usuario, idioma preferido, biografia, foto ou qualquer outra informacao que voce decidir preencher.',
          'Dados de uso e atividade, como historico basico de interacao, participacao em duelos, votos, rankings, resultados e preferencias dentro do app.',
          'Dados tecnicos, como identificadores do dispositivo, registros basicos de atividade, informacoes de erros, desempenho, versao do app e configuracoes gerais.',
          'Dados de notificacoes, como o token necessario para enviar resultados, atividade relevante ou mensagens operacionais.',
        ],
      },
      {
        title: '3. Conteudo gerado pelos usuarios',
        paragraphs: [
          'O conteudo gerado pelos usuarios, como historias, respostas a consignas, votos, resultados de duelos, estatisticas e denuncias, pode ser tratado para operar as funcionalidades principais do InkDuel, incluindo participacao em duelos, avaliacao de resultados, geracao de feedback, prevencao de abusos e melhoria da experiencia criativa.',
          'O InkDuel nao reivindica a titularidade sobre as historias ou textos criados pelos usuarios dentro da plataforma. No entanto, ao usar o servico, o usuario nos autoriza a processar, exibir, armazenar e organizar esse conteudo na medida necessaria para prestar as funcoes do app.',
        ],
      },
      {
        title: '4. Como usamos suas informacoes',
        paragraphs: [
          'Usamos as informacoes para operar o InkDuel, permitir o acesso a sua conta e oferecer as funcoes principais do produto.',
          'Algumas funcoes do InkDuel podem usar processos automatizados para analisar conteudo, comparar historias, calcular resultados de duelos, gerar feedback e manter uma experiencia justa e dinamica. Esses processos sao usados para operar o produto e ajudar usuarios a desenvolver suas habilidades de escrita.',
          'Os resultados dos duelos podem ser gerados total ou parcialmente por processos automatizados. Esses resultados fazem parte da experiencia competitiva do InkDuel e nao produzem efeitos legais sobre os usuarios.',
          'Tambem podemos usar informacoes de forma agregada ou anonimizada para analisar como o InkDuel funciona, melhorar a qualidade dos duelos, detectar erros, prevenir abusos e desenvolver novas funcionalidades.',
        ],
        bullets: [
          'Criar e manter sua conta.',
          'Emparelhar duelos, mostrar resultados, rankings e armazenar seu progresso.',
          'Personalizar idioma, experiencia, consignas, configuracoes e visibilidade do perfil.',
          'Enviar comunicacoes operacionais, incluindo notificacoes relacionadas a atividade do app.',
          'Gerar avaliacoes, recomendacoes e resultados dentro da experiencia do InkDuel.',
          'Prevenir fraude, abuso, acesso nao autorizado e outros usos indevidos.',
          'Usar ferramentas de analise basica, monitoramento de erros e desempenho para entender o uso do app, detectar falhas tecnicas e melhorar a estabilidade do servico.',
        ],
      },
      {
        title: '5. Quais informacoes podem ser visiveis para outros usuarios',
        paragraphs: [
          'Algumas funcoes do InkDuel implicam que certas informacoes possam ser visiveis para outros usuarios, como nome de usuario, perfil publico, historias publicadas, participacao em duelos, resultados, rankings, votos ou estatisticas associadas a atividade dentro da plataforma.',
          'A visibilidade especifica dessas informacoes pode depender da configuracao do produto, da natureza publica ou competitiva de certas funcoes e das configuracoes de privacidade disponibilizadas pelo app em cada momento.',
        ],
      },
      {
        title: '6. Quando compartilhamos informacoes',
        paragraphs: [
          'Nao vendemos seus dados pessoais. Podemos compartilhar informacoes apenas quando isso for necessario para prestar o servico, operar funcoes especificas ou cumprir obrigacoes legais.',
          'Para operar certas funcoes, o InkDuel pode processar conteudo por meio de sistemas automatizados proprios ou de fornecedores externos. Isso pode incluir analise de historias, comparacao de respostas, geracao de feedback, deteccao de abuso e calculo de resultados de duelos.',
          'Podemos revisar conteudo, denuncias ou atividade de usuarios quando isso for necessario para moderar a plataforma, investigar abusos ou fazer cumprir nossas regras.',
        ],
        bullets: [
          'Com fornecedores de infraestrutura e autenticacao que ajudam a operar o InkDuel, como Firebase, Google Cloud e provedores de login.',
          'Com fornecedores envolvidos em notificacoes, armazenamento seguro, analise basica, monitoramento de erros, desempenho ou suporte tecnico.',
          'Com fornecedores externos de processamento automatizado, quando necessario para operar funcionalidades do produto.',
          'Quando houver exigencia legal, solicitacao valida de autoridade ou necessidade razoavel de proteger direitos, seguranca ou funcionamento do InkDuel, de seus usuarios ou de terceiros.',
          'Como parte de uma reorganizacao, fusao ou transferencia do negocio, caso isso venha a acontecer.',
        ],
      },
      {
        title: '7. Idade minima',
        paragraphs: [
          'O InkDuel nao e direcionado a menores de 13 anos nem a pessoas que nao tenham atingido a idade minima exigida para consentir com o tratamento de dados pessoais em sua jurisdicao.',
          'Se detectarmos que coletamos informacoes de um menor sem o consentimento necessario, tomaremos medidas razoaveis para exclui-las.',
        ],
      },
      {
        title: '8. Retencao e exclusao de dados',
        paragraphs: [
          'Mantemos as informacoes pelo tempo necessario para operar o InkDuel, preservar a seguranca do servico e cumprir obrigacoes legais ou necessidades de prevencao a fraude.',
          'Se voce solicitar a exclusao da sua conta dentro do app ou pelos nossos canais de privacidade, excluiremos ou anonimizaremos as informacoes associadas, salvo quando precisarmos manter certos dados por motivos legais, de seguranca ou prevencao de abuso.',
          'Quando uma conta for excluida, poderemos excluir ou anonimizar as informacoes associadas. Em alguns casos, certos registros vinculados a duelos, rankings, denuncias, seguranca ou prevencao de abuso podem ser mantidos de forma limitada ou anonimizada para preservar a integridade do servico.',
          `Voce tambem pode solicitar a exclusao da sua conta ou dos seus dados pelo nosso canal web: ${DELETE_ACCOUNT_URL}`,
        ],
        cta: {
          href: '/delete-account',
          label: 'Solicitar exclusao de conta ou dados',
        },
      },
      {
        title: '9. Suas escolhas e direitos',
        paragraphs: [
          'Dependendo do seu pais ou regiao, voce pode ter direitos de acessar, corrigir, excluir ou se opor a certos tratamentos de dados pessoais.',
          'Voce tambem pode atualizar parte das suas informacoes diretamente no app, incluindo idioma, configuracoes de perfil e solicitacoes de exclusao da conta.',
        ],
      },
      {
        title: '10. Seguranca',
        paragraphs: [
          'Aplicamos medidas tecnicas e organizacionais razoaveis para proteger as informacoes contra acesso nao autorizado, perda, alteracao ou divulgacao indevida.',
          'Ainda assim, nenhum sistema e totalmente infalivel, e nao podemos garantir seguranca absoluta.',
        ],
      },
      {
        title: '11. Transferencias internacionais',
        paragraphs: [
          'Alguns dos nossos fornecedores podem processar informacoes em diferentes paises. Quando isso acontece, adotamos medidas razoaveis para que a transferencia e o tratamento mantenham um nivel adequado de protecao.',
        ],
      },
      {
        title: '12. Alteracoes nesta politica',
        paragraphs: [
          'Podemos atualizar esta politica quando nossas praticas, o produto ou os requisitos legais mudarem. Publicaremos a versao vigente nesta pagina e indicaremos a data da ultima atualizacao.',
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
