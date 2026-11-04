-- 039: Autolavado specialty and its service catalog (express, lavado + aspirado, ducha marina, detailing básico...). Run after 038.

insert into public.service_specialties (key, label, sort_order) values
  ('autolavado', 'Autolavado', 64)
on conflict (key) do update set label = excluded.label;

insert into public.repair_catalog (key, label, system, specialty, sort_order) values
  -- Lavados
  ('lav_express', 'Lavado express', 'Lavados', 'autolavado', 1500),
  ('lav_aspirado', 'Lavado + aspirado', 'Lavados', 'autolavado', 1510),
  ('lav_completo', 'Lavado completo (exterior + interior)', 'Lavados', 'autolavado', 1520),
  ('lav_ducha_marina', 'Ducha marina', 'Lavados', 'autolavado', 1530),
  ('lav_premium', 'Lavado premium', 'Lavados', 'autolavado', 1540),
  ('lav_carroceria_solo', 'Lavado solo de carrocería', 'Lavados', 'autolavado', 1550),
  ('lav_sin_agua', 'Lavado ecológico (sin agua)', 'Lavados', 'autolavado', 1560),
  ('lav_moto', 'Lavado de moto', 'Lavados', 'autolavado', 1570),
  ('lav_camioneta', 'Lavado de camioneta / SUV', 'Lavados', 'autolavado', 1580),
  -- Interior
  ('lav_aspirado_solo', 'Aspirado interior', 'Interior', 'autolavado', 1600),
  ('lav_tablero', 'Limpieza y abrillantado de tablero', 'Interior', 'autolavado', 1610),
  ('lav_vidrios_int', 'Limpieza de vidrios interiores', 'Interior', 'autolavado', 1620),
  ('lav_alfombras', 'Lavado de alfombras', 'Interior', 'autolavado', 1630),
  ('lav_tapiceria', 'Lavado de tapicería (asientos)', 'Interior', 'autolavado', 1640),
  ('lav_maleta', 'Limpieza de maleta', 'Interior', 'autolavado', 1650),
  ('lav_aromatizante', 'Aromatizante', 'Interior', 'autolavado', 1660),
  -- Exterior y extras
  ('lav_motor', 'Lavado de motor', 'Exterior y extras', 'autolavado', 1700),
  ('lav_chasis', 'Lavado de chasis / bajos', 'Exterior y extras', 'autolavado', 1710),
  ('lav_rines', 'Limpieza de rines', 'Exterior y extras', 'autolavado', 1720),
  ('lav_cauchos', 'Abrillantado de cauchos', 'Exterior y extras', 'autolavado', 1730),
  ('lav_encerado', 'Encerado rápido', 'Exterior y extras', 'autolavado', 1740),
  ('lav_pulitura', 'Pulitura', 'Exterior y extras', 'autolavado', 1750),
  ('lav_hidrofobico', 'Tratamiento hidrofóbico de vidrios', 'Exterior y extras', 'autolavado', 1760),
  ('lav_faros', 'Pulido de faros', 'Exterior y extras', 'autolavado', 1770),
  -- Detailing
  ('lav_detailing_basico', 'Detailing básico', 'Detailing', 'autolavado', 1800),
  ('lav_detailing_interior', 'Detailing interior', 'Detailing', 'autolavado', 1810),
  ('lav_detailing_exterior', 'Detailing exterior', 'Detailing', 'autolavado', 1820),
  ('lav_detailing_completo', 'Detailing completo', 'Detailing', 'autolavado', 1830),
  ('lav_descontaminado', 'Descontaminado de pintura (clay bar)', 'Detailing', 'autolavado', 1840),
  ('lav_ozono', 'Desinfección con ozono', 'Detailing', 'autolavado', 1850)
on conflict (key) do update set label = excluded.label, system = excluded.system, specialty = excluded.specialty, sort_order = excluded.sort_order;
