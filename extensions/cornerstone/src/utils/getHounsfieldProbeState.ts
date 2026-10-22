import { Enums } from '@cornerstonejs/core';
import { PROJECTION_MODES, blendModeToProjectionMode } from './projectionUtils';

export function getHounsfieldProbeState(viewport, toolGroup, displaySets = []) {
  const hasCT = displaySets.some(displaySet => displaySet?.Modality === 'CT');
  const isImagePlane =
    viewport?.type === Enums.ViewportType.STACK ||
    viewport?.type === Enums.ViewportType.ORTHOGRAPHIC;
  const isProjection =
    blendModeToProjectionMode(viewport?.getBlendMode?.()) !== PROJECTION_MODES.COMPOSITE;

  return {
    hasCT,
    enabled: hasCT && isImagePlane && !isProjection && !!toolGroup?.hasTool('Probe'),
    isActive: toolGroup?.getActivePrimaryMouseButtonTool() === 'Probe',
  };
}
