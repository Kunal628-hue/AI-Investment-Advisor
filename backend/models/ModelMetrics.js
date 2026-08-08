const mongoose = require('mongoose');

const modelMetricsSchema = new mongoose.Schema({
  type: { type: String, enum: ['sentiment_drift', 'optimization_run', 'latency'], required: true },
  metricValue: { type: Number, required: true },
  threshold: { type: Number, default: 0.15 },
  flagged: { type: Boolean, default: false },
  details: { type: Object, default: {} },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ModelMetrics', modelMetricsSchema);
