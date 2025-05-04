# LinkedIn Image Generator

A Node.js service that generates images using the FusionBrain API and delivers them via webhooks. This service is designed to create AI-generated images based on text prompts and deliver the results to a specified webhook URL.

## Features

- Generate images from text prompts using FusionBrain AI
- Asynchronous processing with webhook notifications
- Job status tracking
- RESTful API endpoints

## Prerequisites

- Node.js (v12 or higher)
- FusionBrain API credentials

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd li-image-generator
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:

```
FUSION_BRAIN_API_KEY=your_api_key
FUSION_BRAIN_SECRET_KEY=your_secret_key
FUSION_BRAIN_API_URL=https://api.fusionbrain.ai/api/v1
PORT=3000
```

## Usage

Start the server:

```bash
npm start
```

The server will run on port 3000 by default (or the port specified in your `.env` file).

## API Endpoints

### Generate Image

**POST** `/generate-image`

Starts an asynchronous image generation process.

**Request Body:**

```json
{
  "prompt": "Your text prompt for image generation",
  "content": "Optional content or metadata",
  "webhookUrl": "https://your-webhook-url.com/endpoint"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Image generation started",
  "jobId": "uuid-of-the-job"
}
```

### Check Job Status

**GET** `/job/:jobId`

Returns the current status of a job.

**Response:**

```json
{
  "jobId": "uuid-of-the-job",
  "status": "processing|completed",
  "prompt": "The original prompt",
  "startTime": "2023-01-01T00:00:00.000Z"
}
```

## Webhook Notification

When image generation is complete, the service will send a POST request to the webhook URL provided during job creation with the following payload:

```json
{
  "jobId": "uuid-of-the-job",
  "content": "The original content/metadata",
  "prompt": "The original prompt",
  "status": "completed",
  "imageData": "base64-encoded-image-data"
}
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `FUSION_BRAIN_API_KEY` | Your FusionBrain API key |
| `FUSION_BRAIN_SECRET_KEY` | Your FusionBrain secret key |
| `FUSION_BRAIN_API_URL` | FusionBrain API URL (default: https://api.fusionbrain.ai/api/v1) |
| `PORT` | Port for the server (default: 3000) |

## License

ISC