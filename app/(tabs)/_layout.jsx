import { Tabs } from 'expo-router';
import { TouchableOpacity, Text } from 'react-native';
import { supabase } from '../../lib/supabase';
import { router } from 'expo-router';

const AC = '#16a34a';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: AC,
      tabBarInactiveTintColor: '#888',
      tabBarStyle: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f0f0f0', height: 60, paddingBottom: 6 },
      headerStyle: { backgroundColor: AC },
      headerTintColor: '#fff',
      headerTitleStyle: { fontWeight: '800' },
    }}>
      <Tabs.Screen name="newbill"  options={{ title:'New Bill',  tabBarLabel:'🧾 Bill',     tabBarIcon:()=><Text style={{fontSize:22}}>🧾</Text> }} />
      <Tabs.Screen name="products" options={{ title:'Products',  tabBarLabel:'🌿 Products', tabBarIcon:()=><Text style={{fontSize:22}}>🌿</Text> }} />
      <Tabs.Screen name="history"  options={{ title:'History',   tabBarLabel:'📊 History',  tabBarIcon:()=><Text style={{fontSize:22}}>📊</Text> }} />
      <Tabs.Screen name="settings" options={{ title:'Settings',  tabBarLabel:'⚙️ Settings', tabBarIcon:()=><Text style={{fontSize:22}}>⚙️</Text> }} />
    </Tabs>
  );
}
