"use client";
import { createClient } from "@supabase/supabase-js";
import { useEffect, useRef, useState, type FormEvent } from "react";

export default function ResetPasswordPage() {
  const [client] = useState(() => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }));
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Validando link de recuperação...");
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const hash = new URLSearchParams(window.location.hash.slice(1));
    // Remove credentials from the address bar before any further navigation.
    window.history.replaceState(null, "", "/redefinir-senha");
    const access_token = hash.get("access_token");
    const refresh_token = hash.get("refresh_token");
    if (hash.get("type") !== "recovery" || !access_token || !refresh_token) {
      Promise.resolve().then(() => setMessage("Link inválido ou expirado. Solicite um novo e-mail ao ADMIN.")); return;
    }
    client.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
      setReady(!error); setMessage(error ? "Link inválido ou expirado. Solicite um novo e-mail ao ADMIN." : "Defina sua nova senha.");
    }).catch(() => setMessage("Falha de conexão ao validar o link."));
  }, [client]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    if (values.get("password") !== values.get("confirm")) { setMessage("As senhas não conferem."); return; }
    setBusy(true);
    try {
      const { error } = await client.auth.updateUser({ password: String(values.get("password")) });
      if (error) { setMessage("Não foi possível alterar a senha. Verifique os requisitos ou solicite um novo link."); return; }
      await client.auth.signOut(); setReady(false); setMessage("Senha alterada com sucesso. Acesse o sistema com sua nova senha.");
    } catch { setMessage("Falha de conexão. Tente novamente."); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-md space-y-5 p-8"><h1 className="text-2xl font-semibold">Redefinir senha</h1><p role="status">{message}</p>
    {ready && <form onSubmit={submit} className="space-y-4"><label className="block">Nova senha<input className="w-full rounded border p-2" name="password" type="password" required minLength={12} maxLength={128} autoComplete="new-password" /></label>
      <label className="block">Confirmar senha<input className="w-full rounded border p-2" name="confirm" type="password" required minLength={12} maxLength={128} autoComplete="new-password" /></label>
      <button disabled={busy} className="rounded bg-purple-700 p-2 text-white">{busy ? "Salvando..." : "Salvar senha"}</button></form>}
    <a className="block text-purple-700" href="/login">Ir para o login</a></main>;
}
