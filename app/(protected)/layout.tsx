import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-10 items-center">
        <SiteNav />
        <div className="flex-1 flex flex-col gap-10 max-w-5xl p-5 w-full">
          {children}
        </div>
        <SiteFooter />
      </div>
    </main>
  );
}
