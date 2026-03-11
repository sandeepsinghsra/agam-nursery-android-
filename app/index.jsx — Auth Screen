import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';

const AC = '#16a34a';

export default function AuthScreen() {
  const [mode, setMode]         = useState('login');
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [pass, setPass]         = useState('');
  const [pass2, setPass2]       = useState('');
  const [loading, setLoading]   = useState(false);

  const doLogin = async () => {
    if (!email.trim() || !pass.trim()) { Alert.alert('Error', 'Email aur password bharo'); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pass });
      if (error) Alert.alert('Login Failed', error.message);
      else router.replace('/(tabs)/newbill');
    } catch(e) {
      Alert.alert('Error', 'Internet check karo');
    } finally {
      setLoading(false);
    }
  };

  const doRegister = async () => {
    if (!name.trim() || !email.trim() || !pass || !pass2) { Alert.alert('Error', 'Sab fields bharo'); return; }
    if (pass !== pass2) { Alert.alert('Error', 'Passwords match nahi karte'); return; }
    if (pass.length < 6) { Alert.alert('Error', 'Password min 6 characters'); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(), password: pass,
        options: { data: { name: name.trim() } }
      });
      if (error) Alert.alert('Register Failed', error.message);
      else { Alert.alert('✅ Account ban gaya!', 'Ab login karo'); setMode('login'); }
    } catch(e) {
      Alert.alert('Error', 'Internet check karo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>🌱</Text>
        <Text style={styles.title}>Nursery Billing</Text>
        <Text style={styles.sub}>Aapka data cloud mein safe hai ☁️</Text>

        <View style={styles.tabRow}>
          {[['login','🔑 Login'],['register','📝 Register']].map(([k,l]) => (
            <TouchableOpacity key={k} onPress={() => setMode(k)}
              style={[styles.tab, mode===k && styles.tabActive]}>
              <Text style={[styles.tabTxt, mode===k && styles.tabTxtActive]}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.card}>
          {mode === 'register' && (
            <View style={styles.field}>
              <Text style={styles.label}>👤 Full Name</Text>
              <TextInput style={styles.input} value={name} onChangeText={setName}
                placeholder="Aapka naam" autoCapitalize="words" />
            </View>
          )}
          <View style={styles.field}>
            <Text style={styles.label}>📧 Email</Text>
            <TextInput style={styles.input} value={email} onChangeText={setEmail}
              placeholder="aapka@email.com" keyboardType="email-address" autoCapitalize="none" />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>🔒 Password</Text>
            <TextInput style={styles.input} value={pass} onChangeText={setPass}
              placeholder={mode==='register'?'Min 6 characters':'Aapka password'} secureTextEntry />
          </View>
          {mode === 'register' && (
            <View style={styles.field}>
              <Text style={styles.label}>🔒 Confirm Password</Text>
              <TextInput style={styles.input} value={pass2} onChangeText={setPass2}
                placeholder="Password dobara" secureTextEntry />
            </View>
          )}

          <TouchableOpacity style={styles.btn} onPress={mode==='login' ? doLogin : doRegister} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> :
              <Text style={styles.btnTxt}>{mode==='login' ? '🔑 Login' : '📝 Account Banao'}</Text>}
          </TouchableOpacity>

          <Text style={styles.switchTxt}>
            {mode==='login' ? 'Account nahi hai? ' : 'Already account hai? '}
            <Text style={styles.switchLink} onPress={() => setMode(mode==='login' ? 'register' : 'login')}>
              {mode==='login' ? 'Register karo' : 'Login karo'}
            </Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:    { flexGrow:1, alignItems:'center', justifyContent:'center', padding:20, backgroundColor:'#f0fdf4' },
  logo:         { fontSize:56, marginBottom:8 },
  title:        { fontSize:26, fontWeight:'900', color:AC, marginBottom:4 },
  sub:          { fontSize:13, color:'#666', marginBottom:24 },
  tabRow:       { flexDirection:'row', backgroundColor:'#f3f4f6', borderRadius:12, padding:4, marginBottom:20, width:'100%' },
  tab:          { flex:1, padding:10, borderRadius:9, alignItems:'center' },
  tabActive:    { backgroundColor:'#fff', shadowColor:'#000', shadowOpacity:0.1, shadowRadius:4, elevation:2 },
  tabTxt:       { fontSize:14, fontWeight:'500', color:'#666' },
  tabTxtActive: { fontWeight:'700', color:AC },
  card:         { backgroundColor:'#fff', borderRadius:20, padding:24, width:'100%', elevation:4, shadowColor:'#000', shadowOpacity:0.1, shadowRadius:10 },
  field:        { marginBottom:14 },
  label:        { fontSize:12, fontWeight:'700', color:'#555', marginBottom:5 },
  input:        { borderWidth:1.5, borderColor:'#e5e7eb', borderRadius:10, padding:12, fontSize:14, color:'#111' },
  btn:          { backgroundColor:AC, borderRadius:12, padding:14, alignItems:'center', marginTop:6, elevation:3 },
  btnTxt:       { color:'#fff', fontWeight:'800', fontSize:16 },
  switchTxt:    { textAlign:'center', marginTop:16, fontSize:13, color:'#888' },
  switchLink:   { color:AC, fontWeight:'700' },
});
