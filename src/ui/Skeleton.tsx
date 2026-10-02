/**
 * Skeleton screens with a shimmer sweep — the only loading visual allowed
 * in feeds (no blank flashes, no lone spinners over empty space).
 * Shapes are layout-accurate copies of the real cards so loading causes no
 * layout shift when content arrives.
 */
export function FeedCardSkeleton() {
  return (
    <div className="feed-card-skel" aria-hidden="true">
      <div className="feed-card-skel-media skel" />
      <div className="feed-card-skel-body">
        <div className="feed-card-skel-row">
          <span className="skel" style={{ width: 38, height: 38, borderRadius: '50%' }} />
          <div style={{ flex: 1, display: 'grid', gap: 7 }}>
            <span className="skel" style={{ width: '45%', height: 12 }} />
            <span className="skel" style={{ width: '30%', height: 10 }} />
          </div>
        </div>
        <span className="skel" style={{ width: '92%', height: 12 }} />
        <span className="skel" style={{ width: '70%', height: 12 }} />
        <span className="skel" style={{ width: '55%', height: 30, borderRadius: 999 }} />
      </div>
    </div>
  );
}

export function FeedSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className="feed-skel-list" role="status" aria-label="Loading">
      {Array.from({ length: count }, (_, index) => (
        <FeedCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function ListRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div role="status" aria-label="Loading" style={{ display: 'grid', gap: 12 }}>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span className="skel" style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'grid', gap: 7 }}>
            <span className="skel" style={{ width: '52%', height: 12 }} />
            <span className="skel" style={{ width: '82%', height: 10 }} />
          </div>
        </div>
      ))}
    </div>
  );
}
