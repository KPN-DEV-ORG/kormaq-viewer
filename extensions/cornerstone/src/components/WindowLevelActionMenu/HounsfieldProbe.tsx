import React from 'react';
import { useSystem, useToolbar } from '@ohif/core';
import { Button, Icons } from '@ohif/ui-next';
import { useTranslation } from 'react-i18next';
import { useViewportDisplaySets } from '../../hooks/useViewportDisplaySets';
import { getHounsfieldProbeState } from '../../utils/getHounsfieldProbeState';

export function HounsfieldProbe({ viewportId, onClose }) {
  const { t } = useTranslation('WindowLevelActionMenu');
  const { servicesManager } = useSystem();
  const { cornerstoneViewportService, toolGroupService } = servicesManager.services;
  const { viewportDisplaySets } = useViewportDisplaySets(viewportId);
  // Subscribe to toolbar updates so this action reflects a probe selected elsewhere.
  const { onInteraction } = useToolbar({ buttonSection: 'primary' });
  const viewport = cornerstoneViewportService.getCornerstoneViewport(viewportId);
  const toolGroup = toolGroupService.getToolGroupForViewport(viewportId);
  const { hasCT, enabled, isActive } = getHounsfieldProbeState(
    viewport,
    toolGroup,
    viewportDisplaySets
  );

  if (!hasCT) {
    return null;
  }

  return (
    <div className="border-border border-b px-2 py-2">
      <Button
        variant={isActive ? 'default' : 'ghost'}
        className="w-full justify-start gap-2"
        disabled={!enabled}
        aria-pressed={isActive}
        data-cy="hounsfield-probe"
        onClick={() => {
          onInteraction({ itemId: 'Probe', viewportId });
          onClose?.(false);
        }}
      >
        <Icons.ByName
          name="tool-probe"
          className="h-5 w-5"
        />
        {t('Hounsfield units (HU)')}
      </Button>
      <p className="text-muted-foreground max-w-[280px] px-2 pt-1 text-xs">
        {enabled ? t('HU probe help') : t('HU probe unavailable')}
      </p>
    </div>
  );
}
