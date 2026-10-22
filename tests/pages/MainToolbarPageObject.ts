import { Page } from '@playwright/test';

export class MainToolbarPageObject {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  get crosshairs() {
    const button = this.page.getByTestId('Crosshairs');
    return {
      button,
      async click() {
        await button.click();
      },
    };
  }
  get layoutSelection() {
    const page = this.page;

    const button = page.getByTestId('Layout');
    const layoutSelection = {
      button,
      async click() {
        await button.click();
      },
    };

    return {
      ...layoutSelection,
      get axialPrimary() {
        const button = page.getByTestId('Axial Primary');
        return {
          button,
          async click() {
            await layoutSelection.click();
            await button.click();
          },
        };
      },
      get MPR() {
        const button = page.getByTestId('MPR');
        return {
          button,
          async click() {
            await layoutSelection.click();
            await button.click();
          },
        };
      },
      get MIPAndMPR() {
        const button = page.getByTestId('MIP + MPR');
        return {
          button,
          async click() {
            await layoutSelection.click();
            await button.click();
          },
        };
      },
      get threeDFourUp() {
        const button = page.getByTestId('3D four up');
        return {
          button,
          async click() {
            await layoutSelection.click();
            await button.click();
          },
        };
      },
      get threeDMain() {
        const button = page.getByTestId('3D main');
        return {
          button,
          async click() {
            await layoutSelection.click();
            await button.click();
          },
        };
      },
      get threeDOnly() {
        const button = page.getByTestId('3D only');
        return {
          button,
          async click() {
            await layoutSelection.click();
            await button.click();
          },
        };
      },
      get threeDPrimary() {
        const button = page.getByTestId('3D primary');
        return {
          button,
          async click() {
            await layoutSelection.click();
            await button.click();
          },
        };
      },
    };
  }

  get measurementTools() {
    const page = this.page;

    const button = page.getByTestId('MeasurementTools-split-button-secondary');
    const measurementTools = {
      button,
      async click() {
        await button.click();
      },
    };

    return {
      ...measurementTools,
      get selectedTool() {
        const button = page.getByTestId('MeasurementTools-split-button-primary');
        return {
          button,
          async click() {
            await button.click();
          },
        };
      },
      get arrowAnnotate() {
        const button = page.getByTestId('ArrowAnnotate');
        return {
          button,
          async click() {
            await measurementTools.click();
            await button.click();
          },
        };
      },
      get bidirectional() {
        const button = page.getByTestId('Bidirectional');
        return {
          button,
          async click() {
            await measurementTools.click();
            await button.click();
          },
        };
      },
      get circleROI() {
        const button = page.getByTestId('CircleROI');
        return {
          button,
          async click() {
            await measurementTools.click();
            await button.click();
          },
        };
      },
      get ellipticalROI() {
        const button = page.getByTestId('EllipticalROI');
        return {
          button,
          async click() {
            await measurementTools.click();
            await button.click();
          },
        };
      },
      get length() {
        const button = page.locator('[data-cy="Length"][role="menuitem"]');
        return {
          button,
          async click() {
            await measurementTools.click();
            await button.click();
          },
        };
      },
      get livewireContour() {
        const button = page.getByTestId('LivewireContour');
        return {
          button,
          async click() {
            await measurementTools.click();
            await button.click();
          },
        };
      },
      get rectangleROI() {
        const button = page.getByTestId('RectangleROI');
        return {
          button,
          async click() {
            await measurementTools.click();
            await button.click();
          },
        };
      },
      get splineROI() {
        const button = page.getByTestId('SplineROI');
        return {
          button,
          async click() {
            await measurementTools.click();
            await button.click();
          },
        };
      },
    };
  }

  get moreTools() {
    const page = this.page;

    const button = page.getByTestId('MoreTools-split-button-secondary');
    const moreTools = {
      button,
      async click() {
        await button.click();
      },
    };

    const toolAction = (id: string, groupedSection = 'MoreTools') => {
      const button = page.getByTestId(id);

      return {
        button,
        async click() {
          if (await button.isVisible()) {
            await button.click();
            return;
          }

          // Basic and longitudinal use labeled groups; the independent test mode
          // keeps these actions in its original MoreTools menu.
          const isGroupedToolbar = await page.getByTestId('toolbar-group-ImageToolsGroup').count();
          const section = isGroupedToolbar ? groupedSection : 'MoreTools';
          await page.getByTestId(`${section}-split-button-secondary`).click();
          await button.click();
        },
      };
    };

    return {
      ...moreTools,
      get angle() {
        return toolAction('Angle', 'MeasurementTools');
      },
      get cobbAngle() {
        return toolAction('CobbAngle', 'MeasurementTools');
      },
      get flipHorizontal() {
        return toolAction('flipHorizontal');
      },
      get invert() {
        return toolAction('invert');
      },
      get probe() {
        return toolAction('Probe');
      },
      get reset() {
        return toolAction('Reset');
      },
      get rotateRight() {
        return toolAction('rotate-right');
      },
      get tagBrowser() {
        return toolAction('TagBrowser', 'ImageTools');
      },
    };
  }

  get panTool() {
    const button = this.page.getByTestId('Pan');
    return {
      button,
      async click() {
        await button.click();
      },
    };
  }
}
