import { InkButton } from '@/components/ink/ink-button';
import { InkHeadline } from '@/components/ink/ink-headline';
import { PlayerIdentity } from '@/components/ink/player-identity';

// Building blocks of the shared reading pages (Lectura: «InkDuel afuera, la
// historia adentro»). Everything people wrote is Literata and plain text.

export function Byline({ by, username, date }: { by: string; username: string; date: string }) {
  return (
    <p className="flex items-center gap-2 type-caption text-secondary">
      <PlayerIdentity name={username} size={24} />
      <span>
        {by} <span className="font-extrabold text-primary">@{username}</span>
        {date ? <> · {date}</> : null}
      </span>
    </p>
  );
}

/** Story body: Literata 19/30, no indent or drop cap, the author's breaks kept. */
export function StoryText({ text }: { text: string }) {
  return <div className="type-literary-body text-content whitespace-pre-line break-words">{text}</div>;
}

export function ReadingActions({
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: {
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
}) {
  return (
    <div className="mt-10 flex flex-col items-stretch gap-2 border-t border-divider pt-8 sm:flex-row sm:items-center">
      <InkButton href={primaryHref} className="sm:w-auto sm:min-w-[240px]">
        {primaryLabel}
      </InkButton>
      <InkButton href={secondaryHref} variant="ghost" fullWidth={false}>
        {secondaryLabel}
      </InkButton>
    </div>
  );
}

export function ReadingNotFound({
  title,
  body,
  homeHref,
  homeLabel,
}: {
  title: string;
  body: string;
  homeHref: string;
  homeLabel: string;
}) {
  return (
    <div className="flex flex-col items-start gap-4 py-16">
      <InkHeadline text={title} size="title-page" />
      <p className="type-body text-secondary">{body}</p>
      <InkButton href={homeHref} variant="secondary" fullWidth={false} className="mt-2 px-6">
        {homeLabel}
      </InkButton>
    </div>
  );
}
