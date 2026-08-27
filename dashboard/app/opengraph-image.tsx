import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'E-NVOY — Free Open Source Email Sending Service';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Auto-generated social share image (referenced automatically by Next.js as
// og:image / twitter:image for every route). Edit the markup below to match
// your branding.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: 'linear-gradient(135deg, #0b1120 0%, #1e293b 100%)',
          color: '#ffffff',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: 88,
            fontWeight: 800,
            letterSpacing: '-2px',
          }}
        >
          E-NVOY
        </div>
        <div style={{ marginTop: 28, fontSize: 44, color: '#94a3b8', fontWeight: 600 }}>
          Free Open Source Email Sending Service
        </div>
        <div style={{ marginTop: 20, fontSize: 30, color: '#64748b' }}>
          SMTP relay &nbsp;·&nbsp; REST API &nbsp;·&nbsp; Real-time delivery tracking
        </div>
      </div>
    ),
    { ...size }
  );
}
