import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function createConversationTables() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  console.log('🚀 Creating missing conversation tables...');
  
  try {
    // Manual table creation since we can't run arbitrary SQL
    console.log('📋 Creating conversations table...');
    
    // Test if conversations table exists by trying to select from it
    const { error: convTestError } = await supabase
      .from('conversations')
      .select('id')
      .limit(0);
      
    if (convTestError && convTestError.message.includes('Could not find the table')) {
      console.log('❌ Conversations table missing - needs manual creation');
      console.log('');
      console.log('Please run the following SQL in your Supabase dashboard:');
      console.log('');
      console.log('-- Create conversations table');
      console.log('CREATE TABLE public.conversations (');
      console.log('  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),');
      console.log('  created_at timestamptz DEFAULT now(),');
      console.log('  updated_at timestamptz DEFAULT now()');
      console.log(');');
      console.log('');
      console.log('-- Create conversation participants table');
      console.log('CREATE TABLE public.conversation_participants (');
      console.log('  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,');
      console.log('  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,');
      console.log('  role text CHECK (role IN (\'athlete\',\'coach\')) NOT NULL,');
      console.log('  created_at timestamptz DEFAULT now(),');
      console.log('  PRIMARY KEY (conversation_id, user_id)');
      console.log(');');
      console.log('');
      console.log('-- Add conversation support to messages table');  
      console.log('ALTER TABLE public.messages');
      console.log('ADD COLUMN IF NOT EXISTS conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE;');
      console.log('');
      console.log('ALTER TABLE public.messages');
      console.log('ADD COLUMN IF NOT EXISTS kind text DEFAULT \'text\';');
      console.log('');
      console.log('-- Enable RLS');
      console.log('ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;');
      console.log('ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;');
      console.log('');
      console.log('After running this SQL, try the booking flow again.');
      
      return false;
    } else {
      console.log('✅ Conversations table exists');
    }
    
    // Test conversation_participants table
    const { error: partTestError } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .limit(0);
      
    if (partTestError && partTestError.message.includes('Could not find the table')) {
      console.log('❌ conversation_participants table missing');
      return false;
    } else {
      console.log('✅ conversation_participants table exists');
    }
    
    console.log('🎉 All conversation tables exist!');
    return true;
    
  } catch (error) {
    console.error('❌ Error checking tables:', error);
    return false;
  }
}

createConversationTables();