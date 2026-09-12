-- The finishing add-ons feature is removed platform-wide (order page, pricing
-- math, specs and admin UI all drop it — stapling already lives in its own
-- mandatory option group). EnsureCatalogDefaults no longer offers the group,
-- so existing databases just need the dead row deleted.
DELETE FROM "CatalogEntry"
WHERE key = 'finishing-options';
