import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://izqjisdldxocmatbcfzp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6cWppc2RsZHhvY21hdGJjZnpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNjc2NjUsImV4cCI6MjA4ODY0MzY2NX0.4WiIfotZXF1ciYrt0p4OR9AW1ljbvcEPXLQ8uD87EKM';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
