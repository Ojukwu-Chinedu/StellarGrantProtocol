/**
 * Leaderboard — Loading Skeleton
 *
 * Next.js App Router automatic Suspense boundary.
 * Mirrors the leaderboard page: header + ranked rows.
 */

export default function LeaderboardLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page header */}
      <div className="mb-8 space-y-3">
        <div className="shimmer h-3 w-28 rounded-none" />
        <div className="shimmer h-9 w-48 rounded-none" />
        <div className="shimmer h-4 w-72 rounded-none" />
      </div>

      {/* Leaderboard rows */}
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="shimmer h-16 w-full rounded-none" />
        ))}
      </div>
    </div>
  );
}
