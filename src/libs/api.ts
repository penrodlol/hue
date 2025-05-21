import { z } from 'zod';

export type Light = z.infer<typeof lightSchema>;
export type LightType = z.infer<typeof lightSchema.shape.type>;
export type LightState = z.infer<typeof lightSchema.shape.state>;
export type Lights = z.infer<typeof lightsSchema>;
export type LightUpdateKey = z.infer<typeof lightUpdateKeySchema>;
export type LightUpdateSuccess = z.infer<typeof lightUpdateSuccessSchema>;
export type LightUpdateError = z.infer<typeof lightUpdateErrorSchema>;
export type LightUpdate = z.infer<typeof lightUpdateSchema>;

export const HUE_IP = z.string().ip().parse(process.env.EXPO_PUBLIC_HUE_IP);
export const HUE_USERNAME = z.string().parse(process.env.EXPO_PUBLIC_USERNAME);
export const HUE_URL = z.string().url().parse(`http://${HUE_IP}/api/${HUE_USERNAME}/lights`);

export const lightSchema = z.object({
  name: z.string(),
  type: z.enum(['Extended color light', 'On/Off plug-in unit']),
  state: z.object({
    on: z.boolean(),
    bri: z.number().min(0).max(254).optional(),
    sat: z.number().min(0).max(254).optional(),
    hue: z.number().min(0).max(65535).optional(),
  }),
});

export const lightsSchema = z
  .record(z.string(), lightSchema)
  .transform((lights) => Object.entries(lights).map(([id, light]) => ({ id, ...light })));

export const lightUpdateKeySchema = z.string().regex(/\/lights\/\w+\/state\/\w+/);
export const lightUpdateSuccessSchema = z.record(lightUpdateKeySchema, z.union([z.boolean(), z.number()]));
export const lightUpdateErrorSchema = z.object({ address: lightUpdateKeySchema, description: z.string() });
export const lightUpdateSchema = z
  .array(z.union([z.object({ success: lightUpdateSuccessSchema }), z.object({ error: lightUpdateErrorSchema })]))
  .transform((response) => {
    const id = (path: string) => path.split('/')[4];
    const _successes = response.filter((entry) => 'success' in entry).map((entry) => Object.entries(entry.success)[0]);
    const _errors = response.filter((entry) => 'error' in entry).map((entry) => entry.error);
    const successes = _successes.reduce((acc, [key, value]) => ({ ...acc, ...{ [id(key)]: value } }), {});
    const errors = _errors.reduce((acc, entry) => ({ ...acc, ...{ [id(entry.address)]: entry.description } }), {});
    return { ...(successes as Partial<LightState>), errors: errors as Partial<Record<keyof LightState, string>> };
  });

export async function getLights(): Promise<Lights> {
  const response = await fetch(HUE_URL);
  if (!response.ok) return Promise.reject(new Error(response.statusText));

  const json = await lightsSchema.safeParseAsync(await response.json());
  return json.success ? json.data : Promise.reject(new Error(json.error.message));
}

export async function updateLight(light: Lights[0]): Promise<Lights[0]> {
  const request = lightSchema.extend({ id: z.string() }).safeParse(light);
  if (!request.success) return Promise.reject(new Error(request.error.message));

  const body = JSON.stringify(request.data.state);
  const response = await fetch(`${HUE_URL}/${request.data.id}/state`, { method: 'PUT', body });
  if (!response.ok) return Promise.reject(new Error(response.statusText));

  const json = await lightUpdateSchema.safeParseAsync(await response.json());
  if (!json.success) return Promise.reject(new Error(json.error.message));

  return Object.keys(json.data.errors).length
    ? Promise.reject(new Error(Object.values(json.data.errors).join(', ')))
    : { ...request.data, state: { ...request.data.state, ...json.data } };
}

export async function updateAllLights(lights: Lights): Promise<Lights> {
  const on = !lights.some((light) => light.state.on);
  const body = lights.map(async (light) =>
    light.state.on !== on ? await updateLight({ ...light, state: { ...light.state, on } }) : light,
  );
  const response = await Promise.allSettled(body);
  const successes = response.filter((entry) => entry.status === 'fulfilled').map((entry) => entry.value);
  const errors = response.filter((entry) => entry.status === 'rejected').map((entry) => entry.reason);
  return errors.length ? Promise.reject(new Error(errors.join(', '))) : successes;
}
