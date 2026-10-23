import React from 'react';
import { createEvent, fireEvent, render, screen } from '@testing-library/react';
import { VolumeRenderingQuality } from './VolumeRenderingQuality';
import { VolumeLighting } from './VolumeLighting';
import { VolumeShift } from './VolumeShift';
import { VolumeShade } from './VolumeShade';
import { VolumeRenderingSlider } from './VolumeRenderingSlider';

const mockRunCommand = jest.fn();
const mockGetViewport = jest.fn();

jest.mock('@ohif/core', () => ({
  useSystem: () => ({
    commandsManager: { runCommand: mockRunCommand },
    servicesManager: {
      services: {
        cornerstoneViewportService: { getCornerstoneViewport: mockGetViewport },
      },
    },
  }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: value => value }),
}));

// Model Radix's separate draft and commit events without requiring pointer capture in jsdom.
jest.mock('@ohif/ui-next', () => {
  const React = require('react');
  return {
    Slider: props =>
      React.createElement('input', {
        type: 'range',
        'aria-label': props['aria-label'],
        value: props.value[0],
        min: props.min,
        max: props.max,
        step: props.step,
        disabled: props.disabled,
        onChange: event => props.onValueChange([Number(event.target.value)]),
        onMouseUp: event => props.onValueCommit([Number(event.target.value)]),
      }),
    Switch: props =>
      React.createElement('button', {
        role: 'switch',
        'aria-checked': props.checked,
        disabled: props.disabled,
        onClick: () => props.onCheckedChange(!props.checked),
      }),
  };
});

function createViewport(shiftedBy = 0, sampleDistance = 1) {
  const opacity = { getRange: () => [0, 100] };
  const property = {
    getAmbient: () => 0.2,
    getDiffuse: () => 0.6,
    getSpecular: () => 0.3,
    getShade: () => true,
    getScalarOpacity: () => opacity,
  };
  const actor = {
    getMapper: () => ({
      getInputData: () => ({
        getSpacing: () => [1, 1, 1],
        getDimensions: () => [128, 128, 128],
      }),
      getSampleDistance: () => sampleDistance,
    }),
    getProperty: () => property,
  };
  return { shiftedBy, getActors: () => [{ actor }] };
}

