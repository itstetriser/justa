-- RPC to handle daily streak logic
-- Usage: supabase.rpc('update_streak', { user_id: '...' })

create or replace function update_streak(p_user_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_last_active timestamptz;
  v_streak int;
  v_timezone text := 'Europe/Istanbul';
begin
  select last_active_at, coalesce(streak_count, 0) into v_last_active, v_streak
  from public.profiles where id = p_user_id;
  
  -- If first time or null
  if v_last_active is null then
    update public.profiles 
    set streak_count = 1, last_active_at = now() 
    where id = p_user_id;
    return;
  end if;

  -- Check dates (Compare UTC Dates)
  -- If Last Active == Today: Do nothing (just update time)
  if date(v_last_active at time zone v_timezone) = date(now() at time zone v_timezone) then
    update public.profiles 
    set last_active_at = now() 
    where id = p_user_id;
    
  -- If Last Active == Yesterday: Increment Streak
  elsif date(v_last_active at time zone v_timezone) = date(now() at time zone v_timezone - interval '1 day') then
    update public.profiles 
    set streak_count = v_streak + 1, last_active_at = now() 
    where id = p_user_id;
    
  -- If Last Active < Yesterday: Reset Streak to 1
  else
    update public.profiles 
    set streak_count = 1, last_active_at = now() 
    where id = p_user_id;
  end if;
end;
$$;
