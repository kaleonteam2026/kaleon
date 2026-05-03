import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./i18n/config";
import { installLocaleFetch } from "./i18n/fetch-locale";

installLocaleFetch();

createRoot(document.getElementById("root")!).render(<App />);
