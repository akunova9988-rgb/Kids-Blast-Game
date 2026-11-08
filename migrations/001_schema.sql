create table users (
  id integer generated always as identity primary key,
  username text not null unique,
  password_hash text not null,
  role text not null check (role in ('teacher', 'student')),
  display_name text not null,
  class_id integer,
  created_at text not null
);

create table classes (
  id integer generated always as identity primary key,
  teacher_id integer not null unique,
  name text not null,
  join_code text not null unique,
  created_at text not null
);

create table sets (
  id integer generated always as identity primary key,
  teacher_id integer not null,
  title text not null,
  topic text not null,
  blurb text not null default '',
  accent text not null default 'gold',
  created_at text not null
);

create table questions (
  id integer generated always as identity primary key,
  set_id integer not null,
  kind text not null check (kind in ('play', 'check')),
  prompt text not null,
  choice_a text not null,
  choice_b text not null,
  choice_c text not null,
  choice_d text not null,
  correct_index integer not null check (correct_index between 0 and 3),
  sort_order integer not null
);

create table assignments (
  id integer generated always as identity primary key,
  class_id integer not null,
  set_id integer not null,
  created_at text not null,
  unique (class_id, set_id)
);

create table plays (
  id integer generated always as identity primary key,
  student_id integer not null,
  assignment_id integer not null,
  status text not null check (status in ('playing', 'finished', 'abandoned')),
  score integer not null default 0,
  stars integer,
  correct_count integer not null default 0,
  miss_count integer not null default 0,
  best_streak integer not null default 0,
  streak integer not null default 0,
  lives integer not null,
  cursor_index integer not null default 0,
  round_size integer not null,
  created_at text not null,
  finished_at text
);

create table play_deals (
  play_id integer not null,
  question_id integer not null,
  kind text not null check (kind in ('play', 'check')),
  position integer not null,
  prompt text not null,
  choices_json text not null,
  correct_index integer not null,
  primary key (play_id, question_id, kind)
);

create table play_answers (
  play_id integer not null,
  question_id integer not null,
  prompt text not null,
  choice_index integer not null,
  correct_index integer not null,
  correct integer not null,
  primary key (play_id, question_id)
);

create table surveys (
  id integer generated always as identity primary key,
  play_id integer not null unique,
  student_id integer not null,
  liked text check (liked in ('not_much', 'okay', 'loved')),
  difficulty text check (difficulty in ('too_easy', 'just_right', 'too_hard')),
  skipped integer not null default 0,
  created_at text not null
);

create table check_answers (
  id integer generated always as identity primary key,
  play_id integer not null,
  question_id integer not null,
  prompt text not null,
  choice_index integer not null,
  correct_index integer not null,
  correct integer not null,
  unique (play_id, question_id)
);

create table sessions (
  token text primary key,
  user_id integer not null,
  created_at text not null
);

create index idx_questions_set on questions (set_id, kind, sort_order);
create index idx_plays_assignment on plays (assignment_id, status);
create index idx_check_play on check_answers (play_id);
