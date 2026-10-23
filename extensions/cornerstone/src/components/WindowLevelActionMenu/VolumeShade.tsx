import React, { ReactElement, useCallback, useEffect, useState } from 'react';
import { Switch } from '@ohif/ui-next';
import { VolumeShadeProps } from '../../types/ViewportPresets';
import { useSystem } from '@ohif/core';
import { useTranslation } from 'react-i18next';

export function VolumeShade({ viewportId, onClickShade }: VolumeShadeProps): ReactElement {
  const { t } = useTranslation('WindowLevelActionMenu');
  const { servicesManager, commandsManager } = useSystem();
  const { cornerstoneViewportService } = servicesManager.services;
  const [shade, setShade] = useState(true);
  const actor = cornerstoneViewportService
    .getCornerstoneViewport(viewportId)
    ?.getActors()?.[0]?.actor;

  const onShadeChange = useCallback(
    (checked: boolean) => {
      commandsManager.runCommand('setVolumeLighting', { viewportId, options: { shade: checked } });
    },
    [commandsManager, viewportId]
  );
  useEffect(() => {
    const shade = !!actor?.getProperty().getShade();
    setShade(shade);
    onClickShade?.(shade);
  }, [viewportId, actor, onClickShade]);

  return (
    <>
      <span className="flex-grow">{t('Shade')}</span>
      <Switch
        className="ml-2 flex-shrink-0"
        checked={shade}
        disabled={!actor}
        onCheckedChange={checked => {
          setShade(checked);
          onClickShade?.(checked);
          onShadeChange(checked);
        }}
      />
    </>
  );
}
