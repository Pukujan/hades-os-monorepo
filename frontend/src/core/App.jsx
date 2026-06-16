import React from "react";
import { AuthProvider, useAuth } from "../auth/AuthProvider.jsx";
import { LoginPage } from "../auth/LoginPage.jsx";

const HadesPrototypeApp = React.lazy(() => import("../modules/hades/pages/HadesPrototypeApp"));

function AuthSwitch() {
  const { loading, session } = useAuth();
  const [authView, setAuthView] = React.useState("signin");

  if (loading) {
    return null;
  }

  if (session) {
    if (authView !== "signin") setAuthView("signin");
    return (
      <React.Suspense fallback={null}>
        <HadesPrototypeApp />
      </React.Suspense>
    );
  }

  return <LoginPage view={authView} onNavigate={setAuthView} />;
}

export function App() {
  return (
    <AuthProvider>
      <AuthSwitch />
    </AuthProvider>
  );
}
