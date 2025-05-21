import { useStore } from '@/libs/store';
import { Button, Text, View } from 'react-native';

export default function HomePage() {
  const store = useStore();

  return (
    <View>
      <View style={{ display: 'flex', gap: 10, marginBlockEnd: 50 }}>
        <Button title="Refetch" onPress={() => store.refetchAllLights()} />
        <Button title="Toggle" onPress={() => store.toggleAllLights.mutateAsync(store.lights.data ?? [])} />
      </View>
      {store.lights.data?.map((light) => (
        <View key={light.id}>
          <Text>{light.name}</Text>
          <Button
            title={light.state.on ? 'Turn Off' : 'Turn On'}
            onPress={() => store.toggleLight.mutateAsync(light)}
          />
        </View>
      ))}
    </View>
  );
}
