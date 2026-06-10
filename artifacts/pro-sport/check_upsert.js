import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function testUpsert() {
  const userId = '5fcfc6b5-f9f9-4de1-8c78-290702b50e6b'
  
  // 1. Get current profile
  let { data: p1 } = await supabase.from('profiles').select('avatar_url').eq('id', userId).single()
  console.log('Before upsert:', p1)
  
  // 2. Upsert without avatar_url
  const { error } = await supabase.from('profiles').upsert({
    id: userId,
    full_name: 'Test Name',
    city: 'Test City'
  })
  console.log('Upsert error:', error)
  
  // 3. Get profile again
  let { data: p2 } = await supabase.from('profiles').select('avatar_url').eq('id', userId).single()
  console.log('After upsert:', p2)
}

testUpsert()
