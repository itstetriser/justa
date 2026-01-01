-- RPC to update user points (positive or negative)
-- Usage: supabase.rpc('update_points', { user_id: '...', delta: 10 })
-- Usage: supabase.rpc('update_points', { user_id: '...', delta: -3 })

create or replace function update_points(user_id uuid, delta int)
returns void
language plpgsql
security definer
as $$
begin
  update public.profiles
  set total_points = total_points + delta
  where id = user_id;
end;
$$;