describe('volume rendering controls', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetViewport.mockReturnValue(createViewport());
  });

  it('renders only the committed quality after dragging across several quality levels', () => {
    render(
      React.createElement(VolumeRenderingQuality, {
        viewportId: '3d',
        volumeRenderingQualityRange: { min: 1, max: 4, step: 1 },
      })
    );
    const slider = screen.getByRole('slider', { name: 'Quality' });
    [2, 3, 4].forEach(value => fireEvent.change(slider, { target: { value } }));
    expect(mockRunCommand).not.toHaveBeenCalled();

    fireEvent.mouseUp(slider);
    expect(mockRunCommand.mock.calls).toEqual([
      ['setVolumeRenderingQuality', { viewportId: '3d', quality: 4 }],
    ]);
  });

  it('discards uncommitted slider movement when the menu closes', () => {
    const { unmount } = render(
      React.createElement(VolumeLighting, { viewportId: '3d', hasShade: true })
    );
    fireEvent.change(screen.getByRole('slider', { name: 'Ambient' }), {
      target: { value: 0.8 },
    });
    unmount();
    expect(mockRunCommand).not.toHaveBeenCalled();
  });

  it('reads quality back with the same spacing ratio used by rendering commands', () => {
    mockGetViewport.mockReturnValue(createViewport(0, 0.5));
    render(
      React.createElement(VolumeRenderingQuality, {
        viewportId: '3d',
        volumeRenderingQualityRange: { min: 1, max: 4, step: 1 },
      })
    );
    expect((screen.getByRole('slider', { name: 'Quality' }) as HTMLInputElement).value).toBe('2');
    expect(mockRunCommand).not.toHaveBeenCalled();
  });

  it('commits lighting once and disables the actual controls when shading is off', () => {
    const { rerender } = render(
      React.createElement(VolumeLighting, { viewportId: '3d', hasShade: true })
    );
    const slider = screen.getByRole('slider', { name: 'Diffuse' });
    [0.7, 0.8, 0.9].forEach(value => fireEvent.change(slider, { target: { value } }));
    expect(mockRunCommand).not.toHaveBeenCalled();
    fireEvent.mouseUp(slider);
    expect(mockRunCommand.mock.calls).toEqual([
      ['setVolumeLighting', { viewportId: '3d', options: { diffuse: 0.9 } }],
    ]);

    rerender(React.createElement(VolumeLighting, { viewportId: '3d', hasShade: false }));
    expect((slider as HTMLInputElement).disabled).toBe(true);
    fireEvent.mouseUp(slider);
    expect(mockRunCommand).toHaveBeenCalledTimes(1);
  });

  it('calculates opacity shifts from the last applied value and resets for another viewport', () => {
    const firstViewport = createViewport(20);
    const secondViewport = createViewport(-5);
    mockGetViewport.mockImplementation(id => (id === 'first' ? firstViewport : secondViewport));
    const { rerender } = render(React.createElement(VolumeShift, { viewportId: 'first' }));
    const slider = screen.getByRole('slider', { name: 'Shift' });

    [30, 40].forEach(value => fireEvent.change(slider, { target: { value } }));
    expect(firstViewport.shiftedBy).toBe(20);
    expect(mockRunCommand).not.toHaveBeenCalled();
    fireEvent.mouseUp(slider);
    fireEvent.change(slider, { target: { value: 60 } });
    fireEvent.mouseUp(slider);

    rerender(React.createElement(VolumeShift, { viewportId: 'second' }));
    const secondSlider = screen.getByRole('slider', { name: 'Shift' });
    expect((secondSlider as HTMLInputElement).value).toBe('-5');
    fireEvent.change(secondSlider, { target: { value: 10 } });
    fireEvent.mouseUp(secondSlider);

    expect(mockRunCommand.mock.calls).toEqual([
      ['shiftVolumeOpacityPoints', { viewportId: 'first', shift: 20 }],
      ['shiftVolumeOpacityPoints', { viewportId: 'first', shift: 20 }],
      ['shiftVolumeOpacityPoints', { viewportId: 'second', shift: 15 }],
    ]);
  });

  it('opens safely while a volume actor is unavailable', () => {
    mockGetViewport.mockReturnValue({ getActors: () => [] });
    render(
      React.createElement(
        React.Fragment,
        null,
        React.createElement(VolumeRenderingQuality, {
          viewportId: '3d',
          volumeRenderingQualityRange: { min: 1, max: 4, step: 1 },
        }),
        React.createElement(VolumeLighting, { viewportId: '3d', hasShade: false }),
        React.createElement(VolumeShift, { viewportId: '3d' }),
        React.createElement(VolumeShade, { viewportId: '3d' })
      )
    );
    expect(screen.queryAllByRole('slider')).toHaveLength(0);
    expect((screen.getByRole('switch') as HTMLButtonElement).disabled).toBe(true);
  });

  it('keeps slider navigation keys out of viewer shortcuts without cancelling their default action', () => {
    const onViewerKeyDown = jest.fn();
    const onViewerKeyUp = jest.fn();
    render(
      React.createElement(
        'div',
        { onKeyDown: onViewerKeyDown, onKeyUp: onViewerKeyUp },
        React.createElement(VolumeRenderingSlider, {
          label: 'Quality',
          value: 2,
          min: 1,
          max: 4,
          step: 1,
          onValueCommit: jest.fn(),
        })
      )
    );
    const slider = screen.getByRole('slider', { name: 'Quality' });
    [
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Home',
      'End',
      'PageUp',
      'PageDown',
    ].forEach(key => {
      const keyDown = createEvent.keyDown(slider, { key });
      const keyUp = createEvent.keyUp(slider, { key });
      fireEvent(slider, keyDown);
      fireEvent(slider, keyUp);
      expect(keyDown.defaultPrevented).toBe(false);
      expect(keyUp.defaultPrevented).toBe(false);
    });
    expect(onViewerKeyDown).not.toHaveBeenCalled();
    expect(onViewerKeyUp).not.toHaveBeenCalled();

    fireEvent.keyDown(slider, { key: 'Tab' });
    fireEvent.keyUp(slider, { key: 'Tab' });
    expect(onViewerKeyDown).toHaveBeenCalledTimes(1);
    expect(onViewerKeyUp).toHaveBeenCalledTimes(1);
  });
});
