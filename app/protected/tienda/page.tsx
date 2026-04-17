import { redirect } from "next/navigation";

export default function ProtectedTiendaRedirectPage() {
  redirect("/tiendas");
}

