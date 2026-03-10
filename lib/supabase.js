import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl  = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://izqjisdldxocmatbcfzp.supabase.co';
const supabaseKey  = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6cWppc2RsZHhvY21hdGJjZnpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNjc2NjUsImV4cCI6MjA4ODY0MzY2NX0.4WiIfotZXF1ciYrt0p4OR9AW1ljbvcEPXLQ8uD87EKM';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
