'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" className="text-2xl shrink-0 text-white" aria-hidden="true">
    <path d="M0 0h24v24H0z" fill="none" />
    <path fill="currentColor" d="M10.825 22q-.675 0-1.162-.45t-.588-1.1L8.85 18.8q-.325-.125-.612-.3t-.563-.375l-1.55.65q-.625.275-1.25.05t-.975-.8l-1.175-2.05q-.35-.575-.2-1.225t.675-1.075l1.325-1Q4.5 12.5 4.5 12.337v-.675q0-.162.025-.337l-1.325-1Q2.675 9.9 2.525 9.25t.2-1.225L3.9 5.975q.35-.575.975-.8t1.25.05l1.55.65q.275-.2.575-.375t.6-.3l.225-1.65q.1-.65.588-1.1T10.825 2h2.35q.675 0 1.163.45t.587 1.1l.225 1.65q.325.125.613.3t.562.375l1.55-.65q.625-.275 1.25-.05t.975.8l1.175 2.05q.35.575.2 1.225t-.675 1.075l-1.325 1q.025.175.025.338v.674q0 .163-.05.338l1.325 1q.525.425.675 1.075t-.2 1.225l-1.2 2.05q-.35.575-.975.8t-1.25-.05l-1.5-.65q-.275.2-.575.375t-.6.3l-.225 1.65q-.1.65-.587 1.1t-1.163.45zm1.225-6.5q1.45 0 2.475-1.025T15.55 12t-1.025-2.475T12.05 8.5q-1.475 0-2.488 1.025T8.55 12t1.013 2.475T12.05 15.5" />
  </svg>
);

const WebhookIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" className="text-2xl shrink-0 text-white" aria-hidden="true">
    <path d="M0 0h24v24H0z" fill="none" />
    <path fill="currentColor" d="M7 21q-2.075 0-3.537-1.463T2 16q0-1.825 1.138-3.187T6 11.1v2.075q-.875.3-1.437 1.075T4 16q0 1.25.875 2.125T7 19t2.125-.875T10 16v-1h5.875q.2-.225.488-.363T17 14.5q.625 0 1.063.438T18.5 16t-.437 1.063T17 17.5q-.35 0-.638-.137T15.876 17H11.9q-.35 1.725-1.713 2.863T7 21m10 0q-1.4 0-2.537-.687T12.675 18.5h2.675q.35.25.775.375T17 19q1.25 0 2.125-.875T20 16t-.875-2.125T17 13q-.5 0-.925.138t-.8.412l-3.05-5.075q-.525-.1-.875-.5T11 7q0-.625.438-1.062T12.5 5.5t1.063.438T14 7v.213q0 .087-.05.212l2.175 3.65q.2-.05.425-.062T17 11q2.075 0 3.538 1.463T22 16t-1.463 3.538T17 21M7 17.5q-.625 0-1.062-.437T5.5 16q0-.55.35-.95t.85-.525l2.35-3.9q-.725-.675-1.138-1.612T7.5 7q0-2.075 1.463-3.537T12.5 2t3.538 1.463T17.5 7h-2q0-1.25-.875-2.125T12.5 4t-2.125.875T9.5 7q0 1.075.65 1.888t1.65 1.037L8.425 15.55q.05.125.063.225T8.5 16q0 .625-.437 1.063T7 17.5" />
  </svg>
);

const TemplateIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" className="text-2xl shrink-0 text-white" aria-hidden="true">
    <path d="M0 0h24v24H0z" fill="none" />
    <path fill="currentColor" d="M4.75 4A2.75 2.75 0 0 0 2 6.75v10.5A2.75 2.75 0 0 0 4.75 20h6.748A6.5 6.5 0 0 1 22 12.81V6.75A2.75 2.75 0 0 0 19.25 4zM23 17.5a5.5 5.5 0 1 0-11 0a5.5 5.5 0 0 0 11 0m-5 .5l.001 2.503a.5.5 0 1 1-1 0V18h-2.505a.5.5 0 1 1 0-1H17v-2.5a.5.5 0 1 1 1 0V17h2.503a.5.5 0 1 1 0 1z" />
  </svg>
);

const LogIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" className="text-2xl shrink-0 text-white" aria-hidden="true">
    <path d="M0 0h24v24H0z" fill="none" />
    <path fill="currentColor" d="M3 19q-.825 0-1.412-.587T1 17V7q0-.825.588-1.412T3 5h10q.825 0 1.413.588T15 7v10q0 .825-.587 1.413T13 19zm14 0V5h2v14zm4 0V5h2v14z" />
  </svg>
);

const OverviewIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" className="text-2xl shrink-0 text-white" aria-hidden="true">
    <path d="M0 0h24v24H0z" fill="none" />
    <path fill="currentColor" d="M20 13.75a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 0-.75.75v6.75H14V4.25c0-.728-.002-1.2-.048-1.546c-.044-.325-.115-.427-.172-.484s-.159-.128-.484-.172C12.949 2.002 12.478 2 11.75 2s-1.2.002-1.546.048c-.325.044-.427.115-.484.172s-.128.159-.172.484c-.046.347-.048.818-.048 1.546V20.5H8V8.75A.75.75 0 0 0 7.25 8h-3a.75.75 0 0 0-.75.75V20.5H1.75a.75.75 0 0 0 0 1.5h20a.75.75 0 0 0 0-1.5H20z" />
  </svg>
);

const WorkerIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 48 48" className="text-2xl shrink-0 text-white" aria-hidden="true">
    <path d="M0 0h48v48H0z" fill="none" />
    <g fill="currentColor">
      <path d="M33.655 20.75h-8.172v19.615A1.64 1.64 0 0 1 23.848 42a1.64 1.64 0 0 1-1.635-1.635v-8.172h-3.269v8.172A1.64 1.64 0 0 1 17.31 42a1.64 1.64 0 0 1-1.635-1.635V20.75v7.467c-.899 0-3.675-1.711-3.675-5.925c0-3.176 2.776-4.81 3.675-4.81h17.98a1.64 1.64 0 0 1 1.635 1.634a1.64 1.64 0 0 1-1.635 1.634" />
      <path d="M34 11v30h-2V11z" />
      <path d="M26 15c0-1.657 3.134-3 7-3s7 1.343 7 3c-5-1.5-8.5-1.5-14 0" />
      <path fillRule="evenodd" d="M25 10.5h-1.902c.468.566.75 1.29.75 2.078a3.28 3.28 0 0 1-3.27 3.269a3.28 3.28 0 0 1-3.268-3.27c0-.787.282-1.511.75-2.077H16a4.5 4.5 0 1 1 9 0m-4.5-.5a1.5 1.5 0 1 0 0-3a1.5 1.5 0 0 0 0 3" clipRule="evenodd" />
    </g>
  </svg>
);

const ApiKeyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" className="text-2xl shrink-0 text-white" aria-hidden="true">
    <path d="M0 0h24v24H0z" fill="none" />
    <path fill="currentColor" d="M9.125 14.125Q10 13.25 10 12t-.875-2.125T7 9t-2.125.875T4 12t.875 2.125T7 15t2.125-.875M7 18q-2.5 0-4.25-1.75T1 12t1.75-4.25T7 6q2.025 0 3.538 1.15T12.65 10h8.375L23 11.975l-3.5 4L17 14l-2 2l-2-2h-.35q-.625 1.8-2.175 2.9T7 18" />
  </svg>
);

const AutomationIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" className="text-2xl shrink-0 text-white" aria-hidden="true">
    <path d="M0 0h24v24H0z" fill="none" />
    <path fill="currentColor" d="M7.4 17.25q-1.05.875-2.187.8t-1.988-.775t-1.162-1.837t.412-2.338L4.35 10q-.625-.55-.987-1.325T3 7q0-1.65 1.175-2.825T7 3t2.825 1.175T11 7T9.825 9.825T7 11q-.225 0-.45-.025t-.425-.075L4.2 14.15q-.275.45-.175.888t.425.712t.775.313t.875-.313l10.5-9.025q1.05-.875 2.2-.788t2 .788t1.15 1.838t-.425 2.337L19.65 14q.625.55.988 1.325T21 17q0 1.65-1.175 2.825T17 21t-2.825-1.175T13 17t1.175-2.825T17 13q.225 0 .438.025t.412.075l1.95-3.25q.275-.45.175-.888t-.425-.712t-.775-.312t-.875.312z" />
  </svg>
);

const DomainIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" className="text-2xl shrink-0 text-white" aria-hidden="true">
    <path d="M0 0h24v24H0z" fill="none" />
    <path fill="currentColor" d="M22 2H2v9h20zM7.004 5.5v2.004H5V5.5zM22 13H2v9h20zM7.004 16.5v2.004H5V16.5z" />
  </svg>
);

const navigation = [
  { name: 'Overview', href: '/overview', icon: <OverviewIcon /> },
  { name: 'API Keys', href: '/overview/api-keys', icon: <ApiKeyIcon /> },
  { name: 'Domains', href: '/overview/domains', icon: <DomainIcon /> },
  { name: 'Workers', href: '/overview/workers', icon: <WorkerIcon /> },
  { name: 'Logs', href: '/overview/logs', icon: <LogIcon /> },
  { name: 'Templates', href: '/overview/templates', icon: <TemplateIcon /> },
  { name: 'Webhooks', href: '/overview/webhooks', icon: <WebhookIcon /> },
  { name: 'Automation', href: '/overview/automation', icon: <AutomationIcon /> },
  { name: 'Settings', href: '/overview/settings', icon: <SettingsIcon /> },
];

export default function Sidebar({ className = '' }: { className?: string }) {
  const pathname = usePathname();

  return (
    <aside className={`h-full min-h-0 w-64 border-r-2 border-brand/40 bg-canvas flex flex-col shrink-0 overflow-hidden ${className}`}>
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-canvas-border px-6">
        <Link href="/overview" className="flex items-center gap-3">
          <img src="/logo-icon.svg" alt="E-NVOY" className="h-8 w-8" />
          <span className="bg-gradient-to-r from-brand-300 to-brand-500 bg-clip-text text-xl font-bold text-transparent">E-NVOY</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-hidden">
        {navigation.map((item) => {
          // Overview is the default landing page; it should only be carded when
          // we're exactly on it, not on its sub-pages. Other items are carded
          // when on their own route (including nested, e.g. domains/[id]).
          const isActive =
            item.href === '/overview'
              ? pathname === '/overview'
              : pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 text-base font-medium transition-colors ${
                isActive
                  ? 'bg-brand/20 text-white border border-brand/40 shadow-glow'
                  : 'text-slate-400 hover:text-white hover:bg-brand/10 hover:border hover:border-brand/20'
              }`}
            >
              {item.icon}
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}