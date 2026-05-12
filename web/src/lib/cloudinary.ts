import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadToCloudinary = async (base64Image: string, folder: string = "fintrack/profiles") => {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error("Cloudinary credentials missing");
    throw new Error("Cloudinary configuration missing on server");
  }

  try {
    // Check if the string is already a URL
    if (base64Image.startsWith('http')) {
      return base64Image;
    }

    const result = await cloudinary.uploader.upload(base64Image, {
      folder: folder,
      resource_type: "auto",
    });
    return result.secure_url;
  } catch (error: any) {
    console.error("Cloudinary upload error details:", error);
    throw new Error(error.message || "Failed to upload image to Cloudinary");
  }
};

export default cloudinary;
