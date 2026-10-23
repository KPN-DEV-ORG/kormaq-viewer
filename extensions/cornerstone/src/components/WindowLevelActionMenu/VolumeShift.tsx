import React, { ReactElement, useCallback, useEffect, useState, useRef } from 'react';
import { VolumeShiftProps } from '../../types/ViewportPresets';
import { useSystem } from '@ohif/core';
import { useTranslation } from 'react-i18next';
import { VolumeRenderingSlider } from './VolumeRenderingSlider';

export function VolumeShift({ viewportId }: VolumeShiftProps): ReactElement {
  const { servicesManager, commandsManager } = useSystem();
  const { cornerstoneViewportService } = servicesManager.services;
  const [minShift, setMinShift] = useState<number | null>(null);
  const [maxShift, setMaxShift] = useState<number | null>(null);
  const [shift, setShift] = useState(0);
  const [step, setStep] = useState<number | null>(null);
  const prevShiftRef = useRef(0);

  const viewport = cornerstoneViewportService.getCornerstoneViewport(viewportId);
  const actor = viewport?.getActors()?.[0]?.actor;
  const ofun = actor?.getProperty().getScalarOpacity(0);
  const { t } = useTranslation('WindowLevelActionMenu');

  useEffect(() => {
    const currentShift = viewport?.shiftedBy || 0;
    prevShiftRef.current = currentShift;
    setShift(currentShift);

    const range = ofun?.getRange();
    const transferFunctionWidth = range ? range[1] - range[0] : 0;
    if (!Number.isFinite(transferFunctionWidth) || transferFunctionWidth <= 0) {
      setStep(null);
      return;
    }

    const minShift = -transferFunctionWidth;
    const maxShift = transferFunctionWidth;

    setMinShift(minShift);
    setMaxShift(maxShift);
    setStep(Math.pow(10, Math.floor(Math.log10(transferFunctionWidth / 500))));
  }, [viewportId, viewport, ofun]);

  const onChangeRange = useCallback(
    newShift => {
      if (!viewport || !ofun) {
        return;
      }
      const shiftDifference = newShift - prevShiftRef.current;
      prevShiftRef.current = newShift;
      viewport.shiftedBy = newShift;
      if (shiftDifference !== 0) {
        commandsManager.runCommand('shiftVolumeOpacityPoints', {
          viewportId,
          shift: shiftDifference,
        });
      }
      setShift(newShift);
    },
    [commandsManager, viewportId, viewport, ofun]
  );

  return (
    <div className="my-1 mt-2 flex flex-col space-y-2">
      {step !== null && minShift !== null && maxShift !== null && (
        <VolumeRenderingSlider
          key={viewportId}
          label={t('Shift')}
          min={minShift}
          max={maxShift}
          step={step}
          value={shift}
          onValueCommit={onChangeRange}
        />
      )}
    </div>
  );
}
