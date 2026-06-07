/**
 * Smoke tests for the Vitest + Playwright browser-mode test setup.
 *
 * The test-setup.ts installs the mock API (all /api/ calls return canned data)
 * and VITE_AUTH_BYPASS is "true" in the vitest config, so every test runs
 * with:
 *   - A fake "Dev" user already authenticated
 *   - All API endpoints returning controlled mock responses
 *   - Real browser APIs (localStorage, fetch, etc.)
 */
import { describe, it, expect, vi } from "vitest";

// ---------------------------------------------------------------------------
// 1. Mock API — verify the mock intercepts fetch calls as expected
// ---------------------------------------------------------------------------
describe("Mock API", () => {
  it("returns the dev auth user", async () => {
    const res = await fetch("/api/auth/user");
    const data = await res.json();
    expect(data.user.email).toBe("dev@local");
    expect(data.user.firstName).toBe("Dev");
  });

  it("returns a hardcoded profile", async () => {
    const res = await fetch("/api/profiles/1");
    const data = await res.json();
    expect(data.fullName).toBe("Dev User");
    expect(data.communityCollege).toBe("Pasadena City College");
  });

});

// ---------------------------------------------------------------------------
// 2. Env vars — VITE_AUTH_BYPASS is set from vitest config
// ---------------------------------------------------------------------------
describe("Auth bypass", () => {
  it("exposes the VITE_AUTH_BYPASS env var", () => {
    expect(import.meta.env.VITE_AUTH_BYPASS).toBe("true");
  });

  it("provides a working localStorage (browser runtime)", () => {
    localStorage.setItem("kaleon_test", "works");
    expect(localStorage.getItem("kaleon_test")).toBe("works");
    localStorage.removeItem("kaleon_test");
  });
});

// ---------------------------------------------------------------------------
// 3. AuthProvider — provides the dev user in bypass mode
// ---------------------------------------------------------------------------
describe("AuthProvider dev user", () => {
  it("provides dev user via useAuth", async () => {
    const { AuthProvider, useAuth } = await import("@/contexts/auth-context");
    const container = document.createElement("div");
    document.body.appendChild(container);

    function TestComp() {
      const { isAuthenticated, user, isLoading } = useAuth();
      if (isLoading) return <div data-testid="loading" />;
      return (
        <div>
          <div data-testid="status">{isAuthenticated ? "ok" : "no"}</div>
          <div data-testid="email">{user?.email}</div>
        </div>
      );
    }

    const { createRoot } = await import("react-dom/client");
    const root = createRoot(container);
    root.render(
      <AuthProvider>
        <TestComp />
      </AuthProvider>,
    );

    await vi.waitFor(
      () => {
        expect(container.querySelector('[data-testid="status"]')?.textContent).toBe("ok");
      },
      { timeout: 3000 },
    );

    expect(container.querySelector('[data-testid="email"]')?.textContent).toBe("dev@local");
    root.unmount();
    document.body.removeChild(container);
  });
});
