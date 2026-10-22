import { getEnabledElementByIds } from '@cornerstonejs/core';
import { cancelActiveManipulations, Enums, type Types } from '@cornerstonejs/tools';

/** Release the primary interaction without removing annotations or auxiliary bindings. */
export default function releaseTool(
  toolGroup: Types.IToolGroup,
  toolName: string,
  preferredViewportId?: string
): void {
  if (!toolName || !toolGroup?.hasTool(toolName)) {
    return;
  }

  // A drawing tool can keep its own event listeners after its bindings change.
  // Cancel while it is still active so Cornerstone can find the manipulation.
  const viewports = toolGroup.getViewportsInfo();
  const preferredViewportIndex = viewports.findIndex(
    ({ viewportId }) => viewportId === preferredViewportId
  );
  if (preferredViewportIndex > 0) {
    // Tool instances share drawing state across the group. Cancel on the drawing
    // viewport before another viewport showing the same annotation clears it.
    const [preferredViewport] = viewports.splice(preferredViewportIndex, 1);
    viewports.unshift(preferredViewport);
  }

  viewports.forEach(({ viewportId, renderingEngineId }) => {
    const element = getEnabledElementByIds(viewportId, renderingEngineId)?.viewport.element;
    if (element) {
      cancelActiveManipulations(element);
    }
  });

  const configuration = toolGroup.getToolConfiguration(toolName) as {
    disableOnPassive?: boolean;
  };

  if (configuration?.disableOnPassive) {
    toolGroup.setToolDisabled(toolName);
  } else {
    // Include modifier variants such as Shift+left-click while retaining auxiliary bindings.
    const primaryBindings = toolGroup
      .getToolOptions(toolName)
      ?.bindings?.filter(binding => binding.mouseButton === Enums.MouseBindings.Primary);
    toolGroup.setToolPassive(toolName, { removeAllBindings: primaryBindings ?? [] });
  }

  if (!toolGroup.getActivePrimaryMouseButtonTool()) {
    toolGroup.setViewportsCursorByToolName('default');
  }
}
