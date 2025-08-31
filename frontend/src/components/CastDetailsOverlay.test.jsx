import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CastDetailsOverlay from './CastDetailsOverlay';

// Mock the TMDB service
jest.mock('../services/tmdbService', () => ({
  getPersonDetails: jest.fn(() => Promise.resolve({
    id: 1,
    name: 'Test Actor',
    biography: 'Test biography',
    birthday: '1990-01-01',
    place_of_birth: 'Test City',
    profile_path: '/test-image.jpg',
    known_for_department: 'Acting',
    popularity: 8.5,
    combined_credits: {
      cast: [
        {
          id: 1,
          title: 'Test Movie',
          character: 'Test Character',
          media_type: 'movie',
          poster_path: '/test-poster.jpg',
          release_date: '2020-01-01',
          vote_average: 7.5
        }
      ],
      crew: []
    },
    images: {
      profiles: [
        {
          file_path: '/test-profile.jpg',
          width: 300,
          height: 450
        }
      ]
    },
    external_ids: {
      imdb_id: 'nm123456',
      facebook_id: 'test.facebook',
      instagram_id: 'test.instagram',
      twitter_id: 'test.twitter'
    }
  }))
}));

describe('CastDetailsOverlay', () => {
  const mockPerson = {
    id: 1,
    name: 'Test Actor',
    character: 'Test Character',
    image: '/test-image.jpg'
  };

  const mockOnClose = jest.fn();
  const mockOnMovieSelect = jest.fn();
  const mockOnSeriesSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    render(
      <CastDetailsOverlay
        person={mockPerson}
        onClose={mockOnClose}
        onMovieSelect={mockOnMovieSelect}
        onSeriesSelect={mockOnSeriesSelect}
      />
    );

    expect(screen.getByText(/Loading Test Actor details/)).toBeInTheDocument();
  });

  it('renders person details after loading', async () => {
    render(
      <CastDetailsOverlay
        person={mockPerson}
        onClose={mockOnClose}
        onMovieSelect={mockOnMovieSelect}
        onSeriesSelect={mockOnSeriesSelect}
      />
    );

    // Wait for the person details to load
    const personName = await screen.findByText('Test Actor');
    expect(personName).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    render(
      <CastDetailsOverlay
        person={mockPerson}
        onClose={mockOnClose}
        onMovieSelect={mockOnMovieSelect}
        onSeriesSelect={mockOnSeriesSelect}
      />
    );

    // Wait for the component to load
    await screen.findByText('Test Actor');

    // Find and click the close button
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('displays biography when available', async () => {
    render(
      <CastDetailsOverlay
        person={mockPerson}
        onClose={mockOnClose}
        onMovieSelect={mockOnMovieSelect}
        onSeriesSelect={mockOnSeriesSelect}
      />
    );

    // Wait for the component to load
    await screen.findByText('Test Actor');

    // Check if biography is displayed
    expect(screen.getByText('Test biography')).toBeInTheDocument();
  });

  it('displays filmography when available', async () => {
    render(
      <CastDetailsOverlay
        person={mockPerson}
        onClose={mockOnClose}
        onMovieSelect={mockOnMovieSelect}
        onSeriesSelect={mockOnSeriesSelect}
      />
    );

    // Wait for the component to load
    await screen.findByText('Test Actor');

    // Click on the filmography tab
    const filmographyTab = screen.getByText('Filmography');
    fireEvent.click(filmographyTab);

    // Check if filmography is displayed
    expect(screen.getByText('Test Movie')).toBeInTheDocument();
  });
}); 