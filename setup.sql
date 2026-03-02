-- Database Schema for Nearpod/Wordwall Clone

-- 1. Create Session Table
CREATE TABLE sesion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slide_actual INTEGER DEFAULT 0,
    estado TEXT DEFAULT 'activa', -- activa, pausada
    pregunta_abierta BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Students Table
CREATE TABLE estudiantes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    sesion_id UUID REFERENCES sesion(id),
    fecha_ingreso TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create Questions Table
CREATE TABLE preguntas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    texto TEXT NOT NULL,
    tipo TEXT NOT NULL, -- multiple, vf, abierta
    opcion_a TEXT,
    opcion_b TEXT,
    opcion_c TEXT,
    opcion_d TEXT,
    correcta TEXT,
    orden INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create Answers Table
CREATE TABLE respuestas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estudiante_id UUID REFERENCES estudiantes(id),
    pregunta_id UUID REFERENCES preguntas(id),
    respuesta TEXT NOT NULL,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(estudiante_id, pregunta_id) -- Prevent double answers
);

-- Enable Realtime for sesion and respuestas
-- Note: This requires enabling the publication in Supabase dashboard or via SQL
-- Check if 'supabase_realtime' publication exists, if not create it
-- DO NOT RUN THIS IN A SCRIPT WITHOUT CHECKING IF IT EXISTS, but common practice in migration:
-- ALTER PUBLICATION supabase_realtime ADD TABLE sesion;
-- ALTER PUBLICATION supabase_realtime ADD TABLE respuestas;

-- Seed initial session (optional but helpful for testing)
INSERT INTO sesion (id, slide_actual, estado, pregunta_abierta)
VALUES ('00000000-0000-0000-0000-000000000000', 0, 'activa', FALSE)
ON CONFLICT (id) DO NOTHING;

-- Seed some sample questions
INSERT INTO preguntas (texto, tipo, opcion_a, opcion_b, opcion_c, opcion_d, correcta, orden)
VALUES 
('¿Cuál es el stack de este proyecto?', 'multiple', 'React', 'Vue', 'Vanilla JS', 'Angular', 'Vanilla JS', 1),
('¿Es Supabase una alternativa a Firebase?', 'vf', 'Verdadero', 'Falso', NULL, NULL, 'Verdadero', 2),
('¿Cómo te sientes hoy?', 'abierta', NULL, NULL, NULL, NULL, NULL, 3);
