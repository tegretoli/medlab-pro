const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_SECRET,
});

// Storage per dokumente mjekesore
const storageDoc = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'medlab/dokumente',
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'],
    resource_type: 'auto',
  },
});

// Storage per foto profilesh
const storageFoto = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'medlab/profile',
    allowed_formats: ['jpg', 'jpeg', 'png'],
    transformation: [{ width: 400, height: 400, crop: 'fill' }],
  },
});

const uploadDok  = multer({ storage: storageDoc,  limits: { fileSize: 10 * 1024 * 1024 } });
const uploadFoto = multer({ storage: storageFoto, limits: { fileSize: 5 * 1024 * 1024 } });

module.exports = { cloudinary, uploadDok, uploadFoto };
