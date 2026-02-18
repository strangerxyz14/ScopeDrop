
-- Enable RLS on raw_signals
ALTER TABLE public.raw_signals ENABLE ROW LEVEL SECURITY;

-- Admin-only read/write for raw_signals
CREATE POLICY "Admins can manage raw_signals"
ON public.raw_signals
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Enable RLS on agent_logs
ALTER TABLE public.agent_logs ENABLE ROW LEVEL SECURITY;

-- Admin-only read/write for agent_logs
CREATE POLICY "Admins can manage agent_logs"
ON public.agent_logs
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Fix function search_path on scopedrop_set_updated_at
CREATE OR REPLACE FUNCTION public.scopedrop_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;
