export default function ProjectLoading() {
  return (
    <div className="animate-fade-in">
      <div className="skeleton h-4 w-32" />
      <div className="skeleton mt-3 h-10 w-96" />
      <div className="skeleton mt-6 h-9 w-full max-w-md" />
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <div className="skeleton h-40 rounded-2xl" />
          <div className="skeleton h-72 rounded-2xl" />
        </div>
        <div className="space-y-5">
          <div className="skeleton h-44 rounded-2xl" />
          <div className="skeleton h-44 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
