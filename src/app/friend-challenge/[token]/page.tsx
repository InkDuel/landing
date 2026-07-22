import type { Metadata } from "next";

const appStoreUrl =
  "https://apps.apple.com/app/inkduel-duelos-de-escritura/id6761736355";
const googlePlayUrl =
  "https://play.google.com/store/apps/details?id=com.inkduel.app";

export const metadata: Metadata = {
  title: "Te retaron a escribir — InkDuel",
  description:
    "Abrí InkDuel para aceptar un reto privado de escritura de 5 minutos.",
};

type Props = {
  params: Promise<{ token: string }>;
};

export default async function FriendChallengePage({ params }: Props) {
  const { token } = await params;
  const appLink = `inkduel://friend-challenge/${encodeURIComponent(token)}`;

  return (
    <main className="public-page">
      <div className="public-card">
        <div className="friend-challenge-icon" aria-hidden="true">
          🤝
        </div>
        <h1 className="public-title">Te retaron a escribir</h1>
        <p className="public-subtitle">
          Abrí InkDuel para descubrir quién te retó y aceptar un duelo privado
          de escritura de 5 minutos.
        </p>

        <a href={appLink} className="public-cta">
          Abrir en InkDuel
        </a>

        <p className="friend-challenge-install-note">
          ¿Todavía no tenés la app? Instalá InkDuel y después volvé a abrir este
          enlace para aceptar el reto.
        </p>
        <div className="friend-challenge-store-links">
          <a href={appStoreUrl} target="_blank" rel="noreferrer">
            Descargar en App Store
          </a>
          <a href={googlePlayUrl} target="_blank" rel="noreferrer">
            Descargar en Google Play
          </a>
        </div>
      </div>
    </main>
  );
}
