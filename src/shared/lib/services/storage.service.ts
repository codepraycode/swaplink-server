import { storageService } from './storage-service/storage.service';
import { IStorageService } from './storage-service/cloudinary-storage.service';

// Re-export the new service instance
export { storageService };

// Re-export the interface as the class name for backward compatibility (if used as type)
// This allows 'import { StorageService } ...' to still work as a type
export type StorageService = IStorageService;
