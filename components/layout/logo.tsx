import Link from 'next/link';

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-2 font-semibold ${className ?? ''}`}>
      <span
        className="w-9 h-9 rounded-lg bg-accent text-accent-foreground grid place-items-center text-sm font-bold"
        aria-hidden="true"
      >
        P
      </span>
      <span>PlanMiJubilacion</span>
    </Link>
  );
}
