import { afterEach, describe, expect, test } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import App from '../src/App';

afterEach(() => cleanup());

describe('smoke flows', () => {
  test('box flow + camera + autoflat controls are reachable', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Draw\/Confirm/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Push\/Pull$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Move$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Orbit$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Pan$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Zoom$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Auto-flat$/i }));
    fireEvent.click(screen.getByRole('button', { name: /Confirm Flat/i }));
    expect(screen.getByText(/Tool:/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Export STL/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Export 3MF/i })).toBeTruthy();
  });

  test('theme toggle and axis lock ui', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Toggle theme/i }));
    fireEvent.click(screen.getByRole('button', { name: 'X' }));
    expect(screen.getByText(/Axis lock/i)).toBeTruthy();
  });
});
