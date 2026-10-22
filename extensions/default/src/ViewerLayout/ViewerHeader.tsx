import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { Header, Icons } from '@ohif/ui-next';
import { useSystem } from '@ohif/core';
import { Toolbar } from '../Toolbar/Toolbar';
import { preserveQueryParameters } from '@ohif/app';
import ToolbarPanelButtons from './ToolbarPanelButtons';

function ViewerHeader({
  appConfig,
  rightPanelsOnToolbar = false,
  activeToolbarPanelId,
  onToolbarPanelSelect,
}: withAppTypes<{
  appConfig: AppTypes.Config;
  rightPanelsOnToolbar?: boolean;
  activeToolbarPanelId?: string;
  onToolbarPanelSelect?: (panel) => void;
}>) {
  const { servicesManager, extensionManager } = useSystem();
  const { panelService } = servicesManager.services;

  const navigate = useNavigate();
  const location = useLocation();

  const onClickReturnButton = () => {
    const { pathname } = location;
    const dataSourceIdx = pathname.indexOf('/', 1);

    const dataSourceName = pathname.substring(dataSourceIdx + 1);
    const existingDataSource = extensionManager.getDataSources(dataSourceName);

    const searchQuery = new URLSearchParams();
    if (dataSourceIdx !== -1 && existingDataSource) {
      searchQuery.append('datasources', pathname.substring(dataSourceIdx + 1));
    }
    preserveQueryParameters(searchQuery);

    navigate({
      pathname: '/',
      search: decodeURIComponent(searchQuery.toString()),
    });
  };

  const { t } = useTranslation();

  const showMobileStudyReports = () => {
    const reportsPanel = panelService
      .getPanels(panelService.PanelPosition.Right)
      .find(panel => panel.name === 'studyReports');

    if (reportsPanel) {
      onToolbarPanelSelect?.(reportsPanel);
    }
  };

  return (
    <Header
      menuOptions={[]}
      showSettings={false}
      isReturnEnabled={!!appConfig.showStudyList}
      onClickReturnButton={onClickReturnButton}
      WhiteLabeling={appConfig.whiteLabeling}
      Secondary={<Toolbar buttonSection="secondary" />}
    >
      <div className="relative flex w-max shrink-0 items-center gap-1 md:gap-2">
        {rightPanelsOnToolbar && onToolbarPanelSelect && (
          <button
            type="button"
            className="viewer-layout__mobile-report-action"
            onClick={showMobileStudyReports}
            aria-label={t('SidePanel:Reports', 'Reports')}
            data-cy="mobile-study-reports-button"
          >
            <Icons.Clipboard className="h-4 w-4" />
            <span>{t('SidePanel:Reports', 'Reports')}</span>
          </button>
        )}
        <div className="flex min-w-max shrink-0 items-center gap-0.5 md:gap-1">
          <Toolbar buttonSection="primary" />
        </div>
        {rightPanelsOnToolbar && onToolbarPanelSelect && (
          <ToolbarPanelButtons
            servicesManager={servicesManager}
            activePanelId={activeToolbarPanelId}
            onPanelSelect={onToolbarPanelSelect}
          />
        )}
      </div>
    </Header>
  );
}

export default ViewerHeader;
