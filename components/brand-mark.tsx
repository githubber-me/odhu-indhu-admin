export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand-lockup">
      <span className="brand-mark" aria-hidden="true">
        <span>ಒ</span>
      </span>
      {!compact && (
        <span className="brand-copy">
          <strong>Odhu Indhu</strong>
          <small>Admin console</small>
        </span>
      )}
    </div>
  );
}
