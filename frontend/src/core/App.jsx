import React from "react";
import { HadesPrototypeApp } from "../modules/hades/HadesPrototypeApp.jsx";
import { AuthProvider, useAuth } from "../auth/AuthProvider.jsx";
import { LoginPage } from "../auth/LoginPage.jsx";

function AuthSwitch() {
  const { loading, session } = useAuth();

  if (loading) {
    return null;
  }

  return session ? <HadesPrototypeApp /> : <LoginPage />;
}

export function App() {
  return (
    <AuthProvider>
      <AuthSwitch />
    </AuthProvider>
  );
}
