import React, { ReactElement, useState, useEffect, useCallback } from 'react';
import { VolumeLightingProps } from '../../types/ViewportPresets';
import { useSystem } from '@ohif/core';
import { useTranslation } from 'react-i18next';
import { VolumeRenderingSlider } from './VolumeRenderingSlider';

export function VolumeLighting({ viewportId, hasShade }: VolumeLightingProps): ReactElement {
  const { servicesManager, commandsManager } = useSystem();
  const { cornerstoneViewportService } = servicesManager.services;
  const [lightingValues, setLightingValues] = useState({
    ambient: null,
    diffuse: null,
    specular: null,
  });
  const { t } = useTranslation('WindowLevelActionMenu');
  const actor = cornerstoneViewportService
    .getCornerstoneViewport(viewportId)
    ?.getActors()?.[0]?.actor;

  // Single callback to handle all lighting property changes
  const onLightingChange = useCallback(
    (property, value) => {
      commandsManager.runCommand('setVolumeLighting', {
        viewportId,
        options: { [property]: value },
      });
      setLightingValues(prev => ({
        ...prev,
        [property]: value,
      }));
    },
    [commandsManager, viewportId]
  );

  useEffect(() => {
    const property = actor?.getProperty();

    const values = {
      ambient: property?.getAmbient() ?? null,
      diffuse: property?.getDiffuse() ?? null,
      specular: property?.getSpecular() ?? null,
    };

    setLightingValues(values);
  }, [viewportId, actor]);

  // Configuration for our lighting properties
  const lightingProperties = [
    { key: 'ambient', label: t('Ambient') },
    { key: 'diffuse', label: t('Diffuse') },
    { key: 'specular', label: t('Specular') },
  ];

  return (
    <div className="my-1 mt-2 flex flex-col space-y-2">
      {lightingProperties.map(
        ({ key, label }) =>
          lightingValues[key] !== null && (
            <VolumeRenderingSlider
              key={`${viewportId}:${key}`}
              label={label}
              min={0}
              max={1}
              step={0.1}
              value={lightingValues[key]}
              disabled={!hasShade}
              onValueCommit={value => onLightingChange(key, value)}
            />
          )
      )}
    </div>
  );
}
