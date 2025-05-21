import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { getLights, Lights, updateAllLights, updateLight } from './api';

declare module '@tanstack/react-query' {
  interface Register {
    queryKey: ['lights', ...ReadonlyArray<unknown>];
    mutationKey: ['toggleLight' | 'toggleAllLights', ...ReadonlyArray<unknown>];
  }
}

export function useStore() {
  const client = useQueryClient();
  const lights = useQuery({ queryKey: ['lights'], queryFn: getLights });
  const lightsNextQueryData = useCallback(
    (target: Lights[0], lights?: Lights) => lights?.map((light) => (light.id === target.id ? target : light)),
    [client],
  );

  return {
    client,
    lights,
    refetchAllLights: () => client.invalidateQueries({ queryKey: ['lights'] }),
    toggleLight: useMutation({
      mutationKey: ['toggleLight'],
      mutationFn: (light: Lights[0]) => updateLight({ ...light, state: { ...light.state, on: !light.state.on } }),
      onSuccess: (light) => client.setQueryData<Lights>(['lights'], (lights) => lightsNextQueryData(light, lights)),
      onError: (error) => console.error(error.message),
    }),
    toggleAllLights: useMutation({
      mutationKey: ['toggleAllLights'],
      mutationFn: (lights: Lights) => updateAllLights(lights),
      onSuccess: (lights) => client.setQueryData<Lights>(['lights'], () => lights),
      onError: (error) => console.error(error.message),
    }),
  };
}
