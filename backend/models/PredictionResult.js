const mongoose = require('mongoose');

const predictionResultSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  input: {
    type: Object,
    required: true
  },
  result: {
    type: Object,
    required: true
  },
  visualization: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const PredictionResult = mongoose.model('PredictionResult', predictionResultSchema);

module.exports = PredictionResult;