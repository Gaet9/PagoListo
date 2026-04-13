import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import Link from "next/link";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-20 items-center">
        <SiteNav />
        <div className="w-full max-w-5xl px-5 flex gap-4 text-sm">
          <Link
            href="/protected"
            className="text-muted-foreground hover:text-foreground pb-2 border-b-2 border-transparent hover:border-muted-foreground/30"
          >
            Inicio
          </Link>
        </div>
        <div className="flex-1 flex flex-col gap-20 max-w-5xl p-5 w-full">
          {children}
        </div>
        <SiteFooter />
      </div>
    </main>
  );
}
