import { supabase } from "@/integrations/supabase/client";

type Data = Record<string, unknown>;
type Listener = { kind: "col" | "doc"; path: string; run: () => void };

const listeners = new Set<Listener>();
const notify = () => listeners.forEach((l) => l.run());
const parentOf = (p: string) => p.slice(0, p.lastIndexOf("/"));
const genId = () => crypto.randomUUID().replace(/-/g, "").slice(0, 20);
const db = () => supabase as unknown as { from: (t: string) => any };

function docSnap(path: string, row: { data: Data } | null) {
  return { id: path.slice(path.lastIndexOf("/") + 1), exists: !!row, data: () => (row ? row.data : undefined), metadata: { fromCache: false } };
}

async function getDoc(path: string) {
  const { data, error } = await db().from("docs").select("data").eq("path", path).maybeSingle();
  if (error) throw error;
  return docSnap(path, data);
}
async function getCol(path: string) {
  const { data, error } = await db().from("docs").select("path,data").eq("parent", path);
  if (error) throw error;
  return { docs: (data || []).map((r: { path: string; data: Data }) => docSnap(r.path, r)), metadata: { fromCache: false } };
}

function listen(kind: "col" | "doc", path: string, cb: (s: any) => void, err?: (e: unknown) => void) {
  let alive = true;
  const l: Listener = {
    kind, path,
    run: () => { (kind === "col" ? getCol(path) : getDoc(path)).then((s) => alive && cb(s), (e) => alive && err?.({ code: e?.code || "unavailable" })); },
  };
  listeners.add(l); l.run();
  return () => { alive = false; listeners.delete(l); };
}

function docRef(path: string): any {
  return {
    id: path.slice(path.lastIndexOf("/") + 1),
    get: () => getDoc(path),
    onSnapshot: (cb: any, err?: any) => listen("doc", path, cb, err),
    set: async (data: Data) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await db().from("docs").upsert({ path, parent: parentOf(path), data, owner: u.user?.id, updated_at: new Date().toISOString() });
      if (error) throw error; notify();
    },
    delete: async () => { const { error } = await db().from("docs").delete().eq("path", path); if (error) throw error; notify(); },
    collection: (name: string) => colRef(path + "/" + name),
  };
}
function colRef(path: string): any {
  return {
    get: () => getCol(path),
    onSnapshot: (cb: any, err?: any) => listen("col", path, cb, err),
    doc: (id: string) => docRef(path + "/" + id),
    add: async (data: Data) => { const r = docRef(path + "/" + genId()); await r.set(data); return r; },
  };
}

export function installAstraRuntime(onSignOut: () => void) {
  const dbApi = { collection: colRef, doc: docRef };
  const userApi = {
    isOwner: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return false;
      const { data } = await db().from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin");
      return !!(data && data.length);
    },
    me: async () => {
      const { data: u } = await supabase.auth.getUser();
      const x = u.user; if (!x) return null;
      const m = (x.user_metadata || {}) as Record<string, string>;
      return { id: x.id, name: m["full_name"] || m["name"] || (x.email || "").split("@")[0], email: x.email || "", avatarUrl: m["avatar_url"] || m["picture"] || "" };
    },
    can: async () => true,
    profiles: async (ids: string[]) => {
      const { data } = await db().from("profiles").select("id,name,email,avatar_url").in("id", ids);
      const out: Record<string, unknown> = {};
      (data || []).forEach((p: any) => { out[p.id] = { name: p.name || "", email: p.email || "", avatarUrl: p.avatar_url || "" }; });
      return out;
    },
  };
  const channel = supabase.channel("astra-docs-" + genId())
    .on("postgres_changes", { event: "*", schema: "public", table: "docs" }, () => notify())
    .subscribe();
  (window as any).claude = {
    use: async (k: string) => (k === "db" ? dbApi : k === "user" ? userApi : null),
    signOut: async () => { await supabase.auth.signOut(); onSignOut(); },
  };
  return () => { supabase.removeChannel(channel); delete (window as any).claude; };
}
