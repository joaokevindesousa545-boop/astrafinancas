import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { installAstraRuntime } from "@/lib/astra-runtime";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Astra Finanças — finanças da sua empresa" },
      { name: "description", content: "Organize receitas e despesas da sua empresa com o Astra Finanças." },
      { property: "og:title", content: "Astra Finanças" },
      { property: "og:description", content: "Organize receitas e despesas da sua empresa com o Astra Finanças." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    return () => sub.subscription.unsubscribe();
  }, []);

  const uid = session?.user.id;
  useEffect(() => {
    if (!uid) { setReady(false); return; }
    const off = installAstraRuntime(() => setSession(null));
    setReady(true);
    return () => { off(); setReady(false); };
  }, [uid]);

  if (session === undefined) return <div className="astra-bg min-h-screen" />;
  if (!session) return <Login />;
  if (!ready) return <div className="astra-bg min-h-screen" />;
  return <iframe key={uid} src="/astra.html" title="Astra Finanças" className="fixed inset-0 h-full w-full border-0" />;
}

function Login() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState<{ t: string; err?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(null);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (error) setMsg({ t: "E-mail ou senha incorretos.", err: true });
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password: pass, options: { emailRedirectTo: window.location.origin } });
      if (error) setMsg({ t: error.message.includes("Password") ? "A senha precisa ter pelo menos 6 caracteres." : "Não foi possível criar a conta.", err: true });
      else if (!data.session) setMsg({ t: "Enviamos um link de confirmação para o seu e-mail." });
    }
    setBusy(false);
  }
  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) setMsg({ t: "Não foi possível entrar com o Google.", err: true });
  }

  return (
    <main className="astra-bg flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-sm rounded-[30px] border border-white/80 bg-card/60 p-8 shadow-[0_16px_34px_-18px_rgba(14,40,90,.34)] backdrop-blur-xl">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-2xl font-bold text-primary-foreground">✦</div>
        <h1 className="text-center text-2xl font-bold tracking-tight text-foreground">Astra Finanças</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">{mode === "in" ? "Entre para organizar as finanças da sua empresa." : "Crie sua conta gratuita."}</p>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <input type="email" required placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 w-full rounded-2xl border border-border bg-background/80 px-4 text-[15px] text-foreground outline-none focus:ring-2 focus:ring-primary" />
          <input type="password" required minLength={6} placeholder="Senha" value={pass} onChange={(e) => setPass(e.target.value)} className="h-12 w-full rounded-2xl border border-border bg-background/80 px-4 text-[15px] text-foreground outline-none focus:ring-2 focus:ring-primary" />
          {msg && <p className={"text-sm " + (msg.err ? "text-destructive" : "text-primary")}>{msg.t}</p>}
          <button disabled={busy} className="h-12 w-full rounded-2xl bg-primary font-semibold text-primary-foreground transition active:scale-[.98] disabled:opacity-60">{mode === "in" ? "Entrar" : "Criar conta"}</button>
        </form>
        <button type="button" onClick={google} className="mt-3 flex h-12 w-full items-center justify-center gap-[10px] rounded-2xl border border-[#747775] bg-[#FFFFFF] px-3 text-sm font-medium text-[#1F1F1F]">
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.930-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.780-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.950 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
          Continuar com o Google
        </button>
        <button type="button" onClick={() => { setMode(mode === "in" ? "up" : "in"); setMsg(null); }} className="mt-5 w-full text-center text-sm font-medium text-primary">
          {mode === "in" ? "Não tem conta? Criar conta" : "Já tem conta? Entrar"}
        </button>
      </div>
    </main>
  );
}
