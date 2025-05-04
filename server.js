const express = require('express');
const fetch = require('node-fetch');
const FormData = require('form-data');
const dotenv = require('dotenv');
const axios = require('axios');
const cors = require('cors');
dotenv.config();
const app = express();
app.use(cors());

app.use(express.json());

// Store active jobs
const activeJobs = {};

// Load environment variables
const authHeaders = {
    'X-Key': `Key ${process.env.FUSION_BRAIN_API_KEY}`,
    'X-Secret': `Secret ${process.env.FUSION_BRAIN_SECRET_KEY}`
}

async function getPipeLineId() {
    const response = await axios.get(`${process.env.FUSION_BRAIN_API_URL}/pipelines`, { headers: authHeaders });
    console.log(response.data);
    return response.data[0].id;
}
// Endpoint to start image generation
app.post('/generate-image', async (req, res) => {
    try {
        const { prompt, content, webhookUrl } = req.body;

        if (!prompt || !webhookUrl) {
            return res.status(400).json({ error: 'Missing prompt or webhookUrl' });
        }

        // Create form data with proper boundaries
        const formData = new FormData();

        // Add params as a string with proper content type
        formData.append(
            "params",
            JSON.stringify({
                "type": "GENERATE",
                "numImages": 1,
                "width": 1024,
                "height": 1024,
                "generateParams": {
                    "query": prompt
                },
            }),
            {
                contentType: 'application/json'
            }
        );
        const pipelineId = await getPipeLineId();
        formData.append("pipeline_id", pipelineId);

        // Get the form headers including boundary
        const formHeaders = formData.getHeaders();

        const response = await fetch(`${process.env.FUSION_BRAIN_API_URL}/pipeline/run`, {
            method: "POST",
            headers: {
                ...formHeaders,
                ...authHeaders,
            },
            body: formData,
        });

        const data = await response.json();
        console.log("Response:", data);

        if (!data.uuid) {
            return res.status(500).json({ error: 'Failed to start generation', details: data });
        }

        // Store job info
        const jobId = data.uuid;
        activeJobs[jobId] = {
            prompt,
            content,
            webhookUrl,
            status: 'processing',
            startTime: new Date()
        };

        // Start polling in the background
        checkStatus(jobId);

        // Return immediately with the job ID
        return res.json({
            success: true,
            message: 'Image generation started',
            jobId
        });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: 'Server error', details: error.message });
    }
});

// Function to check status and call webhook when done
async function checkStatus(jobId) {
    try {
        const job = activeJobs[jobId];
        if (!job) return;

        const apiUrl = `${process.env.FUSION_BRAIN_API_URL}/pipeline/status/${jobId}`;

        const headers = {
            ...authHeaders,
            'Accept': 'application/json',
        };

        const response = await fetch(apiUrl, { headers });
        const data = await response.json();
        console.log(`Status for job ${jobId}:`, data.status);

        if (data.status !== 'DONE') {
            // Check again in 5 seconds
            setTimeout(() => checkStatus(jobId), 5000);
        } else {
            console.log("Generation complete!");
            // Get base64 from response
            const base64Data = data.result.files[0];

            // Call the webhook with the result
            await fetch(job.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    jobId,
                    content: job.content,
                    prompt: job.prompt,
                    status: 'completed',
                    imageData: base64Data
                })
            });

            // Update job status
            activeJobs[jobId].status = 'completed';
            console.log(`Webhook called for job ${jobId}`);

            // Clean up after some time
            setTimeout(() => {
                delete activeJobs[jobId];
            }, 3600000); // Remove after 1 hour
        }
    } catch (error) {
        console.error(`Error checking status for job ${jobId}:`, error);
        // Retry a few times
        if (activeJobs[jobId] && activeJobs[jobId].retries < 5) {
            activeJobs[jobId].retries = (activeJobs[jobId].retries || 0) + 1;
            setTimeout(() => checkStatus(jobId), 10000);
        }
    }
}

// Status endpoint
app.get('/job/:jobId', (req, res) => {
    const { jobId } = req.params;
    const job = activeJobs[jobId];

    if (!job) {
        return res.status(404).json({ error: 'Job not found' });
    }

    return res.json({
        jobId,
        status: job.status,
        prompt: job.prompt,
        startTime: job.startTime
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});