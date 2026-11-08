-- Run this once in the Supabase SQL editor.
-- Students read and write only their own results.
-- A teacher reads results of students who joined that teacher's class code.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('student', 'teacher')),
  display_name text not null,
  class_code text,
  created_at timestamptz not null default now()
);

create unique index profiles_teacher_code
  on public.profiles (class_code)
  where role = 'teacher';

create table public.results (
  id bigint generated always as identity primary key,
  student_id uuid not null references public.profiles (id) on delete cascade,
  subject text not null check (subject in ('math', 'russian', 'english')),
  level integer not null check (level between 1 and 3),
  score integer not null check (score between 0 and 100),
  created_at timestamptz not null default now()
);

create index results_student_date on public.results (student_id, created_at desc);
create index profiles_class_code on public.profiles (class_code);

create or replace function public.make_class_code()
returns text
language plpgsql
set search_path = public
as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text := '';
  i integer;
begin
  for i in 1..6 loop
    code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::integer, 1);
  end loop;
  return code;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  wanted text;
  code text;
  name text;
  tries integer := 0;
begin
  wanted := case when new.raw_user_meta_data->>'role' = 'teacher' then 'teacher' else 'student' end;
  name := left(btrim(coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))), 24);
  if name is null or length(name) < 2 then
    name := case when wanted = 'teacher' then 'Учитель' else 'Ученик' end;
  end if;

  if wanted = 'teacher' then
    loop
      code := public.make_class_code();
      exit when not exists (select 1 from public.profiles where class_code = code and role = 'teacher');
      tries := tries + 1;
      if tries > 8 then
        raise exception 'Не удалось создать код класса';
      end if;
    end loop;
  else
    code := upper(btrim(coalesce(new.raw_user_meta_data->>'class_code', '')));
    if not exists (select 1 from public.profiles where role = 'teacher' and class_code = code) then
      raise exception 'Код класса не найден';
    end if;
  end if;

  insert into public.profiles (id, role, display_name, class_code)
  values (new.id, wanted, name, code);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.my_class_code()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select class_code from public.profiles where id = auth.uid()
$$;

alter table public.profiles enable row level security;
alter table public.results enable row level security;

create policy profiles_own on public.profiles
  for select to authenticated
  using (id = auth.uid());

create policy profiles_class on public.profiles
  for select to authenticated
  using (
    public.my_role() = 'teacher'
    and class_code = public.my_class_code()
  );

create policy results_own_read on public.results
  for select to authenticated
  using (student_id = auth.uid());

create policy results_own_write on public.results
  for insert to authenticated
  with check (
    student_id = auth.uid()
    and public.my_role() = 'student'
  );

create policy results_teacher_read on public.results
  for select to authenticated
  using (
    public.my_role() = 'teacher'
    and exists (
      select 1 from public.profiles as student
      where student.id = results.student_id
        and student.role = 'student'
        and student.class_code = public.my_class_code()
    )
  );

revoke all on public.profiles from anon, public;
revoke all on public.results from anon, public;
grant select on public.profiles to authenticated;
grant select, insert on public.results to authenticated;

revoke all on function public.make_class_code() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.my_role() from public, anon;
revoke all on function public.my_class_code() from public, anon;
grant execute on function public.my_role() to authenticated;
grant execute on function public.my_class_code() to authenticated;
