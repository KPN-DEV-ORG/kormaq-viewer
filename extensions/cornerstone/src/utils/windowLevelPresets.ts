import { WindowLevelPreset } from '../types/WindowLevel';

const STORAGE_KEY = 'ohif.windowLevelPresetOverrides';
export const WINDOW_LEVEL_PRESETS_STORAGE_KEY = STORAGE_KEY;
export const WINDOW_LEVEL_PRESETS_CHANGED_EVENT = 'ohif:window-level-presets-changed';

type PresetsByModality = Record<string, WindowLevelPreset[]>;

function isValidPreset(preset: unknown, modality?: string): preset is WindowLevelPreset {
  if (!preset || typeof preset !== 'object') {
    return false;
  }

  const candidate = preset as Partial<WindowLevelPreset>;
  const width = Number(candidate.window);
  const level = Number(candidate.level);

  return (
    typeof candidate.description === 'string' &&
    !!candidate.description.trim() &&
    String(candidate.window ?? '').trim() !== '' &&
    String(candidate.level ?? '').trim() !== '' &&
    Number.isFinite(width) &&
    (modality === 'PT' ? width >= 0 : width > 0) &&
    Number.isFinite(level)
  );
}

function getStoredOverrides(): PresetsByModality {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return {};
    }

    const parsed = JSON.parse(stored);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed).flatMap(([modality, presets]) => {
        if (!Array.isArray(presets)) {
          return [];
        }

        return [[modality, presets.filter(preset => isValidPreset(preset, modality.split('::')[0]))]];
      })
    );
  } catch {
    return {};
  }
}

/**
 * Applies browser-local preset edits over the configured application defaults.
 * Site configuration remains the fallback when a modality's local edits are reset.
 */
export function getWindowLevelPresets(configuredPresets?: unknown): PresetsByModality {
  const configuredPresetMap =
    configuredPresets && typeof configuredPresets === 'object' && !Array.isArray(configuredPresets)
      ? Object.fromEntries(
          Object.entries(configuredPresets).flatMap(([modality, presets]) =>
            Array.isArray(presets)
              ? [[modality, presets.filter(preset => isValidPreset(preset, modality))]]
              : []
          )
        )
      : {};

  return {
    ...configuredPresetMap,
    ...getStoredOverrides(),
  };
}

export function getWindowLevelPresetsForDisplaySet(
  presetsByModality: PresetsByModality,
  modality?: string,
  seriesInstanceUID?: string
): WindowLevelPreset[] {
  if (!modality) {
    return [];
  }

  if (seriesInstanceUID) {
    const seriesSpecificPresets = presetsByModality[`${modality}::${seriesInstanceUID}`];
    if (seriesSpecificPresets) {
      return seriesSpecificPresets;
    }
  }

  return presetsByModality[modality] || [];
}

function getPresetStorageKey(modality: string, seriesInstanceUID?: string): string {
  // MR intensity scales vary by series, so local MR edits should not silently
  // apply to unrelated sequences or examinations.
  if (modality === 'MR' && seriesInstanceUID) {
    return `${modality}::${seriesInstanceUID}`;
  }

  return modality;
}

export function saveWindowLevelPresets(
  modality: string,
  presets: WindowLevelPreset[],
  seriesInstanceUID?: string
): boolean {
  if (
    typeof window === 'undefined' ||
    !modality ||
    !presets.length ||
    !presets.every(preset => isValidPreset(preset, modality))
  ) {
    return false;
  }

  try {
    const overrides = getStoredOverrides();
    overrides[getPresetStorageKey(modality, seriesInstanceUID)] = presets.map((preset, index) => ({
      ...preset,
      id: preset.id || `${modality.toLowerCase()}-custom-${Date.now().toString(36)}-${index}`,
      description: preset.description.trim(),
      details: preset.details?.trim() || undefined,
      window: String(Number(preset.window)),
      level: String(Number(preset.level)),
    }));
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
    window.dispatchEvent(
      new CustomEvent(WINDOW_LEVEL_PRESETS_CHANGED_EVENT, { detail: { modality } })
    );
    return true;
  } catch {
    return false;
  }
}

export function resetWindowLevelPresets(modality: string, seriesInstanceUID?: string): boolean {
  if (typeof window === 'undefined' || !modality) {
    return false;
  }

  try {
    const overrides = getStoredOverrides();
    delete overrides[getPresetStorageKey(modality, seriesInstanceUID)];

    if (Object.keys(overrides).length) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }

    window.dispatchEvent(
      new CustomEvent(WINDOW_LEVEL_PRESETS_CHANGED_EVENT, { detail: { modality } })
    );
    return true;
  } catch {
    return false;
  }
}
