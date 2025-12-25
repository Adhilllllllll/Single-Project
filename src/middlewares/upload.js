const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "../../uploads/avatars");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, `avatar-${req.user.id}-${uniqueSuffix}${ext}`);
    },
});

// File filter - only images
const fileFilter = (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Only JPG, PNG, GIF, and WebP images are allowed"), false);
    }
};

// Create multer upload instance
const uploadAvatar = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 2 * 1024 * 1024, // 2MB max
    },
});

// Task uploads directory
const tasksDir = path.join(__dirname, "../../uploads/tasks");
if (!fs.existsSync(tasksDir)) {
    fs.mkdirSync(tasksDir, { recursive: true });
}

// Task storage configuration
const taskStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, tasksDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, `task-${req.user.id}-${uniqueSuffix}${ext}`);
    },
});

// Task file filter - documents and images
const taskFileFilter = (req, file, cb) => {
    const allowedTypes = [
        "image/jpeg", "image/png", "image/gif", "image/webp",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "text/plain",
    ];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("File type not allowed"), false);
    }
};

// Create task upload instance
const uploadTask = multer({
    storage: taskStorage,
    fileFilter: taskFileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max
    },
});

// Materials uploads directory
const materialsDir = path.join(__dirname, "../../uploads/materials");
if (!fs.existsSync(materialsDir)) {
    fs.mkdirSync(materialsDir, { recursive: true });
}

// Materials storage configuration
const materialsStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, materialsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, `material-${req.user.id}-${uniqueSuffix}${ext}`);
    },
});

// Create materials upload instance
const uploadMaterial = multer({
    storage: materialsStorage,
    fileFilter: taskFileFilter, // Reuse same filter
    limits: {
        fileSize: 20 * 1024 * 1024, // 20MB max
    },
});

// Documents uploads directory
const documentsDir = path.join(__dirname, "../../uploads/documents");
if (!fs.existsSync(documentsDir)) {
    fs.mkdirSync(documentsDir, { recursive: true });
}

// Documents storage configuration
const documentsStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, documentsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, `doc-${req.user.id}-${uniqueSuffix}${ext}`);
    },
});

// Document file filter
const documentFileFilter = (req, file, cb) => {
    const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/zip",
        "application/x-zip-compressed",
    ];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Only PDF, DOC, DOCX, PPT, PPTX, and ZIP files are allowed"), false);
    }
};

// Create documents upload instance
const uploadDocument = multer({
    storage: documentsStorage,
    fileFilter: documentFileFilter,
    limits: {
        fileSize: 25 * 1024 * 1024, // 25MB max
    },
});

module.exports = { uploadAvatar, uploadTask, uploadMaterial, uploadDocument };
