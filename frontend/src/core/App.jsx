import React from "react";
import { HadesApp } from "../modules/hades/HadesApp.jsx";
import { AuthProvider, useAuth } from "../auth/AuthProvider.jsx";
import { LoginPage } from "../auth/LoginPage.jsx";

function AuthSwitch() {
  const { loading, session } = useAuth();

  if (loading) {
    return null;
  }

  return session ? <HadesApp /> : <LoginPage />;
}

export function App() {
  return (
    <AuthProvider>
      <AuthSwitch />
    </AuthProvider>
  );
}
