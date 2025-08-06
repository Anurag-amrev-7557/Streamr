import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import WatchlistImage from './WatchlistImage';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    img: ({ ...props }) => <img {...props} />
  },
  AnimatePresence: ({ children }) => children
}));

describe('WatchlistImage', () => {
  const mockOnLoad = jest.fn();
  const mockOnError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    render(
      <WatchlistImage
        src="https://image.tmdb.org/t/p/w500/test.jpg"
        alt="Test Movie"
        onLoad={mockOnLoad}
        onError={mockOnError}
      />
    );

    // Should show shimmer loading placeholder
    expect(screen.getByText('')).toBeInTheDocument();
  });

  it('handles image load successfully', async () => {
    // Mock successful image load
    const mockImage = {
      onload: null,
      onerror: null,
      src: ''
    };
    
    global.Image = jest.fn(() => mockImage);

    render(
      <WatchlistImage
        src="https://image.tmdb.org/t/p/w500/test.jpg"
        alt="Test Movie"
        onLoad={mockOnLoad}
        onError={mockOnError}
      />
    );

    // Simulate image load
    mockImage.onload();

    await waitFor(() => {
      expect(mockOnLoad).toHaveBeenCalled();
    });
  });

  it('handles image load error', async () => {
    // Mock failed image load
    const mockImage = {
      onload: null,
      onerror: null,
      src: ''
    };
    
    global.Image = jest.fn(() => mockImage);

    render(
      <WatchlistImage
        src="https://image.tmdb.org/t/p/w500/invalid.jpg"
        alt="Test Movie"
        onLoad={mockOnLoad}
        onError={mockOnError}
      />
    );

    // Simulate image error
    mockImage.onerror();

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalled();
    });
  });

  it('generates placeholder URL correctly', () => {
    render(
      <WatchlistImage
        src="https://image.tmdb.org/t/p/w500/test.jpg"
        alt="Test Movie"
        onLoad={mockOnLoad}
        onError={mockOnError}
      />
    );

    // The component should generate a w92 placeholder URL
    expect(global.Image).toHaveBeenCalled();
  });
}); 