import React from 'react';
import { useToolbar } from '@ohif/core';

/**
 * Props for the Toolbar component that renders a collection of toolbar buttons and/or button sections.
 *
 * @interface ToolbarProps
 */
interface ToolbarProps {
  /**
   * The section of buttons to display in the toolbar.
   * Common values include 'primary', 'secondary', 'tertiary', etc.
   * Defaults to 'primary' if not specified.
   *
   * @default 'primary'
   */
  buttonSection?: string;

  /** Optional caption for a group of related toolbar controls. */
  label?: string;

  /**
   * The unique identifier of the viewport this toolbar is associated with.
   */
  viewportId?: string;

  /**
   * The numeric position or location of the toolbar.
   * Used for ordering and layout purposes in the UI.
   */
  location?: number;
}

export function Toolbar({ buttonSection = 'primary', label, viewportId, location }: ToolbarProps) {
  const {
    toolbarButtons,
    onInteraction,
    isItemOpen,
    isItemLocked,
    openItem,
    closeItem,
    toggleLock,
  } = useToolbar({
    buttonSection,
  });

  if (!toolbarButtons.length) {
    return null;
  }

  const buttons = (
    <>
      {toolbarButtons?.map(toolDef => {
        if (!toolDef) {
          return null;
        }

        const { id, Component, componentProps } = toolDef;

        // Enhanced props with state and actions - respecting viewport specificity
        const enhancedProps = {
          ...componentProps,
          isOpen: isItemOpen(id, viewportId),
          isLocked: isItemLocked(id, viewportId),
          onOpen: () => openItem(id, viewportId),
          onClose: () => {
            closeItem(id, viewportId);
          },
          onToggleLock: () => toggleLock(id, viewportId),
          viewportId,
        };

        const tool = (
          <Component
            key={id}
            id={id}
            location={location}
            onInteraction={args => {
              onInteraction({
                ...args,
                itemId: id,
                viewportId,
              });
            }}
            {...enhancedProps}
          />
        );

        return (
          <div
            key={id}
            // This wrapper div exists solely for React's key prop requirement during reconciliation.
            // We use display:contents to make it transparent to the layout engine (children appear
            // as direct children of the parent) while keeping it in the DOM for React's virtual DOM.
            className="contents"
          >
            {tool}
          </div>
        );
      })}
    </>
  );

  if (!label) {
    return buttons;
  }

  return (
    <div
      role="group"
      aria-label={label}
      data-cy={`toolbar-group-${buttonSection}`}
      className="border-border flex shrink-0 flex-col items-center border-r px-1"
    >
      <div className="flex h-8 items-center gap-0.5 [&_button]:h-8">{buttons}</div>
      <span className="text-muted-foreground select-none whitespace-nowrap text-[10px] font-medium uppercase leading-3 tracking-wide">
        {label}
      </span>
    </div>
  );
}
