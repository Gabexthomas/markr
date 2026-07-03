-- Denormalise button type onto markers, same rationale as label/color:
-- editing or deleting a show's buttons later must not rewrite or lose
-- history. Without this, deleting a segment-type button would silently
-- break YouTube chapter exports for every past session that used it.
alter table public.markers
  add column type text not null default 'marker' check (type in ('marker', 'segment'));
