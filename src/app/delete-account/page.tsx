'use client';

import { type LegalCopy, LegalPage } from '@/components/legal/legal-page';
import type { Locale } from '@/lib/i18n';

const CONTACT_EMAIL = 'inkduel.app@gmail.com';
const PRIVACY_URL = 'https://inkduel.com/privacy';
const DELETE_ACCOUNT_URL = 'https://inkduel.com/delete-account';

const copies: Record<Locale, LegalCopy> = {
  es: {
    backToHome: 'Volver al inicio',
    eyebrow: 'Eliminación de cuenta',
    title: 'Cómo solicitar la eliminación de tu cuenta y tus datos en InkDuel.',
    intro:
      'Si quieres solicitar la eliminación de tu cuenta o de tus datos, puedes hacerlo desde la app o a través de nuestro canal web por correo electrónico.',
    lastUpdatedLabel: 'Última actualización',
    lastUpdatedValue: '24 de abril de 2026',
    contactLabel: 'Contacto de privacidad',
    contactValue: CONTACT_EMAIL,
    sections: [
      {
        title: '1. Eliminar tu cuenta desde la app',
        paragraphs: [
          'Si todavía tienes acceso a InkDuel, la forma principal de iniciar una solicitud de eliminación es desde la propia app.',
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
          `Si no puedes acceder a la app o prefieres otro canal, puedes escribirnos a ${CONTACT_EMAIL}.`,
          'Para ayudarnos a localizar tu cuenta y procesar la solicitud, incluye en el mensaje la mayor cantidad posible de información asociada a ella.',
        ],
        bullets: [
          'El correo electrónico vinculado a la cuenta.',
          'Tu nombre de usuario en InkDuel.',
          'El idioma o país aproximado de uso.',
          'La indicación de si deseas eliminar la cuenta completa o también solicitar la eliminación de datos asociados, en la medida aplicable.',
        ],
      },
      {
        title: '3. Verificación y procesamiento',
        paragraphs: [
          'Podremos solicitar información adicional para verificar la titularidad de la cuenta antes de procesar la solicitud.',
          'Cuando procesemos una solicitud válida, podremos eliminar o anonimizar la información asociada, salvo aquellos datos que debamos conservar por razones legales, de seguridad, prevención de fraude o integridad del servicio.',
        ],
      },
      {
        title: '4. Qué puede conservarse de forma limitada',
        paragraphs: [
          'En algunos casos, ciertos registros vinculados a duelos, rankings, reportes, seguridad o prevención de abuso podrían conservarse de forma limitada o anonimizada para preservar la integridad del servicio y cumplir obligaciones legales.',
        ],
      },
      {
        title: '5. Tiempo de gestión',
        paragraphs: [
          'Intentaremos revisar y responder las solicitudes en un plazo razonable. Si necesitamos verificar identidad o pedir información adicional para procesar el pedido, te lo haremos saber por el mismo canal.',
        ],
      },
      {
        title: '6. Enlaces útiles',
        paragraphs: [
          'Puedes usar este recurso web para iniciar una solicitud de eliminación sin necesidad de reinstalar la app.',
        ],
        bullets: [
          `Canal web de eliminación de cuenta: ${DELETE_ACCOUNT_URL}`,
          `Política de privacidad: ${PRIVACY_URL}`,
        ],
      },
    ],
  },
  en: {
    backToHome: 'Back to home',
    eyebrow: 'Account deletion',
    title: 'How to request deletion of your InkDuel account and data.',
    intro:
      'If you want to request deletion of your account or data, you can do it from the app or through our web channel by email.',
    lastUpdatedLabel: 'Last updated',
    lastUpdatedValue: 'April 24, 2026',
    contactLabel: 'Privacy contact',
    contactValue: CONTACT_EMAIL,
    sections: [
      {
        title: '1. Delete your account from the app',
        paragraphs: [
          'If you still have access to InkDuel, the main way to start a deletion request is from inside the app.',
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
          `If you cannot access the app or prefer another channel, you can email us at ${CONTACT_EMAIL}.`,
          'To help us locate your account and process the request, include as much account-related information as possible in your message.',
        ],
        bullets: [
          'The email address linked to the account.',
          'Your InkDuel username.',
          'Your approximate country or language of use.',
          'A note indicating whether you want to delete the full account or also request deletion of related data, where applicable.',
        ],
      },
      {
        title: '3. Verification and processing',
        paragraphs: [
          'We may request additional information to verify account ownership before processing your request.',
          'When we process a valid request, we may delete or anonymize the associated information, except for data we must retain for legal, security, fraud-prevention, or service-integrity reasons.',
        ],
      },
      {
        title: '4. What may be retained in a limited form',
        paragraphs: [
          'In some cases, certain records linked to duels, rankings, reports, security, or abuse prevention may be retained in a limited or anonymized form to preserve service integrity and comply with legal obligations.',
        ],
      },
      {
        title: '5. Processing time',
        paragraphs: [
          'We will try to review and respond to requests within a reasonable period. If we need identity verification or additional details, we will let you know through the same channel.',
        ],
      },
      {
        title: '6. Useful links',
        paragraphs: [
          'You can use this web resource to start a deletion request without reinstalling the app.',
        ],
        bullets: [
          `Account deletion web channel: ${DELETE_ACCOUNT_URL}`,
          `Privacy policy: ${PRIVACY_URL}`,
        ],
      },
    ],
  },
  pt: {
    backToHome: 'Voltar ao inicio',
    eyebrow: 'Exclusão de conta',
    title: 'Como solicitar a exclusão da sua conta e dos seus dados no InkDuel.',
    intro:
      'Se voce quiser solicitar a exclusao da sua conta ou dos seus dados, pode fazer isso pelo app ou pelo nosso canal web por e-mail.',
    lastUpdatedLabel: 'Ultima atualizacao',
    lastUpdatedValue: '24 de abril de 2026',
    contactLabel: 'Contato de privacidade',
    contactValue: CONTACT_EMAIL,
    sections: [
      {
        title: '1. Excluir a conta pelo app',
        paragraphs: [
          'Se voce ainda tem acesso ao InkDuel, a forma principal de iniciar uma solicitacao de exclusao e pelo proprio app.',
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
          `Se voce nao conseguir acessar o app ou preferir outro canal, pode escrever para ${CONTACT_EMAIL}.`,
          'Para nos ajudar a localizar sua conta e processar a solicitacao, inclua no e-mail o maximo possivel de informacoes associadas a ela.',
        ],
        bullets: [
          'O endereco de e-mail vinculado a conta.',
          'Seu nome de usuario no InkDuel.',
          'O idioma ou pais aproximado de uso.',
          'A indicacao de se voce deseja excluir a conta completa ou tambem solicitar a exclusao de dados associados, quando aplicavel.',
        ],
      },
      {
        title: '3. Verificacao e processamento',
        paragraphs: [
          'Podemos solicitar informacoes adicionais para verificar a titularidade da conta antes de processar a solicitacao.',
          'Quando processarmos uma solicitacao valida, poderemos excluir ou anonimizar as informacoes associadas, exceto os dados que precisarmos manter por motivos legais, de seguranca, prevencao de fraude ou integridade do servico.',
        ],
      },
      {
        title: '4. O que pode ser mantido de forma limitada',
        paragraphs: [
          'Em alguns casos, certos registros vinculados a duelos, rankings, denuncias, seguranca ou prevencao de abuso podem ser mantidos de forma limitada ou anonimizada para preservar a integridade do servico e cumprir obrigacoes legais.',
        ],
      },
      {
        title: '5. Prazo de tratamento',
        paragraphs: [
          'Tentaremos revisar e responder as solicitacoes em um prazo razoavel. Se precisarmos confirmar identidade ou pedir informacoes adicionais, avisaremos pelo mesmo canal.',
        ],
      },
      {
        title: '6. Links uteis',
        paragraphs: [
          'Voce pode usar este recurso web para iniciar uma solicitacao de exclusao sem precisar reinstalar o app.',
        ],
        bullets: [
          `Canal web de exclusao de conta: ${DELETE_ACCOUNT_URL}`,
          `Politica de privacidade: ${PRIVACY_URL}`,
        ],
      },
    ],
  },
};

export default function DeleteAccountPage() {
  return <LegalPage copies={copies} />;
}
