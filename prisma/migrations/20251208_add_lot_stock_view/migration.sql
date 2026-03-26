-- CreateView: lot_stock_view
-- This view shows lot-wise stock availability by aggregating arrival items
-- and subtracting stock sales

CREATE VIEW IF NOT EXISTS lot_stock_view AS
SELECT 
  ai.itemId,
  ai.lotNoVariety,
  a.partyId as supplierId,
  a.storeId,
  a.companyId,
  a.date as arrivalDate,
  -- Total arrived quantity
  SUM(ai.nug) as totalNug,
  SUM(ai.kg) as totalKg,
  -- Total sold quantity (from stock sales)
  COALESCE((
    SELECT SUM(ssi.nug)
    FROM stock_sale_item ssi
    JOIN stock_sale ss ON ssi.stockSaleId = ss.id
    WHERE ssi.itemId = ai.itemId 
      AND ssi.lotNoVariety = ai.lotNoVariety
      AND ss.supplierId = a.partyId
      AND (ss.storeId = a.storeId OR (ss.storeId IS NULL AND a.storeId IS NULL))
      AND ss.companyId = a.companyId
  ), 0) as soldNug,
  COALESCE((
    SELECT SUM(ssi.kg)
    FROM stock_sale_item ssi
    JOIN stock_sale ss ON ssi.stockSaleId = ss.id
    WHERE ssi.itemId = ai.itemId 
      AND ssi.lotNoVariety = ai.lotNoVariety
      AND ss.supplierId = a.partyId
      AND (ss.storeId = a.storeId OR (ss.storeId IS NULL AND a.storeId IS NULL))
      AND ss.companyId = a.companyId
  ), 0) as soldKg,
  -- Available stock (arrived - sold)
  SUM(ai.nug) - COALESCE((
    SELECT SUM(ssi.nug)
    FROM stock_sale_item ssi
    JOIN stock_sale ss ON ssi.stockSaleId = ss.id
    WHERE ssi.itemId = ai.itemId 
      AND ssi.lotNoVariety = ai.lotNoVariety
      AND ss.supplierId = a.partyId
      AND (ss.storeId = a.storeId OR (ss.storeId IS NULL AND a.storeId IS NULL))
      AND ss.companyId = a.companyId
  ), 0) as availableNug,
  SUM(ai.kg) - COALESCE((
    SELECT SUM(ssi.kg)
    FROM stock_sale_item ssi
    JOIN stock_sale ss ON ssi.stockSaleId = ss.id
    WHERE ssi.itemId = ai.itemId 
      AND ssi.lotNoVariety = ai.lotNoVariety
      AND ss.supplierId = a.partyId
      AND (ss.storeId = a.storeId OR (ss.storeId IS NULL AND a.storeId IS NULL))
      AND ss.companyId = a.companyId
  ), 0) as availableKg
FROM arrival_item ai
JOIN arrival a ON ai.arrivalId = a.id
GROUP BY 
  ai.itemId,
  ai.lotNoVariety,
  a.partyId,
  a.storeId,
  a.companyId,
  a.date
HAVING availableNug > 0 OR availableKg > 0;
