'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

/* ─── Language definitions ─── */
const LANGUAGES = [
  { id: 'cli', label: 'CLI', icon: <CliIcon /> },
  { id: 'node', label: 'Node.js', icon: <NodeIcon /> },
  { id: 'python', label: 'Python', icon: <PythonIcon /> },
  { id: 'go', label: 'Go', icon: <GoIcon /> },
  { id: 'php', label: 'PHP', icon: <PhpIcon /> },
  { id: 'ruby', label: 'Ruby', icon: <RubyIcon /> },
  { id: 'javascript', label: 'JavaScript', icon: <JavaScriptIcon /> },
  { id: 'typescript', label: 'TypeScript', icon: <TypeScriptIcon /> },
  { id: 'java', label: 'Java', icon: <JavaIcon /> },
  { id: 'kotlin', label: 'Kotlin', icon: <KotlinIcon /> },
  { id: 'csharp', label: 'C#', icon: <CSharpIcon /> },
  { id: 'rust', label: 'Rust', icon: <RustIcon /> },
  { id: 'swift', label: 'Swift', icon: <SwiftIcon /> },
  { id: 'dart', label: 'Dart', icon: <DartIcon /> },
  { id: 'cpp', label: 'C++', icon: <CppIcon /> },
  { id: 'elixir', label: 'Elixir', icon: <ElixirIcon /> },
] as const;

/* ─── Node.js icon (hexagons) ─── */
function NodeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 36 36" aria-hidden="true">
      <path d="M0 0h36v36H0z" fill="none" />
      <path fill="currentColor" d="M10.5 34.29L2 29.39v-9.81l8.5-4.9l8.5 4.9v9.81ZM4 28.23L10.5 32l6.5-3.77v-7.49L10.5 17L4 20.74Z" className="clr-i-outline clr-i-outline-path-1" />
      <path fill="currentColor" d="m25.5 34.29l-8.5-4.9v-9.81l8.5-4.9l8.5 4.9v9.81ZM19 28.23L25.5 32l6.5-3.77v-7.49L25.5 17L19 20.74Z" className="clr-i-outline clr-i-outline-path-2" />
      <path fill="currentColor" d="m18 21.32l-8.5-4.9V6.61l8.5-4.9l8.5 4.9v9.81Zm-6.5-6.06L18 19l6.5-3.75V7.77L18 4l-6.5 3.77Z" className="clr-i-outline clr-i-outline-path-3" />
      <path fill="none" d="M0 0h36v36H0z" />
    </svg>
  );
}

/* ─── Ruby icon (diamond) ─── */
function RubyIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M0 0h16v16H0z" fill="none" />
      <path fill="currentColor" d="M3.637 2.291A.75.75 0 0 1 4.23 2h7.54c.232 0 .451.107.593.291l3.48 4.5a.75.75 0 0 1-.072.999l-7.25 7a.75.75 0 0 1-1.042 0l-7.25-7a.75.75 0 0 1-.072-.999ZM4.598 3.5L1.754 7.177L8 13.207l6.246-6.03L11.402 3.5Z" />
    </svg>
  );
}

/* ─── CLI (terminal) icon ─── */
function CliIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M0 0h16v16H0z" fill="none" />
      <path fill="currentColor" d="M15 1H1c-.55 0-1 .45-1 1v12c0 .55.45 1 1 1h14c.55 0 1-.45 1-1V2c0-.55-.45-1-1-1m-2.5 11h-5c-.28 0-.5-.22-.5-.5s.22-.5.5-.5h5c.28 0 .5.22.5.5s-.22.5-.5.5M6.59 8.8l-2.65 2.65a.62.62 0 0 1-.44.18a.62.62 0 0 1-.44-.18a.63.63 0 0 1 0-.88L5.62 8L3.06 5.44a.63.63 0 0 1 0-.88c.24-.24.64-.24.88 0L6.59 7.2c.44.44.44 1.16 0 1.6" />
    </svg>
  );
}

/* ─── Python icon (logo) ─── */
function PythonIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M0 0h24v24H0z" fill="none" />
      <g fill="none">
        <g fill="currentColor" clipPath="url(#python-clip)">
          <path d="M11.914 0C5.82 0 6.2 2.656 6.2 2.656l.007 2.752h5.814v.826H3.9S0 5.789 0 11.969s3.403 5.96 3.403 5.96h2.03v-2.867s-.109-3.42 3.35-3.42h5.766s3.24.052 3.24-3.148V3.202S18.28 0 11.913 0M8.708 1.85c.578 0 1.046.47 1.046 1.052c0 .581-.468 1.051-1.046 1.051s-1.046-.47-1.046-1.051c0-.582.467-1.052 1.046-1.052" />
          <path d="M12.087 24c6.092 0 5.712-2.656 5.712-2.656l-.007-2.752h-5.814v-.826h8.123s3.9.445 3.9-5.735s-3.404-5.96-3.404-5.96h-2.03v2.867s.109 3.42-3.35 3.42H9.452s-3.24-.052-3.24 3.148v5.292S5.72 24 12.087 24m3.206-1.85c-.579 0-1.046-.47-1.046-1.052c0-.581.467-1.051 1.046-1.051c.578 0 1.046.47 1.046 1.051c0 .582-.468 1.052-1.046 1.052" />
        </g>
        <defs>
          <clipPath id="python-clip">
            <path fill="#fff" d="M0 0h24v24H0z" />
          </clipPath>
        </defs>
      </g>
    </svg>
  );
}

