-- Smart update_points: Handles resets for Daily/Weekly/Monthly
create or replace function update_points(user_id uuid, delta int)
returns void
language plpgsql
security definer
as $$
declare
  v_last_date timestamptz;
  v_daily int;
  v_weekly int;
  v_monthly int;
  v_timezone text := 'Europe/Istanbul'; -- Updated to User's Timezone
  
  is_new_day boolean;
  is_new_week boolean;
  is_new_month boolean;
begin
  select 
    last_score_date, score_daily, score_weekly, score_monthly 
  into 
    v_last_date, v_daily, v_weekly, v_monthly
  from public.profiles 
  where id = user_id;
  
  -- Handle Nulls
  if v_last_date is null then
     v_last_date := now() - interval '1 year';
     v_daily := 0;
     v_weekly := 0;
     v_monthly := 0;
  end if;

  -- Time Comparisons
  is_new_day := date(now() at time zone v_timezone) > date(v_last_date at time zone v_timezone);
  is_new_week := extract(week from now() at time zone v_timezone) <> extract(week from v_last_date at time zone v_timezone) 
                 or extract(year from now() at time zone v_timezone) <> extract(year from v_last_date at time zone v_timezone);
  is_new_month := extract(month from now() at time zone v_timezone) <> extract(month from v_last_date at time zone v_timezone)
                  or extract(year from now() at time zone v_timezone) <> extract(year from v_last_date at time zone v_timezone);

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
    last_score_date = now()
  where id = user_id;

end;
$$;
