import dcmjs from 'dcmjs';
import { expect, test, visitStudy } from './utils';

function createCTStack() {
  const studyUID = '1.2.826.0.1.3680043.10.543.300';
  return Array.from({ length: 24 }, (_, slice) => {
    const pixels = Uint16Array.from({ length: 64 * 64 }, (_, pixel) => {
      const x = (pixel % 64) - 31.5;
      const y = Math.floor(pixel / 64) - 31.5;
      const z = (slice - 11.5) * 2;
      return x * x + 2 * y * y + z * z < 400 ? 2000 : 0;
    });
    const dataset = {
      _meta: {},
      _vrMap: { PixelData: 'OW' },
      SOPClassUID: '1.2.840.10008.5.1.4.1.1.2',
      SOPInstanceUID: `${studyUID}.1.${slice + 1}`,
      StudyInstanceUID: studyUID,
      SeriesInstanceUID: `${studyUID}.1`,
      FrameOfReferenceUID: `${studyUID}.2`,
      PatientName: 'Synthetic^3D',
      PatientID: 'SYNTHETIC-3D',
      StudyDate: '20200101',
      Modality: 'CT',
      SeriesDescription: 'Synthetic CT',
      SeriesNumber: 1,
      InstanceNumber: slice + 1,
      ImageType: ['ORIGINAL', 'PRIMARY', 'AXIAL'],
      ImagePositionPatient: [0, 0, slice * 2],
      ImageOrientationPatient: [1, 0, 0, 0, 1, 0],
      PixelSpacing: [1, 1],
      SliceThickness: 2,
      Rows: 64,
      Columns: 64,
      SamplesPerPixel: 1,
      PhotometricInterpretation: 'MONOCHROME2',
      BitsAllocated: 16,
      BitsStored: 16,
      HighBit: 15,
      PixelRepresentation: 0,
      RescaleIntercept: -1024,
      RescaleSlope: 1,
      WindowCenter: 400,
      WindowWidth: 2000,
      PixelData: pixels.buffer,
    };
    return {
      name: `ct-${slice + 1}.dcm`,
      mimeType: 'application/dicom',
      buffer: dcmjs.data.datasetToBuffer(dataset),
    };
  });
}

