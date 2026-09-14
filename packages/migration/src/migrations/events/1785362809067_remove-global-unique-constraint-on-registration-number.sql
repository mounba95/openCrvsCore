-- Up Migration
-- Niger : la numérotation séquentielle par commune + type d'acte + année
-- (voir generateSequentialActNumber, opencrvs-countryconfig) attribue des
-- petits nombres ("1", "2", "3"...) qui ne sont uniques QUE dans le registre
-- de leur propre commune — deux communes ont chacune, légitimement, un
-- "acte n°1". Cette contrainte globale (héritée du schéma par défaut
-- d'OpenCRVS, pensé pour des identifiants aléatoires du type "nanoid",
-- uniques par construction) est donc incompatible avec ce mode de
-- numérotation et provoque une erreur de contrainte dès que deux communes
-- (ou deux tentatives) atteignent le même petit nombre. L'unicité au sein
-- du bon périmètre (commune + type + année) est déjà garantie de façon
-- atomique par `analytics.act_number_counters`.
ALTER TABLE ONLY app.event_actions
    DROP CONSTRAINT IF EXISTS event_actions_registration_number_key;

-- Down Migration
ALTER TABLE ONLY app.event_actions
    ADD CONSTRAINT event_actions_registration_number_key UNIQUE (registration_number);
