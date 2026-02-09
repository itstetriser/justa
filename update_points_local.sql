-- 1. Add column to track the 'local date' of the last score update
alter table public.profiles 
add column if not exists last_local_date text; -- Format 'YYYY-MM-DD'

-- 2. Update the RPC function to accept local date
create or replace function update_points(user_id uuid, delta int, local_date text)
returns void
language plpgsql
security definer
as $$
declare
  v_last_local_date text;
  v_daily int;
  v_weekly int;
  v_monthly int;
  
  -- We still need last_score_date for Week/Month calculations relying on timestamps? 
  -- Actually, we can derive everything from the local_date if we parse it.
  
  v_current_date date;
  v_last_date_parsed date;
  
  is_new_day boolean;
  is_new_week boolean;
  is_new_month boolean;
begin
  -- Get current values
  select 
    last_local_date, score_daily, score_weekly, score_monthly 
  into 
    v_last_local_date, v_daily, v_weekly, v_monthly
  from public.profiles 
  where id = user_id;
  
  -- Parse the INPUT local_date
  v_current_date := to_date(local_date, 'YYYY-MM-DD');
  
  -- Handle Nulls (First time)
  if v_last_local_date is null then
     v_last_local_date := '1970-01-01'; -- Long ago
     v_daily := 0;
     v_weekly := 0;
     v_monthly := 0;
  end if;
  
  v_last_date_parsed := to_date(v_last_local_date, 'YYYY-MM-DD');

  -- Comparators
  is_new_day := v_current_date > v_last_date_parsed;
  
  -- For Week/Month, using ISO week/standard month from the DATE itself
  is_new_week := extract(week from v_current_date) <> extract(week from v_last_date_parsed) 
                 or extract(year from v_current_date) <> extract(year from v_last_date_parsed);
                 
  is_new_month := extract(month from v_current_date) <> extract(month from v_last_date_parsed)
                  or extract(year from v_current_date) <> extract(year from v_last_date_parsed);

  -- Reset Logic
  if is_new_day then v_daily := 0; end if;
  if is_new_week then v_weekly := 0; end if;
  if is_new_month then v_monthly := 0; end if;

  -- Update
  update public.profiles
  set 
    total_points = total_points + delta,
    score_daily = v_daily + delta,
    score_weekly = v_weekly + delta,
    score_monthly = v_monthly + delta,
    last_score_date = now(), -- Keep keeping track of real time too
    last_local_date = local_date
  where id = user_id;

end;
$$;
