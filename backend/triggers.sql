-- Fonction: check stock non negatif
CREATE OR REPLACE FUNCTION check_stock_non_negative()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.stock_quantity < 0 THEN
        RAISE EXCEPTION 'Stock cannot be negative for product %', NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS trg_check_stock_negative ON produits;
CREATE TRIGGER trg_check_stock_negative
    BEFORE UPDATE ON produits
    FOR EACH ROW
    EXECUTE FUNCTION check_stock_non_negative();
