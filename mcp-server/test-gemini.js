import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import dotenv from 'dotenv';

dotenv.config();

async function test() {
    console.log("Testing API Key:", process.env.GOOGLE_GENERATIVE_AI_API_KEY?.substring(0, 8) + "...");
    try {
        const result = await generateText({
            model: google('gemini-1.5-flash-latest'),
            prompt: 'Hello, are you working?',
        });
        console.log("Success:", result.text);
    } catch (error) {
        console.error("Test Error:", error);
    }
}

test();
