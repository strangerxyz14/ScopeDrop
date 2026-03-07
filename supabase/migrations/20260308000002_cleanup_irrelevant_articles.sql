-- ============================================================
-- Clean up irrelevant articles and signals from before
-- the relevance filter was introduced.
-- ============================================================

-- Delete irrelevant articles
DELETE FROM public.articles
WHERE
  headline ILIKE '%travel%'
  OR headline ILIKE '%music%'
  OR headline ILIKE '%artist%'
  OR headline ILIKE '%nagoshi%'
  OR headline ILIKE '%aussie artist%'
  OR headline ILIKE '%celebrity%'
  OR headline ILIKE '%sport%'
  OR headline ILIKE '%sports%'
  OR headline ILIKE '%entertainment%'
  OR headline ILIKE '%bollywood%'
  OR headline ILIKE '%box office%'
  OR headline ILIKE '%nfl%'
  OR headline ILIKE '%nba%'
  OR headline ILIKE '%cricket%'
  OR headline ILIKE '%fashion%'
  OR headline ILIKE '%recipe%'
  OR headline ILIKE '%gossip%';

-- Delete corresponding raw signals
DELETE FROM public.raw_signals
WHERE
  title ILIKE '%travel%'
  OR title ILIKE '%music%'
  OR title ILIKE '%artist%'
  OR title ILIKE '%nagoshi%'
  OR title ILIKE '%celebrity%'
  OR title ILIKE '%sport%'
  OR title ILIKE '%sports%'
  OR title ILIKE '%entertainment%'
  OR title ILIKE '%bollywood%'
  OR title ILIKE '%box office%'
  OR title ILIKE '%nfl%'
  OR title ILIKE '%nba%'
  OR title ILIKE '%cricket%'
  OR title ILIKE '%fashion%'
  OR title ILIKE '%recipe%'
  OR title ILIKE '%gossip%';
