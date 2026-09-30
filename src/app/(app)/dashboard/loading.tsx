export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <div className="skeleton h-9 w-72" />
        <div className="skeleton mt-3 h-4 w-96" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-24 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton h-56 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
