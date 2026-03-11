import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator, Modal
} from 'react-native';
import { supabase } from '../../lib/supabase';

const AC = '#16a34a';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(false);
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState({ name:'', price:'', unit:'', stock:'' });
  const [saving, setSaving]     = useState(false);
  const [search, setSearch]     = useState('');

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data:{ user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('products').select('*').eq('user_id', user.id).order('created_at', { ascending:false });
      if (error) Alert.alert('Error', error.message);
      else setProducts(data || []);
    } catch(e) {
      Alert.alert('Error', 'Data load nahi hua, internet check karo');
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ name:'', price:'', unit:'', stock:'' });
    setModal(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm({ name:p.name, price:String(p.price), unit:p.unit||'', stock:String(p.stock||'') });
    setModal(true);
  };

  const saveProduct = async () => {
    if (!form.name.trim()) { Alert.alert('Error','Product ka naam daalo'); return; }
    if (!form.price || isNaN(Number(form.price))) { Alert.alert('Error','Valid price daalo'); return; }
    setSaving(true);
    const { data:{ user } } = await supabase.auth.getUser();
    const payload = {
      name: form.name.trim(), price: Number(form.price),
      unit: form.unit.trim(), stock: Number(form.stock)||0, user_id: user.id,
    };
    let error;
    if (editing) ({ error } = await supabase.from('products').update(payload).eq('id', editing.id));
    else         ({ error } = await supabase.from('products').insert(payload));
    setSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }
    setModal(false);
    fetchProducts();
  };

  const deleteProduct = (p) => {
    Alert.alert('Delete?', `"${p.name}" delete karna chahte ho?`, [
      { text:'Cancel', style:'cancel' },
      { text:'Delete', style:'destructive', onPress: async () => {
        const { error } = await supabase.from('products').delete().eq('id', p.id);
        if (error) Alert.alert('Error', error.message);
        else fetchProducts();
      }}
    ]);
  };

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TextInput style={styles.searchInput} placeholder="🔍 Search products..."
          value={search} onChangeText={setSearch} />
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Text style={styles.addBtnTxt}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={AC} size="large" style={{ marginTop:40 }} />
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🌱</Text>
          <Text style={styles.emptyText}>
            {search ? 'Koi product nahi mila' : 'Abhi tak koi product nahi\nAdd karo apna pehla product!'}
          </Text>
          {!search && (
            <TouchableOpacity style={[styles.btn,{marginTop:16,paddingHorizontal:28}]} onPress={openAdd}>
              <Text style={styles.btnTxt}>+ Product Add Karo</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding:16, paddingBottom:40 }}>
          <Text style={styles.countText}>{filtered.length} products</Text>
          {filtered.map(p => (
            <View key={p.id} style={styles.card}>
              <View style={{ flex:1 }}>
                <Text style={styles.productName}>🌿 {p.name}</Text>
                <View style={styles.tagRow}>
                  <View style={styles.tag}>
                    <Text style={styles.tagTxt}>₹{p.price}{p.unit?' / '+p.unit:''}</Text>
                  </View>
                  {p.stock > 0 && (
                    <View style={[styles.tag,{backgroundColor:'#eff6ff',borderColor:'#93c5fd'}]}>
                      <Text style={[styles.tagTxt,{color:'#1d4ed8'}]}>Stock: {p.stock}</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.actionBtns}>
                <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(p)}>
                  <Text style={{fontSize:16}}>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.delBtn} onPress={() => deleteProduct(p)}>
                  <Text style={{fontSize:16}}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <Modal visible={modal} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editing ? '✏️ Product Edit Karo' : '🌿 Naya Product'}</Text>
            {[
              ['Product Name *','name','e.g. Rose Plant','default'],
              ['Price (₹) *','price','e.g. 150','numeric'],
              ['Unit','unit','e.g. piece / kg / pot','default'],
              ['Stock (optional)','stock','e.g. 50','numeric'],
            ].map(([label,key,ph,kb]) => (
              <View key={key} style={styles.field}>
                <Text style={styles.label}>{label}</Text>
                <TextInput style={styles.input} value={form[key]}
                  onChangeText={v => setForm({...form,[key]:v})} placeholder={ph} keyboardType={kb} />
              </View>
            ))}
            <View style={{flexDirection:'row',gap:10,marginTop:8}}>
              <TouchableOpacity style={[styles.btn,{flex:1,backgroundColor:'#f3f4f6'}]} onPress={() => setModal(false)}>
                <Text style={{color:'#555',fontWeight:'700'}}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn,{flex:2}]} onPress={saveProduct} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff"/> :
                  <Text style={styles.btnTxt}>{editing?'Update':'Save'} Product</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex:1, backgroundColor:'#f1f5f1' },
  topBar:      { flexDirection:'row', gap:10, padding:16, backgroundColor:'#fff', elevation:2, shadowColor:'#000', shadowOpacity:0.06, shadowRadius:6 },
  searchInput: { flex:1, borderWidth:1.5, borderColor:'#e5e7eb', borderRadius:10, padding:10, fontSize:14, color:'#111' },
  addBtn:      { backgroundColor:AC, borderRadius:10, paddingHorizontal:16, justifyContent:'center' },
  addBtnTxt:   { color:'#fff', fontWeight:'800', fontSize:14 },
  empty:       { flex:1, alignItems:'center', justifyContent:'center', padding:40 },
  emptyIcon:   { fontSize:60, marginBottom:16 },
  emptyText:   { color:'#888', textAlign:'center', fontSize:15, lineHeight:24 },
  countText:   { color:'#888', fontSize:12, marginBottom:10, fontWeight:'600' },
  card:        { backgroundColor:'#fff', borderRadius:14, padding:14, marginBottom:12, flexDirection:'row', alignItems:'center', elevation:2, shadowColor:'#000', shadowOpacity:0.06, shadowRadius:8 },
  productName: { fontWeight:'800', fontSize:15, color:'#1a1a1a', marginBottom:8 },
  tagRow:      { flexDirection:'row', gap:8, flexWrap:'wrap' },
  tag:         { backgroundColor:'#f0fdf4', borderWidth:1, borderColor:'#86efac', borderRadius:20, paddingHorizontal:10, paddingVertical:4 },
  tagTxt:      { color:AC, fontSize:12, fontWeight:'700' },
  actionBtns:  { flexDirection:'row', gap:8, marginLeft:10 },
  editBtn:     { width:36, height:36, borderRadius:10, backgroundColor:'#eff6ff', alignItems:'center', justifyContent:'center' },
  delBtn:      { width:36, height:36, borderRadius:10, backgroundColor:'#fff1f2', alignItems:'center', justifyContent:'center' },
  field:       { marginBottom:12 },
  label:       { fontSize:12, fontWeight:'700', color:'#555', marginBottom:4 },
  input:       { borderWidth:1.5, borderColor:'#e5e7eb', borderRadius:10, padding:11, fontSize:14, color:'#111' },
  btn:         { backgroundColor:AC, borderRadius:12, padding:13, alignItems:'center', justifyContent:'center' },
  btnTxt:      { color:'#fff', fontWeight:'800', fontSize:15 },
  modalBg:     { flex:1, backgroundColor:'rgba(0,0,0,.55)', justifyContent:'flex-end' },
  modalCard:   { backgroundColor:'#fff', borderTopLeftRadius:22, borderTopRightRadius:22, padding:24 },
  modalTitle:  { fontWeight:'800', fontSize:17, color:AC, marginBottom:18 },
});
