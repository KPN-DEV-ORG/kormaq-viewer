import React, { ReactElement, useCallback, useState, useEffect } from 'react';
import { VolumeRenderingQualityProps } from '../../types/ViewportPresets';
import { useSystem } from '@ohif/core';
import { useTranslation } from 'react-i18next';
import { getVolumeRenderingQuality } from '../../utils/volumeRenderingUtils';
import { VolumeRenderingSlider } from './VolumeRenderingSlider';

export function VolumeRenderingQuality({
  volumeRenderingQualityRange,
  viewportId,
}: VolumeRenderingQualityProps): ReactElement {
  const { servicesManager, commandsManager } = useSystem();
  const { cornerstoneViewportService } = servicesManager.services;
  const { min, max, step } = volumeRenderingQualityRange;
  const [quality, setQuality] = useState<number | null>(null);
  const { t } = useTranslation('WindowLevelActionMenu');
  const actor = cornerstoneViewportService
    .getCornerstoneViewport(viewportId)
    ?.getActors()?.[0]?.actor;

  const onChange = useCallback(
    (value: number) => {
      commandsManager.runCommand('setVolumeRenderingQuality', {
        viewportId,
        quality: value,
      });
      setQuality(value);
    },
    [commandsManager, viewportId]
  );

  useEffect(() => {
    const mapper = actor?.getMapper();
    const image = mapper?.getInputData();
    setQuality(
      image
        ? Math.max(
            min,
            Math.min(max, getVolumeRenderingQuality(image, mapper.getSampleDistance()) ?? min)
          )
        : null
    );
  }, [actor, viewportId, min, max]);

  return (
    <div className="my-1 mt-2 flex flex-col space-y-2">
      {quality !== null && (
        <VolumeRenderingSlider
          key={viewportId}
          label={t('Quality')}
          min={min}
          max={max}
          step={step}
          value={quality}
          onValueCommit={onChange}
        />
      )}
    </div>
  );
}
