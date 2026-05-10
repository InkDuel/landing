import type { Metadata } from "next";

const API_BASE = "https://inkduel-backend-production.up.railway.app";

type PublicStory = {
  id: string;
  title: string;
  contentExcerpt: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    avatar: string;
  };
  likesCount: number;
  childrenCount: number;
  rootSummary: {
    id: string;
    title: string;
    userName: string;
  };
};

async function fetchStory(storyId: string): Promise<PublicStory | null> {
  try {
    const res = await fetch(`${API_BASE}/public/stories/${storyId}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

type Props = {
  params: Promise<{ storyId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { storyId } = await params;
  const story = await fetchStory(storyId);
  if (!story) {
    return { title: "Relato no encontrado — InkDuel" };
  }
  const excerpt =
    story.contentExcerpt.length > 160
      ? story.contentExcerpt.slice(0, 160) + "…"
      : story.contentExcerpt;
  return {
    title: `${story.title} — InkDuel`,
    description: excerpt,
    openGraph: {
      title: `${story.title} — InkDuel`,
      description: excerpt,
      type: "article",
      url: `https://inkduel.com/story/${storyId}`,
    },
  };
}

export default async function StoryPage({ params }: Props) {
  const { storyId } = await params;
  const story = await fetchStory(storyId);

  if (!story) {
    return (
      <main className="public-page">
        <div className="public-card">
          <h1 className="public-title">Relato no encontrado</h1>
          <p className="public-subtitle">
            Este relato no existe o fue eliminado.
          </p>
          <a href="https://inkduel.com" className="public-cta">
            Ir a InkDuel
          </a>
        </div>
      </main>
    );
  }

  const date = new Date(story.createdAt).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <main className="public-page">
      <div className="public-card public-card--story">
        {/* Header */}
        <div className="public-story-header">
          <h1 className="public-story-title">{story.title}</h1>
          <p className="public-story-byline">
            por <strong>@{story.user.username}</strong> · {date}
          </p>
        </div>

        {/* Excerpt */}
        <div className="public-story-content">
          <p>{story.contentExcerpt}</p>
        </div>

        {/* Stats */}
        {(story.likesCount > 0 || story.childrenCount > 0) && (
          <div className="public-story-meta">
            {story.likesCount > 0 && (
              <span>
                {story.likesCount} {story.likesCount === 1 ? "like" : "likes"}
              </span>
            )}
            {story.childrenCount > 0 && (
              <span>
                {story.childrenCount}{" "}
                {story.childrenCount === 1 ? "continuación" : "continuaciones"}
              </span>
            )}
          </div>
        )}

        {/* CTAs */}
        <a
          href={`inkduel://story/${storyId}`}
          className="public-cta"
        >
          Leer en InkDuel
        </a>
        <a href="https://inkduel.com" className="public-cta-secondary">
          Crear mi primer relato
        </a>
      </div>
    </main>
  );
}
