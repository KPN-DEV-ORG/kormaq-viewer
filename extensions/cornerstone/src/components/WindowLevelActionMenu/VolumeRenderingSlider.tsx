import React, { useEffect, useState } from 'react';
import { Slider } from '@ohif/ui-next';

const SLIDER_NAVIGATION_KEYS = new Set([
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
  'PageUp',
  'PageDown',
]);

function stopSliderShortcutPropagation(event: React.KeyboardEvent) {
  if (SLIDER_NAVIGATION_KEYS.has(event.key)) {
    // These keys belong to the focused slider, not the viewer's image navigation shortcuts.
    event.stopPropagation();
  }
}

interface VolumeRenderingSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  onValueCommit: (value: number) => void;
}

/** Keep dragging responsive without starting an expensive volume render for every pointer move. */
export function VolumeRenderingSlider({
  label,
  value,
  min,
  max,
  step,
  disabled = false,
  onValueCommit,
}: VolumeRenderingSliderProps) {
  const [draftValue, setDraftValue] = useState(value);

  useEffect(() => {
    setDraftValue(value);
  }, [value]);

  return (
    <div
      className={`w-full pl-2 pr-1 ${disabled ? 'opacity-40' : ''}`}
      onKeyDown={stopSliderShortcutPropagation}
      onKeyUp={stopSliderShortcutPropagation}
    >
      <div className="flex flex-row items-center">
        <span className="text-foreground w-16 text-base">{label}</span>
        <Slider
          aria-label={label}
          className="mx-2 flex-grow"
          min={min}
          max={max}
          step={step}
          value={[draftValue]}
          disabled={disabled}
          onValueChange={([nextValue]) => setDraftValue(nextValue)}
          onValueCommit={([nextValue]) => {
            if (!disabled && Number.isFinite(nextValue)) {
              onValueCommit(nextValue);
            }
          }}
        />
      </div>
    </div>
  );
}
