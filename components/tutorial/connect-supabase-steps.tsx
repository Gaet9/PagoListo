import { TutorialStep } from "./tutorial-step";

export function ConnectSupabaseSteps() {
  return (
    <ol className="flex flex-col gap-6">
      <TutorialStep title="Crea un proyecto en Supabase">
        <p>
          Ve a{" "}
          <a
            href="https://app.supabase.com/project/_/settings/api"
            target="_blank"
            className="font-bold hover:underline text-foreground/80"
            rel="noreferrer"
          >
            database.new
          </a>{" "}
          y crea un proyecto nuevo.
        </p>
      </TutorialStep>

      <TutorialStep title="Configura las variables de entorno">
        <p>
          Copia{" "}
          <span className="tutorial-code">
            .env.example
          </span>{" "}
          como{" "}
          <span className="tutorial-code">
            .env.local
          </span>{" "}
          y rellénalo con los valores de{" "}
          <a
            href="https://app.supabase.com/project/_/settings/api"
            target="_blank"
            className="font-bold hover:underline text-foreground/80"
            rel="noreferrer"
          >
            la API de tu proyecto Supabase
          </a>
          .
        </p>
      </TutorialStep>

      <TutorialStep title="Reinicia el servidor de desarrollo">
        <p>
          Cierra el servidor de Next.js y vuelve a ejecutar{" "}
          <span className="tutorial-code">
            npm run dev
          </span>{" "}
          para cargar las nuevas variables.
        </p>
      </TutorialStep>

      <TutorialStep title="Recarga la página">
        <p>
          A veces hace falta refrescar el navegador para que Next.js aplique los
          cambios.
        </p>
      </TutorialStep>
    </ol>
  );
}
