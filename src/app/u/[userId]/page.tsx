import type { Metadata } from "next";

const API_BASE = "https://inkduel-backend-production.up.railway.app";

type PublicUser = {
  id: string;
  username: string;
  avatar: string;
  description: string;
  rankPoints: number;
  rankTier: string;
  rankDivision: number;
  wins: number;
  losses: number;
  currentStreak: number;
  bestStreak: number;
  writerLevel: number;
  createdAt: string;
};

async function fetchUser(userId: string): Promise<PublicUser | null> {
  try {
    const res = await fetch(`${API_BASE}/public/users/${userId}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

type Props = {
  params: Promise<{ userId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { userId } = await params;
  const user = await fetchUser(userId);
  if (!user) {
    return { title: "Usuario no encontrado — InkDuel" };
  }
  return {
    title: `${user.username} en InkDuel`,
    description: `Rango ${user.rankTier} ${user.rankDivision}. Lee sus relatos y acepta el duelo.`,
    openGraph: {
      title: `${user.username} en InkDuel`,
      description: `Rango ${user.rankTier} ${user.rankDivision}. ${user.wins} victorias. Nivel de escritor ${user.writerLevel}.`,
      type: "profile",
      url: `https://inkduel.com/u/${userId}`,
    },
  };
}

const TIER_COLORS: Record<string, string> = {
  Aprendiz: "var(--rank-aprendiz)",
  Escriba: "var(--rank-escriba)",
  Narrador: "var(--rank-narrador)",
  Duellista: "var(--rank-duellista)",
  "Maestro de Tinta": "var(--rank-maestro)",
  Leyenda: "var(--rank-leyenda)",
};

export default async function ProfilePage({ params }: Props) {
  const { userId } = await params;
  const user = await fetchUser(userId);

  if (!user) {
    return (
      <main className="public-page">
        <div className="public-card">
          <h1 className="public-title">Usuario no encontrado</h1>
          <p className="public-subtitle">
            Este perfil no existe o fue eliminado.
          </p>
          <a href="https://inkduel.com" className="public-cta">
            Ir a InkDuel
          </a>
        </div>
      </main>
    );
  }

  const tierColor = TIER_COLORS[user.rankTier] ?? "var(--accent)";
  const initial = (user.username?.[0] ?? "I").toUpperCase();
  const winRate =
    user.wins + user.losses > 0
      ? Math.round((user.wins / (user.wins + user.losses)) * 100)
      : 0;

  return (
    <main className="public-page">
      <div className="public-card">
        {/* Avatar */}
        <div
          className="public-avatar"
          style={{
            background: `linear-gradient(135deg, var(--accent), ${tierColor})`,
          }}
        >
          <span>{initial}</span>
        </div>

        {/* Username + rank */}
        <h1 className="public-title">{user.username}</h1>
        <p className="public-rank" style={{ color: tierColor }}>
          {user.rankTier} {user.rankDivision}
        </p>

        {user.description && (
          <p className="public-description">{user.description}</p>
        )}

        {/* Stats */}
        <div className="public-stats">
          <div className="public-stat">
            <span className="public-stat-value">{user.wins}</span>
            <span className="public-stat-label">Victorias</span>
          </div>
          <div className="public-stat">
            <span className="public-stat-value">{winRate}%</span>
            <span className="public-stat-label">Win Rate</span>
          </div>
          <div className="public-stat">
            <span className="public-stat-value">{user.bestStreak}</span>
            <span className="public-stat-label">Mejor racha</span>
          </div>
          <div className="public-stat">
            <span className="public-stat-value">{user.writerLevel}</span>
            <span className="public-stat-label">Nivel</span>
          </div>
        </div>

        {/* CTAs */}
        <a
          href={`inkduel://profile/${userId}`}
          className="public-cta"
        >
          Abrir perfil en la app
        </a>
        <a href="https://inkduel.com" className="public-cta-secondary">
          Unirse a InkDuel
        </a>
      </div>
    </main>
  );
}
