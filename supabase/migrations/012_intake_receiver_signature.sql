-- Signature of the staff member who receives the vehicle for the garage.
alter table public.vehicle_intakes
  add column receiver_signature text check (
    receiver_signature is null or (receiver_signature like 'data:image/png;base64,%' and char_length(receiver_signature) <= 300000)
  );
