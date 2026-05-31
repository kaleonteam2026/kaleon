import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import App from "./App";
import "./index.css";
import { initEnglishDocument } from "@/lib/copy";

initEnglishDocument();
import { installMockApi } from "./mocks/mock-api";

installMockApi();

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
    <App />
  </ThemeProvider>,
);
