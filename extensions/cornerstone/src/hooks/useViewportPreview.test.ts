import { act, renderHook } from '@testing-library/react';
import { useViewportPreview } from './useViewportPreview';
import { useViewportPreviewStore } from '../stores/useViewportPreviewStore';

describe('viewport display preview', () => {
  const original = { windowWidth: 400, windowCenter: 40 };
  const preset = { windowWidth: 1500, windowCenter: -600 };

  beforeEach(() => {
    localStorage.clear();
    useViewportPreviewStore.setState({ enabled: true });
  });

  it('starts enabled and restores the actual display settings after a hover', () => {
    const apply = jest.fn();
    const { result, rerender } = renderHook(
      ({ value }) => useViewportPreview('viewport:series', value, apply),
      { initialProps: { value: original } }
    );

    expect(result.current.showPreview).toBe(true);
    act(() => result.current.preview(preset));
    expect(apply).toHaveBeenLastCalledWith(preset);
    rerender({ value: preset });
    act(() => result.current.restorePreview());
    expect(apply).toHaveBeenLastCalledWith(original);
  });

  it('restores a hover when its menu is dismissed, but retains a clicked preset', () => {
    const apply = jest.fn();
    const hovered = renderHook(() => useViewportPreview('viewport:series', original, apply));
    act(() => hovered.result.current.preview(preset));
    hovered.unmount();
    expect(apply).toHaveBeenLastCalledWith(original);

    apply.mockClear();
    const clicked = renderHook(() => useViewportPreview('viewport:series', original, apply));
    act(() => clicked.result.current.preview(preset));
    act(() => clicked.result.current.commit(preset));
    clicked.unmount();
    expect(apply.mock.calls).toEqual([[preset], [preset]]);
  });

  it('remembers explicit opt-out across menu remounts and browser storage rehydration', async () => {
    const apply = jest.fn();
    const first = renderHook(() => useViewportPreview('viewport:series', original, apply));
    act(() => first.result.current.setShowPreview(false));
    first.unmount();

    await act(async () => {
      await useViewportPreviewStore.persist.rehydrate();
    });
    const reopened = renderHook(() => useViewportPreview('viewport:series', original, apply));
    expect(reopened.result.current.showPreview).toBe(false);
    act(() => reopened.result.current.preview(preset));
    expect(apply).not.toHaveBeenCalled();
    act(() => reopened.result.current.commit(preset));
    expect(apply).toHaveBeenLastCalledWith(preset);
  });

  it('restores a preview immediately when it is turned off', () => {
    const apply = jest.fn();
    const { result } = renderHook(() => useViewportPreview('viewport:series', original, apply));
    act(() => result.current.preview(preset));
    act(() => result.current.setShowPreview(false));
    expect(result.current.showPreview).toBe(false);
    expect(apply).toHaveBeenLastCalledWith(original);
  });

  it('restores the old series without applying its baseline to the new series', () => {
    const applyFirst = jest.fn();
    const applySecond = jest.fn();
    const secondValue = { windowWidth: 80, windowCenter: 20 };
    const { result, rerender } = renderHook(
      ({ key, value, apply }) => useViewportPreview(key, value, apply),
      { initialProps: { key: 'first', value: original, apply: applyFirst } }
    );
    act(() => result.current.preview(preset));
    rerender({ key: 'second', value: secondValue, apply: applySecond });
    expect(applyFirst).toHaveBeenLastCalledWith(original);
    expect(applySecond).not.toHaveBeenCalled();
    act(() => result.current.preview(preset));
    act(() => result.current.restorePreview());
    expect(applySecond).toHaveBeenLastCalledWith(secondValue);
  });
});
