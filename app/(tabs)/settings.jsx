import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { router } from 'expo-router';

const AC = '#16a34a';

export default function Settings() {
  const [user, setUser]           = useState(null);
  const [shopName, setShopName]   = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone]         = useState('');
  const [address, setAddress]     = useState('');
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [stats, setStats]         = useState({ bills:0, products:0, revenue:0 });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const { data:{ user } } = await supabase.auth.getUser();
      setUser(user);

      const { data: profile } = await supabase
        .from('profiles').select('*').eq('user_id', user.id).maybeSingle();
      if (profile) {
        setShopName(profile.shop_name||'');
        setOwnerName(profile.owner_name||'');
        setPhone(profile.phone||'');
        setAddress(profile.address||'');
      }

      const [billsRes, prodsRes, billDataRes] = await Promise.all([
        supabase.from('bills').select('*',{count:'exact',head:true}).eq('user_id',user.id),
        supabase.from('products').select('*',{count:'exact',head:true}).eq('user_id',user.id),
        supabase.from('bills').select('total').eq('user_id',user.id),
      ]);
      const revenue = (billDataRes.data||[]).reduce((s,b) => s+(b.total||0), 0);
      setStats({ bills:billsRes.count||0, products:prodsRes.count||0, revenue });
    } catch(e) {
      console.log('Settings error:', e);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    const { data:{ user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('profiles').upsert({
      user_id: user.id,
      shop_name: shopName.trim(),
      owner_name: ownerName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      updated_at: new Date().toISOString(),
    }, { onConflict:'user_id' });
    setSaving(false);
    if (error) Alert.alert('Error', error.message);
    else Alert.alert('✅ Saved!', 'Profile save ho gaya');
  };

  const logout = () => {
    Alert.alert('Logout?', 'Kya aap logout karna chahte ho?', [
      { text:'Cancel', style:'cancel' },
      { text:'Logout', style:'destructive', onPress: async () => {
        await supabase.auth.signOut();
        router.replace('/');
      }}
    ]);
  };

  if (loading) return <ActivityIndicator color={AC} size="large" style={{marginTop:60}} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{padding:16,paddingBottom:60}}>

      {/* Account */}
      <View style={styles.card}>
        <View style={styles.avatar}><Text style={{fontSize:28}}>🌿</Text></View>
        <Text style={styles.email}>{user?.email}</Text>
        <Text style={styles.joinDate}>
          Member since {new Date(user?.created_at).toLocaleDateString('en-IN',{month:'long',year:'numeric'})}
        </Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{stats.bills}</Text>
          <Text style={styles.statLabel}>Bills</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{stats.products}</Text>
          <Text style={styles.statLabel}>Products</Text>
        </View>
        <View style={[styles.statCard,{backgroundColor:'#f0fdf4'}]}>
          <Text style={[styles.statNum,{color:AC}]}>₹{stats.revenue}</Text>
          <Text style={styles.statLabel}>Revenue</Text>
        </View>
      </View>

      {/* Shop Profile */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🏪 Shop Profile</Text>
        {[
          ['Shop Name', shopName, setShopName, 'e.g. Agam Nursery', 'default'],
          ['Owner Name', ownerName, setOwnerName, 'Aapka naam', 'default'],
          ['Phone', phone, setPhone, 'Contact number', 'phone-pad'],
          ['Address', address, setAddress, 'Shop ki address', 'default'],
        ].map(([label,value,setter,ph,kb]) => (
          <View key={label} style={styles.field}>
            <Text style={styles.label}>{label}</Text>
            <TextInput style={styles.input} value={value} onChangeText={setter}
              placeholder={ph} keyboardType={kb} />
          </View>
        ))}
        <TouchableOpacity style={styles.btn} onPress={saveProfile} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff"/> :
            <Text style={styles.btnTxt}>💾 Save Profile</Text>}
        </TouchableOpacity>
      </View>

      {/* App Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ℹ️ App Info</Text>
        {[
          ['App Name','Nursery Billing'],
          ['Version','1.0.0'],
          ['Built with','React Native + Supabase'],
        ].map(([k,v]) => (
          <View key={k} style={styles.infoRow}>
            <Text style={styles.infoKey}>{k}</Text>
            <Text style={styles.infoVal}>{v}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutTxt}>🚪 Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:    { flex:1, backgroundColor:'#f1f5f1' },
  card:         { backgroundColor:'#fff', borderRadius:14, padding:20, marginBottom:14, alignItems:'center', elevation:2, shadowColor:'#000', shadowOpacity:0.06, shadowRadius:8 },
  avatar:       { width:70, height:70, borderRadius:35, backgroundColor:'#f0fdf4', borderWidth:2, borderColor:'#86efac', alignItems:'center', justifyContent:'center', marginBottom:10 },
  email:        { fontWeight:'700', fontSize:15, color:'#1a1a1a' },
  joinDate:     { fontSize:12, color:'#888', marginTop:4 },
  statsRow:     { flexDirection:'row', gap:10, marginBottom:14 },
  statCard:     { flex:1, backgroundColor:'#fff', borderRadius:12, padding:14, alignItems:'center', elevation:2, shadowColor:'#000', shadowOpacity:0.06, shadowRadius:6 },
  statNum:      { fontSize:22, fontWeight:'900', color:'#1a1a1a' },
  statLabel:    { fontSize:11, color:'#888', marginTop:2, fontWeight:'600' },
  section:      { backgroundColor:'#fff', borderRadius:14, padding:16, marginBottom:14, elevation:2, shadowColor:'#000', shadowOpacity:0.06, shadowRadius:8 },
  sectionTitle: { fontWeight:'800', fontSize:15, color:AC, borderLeftWidth:4, borderLeftColor:AC, paddingLeft:10, marginBottom:14 },
  field:        { marginBottom:12 },
  label:        { fontSize:12, fontWeight:'700', color:'#555', marginBottom:4 },
  input:        { borderWidth:1.5, borderColor:'#e5e7eb', borderRadius:10, padding:11, fontSize:14, color:'#111' },
  btn:          { backgroundColor:AC, borderRadius:12, padding:13, alignItems:'center', elevation:2 },
  btnTxt:       { color:'#fff', fontWeight:'800', fontSize:15 },
  infoRow:      { flexDirection:'row', justifyContent:'space-between', paddingVertical:8, borderBottomWidth:1, borderColor:'#f3f4f6' },
  infoKey:      { color:'#888', fontSize:13 },
  infoVal:      { color:'#1a1a1a', fontWeight:'600', fontSize:13 },
  logoutBtn:    { backgroundColor:'#fff1f2', borderRadius:12, padding:14, alignItems:'center', borderWidth:1.5, borderColor:'#fecdd3' },
  logoutTxt:    { color:'#e11d48', fontWeight:'800', fontSize:15 },
});
