-- Normalize only the inspected ASICS family and brand spellings so new models
-- appear beside their historical predecessors. No measurements are changed.
UPDATE running_shoes SET brand='ASICS', series_name='Gel Kayano'
WHERE slug='asics-gel-kayano-31' AND brand='Asics' AND series_name='Gel-Kayano';

UPDATE running_shoes SET brand='ASICS', series_name='Gel Nimbus'
WHERE slug IN ('asics-gel-nimbus-25','asics-gel-nimbus-26')
  AND brand='Asics' AND series_name='Gel-Nimbus';

UPDATE running_shoes SET series_name='Gel Nimbus'
WHERE slug='asics-gel-nimbus-27' AND brand='ASICS' AND series_name='GEL-Nimbus';

-- Keep comparison-hub titles aligned with the normalized brand spelling.
UPDATE shoe_comparisons SET title='ASICS Gel Kayano 33 vs ASICS Gel-Kayano 31'
WHERE slug='asics-gel-kayano-33-vs-asics-gel-kayano-31'
  AND title='ASICS Gel Kayano 33 vs Asics Gel-Kayano 31';
