import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "@/App";
import { ToastProvider } from "@/components/ui/toast";
import { applyTheme, getStoredTheme } from "@/features/settings/theme";
import "@/index.css";

applyTheme(getStoredTheme());

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>,
);
