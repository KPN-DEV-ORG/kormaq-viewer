import React, { ReactElement, useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@ohif/ui-next';
import { useTranslation } from 'react-i18next';
import { WindowLevelPreset } from '../../types/WindowLevel';

type WindowLevelPresetEditorProps = {
  open: boolean;
  modality: string;
  seriesUID?: string;
  presets: WindowLevelPreset[];
  onOpenChange: (open: boolean) => void;
  onSave: (presets: WindowLevelPreset[]) => boolean;
  onReset: () => boolean;
};

function WindowLevelPresetEditor({
  open,
  modality,
  seriesUID,
  presets,
  onOpenChange,
  onSave,
  onReset,
}: WindowLevelPresetEditorProps): ReactElement {
  const { t } = useTranslation('WindowLevelActionMenu');
  const [draftPresets, setDraftPresets] = useState<WindowLevelPreset[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setDraftPresets(presets.map(preset => ({ ...preset })));
      setError('');
    }
  }, [open, modality, seriesUID, presets]);

  const updatePreset = (index: number, updates: Partial<WindowLevelPreset>) => {
    setDraftPresets(current =>
      current.map((preset, presetIndex) =>
        presetIndex === index ? { ...preset, ...updates } : preset
      )
    );
    setError('');
  };

  const addPreset = () => {
    const firstPreset = draftPresets[0];
    const id = `${modality.toLowerCase()}-custom-${Date.now().toString(36)}-${draftPresets.length}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    setDraftPresets(current => [
      ...current,
      {
        id,
        description: `${modality} custom preset`,
        details: '',
        window: firstPreset?.window || (modality === 'MR' ? '' : '400'),
        level: firstPreset?.level || (modality === 'MR' ? '' : '40'),
      },
    ]);
    setError('');
  };

  const removePreset = (index: number) => {
    setDraftPresets(current => current.filter((_, presetIndex) => presetIndex !== index));
    setError('');
  };

  const handleSave = () => {
    const isValid =
      draftPresets.length > 0 &&
      (modality !== 'MR' || !!seriesUID) &&
      draftPresets.every(preset => {
        const width = Number(preset.window);
        const level = Number(preset.level);
        return (
          preset.description.trim() &&
          String(preset.window).trim() !== '' &&
          String(preset.level).trim() !== '' &&
          Number.isFinite(width) &&
          (modality === 'PT' ? width >= 0 : width > 0) &&
          Number.isFinite(level)
        );
      });

    if (!isValid) {
      setError(
        modality === 'MR' && !seriesUID
          ? t('MR preset requires series')
          : t('Preset validation error')
      );
      return;
    }

    if (onSave(draftPresets)) {
      onOpenChange(false);
    } else {
      setError(t('Preset save error'));
    }
  };

  const handleReset = () => {
    if (onReset()) {
      onOpenChange(false);
    } else {
      setError(t('Preset reset error'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] w-[calc(100vw-2rem)] max-w-3xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>{t('Edit modality presets', { modality })}</DialogTitle>
          <DialogDescription>
            {modality === 'MR' ? t('MR preset editor help') : t('Window preset editor help')}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          {draftPresets.map((preset, index) => (
            <section
              className="bg-secondary/30 grid grid-cols-1 gap-3 rounded p-3 sm:grid-cols-[minmax(0,1fr)_110px_110px_auto]"
              key={preset.id || index}
            >
              <div className="space-y-2">
                <div className="space-y-1">
                  <Label htmlFor={`preset-name-${index}`}>{t('Preset name')}</Label>
                  <Input
                    id={`preset-name-${index}`}
                    value={preset.description}
                    onChange={event => updatePreset(index, { description: event.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`preset-details-${index}`}>{t('What it highlights')}</Label>
                  <Input
                    id={`preset-details-${index}`}
                    value={preset.details || ''}
                    onChange={event => updatePreset(index, { details: event.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor={`preset-width-${index}`}>{t('Width')}</Label>
                <Input
                  id={`preset-width-${index}`}
                  type="number"
                  min={modality === 'PT' ? '0' : '0.01'}
                  step="any"
                  value={preset.window}
                  onChange={event => updatePreset(index, { window: event.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor={`preset-center-${index}`}>{t('Center')}</Label>
                <Input
                  id={`preset-center-${index}`}
                  type="number"
                  step="any"
                  value={preset.level}
                  onChange={event => updatePreset(index, { level: event.target.value })}
                />
              </div>

              <div className="flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  className="text-destructive"
                  disabled={draftPresets.length <= 1}
                  onClick={() => removePreset(index)}
                >
                  {t('Delete preset')}
                </Button>
              </div>
            </section>
          ))}

          <Button type="button" variant="outline" onClick={addPreset}>
            {t('Add preset')}
          </Button>
          {error && <p className="text-destructive text-sm" role="alert">{error}</p>}
        </div>

        <DialogFooter className="mt-2 gap-2 sm:justify-between">
          <Button type="button" variant="ghost" onClick={handleReset}>
            {t('Reset to defaults')}
          </Button>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('Cancel')}
            </Button>
            <Button type="button" onClick={handleSave}>
              {t('Save presets')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default WindowLevelPresetEditor;
