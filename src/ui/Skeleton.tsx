/**
 * Skeleton screens with a shimmer sweep — the only loading visual allowed
 * in feeds and discovery panels (no blank flashes, no lone spinners over
 * empty space). Shapes are layout-accurate copies of the real cards so
 * loading causes zero Cumulative Layout Shift (CLS) when content arrives.
 */
export function FeedCardSkeleton() {
  return (
    <div className="feed-card-skel" aria-hidden="true">
      <div className="feed-card-skel-body">
        <div className="feed-card-skel-row">
          <span className="skel" style={{ width: 42, height: 42, borderRadius: '50%' }} />
          <div style={{ flex: 1, display: 'grid', gap: 7 }}>
            <span className="skel" style={{ width: '45%', height: 13 }} />
            <span className="skel" style={{ width: '32%', height: 11 }} />
          </div>
        </div>
        <span className="skel" style={{ width: '92%', height: 13 }} />
        <span className="skel" style={{ width: '70%', height: 13 }} />
      </div>
      <div className="feed-card-skel-media skel" />
      <div className="feed-card-skel-body" style={{ paddingTop: 12 }}>
        <span className="skel" style={{ width: '58%', height: 34, borderRadius: 999 }} />
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

export function DestinationListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="destination-list" role="status" aria-label="Loading">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="destination-card destination-card-skel" aria-hidden="true">
          <span className="skel" style={{ width: '100%', height: 124, borderRadius: 14 }} />
          <div className="destination-card-body" style={{ gap: 8, justifyContent: 'center' }}>
            <span className="skel" style={{ width: '48%', height: 11 }} />
            <span className="skel" style={{ width: '78%', height: 16 }} />
            <span className="skel" style={{ width: '92%', height: 12 }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto' }}>
              <span className="skel" style={{ width: '36%', height: 11 }} />
              <span className="skel" style={{ width: '24%', height: 12 }} />
            </div>
          </div>
        </div>
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
