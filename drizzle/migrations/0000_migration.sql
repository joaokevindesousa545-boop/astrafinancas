create type public.app_role as enum ('admin','user');
create table public.user_roles (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, role app_role not null, unique(user_id, role));
grant select on public.user_roles to authenticated; grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());
create or replace function public.has_role(_user_id uuid, _role app_role) returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.user_roles where user_id=_user_id and role=_role) $$;

create table public.profiles (id uuid primary key references auth.users(id) on delete cascade, name text, email text, avatar_url text, created_at timestamptz not null default now());
grant select, update on public.profiles to authenticated; grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own or admin read" on public.profiles for select to authenticated using (id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "own update" on public.profiles for update to authenticated using (id = auth.uid());

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id,name,email,avatar_url) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'), new.email, new.raw_user_meta_data->>'avatar_url');
  if not exists (select 1 from public.user_roles where role='admin') then
    insert into public.user_roles(user_id, role) values (new.id,'admin');
  end if;
  insert into public.user_roles(user_id, role) values (new.id,'user') on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.docs (path text primary key, parent text not null, owner uuid not null default auth.uid(), data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now());
create index docs_parent_idx on public.docs(parent);
grant select, insert, update, delete on public.docs to authenticated; grant all on public.docs to service_role;
alter table public.docs enable row level security;
create policy "read own or admin contas" on public.docs for select to authenticated using (owner = auth.uid() or (parent='contas' and public.has_role(auth.uid(),'admin')));
create policy "insert own" on public.docs for insert to authenticated with check (owner = auth.uid() and (path like 'data/users/' || auth.uid()::text || '/%' or path = 'contas/' || auth.uid()::text));
create policy "update own" on public.docs for update to authenticated using (owner = auth.uid()) with check (owner = auth.uid());
create policy "delete own" on public.docs for delete to authenticated using (owner = auth.uid());
alter publication supabase_realtime add table public.docs;