-- =============================================================================
-- Union Project (UP) — Batch 3: Performance Indexes & Summary RPCs
-- Eliminates full-table JS scans in ChatPage, MessagesPage, ExplorePage & HomePage
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Composite Performance Indexes
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_hub_messages_course_created
  ON public.hub_messages (course_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_hub_members_course_user
  ON public.hub_members (course_id, user_id);

CREATE INDEX IF NOT EXISTS idx_messages_receiver_read
  ON public.messages (receiver_id, read) WHERE read = false;

CREATE INDEX IF NOT EXISTS idx_messages_pair_created
  ON public.messages (sender_id, receiver_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_thanks_message_id
  ON public.thanks (message_id);

CREATE INDEX IF NOT EXISTS idx_thanks_sender_date
  ON public.thanks (sender_id, given_date);

-- -----------------------------------------------------------------------------
-- 2. RPC: get_hubs_summary() — replaces full-table hub_members + hub_messages scan
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_hubs_summary()
RETURNS TABLE (
  course_id uuid,
  member_count bigint,
  is_member boolean,
  last_message text,
  last_message_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH member_counts AS (
    SELECT hm.course_id, COUNT(*)::bigint AS cnt,
           BOOL_OR(hm.user_id = auth.uid()) AS joined
    FROM public.hub_members hm
    GROUP BY hm.course_id
  ),
  latest_msgs AS (
    SELECT DISTINCT ON (m.course_id)
      m.course_id, m.content, m.created_at
    FROM public.hub_messages m
    ORDER BY m.course_id, m.created_at DESC
  )
  SELECT
    c.id AS course_id,
    COALESCE(mc.cnt, 0) AS member_count,
    COALESCE(mc.joined, false) AS is_member,
    CASE WHEN COALESCE(mc.joined, false) THEN lm.content ELSE NULL END AS last_message,
    lm.created_at AS last_message_at
  FROM public.courses c
  LEFT JOIN member_counts mc ON mc.course_id = c.id
  LEFT JOIN latest_msgs lm ON lm.course_id = c.id;
$$;

GRANT EXECUTE ON FUNCTION public.get_hubs_summary() TO authenticated;

-- -----------------------------------------------------------------------------
-- 3. RPC: get_dm_inbox() — returns grouped DM conversations with unread counts
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_dm_inbox()
RETURNS TABLE (
  contact_id uuid,
  last_message text,
  last_message_type text,
  last_message_at timestamptz,
  unread_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH user_msgs AS (
    SELECT
      CASE WHEN m.sender_id = auth.uid() THEN m.receiver_id ELSE m.sender_id END AS peer_id,
      m.content,
      m.message_type,
      m.created_at,
      (m.receiver_id = auth.uid() AND m.read = false) AS is_unread
    FROM public.messages m
    WHERE m.sender_id = auth.uid() OR m.receiver_id = auth.uid()
  ),
  latest AS (
    SELECT DISTINCT ON (peer_id)
      peer_id, content, message_type, created_at
    FROM user_msgs
    ORDER BY peer_id, created_at DESC
  ),
  unreads AS (
    SELECT peer_id, COUNT(*) FILTER (WHERE is_unread)::bigint AS cnt
    FROM user_msgs
    GROUP BY peer_id
  )
  SELECT
    l.peer_id AS contact_id,
    l.content AS last_message,
    l.message_type AS last_message_type,
    l.created_at AS last_message_at,
    COALESCE(u.cnt, 0) AS unread_count
  FROM latest l
  LEFT JOIN unreads u ON u.peer_id = l.peer_id
  ORDER BY l.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_dm_inbox() TO authenticated;

-- -----------------------------------------------------------------------------
-- 4. RPC: get_explore_stats() — platform totals without leaking private DMs
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_explore_stats()
RETURNS TABLE (
  total_students bigint,
  total_hub_messages bigint,
  total_courses bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*)::bigint FROM public.profiles),
    (SELECT COUNT(*)::bigint FROM public.hub_messages),
    (SELECT COUNT(*)::bigint FROM public.courses);
$$;

GRANT EXECUTE ON FUNCTION public.get_explore_stats() TO authenticated;
