import type { CSSProperties } from "react";

type OrganizationColors = { primaryColor: string; secondaryColor: string };

function normalizedHex(color: string) {
  const value = color.trim();
  if (/^#[\da-f]{6}$/i.test(value)) return value;
  if (/^#[\da-f]{3}$/i.test(value)) {
    return `#${value.slice(1).split("").map(channel => channel + channel).join("")}`;
  }
  return null;
}

function luminance(hex: string) {
  const channels = hex.replace("#", "").match(/.{2}/g)!.map(value => {
    const channel = parseInt(value, 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

export function adminThemeStyle({ primaryColor, secondaryColor }: OrganizationColors): CSSProperties {
  const primaryHex = normalizedHex(primaryColor);
  const secondaryHex = normalizedHex(secondaryColor);
  const primary = primaryHex ? luminance(primaryHex) : 0;
  const secondary = secondaryHex ? luminance(secondaryHex) : 1;
  const contrast = (Math.max(primary, secondary) + 0.05) / (Math.min(primary, secondary) + 0.05);
  // Preserve the secondary color for text when legible; otherwise derive a contrasting neutral.
  const neutral = primary > 0.179 ? 0 : 255;
  return {
    "--admin-primary": primaryHex ?? "var(--foreground)",
    "--admin-secondary": secondaryHex ?? "var(--background)",
    "--admin-on-primary": contrast >= 4.5 ? secondaryHex ?? "var(--background)" : `rgb(${neutral} ${neutral} ${neutral})`,
  } as CSSProperties;
}

// Visual refresh only, after organization settings have been saved successfully.
export function applyAdminTheme(colors: OrganizationColors) {
  const shell = document.querySelector<HTMLElement>(".admin-shell");
  if (!shell) return;
  for (const [property, value] of Object.entries(adminThemeStyle(colors))) {
    shell.style.setProperty(property, String(value));
  }
}
