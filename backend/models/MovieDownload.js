const mongoose = require('mongoose');

const movieDownloadSchema = new mongoose.Schema({
  movies: {
    type: Map,
    of: String,
    required: true
  }
});

module.exports = mongoose.model('MovieDownload', movieDownloadSchema); 