import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./i18n/config";
import { installMockApi } from "./mocks/mock-api";

installMockApi();

createRoot(document.getElementById("root")!).render(<App />);
