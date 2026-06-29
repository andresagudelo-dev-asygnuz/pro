import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ewzpwldtaeaxtesimjau.supabase.co';
const supabaseKey = 'sb_publishable_N2vCZ-Sq52gZLjC8HQkqDg_7v6vIc5C';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Signing up user...');
  const { data, error } = await supabase.auth.signUp({
    email: 'marchagas@example.com',
    password: 'Test1234!'
  });
  
  if (error) {
    console.error('Error signing up:', error);
    if (error.message.includes('already registered')) {
        console.log('User already exists. Logging in to update role...');
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
            email: 'marchagas@example.com',
            password: 'Test1234!'
        });
        if (loginError) {
            console.error('Login error:', loginError);
            return;
        }
        await updateRole(loginData.user.id);
    }
    return;
  }
  
  const userId = data.user.id;
  console.log('User created:', userId);
  
  // Wait a few seconds for triggers to run
  await new Promise(r => setTimeout(r, 2000));
  
  await updateRole(userId);
}

async function updateRole(userId) {
  console.log('Setting cancha role for user:', userId);
  const { error: roleError } = await supabase
    .from('user_roles')
    .update({ is_cancha: true })
    .eq('user_id', userId);
    
  if (roleError) {
    console.error('Error setting role:', roleError);
  } else {
    console.log('Role updated successfully! User is now a Cancha owner.');
  }
}

main();
