import Link from "next/link";
import { TutorialStep } from "./tutorial-step";
import { ArrowUpRight } from "lucide-react";

export function SignUpUserSteps() {
  return (
    <ol className="flex flex-col gap-6">
      {process.env.VERCEL_ENV === "preview" ||
      process.env.VERCEL_ENV === "production" ? (
        <TutorialStep title="Configura las URL de redirección">
          <p>Parece que esta app está alojada en Vercel.</p>
          <p className="mt-4">
            Este despliegue es{" "}
            <span className="tutorial-code">
              &quot;{process.env.VERCEL_ENV}&quot;
            </span>{" "}
            en{" "}
            <span className="tutorial-code">
              https://{process.env.VERCEL_URL}
            </span>
            .
          </p>
          <p className="mt-4">
            Debes{" "}
            <Link
              className="text-primary hover:text-foreground"
              href={
                "https://supabase.com/dashboard/project/_/auth/url-configuration"
              }
            >
              actualizar tu proyecto en Supabase
            </Link>{" "}
            con las URL de redirección de tu despliegue en Vercel.
          </p>
          <ul className="mt-4">
            <li>
              -{" "}
              <span className="tutorial-code">
                http://localhost:3000/**
              </span>
            </li>
            <li>
              -{" "}
              <span className="tutorial-code">
                {`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}/**`}
              </span>
            </li>
            <li>
              -{" "}
              <span className="tutorial-code">
                {`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL?.replace(
                  ".vercel.app",
                  "",
                )}-*-[url-equipo-vercel].vercel.app/**`}
              </span>{" "}
              (la URL del equipo está en{" "}
              <Link
                className="text-primary hover:text-foreground"
                href="https://vercel.com/docs/accounts/create-a-team#find-your-team-id"
                target="_blank"
              >
                la configuración del equipo en Vercel
              </Link>
              )
            </li>
          </ul>
          <Link
            href="https://supabase.com/docs/guides/auth/redirect-urls#vercel-preview-urls"
            target="_blank"
            className="text-primary/50 hover:text-primary flex items-center text-sm gap-1 mt-4"
          >
            Documentación sobre URL de redirección <ArrowUpRight size={14} />
          </Link>
        </TutorialStep>
      ) : null}
      <TutorialStep title="Registra tu primer usuario">
        <p>
          Ve a{" "}
          <Link
            href="auth/sign-up"
            className="font-bold hover:underline text-foreground/80"
          >
            Crear cuenta
          </Link>{" "}
          y registra tu primer usuario. Puede ser solo tú al principio: cuando
          el producto crezca, vendrán más.
        </p>
      </TutorialStep>
    </ol>
  );
}
