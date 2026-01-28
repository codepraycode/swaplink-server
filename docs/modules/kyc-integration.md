# KYC Integration & Testing Guide

This document outlines how to submit KYC documents and listen for real-time updates using the simulated worker.

## 1. Overview

The KYC process is now asynchronous.

1.  **Submission**: Client uploads a document via API.
2.  **Processing**: Server queues a job. Worker simulates verification (2s delay).
3.  **Notification**: Server emits a socket event `KYC_UPDATED` upon completion.

## 2. Submission Endpoint

**URL**: `POST /account/auth/kyc`
**Auth**: Bearer Token required.
**Content-Type**: `multipart/form-data`

| Field          | Type   | Description                |
| :------------- | :----- | :------------------------- |
| `document`     | File   | The image file (JPG, PNG). |
| `documentType` | String | `ID_CARD` or `PASSPORT`.   |

### Example (cURL)

```bash
curl --location 'http://localhost:3000/api/v1/account/auth/kyc' \
--header 'Authorization: Bearer <YOUR_TOKEN>' \
--form 'document=@"/path/to/image.jpg"' \
--form 'documentType="ID_CARD"'
```

## 3. Listening for Updates (Socket.io)

Connect to the socket server to receive real-time updates.

**Event Name**: `KYC_UPDATED`

### Payload Structure

```json
{
  "userId": "uuid-string",
  "status": "APPROVED" | "REJECTED",
  "documentType": "ID_CARD",
  "reason": "Optional rejection reason",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Client Example (Javascript/React)

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
    auth: { token: '<YOUR_TOKEN>' },
});

socket.on('connect', () => {
    console.log('Connected to socket');
});

socket.on('KYC_UPDATED', data => {
    console.log('KYC Update Received:', data);
    if (data.status === 'APPROVED') {
        alert('Your document has been verified!');
    } else {
        alert('Verification failed: ' + data.reason);
    }
});
```

## 4. Testing with Postman

1.  **Connect**: Open Postman -> New -> Socket.io. Enter URL `ws://localhost:3000`.
2.  **Auth**: Add `token` in Handshake Auth or Query Params.
3.  **Listen**: Add listener for `KYC_UPDATED`.
4.  **Submit**: Use a separate HTTP Request tab to submit the document.
5.  **Observe**: Watch the Socket.io tab for the event after ~2 seconds.
