import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator, Modal, TextInput, RefreshControl
} from 'react-native';
import { supabase } from '../../lib/supabase';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const AC = '#16a34a';

export default function History() {
  const [bills, setBills]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected]     = useState(null);
  const [search, setSearch]         = useState('');
  const [stats, setStats]           = useState({ total:0, revenue:0, today:0 });

  useEffect(() => { fetchBills(); }, []);

  const fetchBills = async () => {
    try {
      const { data:{ user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('bills').select('*').eq('user_id', user.id).order('created_at', { ascending:false });
      if (error) { Alert.alert('Error', error.message); return; }
      setBills(data || []);
      const todayStr = new Date().toDateString();
      const todayBills = (data||[]).filter(b => new Date(b.created_at).toDateString() === todayStr);
      const revenue = (data||[]).reduce((s,b) => s+(b.total||0), 0);
      setStats({ total:data?.length||0, revenue, today:todayBills.length });
    } catch(e) {
      Alert.alert('Error', 'Data load nahi hua, internet check karo');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => { setRefreshing(true); fetchBills(); }, []);

  const deleteBill = (bill) => {
    Alert.alert('Delete Bill?', `${bill.invoice_id} delete karna chahte ho?`, [
      { text:'Cancel', style:'cancel' },
      { text:'Delete', style:'destructive', onPress: async () => {
        const { error } = await supabase.from('bills').delete().eq('id', bill.id);
        if (error) Alert.alert('Error', error.message);
        else { setSelected(null); fetchBills(); }
      }}
    ]);
  };

  const downloadPDF = async (bill) => {
    const html = buildHTML(bill);
    try {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { mimeType:'application/pdf', dialogTitle:'Receipt Share Karo' });
    } catch(e) { Alert.alert('Error', e.message); }
  };

  const shareWA = (bill) => {
    const lines = (bill.items||[]).map(i =>
      `• ${i.name} x${i.qty} = ₹${(i.price-(Number(i.itemDisc)||0))*i.qty}`).join('\n');
    const date = new Date(bill.created_at).toLocaleDateString('en-IN');
    const txt = `🌱 *Nursery Billing*\n━━━━━━━━━━━━━━\n*${bill.invoice_id}* | ${date}\n━━━━━━━━━━━━━━\n👤 *${bill.customer_name}*\n📞 ${bill.customer_phone||'-'}\n━━━━━━━━━━━━━━\n*Items:*\n${lines}\n━━━━━━━━━━━━━━\n*💰 TOTAL: ₹${bill.total}*\n${bill.note?'📝 '+bill.note:''}\n_Thank you! 🌿_`;
    Sharing.shareAsync(`https://wa.me/?text=${encodeURIComponent(txt)}`);
  };

  const filtered = bills.filter(b =>
    b.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    b.invoice_id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total Bills</Text>
        </View>
        <View style={[styles.statCard,{backgroundColor:'#f0fdf4'}]}>
          <Text style={[styles.statNum,{color:AC}]}>₹{stats.revenue}</Text>
          <Text style={styles.statLabel}>Revenue</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{stats.today}</Text>
          <Text style={styles.statLabel}>Aaj Ke Bills</Text>
        </View>
      </View>

      <View style={{paddingHorizontal:16,paddingBottom:10,backgroundColor:'#fff'}}>
        <TextInput style={styles.searchInput}
          placeholder="🔍 Customer ya Invoice search karo..."
          value={search} onChangeText={setSearch} />
      </View>

      {loading ? (
        <ActivityIndicator color={AC} size="large" style={{marginTop:40}} />
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📊</Text>
          <Text style={styles.emptyText}>{search?'Koi bill nahi mila':'Abhi tak koi bill nahi\nNew Bill tab se banao!'}</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{padding:16,paddingBottom:40}}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={AC}/>}
        >
          {filtered.map(bill => (
            <TouchableOpacity key={bill.id} style={styles.card} onPress={() => setSelected(bill)}>
              <View style={{flex:1}}>
                <View style={styles.cardHeader}>
                  <Text style={styles.invoiceId}>{bill.invoice_id}</Text>
                  <Text style={styles.totalAmt}>₹{bill.total}</Text>
                </View>
                <Text style={styles.custName}>👤 {bill.customer_name}</Text>
                {bill.customer_phone ? <Text style={styles.meta}>📞 {bill.customer_phone}</Text> : null}
                <View style={styles.cardFooter}>
                  <Text style={styles.meta}>🛒 {(bill.items||[]).length} items</Text>
                  <Text style={styles.date}>{new Date(bill.created_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</Text>
                </View>
              </View>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Bill Detail Modal */}
      <Modal visible={!!selected} animationType="slide" transparent onRequestClose={() => setSelected(null)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {selected && (
                <>
                  <View style={styles.modalHeader}>
                    <View>
                      <Text style={styles.modalInvoice}>{selected.invoice_id}</Text>
                      <Text style={styles.date}>{new Date(selected.created_at).toLocaleString('en-IN')}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setSelected(null)}>
                      <Text style={{fontSize:22,color:'#aaa'}}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.custBox}>
                    <Text style={{fontWeight:'800',fontSize:15}}>👤 {selected.customer_name}</Text>
                    {selected.customer_phone?<Text style={styles.meta}>📞 {selected.customer_phone}</Text>:null}
                    {selected.customer_address?<Text style={styles.meta}>📍 {selected.customer_address}</Text>:null}
                  </View>

                  <Text style={[styles.sectionTitle,{marginTop:14}]}>Items</Text>
                  {(selected.items||[]).map((item,idx) => {
                    const disc = Number(item.itemDisc)||0;
                    return (
                      <View key={idx} style={styles.itemRow}>
                        <Text style={{flex:1,fontWeight:'600'}}>🌿 {item.name}</Text>
                        <Text style={styles.meta}>x{item.qty}</Text>
                        <Text style={{fontWeight:'800',color:AC,minWidth:60,textAlign:'right'}}>
                          ₹{(item.price-disc)*item.qty}
                        </Text>
                      </View>
                    );
                  })}

                  <View style={styles.totalBox}>
                    <View style={styles.trow}><Text style={{color:'#555'}}>Subtotal</Text><Text>₹{selected.subtotal}</Text></View>
                    {selected.total_disc>0&&(
                      <View style={styles.trow}>
                        <Text style={{color:'#e11d48'}}>Discount</Text>
                        <Text style={{color:'#e11d48'}}>-₹{selected.total_disc}</Text>
                      </View>
                    )}
                    <View style={[styles.trow,{marginTop:6}]}>
                      <Text style={{fontWeight:'900',color:AC,fontSize:17}}>TOTAL</Text>
                      <Text style={{fontWeight:'900',color:AC,fontSize:17}}>₹{selected.total}</Text>
                    </View>
                  </View>
                  {selected.note?(
                    <View style={styles.noteBox}><Text style={{color:'#92400e'}}>📝 {selected.note}</Text></View>
                  ):null}

                  <View style={{gap:10,marginTop:16}}>
                    <TouchableOpacity style={[styles.btn,{backgroundColor:'#0ea5e9'}]} onPress={() => downloadPDF(selected)}>
                      <Text style={styles.btnTxt}>📄 Download PDF</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.btn,{backgroundColor:'#25D366'}]} onPress={() => shareWA(selected)}>
                      <Text style={styles.btnTxt}>💬 WhatsApp Share</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.btn,{backgroundColor:'#fff1f2',elevation:0}]} onPress={() => deleteBill(selected)}>
                      <Text style={{color:'#e11d48',fontWeight:'700'}}>🗑️ Bill Delete Karo</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function buildHTML(bill) {
  const ac='#16a34a';
  const items=bill.items||[];
  const date=new Date(bill.created_at).toLocaleString('en-IN');
  const rows=items.map((i,idx)=>{
    const d=Number(i.itemDisc)||0, net=(i.price-d)*i.qty;
    return `<tr style="background:${idx%2===0?'#fff':'#f9fdf9'}">
      <td style="padding:12px;font-size:15pt">${i.name}</td>
      <td style="padding:12px;text-align:center;font-size:15pt">${i.qty}</td>
      <td style="padding:12px;text-align:right;font-size:15pt">₹${i.price}</td>
      <td style="padding:12px;text-align:right;font-weight:700;font-size:15pt">₹${net}</td>
    </tr>`;
  }).join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;padding:20px}table{width:100%;border-collapse:collapse}</style></head><body>
    <div style="text-align:center;border-bottom:4px solid ${ac};padding-bottom:12px;margin-bottom:16px">
      <div style="font-size:28pt;font-weight:900;color:${ac}">Nursery Billing</div>
      <div style="margin-top:8px"><span style="border:2px solid ${ac};padding:4px 20px;border-radius:20px;color:${ac};font-weight:700">TAX INVOICE</span></div>
    </div>
    <div style="margin-bottom:12px"><b>Invoice:</b> ${bill.invoice_id} &nbsp; <b>Date:</b> ${date}</div>
    <div style="border:1.5px solid #d1fae5;border-radius:8px;padding:12px;margin-bottom:16px">
      <div style="font-size:18pt;font-weight:900">${bill.customer_name}</div>
      ${bill.customer_phone?`<div>📞 ${bill.customer_phone}</div>`:''}
      ${bill.customer_address?`<div>📍 ${bill.customer_address}</div>`:''}
    </div>
    <table><thead><tr style="background:${ac};color:#fff">
      <th style="padding:12px;text-align:left">Item</th>
      <th style="padding:12px;text-align:center">Qty</th>
      <th style="padding:12px;text-align:right">Price</th>
      <th style="padding:12px;text-align:right">Amount</th>
    </tr></thead><tbody>${rows}</tbody></table>
    <div style="text-align:right;margin-top:16px;border:1.5px solid #d1fae5;border-radius:8px;padding:12px">
      <div style="font-size:14pt">Subtotal: ₹${bill.subtotal}</div>
      ${bill.total_disc>0?`<div style="color:#e11d48">Discount: -₹${bill.total_disc}</div>`:''}
      <div style="font-size:18pt;font-weight:900;color:${ac}">TOTAL: ₹${bill.total}</div>
    </div>
    ${bill.note?`<div style="margin-top:12px;padding:10px;background:#fffde7;border-left:4px solid #f59e0b">Note: ${bill.note}</div>`:''}
    <div style="text-align:center;margin-top:20px;color:${ac};font-weight:700">Thank you for your purchase! 🌿</div>
  </body></html>`;
}

const styles = StyleSheet.create({
  container:    { flex:1, backgroundColor:'#f1f5f1' },
  statsRow:     { flexDirection:'row', backgroundColor:'#fff', padding:14, gap:10, elevation:2, shadowColor:'#000', shadowOpacity:0.06, shadowRadius:6 },
  statCard:     { flex:1, backgroundColor:'#f8faf8', borderRadius:12, padding:12, alignItems:'center' },
  statNum:      { fontSize:20, fontWeight:'900', color:'#1a1a1a' },
  statLabel:    { fontSize:11, color:'#888', marginTop:2, fontWeight:'600' },
  searchInput:  { borderWidth:1.5, borderColor:'#e5e7eb', borderRadius:10, padding:10, fontSize:14, color:'#111', marginTop:12 },
  empty:        { flex:1, alignItems:'center', justifyContent:'center', padding:40 },
  emptyIcon:    { fontSize:60, marginBottom:16 },
  emptyText:    { color:'#888', textAlign:'center', fontSize:15, lineHeight:24 },
  card:         { backgroundColor:'#fff', borderRadius:14, padding:14, marginBottom:12, flexDirection:'row', alignItems:'center', elevation:2, shadowColor:'#000', shadowOpacity:0.06, shadowRadius:8 },
  cardHeader:   { flexDirection:'row', justifyContent:'space-between', marginBottom:4 },
  invoiceId:    { fontWeight:'800', fontSize:13, color:AC },
  totalAmt:     { fontWeight:'900', fontSize:15, color:'#1a1a1a' },
  custName:     { fontWeight:'700', fontSize:14, color:'#1a1a1a', marginBottom:2 },
  cardFooter:   { flexDirection:'row', justifyContent:'space-between', marginTop:6 },
  meta:         { fontSize:12, color:'#888' },
  date:         { fontSize:11, color:'#aaa' },
  arrow:        { fontSize:24, color:'#ccc', marginLeft:10 },
  modalBg:      { flex:1, backgroundColor:'rgba(0,0,0,.55)', justifyContent:'flex-end' },
  modalCard:    { backgroundColor:'#fff', borderTopLeftRadius:22, borderTopRightRadius:22, padding:24, maxHeight:'90%' },
  modalHeader:  { flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 },
  modalInvoice: { fontWeight:'900', fontSize:18, color:AC },
  custBox:      { backgroundColor:'#f0fdf4', borderRadius:10, padding:12, borderWidth:1, borderColor:'#86efac' },
  sectionTitle: { fontWeight:'800', fontSize:13, color:'#555', marginBottom:8 },
  itemRow:      { flexDirection:'row', alignItems:'center', gap:10, paddingVertical:6, borderBottomWidth:1, borderColor:'#f3f4f6' },
  totalBox:     { backgroundColor:'#f0fdf4', borderRadius:10, padding:12, marginTop:12 },
  trow:         { flexDirection:'row', justifyContent:'space-between', paddingVertical:3 },
  noteBox:      { backgroundColor:'#fffde7', borderRadius:8, padding:10, borderLeftWidth:3, borderLeftColor:'#f59e0b', marginTop:10 },
  btn:          { backgroundColor:AC, borderRadius:12, padding:13, alignItems:'center', justifyContent:'center', elevation:2 },
  btnTxt:       { color:'#fff', fontWeight:'800', fontSize:15 },
});
