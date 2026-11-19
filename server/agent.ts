
import { LlmAgent } from "@google/adk";
import { Type, type Schema } from "@google/genai";

const outputSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        Title: {
            type: Type.STRING
        },
        Summary: {
            type: Type.STRING
        },
        "Key items": {
            type: Type.ARRAY,
            items: {
                type: Type.STRING
            }
        }
    },
    required: ["Title", "Summary", "Key items"]
};

export const rootAgent = new LlmAgent({
    name: "content_extractor",
    model: "gemini-3.5-flash-lite",

    description: "An agent that extracts structured information from text and documents.",

    instruction: `
        You are a content extraction assistant.
        Analyse the content provided by the user.
        Extract a Title, Summary and Key items.
        Do not invent information.
    `,

    outputSchema: outputSchema
});
