
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";

import { rootAgent } from "./agent.ts";

import { Runner } from
    "./node_modules/@google/adk/dist/esm/runner/runner.js";

import { InMemorySessionService } from
    "./node_modules/@google/adk/dist/esm/sessions/in_memory_session_service.js";

import {
    isFinalResponse,
    stringifyContent
} from "./node_modules/@google/adk/dist/esm/events/event.js";
// Load environment variables
dotenv.config();

// Create Express application
const app = express();

app.use(cors());
app.use(express.json());

// Configure file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024
    }
});

// Check API key
if (!process.env.GEMINI_API_KEY) {
    throw new Error("Gemini API key is missing from .env");
}

// ADK session configuration
const APP_NAME = "gemini_chatbot";
const USER_ID = "web_user";

const sessionService = new InMemorySessionService();

const runner = new Runner({
    appName: APP_NAME,
    agent: rootAgent,
    sessionService: sessionService
});

// Chatbot API route
app.post("/api/chat", upload.single("file"), async (req, res) => {
    try {
        const { message, sessionId } = req.body;

        // Check whether the user provided text or a file
        if (
            (!message || typeof message !== "string" || !message.trim()) &&
            !req.file
        ) {
            return res.status(400).json({
                error: "Please enter a message or upload a file."
            });
        }

        // Prepare user message
        const userPrompt = message?.trim() ||
            "Analyze the uploaded file and extract its important information.";

        const parts = [
            { text: userPrompt }
        ];

        // Check uploaded file
        if (req.file) {

            const allowedTypes = [
                "image/jpeg",
                "image/png",
                "image/webp",
                "application/pdf"
            ];

            if (!allowedTypes.includes(req.file.mimetype)) {
                return res.status(400).json({
                    error: "Only JPG, PNG, WebP and PDF files are supported."
                });
            }

            // Convert file to Base64 for ADK
            parts.push({
                inlineData: {
                    mimeType: req.file.mimetype,
                    data: req.file.buffer.toString("base64")
                }
            });
        }

        // Find existing session or create a new one
        let session;

        if (sessionId) {
            session = await sessionService.getSession({
                appName: APP_NAME,
                userId: USER_ID,
                sessionId: sessionId
            });
        }

        if (!session) {
            session = await sessionService.createSession({
                appName: APP_NAME,
                userId: USER_ID
            });
        }

        // Run the ADK agent
        let finalText = "";

        for await (const event of runner.runAsync({
            userId: USER_ID,
            sessionId: session.id,
            newMessage: {
                role: "user",
                parts: parts
            }
        })) {
            if (isFinalResponse(event)) {
                finalText = stringifyContent(event);
            }
        }

        if (!finalText) {
            throw new Error("The ADK agent returned an empty response.");
        }

        // Convert agent response into JSON
        const extractedData = JSON.parse(finalText);

        console.log("ADK response received successfully.");

        // Send response to frontend
        res.json({
            reply: extractedData,
            sessionId: session.id
        });

    } catch (error) {
        console.error("ADK error:", error);

        res.status(500).json({
            error: "Unable to get a response from the chatbot."
        });
    }
});

// Start server
const PORT = 5000;

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
