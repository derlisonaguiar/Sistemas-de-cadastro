"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";

export type DashboardNotification = {
  title: string;
  description: string;
  href: string;
  count: number;
};

export default function DashboardNotifications({ notifications }: { notifications: DashboardNotification[] }) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const pending = notifications.filter((notification) => notification.count > 0);
  const total = pending.reduce((sum, notification) => sum + notification.count, 0);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (container.current && !container.current.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <div ref={container} className="relative">
      <button
        type="button"
        aria-label="Abrir notificações"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:border-[var(--admin-accent-border)] hover:bg-[var(--admin-soft)] hover:text-[var(--admin-ink)]"
      >
        <Bell aria-hidden="true" size={20} strokeWidth={1.8} />
        {total > 0 && (
          <span className="absolute -right-1 -top-1 flex min-w-5 h-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white shadow-sm">
            {total}
          </span>
        )}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Central de notificações"
          className="absolute right-0 z-30 mt-3 w-[min(22rem,calc(100vw-2rem))] origin-top-right rounded-xl border border-gray-200 bg-white p-2 shadow-xl transition duration-150"
        >
          <div className="flex items-center justify-between px-3 py-2">
            <div>
              <p className="text-sm font-semibold text-gray-900">Notificações</p>
              <p className="text-xs text-gray-500">Pendências administrativas atuais</p>
            </div>
            {total > 0 && (
              <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">{total}</span>
            )}
          </div>
          {pending.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-gray-500">Nenhuma pendência no momento</p>
          ) : (
            <div className="border-t border-gray-100 pt-1">
              {pending.map((notification) => (
                <Link
                  key={notification.title}
                  href={notification.href}
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-3 rounded-lg px-3 py-3 transition hover:bg-[var(--admin-soft)]"
                >
                  <span className="mt-0.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-amber-50 px-1 text-xs font-bold text-amber-700">
                    {notification.count}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-gray-800">{notification.title}</span>
                    <span className="mt-1 block text-xs leading-5 text-gray-500">{notification.description}</span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
