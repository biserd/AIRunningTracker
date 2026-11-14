-- Existing catalogue row only. No schema or identity changes.
-- Running Warehouse, men's US 9 Black/White; recorded clearance offer:
-- https://www.runningwarehouse.com/Saucony_Endorphin_Speed_5/descpage-S5ESM06.html
-- Cross-check: https://www.runningwarehouse.com/reviews/saucony-shoe-reviews/saucony-endorphin-speed-5.html
CREATE TABLE _speed_5_refresh_guard (ok INTEGER NOT NULL CHECK (ok = 1));
INSERT INTO _speed_5_refresh_guard
SELECT CASE WHEN EXISTS (
  SELECT 1 FROM running_shoes
  WHERE id = 276 AND slug = 'saucony-endorphin-speed-5'
    AND brand = 'Saucony' AND model = 'Endorphin Speed 5'
    AND category = 'speed_training' AND heel_to_toe_drop = 8
    AND (
      (weight = 8.3 AND heel_stack_height = 32 AND forefoot_stack_height = 24
        AND price = 175 AND last_verified IS NULL AND source_url IS NULL AND data_source = 'curated'
        AND availability = 'unknown')
      OR
      (weight = 8.4 AND heel_stack_height = 37 AND forefoot_stack_height = 29
        AND price = 114.88 AND data_source = 'running_warehouse'
        AND last_verified = '2026-11-14T00:00:00.000Z'
        AND source_url = 'https://www.runningwarehouse.com/Saucony_Endorphin_Speed_5/descpage-S5ESM06.html'
        AND availability = 'available')
    )
) THEN 1 ELSE 0 END;

UPDATE running_shoes
SET weight = 8.4, heel_stack_height = 37, forefoot_stack_height = 29,
    heel_to_toe_drop = 8, stability = 'neutral', has_carbon_plate = 0,
    has_super_foam = 1, availability = 'available', price = 114.88,
    description = 'Neutral road trainer for tempo sessions and faster daily miles. Its PWRRUN PB PEBA foam is paired with a nylon plate, not a carbon plate. Running Warehouse measured 8.4 oz in men''s US 9 and a 37/29 mm stack with 8 mm drop. The recorded $114.88 was the US Black/White clearance offer, not a live price or a guarantee of stock.',
    source_url = 'https://www.runningwarehouse.com/Saucony_Endorphin_Speed_5/descpage-S5ESM06.html',
    data_source = 'running_warehouse', last_verified = '2026-11-14T00:00:00.000Z'
WHERE id = 276 AND slug = 'saucony-endorphin-speed-5';

DROP TABLE _speed_5_refresh_guard;
