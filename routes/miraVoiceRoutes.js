const express = require("express");
const { GoogleGenAI } = require("@google/genai");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

router.post("/speak", async (req, res) => {
  try {
    const { text } = req.body;

    if (!ai) {
      return res.status(500).json({
        error: "Gemini API key is not configured.",
      });
    }

    if (typeof text !== "string" || !text.trim()) {
      return res.status(400).json({
        error: "Text is required.",
      });
    }

    // Avoid unnecessarily long TTS requests.
    const spokenText = text.trim().slice(0, 1500);

    const interaction = await ai.interactions.create({
      model: "gemini-3.8-flash-tts",
      input: [{
        type: "user_input",
        content: [{
          type: "text",
          text: spokenText,
          annotations: [{
            type: "speech_metadata",
            style:
              "Friendly, warm, clear female-style AI assistant. " +
              "Speak naturally at a moderate pace, with a welcoming tone.",
          }],
        }],
      }],
      response_format: { type: "audio" },
      generation_config: {
        speech_config: [{ voice: "Kore" }],
      },
    });

    const audioBase64 = interaction.output_audio?.data;

    if (!audioBase64) {
      return res.status(502).json({
        error: "Gemini did not return audio.",
      });
    }

    return res.json({
      audio: audioBase64,
      mimeType: "audio/wav",
    });
  } catch (error) {
    console.error("Mira voice error:", error.message);

    return res.status(500).json({
      error: "Could not generate Mira's voice.",
    });
  }
});

module.exports = router;
