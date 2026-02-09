-- Create or Replace update_points function
CREATE OR REPLACE FUNCTION public.update_points(user_id uuid, delta int, local_date date DEFAULT CURRENT_DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_daily int;
  current_total int;
  last_date date;
BEGIN
  -- Get current values safely
  SELECT 
    COALESCE(score_daily, 0), 
    COALESCE(total_points, 0), 
    COALESCE(last_score_date, '2000-01-01')::date
  INTO 
    current_daily, 
    current_total, 
    last_date 
  FROM public.profiles 
  WHERE id = user_id;

  -- Reset daily score if date changed
  IF last_date < local_date THEN
    current_daily := 0;
  END IF;

  -- Update
  UPDATE public.profiles
  SET 
    total_points = current_total + delta,
    score_daily = current_daily + delta,
    last_score_date = now()
  WHERE id = user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_points(uuid, int, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_points(uuid, int, date) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_points(uuid, int, date) TO anon;
