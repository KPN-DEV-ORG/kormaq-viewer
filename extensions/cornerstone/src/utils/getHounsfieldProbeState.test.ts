import { getHounsfieldProbeState } from './getHounsfieldProbeState';

jest.mock('@cornerstonejs/core', () => ({
  Enums: {
    ViewportType: { STACK: 'stack', ORTHOGRAPHIC: 'orthographic' },
    BlendModes: {
      COMPOSITE: 0,
      MAXIMUM_INTENSITY_BLEND: 1,
      MINIMUM_INTENSITY_BLEND: 2,
      AVERAGE_INTENSITY_BLEND: 3,
    },
  },
}));

describe('Hounsfield probe availability', () => {
  const toolGroup = {
    hasTool: name => name === 'Probe',
    getActivePrimaryMouseButtonTool: () => 'Probe',
  };

  it.each(['stack', 'orthographic'])('enables HU for a CT %s image plane', type => {
    expect(getHounsfieldProbeState({ type }, toolGroup, [{ Modality: 'CT' }])).toEqual({
      hasCT: true,
      enabled: true,
      isActive: true,
    });
  });

  it.each(['MR', 'US', 'PT'])('does not label %s pixel intensities as HU', Modality => {
    expect(getHounsfieldProbeState({ type: 'stack' }, toolGroup, [{ Modality }])).toMatchObject({
      hasCT: false,
      enabled: false,
    });
  });

  it('disables HU for projection slabs and 3D rendering', () => {
    const ct = [{ Modality: 'CT' }];
    expect(
      getHounsfieldProbeState({ type: 'orthographic', getBlendMode: () => 1 }, toolGroup, ct)
        .enabled
    ).toBe(false);
    expect(getHounsfieldProbeState({ type: 'volume3d' }, toolGroup, ct).enabled).toBe(false);
    expect(getHounsfieldProbeState(undefined, toolGroup, ct).enabled).toBe(false);
  });
});
