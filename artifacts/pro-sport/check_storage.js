import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  const { data, error } = await supabase.storage.from('avatars').list()
  console.log('Folders in avatars:', data, error)
  
  if (data && data.length > 0) {
    const folder = data[0].name
    const { data: files } = await supabase.storage.from('avatars').list(folder)
    console.log(`Files in ${folder}:`, files)
  }
}

check()
