import React from "react";
import { AuthProvider, useAuth } from "../auth/AuthProvider.jsx";
import { LoginPage } from "../auth/LoginPage.jsx";

const HADES_APP_PATH = "../modules/hades/HadesPrototypeApp.jsx";

function AuthSwitch() {
  const { loading, session } = useAuth();

  if (loading) {
    return null;
  }

  return session ? <HadesAppShell /> : <LoginPage />;
}

function HadesAppShell() {
  const [Component, setComponent] = React.useState(null);

  React.useEffect(() => {
    import(HADES_APP_PATH).then((m) => {
      setComponent(() => m.HadesPrototypeApp);
    });
  }, []);

  return Component ? <Component /> : null;
}

export function App() {
  return (
    <AuthProvider>
      <AuthSwitch />
    </AuthProvider>
  );
}
