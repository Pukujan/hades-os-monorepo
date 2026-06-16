import React from "react";
import { AuthProvider, useAuth } from "../auth/AuthProvider.jsx";
import { LoginPage } from "../auth/LoginPage.jsx";

const HADES_APP_PATH = "../modules/hades/pages/HadesPrototypeApp.jsx";

function AuthSwitch() {
  const { loading, session } = useAuth();
  const [authView, setAuthView] = React.useState("signin");

  if (loading) {
    return null;
  }

  if (session) {
    if (authView !== "signin") setAuthView("signin");
    return <HadesAppShell />;
  }

  return <LoginPage view={authView} onNavigate={setAuthView} />;
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