test.describe('local 3D interactions', () => {
  test.use({ viewport: { width: 1600, height: 480 }, deviceScaleFactor: 0.5 });

  test('should expose 3D mode before rotation and preserve wheel zoom when switching tools', async ({
    page,
  }) => {
    await page.goto('/localbasic');
    await page.locator('input[type="file"]:not([webkitdirectory])').setInputFiles(createCTStack());

    const volume3DButton = page.getByTestId('Volume3D');
    const rotateButton = page.getByTestId('TrackballRotate');
    const zoomButton = page.getByTestId('Zoom');

    await expect(volume3DButton).toBeVisible();
    const modeButton = volume3DButton.getByRole('button', { name: '3D Mode', exact: true });
    await expect(rotateButton).toBeVisible();
    expect(
      await page
        .locator('[data-cy="Volume3D"], [data-cy="TrackballRotate"]')
        .evaluateAll(buttons => buttons.map(button => button.getAttribute('data-cy')))
    ).toEqual(['Volume3D', 'TrackballRotate']);

    await expect(modeButton).toBeEnabled();
    await volume3DButton.click();
    await expect(page.locator('[data-cy="viewport-pane"]')).toHaveCount(1);
    await expect
      .poll(() =>
        page.evaluate(() => {
          const enabledElements = window.cornerstone.getEnabledElements();
          return enabledElements.map(({ viewport }) => viewport.type);
        })
      )
      .toEqual(['volume3d']);

    const readCamera = () =>
      page.evaluate(() => {
        const viewport = window.cornerstone
          .getEnabledElements()
          .find(({ viewport }) => viewport.type === 'volume3d')?.viewport;
        if (!viewport?.getActors().length) {
          return;
        }

        const { parallelScale, viewPlaneNormal, viewUp } = viewport.getCamera();
        return {
          parallelScale,
          viewPlaneNormal: Array.from(viewPlaneNormal),
          viewUp: Array.from(viewUp),
        };
      });

    await expect.poll(readCamera, { timeout: 30_000 }).toBeDefined();
    await expect(rotateButton).toHaveAttribute('data-active', 'true');
    const viewport = page.locator('[data-cy="viewport-pane"]').first();
    const bounds = await viewport.boundingBox();
    expect(bounds).not.toBeNull();
    const center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };

    const beforeRotation = await readCamera();
    await page.mouse.move(center.x, center.y);
    await page.mouse.down();
    await page.mouse.move(center.x + 100, center.y + 50, { steps: 2 });
    await page.mouse.up();
    await expect
      .poll(async () => {
        const camera = await readCamera();
        return camera.viewPlaneNormal.some(
          (component, index) => Math.abs(component - beforeRotation.viewPlaneNormal[index]) > 0.001
        );
      })
      .toBe(true);

    const expectWheelZoom = async () => {
      const beforeZoom = await readCamera();
      await page.mouse.move(center.x, center.y);
      await page.mouse.wheel(0, -120);
      await expect
        .poll(async () => (await readCamera()).parallelScale)
        .not.toBeCloseTo(beforeZoom.parallelScale, 6);

      const afterZoom = await readCamera();
      for (const orientation of ['viewPlaneNormal', 'viewUp'] as const) {
        afterZoom[orientation].forEach((component, index) => {
          expect(component).toBeCloseTo(beforeZoom[orientation][index], 6);
        });
      }
    };

    await expectWheelZoom();

    await zoomButton.getByRole('button').click();
    await expect(zoomButton).toHaveAttribute('data-active', 'true');
    await rotateButton.getByRole('button').click();
    await expect(rotateButton).toHaveAttribute('data-active', 'true');
    await expectWheelZoom();

    await zoomButton.getByRole('button').click();
    await expect(zoomButton).toHaveAttribute('data-active', 'true');
    await zoomButton.getByRole('button').click();
    await expect(zoomButton).toHaveAttribute('data-active', 'false');
    await expectWheelZoom();
  });
  test('should apply rendering options on release and preserve them after 3D initialization', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.goto('/localbasic');
    await page.locator('input[type="file"]:not([webkitdirectory])').setInputFiles(createCTStack());

    await expect(page.getByTestId('MPRLayout')).toHaveText('MPR');
    await expect(page.getByTestId('ProjectionMIP')).toHaveText('MIP');
    await expect(page.getByTestId('Volume3D')).toHaveText('3D');
    await page.getByTestId('Volume3D').click();

    const readRendering = () =>
      page.evaluate(() => {
        const viewport = window.cornerstone
          .getEnabledElements()
          .find(({ viewport }) => viewport.type === 'volume3d')?.viewport;
        const actor = viewport?.getActors()?.[0]?.actor;
        const mapper = actor?.getMapper();
        const image = mapper?.getInputData();
        if (!image) {
          return;
        }
        const property = actor.getProperty();
        const dimensions = image.getDimensions();
        const spacing = image.getSpacing();
        const diagonal = Math.hypot(...dimensions.map((size, index) => size * spacing[index]));
        const opacityPoint = [0, 0, 0, 0];
        property.getScalarOpacity(0).getNodeValue(0, opacityPoint);
        return {
          sampleDistance: mapper.getSampleDistance(),
          samples: Math.ceil(diagonal / mapper.getSampleDistance()),
          ambient: property.getAmbient(),
          diffuse: property.getDiffuse(),
          shade: Boolean(property.getShade()),
          opacityStart: opacityPoint[0],
          frames: viewport.renderedTestFrames ?? 0,
        };
      });

    await expect.poll(readRendering, { timeout: 30_000 }).toBeDefined();
    await expect.poll(async () => (await readRendering()).ambient).toBe(0.34);
    await page.evaluate(() => {
      const viewport = window.cornerstone
        .getEnabledElements()
        .find(({ viewport }) => viewport.type === 'volume3d').viewport;
      viewport.renderedTestFrames = 0;
      viewport.element.addEventListener('CORNERSTONE_IMAGE_RENDERED', () => {
        viewport.renderedTestFrames++;
      });
    });

    await page.locator('button[aria-label="Window Level"]:enabled').click();
    await page.getByText('Rendering Options', { exact: true }).click();
    const quality = page.getByRole('slider', { name: 'Quality', exact: true });
    await expect(quality).toBeVisible();

    const before = await readRendering();
    const thumb = await quality.boundingBox();
    const track = await quality.locator('../..').boundingBox();
    await page.mouse.move(thumb.x + thumb.width / 2, thumb.y + thumb.height / 2);
    await page.mouse.down();
    await page.mouse.move(track.x + track.width - 1, thumb.y + thumb.height / 2, { steps: 8 });
    expect((await readRendering()).sampleDistance).toBe(before.sampleDistance);
    await page.mouse.up();
    await expect(quality).toHaveAttribute('aria-valuenow', '4');
    await expect
      .poll(async () => (await readRendering()).sampleDistance)
      .toBeLessThan(before.sampleDistance);
    await expect.poll(async () => (await readRendering()).frames).toBeGreaterThan(0);
    expect((await readRendering()).samples).toBeLessThanOrEqual(1024);

    await page.getByRole('slider', { name: 'Shift', exact: true }).press('ArrowRight');
    await page.getByRole('slider', { name: 'Ambient', exact: true }).press('Home');
    await page.getByRole('slider', { name: 'Diffuse', exact: true }).press('End');
    await expect.poll(async () => (await readRendering()).ambient).toBe(0);
    await expect.poll(async () => (await readRendering()).diffuse).toBe(1);
    expect((await readRendering()).opacityStart).toBeGreaterThan(before.opacityStart);

    const shade = page.getByRole('switch');
    await shade.click();
    await expect(page.getByRole('slider', { name: 'Ambient', exact: true })).toBeDisabled();
    await shade.click();
    await expect.poll(async () => (await readRendering()).shade).toBe(true);

    const applied = await readRendering();
    await page.evaluate(() => window.commandsManager.runCommand('setCTBoneOnlyRendering'));
    // The old initializer overwrote settings on twelve retries spaced 120 ms apart.
    await page.waitForTimeout(1700);
    const after = await readRendering();
    expect(after).toEqual({ ...applied, frames: after.frames });
    expect(after.frames).toBeGreaterThan(1);

    // Lighting must also bound sampling when an imported preset used a very small distance.
    await page.evaluate(() => {
      const viewport = window.cornerstone
        .getEnabledElements()
        .find(({ viewport }) => viewport.type === 'volume3d').viewport;
      viewport.getActors()[0].actor.getMapper().setSampleDistance(0.0001);
      window.commandsManager.runCommand('setVolumeLighting', {
        viewportId: viewport.id,
        ambient: 0.5,
      });
    });
    await expect.poll(async () => (await readRendering()).ambient).toBe(0.5);
    expect((await readRendering()).samples).toBeLessThanOrEqual(1024);
    await expect.poll(async () => (await readRendering()).frames).toBeGreaterThan(after.frames);

    await page.keyboard.press('Escape');
    await page.getByTestId('MPRLayout').click();
    await expect(page.getByTestId('viewport-pane')).toHaveCount(3);
    await expect
      .poll(() =>
        page.evaluate(() =>
          window.cornerstone.getEnabledElements().map(({ viewport }) => viewport.type)
        )
      )
      .toEqual(['orthographic', 'orthographic', 'orthographic']);
    await page.getByTestId('Volume3D').click();
    await expect.poll(async () => (await readRendering())?.ambient).toBe(0.34);
  });
});

