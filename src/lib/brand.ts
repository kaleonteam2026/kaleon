/** Static files live in project `dist/` and are served at the site root. */
export function staticAsset(file: string): string {
  const base = import.meta.env.BASE_URL;
  const path = file.replace(/^\//, "");
  return `${base}${path}`;
}

export const KALEON_LOGO_SRC = staticAsset("logo.svg");

/** Nav header mark — SVG has a large viewBox; always constrain rendered size. */
export const NAV_LOGO_SIZE_PX = 24;

export const NAV_ICON_SRC = {
  courses: { default: staticAsset("courses.png"), active: staticAsset("coursesgreen.png") },
  pathways: { default: staticAsset("pathways.png"), active: staticAsset("pathwaysgreen.png") },
  progress: { default: staticAsset("progress.png"), active: staticAsset("progressgreen.png") },
} as const;
