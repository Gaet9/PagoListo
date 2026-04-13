import { TutorialStep } from "./tutorial-step";
import { CodeBlock } from "./code-block";

const create = `create table notes (
  id bigserial primary key,
  title text
);

insert into notes(title)
values
  ('Today I created a Supabase project.'),
  ('I added some data and queried it from Next.js.'),
  ('It was awesome!');
`.trim();

const rls = `alter table notes enable row level security;
create policy "Allow public read access" on notes
for select
using (true);`.trim();

const server = `import { createClient } from '@/lib/supabase/server'

export default async function Page() {
  const supabase = await createClient()
  const { data: notes } = await supabase.from('notes').select()

  return <pre>{JSON.stringify(notes, null, 2)}</pre>
}
`.trim();

const client = `'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export default function Page() {
  const [notes, setNotes] = useState<any[] | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const getData = async () => {
      const { data } = await supabase.from('notes').select()
      setNotes(data)
    }
    getData()
  }, [])

  return <pre>{JSON.stringify(notes, null, 2)}</pre>
}
`.trim();

export function FetchDataSteps() {
  return (
    <ol className="flex flex-col gap-6">
      <TutorialStep title="Crea tablas e inserta datos de prueba">
        <p>
          Abre el{" "}
          <a
            href="https://supabase.com/dashboard/project/_/editor"
            className="font-bold hover:underline text-foreground/80"
            target="_blank"
            rel="noreferrer"
          >
            editor de tablas
          </a>{" "}
          de tu proyecto y crea una tabla con datos de ejemplo. Si quieres
          algo rápido, pega lo siguiente en el{" "}
          <a
            href="https://supabase.com/dashboard/project/_/sql/new"
            className="font-bold hover:underline text-foreground/80"
            target="_blank"
            rel="noreferrer"
          >
            editor SQL
          </a>{" "}
          y pulsa ejecutar.
        </p>
        <CodeBlock code={create} />
      </TutorialStep>

      <TutorialStep title="Activa Row Level Security (RLS)">
        <p>
          Supabase usa RLS para proteger los datos. Para leer la tabla{" "}
          <code>notes</code> desde el cliente necesitas una política. Puedes
          hacerlo desde el editor de tablas o con SQL en el{" "}
          <a
            href="https://supabase.com/dashboard/project/_/sql/new"
            className="font-bold hover:underline text-foreground/80"
            target="_blank"
            rel="noreferrer"
          >
            editor SQL
          </a>
          .
        </p>
        <p>Por ejemplo, lectura pública para pruebas:</p>
        <CodeBlock code={rls} />
        <p>
          Más información en la{" "}
          <a
            href="https://supabase.com/docs/guides/auth/row-level-security"
            className="font-bold hover:underline text-foreground/80"
            target="_blank"
            rel="noreferrer"
          >
            documentación de Supabase sobre RLS
          </a>
          .
        </p>
      </TutorialStep>

      <TutorialStep title="Consulta datos desde Next.js">
        <p>
          Para usar el cliente de Supabase en un Server Component, crea{" "}
          <span className="tutorial-code">
            /app/notes/page.tsx
          </span>{" "}
          con algo como:
        </p>
        <CodeBlock code={server} />
        <p>También puedes hacerlo desde un Client Component.</p>
        <CodeBlock code={client} />
      </TutorialStep>

      <TutorialStep title="Explora la librería UI de Supabase">
        <p>
          Visita la{" "}
          <a
            href="https://supabase.com/ui"
            className="font-bold hover:underline text-foreground/80"
          >
            librería UI de Supabase
          </a>{" "}
          e instala bloques listos. Por ejemplo, chat en tiempo real:
        </p>
        <CodeBlock
          code={
            "npx shadcn@latest add https://supabase.com/ui/r/realtime-chat-nextjs.json"
          }
        />
      </TutorialStep>

      <TutorialStep title="¡A construir!">
        <p>Ya puedes seguir desarrollando tu producto. 🚀</p>
      </TutorialStep>
    </ol>
  );
}
