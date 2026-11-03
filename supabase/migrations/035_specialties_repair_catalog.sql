-- 035: several specialties per garage + repair catalog for diagnoses (filtered by the garage's specialties).

-- 1) Garage specialties (keys of mechanic_specialty). `specialty` stays as the readable summary.
alter table public.garages add column if not exists specialties text[] not null default array['general'];
update public.garages set specialties = case specialty
  when 'Tren delantero y frenos' then array['tren_delantero_frenos']
  when 'Electroauto' then array['electroauto']
  when 'Mecánica ligera' then array['mecanica_ligera']
  when 'Motores' then array['motores']
  when 'Transmisiones' then array['transmisiones']
  when 'Latonería y pintura' then array['latoneria_pintura']
  when 'Papel ahumado' then array['papel_ahumado']
  when 'Car audio' then array['car_audio']
  when 'Alarmas' then array['alarmas']
  else array['general'] end
where specialties = array['general'];

-- 2) Repair catalog. "general" garages see everything; the others only their specialties.
create table if not exists public.repair_catalog (
  key text primary key check (key ~ '^[a-z0-9_]+$' and char_length(key) <= 60),
  label text not null check (char_length(trim(label)) between 2 and 120),
  system text not null check (char_length(trim(system)) between 2 and 80),
  specialty public.mechanic_specialty not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.repair_catalog enable row level security;
drop policy if exists repair_catalog_read on public.repair_catalog;
create policy repair_catalog_read on public.repair_catalog for select to authenticated using (true);

-- 3) Diagnoses keep the label they were given (catalog item or the mechanic's own "Otro…" text).
alter table public.diagnostics add column if not exists component_label text check (component_label is null or char_length(trim(component_label)) between 1 and 120);

insert into public.repair_catalog (key, label, system, specialty, sort_order) values
  ('bomba_agua', 'Bomba de agua', 'Enfriamiento', 'motores', 10),
  ('termostato', 'Termostato', 'Enfriamiento', 'motores', 20),
  ('radiador', 'Radiador', 'Enfriamiento', 'motores', 30),
  ('electroventilador', 'Electroventilador', 'Enfriamiento', 'motores', 40),
  ('mangueras_refrigerante', 'Mangueras de refrigerante', 'Enfriamiento', 'motores', 50),
  ('tapa_radiador', 'Tapa de radiador / envase', 'Enfriamiento', 'motores', 60),
  ('refrigerante', 'Refrigerante', 'Enfriamiento', 'motores', 70),
  ('sensor_temperatura', 'Sensor de temperatura (ECT)', 'Enfriamiento', 'motores', 80),
  ('inyectores', 'Inyectores', 'Combustible e inyección', 'motores', 90),
  ('bomba_gasolina', 'Bomba / módulo de gasolina', 'Combustible e inyección', 'motores', 100),
  ('filtro_gasolina', 'Filtro de gasolina', 'Combustible e inyección', 'motores', 110),
  ('regulador_presion', 'Regulador de presión', 'Combustible e inyección', 'motores', 120),
  ('cuerpo_aceleracion', 'Cuerpo de aceleración', 'Combustible e inyección', 'motores', 130),
  ('sensor_maf_map', 'Sensor MAF / MAP', 'Combustible e inyección', 'motores', 140),
  ('sensor_oxigeno', 'Sensor de oxígeno', 'Combustible e inyección', 'motores', 150),
  ('limpieza_inyectores', 'Limpieza de inyectores por ultrasonido', 'Combustible e inyección', 'motores', 160),
  ('bujias', 'Bujías', 'Encendido', 'electroauto', 170),
  ('bobinas', 'Bobinas', 'Encendido', 'electroauto', 180),
  ('cables_bujia', 'Cables de bujía', 'Encendido', 'electroauto', 190),
  ('sensor_ckp_cmp', 'Sensor CKP / CMP', 'Encendido', 'electroauto', 200),
  ('aceite_filtro', 'Aceite y filtro', 'Motor', 'motores', 210),
  ('filtro_aire', 'Filtro de aire', 'Motor', 'motores', 220),
  ('correa_tiempo', 'Correa / cadena de tiempo', 'Motor', 'motores', 230),
  ('correa_accesorios', 'Correa de accesorios', 'Motor', 'motores', 240),
  ('empacadura_culata', 'Empacadura de culata', 'Motor', 'motores', 250),
  ('empacadura_valvulas', 'Empacadura de tapa válvulas', 'Motor', 'motores', 260),
  ('soportes_motor', 'Soportes de motor', 'Motor', 'motores', 270),
  ('rectificacion_culata', 'Rectificación de culata', 'Motor', 'motores', 280),
  ('ajuste_motor', 'Ajuste de motor (overhaul)', 'Motor', 'motores', 290),
  ('anillos_pistones', 'Anillos y pistones', 'Motor', 'motores', 300),
  ('bomba_aceite', 'Bomba de aceite', 'Motor', 'motores', 310),
  ('retenes_motor', 'Retenes de motor', 'Motor', 'motores', 320),
  ('cambio_aceite', 'Cambio de aceite', 'Mantenimiento', 'mecanica_ligera', 330),
  ('filtro_aire_cabina', 'Filtro de aire de cabina', 'Mantenimiento', 'mecanica_ligera', 340),
  ('plumillas', 'Plumillas limpiaparabrisas', 'Mantenimiento', 'mecanica_ligera', 350),
  ('revision_niveles', 'Revisión de niveles', 'Mantenimiento', 'mecanica_ligera', 360),
  ('mantenimiento_general', 'Mantenimiento preventivo general', 'Mantenimiento', 'mecanica_ligera', 370),
  ('escaneo', 'Escaneo computarizado', 'Mantenimiento', 'mecanica_ligera', 380),
  ('pastillas', 'Pastillas', 'Frenos', 'tren_delantero_frenos', 390),
  ('discos', 'Discos', 'Frenos', 'tren_delantero_frenos', 400),
  ('bandas_tambores', 'Bandas / tambores', 'Frenos', 'tren_delantero_frenos', 410),
  ('liquido_frenos', 'Líquido de frenos', 'Frenos', 'tren_delantero_frenos', 420),
  ('calipers', 'Calipers', 'Frenos', 'tren_delantero_frenos', 430),
  ('bomba_frenos', 'Bomba de frenos', 'Frenos', 'tren_delantero_frenos', 440),
  ('rectificacion_discos', 'Rectificación de discos / tambores', 'Frenos', 'tren_delantero_frenos', 450),
  ('freno_mano', 'Freno de mano', 'Frenos', 'tren_delantero_frenos', 460),
  ('sensor_abs', 'Sensor ABS', 'Frenos', 'tren_delantero_frenos', 470),
  ('amortiguadores', 'Amortiguadores', 'Suspensión y dirección', 'tren_delantero_frenos', 480),
  ('bujes', 'Bujes', 'Suspensión y dirección', 'tren_delantero_frenos', 490),
  ('rotulas', 'Rótulas', 'Suspensión y dirección', 'tren_delantero_frenos', 500),
  ('terminales', 'Terminales de dirección', 'Suspensión y dirección', 'tren_delantero_frenos', 510),
  ('cremallera', 'Cremallera / caja de dirección', 'Suspensión y dirección', 'tren_delantero_frenos', 520),
  ('bomba_direccion', 'Bomba de dirección', 'Suspensión y dirección', 'tren_delantero_frenos', 530),
  ('rodamientos', 'Rodamientos', 'Suspensión y dirección', 'tren_delantero_frenos', 540),
  ('alineacion', 'Alineación', 'Suspensión y dirección', 'tren_delantero_frenos', 550),
  ('balanceo', 'Balanceo', 'Suspensión y dirección', 'tren_delantero_frenos', 560),
  ('muelles_espirales', 'Muelles / espirales', 'Suspensión y dirección', 'tren_delantero_frenos', 570),
  ('barra_estabilizadora', 'Barra estabilizadora / lápices', 'Suspensión y dirección', 'tren_delantero_frenos', 580),
  ('aceite_caja', 'Aceite de caja', 'Transmisión', 'transmisiones', 590),
  ('embrague', 'Embrague (clutch)', 'Transmisión', 'transmisiones', 600),
  ('tripoides_crucetas', 'Tripoides / crucetas', 'Transmisión', 'transmisiones', 610),
  ('caja', 'Caja de velocidades', 'Transmisión', 'transmisiones', 620),
  ('caja_automatica', 'Caja automática (reparación)', 'Transmisión', 'transmisiones', 630),
  ('convertidor_torque', 'Convertidor de torque', 'Transmisión', 'transmisiones', 640),
  ('diferencial', 'Diferencial', 'Transmisión', 'transmisiones', 650),
  ('bomba_clutch', 'Bomba / bombín de clutch', 'Transmisión', 'transmisiones', 660),
  ('palieres', 'Palieres / semiejes', 'Transmisión', 'transmisiones', 670),
  ('bateria', 'Batería', 'Eléctrico', 'electroauto', 680),
  ('alternador', 'Alternador', 'Eléctrico', 'electroauto', 690),
  ('arranque', 'Motor de arranque', 'Eléctrico', 'electroauto', 700),
  ('fusibles_reles', 'Fusibles / relés', 'Eléctrico', 'electroauto', 710),
  ('luces', 'Luces', 'Eléctrico', 'electroauto', 720),
  ('cableado', 'Cableado / cortocircuito', 'Eléctrico', 'electroauto', 730),
  ('computadora_ecu', 'Computadora (ECU)', 'Eléctrico', 'electroauto', 740),
  ('vidrios_electricos', 'Vidrios eléctricos', 'Eléctrico', 'electroauto', 750),
  ('tablero_instrumentos', 'Tablero de instrumentos', 'Eléctrico', 'electroauto', 760),
  ('cierre_centralizado', 'Cierre centralizado', 'Eléctrico', 'electroauto', 770),
  ('compresor_ac', 'Compresor', 'Aire acondicionado', 'electroauto', 780),
  ('gas_ac', 'Carga de gas', 'Aire acondicionado', 'electroauto', 790),
  ('condensador_ac', 'Condensador', 'Aire acondicionado', 'electroauto', 800),
  ('evaporador_ac', 'Evaporador', 'Aire acondicionado', 'electroauto', 810),
  ('valvula_expansion', 'Válvula de expansión', 'Aire acondicionado', 'electroauto', 820),
  ('blower_ac', 'Motor soplador (blower)', 'Aire acondicionado', 'electroauto', 830),
  ('enderezado', 'Enderezado de latonería', 'Latonería y pintura', 'latoneria_pintura', 840),
  ('pintura_pieza', 'Pintura de pieza', 'Latonería y pintura', 'latoneria_pintura', 850),
  ('pintura_completa', 'Pintura completa', 'Latonería y pintura', 'latoneria_pintura', 860),
  ('parachoques', 'Reparación de parachoques', 'Latonería y pintura', 'latoneria_pintura', 870),
  ('pulido_brillado', 'Pulido y brillado', 'Latonería y pintura', 'latoneria_pintura', 880),
  ('sacabollos', 'Sacabollos (sin pintura)', 'Latonería y pintura', 'latoneria_pintura', 890),
  ('anticorrosivo', 'Tratamiento anticorrosivo', 'Latonería y pintura', 'latoneria_pintura', 900),
  ('faros_restauracion', 'Restauración de faros', 'Latonería y pintura', 'latoneria_pintura', 910),
  ('vidrios_parabrisas', 'Parabrisas / vidrios', 'Latonería y pintura', 'latoneria_pintura', 920),
  ('ahumado_completo', 'Papel ahumado completo', 'Papel ahumado', 'papel_ahumado', 930),
  ('ahumado_parcial', 'Papel ahumado parcial', 'Papel ahumado', 'papel_ahumado', 940),
  ('retiro_ahumado', 'Retiro de papel ahumado', 'Papel ahumado', 'papel_ahumado', 950),
  ('lamina_seguridad', 'Lámina de seguridad', 'Papel ahumado', 'papel_ahumado', 960),
  ('ahumado_parabrisas', 'Franja de parabrisas', 'Papel ahumado', 'papel_ahumado', 970),
  ('radio_reproductor', 'Radio / reproductor', 'Car audio', 'car_audio', 980),
  ('cornetas', 'Cornetas', 'Car audio', 'car_audio', 990),
  ('amplificador', 'Amplificador', 'Car audio', 'car_audio', 1000),
  ('subwoofer', 'Subwoofer / cajón', 'Car audio', 'car_audio', 1010),
  ('cableado_audio', 'Cableado de audio', 'Car audio', 'car_audio', 1020),
  ('camara_retroceso', 'Cámara de retroceso', 'Car audio', 'car_audio', 1030),
  ('pantalla_multimedia', 'Pantalla multimedia', 'Car audio', 'car_audio', 1040),
  ('sensores_estacionamiento', 'Sensores de estacionamiento', 'Car audio', 'car_audio', 1050),
  ('alarma_instalacion', 'Instalación de alarma', 'Alarmas y seguridad', 'alarmas', 1060),
  ('alarma_reparacion', 'Reparación de alarma', 'Alarmas y seguridad', 'alarmas', 1070),
  ('control_remoto', 'Control remoto / llave', 'Alarmas y seguridad', 'alarmas', 1080),
  ('inmovilizador', 'Inmovilizador', 'Alarmas y seguridad', 'alarmas', 1090),
  ('gps_rastreo', 'GPS / rastreo satelital', 'Alarmas y seguridad', 'alarmas', 1100),
  ('corta_corriente', 'Corta corriente', 'Alarmas y seguridad', 'alarmas', 1110),
  ('programacion_llave', 'Programación de llave codificada', 'Alarmas y seguridad', 'alarmas', 1120)
on conflict (key) do update set label = excluded.label, system = excluded.system, specialty = excluded.specialty, sort_order = excluded.sort_order;
