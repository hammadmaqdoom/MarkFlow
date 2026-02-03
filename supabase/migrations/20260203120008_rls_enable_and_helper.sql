-- Helper: user's role in a workspace (from workspace_members; owner is handled via workspaces.owner_id in policies)
CREATE OR REPLACE FUNCTION public.user_workspace_role(ws_id UUID, u_id UUID)
RETURNS public.workspace_role AS $$
  SELECT role FROM public.workspace_members
  WHERE workspace_id = ws_id AND user_id = u_id
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper: can user access workspace (avoids RLS recursion between workspaces <-> workspace_members)
CREATE OR REPLACE FUNCTION public.user_can_access_workspace(ws_id UUID, u_id UUID)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspaces w WHERE w.id = ws_id AND w.owner_id = u_id
  ) OR EXISTS (
    SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = ws_id AND wm.user_id = u_id
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
