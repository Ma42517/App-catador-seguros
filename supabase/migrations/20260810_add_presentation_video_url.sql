-- Video de presentación de la tarjeta digital.
--
-- Se guarda el enlace, no el archivo: un video de presentación pesa cientos de
-- megas y se ve unas pocas veces, así que alojarlo en Storage gastaría espacio
-- y tráfico del proyecto para hacer peor lo que YouTube y Vimeo ya hacen
-- —convertir a varias calidades y servir desde el nodo más cercano—.
--
-- `if not exists` deja el guion repetible: correrlo dos veces no falla, que es
-- lo que hace falta cuando no se recuerda si ya se aplicó.

alter table public.profiles
  add column if not exists presentation_video_url text;

comment on column public.profiles.presentation_video_url is
  'Enlace público a YouTube o Vimeo con el video de presentación del asesor. '
  'La app sólo incrusta enlaces de esos dos dominios; cualquier otro se ignora.';
