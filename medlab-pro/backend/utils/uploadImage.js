const { cloudinary } = require('../config/cloudinary');

const uploadImage = async (file, folder = 'medlab') => {
  if (!file?.path) {
    throw new Error('File path mungon per upload ne Cloudinary');
  }

  const result = await cloudinary.uploader.upload(file.path, { folder });
  return result.secure_url;
};

module.exports = { uploadImage };
