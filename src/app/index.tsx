import { getLights } from '@/libs/api';
import { atom, useAtom } from 'jotai';
import { Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

const store = atom(async () => getLights());

export default function HomePage() {
  const [lights] = useAtom(store);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1 }}>
        <View
          style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}
        >
          {lights.map((light, index) => (
            <View key={index} style={{ padding: 10 }}>
              <Text>{light.name}</Text>
            </View>
          ))}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
