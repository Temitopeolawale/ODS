import multer from "multer"
import {CloudinaryStorage} from "multer-storage-cloudinary"

import cloudinary from "../Utils/Cloudinary.js"

const storage = new CloudinaryStorage({
    cloudinary,
    
    params:{
        folder:"ObjectDetection",
        allowedFormats:["jpg","png","jpeg","heic"],
    }
})

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }
})
export default upload 