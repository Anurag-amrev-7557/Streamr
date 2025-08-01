const MovieDownload = require('../models/MovieDownload');

// Get download link for a movie
exports.getDownloadLink = async (req, res) => {
  try {
    const { title } = req.params;
    if (!title) {
      return res.status(400).json({ message: 'Movie title is required' });
    }

    const movieData = await MovieDownload.findOne();
    if (!movieData || !movieData.movies) {
      return res.status(404).json({ message: 'Movie data not found' });
    }

    const downloadLink = movieData.movies.get(title);
    if (!downloadLink) {
      return res.status(404).json({ message: 'Download link not found for this movie' });
    }

    res.json({ downloadLink });
  } catch (error) {
    console.error('Error fetching download link:', error);
    res.status(500).json({ message: 'Error fetching download link', error: error.message });
  }
};

// Debug endpoint to get raw data
exports.getRawData = async (req, res) => {
  try {
    const movieData = await MovieDownload.findOne();
    if (!movieData) {
      return res.status(404).json({ message: 'No movie data found' });
    }
    res.json(movieData);
  } catch (error) {
    console.error('Error fetching raw data:', error);
    res.status(500).json({ message: 'Error fetching raw data', error: error.message });
  }
}; 