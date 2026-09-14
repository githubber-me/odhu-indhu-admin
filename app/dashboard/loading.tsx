export default function DashboardLoading() {
  return (
    <main className="dashboard-loading" aria-label="Loading dashboard">
      <div className="loading-heading shimmer" />
      <div className="loading-subheading shimmer" />
      <div className="metric-grid loading-metrics">
        {[0, 1, 2, 3].map((item) => <div className="loading-card shimmer" key={item} />)}
      </div>
      <div className="loading-panel shimmer" />
    </main>
  );
}
