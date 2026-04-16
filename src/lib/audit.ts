import { createServiceClient } from './supabase'

export async function logAudit(
  action: string,
  targetType: 'image' | 'portfolio',
  targetId: string | string[],
  details?: Record<string, unknown>
) {
  const supabase = createServiceClient()
  const ids = Array.isArray(targetId) ? targetId : [targetId]

  const entries = ids.map(id => ({
    user_id: (details?.user as string) || 'admin',
    action,
    target_type: targetType,
    target_id: id,
    details: details || {},
  }))

  const { error } = await supabase.from('audit_log').insert(entries)
  if (error) {
    console.error('Audit log error:', error)
  }
}
