-- Run this in Supabase Dashboard → SQL Editor to fix "infinite recursion" on workspaces.
-- No Docker or db reset needed.

-- 1. Add helper that checks access without triggering RLS (breaks recursion)
CREATE OR REPLACE FUNCTION public.user_can_access_workspace(ws_id UUID, u_id UUID)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspaces w WHERE w.id = ws_id AND w.owner_id = u_id
  ) OR EXISTS (
    SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = ws_id AND wm.user_id = u_id
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 2. Drop old policies that caused recursion
DROP POLICY IF EXISTS "Members can view workspace" ON public.workspaces;
DROP POLICY IF EXISTS "Members can view workspace members" ON public.workspace_members;

-- 3. Recreate workspaces SELECT using the helper
CREATE POLICY "Members can view workspace"
  ON public.workspaces FOR SELECT
  USING (public.user_can_access_workspace(id, auth.uid()));

-- 4. Allow creating a workspace (owner_id must be current user)
CREATE POLICY "Authenticated users can create workspace"
  ON public.workspaces FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- 5. Recreate workspace_members SELECT using the helper
CREATE POLICY "Members can view workspace members"
  ON public.workspace_members FOR SELECT
  USING (public.user_can_access_workspace(workspace_id, auth.uid()));
