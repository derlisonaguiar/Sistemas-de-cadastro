"use client";
import { useEffect } from "react";
export default function OrganizationFavicon({ href }: { href: string | null | undefined }) {
  useEffect(() => {
    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }

    link.href = href ?? "/favicon.ico";
  }, [href]);

  return null;
}