/* ─── Go icon ─── */
function GoIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M0 0h24v24H0z" fill="none" />
      <path fill="currentColor" d="M3.79 10.17a.2.2 0 0 0-.11 0l-.2.27H7a.15.15 0 0 0 .1-.06l.17-.26v-.05zm-1.47.89a.14.14 0 0 0-.11 0l-.2.26v.05h4.6a.09.09 0 0 0 .09-.06l.08-.23v-.06zM4.6 12a.13.13 0 0 0-.1.06l-.13.24v.06h2.15a.08.08 0 0 0 .07-.07v-.23s0-.07-.06-.07zm15.99-3.07a3.62 3.62 0 0 0-2.78-.5a4.1 4.1 0 0 0-2.72 1.63a4 4 0 0 0-.67 1.26h-3.14a.25.25 0 0 0-.24.16c-.14.25-.37.76-.5 1.06s0 .29.18.29h1.88a3 3 0 0 1-.26.36a1.81 1.81 0 0 1-1.65.65a1.53 1.53 0 0 1-1.32-1.53a2.07 2.07 0 0 1 1-1.85a1.71 1.71 0 0 1 1.77-.15a1.4 1.4 0 0 1 .45.37c.13.15.14.14.29.1l1.63-.43c.12 0 .16-.08.1-.16a3 3 0 0 0-1.13-1.38a3.35 3.35 0 0 0-2.58-.47A4.3 4.3 0 0 0 8.16 10a3.8 3.8 0 0 0-.82 2.85A3 3 0 0 0 8.57 15a3.46 3.46 0 0 0 2.62.65A4.06 4.06 0 0 0 14 14a4.3 4.3 0 0 0 .41-.69a3 3 0 0 0 1 1.55a3.68 3.68 0 0 0 2.38.86c.25 0 .51 0 .78-.09a4.5 4.5 0 0 0 2.33-1.25A3.72 3.72 0 0 0 22 11.1a3 3 0 0 0-1.41-2.17m-1.78 4.73a1.81 1.81 0 0 1-1.59.06a1.61 1.61 0 0 1-.9-1.84A2.12 2.12 0 0 1 18 10.19a1.59 1.59 0 0 1 2 1.29a3 3 0 0 1 0 .32a2.11 2.11 0 0 1-1.19 1.86" />
    </svg>
  );
}

