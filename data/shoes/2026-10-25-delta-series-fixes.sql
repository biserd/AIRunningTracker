-- Normalize only known ASICS family spellings so source-checked new models
-- appear beside their historical predecessors. No measurements are changed.
UPDATE running_shoes SET series_name='Gel Kayano'
WHERE slug='asics-gel-kayano-31' AND series_name='Gel-Kayano';

UPDATE running_shoes SET series_name='Gel Nimbus'
WHERE slug IN ('asics-gel-nimbus-25','asics-gel-nimbus-26','asics-gel-nimbus-27')
  AND series_name='GEL-Nimbus';
