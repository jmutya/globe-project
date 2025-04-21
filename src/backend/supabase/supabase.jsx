import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hwzupadvbapbyxgbtwcb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3enVwYWR2YmFwYnl4Z2J0d2NiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMwNTg3MjgsImV4cCI6MjA1ODYzNDcyOH0.-vgdI5BYGaHXZKNBmQAfK0YMSDt_7gh-V4G5jY-5HE4'; // Use the anon public key from Supabase
const supabase = createClient(supabaseUrl, supabaseKey);


export default supabase;