/* ─── PHP icon (elephant) ─── */
function PhpIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 512 512" aria-hidden="true">
      <path d="M0 0h512v512H0z" fill="none" />
      <path fill="currentColor" d="M170.322 349.808c-2.4-15.66-9-28.38-25.02-34.531c-6.27-2.4-11.7-6.78-17.88-9.54c-7.02-3.15-14.16-6.15-21.57-8.1c-5.61-1.5-10.83 1.02-14.16 5.94c-3.15 4.62-.87 8.97 1.77 12.84c2.97 4.35 6.27 8.49 9.6 12.57c5.52 6.78 11.37 13.29 16.74 20.161c5.13 6.57 9.51 13.86 8.76 22.56c-1.65 19.08-10.29 34.891-24.21 47.76c-1.53 1.38-4.23 2.37-6.21 2.19c-8.88-.96-16.95-4.32-23.46-10.53c-7.47-7.11-6.33-15.48 2.61-20.67c2.13-1.23 4.35-2.37 6.3-3.87c5.46-4.11 7.29-11.13 4.32-17.22c-1.41-2.94-3-6.12-5.34-8.25c-11.43-10.41-22.651-21.151-34.891-30.63C18.01 307.447 2.771 276.968.43 240.067c-2.64-40.981 6.87-79.231 28.5-114.242c8.19-13.29 17.73-25.951 32.37-32.52c9.96-4.47 20.88-6.99 31.531-9.78c29.311-7.71 58.89-13.5 89.401-8.34c26.28 4.41 45.511 17.94 54.331 43.77c5.79 16.89 7.17 34.35 5.37 52.231c-3.54 35.131-29.49 66.541-63.331 75.841c-14.67 4.02-22.68 1.77-31.5-10.44c-6.33-8.79-11.58-18.36-17.25-27.631c-.84-1.38-1.44-2.97-2.16-4.44c-.69-1.47-1.44-2.88-2.16-4.35c2.13 15.24 5.67 29.911 13.98 42.99c4.5 7.11 10.5 12.36 19.29 13.14c32.34 2.91 59.641-7.71 79.021-33.721c21.69-29.101 26.461-62.581 20.19-97.831c-1.23-6.96-3.3-13.77-4.77-20.7c-.99-4.47.78-7.77 5.19-9.33c2.04-.69 4.14-1.26 6.18-1.68c26.461-5.7 53.221-7.59 80.191-4.86c30.601 3.06 59.551 11.46 85.441 28.471c40.531 26.67 65.641 64.621 79.291 110.522c1.98 6.66 2.28 13.95 2.46 20.971c.12 4.68-2.88 5.91-6.45 2.97c-3.93-3.21-7.53-6.87-10.92-10.65c-3.15-3.57-5.67-7.65-8.73-11.4c-2.37-2.94-4.44-2.49-5.58 1.17c-.72 2.22-1.35 4.41-1.98 6.63c-7.08 25.26-18.24 48.3-36.33 67.711c-2.52 2.73-4.77 6.78-5.07 10.38c-.78 9.96-1.35 20.13-.39 30.06c1.98 21.331 5.07 42.57 7.47 63.871c1.35 12.03-2.52 19.11-13.83 23.281c-7.95 2.91-16.47 5.04-24.87 5.64c-13.38.93-26.88.27-40.32.27c-.36-15 .93-29.731-13.17-37.771c2.73-11.13 5.88-21.69 7.77-32.49c1.56-8.97.24-17.79-6.06-25.14c-5.91-6.93-13.32-8.82-20.101-4.86c-20.43 11.91-41.671 11.97-63.301 4.17c-9.93-3.6-16.86-1.56-22.351 7.5c-5.91 9.75-8.4 20.7-7.74 31.771c.84 13.95 3.27 27.75 5.13 41.64c1.02 7.77.15 9.78-7.56 11.76c-17.13 4.35-34.56 4.83-52.081 3.42c-.93-.09-1.86-.48-2.46-.63c-.87-14.55.66-29.671-16.68-37.411c7.68-16.29 6.63-33.18 3.99-50.07l-.06-.15zm-103.561-57.09c2.55-2.4 4.59-6.15 5.31-9.6c1.8-8.64-4.68-20.22-12.18-23.43c-3.99-1.74-7.47-1.11-10.29 2.07c-6.87 7.77-13.65 15.63-20.401 23.521c-1.14 1.35-2.16 2.94-2.97 4.53c-2.7 5.19-1.11 8.97 4.65 10.38c3.48.87 7.08 1.05 10.65 1.56c9.3-.9 18.3-2.46 25.23-9zm.78-86.371c-.03-6.18-5.19-11.34-11.28-11.37c-6.27-.03-11.67 5.58-11.46 11.76c.27 6.21 5.43 11.19 11.61 11.07c6.24-.09 11.22-5.19 11.16-11.43z" />
    </svg>
  );
}

/* ─── New-language icons (monochrome badges) ─── */
function BadgeIcon({ label }: { label: string }) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="4" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <text x="12" y="15.5" fontFamily="monospace" fontSize="9" fontWeight="bold" textAnchor="middle" fill="currentColor">{label}</text>
    </svg>
  );
}

function JavaScriptIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M0 0h24v24H0z" fill="none" />
      <g fill="none">
        <g clipPath="url(#SVGXv8lpc2Y)">
          <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M0 0h24v24H0zm18.347 20.12c-1.113 0-1.742-.58-2.225-1.37l-1.833 1.065c.662 1.308 2.015 2.306 4.11 2.306c2.142 0 3.737-1.112 3.737-3.143c0-1.883-1.082-2.72-2.998-3.543l-.564-.241c-.968-.42-1.387-.693-1.387-1.37c0-.547.42-.966 1.08-.966c.647 0 1.064.273 1.451.966l1.756-1.127c-.743-1.307-1.773-1.806-3.207-1.806c-2.014 0-3.303 1.288-3.303 2.98c0 1.835 1.08 2.704 2.708 3.397l.564.242c1.029.45 1.642.724 1.642 1.497c0 .646-.597 1.113-1.531 1.113m-8.74-.015c-.775 0-1.098-.53-1.452-1.16l-1.836 1.112c.532 1.126 1.578 2.06 3.383 2.06c1.999 0 3.368-1.063 3.368-3.398v-7.7h-2.255v7.67c0 1.127-.468 1.416-1.209 1.416" />
        </g>
        <defs>
          <clipPath id="SVGXv8lpc2Y">
            <path fill="#fff" d="M0 0h24v24H0z" />
          </clipPath>
        </defs>
      </g>
    </svg>
  );
}
function TypeScriptIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M0 0h24v24H0z" fill="none" />
      <g fill="none">
        <g clipPath="url(#SVGTSClip)">
          <path fill="currentColor" d="M23.429 0H.57A.57.57 0 0 0 0 .571V23.43a.57.57 0 0 0 .571.571H23.43a.57.57 0 0 0 .571-.571V.57a.57.57 0 0 0-.572-.57m-9.143 12.826h-2.857v8.888H9.143v-8.888H6.286v-1.969h8zm.64 8.38v-2.375s1.298.978 2.855.978s1.497-1.018 1.497-1.158c0-1.477-4.412-1.477-4.412-4.751c0-4.452 6.429-2.695 6.429-2.695l-.08 2.116s-1.078-.719-2.296-.719s-1.657.58-1.657 1.198c0 1.597 4.452 1.438 4.452 4.652c0 4.95-6.788 2.755-6.788 2.755" />
        </g>
        <defs>
          <clipPath id="SVGTSClip">
            <path fill="#fff" d="M0 0h24v24H0z" />
          </clipPath>
        </defs>
      </g>
    </svg>
  );
}
function JavaIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M0 0h24v24H0z" fill="none" />
      <path fill="currentColor" d="M9.37 17.51c-3.09.86 1.87 2.64 5.8 1a7 7 0 0 1-1.1-.54a11.6 11.6 0 0 1-4.16.18c-1.31-.15-.54-.64-.54-.64m5.33-1.68a16.3 16.3 0 0 1-5.36.26c-1.31-.14-.45-.77-.45-.77c-3.4 1.12 1.89 2.4 6.64 1a2.25 2.25 0 0 1-.83-.49m1.82-9.73s-6.87 1.71-3.59 5.49a1.47 1.47 0 0 1-.25 2.12s2.46-1.27 1.33-2.86s-1.86-2.22 2.51-4.75" />
      <path fill="currentColor" d="M18.13 19.14s.56.46-.63.82c-2.27.69-9.43.9-11.42 0c-.72-.31.62-.74 1-.83a2.5 2.5 0 0 1 .69-.08c-.8-.56-5.15 1.1-2.21 1.58c8.05 1.37 14.64-.56 12.57-1.49m-2.76-4.88a7 7 0 0 1 .92-.49s-1.51.27-3 .4a28 28 0 0 1-4.82.05C6.09 13.91 9.74 13 9.74 13a6.8 6.8 0 0 0-3.16.75c-2.06 1.03 5.09 1.48 8.79.51m.91 2.44a.4.4 0 0 1-.08.09c5-1.32 3.18-4.65.78-3.81a.7.7 0 0 0-.33.25s.14-.05.43-.12c1.22-.25 2.92 1.63-.8 3.59M12 13c-.74-1.67-3.26-3.14 0-5.71C16.09 4.08 14 2 14 2c.84 3.31-3 4.31-4.34 6.37c-.93 1.41.47 2.92 2.34 4.63" />
      <path fill="currentColor" d="M16.41 21.32a29.8 29.8 0 0 1-9.14.14s.46.38 2.84.53c3.61.23 9.15-.12 9.29-1.83c0 0-.26.64-2.99 1.16" />
    </svg>
  );
}
function KotlinIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M0 0h24v24H0z" fill="none" />
      <path fill="currentColor" d="M21 3H3v18h18l-9-9z" />
    </svg>
  );
}
function CSharpIcon() { return <BadgeIcon label="C#" />; }
function RustIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M0 0h24v24H0z" fill="none" />
      <path fill="currentColor" d="m23.835 11.703l-1.008-.623l-.028-.294l.866-.807a.348.348 0 0 0-.116-.578l-1.106-.414a9 9 0 0 0-.087-.285l.69-.96a.346.346 0 0 0-.226-.544l-1.166-.19a9 9 0 0 0-.14-.261l.49-1.076a.34.34 0 0 0-.028-.336a.35.35 0 0 0-.3-.154l-1.185.041a7 7 0 0 0-.188-.227l.273-1.153a.347.347 0 0 0-.417-.417l-1.153.273l-.228-.188l.041-1.184a.344.344 0 0 0-.49-.328l-1.076.49l-.262-.14l-.19-1.167a.348.348 0 0 0-.545-.226l-.96.69a9 9 0 0 0-.285-.086L14.597.453a.348.348 0 0 0-.578-.116l-.807.867a9 9 0 0 0-.294-.028L12.295.168a.346.346 0 0 0-.59 0l-.623 1.008l-.294.028L9.98.337a.346.346 0 0 0-.578.116l-.414 1.106l-.285.086l-.959-.69a.348.348 0 0 0-.545.226l-.19 1.167a9 9 0 0 0-.262.14l-1.076-.49a.346.346 0 0 0-.49.328l.041 1.184a8 8 0 0 0-.228.187l-1.153-.272a.347.347 0 0 0-.417.417l.271 1.153l-.186.227l-1.184-.042a.346.346 0 0 0-.328.49l.49 1.077a9 9 0 0 0-.14.262l-1.166.19a.348.348 0 0 0-.226.544l.69.958l-.087.286l-1.106.414a.348.348 0 0 0-.116.578l.866.807a9 9 0 0 0-.028.294l-1.008.623a.344.344 0 0 0 0 .59l1.008.623q.012.147.028.294l-.866.807a.346.346 0 0 0 .116.578l1.106.415q.042.144.087.285l-.69.959a.345.345 0 0 0 .227.544l1.166.19q.069.132.14.262l-.49 1.076a.346.346 0 0 0 .328.49l1.183-.041q.093.115.187.227l-.27 1.154a.346.346 0 0 0 .416.417l1.153-.272q.113.096.228.187l-.041 1.184a.344.344 0 0 0 .49.327l1.076-.49q.13.073.262.14l.19 1.167a.348.348 0 0 0 .545.227l.959-.69a9 9 0 0 0 .285.087l.414 1.107a.345.345 0 0 0 .578.115l.808-.865l.294.03l.623 1.006a.347.347 0 0 0 .59 0l.623-1.007q.148-.013.294-.03l.807.866a.348.348 0 0 0 .578-.115l.414-1.107a9 9 0 0 0 .285-.087l.959.69a.345.345 0 0 0 .545-.226l.19-1.166l.262-.14l1.076.49a.347.347 0 0 0 .49-.328l-.041-1.184a7 7 0 0 0 .227-.187l1.153.272a.347.347 0 0 0 .417-.416l-.272-1.155q.095-.112.187-.227l1.184.041a.344.344 0 0 0 .328-.49l-.49-1.076q.072-.13.141-.262l1.166-.19a.348.348 0 0 0 .226-.544l-.69-.959l.087-.285l1.106-.414a.346.346 0 0 0 .116-.579l-.866-.807q.016-.147.028-.294l1.008-.624a.344.344 0 0 0 0-.589zm-6.742 8.355a.714.714 0 0 1 .299-1.396a.714.714 0 1 1-.3 1.396zm-.342-2.314a.65.65 0 0 0-.771.5l-.358 1.669a8.7 8.7 0 0 1-3.619.78a8.7 8.7 0 0 1-3.695-.815L7.95 18.21a.65.65 0 0 0-.772-.5l-1.473.317a9 9 0 0 1-.761-.898h7.167c.081 0 .136-.015.136-.088v-2.536c0-.074-.054-.088-.136-.088h-2.096v-1.608h2.268c.206 0 1.106.059 1.393 1.209c.09.353.288 1.504.424 1.873c.134.413.683 1.238 1.268 1.238h3.572a1 1 0 0 0 .13-.013a9 9 0 0 1-.813.952zm-9.914 2.28a.714.714 0 1 1-.3-1.396a.714.714 0 0 1 .3 1.396M4.117 8.997a.714.714 0 1 1-1.303.58a.714.714 0 0 1 1.304-.58m-.834 1.981l1.534-.682a.65.65 0 0 0 .33-.858l-.316-.715h1.244v5.602H3.567a8.8 8.8 0 0 1-.284-3.348zm6.734-.543V8.784h2.96c.153 0 1.08.177 1.08.87c0 .574-.712.78-1.296.78zm10.757 1.486q0 .329-.024.651h-.9c-.09 0-.127.059-.127.148v.413c0 .973-.548 1.184-1.03 1.238c-.457.052-.964-.191-1.027-.472c-.27-1.518-.72-1.843-1.43-2.403c.882-.56 1.799-1.386 1.799-2.492c0-1.193-.82-1.945-1.377-2.315c-.783-.516-1.65-.62-1.883-.62H5.468a8.77 8.77 0 0 1 4.907-2.77l1.098 1.152a.65.65 0 0 0 .918.02l1.227-1.173a8.78 8.78 0 0 1 6.004 4.276l-.84 1.898a.65.65 0 0 0 .33.859l1.618.718q.042.43.042.872zm-9.3-9.6a.713.713 0 1 1 .984 1.032a.714.714 0 0 1-.984-1.031m8.339 6.71a.71.71 0 0 1 .939-.362a.714.714 0 1 1-.94.364z" />
    </svg>
  );
}
function SwiftIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="0.88em" height="1em" viewBox="0 0 448 512" aria-hidden="true">
      <path d="M0 0h448v512H0z" fill="none" />
      <path fill="currentColor" d="M448 156.09c0-4.51-.08-9-.2-13.52a196 196 0 0 0-2.58-29.42a99.6 99.6 0 0 0-9.22-28A94.08 94.08 0 0 0 394.84 44a99.2 99.2 0 0 0-28-9.22a195 195 0 0 0-29.43-2.59c-4.51-.12-9-.17-13.52-.2H124.14c-4.51 0-9 .08-13.52.2c-2.45.07-4.91.15-7.37.27a172 172 0 0 0-22.06 2.32a103 103 0 0 0-21.21 6.1q-3.46 1.45-6.81 3.12a94.7 94.7 0 0 0-18.39 12.32c-1.88 1.61-3.69 3.28-5.43 5A93.9 93.9 0 0 0 12 85.17a99.5 99.5 0 0 0-9.22 28a196 196 0 0 0-2.54 29.4c-.13 4.51-.18 9-.21 13.52v199.83c0 4.51.08 9 .21 13.51a196 196 0 0 0 2.58 29.42a99.3 99.3 0 0 0 9.22 28A94.3 94.3 0 0 0 53.17 468a99.5 99.5 0 0 0 28 9.21a195 195 0 0 0 29.43 2.59c4.5.12 9 .17 13.52.2h199.79c4.51 0 9-.08 13.52-.2a196.6 196.6 0 0 0 29.44-2.59a99.6 99.6 0 0 0 28-9.21A94.22 94.22 0 0 0 436 426.84a99.3 99.3 0 0 0 9.22-28a195 195 0 0 0 2.59-29.42c.12-4.5.17-9 .2-13.51V172.14c-.01-5.35-.01-10.7-.01-16.05m-69.88 241c-20-38.93-57.23-29.27-76.31-19.47c-1.72 1-3.48 2-5.25 3l-.42.25c-39.5 21-92.53 22.54-145.85-.38A234.64 234.64 0 0 1 45 290.12a230.6 230.6 0 0 0 39.17 23.37c56.36 26.4 113 24.49 153 0c-57-43.85-104.6-101-141.09-147.22a197 197 0 0 1-18.78-25.9c43.7 40 112.7 90.22 137.48 104.12c-52.57-55.49-98.89-123.94-96.72-121.74c82.79 83.42 159.18 130.59 159.18 130.59c2.88 1.58 5 2.85 6.73 4a127 127 0 0 0 4.16-12.47c13.22-48.33-1.66-103.58-35.31-149.2C329.61 141.75 375 229.34 356.4 303.42c-.44 1.73-.95 3.4-1.44 5.09c38.52 47.4 28.04 98.17 23.13 88.59z" />
    </svg>
  );
}
function DartIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M0 0h16v16H0z" fill="none" />
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 14.5h4.5v-3h3V7L9.17 1.64c-.28-.29-.8-.47-1.17-.29L3.5 3.5L1.35 8c-.18.37 0 .88.3 1.17z" />
        <path d="M3.5 11V3.5H11m-7.5 0l8 8" />
      </g>
    </svg>
  );
}
function CppIcon() { return <BadgeIcon label="C++" />; }
function ElixirIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M0 0h24v24H0z" fill="none" />
      <path fill="currentColor" d="M19.793 16.575c0 3.752-2.927 7.426-7.743 7.426c-5.249 0-7.843-3.71-7.843-8.29c0-5.21 3.892-12.952 8-15.647a.397.397 0 0 1 .61.371a9.72 9.72 0 0 0 1.694 6.518c.522.795 1.092 1.478 1.763 2.352c.94 1.227 1.637 1.906 2.644 3.842l.015.028a7.1 7.1 0 0 1 .86 3.4" />
    </svg>
  );
}

