import {
  MAX_VOLUME_RENDERING_SAMPLES,
  getVolumeRenderingQuality,
  getVolumeRenderingSampleDistance,
} from './volumeRenderingUtils';

const imageData = (dimensions = [32, 32, 32], spacing = [1, 1, 1]) => ({
  getDimensions: () => dimensions,
  getSpacing: () => spacing,
});

// VTK derives its shader loop bound from the point bounds, independently of
// maximumSamplesPerRay. Assert that the sample distance itself limits the work.
const getShaderSampleCount = (image: ReturnType<typeof imageData>, sampleDistance: number) =>
  Math.ceil(
    Math.hypot(
      ...image.getDimensions().map((size, index) => (size - 1) * image.getSpacing()[index])
    ) / sampleDistance
  );

describe('volumeRenderingUtils', () => {
  describe('rendering sample budget', () => {
    it.each([
      [
        [512, 512, 1000],
        [0.25, 0.25, 0.5],
      ],
      [
        [1024, 1024, 2000],
        [0.01, 0.01, 0.01],
      ],
      [
        [512, 512, 600],
        [0.5, 0.5, 2.5],
      ],
    ])('bounds the actual shader steps for dimensions %j and spacing %j', (dimensions, spacing) => {
      const image = imageData(dimensions, spacing);

      [1, 2, 3, 4].forEach(quality => {
        const sampleDistance = getVolumeRenderingSampleDistance(image, quality);

        expect(sampleDistance).toBeGreaterThan(0);
        expect(getShaderSampleCount(image, sampleDistance!)).toBeLessThanOrEqual(
          MAX_VOLUME_RENDERING_SAMPLES
        );
      });
    });

    it('preserves a smaller caller sample budget', () => {
      const image = imageData([512, 512, 1000], [0.5, 0.5, 1]);
      const sampleDistance = getVolumeRenderingSampleDistance(image, 4, 256)!;

      expect(getShaderSampleCount(image, sampleDistance)).toBeLessThanOrEqual(256);
      expect(sampleDistance).toBeGreaterThan(getVolumeRenderingSampleDistance(image, 4)!);
    });

    it('caps caller budgets above the global limit and rounds fractional budgets down', () => {
      const image = imageData([512, 512, 1000]);

      expect(getVolumeRenderingSampleDistance(image, 4, 10000)).toBe(
        getVolumeRenderingSampleDistance(image, 4)
      );
      expect(getVolumeRenderingSampleDistance(image, 4, 64.9)).toBe(
        getVolumeRenderingSampleDistance(image, 4, 64)
      );
      expect(
        getShaderSampleCount(image, getVolumeRenderingSampleDistance(image, 4, 64.9)!)
      ).toBeLessThanOrEqual(64);
    });

    it.each([0, 1, -10])('keeps budget %s finite and bounded at the minimum', maximumSamples => {
      const image = imageData();
      const sampleDistance = getVolumeRenderingSampleDistance(image, 4, maximumSamples)!;

      expect(Number.isFinite(sampleDistance)).toBe(true);
      expect(sampleDistance).toBe(getVolumeRenderingSampleDistance(image, 4, 2));
      expect(getShaderSampleCount(image, sampleDistance)).toBeLessThanOrEqual(2);
    });

    it.each([NaN, Infinity, -Infinity])('uses the default budget for %s', maximumSamples => {
      const image = imageData([512, 512, 1000]);

      expect(getVolumeRenderingSampleDistance(image, 4, maximumSamples)).toBe(
        getVolumeRenderingSampleDistance(image, 4)
      );
    });

    it('includes a safety step at the exact full-volume diagonal boundary', () => {
      // Full voxel extent has diagonal 13. A 14-sample budget permits distance 1.
      const image = imageData([3, 4, 12]);

      expect(getVolumeRenderingSampleDistance(image, 1, 14)).toBe(1);
      expect(getVolumeRenderingSampleDistance(image, 4, 14)).toBe(1);
      expect(getVolumeRenderingSampleDistance(image, 1, 13)).toBeGreaterThan(1);
      expect(
        getShaderSampleCount(image, getVolumeRenderingSampleDistance(image, 4, 14)!)
      ).toBeLessThanOrEqual(14);
    });
  });

  describe('quality mapping', () => {
    it('increases samples linearly from quality 1 through 4 before reaching the budget', () => {
      const image = imageData([32, 32, 32], [0.5, 1, 1.5]);
      const baseDistance = getVolumeRenderingSampleDistance(image, 1)!;
      const distances = [1, 2, 3, 4].map(
        quality => getVolumeRenderingSampleDistance(image, quality)!
      );

      distances.forEach((distance, index) => {
        expect(baseDistance / distance).toBeCloseTo(index + 1);
        if (index > 0) {
          expect(distance).toBeLessThan(distances[index - 1]);
        }
      });
    });

    it.each([1, 1.5, 2, 3, 3.75, 4])('roundtrips quality %s before the budget cap', quality => {
      const image = imageData();
      const sampleDistance = getVolumeRenderingSampleDistance(image, quality)!;

      expect(getVolumeRenderingQuality(image, sampleDistance)).toBeCloseTo(quality);
    });

    it('clamps requested and inferred quality to the supported range', () => {
      const image = imageData();

      expect(getVolumeRenderingSampleDistance(image, -1)).toBe(
        getVolumeRenderingSampleDistance(image, 1)
      );
      expect(getVolumeRenderingSampleDistance(image, 100)).toBe(
        getVolumeRenderingSampleDistance(image, 4)
      );
      expect(getVolumeRenderingQuality(image, 100)).toBe(1);
      expect(getVolumeRenderingQuality(image, 0.001)).toBe(4);
    });
  });

  describe('invalid inputs', () => {
    it.each([
      undefined,
      {},
      { getDimensions: () => [32, 32, 32] },
      { getSpacing: () => [1, 1, 1] },
      imageData([32, 32]),
      imageData([32, 32, 32, 32]),
      imageData([32, 32, 32], [1, 1]),
      imageData([32, 0, 32]),
      imageData([32, -1, 32]),
      imageData([32, NaN, 32]),
      imageData([32, Infinity, 32]),
      imageData([32, 32, 32], [1, 0, 1]),
      imageData([32, 32, 32], [1, -1, 1]),
      imageData([32, 32, 32], [1, NaN, 1]),
      imageData([32, 32, 32], [1, Infinity, 1]),
    ])('rejects incomplete or invalid image geometry: %j', image => {
      expect(getVolumeRenderingSampleDistance(image, 2)).toBeUndefined();
      expect(getVolumeRenderingQuality(image, 1)).toBeUndefined();
    });

    it.each([NaN, Infinity, -Infinity])('rejects nonfinite quality %s', quality => {
      expect(getVolumeRenderingSampleDistance(imageData(), quality)).toBeUndefined();
    });

    it.each([0, -1, NaN, Infinity, -Infinity])('rejects invalid sample distance %s', distance => {
      expect(getVolumeRenderingQuality(imageData(), distance)).toBeUndefined();
    });
  });
});
