# Cloudinary Storage Integration

## Summary

Integrated **Cloudinary** as the primary storage provider for staging and production environments, with **S3/MinIO** as a fallback and **Local Storage** for development.

## Service Architecture

The storage service uses a factory pattern (`StorageServiceFactory`) to select the appropriate provider:

1.  **Production/Staging**:

    -   **Primary**: Cloudinary (if `CLOUDINARY_CLOUD_NAME` is set)
    -   **Fallback**: S3-Compatible Storage (if `AWS_ACCESS_KEY_ID` is set)
    -   **Final Fallback**: Local Storage (logs error)

2.  **Development**:
    -   **Default**: Local Storage (saves to `uploads/` directory)

## Configuration

### Environment Variables

Add the following to your `.env` file for staging/production:

```bash
# Cloudinary Storage Service
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### File Structure

-   `src/shared/lib/services/storage-service/`

    -   `storage.service.ts` - Factory and main export
    -   `cloudinary-storage.service.ts` - Cloudinary implementation
    -   `s3-storage.service.ts` - S3/MinIO implementation
    -   `local-storage.service.ts` - Local filesystem implementation

-   `src/shared/lib/services/storage.service.ts` - Backward compatibility wrapper

## Usage

The usage remains the same as before:

```typescript
import { storageService } from '@/shared/lib/services/storage.service';

// Upload a file
const fileUrl = await storageService.uploadFile(req.file, 'avatars');
```

## Migration Steps

1.  **Get Cloudinary Credentials**: Sign up at [Cloudinary](https://cloudinary.com/) and get your Cloud Name, API Key, and API Secret.
2.  **Update `.env`**: Add the credentials to your `.env` file.
3.  **Restart Server**: Restart the server to initialize the new service.
4.  **Verify**: Check logs for "🚀 Initializing Cloudinary Storage Service".

## Testing

-   **Development**: Run `pnpm dev`. Files will be saved locally in `uploads/`.
-   **Staging**: Run `pnpm run dev:staging`. Files will be uploaded to Cloudinary (if configured).

## Benefits

-   **Optimized Delivery**: Cloudinary provides CDN and image optimization out of the box.
-   **Easy Setup**: Simpler than configuring S3 buckets and permissions.
-   **Transformation**: Ready for future image transformations (resizing, cropping, etc.).