type LangId = (typeof LANGUAGES)[number]['id'];

const SNIPPETS: Record<LangId, string> = {
  cli: `curl -X POST http://78.154.103.19:12083/api/emails/send \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: $ENVOY_API_KEY" \\
  -d '{
    "from": "hello@mail.yourdomain.com",
    "to": ["user@example.com"],
    "subject": "Welcome aboard!",
    "html": "<h1>Hello!</h1><p>Your account is ready.</p>"
  }'`,

  node: `import { ENovoy } from '@envoy/sdk';

const envoy = new ENovoy({ apiKey: process.env.ENVOY_API_KEY });

const result = await envoy.emails.send({
  from: 'hello@mail.yourdomain.com',
  to: ['user@example.com'],
  subject: 'Welcome aboard!',
  html: '<h1>Hello!</h1><p>Your account is ready.</p>',
});

console.log(result.id); // queued message id`,

  python: `import os
from envoy_sdk import ENovoy

envoy = ENovoy(
    api_key=os.environ["ENVOY_API_KEY"]
)

result = envoy.emails.send(
    from_address="hello@mail.yourdomain.com",
    to=["user@example.com"],
    subject="Welcome aboard!",
    html="""
    <h1>Hello!</h1>
    <p>Your account is ready.</p>
    """,
)

print(result.id)  # queued message id`,

  go: `package main

import (
    "fmt"
    "os"
    envoy "github.com/maskedes/envoy-go"
)

func main() {
    client := envoy.New(os.Getenv("ENVOY_API_KEY"))

    result, err := client.Emails.Send(&envoy.SendRequest{
        From:    "hello@mail.yourdomain.com",
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

use EnvoySdk\\Envoy;

$client = new Envoy($_ENV['ENVOY_API_KEY']);

$result = $client->emails->send([
    'from'    => 'hello@mail.yourdomain.com',
    'to'      => ['user@example.com'],
    'subject' => 'Welcome aboard!',
    'html'    => '<h1>Hello!</h1><p>Your account is ready.</p>',
]);

echo $result->id; // queued message ID`,

  ruby: `require 'envoy'

client = ENovoy.new(api_key: ENV['ENVOY_API_KEY'])

result = client.emails.send(
  from: 'hello@mail.yourdomain.com',
  to: ['user@example.com'],
  subject: 'Welcome aboard!',
  html: '<h1>Hello!</h1><p>Your account is ready.</p>',
)

puts result.id # queued message id`,

  javascript: `const response = await fetch("http://78.154.103.19:12083/api/emails/send", {
  method: "POST",
  headers: {
    "x-api-key": process.env.ENVOY_API_KEY,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    from: "hello@mail.yourdomain.com",
    to: ["user@example.com"],
    subject: "Welcome aboard!",
    html: "<h1>Hello!</h1><p>Your account is ready.</p>"
  })
});

const result = await response.json();
console.log(result.id);`,

  typescript: `const response = await fetch("http://78.154.103.19:12083/api/emails/send", {
  method: "POST",
  headers: {
    "x-api-key": process.env.ENVOY_API_KEY,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    from: "hello@mail.yourdomain.com",
    to: ["user@example.com"],
    subject: "Welcome aboard!",
    html: "<h1>Hello!</h1><p>Your account is ready.</p>"
  })
});

const result: { id: string } = await response.json();
console.log(result.id);`,

  java: `import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.URI;

String body = """
    {
      "from": "hello@mail.yourdomain.com",
      "to": ["user@example.com"],
      "subject": "Welcome aboard!",
      "html": "<h1>Hello!</h1><p>Your account is ready.</p>"
    }
    """;

HttpClient client = HttpClient.newHttpClient();
HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create("http://78.154.103.19:12083/api/emails/send"))
    .header("x-api-key", System.getenv("ENVOY_API_KEY"))
    .header("Content-Type", "application/json")
    .POST(HttpRequest.BodyPublishers.ofString(body))
    .build();

HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
System.out.println(response.statusCode());`,

  kotlin: `import io.ktor.client.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*

val client = HttpClient()
val response: HttpResponse = client.post("http://78.154.103.19:12083/api/emails/send") {
    header("x-api-key", System.getenv("ENVOY_API_KEY"))
    header("Content-Type", "application/json")
    setBody("""
        {
          "from": "hello@mail.yourdomain.com",
          "to": ["user@example.com"],
          "subject": "Welcome aboard!",
          "html": "<h1>Hello!</h1><p>Your account is ready.</p>"
        }
    """)
}
println(response.status.value)`,

  csharp: `using System;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;

var client = new HttpClient();
var json = @"{""from"":""hello@mail.yourdomain.com"",""to"":[""user@example.com""],""subject"":""Welcome aboard!"",""html"":""<h1>Hello!</h1><p>Your account is ready.</p>""}";

var request = new HttpRequestMessage(HttpMethod.Post, "http://78.154.103.19:12083/api/emails/send");
request.Headers.Add("x-api-key", Environment.GetEnvironmentVariable("ENVOY_API_KEY"));
request.Content = new StringContent(json, Encoding.UTF8, "application/json");

var response = await client.SendAsync(request);
Console.WriteLine((int)response.StatusCode);`,

  rust: `use reqwest::Client;
use serde_json::json;
use std::env;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = Client::new();
    let res = client
        .post("http://78.154.103.19:12083/api/emails/send")
        .header("x-api-key", env::var("ENVOY_API_KEY")?)
        .json(&json!({
            "from": "hello@mail.yourdomain.com",
            "to": ["user@example.com"],
            "subject": "Welcome aboard!",
            "html": "<h1>Hello!</h1><p>Your account is ready.</p>"
        }))
        .send()
        .await?;

    println!("{}", res.status());
    Ok(())
}`,

  swift: `import Foundation

let url = URL(string: "http://78.154.103.19:12083/api/emails/send")!
var request = URLRequest(url: url)
request.httpMethod = "POST"
request.setValue(ProcessInfo.processInfo.environment["ENVOY_API_KEY"] ?? "", forHTTPHeaderField: "x-api-key")
request.setValue("application/json", forHTTPHeaderField: "Content-Type")
request.httpBody = try? JSONSerialization.data(withJSONObject: [
    "from": "hello@mail.yourdomain.com",
    "to": ["user@example.com"],
    "subject": "Welcome aboard!",
    "html": "<h1>Hello!</h1><p>Your account is ready.</p>"
])

let task = URLSession.shared.dataTask(with: request) { data, response, error in
    if let httpResponse = response as? HTTPURLResponse {
        print(httpResponse.statusCode)
    }
}
task.resume()`,

  dart: `import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;

void main() async {
  final response = await http.post(
    Uri.parse('http://78.154.103.19:12083/api/emails/send'),
    headers: {
      'x-api-key': Platform.environment['ENVOY_API_KEY'] ?? '',
      'Content-Type': 'application/json',
    },
    body: jsonEncode({
      'from': 'hello@mail.yourdomain.com',
      'to': ['user@example.com'],
      'subject': 'Welcome aboard!',
      'html': '<h1>Hello!</h1><p>Your account is ready.</p>',
    }),
  );
  print(response.statusCode);
}`,

  cpp: `#include <curl/curl.h>
#include <iostream>

int main() {
    CURL* curl = curl_easy_init();
    if (curl) {
        const char* key = std::getenv("ENVOY_API_KEY");
        std::string auth = std::string("x-api-key: ") + (key ? key : "");

        struct curl_slist* headers = nullptr;
        headers = curl_slist_append(headers, auth.c_str());
        headers = curl_slist_append(headers, "Content-Type: application/json");

        curl_easy_setopt(curl, CURLOPT_URL, "http://78.154.103.19:12083/api/emails/send");
        curl_easy_setopt(curl, CURLOPT_POST, 1L);
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
        curl_easy_setopt(curl, CURLOPT_POSTFIELDS,
            R"({"from":"hello@mail.yourdomain.com","to":["user@example.com"],"subject":"Welcome aboard!","html":"<h1>Hello!</h1><p>Your account is ready.</p>"})");

        curl_easy_perform(curl);
        curl_slist_free_all(headers);
        curl_easy_cleanup(curl);
    }
    return 0;
}`,

  elixir: `Mix.install([{:req, "~> 0.5"}])

body = %{
  from: "hello@mail.yourdomain.com",
  to: ["user@example.com"],
  subject: "Welcome aboard!",
  html: "<h1>Hello!</h1><p>Your account is ready.</p>"
}

Req.post!(
  "http://78.154.103.19:12083/api/emails/send",
  headers: [{"x-api-key", System.get_env("ENVOY_API_KEY")}],
  json: body
)`,
};

