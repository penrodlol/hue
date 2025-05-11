import { z } from 'zod';

export type Light = z.infer<typeof lightSchema>;
export type Lights = z.infer<typeof lightsSchema>;

export const HUE_IP = z.string().ip().parse(process.env.EXPO_PUBLIC_HUE_IP);
export const HUE_USERNAME = z.string().parse(process.env.EXPO_PUBLIC_USERNAME);
export const HUE_URL = z.string().url().parse(`http://${HUE_IP}/api/${HUE_USERNAME}`);

export const lightSchema = z.object({
  name: z.string(),
  type: z.enum(['Extended color light', 'On/Off plug-in unit']),
  state: z.object({
    on: z.boolean(),
    bri: z.number().min(0).max(254).default(0),
    sat: z.number().min(0).max(254).default(0),
    hue: z.number().min(0).max(65535).default(0),
    reachable: z.boolean(),
  }),
});

export const lightsSchema = z.record(z.string(), lightSchema).transform((lights) =>
  Object.entries(lights)
    .filter(([_, light]) => light.state.reachable)
    .map(([id, light]) => ({ id, ...light })),
);

export async function getLights(): Promise<Lights> {
  const response = await lightsSchema.safeParseAsync(await fetch(`${HUE_URL}/lights`).then((res) => res.json()));
  return response.success ? response.data : [];
}
