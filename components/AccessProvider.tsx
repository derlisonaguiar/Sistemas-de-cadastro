"use client";
import { createContext, useContext, type ReactNode } from "react";
const AdminContext = createContext(false);
export function useIsAdmin() { return useContext(AdminContext); }
export function AccessProvider({ isAdmin, children }: { isAdmin: boolean; children: ReactNode }) {
  return <AdminContext.Provider value={isAdmin}>{children}</AdminContext.Provider>;
}
export function AdminOnly({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  return useContext(AdminContext) ? children : fallback;
}
