import React from "react";
import { useAuth } from "./AuthProvider.jsx";
import { signInWithEmail, signUpWithEmail, signInWithDiscord } from "./authClient.js";
import { extractLoginTemplateParts } from "./loginTemplateParts.js";
import loginTemplate from "./loginTemplate.html?raw";
import "../styles/login.css";

const LOGIN_THEMES = [
  {
    id: "ember",
    label: "Ember Forge",
    description: "Warm forge glow and minion energy.",
    swatch: "ember"
  },
  {
    id: "arcane",
    label: "Arcane Night",
    description: "Blue-purple magic layer.",
    swatch: "arcane"
  },
  {
    id: "grove",
    label: "Grove",
    description: "Soft nature automation realm.",
    swatch: "grove"
  }
];

function usePersistentTheme(rootRef) {
  const [theme, setTheme] = React.useState(() => {
    if (typeof window === "undefined") return "ember";
    return window.localStorage.getItem("hades.theme") || "ember";
  });

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("hades.theme", theme);
    if (rootRef.current) rootRef.current.dataset.theme = theme;
  }, [theme, rootRef]);

  return [theme, setTheme];
}

export function LoginPage() {
  const { supabase } = useAuth();
  const rootRef = React.useRef(null);
  const parts = React.useMemo(() => extractLoginTemplateParts(loginTemplate), []);
  const [theme, setTheme] = usePersistentTheme(rootRef);

  React.useEffect(() => {
    if (!rootRef.current) return undefined;

    const root = rootRef.current;
    const controller = new AbortController();
    const frames = Array.from(root.querySelectorAll(".bg-frame"));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let intervalId = null;
    let current = 0;
    let ready = 0;

    const show = (index) => {
      frames.forEach((frame, frameIndex) => frame.classList.toggle("active", frameIndex === index));
    };

    const start = () => {
      if (reduced || frames.length <= 1) return;
      intervalId = window.setInterval(() => {
        current = (current + 1) % frames.length;
        show(current);
      }, 1000);
    };

    if (frames.length) {
      show(0);
      frames.forEach((frame) => {
        if (frame.complete) {
          ready += 1;
          if (ready === frames.length) start();
          return;
        }

        const onReady = () => {
          ready += 1;
          if (ready === frames.length) start();
        };

        frame.addEventListener("load", onReady, { once: true, signal: controller.signal });
        frame.addEventListener("error", onReady, { once: true, signal: controller.signal });
      });
    }

    const sheet = root.querySelector(".theme-sheet");
    const openBtn = root.querySelector(".theme-btn");
    const closeBtn = root.querySelector(".close-theme");
    const options = Array.from(root.querySelectorAll(".theme-option"));
    const emailInput = root.querySelector('input[type="email"]');
    const passwordInput = root.querySelector('input[type="password"]');
    const cta = root.querySelector(".cta");
    const forgotLink = root.querySelector('a[href="#forgot-password"]');
    const signupLink = root.querySelector('a[href="#sign-up"]');
    const discordButton = root.querySelector(".social.discord");
    const comingSoonButtons = Array.from(root.querySelectorAll(".social:not(.discord)"));

    const toggleSheet = (showSheet) => {
      if (!sheet) return;
      sheet.classList.toggle("show", showSheet);
    };

    const setThemeChoice = (nextTheme) => {
      setTheme(nextTheme);
      const selected = LOGIN_THEMES.find((choice) => choice.id === nextTheme);
      options.forEach((option) => option.classList.toggle("active", option.dataset.themeChoice === nextTheme));
      if (selected) {
        document.documentElement.dataset.theme = selected.id;
      }
      toggleSheet(false);
    };

    const handleDiscordSignIn = async () => {
      if (!supabase) {
        window.alert("Supabase auth is not configured yet.");
        return;
      }
      const { error } = await signInWithDiscord(supabase);
      if (error) window.alert(error.message);
    };

    const handleEmailSignIn = async () => {
      if (!supabase) {
        window.alert("Supabase auth is not configured yet.");
        return;
      }
      const email = emailInput?.value?.trim() || "";
      const password = passwordInput?.value || "";
      if (!email || !password) {
        window.alert("Enter an email and password first.");
        return;
      }
      const { error } = await signInWithEmail(supabase, email, password);
      if (error) window.alert(error.message);
    };

    const handleEmailSignUp = async (event) => {
      event.preventDefault();
      if (!supabase) {
        window.alert("Supabase auth is not configured yet.");
        return;
      }
      const email = emailInput?.value?.trim() || "";
      const password = passwordInput?.value || "";
      if (!email || !password) {
        window.alert("Enter an email and password first.");
        return;
      }
      const { error } = await signUpWithEmail(supabase, email, password);
      if (error) window.alert(error.message);
    };

    const resetPassword = async (event) => {
      event.preventDefault();
      if (!supabase) {
        window.alert("Supabase auth is not configured yet.");
        return;
      }
      const email = emailInput?.value?.trim() || "";
      if (!email) {
        window.alert("Enter your email first.");
        return;
      }
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin
      });
      if (error) window.alert(error.message);
      else window.alert("Password reset link sent.");
    };

    const onKeydown = (event) => {
      if (event.key === "Enter" && event.target && (event.target.matches('input[type="email"]') || event.target.matches('input[type="password"]'))) {
        event.preventDefault();
        void handleEmailSignIn();
      }
    };

    const openThemeSheet = () => toggleSheet(true);
    const closeThemeSheet = () => toggleSheet(false);

    openBtn?.addEventListener("click", openThemeSheet, { signal: controller.signal });
    closeBtn?.addEventListener("click", closeThemeSheet, { signal: controller.signal });
    sheet?.addEventListener("click", (event) => {
      if (event.target === sheet) closeThemeSheet();
    }, { signal: controller.signal });
    options.forEach((option) => option.addEventListener("click", () => setThemeChoice(option.dataset.themeChoice || "ember"), { signal: controller.signal }));
    cta?.addEventListener("click", handleEmailSignIn, { signal: controller.signal });
    discordButton?.addEventListener("click", handleDiscordSignIn, { signal: controller.signal });
    comingSoonButtons.forEach((button) => button.addEventListener("click", () => window.alert("This provider will be enabled later."), { signal: controller.signal }));
    forgotLink?.addEventListener("click", resetPassword, { signal: controller.signal });
    signupLink?.addEventListener("click", handleEmailSignUp, { signal: controller.signal });
    root.addEventListener("keydown", onKeydown, { signal: controller.signal });

    return () => {
      if (intervalId) window.clearInterval(intervalId);
      controller.abort();
    };
  }, [parts.frames.length, supabase, theme]);

  return (
    <div ref={rootRef} className="login-root">
      <div dangerouslySetInnerHTML={{ __html: parts.body }} />
    </div>
  );
}
