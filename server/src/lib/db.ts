import { createClient, SupabaseClient } from '@supabase/supabase-js';
import 'dotenv/config';

const url = process.env.SUPABASE_URL ?? '';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!url || !key) {
  // 不抛错，让 /health 与 AI 相关路由仍可工作；调用 DB 的路由自会 500
  console.warn('[db] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 未配置，DB 相关接口将失败');
}

export const supabase: SupabaseClient = createClient(url || 'http://localhost', key || 'anon', {
  auth: { persistSession: false, autoRefreshToken: false }
});

/** 便捷抛错，用在路由里 */
export function must<T>(data: T | null, err: { message?: string } | null, code = 'DB_ERROR'): T {
  if (err) {
    const e = new Error(err.message ?? code) as Error & { code?: string };
    e.code = code;
    throw e;
  }
  if (data === null || data === undefined) {
    const e = new Error(code) as Error & { code?: string };
    e.code = 'NOT_FOUND';
    throw e;
  }
  return data;
}

export const DEFAULT_EVENT_ID =
  process.env.EVENT_ID ?? '00000000-0000-0000-0000-000000000001';
