import Link from "next/link";

import { ThemeSwitcher } from "@/components/theme-switcher";

export function SiteFooter() {
  return (
    <footer className="w-full flex flex-wrap items-center justify-center border-t mx-auto text-center text-xs gap-6 md:gap-8 py-12 px-4 text-muted-foreground">
      <Link href="/faq" className="underline-offset-4 hover:text-foreground hover:underline">
        Preguntas frecuentes
      </Link>
      <ThemeSwitcher />
    </footer>
  );
}
