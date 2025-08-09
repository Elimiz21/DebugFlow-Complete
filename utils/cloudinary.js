import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import path from 'path';

// Configure Cloudinary
if (process.env.CLOUDINARY_URL) {
  // CLOUDINARY_URL format: cloudinary://api_key:api_secret@cloud_name
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
} else if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// Check if Cloudinary is configured
export const isCloudinaryConfigured = () => {
  return !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
};

// Create Cloudinary storage for multer
const createCloudinaryStorage = () => {
  if (!isCloudinaryConfigured()) {
    return null;
  }

  return new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
      // Extract project ID from request
      const projectId = req.body.projectId || req.params.projectId || 'default';
      const fileExt = path.extname(file.originalname).substring(1);
      
      return {
        folder: `debugflow/projects/${projectId}`,
        format: fileExt || 'txt',
        public_id: `${Date.now()}-${file.originalname.replace(/\.[^/.]+$/, '')}`,
        resource_type: 'raw', // Store as raw files, not images
      };
    },
  });
};

// Cloudinary helper functions
export const cloudinaryHelpers = {
  // Upload file to Cloudinary
  async uploadFile(filePath, options = {}) {
    if (!isCloudinaryConfigured()) {
      throw new Error('Cloudinary is not configured');
    }

    try {
      const result = await cloudinary.uploader.upload(filePath, {
        resource_type: 'raw',
        folder: options.folder || 'debugflow/files',
        public_id: options.publicId,
        ...options
      });
      
      return {
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        size: result.bytes,
        createdAt: result.created_at
      };
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw error;
    }
  },

  // Upload text content as file
  async uploadText(content, filename, options = {}) {
    if (!isCloudinaryConfigured()) {
      throw new Error('Cloudinary is not configured');
    }

    try {
      // Convert text to base64 data URI
      const base64Content = Buffer.from(content).toString('base64');
      const dataUri = `data:text/plain;base64,${base64Content}`;
      
      const result = await cloudinary.uploader.upload(dataUri, {
        resource_type: 'raw',
        folder: options.folder || 'debugflow/files',
        public_id: options.publicId || filename.replace(/\.[^/.]+$/, ''),
        format: path.extname(filename).substring(1) || 'txt',
        ...options
      });
      
      return {
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        size: result.bytes,
        createdAt: result.created_at
      };
    } catch (error) {
      console.error('Cloudinary text upload error:', error);
      throw error;
    }
  },

  // Get file URL from public ID
  getFileUrl(publicId, options = {}) {
    if (!isCloudinaryConfigured()) {
      return null;
    }

    return cloudinary.url(publicId, {
      resource_type: 'raw',
      secure: true,
      ...options
    });
  },

  // Delete file from Cloudinary
  async deleteFile(publicId) {
    if (!isCloudinaryConfigured()) {
      throw new Error('Cloudinary is not configured');
    }

    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: 'raw'
      });
      return result.result === 'ok';
    } catch (error) {
      console.error('Cloudinary delete error:', error);
      throw error;
    }
  },

  // Delete multiple files
  async deleteFiles(publicIds) {
    if (!isCloudinaryConfigured()) {
      throw new Error('Cloudinary is not configured');
    }

    try {
      const results = await Promise.all(
        publicIds.map(publicId => this.deleteFile(publicId))
      );
      return results.every(result => result === true);
    } catch (error) {
      console.error('Cloudinary bulk delete error:', error);
      throw error;
    }
  },

  // List files in a folder
  async listFiles(folder, options = {}) {
    if (!isCloudinaryConfigured()) {
      throw new Error('Cloudinary is not configured');
    }

    try {
      const result = await cloudinary.api.resources({
        type: 'upload',
        resource_type: 'raw',
        prefix: folder,
        max_results: options.maxResults || 100,
        ...options
      });
      
      return result.resources.map(resource => ({
        publicId: resource.public_id,
        url: resource.secure_url,
        format: resource.format,
        size: resource.bytes,
        createdAt: resource.created_at
      }));
    } catch (error) {
      console.error('Cloudinary list files error:', error);
      throw error;
    }
  },

  // Create a folder
  async createFolder(folderPath) {
    if (!isCloudinaryConfigured()) {
      throw new Error('Cloudinary is not configured');
    }

    try {
      // Cloudinary creates folders automatically when uploading files
      // This is a placeholder function for consistency
      return { success: true, folder: folderPath };
    } catch (error) {
      console.error('Cloudinary create folder error:', error);
      throw error;
    }
  }
};

// Create multer upload middleware
export const createCloudinaryUploader = (options = {}) => {
  const storage = createCloudinaryStorage();
  
  if (!storage) {
    // Fallback to memory storage if Cloudinary is not configured
    console.warn('Cloudinary not configured, using memory storage');
    return multer({ 
      storage: multer.memoryStorage(),
      limits: {
        fileSize: options.maxFileSize || 10 * 1024 * 1024, // 10MB default
      },
      ...options
    });
  }

  return multer({ 
    storage,
    limits: {
      fileSize: options.maxFileSize || 10 * 1024 * 1024, // 10MB default
    },
    ...options
  });
};

// Export configured cloudinary instance
export { cloudinary };

// Export default helpers
export default cloudinaryHelpers;