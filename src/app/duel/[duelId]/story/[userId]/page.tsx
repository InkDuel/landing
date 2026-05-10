import type { Metadata } from "next";

const API_BASE = "https://inkduel-backend-production.up.railway.app";

type PublicDuelStory = {
  duelId: string;
  prompt: string;
  text: string;
  textExcerpt: string;
  author: {
    id: string;
    username: string;
    avatar: string;
  };
  createdAt: string;
};

async function fetchDuelStory(
  duelId: string,
  userId: string
): Promise<PublicDuelStory | null> {
  try {
    const res = await fetch(
      `${API_BASE}/public/duels/${duelId}/story/${userId}`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

type Props = {
  params: Promise<{ duelId: string; userId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { duelId, userId } = await params;
  const data = await fetchDuelStory(duelId, userId);
  if (!data) {
    return { title: "Relato no encontrado — InkDuel" };
  }
  const excerpt =
    data.textExcerpt.length > 160
      ? data.textExcerpt.slice(0, 160) + "…"
      : data.textExcerpt;
  return {
    title: `${data.author.username} en InkDuel — Duelo`,
    description: excerpt,
    openGraph: {
      title: `Relato de @${data.author.username} en InkDuel`,
      description: excerpt,
      type: "article",
      url: `https://inkduel.com/duel/${duelId}/story/${userId}`,
    },
  };
}

export default async function DuelStoryPage({ params }: Props) {
  const { duelId, userId } = await params;
  const data = await fetchDuelStory(duelId, userId);

  if (!data) {
    return (
      <main className="public-page">
        <div className="public-card">
          <h1 className="public-title">Relato no encontrado</h1>
          <p className="public-subtitle">
            Este relato no existe o el duelo aún no terminó.
          </p>
          <a href="https://inkduel.com" className="public-cta">
            Ir a InkDuel
          </a>
        </div>
      </main>
    );
  }

  const date = new Date(data.createdAt).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <main className="public-page">
      <div className="public-card public-card--story">
        {/* Prompt */}
        <div className="public-duel-prompt">
          <span className="public-duel-prompt-label">Prompt del duelo</span>
          <p className="public-duel-prompt-text">{data.prompt}</p>
        </div>

        {/* Header */}
        <div className="public-story-header">
          <p className="public-story-byline">
            por <strong>@{data.author.username}</strong> · {date}
          </p>
        </div>

        {/* Story text */}
        <div className="public-story-content">
          <p>{data.text}</p>
        </div>

        {/* CTAs */}
        <a
          href={`inkduel://duel/result/${duelId}`}
          className="public-cta"
        >
          Ver resultado en InkDuel
        </a>
        <a href="https://inkduel.com" className="public-cta-secondary">
          Escribir mi primer duelo
        </a>
      </div>
    </main>
  );
}
