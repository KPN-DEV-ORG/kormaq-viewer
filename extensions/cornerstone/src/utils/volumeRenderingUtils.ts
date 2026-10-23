// VTK uses the volume diagonal / sample distance as a shader loop bound.
// maximumSamplesPerRay alone only emits a warning; the distance must also be bounded.
export const MAX_VOLUME_RENDERING_SAMPLES = 1024;
export const MIN_VOLUME_RENDERING_QUALITY = 1;
export const MAX_VOLUME_RENDERING_QUALITY = 4;

type VolumeImageData = {
  getDimensions?: () => number[];
  getSpacing?: () => number[];
};

function getVolumeGeometry(imageData?: VolumeImageData) {
  const dimensions = imageData?.getDimensions?.();
  const spacing = imageData?.getSpacing?.();
  if (
    dimensions?.length !== 3 ||
    spacing?.length !== 3 ||
    [...dimensions, ...spacing].some(value => !Number.isFinite(value) || value <= 0)
  ) {
    return;
  }

  const averageSpacing = spacing.reduce((sum, value) => sum + value, 0) / 3;
  // Use the full voxel extent, slightly larger than VTK's point bounds.
  const diagonal = Math.hypot(...dimensions.map((size, index) => size * spacing[index]));
  return { averageSpacing, diagonal };
}

export function getVolumeRenderingSampleDistance(
  imageData: VolumeImageData,
  quality: number,
  maximumSamples = MAX_VOLUME_RENDERING_SAMPLES
): number | undefined {
  const geometry = getVolumeGeometry(imageData);
  if (!geometry || !Number.isFinite(quality)) {
    return;
  }

  const boundedQuality = Math.min(
    MAX_VOLUME_RENDERING_QUALITY,
    Math.max(MIN_VOLUME_RENDERING_QUALITY, quality)
  );
  const sampleBudget = Number.isFinite(maximumSamples)
    ? Math.min(MAX_VOLUME_RENDERING_SAMPLES, Math.max(2, Math.floor(maximumSamples)))
    : MAX_VOLUME_RENDERING_SAMPLES;

  return Math.max(geometry.averageSpacing / boundedQuality, geometry.diagonal / (sampleBudget - 1));
}

export function getVolumeRenderingQuality(
  imageData: VolumeImageData,
  sampleDistance: number
): number | undefined {
  const geometry = getVolumeGeometry(imageData);
  if (!geometry || !Number.isFinite(sampleDistance) || sampleDistance <= 0) {
    return;
  }

  return Math.min(
    MAX_VOLUME_RENDERING_QUALITY,
    Math.max(MIN_VOLUME_RENDERING_QUALITY, geometry.averageSpacing / sampleDistance)
  );
}
