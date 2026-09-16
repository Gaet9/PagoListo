type SubscriptionLoadErrorBannerProps = {
  message: string;
};

export function SubscriptionLoadErrorBanner({ message }: SubscriptionLoadErrorBannerProps) {
  return (
    <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
      No se pudo verificar tu suscripción. Podés seguir usando la app, pero si el problema persiste contactá
      soporte.
      <p className="mt-2 text-muted-foreground">{message}</p>
    </div>
  );
}
