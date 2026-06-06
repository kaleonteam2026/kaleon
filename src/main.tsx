import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import App from "./App";
import "./index.css";
import { initEnglishDocument } from "@/lib/copy";

initEnglishDocument();

// Mock API only runs in dev with VITE_AUTH_BYPASS=true — real Supabase users skip it
if (import.meta.env.VITE_AUTH_BYPASS === "true") {
  import("./mocks/mock-api").then(({ installMockApi }) => installMockApi());
}

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
    <App />
  </ThemeProvider>,
);
