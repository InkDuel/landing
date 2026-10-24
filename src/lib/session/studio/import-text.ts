// Safe text import (PRD §10): .txt and .md read as UTF-8 (invalid bytes are an
// error, never silently replaced), line endings normalized, nothing executed
// or interpreted — Markdown stays literal text. Optional split by top-level
// headings (# / ##) outside fenced code, only after the author confirms it.

export const MAX_IMPORT_BYTES = 1024 * 1024;

export type ImportedFile = { name: string; title: string; text: string; isMarkdown: boolean };
export type ImportError = 'invalid' | 'tooBig' | 'type';

const EXT = /\.(txt|md|markdown|text)$/i;

export function normalizeImportedText(raw: string): string {
  return raw.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
}

/** The file's bytes (FileReader where Blob.arrayBuffer is missing). */
function fileBytes(file: File): Promise<Uint8Array> {
  if (typeof file.arrayBuffer === 'function') return file.arrayBuffer().then((b) => new Uint8Array(b));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

export async function readImportFile(file: File): Promise<{ ok: true; file: ImportedFile } | { ok: false; reason: ImportError }> {
  if (!EXT.test(file.name) || (file.type && !file.type.startsWith('text/') && file.type !== 'application/octet-stream')) {
    return { ok: false, reason: 'type' };
  }
  if (file.size > MAX_IMPORT_BYTES) return { ok: false, reason: 'tooBig' };
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(await fileBytes(file));
  } catch {
    return { ok: false, reason: 'invalid' };
  }
  const title = file.name.replace(EXT, '').replace(/[_]+/g, ' ').trim().slice(0, 120);
  return { ok: true, file: { name: file.name, title, text: normalizeImportedText(text), isMarkdown: /\.(md|markdown)$/i.test(file.name) } };
}

export type ImportedChapter = { title: string; body: string };

/** Chapters by # / ## headings; text before the first heading is its own chapter. */
export function splitByHeadings(text: string): ImportedChapter[] {
  const lines = text.split('\n');
  const out: ImportedChapter[] = [];
  let current: { title: string; lines: string[] } | null = null;
  let fenced = false;
  const push = () => {
    if (!current) return;
    const body = current.lines.join('\n').replace(/^\n+|\s+$/g, '');
    if (current.title || body) out.push({ title: current.title, body });
  };
  for (const line of lines) {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    const heading = !fenced ? /^#{1,2}\s+(.+?)\s*#*\s*$/.exec(line) : null;
    if (heading) {
      push();
      current = { title: heading[1].trim().slice(0, 120), lines: [] };
    } else {
      current ??= { title: '', lines: [] };
      current.lines.push(line);
    }
  }
  push();
  return out;
}

/** Saves a text as a file on the author's device. */
export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
