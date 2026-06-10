import { useModuleHealth } from "../hooks/use-module-health.js";

export function ModuleHealthCard() {
  const { data, error, loading } = useModuleHealth();

  if (loading) return <p>Checking backend…</p>;
  if (error) return <p>Backend unavailable: {error.message}</p>;

  return (
    <p>
      Backend health: <code>{data?.status}</code> ({data?.module})
    </p>
  );
}
