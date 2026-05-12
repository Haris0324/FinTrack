import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadToCloudinary = async (base64Image: string, folder: string = "fintrack/profiles") => {
  try {
    // Check if the string is already a URL (e.g. Google/GitHub profile pic)
    if (base64Image.startsWith('http')) {
      return base64Image;
    }

    const result = await cloudinary.uploader.upload(base64Image, {
      folder: folder,
      resource_type: "auto",
    });
    return result.secure_url;
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw new Error("Failed to upload image to Cloudinary");
  }
};

export default cloudinary;
