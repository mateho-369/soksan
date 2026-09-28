export default function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand-lockup" aria-label="SokSan Network">
      <svg className="lotus-mark" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <path d="M24 35C17.4 30.5 15.2 23.8 24 10c8.8 13.8 6.6 20.5 0 25Z" fill="currentColor" opacity=".9" />
        <path d="M22 37C13.6 36.1 8.7 30.9 10 19.2c9 4.1 12.2 10 12 17.8Z" fill="currentColor" opacity=".64" />
        <path d="M26 37c8.4-.9 13.3-6.1 12-17.8-9 4.1-12.2 10-12 17.8Z" fill="currentColor" opacity=".64" />
        <path d="M8 38.4c9.9 2.5 22.1 2.5 32 0" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      {!compact && (
        <div>
          <strong>SokSan</strong>
          <span>សុខសាន្ត</span>
        </div>
      )}
    </div>
  );
}
