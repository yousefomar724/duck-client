import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { useToast } from '@/lib/stores/toast-store';

describe('toast store', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useToast.setState({ toasts: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('adds and auto-removes toast', () => {
    useToast.getState().addToast('Hello', 'success', 1000);
    expect(useToast.getState().toasts).toHaveLength(1);

    vi.advanceTimersByTime(1000);
    expect(useToast.getState().toasts).toHaveLength(0);
  });

  it('removes toast manually', () => {
    useToast.getState().addToast('Hello', 'info', 0);
    const id = useToast.getState().toasts[0].id;
    useToast.getState().removeToast(id);
    expect(useToast.getState().toasts).toHaveLength(0);
  });
});
