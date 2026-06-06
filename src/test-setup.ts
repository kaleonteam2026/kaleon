/**
 * Global test setup for Vitest browser-mode tests.
 *
 * This runs once before all tests in each browser instance.
 * - Installs the mock API so all `/api/` fetch calls return canned data.
 * - Imports global CSS for component rendering.
 */
import { installMockApi } from "./mocks/mock-api";
import "./index.css";

installMockApi();
