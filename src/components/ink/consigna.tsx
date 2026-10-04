import { cx } from './cx';

// Port of ink_consigna.dart (open card): the «Consigna» label and the text
// in Literata. The text is content: inside Lectura it takes reader.text.
export function Consigna({ label, text, className }: { label: string; text: string; className?: string }) {
  return (
    <figure className={cx('rounded-card border-quiet border-divider bg-surface px-[14px] py-3', className)}>
      <figcaption className="type-label text-secondary">{label}</figcaption>
      <blockquote className="mt-1 type-literary-small text-[17px] text-content whitespace-pre-line">{text}</blockquote>
    </figure>
  );
}
