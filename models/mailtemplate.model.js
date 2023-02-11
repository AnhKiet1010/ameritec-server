const mongoose = require('mongoose');

// user schema
const mailtemplateSchema = new mongoose.Schema(
  {
    template_name: {
      type: String
    },
    subject_vn: {
      type: String
    },
    subject_en: {
      type: String
    },
    content_vn: {
      type: String
    },
    content_en: {
      type: String
    },
  }
);

module.exports = mongoose.model('mailtemplate', mailtemplateSchema);
