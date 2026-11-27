import type { Locale } from '@/lib/i18n';

import type { CoverRejectReason } from './covers-ops';

// «Portadas en revisión» (web, operator only).

export type CoversOpsCopy = {
  title: string;
  lead: string;
  loading: string;
  emptyTitle: string;
  emptyBody: string;
  notFoundTitle: string;
  notFoundBody: string;
  error: string;
  retry: string;
  reload: string;
  approve: string;
  reject: string;
  rejectAs: string;
  cancel: string;
  confirmReject: string;
  working: string;
  actionError: string;
  replaces: string;
  firstCover: string;
  autoNote: string;
  imageExpired: string;
  submitted: (when: string) => string;
  reasons: Record<CoverRejectReason, string>;
};

export const COVERS_OPS_COPY: Record<Locale, CoversOpsCopy> = {
  es: {
    title: 'Portadas en revisión',
    lead: 'Las que la revisión automática no pudo decidir. Ninguna es pública hasta que la apruebes.',
    loading: 'Cargando portadas…',
    emptyTitle: 'No hay portadas pendientes',
    emptyBody: 'Cuando llegue una, te avisamos en Discord.',
    notFoundTitle: 'No encontramos esta página',
    notFoundBody: 'Revisa el enlace o vuelve al inicio.',
    error: 'No pudimos cargar la cola.',
    retry: 'Reintentar',
    reload: 'Actualizar',
    approve: 'Aprobar',
    reject: 'Rechazar',
    rejectAs: '¿Por qué la rechazas?',
    cancel: 'Cancelar',
    confirmReject: 'Rechazar portada',
    working: 'Guardando…',
    actionError: 'No se guardó. Prueba de nuevo.',
    replaces: 'Reemplaza una portada aprobada',
    firstCover: 'Primera portada de la obra',
    autoNote: 'Revisión automática',
    imageExpired: 'La imagen venció. Actualiza la cola.',
    submitted: (when) => `Enviada ${when}`,
    reasons: {
      sexual: 'Contenido sexual',
      violence: 'Violencia explícita',
      hate: 'Odio',
      personal_data: 'Datos personales',
      third_party: 'Obra o marca ajena',
      not_a_cover: 'No es una portada',
    },
  },
  en: {
    title: 'Covers under review',
    lead: "The ones the automatic check couldn't decide. None is public until you approve it.",
    loading: 'Loading covers…',
    emptyTitle: 'No covers waiting',
    emptyBody: "When one arrives, we'll let you know on Discord.",
    notFoundTitle: "We couldn't find this page",
    notFoundBody: 'Check the link or go back home.',
    error: "We couldn't load the queue.",
    retry: 'Try again',
    reload: 'Refresh',
    approve: 'Approve',
    reject: 'Reject',
    rejectAs: 'Why are you rejecting it?',
    cancel: 'Cancel',
    confirmReject: 'Reject cover',
    working: 'Saving…',
    actionError: "It wasn't saved. Try again.",
    replaces: 'Replaces an approved cover',
    firstCover: "The work's first cover",
    autoNote: 'Automatic check',
    imageExpired: 'The image expired. Refresh the queue.',
    submitted: (when) => `Sent ${when}`,
    reasons: {
      sexual: 'Sexual content',
      violence: 'Graphic violence',
      hate: 'Hate',
      personal_data: 'Personal data',
      third_party: "Someone else's work or brand",
      not_a_cover: 'Not a cover',
    },
  },
  pt: {
    title: 'Capas em análise',
    lead: 'As que a análise automática não conseguiu decidir. Nenhuma é pública até você aprovar.',
    loading: 'Carregando capas…',
    emptyTitle: 'Nenhuma capa pendente',
    emptyBody: 'Quando chegar uma, avisamos no Discord.',
    notFoundTitle: 'Não encontramos esta página',
    notFoundBody: 'Confira o link ou volte ao início.',
    error: 'Não conseguimos carregar a fila.',
    retry: 'Tentar de novo',
    reload: 'Atualizar',
    approve: 'Aprovar',
    reject: 'Recusar',
    rejectAs: 'Por que você a recusa?',
    cancel: 'Cancelar',
    confirmReject: 'Recusar capa',
    working: 'Salvando…',
    actionError: 'Não foi salvo. Tente de novo.',
    replaces: 'Substitui uma capa aprovada',
    firstCover: 'Primeira capa da obra',
    autoNote: 'Análise automática',
    imageExpired: 'A imagem expirou. Atualize a fila.',
    submitted: (when) => `Enviada ${when}`,
    reasons: {
      sexual: 'Conteúdo sexual',
      violence: 'Violência explícita',
      hate: 'Ódio',
      personal_data: 'Dados pessoais',
      third_party: 'Obra ou marca de outra pessoa',
      not_a_cover: 'Não é uma capa',
    },
  },
};
