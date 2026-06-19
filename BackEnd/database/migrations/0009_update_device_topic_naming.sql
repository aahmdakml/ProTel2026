-- Migration: 0009_update_device_topic_naming
-- Updates the default topic format to device/{device_code}/{serial_number}.

CREATE OR REPLACE FUNCTION mst.set_device_topic()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.topic IS NULL OR NEW.topic = '' THEN
    IF NEW.serial_number IS NULL OR NEW.serial_number = '' THEN
      NEW.topic := 'device/' || NEW.device_code;
    ELSE
      NEW.topic := 'device/' || NEW.device_code || '/' || NEW.serial_number;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Migrate existing devices matching the old pattern to the new pattern
UPDATE mst.devices
SET topic = CASE
  WHEN serial_number IS NULL OR serial_number = '' THEN 'device/' || device_code
  ELSE 'device/' || device_code || '/' || serial_number
END
WHERE topic IS NULL OR topic = '' OR topic LIKE 'topic_%';
