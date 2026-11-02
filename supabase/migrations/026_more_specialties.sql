-- New repair categories (mechanic specialties).
alter type public.mechanic_specialty add value if not exists 'latoneria_pintura' before 'general';
alter type public.mechanic_specialty add value if not exists 'papel_ahumado' before 'general';
alter type public.mechanic_specialty add value if not exists 'car_audio' before 'general';
alter type public.mechanic_specialty add value if not exists 'alarmas' before 'general';
