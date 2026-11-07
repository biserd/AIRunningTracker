-- Scope: two existing shoe identities; no record deletion or schema changes.
-- Source checked 2026-11-07: RW Vaporfly 4 review, men's US 9, 5.9 oz, 36/30 mm, 6 mm drop.
-- Previous legacy values: 6.7 oz, 32/26 mm, 6 mm drop, curated, no source/date.
UPDATE running_shoes
SET weight=5.9, heel_stack_height=36, forefoot_stack_height=30, heel_to_toe_drop=6,
    source_url='https://www.runningwarehouse.com/reviews/nike-shoe-reviews/nike-vaporfly-4.html',
    data_source='running_warehouse', last_verified='2026-11-07T00:00:00.000Z',
    description='ZoomX road racer with a carbon Flyplate. Running Warehouse review lists 5.9 oz for men''s US 9 and 36/30 mm stack with a 6 mm drop. The catalogue price remains a historical recorded price, not a newly verified current offer. RunAnalytics has not wear-tested this shoe.'
WHERE id=249 AND slug='nike-vaporfly-4' AND data_source='curated'
  AND weight=6.7 AND heel_stack_height=32 AND forefoot_stack_height=26;

-- RW Endorphin Pro 4 review confirms existing 7.7 oz men's US 9, 40/32 mm, 8 mm drop.
UPDATE running_shoes
SET source_url='https://www.runningwarehouse.com/reviews/saucony-shoe-reviews/saucony-endorphin-pro-4.html',
    data_source='running_warehouse', last_verified='2026-11-07T00:00:00.000Z',
    description='Road racer with PWRRUN HG and PWRRUN PB cushioning, carbon plate and SPEEDROLL geometry. Running Warehouse review confirms 7.7 oz for men''s US 9 and 40/32 mm stack with an 8 mm drop. The $225 catalogue price is historical review pricing, not a current shop offer. RunAnalytics has not wear-tested this shoe.'
WHERE id=702 AND slug='saucony-endorphin-pro-4' AND data_source='curated'
  AND weight=7.7 AND heel_stack_height=40 AND forefoot_stack_height=32 AND heel_to_toe_drop=8;
