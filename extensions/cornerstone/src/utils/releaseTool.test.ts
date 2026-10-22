import { getEnabledElementByIds } from '@cornerstonejs/core';
import { cancelActiveManipulations } from '@cornerstonejs/tools';
import ToolGroup from '@cornerstonejs/tools/store/ToolGroupManager/ToolGroup';
import { state } from '@cornerstonejs/tools/store/state';
import { Enums } from '@cornerstonejs/tools';
import { initElementCursor } from '@cornerstonejs/tools/cursors/elementCursor';
import releaseTool from './releaseTool';

jest.mock('@cornerstonejs/core', () => ({
  triggerEvent: jest.fn(),
  eventTarget: {},
  getRenderingEngine: jest.fn(() => ({ renderViewport: jest.fn() })),
  getRenderingEngines: jest.fn(),
  getEnabledElementByIds: jest.fn(),
  Settings: {
    getRuntimeSettings: () => ({ get: () => true }),
  },
  utilities: { deepClone: value => ({ ...value }) },
}));

jest.mock('@cornerstonejs/tools', () => ({
  cancelActiveManipulations: jest.fn(),
  Enums: jest.requireActual('@cornerstonejs/tools/enums'),
}));

jest.mock('@cornerstonejs/tools/cursors', () => ({
  MouseCursor: { getDefinedCursor: name => ({ name }) },
  SVGMouseCursor: { getDefinedCursor: () => undefined },
}));

jest.mock('@cornerstonejs/tools/cursors/elementCursor', () => ({
  initElementCursor: jest.fn(),
}));

const { ToolModes, MouseBindings } = Enums;

class TestTool {
  configuration: Record<string, unknown>;
  onSetToolDisabled = jest.fn();

  constructor({ configuration }) {
    this.configuration = configuration;
  }
}

