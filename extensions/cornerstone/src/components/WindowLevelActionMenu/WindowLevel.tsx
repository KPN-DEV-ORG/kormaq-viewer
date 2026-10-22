import React, { ReactElement, useEffect, useId, useMemo, useState } from 'react';
import {
  AllInOneMenu,
  Button,
  ScrollArea,
  Switch,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@ohif/ui-next';
import { useViewportRendering } from '../../hooks/useViewportRendering';
import { WindowLevelPreset } from '../../types/WindowLevel';
import { useTranslation } from 'react-i18next';
import { resetWindowLevelPresets, saveWindowLevelPresets } from '../../utils/windowLevelPresets';
import WindowLevelPresetEditor from './WindowLevelPresetEditor';
import { useViewportPreview } from '../../hooks/useViewportPreview';

function formatIntensity(value: number): string {
  return String(Number(value.toPrecision(6)));
}

type MRSeriesMetadata = {
  SeriesDescription?: string;
  ProtocolName?: string;
  ImageType?: string | string[];
};

const MR_SEQUENCE_TYPES = [
  {
    id: 't1-post-contrast',
    label: 'T1 post-contrast',
    pattern:
      /\bT1W?\b.*(?:POST|POST.?CONTRAST|GAD|GADO|CONTRAST|\bCE\b)|(?:POST|GAD|GADO|CONTRAST|\bCE\b).*\bT1W?\b/i,
  },
  { id: 'flair', label: 'FLAIR', pattern: /\bFLAIR\b/i },
  { id: 'adc', label: 'ADC', pattern: /\bADC\b|APPARENT DIFFUSION/i },
  { id: 'dwi', label: 'DWI', pattern: /\bDWI\b|DIFFUSION|\bTRACE\b/i },
  { id: 'stir', label: 'STIR', pattern: /\bSTIR\b/i },
  { id: 'swi', label: 'GRE / SWI', pattern: /\bSWI\b|SUSCEPTIBILITY|\bGRE\b|T2.?STAR/i },
  { id: 'tof', label: 'TOF MRA', pattern: /\bTOF\b|TIME.?OF.?FLIGHT|\bMRA\b|ANGIO/i },
  { id: 't2', label: 'T2-weighted', pattern: /\bT2W?\b/i },
  { id: 't1', label: 'T1-weighted', pattern: /\bT1W?\b/i },
];

const MR_ANATOMY_TYPES = [
  { label: 'Brain', pattern: /\bBRAIN\b|\bHEAD\b|NEURO|CRANIAL/i },
  {
    label: 'Spine',
    pattern: /SPINE|\bC.?SPINE\b|\bT.?SPINE\b|\bL.?SPINE\b|CERVICAL|THORACIC|LUMBAR/i,
  },
  { label: 'Abdomen / liver', pattern: /ABDOMEN|\bLIVER\b|HEPATIC/i },
  { label: 'Neck', pattern: /\bNECK\b/i },
  { label: 'MSK / bone', pattern: /\bBONE\b|\bMSK\b|KNEE|SHOULDER|HIP|ANKLE|WRIST/i },
  { label: 'Breast', pattern: /\bBREAST\b/i },
  { label: 'Pelvis', pattern: /\bPELVIS\b/i },
];

function getMRPresets(
  range?: { lower: number; upper: number },
  metadata?: MRSeriesMetadata
): WindowLevelPreset[] {
  if (!range || !Number.isFinite(range.lower) || !Number.isFinite(range.upper)) {
    return [];
  }

  const sourceWidth = range.upper - range.lower;
  if (!Number.isFinite(sourceWidth) || sourceWidth <= 0) {
    return [];
  }

  const sourceCenter = (range.upper + range.lower) / 2;
  const metadataText = [metadata?.SeriesDescription, metadata?.ProtocolName, metadata?.ImageType]
    .flatMap(value => (Array.isArray(value) ? value : [value]))
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const anatomy = MR_ANATOMY_TYPES.find(({ pattern }) => pattern.test(metadataText))?.label;
  let sequenceTypes = MR_SEQUENCE_TYPES.filter(({ pattern }) => pattern.test(metadataText));

  // Prefer the more specific names when a series description includes a broad
  // sequence term as well (for example, FLAIR is also a T2-weighted sequence).
  if (sequenceTypes.some(({ id }) => id === 't1-post-contrast')) {
    sequenceTypes = sequenceTypes.filter(({ id }) => id !== 't1');
  }
  if (sequenceTypes.some(({ id }) => id === 'flair')) {
    sequenceTypes = sequenceTypes.filter(({ id }) => id !== 't2');
  }
  if (sequenceTypes.some(({ id }) => id === 'adc')) {
    sequenceTypes = sequenceTypes.filter(({ id }) => id !== 'dwi');
  }

  const toPreset = (
    id: string,
    description: string,
    details: string,
    width: number,
    center: number
  ): WindowLevelPreset => ({
    id,
    description,
    details,
    window: formatIntensity(width),
    level: formatIntensity(center),
  });

  const presets = [
    toPreset(
      'mr-loaded-range',
      'Loaded MR range',
      'Restores the display range initially loaded for this series.',
      sourceWidth,
      sourceCenter
    ),
  ];
  const profileVariants = [
    { id: 'anatomy', label: 'anatomy', widthScale: 0.75 },
    { id: 'detail', label: 'subtle detail', widthScale: 0.45 },
    { id: 'broad', label: 'broad tissue', widthScale: 1.2 },
  ];
  const profileTypes = sequenceTypes.length
    ? sequenceTypes
    : [{ id: 'series', label: anatomy ? `${anatomy} MR` : 'MR series' }];

  profileTypes.forEach(sequence => {
    const title =
      anatomy && sequence.id !== 'series' ? `${anatomy} · ${sequence.label}` : sequence.label;
    const sequenceContext =
      sequence.id === 'series'
        ? 'No standard sequence label was found in the series metadata.'
        : `${sequence.label} was identified from the series metadata.`;

    profileVariants.forEach(variant => {
      presets.push(
        toPreset(
          `mr-${sequence.id}-${variant.id}`,
          `${title} · ${variant.label}`,
          `${sequenceContext} This display profile is scaled to this series’ intensity range; it does not change the acquired sequence.`,
          sourceWidth * variant.widthScale,
          sourceCenter
        )
      );
    });
  });

  return presets;
}

export function WindowLevel({ viewportId }: { viewportId?: string } = {}): ReactElement {
  const { t } = useTranslation('WindowLevelActionMenu');
  const { viewportDisplaySets } = useViewportRendering(viewportId);
  const [activeDisplaySetUID, setActiveDisplaySetUID] = useState<string | undefined>(
    viewportDisplaySets?.[0]?.displaySetInstanceUID
  );
  const activeUID = activeDisplaySetUID || viewportDisplaySets?.[0]?.displaySetInstanceUID;

  const { windowLevelPresets, setWindowLevel, initialVOIRange, windowLevel } = useViewportRendering(
    viewportId,
    {
      displaySetInstanceUID: activeUID,
    }
  );

  const activeDisplaySet = viewportDisplaySets?.find(
    displaySet => displaySet.displaySetInstanceUID === activeUID
  );
  const modality = activeDisplaySet?.Modality || '';
  const mrRange =
    initialVOIRange?.displaySetInstanceUID === activeUID ? initialVOIRange : undefined;
  const mrRangeLower = mrRange?.lower;
  const mrRangeUpper = mrRange?.upper;
  const seriesDescription = activeDisplaySet?.SeriesDescription;
  const protocolName = activeDisplaySet?.ProtocolName;
  const imageType = activeDisplaySet?.ImageType;
  const mrPresets = useMemo(
    () =>
      modality === 'MR'
        ? getMRPresets(
            mrRangeLower !== undefined && mrRangeUpper !== undefined
              ? { lower: mrRangeLower, upper: mrRangeUpper }
              : undefined,
            {
              SeriesDescription: seriesDescription,
              ProtocolName: protocolName,
              ImageType: imageType,
            }
          )
        : [],
    [modality, mrRangeLower, mrRangeUpper, seriesDescription, protocolName, imageType]
  );
  const presets = windowLevelPresets.length
    ? windowLevelPresets
    : modality === 'MR'
      ? mrPresets
      : windowLevelPresets;

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const previewId = useId();
  const { showPreview, setShowPreview, preview, commit, restorePreview } = useViewportPreview(
    `${viewportId}:${activeUID}`,
    Number.isFinite(windowLevel?.windowWidth) && Number.isFinite(windowLevel?.windowCenter)
      ? windowLevel
      : undefined,
    value => setWindowLevel({ ...value, immediate: true })
  );

  useEffect(() => {
    if (!viewportDisplaySets?.length) {
      return;
    }

    setActiveDisplaySetUID(currentUID =>
      viewportDisplaySets.some(displaySet => displaySet.displaySetInstanceUID === currentUID)
        ? currentUID
        : viewportDisplaySets[0].displaySetInstanceUID
    );
  }, [viewportDisplaySets]);

  return (
    <>
      {viewportDisplaySets && viewportDisplaySets.length > 1 && (
        <div className="flex h-8 w-full flex-shrink-0 items-center justify-center px-2 text-base">
          <Tabs
            value={activeUID}
            onValueChange={displaySetUID => setActiveDisplaySetUID(displaySetUID)}
          >
            <TabsList>
              {viewportDisplaySets.map(ds => (
                <TabsTrigger
                  key={ds.displaySetInstanceUID}
                  value={ds.displaySetInstanceUID}
                >
                  {ds.Modality}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      )}

      <label
        htmlFor={previewId}
        className="hover:bg-accent flex h-8 w-full flex-shrink-0 cursor-pointer items-center px-2 text-base hover:rounded"
      >
        <span className="flex-shrink-0">{t('Preview in viewport')}</span>
        <Switch
          id={previewId}
          className="ml-auto flex-shrink-0"
          checked={showPreview}
          onCheckedChange={setShowPreview}
        />
      </label>

      <AllInOneMenu.DividerItem />

      <div
        className="flex min-h-[160px] flex-none flex-col"
        style={{ height: 'min(560px, calc(100dvh - 280px))' }}
      >
        <div className="min-h-0 flex-1">
          <ScrollArea className="h-full w-full">
            <div className="p-1">
              {modality === 'MR' && presets.length > 0 && (
                <p className="text-muted-foreground px-2 pb-1 text-xs">
                  {t('MR intensity units note')}
                </p>
              )}
              {presets.map((preset, index) => (
                <AllInOneMenu.Item
                  key={preset.id || `${preset.description}-${index}`}
                  label={t(preset.description)}
                  secondaryLabel={`${preset.window} / ${preset.level}`}
                  description={preset.details}
                  useIconSpace={false}
                  onClick={() => {
                    commit({
                      windowWidth: Number(preset.window),
                      windowCenter: Number(preset.level),
                    });
                  }}
                  onMouseEnter={() => {
                    preview({
                      windowWidth: Number(preset.window),
                      windowCenter: Number(preset.level),
                    });
                  }}
                  onMouseLeave={restorePreview}
                />
              ))}
              {modality === 'MR' && !presets.length && (
                <p className="text-muted-foreground p-2 text-sm">
                  {t('MR intensity range unavailable')}
                </p>
              )}
            </div>
          </ScrollArea>
        </div>

        {modality && (
          <div className="border-t border-white/10 p-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => setIsEditorOpen(true)}
            >
              {t('Edit modality presets', { modality })}
            </Button>
          </div>
        )}
      </div>

      <WindowLevelPresetEditor
        open={isEditorOpen}
        modality={modality}
        seriesUID={activeDisplaySet?.SeriesInstanceUID}
        presets={presets}
        onOpenChange={setIsEditorOpen}
        onSave={nextPresets =>
          saveWindowLevelPresets(modality, nextPresets, activeDisplaySet?.SeriesInstanceUID)
        }
        onReset={() => resetWindowLevelPresets(modality, activeDisplaySet?.SeriesInstanceUID)}
      />
    </>
  );
}
