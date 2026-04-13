import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>¡Gracias por registrarte!</CardTitle>
              <CardDescription>Revisa tu correo para confirmar la cuenta</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Tu cuenta está casi lista. Abre el enlace que te enviamos por
                correo para confirmarla antes de iniciar sesión.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
