import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator, Modal
} from 'react-native';
import { supabase } from '../../lib/supabase';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const AC = '#16a34a';

export default function NewBill() {
  const [step, setStep]         = useState(1);
  const [products, setProducts] = useState([]);
  const [cust, setCust]         = useState({ name:'', phone:'', address:'' });
  const [items, setItems]       = useState([]);
  const [discMode, setDiscMode] = useState('bill');
  const [billDisc, setBillDisc] = useState('');
  const [note, setNote]         = useState('');
  const [saving, setSaving]     = useState(false);
  const [billCount, setBillCount] = useState(0);
  const [previewModal, setPreviewModal] = useState(false);
  const [lastBill, setLastBill] = useState(null);

  useEffect(() => { fetchProducts(); fetchBillCount(); }, []);

  const fetchProducts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from('products').select('*').eq('user_id', user.id).order('created_at');
    if (data) setProducts(data);
  };

  const fetchBillCount = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { count } = await supabase.from('bills').select('*', { count:'exact', head:true }).eq('user_id', user.id);
    setBillCount(count || 0);
  };

  const addItem = p => {
    const ex = items.find(i => i.id === p.id);
    if (ex) setItems(items.map(i => i.id===p.id ? {...i, qty:i.qty+1} : i));
    else setItems([...items, {...p, qty:1, itemDisc:''}]);
  };

  const subtotal    = items.reduce((s,i) => s + i.price*i.qty, 0);
  const itemDiscAmt = items.reduce((s,i) => s + (Number(i.itemDisc)||0)*i.qty, 0);
  const billDiscAmt = Math.min(Number(billDisc)||0, subtotal);
  const totalDisc   = discMode==='item' ? itemDiscAmt : billDiscAmt;
  const total       = Math.max(0, subtotal - totalDisc);

  const generate = async () => {
    if (!cust.name.trim()) { Alert.alert('Error','Customer name required'); return; }
    if (items.length === 0) { Alert.alert('Error','Koi item add karo'); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const invoiceId = 'INV-' + String(billCount+1).padStart(3,'0');
    const bill = {
      user_id: user.id,
      invoice_id: invoiceId,
      customer_name: cust.name,
      customer_phone: cust.phone,
      customer_address: cust.address,
      items: items.map(i => ({...i, itemDisc: Number(i.itemDisc)||0})),
      disc_mode: discMode,
      subtotal, total_disc: totalDisc, total, note,
    };
    const { data, error } = await supabase.from('bills').insert(bill).select().single();
    setSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }
    setLastBill({ ...data, date: new Date().toLocaleString('en-IN') });
    setPreviewModal(true);
    reset();
    fetchBillCount();
  };

  const reset = () => {
    setCust({name:'',phone:'',address:''});
    setItems([]); setBillDisc(''); setNote(''); setStep(1);
  };

  const downloadPDF = async (bill) => {
    const html = buildHTML(bill);
    try {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { mimeType:'application/pdf', dialogTitle:'Receipt Share Karo' });
    } catch(e) { Alert.alert('Error', e.message); }
  };

  const shareWA = (bill) => {
    const lines = bill.items.map(i => `• ${i.name} x${i.qty} = ₹${(i.price-(Number(i.itemDisc)||0))*i.qty}`).join('\n');
    const txt = `🌱 *Nursery Billing*\n━━━━━━━━━━━━━━\n*${bill.invoice_id}* | ${bill.date}\n━━━━━━━━━━━━━━\n👤 *${bill.customer_name}*\n📞 ${bill.customer_phone}\n━━━━━━━━━━━━━━\n*Items:*\n${lines}\n━━━━━━━━━━━━━━\n*💰 TOTAL: ₹${bill.total}*\n${bill.note?'📝 '+bill.note:''}\n_Thank you! 🌿_`;
    Sharing.shareAsync(`https://wa.me/?text=${encodeURIComponent(txt)}`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{padding:16,paddingBottom:40}}>
      {/* Step indicator */}
      <View style={styles.stepRow}>
        {['Customer','Products','Review'].map((s,i) => (
          <View key={i} style={{flexDirection:'row',alignItems:'center',flex:i<2?1:0}}>
            <TouchableOpacity onPress={()=>setStep(i+1)} style={[styles.stepCircle, step>i&&{backgroundColor:AC}, step===i+1&&{backgroundColor:AC}]}>
              <Text style={{color:step>=i+1?'#fff':'#999',fontWeight:'800',fontSize:13}}>{step>i?'✓':i+1}</Text>
            </TouchableOpacity>
            <Text style={[styles.stepLabel,{color:step===i+1?AC:'#999'}]}>{s}</Text>
            {i<2&&<View style={[styles.stepLine,{backgroundColor:step>i+1?AC:'#e5e7eb'}]}/>}
          </View>
        ))}
      </View>

      {/* Step 1: Customer */}
      {step===1 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>👤 Customer Details</Text>
          {[['Full Name *','name','Customer ka naam','default'],['Phone','phone','WhatsApp number','phone-pad'],['Address','address','Delivery address','default']].map(([l,k,ph,kb])=>(
            <View key={k} style={styles.field}>
              <Text style={styles.label}>{l}</Text>
              <TextInput style={styles.input} value={cust[k]} onChangeText={v=>setCust({...cust,[k]:v})} placeholder={ph} keyboardType={kb}/>
            </View>
          ))}
          <TouchableOpacity style={styles.btn} onPress={()=>setStep(2)}>
            <Text style={styles.btnTxt}>Next: Add Products →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Step 2: Products */}
      {step===2 && (
        <View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🌿 Select Products</Text>
            {products.length===0
              ? <Text style={{color:'#aaa',textAlign:'center',padding:16}}>Products tab mein products add karo</Text>
              : <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
                  {products.map(p=>{
                    const inCart=items.find(i=>i.id===p.id);
                    return(
                      <TouchableOpacity key={p.id} onPress={()=>addItem(p)}
                        style={[styles.productChip,{backgroundColor:inCart?AC:'#f0fdf4'}]}>
                        <Text style={{color:inCart?'#fff':AC,fontWeight:'700',fontSize:13}}>
                          {inCart?'✓ ':'+ '}{p.name} · ₹{p.price}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
            }
          </View>

          {items.length>0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>🛒 Cart ({items.length})</Text>
              {/* Discount mode */}
              <View style={styles.discRow}>
                {[['bill','📋 On Total'],['item','🌿 Per Product']].map(([k,l])=>(
                  <TouchableOpacity key={k} onPress={()=>setDiscMode(k)}
                    style={[styles.discBtn,discMode===k&&{backgroundColor:AC}]}>
                    <Text style={{color:discMode===k?'#fff':'#555',fontWeight:'600',fontSize:12}}>{l}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {items.map(item=>(
                <View key={item.id} style={styles.cartItem}>
                  <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
                    <Text style={{flex:1,fontWeight:'700',fontSize:14}}>🌿 {item.name}</Text>
                    <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
                      <TouchableOpacity onPress={()=>setItems(items.map(i=>i.id===item.id?{...i,qty:Math.max(1,i.qty-1)}:i))}
                        style={styles.qtyBtn}><Text style={{color:AC,fontWeight:'800',fontSize:16}}>−</Text></TouchableOpacity>
                      <Text style={{fontWeight:'800',fontSize:15,minWidth:24,textAlign:'center'}}>{item.qty}</Text>
                      <TouchableOpacity onPress={()=>setItems(items.map(i=>i.id===item.id?{...i,qty:i.qty+1}:i))}
                        style={styles.qtyBtn}><Text style={{color:AC,fontWeight:'800',fontSize:16}}>+</Text></TouchableOpacity>
                    </View>
                    <Text style={{fontWeight:'800',color:AC,minWidth:50,textAlign:'right'}}>₹{item.price*item.qty}</Text>
                    <TouchableOpacity onPress={()=>setItems(items.filter(i=>i.id!==item.id))}>
                      <Text style={{color:'#ccc',fontSize:18}}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  {discMode==='item' && (
                    <View style={{flexDirection:'row',alignItems:'center',gap:8,marginTop:8}}>
                      <Text style={{fontSize:12,color:'#888'}}>Discount/pc (₹):</Text>
                      <TextInput style={[styles.input,{width:70,textAlign:'center',padding:6}]}
                        value={item.itemDisc} onChangeText={v=>setItems(items.map(i=>i.id===item.id?{...i,itemDisc:v}:i))}
                        keyboardType="numeric" placeholder="0"/>
                    </View>
                  )}
                </View>
              ))}
              <View style={styles.totalBox}>
                {discMode==='bill' && (
                  <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                    <Text style={{color:'#555',fontWeight:'600'}}>Bill Discount (₹)</Text>
                    <TextInput style={[styles.input,{width:90,textAlign:'right',padding:8}]}
                      value={billDisc} onChangeText={setBillDisc} keyboardType="numeric" placeholder="0"/>
                  </View>
                )}
                <View style={styles.trow}><Text style={{color:'#555'}}>Subtotal</Text><Text>₹{subtotal}</Text></View>
                {totalDisc>0&&<View style={styles.trow}><Text style={{color:'#e11d48'}}>Discount</Text><Text style={{color:'#e11d48'}}>-₹{totalDisc}</Text></View>}
                <View style={[styles.trow,{marginTop:6}]}><Text style={{fontWeight:'900',color:AC,fontSize:17}}>TOTAL</Text><Text style={{fontWeight:'900',color:AC,fontSize:17}}>₹{total}</Text></View>
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Note (optional)</Text>
                <TextInput style={styles.input} value={note} onChangeText={setNote} placeholder="e.g. Cash, Pending..."/>
              </View>
            </View>
          )}

          <View style={{flexDirection:'row',gap:10}}>
            <TouchableOpacity style={[styles.btn,{flex:1,backgroundColor:'#f3f4f6'}]} onPress={()=>setStep(1)}>
              <Text style={{color:'#555',fontWeight:'600',fontSize:14}}>← Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn,{flex:2}]} onPress={()=>{if(!items.length){Alert.alert('Error','Item add karo');return;}setStep(3);}}>
              <Text style={styles.btnTxt}>Review →</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Step 3: Review */}
      {step===3 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📋 Review & Confirm</Text>
          <View style={{backgroundColor:'#f8faf8',borderRadius:10,padding:14,marginBottom:14}}>
            <Text style={{fontWeight:'800',fontSize:15,marginBottom:4}}>👤 {cust.name}</Text>
            {cust.phone?<Text style={{color:'#555',fontSize:13}}>📞 {cust.phone}</Text>:null}
            {cust.address?<Text style={{color:'#555',fontSize:13}}>📍 {cust.address}</Text>:null}
            <View style={{borderTopWidth:1,borderColor:'#e5e7eb',marginVertical:10}}/>
            {items.map((i,idx)=>{
              const d=discMode==='item'?(Number(i.itemDisc)||0):0;
              return <View key={idx} style={styles.trow}>
                <Text style={{flex:1}}>{i.name} x{i.qty}</Text>
                <Text style={{fontWeight:'600'}}>₹{(i.price-d)*i.qty}</Text>
              </View>;
            })}
            <View style={{borderTopWidth:1,borderColor:'#e5e7eb',marginTop:8,paddingTop:8}}>
              <View style={styles.trow}><Text style={{color:'#555'}}>Subtotal</Text><Text>₹{subtotal}</Text></View>
              {totalDisc>0&&<View style={styles.trow}><Text style={{color:'#e11d48'}}>Discount</Text><Text style={{color:'#e11d48'}}>-₹{totalDisc}</Text></View>}
              <View style={[styles.trow,{marginTop:4}]}><Text style={{fontWeight:'900',color:AC,fontSize:16}}>TOTAL</Text><Text style={{fontWeight:'900',color:AC,fontSize:16}}>₹{total}</Text></View>
            </View>
          </View>
          <View style={{flexDirection:'row',gap:10}}>
            <TouchableOpacity style={[styles.btn,{flex:1,backgroundColor:'#f3f4f6'}]} onPress={()=>setStep(2)}>
              <Text style={{color:'#555',fontWeight:'600',fontSize:14}}>← Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn,{flex:2}]} onPress={generate} disabled={saving}>
              {saving?<ActivityIndicator color="#fff"/>:<Text style={styles.btnTxt}>✅ Confirm & Save</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Bill Preview Modal */}
      <Modal visible={previewModal} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={{fontWeight:'800',fontSize:18,color:AC,marginBottom:16}}>🧾 Bill Ready!</Text>
            <View style={{flexDirection:'column',gap:10}}>
              <TouchableOpacity style={[styles.btn,{backgroundColor:'#0ea5e9'}]} onPress={()=>downloadPDF(lastBill)}>
                <Text style={styles.btnTxt}>📄 Download PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn,{backgroundColor:'#25D366'}]} onPress={()=>shareWA(lastBill)}>
                <Text style={styles.btnTxt}>💬 Share on WhatsApp</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn,{backgroundColor:'#f3f4f6'}]} onPress={()=>setPreviewModal(false)}>
                <Text style={{color:'#555',fontWeight:'700',fontSize:15}}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function buildHTML(bill) {
  const ac='#16a34a';
  const items=bill.items||[];
  const rows=items.map((i,idx)=>{const d=Number(i.itemDisc)||0,net=(i.price-d)*i.qty;return`<tr style="background:${idx%2===0?'#fff':'#f9fdf9'}"><td style="padding:12px;font-size:15pt">${i.name}</td><td style="padding:12px;text-align:center;font-size:15pt">${i.qty}</td><td style="padding:12px;text-align:right;font-size:15pt">₹${i.price}</td><td style="padding:12px;text-align:right;font-weight:700;font-size:15pt">₹${net}</td></tr>`;}).join('');
  return`<!DOCTYPE html><html><head><meta charset="utf-8"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;padding:20px}table{width:100%;border-collapse:collapse}</style></head><body><div style="text-align:center;border-bottom:4px solid ${ac};padding-bottom:12px;margin-bottom:16px"><div style="font-size:28pt;font-weight:900;color:${ac}">Nursery Billing</div><div style="margin-top:8px"><span style="border:2px solid ${ac};padding:4px 20px;border-radius:20px;color:${ac};font-weight:700">TAX INVOICE</span></div></div><div style="margin-bottom:12px"><b>Invoice:</b> ${bill.invoice_id} &nbsp; <b>Date:</b> ${bill.date}</div><div style="border:1.5px solid #d1fae5;border-radius:8px;padding:12px;margin-bottom:16px"><div style="font-size:18pt;font-weight:900">${bill.customer_name}</div>${bill.customer_phone?`<div>📞 ${bill.customer_phone}</div>`:''}</div><table><thead><tr style="background:${ac};color:#fff"><th style="padding:12px;text-align:left">Item</th><th style="padding:12px;text-align:center">Qty</th><th style="padding:12px;text-align:right">Price</th><th style="padding:12px;text-align:right">Amount</th></tr></thead><tbody>${rows}</tbody></table><div style="text-align:right;margin-top:16px;border:1.5px solid #d1fae5;border-radius:8px;padding:12px"><div style="font-size:14pt">Subtotal: ₹${bill.subtotal}</div>${bill.total_disc>0?`<div style="color:#e11d48">Discount: -₹${bill.total_disc}</div>`:''}<div style="font-size:18pt;font-weight:900;color:${ac}">TOTAL: ₹${bill.total}</div></div>${bill.note?`<div style="margin-top:12px;padding:10px;background:#fffde7;border-left:4px solid #f59e0b">Note: ${bill.note}</div>`:''}<div style="text-align:center;margin-top:20px;color:${ac};font-weight:700">Thank you for your purchase! 🌿</div></body></html>`;
}

const styles = StyleSheet.create({
  container:   { flex:1, backgroundColor:'#f1f5f1' },
  stepRow:     { flexDirection:'row', alignItems:'center', marginBottom:20, paddingHorizontal:4 },
  stepCircle:  { width:30, height:30, borderRadius:15, backgroundColor:'#e5e7eb', alignItems:'center', justifyContent:'center' },
  stepLabel:   { fontSize:10, marginLeft:4, fontWeight:'600' },
  stepLine:    { flex:1, height:2, marginHorizontal:6 },
  card:        { backgroundColor:'#fff', borderRadius:14, padding:16, marginBottom:16, elevation:2, shadowColor:'#000', shadowOpacity:0.06, shadowRadius:8 },
  cardTitle:   { fontWeight:'800', fontSize:15, color:AC, borderLeftWidth:4, borderLeftColor:AC, paddingLeft:10, marginBottom:14 },
  field:       { marginBottom:12 },
  label:       { fontSize:12, fontWeight:'700', color:'#555', marginBottom:4 },
  input:       { borderWidth:1.5, borderColor:'#e5e7eb', borderRadius:10, padding:11, fontSize:14, color:'#111' },
  btn:         { backgroundColor:AC, borderRadius:12, padding:13, alignItems:'center', justifyContent:'center', elevation:2 },
  btnTxt:      { color:'#fff', fontWeight:'800', fontSize:15 },
  productChip: { borderWidth:1.5, borderColor:AC, borderRadius:20, paddingHorizontal:14, paddingVertical:8 },
  discRow:     { flexDirection:'row', gap:8, marginBottom:14, backgroundColor:'#f8faf8', borderRadius:10, padding:5 },
  discBtn:     { flex:1, padding:8, borderRadius:8, alignItems:'center', backgroundColor:'transparent' },
  cartItem:    { backgroundColor:'#f8faf8', borderRadius:10, padding:10, marginBottom:10, borderWidth:1, borderColor:'#e5e7eb' },
  qtyBtn:      { width:28, height:28, borderRadius:7, borderWidth:1.5, borderColor:AC, alignItems:'center', justifyContent:'center' },
  totalBox:    { backgroundColor:'#f0fdf4', borderRadius:10, padding:12, marginBottom:12 },
  trow:        { flexDirection:'row', justifyContent:'space-between', paddingVertical:3 },
  modalBg:     { flex:1, backgroundColor:'rgba(0,0,0,.6)', justifyContent:'flex-end' },
  modalCard:   { backgroundColor:'#fff', borderRadius:20, padding:24, margin:0 },
});
