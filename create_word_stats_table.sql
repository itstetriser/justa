-- 1. Create a side-car table for tracking word stats
create table if not exists public.word_stats (
  id bigint generated always as identity primary key,
  question_id uuid references public.questions(id) on delete cascade not null,
  word_text text not null,
  times_picked int default 1,
  unique(question_id, word_text)
);

alter table public.word_stats enable row level security;

drop policy if exists "Word stats viewable by everyone" on public.word_stats;
drop policy if exists "Word stats insertable by service role" on public.word_stats;
drop policy if exists "Word stats updateable by service role" on public.word_stats;

create policy "Word stats viewable by everyone" on public.word_stats for select using (true);
create policy "Word stats insertable by service role" on public.word_stats for insert with check (true);
create policy "Word stats updateable by service role" on public.word_stats for update using (true);

-- 2. Update RPC to use this new table
-- DROP first to handle signature change if needed (though OR REPLACE handles name/arg name changes, type changes need DROP)
DROP FUNCTION IF EXISTS record_answer_stats(uuid, text, boolean);

create or replace function record_answer_stats(
  p_question_id uuid,
  p_word_text text,
  p_is_correct boolean,
  p_increment_asked boolean default true
)
returns void
language plpgsql
security definer
as $$
begin
  -- 1. Increment Question 'times_asked'
  -- Only increment if p_increment_asked is true
  update public.questions
  set times_asked = coalesce(times_asked, 0) + (case when p_increment_asked then 1 else 0 end),
      times_correct = case when p_is_correct then coalesce(times_correct, 0) + 1 else coalesce(times_correct, 0) end
  where id = p_question_id;

  -- 2. Increment Word Stats (Upsert)
  insert into public.word_stats (question_id, word_text, times_picked)
  values (p_question_id, p_word_text, 1)
  on conflict (question_id, word_text)
  do update set times_picked = word_stats.times_picked + 1;
end;
$$;
