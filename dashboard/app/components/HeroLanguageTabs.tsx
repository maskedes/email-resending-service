'use client';

import { useState, useRef, useCallback } from 'react';

/* ─── Language definitions ─── */
const LANGUAGES = [
  { id: 'cli', label: 'CLI', icon: '›_' },
  { id: 'node', label: 'Node.js', icon: '⬡' },
  { id: 'python', label: 'Python', icon: '🐍' },
  { id: 'go', label: 'Go', icon: '▶' },
  { id: 'php', label: 'PHP', icon: '🐘' },
  { id: 'ruby', label: 'Ruby', icon: '💎' },
] as const;

type LangId = (typeof LANGUAGES)[number]['id'];

const SNIPPETS: Record<LangId, string> = {
  cli: `curl -X POST https://api.freemailsend.dev/api/emails/send \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: fms_YOUR_API_KEY" \\
  -d '{
    "from": "hello@yourdomain.com",
    "to": ["user@example.com"],
    "subject": "Welcome aboard!",
    "html": "<h1>Hello!</h1><p>Your account is ready.</p>"
  }'`,

  node: `import { ENovoy } from '@envoy/sdk';

const envoy = new ENovoy({ apiKey: 'fms_YOUR_API_KEY' });

const result = await envoy.emails.send({
  from: 'hello@yourdomain.com',
  to: ['user@example.com'],
  subject: 'Welcome aboard!',
  html: '<h1>Hello!</h1><p>Your account is ready.</p>',
});

console.log(result.id); // queued message id`,

  python: `import envoy

client = envoy.Client(api_key="fms_YOUR_API_KEY")

result = client.emails.send(
    from_email="hello@yourdomain.com",
    to=["user@example.com"],
    subject="Welcome aboard!",
    html="<h1>Hello!</h1><p>Your account is ready.</p>",
)

print(result.id)  # queued message id`,

  go: `package main

import (
    "fmt"
    envoy "github.com/maskedes/envoy-go"
)

func main() {
    client := envoy.NewClient("fms_YOUR_API_KEY")

    result, err := client.Emails.Send(&envoy.SendRequest{
        From:    "hello@yourdomain.com",
        To:      []string{"user@example.com"},
        Subject: "Welcome aboard!",
        HTML:    "<h1>Hello!</h1><p>Your account is ready.</p>",
    })
    if err != nil {
        panic(err)
    }
    fmt.Println(result.ID)
}`,

  php: `<?php

require 'vendor/autoload.php';

use Envoy\\Envoy;

$client = new Envoy('fms_YOUR_API_KEY');

$result = $client->emails()->send([
    'from'    => 'hello@yourdomain.com',
    'to'      => ['user@example.com'],
    'subject' => 'Welcome aboard!',
    'html'    => '<h1>Hello!</h1><p>Your account is ready.</p>',
]);

echo $result->id; // queued message id`,

  ruby: `require 'envoy'

client = Envoy::Client.new(api_key: 'fms_YOUR_API_KEY')

result = client.emails.send(
  from: 'hello@yourdomain.com',
  to: ['user@example.com'],
  subject: 'Welcome aboard!',
  html: '<h1>Hello!</h1><p>Your account is ready.</p>',
)

puts result.id # queued message id`,
};

