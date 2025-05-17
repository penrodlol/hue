import { z } from 'zod';

export type APISuccess<T> = { data: T; success: true; error?: never };
export type APIFailure<E> = { data?: never; success: false; error: E };
export type APIResponse<T, E = Error> = Promise<APISuccess<T> | APIFailure<E>>;

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

export const GET_LIGHTS_ERROR = new Error('Failed to fetch lights');
export const UPDATE_LIGHT_ERROR = new Error('Failed to update light');

export const lightSchema = z.object({
  name: z.string(),
  type: z.enum(['Extended color light', 'On/Off plug-in unit']),
  state: z.object({
    on: z.boolean(),
    bri: z.number().min(0).max(254).default(0),
    sat: z.number().min(0).max(254).default(0),
    hue: z.number().min(0).max(65535).default(0),
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

export async function getLights(): APIResponse<Lights> {
  const response = await fetch(HUE_URL);
  if (!response.ok) return { success: false, error: GET_LIGHTS_ERROR };

  const json = await lightsSchema.safeParseAsync(await response.json());
  return json.success ? { data: json.data, success: true } : { success: false, error: GET_LIGHTS_ERROR };
}

export async function updateLight(id: string, state: LightState): APIResponse<LightState & { id: string }> {
  const request = z.object({ id: z.string(), state: lightSchema.shape.state }).safeParse({ id, state });
  if (!request.success) return { success: false, error: UPDATE_LIGHT_ERROR };

  const body = JSON.stringify(request.data.state);
  const response = await fetch(`${HUE_URL}/${request.data.id}/state`, { method: 'PUT', body });
  if (!response.ok) return { success: false, error: UPDATE_LIGHT_ERROR };

  const json = await lightUpdateSchema.safeParseAsync(await response.json());
  if (!json.success) return { success: false, error: UPDATE_LIGHT_ERROR };

  return json.data.errors
    ? { success: false, error: UPDATE_LIGHT_ERROR }
    : { data: { id: request.data.id, ...request.data.state, ...json.data }, success: true };
}