describe('releaseTool with Cornerstone tool groups', () => {
  let toolGroup: ToolGroup;
  let element: HTMLDivElement;

  beforeEach(() => {
    jest.clearAllMocks();
    (cancelActiveManipulations as jest.Mock).mockReset();
    toolGroup = new ToolGroup('default');
    state.tools.Length = { toolClass: TestTool };
    state.tools.StackScroll = { toolClass: TestTool };
    state.tools.Crosshairs = { toolClass: TestTool };
    toolGroup.addTool('Length');
    toolGroup.addTool('StackScroll');
    toolGroup.addTool('Crosshairs', { disableOnPassive: true });
    element = document.createElement('div');
    toolGroup.viewportsInfo = [{ viewportId: 'viewport-1', renderingEngineId: 'engine-1' }];
    (getEnabledElementByIds as jest.Mock).mockReturnValue({ viewport: { element } });
  });

  it('cancels active manipulation before removing the primary binding', () => {
    toolGroup.setToolActive('Length', { bindings: [{ mouseButton: MouseBindings.Primary }] });
    (cancelActiveManipulations as jest.Mock).mockImplementation(() => {
      expect(toolGroup.getToolOptions('Length').mode).toBe(ToolModes.Active);
      expect(toolGroup.getActivePrimaryMouseButtonTool()).toBe('Length');
    });

    releaseTool(toolGroup, 'Length');

    expect(cancelActiveManipulations).toHaveBeenCalledWith(element);
    expect(toolGroup.getActivePrimaryMouseButtonTool()).toBeUndefined();
    expect(toolGroup.getToolOptions('Length')).toEqual({ mode: ToolModes.Passive, bindings: [] });
    expect(toolGroup.hasTool('Length')).toBe(true);
    expect(initElementCursor).toHaveBeenLastCalledWith(element, { name: 'default' });
  });

  it('retains wheel and touch scrolling when releasing primary stack scrolling', () => {
    toolGroup.setToolActive('StackScroll', {
      bindings: [
        { mouseButton: MouseBindings.Primary },
        { mouseButton: MouseBindings.Wheel },
        { numTouchPoints: 3 },
      ],
    });

    releaseTool(toolGroup, 'StackScroll');

    expect(toolGroup.getActivePrimaryMouseButtonTool()).toBeUndefined();
    expect(toolGroup.getToolOptions('StackScroll')).toEqual({
      mode: ToolModes.Active,
      bindings: [{ mouseButton: MouseBindings.Wheel }, { numTouchPoints: 3 }],
    });
  });

  it('removes modified primary bindings while retaining auxiliary interactions', () => {
    toolGroup.setToolActive('Length', {
      bindings: [
        { mouseButton: MouseBindings.Primary },
        { mouseButton: MouseBindings.Primary, modifierKey: Enums.KeyboardBindings.Shift },
        { mouseButton: MouseBindings.Primary, modifierKey: Enums.KeyboardBindings.Ctrl },
        { mouseButton: MouseBindings.Secondary },
        { mouseButton: MouseBindings.Wheel },
        { numTouchPoints: 3 },
      ],
    });

    releaseTool(toolGroup, 'Length');

    expect(toolGroup.getActivePrimaryMouseButtonTool()).toBeUndefined();
    expect(toolGroup.getToolOptions('Length')).toEqual({
      mode: ToolModes.Active,
      bindings: [
        { mouseButton: MouseBindings.Secondary },
        { mouseButton: MouseBindings.Wheel },
        { numTouchPoints: 3 },
      ],
    });
  });

  it('disables crosshairs and invokes their cleanup when configured to disable on passive', () => {
    toolGroup.setToolActive('Crosshairs', { bindings: [{ mouseButton: MouseBindings.Primary }] });

    releaseTool(toolGroup, 'Crosshairs');

    expect(toolGroup.getToolOptions('Crosshairs')).toEqual({
      mode: ToolModes.Disabled,
      bindings: [],
    });
    expect(toolGroup.getToolInstance('Crosshairs').onSetToolDisabled).toHaveBeenCalledTimes(1);
    expect(toolGroup.getActivePrimaryMouseButtonTool()).toBeUndefined();
  });

  it('cancels all enabled viewports and skips viewports that have been removed', () => {
    const otherElement = document.createElement('div');
    toolGroup.viewportsInfo.push(
      { viewportId: 'viewport-2', renderingEngineId: 'engine-1' },
      { viewportId: 'removed', renderingEngineId: 'engine-1' }
    );
    (getEnabledElementByIds as jest.Mock).mockImplementation(viewportId =>
      viewportId === 'removed'
        ? undefined
        : { viewport: { element: viewportId === 'viewport-1' ? element : otherElement } }
    );
    toolGroup.setToolActive('Length', { bindings: [{ mouseButton: MouseBindings.Primary }] });

    releaseTool(toolGroup, 'Length');

    expect(cancelActiveManipulations).toHaveBeenCalledTimes(2);
    expect(cancelActiveManipulations).toHaveBeenNthCalledWith(1, element);
    expect(cancelActiveManipulations).toHaveBeenNthCalledWith(2, otherElement);
  });

  it('cancels the drawing viewport before another viewport sharing its annotation', () => {
    const drawingElement = document.createElement('div');
    toolGroup.viewportsInfo.push({ viewportId: 'viewport-2', renderingEngineId: 'engine-1' });
    (getEnabledElementByIds as jest.Mock).mockImplementation(viewportId => ({
      viewport: { element: viewportId === 'viewport-2' ? drawingElement : element },
    }));
    toolGroup.setToolActive('Length', { bindings: [{ mouseButton: MouseBindings.Primary }] });
    // Cornerstone shares one tool instance across the viewports. Its first
    // cancellation consumes drawing state and must receive the drawing element.
    (cancelActiveManipulations as jest.Mock).mockImplementationOnce(viewportElement => {
      expect(viewportElement).toBe(drawingElement);
      expect(toolGroup.getActivePrimaryMouseButtonTool()).toBe('Length');
      return 'unfinished-measurement';
    });

    releaseTool(toolGroup, 'Length', 'viewport-2');

    expect(cancelActiveManipulations).toHaveBeenNthCalledWith(1, drawingElement);
    expect(cancelActiveManipulations).toHaveBeenNthCalledWith(2, element);
    expect(toolGroup.getActivePrimaryMouseButtonTool()).toBeUndefined();
    expect(toolGroup.getViewportIds()).toEqual(['viewport-1', 'viewport-2']);
  });

  it('keeps another primary tool cursor when releasing a non-primary tool', () => {
    toolGroup.setToolActive('Length', { bindings: [{ mouseButton: MouseBindings.Primary }] });
    toolGroup.setToolActive('StackScroll', { bindings: [{ mouseButton: MouseBindings.Wheel }] });
    (initElementCursor as jest.Mock).mockClear();

    releaseTool(toolGroup, 'StackScroll');

    expect(toolGroup.getActivePrimaryMouseButtonTool()).toBe('Length');
    expect(initElementCursor).not.toHaveBeenCalled();
  });

  it('ignores unavailable tools', () => {
    releaseTool(toolGroup, 'UnavailableTool');

    expect(cancelActiveManipulations).not.toHaveBeenCalled();
    expect(initElementCursor).not.toHaveBeenCalled();
  });
});