/* ─── Syntax highlighter (lightweight) ─── */
function highlight(code: string, lang: LangId) {
  const lines = code.split('\n');
  return lines.map((line, i) => {
    let highlighted = line;

    if (lang === 'cli') {
      highlighted = line
        .replace(/^(curl)/, '<span class="text-emerald-400">$1</span>')
        .replace(/(-[a-zA-Z]+)/g, '<span class="text-emerald-400">$1</span>')
        .replace(/(https?:\/\/[^\s\\"]+)/g, '<span class="text-blue-400">$1</span>')
        .replace(/"([^"]*)"/g, '"<span class="text-orange-300">$1</span>"');
    } else if (lang === 'node') {
      highlighted = line
        .replace(/\b(import|from|const|let|var|async|await|new|return|if)\b/g, '<span class="text-purple-400">$1</span>')
        .replace(/\b(console\.log)\b/g, '<span class="text-blue-300">$1</span>')
        .replace(/'([^']*)'/g, '\'<span class="text-orange-300">$1</span>\'')
        .replace(/"([^"]*)"/g, '"<span class="text-orange-300">$1</span>"')
        .replace(/(\/\/.*)$/g, '<span class="text-slate-500">$1</span>');
    } else if (lang === 'python') {
      highlighted = line
        .replace(/\b(import|from|as|def|class|return|if|print)\b/g, '<span class="text-purple-400">$1</span>')
        .replace(/\b(client|result)\b/g, '<span class="text-blue-300">$1</span>')
        .replace(/"([^"]*)"/g, '"<span class="text-orange-300">$1</span>"')
        .replace(/(#.*)$/g, '<span class="text-slate-500">$1</span>');
    } else if (lang === 'go') {
      highlighted = line
        .replace(/\b(package|import|func|return|if|var|defer)\b/g, '<span class="text-purple-400">$1</span>')
        .replace(/\b(fmt\.Println|panic|main)\b/g, '<span class="text-blue-300">$1</span>')
        .replace(/"([^"]*)"/g, '"<span class="text-orange-300">$1</span>"')
        .replace(/(\/\/.*)$/g, '<span class="text-slate-500">$1</span>');
    } else if (lang === 'php') {
      highlighted = line
        .replace(/(<\?php|\brequire|use)\b/g, '<span class="text-purple-400">$1</span>')
        .replace(/\$[a-zA-Z_]+/g, '<span class="text-blue-300">$&</span>')
        .replace(/'([^']*)'/g, '\'<span class="text-orange-300">$1</span>\'')
        .replace(/"([^"]*)"/g, '"<span class="text-orange-300">$1</span>"')
        .replace(/(\/\/.*)$/g, '<span class="text-slate-500">$1</span>');
    } else if (lang === 'ruby') {
      highlighted = line
        .replace(/\b(require|client|puts|def|class|end|do)\b/g, '<span class="text-purple-400">$1</span>')
        .replace(/:\w+/g, '<span class="text-orange-300">$&</span>')
        .replace(/'([^']*)'/g, '\'<span class="text-orange-300">$1</span>\'')
        .replace(/(#.*)$/g, '<span class="text-slate-500">$1</span>');
    }

    return (
      <span key={i} className="block">
        <span className="select-none text-slate-600">{String(i + 1).padStart(2, ' ')}</span>
        <span className="ml-4" dangerouslySetInnerHTML={{ __html: highlighted }} />
      </span>
    );
  });
}

/* ─── Copy icon (inline) ─── */
function CopyIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

/* ─── Component ─── */
export default function HeroLanguageTabs() {
  const [active, setActive] = useState<LangId>('cli');
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(SNIPPETS[active]).catch(() => {});
    setCopied(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), 2000);
  }, [active]);

  return (
    <div className="mt-14 w-full max-w-3xl mx-auto">
      {/* Trust label */}
      <p className="mb-5 text-sm text-slate-500">
        Trusted by developers and teams worldwide
      </p>

      {/* Language tabs */}
      <div className="flex items-center justify-center gap-1">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.id}
            onClick={() => { setActive(lang.id); setCopied(false); }}
            className={`
              relative px-4 py-2 text-sm font-medium transition-all duration-200
              ${active === lang.id
                ? 'text-white'
                : 'text-slate-500 hover:text-slate-300'
              }
            `}
          >
            <span className="mr-1.5 text-xs opacity-60">{lang.icon}</span>
            {lang.label}
            {active === lang.id && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 bg-brand" />
            )}
          </button>
        ))}
      </div>

      {/* Code block */}
      <div className="mt-6 overflow-hidden border border-canvas-border bg-canvas/80 backdrop-blur-sm">
        {/* Window header */}
        <div className="flex items-center justify-between border-b border-canvas-border px-4 py-2.5">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-red-500/50" />
            <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/50" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-500/50" />
            <span className="ml-2 text-xs text-slate-500">
              {LANGUAGES.find((l) => l.id === active)?.label}
              {active === 'cli' ? ' — Terminal' : ''}
            </span>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded border border-canvas-border bg-canvas-raised px-2.5 py-1 text-xs text-slate-400 transition hover:border-brand/50 hover:text-white"
          >
            {copied ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><polyline points="20 6 9 17 4 12" /></svg>
                Copied!
              </>
            ) : (
              <>
                <CopyIcon />
                Copy
              </>
            )}
          </button>
        </div>

        {/* Code */}
        <pre className="overflow-x-auto p-5 text-[13px] leading-relaxed">
          <code>{highlight(SNIPPETS[active], active)}</code>
        </pre>
      </div>

      {/* Install hint */}
      <p className="mt-4 text-center text-xs text-slate-600">
        Replace <code className="rounded bg-canvas-border/50 px-1.5 py-0.5 text-slate-400">fms_YOUR_API_KEY</code> with your actual API key from the{' '}
        <a href="/overview/api-keys" className="text-brand hover:underline">dashboard</a>
      </p>
    </div>
  );
}
