// aalvar-app/lib/supabase.ts

import { createClient } from '@supabase/supabase-js'

// Creamos el cliente de Supabase usando nuestras variables de entorno
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)