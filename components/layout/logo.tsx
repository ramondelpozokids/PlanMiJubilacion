import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';

type LogoProps = {
  className?: string;
  href?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'home';
  priority?: boolean;
};

/**
 * Logo oficial: /logo1.png
 * `home` = tamaño grande solo en la portada; resto de páginas usan sm–xl.
 */
const SIZES = {
  sm: { width: 220, height: 40, img: 'h-9 w-auto' },
  md: { width: 280, height: 50, img: 'h-11 w-auto' },
  lg: { width: 360, height: 64, img: 'h-12 w-auto md:h-14' },
  xl: { width: 440, height: 78, img: 'h-14 w-auto sm:h-16' },
  home: { width: 640, height: 114, img: 'h-[4.5rem] w-auto sm:h-24 md:h-[6.5rem]' },
} as const;

export function Logo({
  className,
  href = '/',
  size = 'lg',
  priority = false,
}: LogoProps) {
  const s = SIZES[size];

  return (
    <Link
      href={href}
      className={cn('inline-flex items-center shrink-0', className)}
      aria-label="PlanMiJubilación — Inicio"
    >
      <Image
        src="/logo1.png"
        alt="PlanMiJubilación"
        width={s.width}
        height={s.height}
        className={cn(s.img, 'object-contain object-left')}
        priority={priority}
        unoptimized
      />
    </Link>
  );
}
