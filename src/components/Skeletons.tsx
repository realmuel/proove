/* Loading placeholders shown while a recipe or meal is being fetched. They
   mirror the real layout so the page settles in place rather than jumping from
   a line of text to the full content. */

const bar = "rounded bg-accent/10 animate-pulse";

function TopBarSkeleton() {
  return (
    <div className="flex items-center justify-between">
      <div className={`h-9 w-9 rounded-full ${bar}`} />
      <div className="flex items-center gap-2">
        <div className={`h-9 w-9 rounded-full ${bar}`} />
        <div className={`h-9 w-9 rounded-full ${bar}`} />
      </div>
    </div>
  );
}

export function RecipeSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading recipe">
      <TopBarSkeleton />
      <div className="flex flex-col gap-2">
        <div className={`h-8 w-2/3 ${bar}`} />
        <div className={`h-4 w-1/2 ${bar}`} />
      </div>
      <div className={`w-full h-72 rounded-xl ${bar}`} />
      <div className="flex gap-2">
        <div className={`h-7 w-24 rounded-full ${bar}`} />
        <div className={`h-7 w-24 rounded-full ${bar}`} />
        <div className={`h-7 w-16 rounded-full ${bar}`} />
      </div>
      <div className="flex flex-col gap-2">
        <div className={`h-6 w-32 ${bar}`} />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={`h-4 w-full ${bar}`} />
        ))}
      </div>
    </div>
  );
}

export function MealSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading meal">
      <TopBarSkeleton />
      <div className="flex flex-col gap-2">
        <div className={`h-8 w-2/3 ${bar}`} />
        <div className={`h-4 w-1/2 ${bar}`} />
      </div>
      <div className={`w-full h-72 rounded-xl ${bar}`} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className={`h-24 rounded-xl ${bar}`} />
        <div className={`h-24 rounded-xl ${bar}`} />
      </div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`h-4 w-full ${bar}`} />
        ))}
      </div>
    </div>
  );
}
