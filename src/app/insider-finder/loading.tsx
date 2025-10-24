export default function InsiderLoading() {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">Insider Finder</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="border rounded-lg p-3 animate-pulse">
              <div className="flex items-start gap-3">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 rounded bg-muted w-3/4" />
                  <div className="h-3 rounded bg-muted w-2/3" />
                  <div className="h-3 rounded bg-muted w-1/2" />
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="h-4 bg-muted rounded" />
                <div className="h-4 bg-muted rounded" />
                <div className="h-4 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


