// lib/appSettings.ts
// Utilidades para leer/escribir configuraciones globales (feature flags)

import { supabase } from './supabase'

const CATEGORY_FILTER_KEY = 'enable_category_filter'

export async function getSettingBoolean(key: string, defaultValue: boolean): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value_boolean')
      .eq('key', key)
      .single()

    if (error) {
      // Si la fila no existe o error, regresamos default
      return defaultValue
    }

    if (data && typeof data.value_boolean === 'boolean') {
      return data.value_boolean
    }
    return defaultValue
  } catch (e) {
    console.error('getSettingBoolean error:', e)
    return defaultValue
  }
}

export async function setSettingBoolean(key: string, value: boolean): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key, value_boolean: value, updated_at: new Date().toISOString() })
    if (error) {
      console.error('setSettingBoolean error:', error)
      return false
    }
    return true
  } catch (e) {
    console.error('setSettingBoolean unexpected error:', e)
    return false
  }
}

export async function getEnableCategoryFilter(): Promise<boolean> {
  return getSettingBoolean(CATEGORY_FILTER_KEY, true)
}

export async function setEnableCategoryFilter(enabled: boolean): Promise<boolean> {
  return setSettingBoolean(CATEGORY_FILTER_KEY, enabled)
}