test.describe('3D workflow', () => {
  test.beforeEach(async ({ page }) => {
    const studyInstanceUID = '1.3.6.1.4.1.25403.345050719074.3824.20170125095438.5';
    const mode = 'viewer';
    await visitStudy(page, studyInstanceUID, mode, 5000);
  });

  test('should reset from 3D four up to the default layout when double-clicking another series', async ({
    page,
    leftPanelPageObject,
    mainToolbarPageObject,
  }) => {
    await mainToolbarPageObject.layoutSelection.threeDFourUp.click();
    await page.waitForTimeout(4000);

    await expect(page.locator('[data-cy="viewport-pane"]')).toHaveCount(4);

    await leftPanelPageObject.loadSeriesByDescription('Body 4.0 CE', 1);
    await page.waitForTimeout(4000);

    await expect(page.locator('[data-cy="viewport-pane"]')).toHaveCount(1);

    const viewportIds = await page.evaluate(() => {
      return window.cornerstone
        .getEnabledElements()
        .map(({ viewport }) => viewport.id)
        .sort();
    });

    expect(viewportIds).toEqual(['default']);
  });

  test('should reset from 3D four up to the default layout when navigating to another series', async ({
    page,
    mainToolbarPageObject,
  }) => {
    await mainToolbarPageObject.layoutSelection.threeDFourUp.click();
    await page.waitForTimeout(4000);

    await expect(page.locator('[data-cy="viewport-pane"]')).toHaveCount(4);

    await page.locator('[data-cy="viewport-pane"]').first().click();
    await page.keyboard.press('PageDown');
    await page.waitForTimeout(4000);

    await expect(page.locator('[data-cy="viewport-pane"]')).toHaveCount(1);

    const viewportIds = await page.evaluate(() => {
      return window.cornerstone
        .getEnabledElements()
        .map(({ viewport }) => viewport.id)
        .sort();
    });

    expect(viewportIds).toEqual(['default']);
  });
});