/* ─── Code renderer (plain, no color leaking) ───
 * Renders each snippet line as plain text. No line numbers, no dangerouslySetInnerHTML
 * and no color spans, so broken class text can never appear in the output.
 */
function highlight(code: string) {
  const lines = code.split('\n');
  return lines.map((line, i) => (
    <span key={i} className="block whitespace-pre">{line}</span>
  ));
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
  const rootRef = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setRevealed(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setRevealed(true);
            obs.disconnect();
          }
        }
      },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(SNIPPETS[active]).catch(() => {});
    setCopied(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), 2000);
  }, [active]);

  const selectLang = useCallback((id: LangId) => {
    setActive(id);
    setCopied(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return (
    <div ref={rootRef} className="mt-14 w-full max-w-3xl mx-auto">
      {/* Trust label */}
      <p className="mb-5 text-sm text-slate-500">
        Trusted by developers and teams worldwide
      </p>

      {/* Language tabs */}
      <div className={`flex flex-wrap items-center justify-center gap-1 transition-all duration-500 ease-out ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
        {LANGUAGES.map((lang) => (
          <button
            key={lang.id}
            onMouseEnter={() => selectLang(lang.id)}
            onClick={() => selectLang(lang.id)}
            className={`
              relative flex items-center px-4 py-2 text-sm font-medium transition-all duration-200
              ${active === lang.id
                ? 'text-white'
                : 'text-slate-300 hover:text-white'
              }
            `}
          >
            <span className="mr-1.5 inline-flex items-center text-xs">{lang.icon}</span>
            {lang.label}
            {active === lang.id && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 bg-brand" />
            )}
          </button>
        ))}
      </div>

      {/* Code block */}
      <div className={`mt-6 overflow-hidden border border-canvas-border bg-canvas/80 backdrop-blur-sm transition-all duration-700 ease-out delay-150 ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
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
          <code>{highlight(SNIPPETS[active])}</code>
        </pre>
      </div>

      {/* Install hint */}
      <p className="mt-4 text-center text-xs text-slate-600">
        Set your <code className="rounded bg-canvas-border/50 px-1.5 py-0.5 text-slate-400">ENVOY_API_KEY</code> environment variable to your API key from the{' '}
        <a href="/overview/api-keys" className="text-brand hover:underline">dashboard</a>
      </p>
    </div>
  );
}
