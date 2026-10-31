// The real models the app uses, all reached through OpenRouter with one key.
// IDs were checked against https://openrouter.ai/api/v1/models on 2026-10-31.
// To swap a model, change its id here; labels and prices come from the live
// catalog at run time.

const ROSTER = {
  // Reads the upload and decides which specialists to call (multi-model lane).
  planner: { id: "openai/gpt-6-luna", vendor: "OpenAI" },

  // Specialists the planner can choose from. `reads` = file kinds it can open.
  vision: {
    id: "meta-llama/llama-4-maverick",
    vendor: "Meta",
    reads: ["image"],
    job: "Reads images: photos, screenshots, charts, menus, signs, handwriting. Transcribes visible text exactly.",
  },
  audio: {
    id: "qwen/qwen3.8-omni-flash",
    vendor: "Qwen",
    reads: ["audio"],
    job: "Listens to audio: transcribes speech word for word and notes the language, speakers, and tone.",
  },
  document: {
    id: "mistralai/mistral-large-2512",
    vendor: "Mistral",
    reads: ["pdf"],
    job: "Reads PDF documents and pulls out the facts, numbers, and sections that matter.",
  },
  language: {
    id: "cohere/command-a-plus",
    vendor: "Cohere",
    reads: [],
    job: "Works on text only: translates, rewrites, summarizes, or extracts from other specialists' output.",
  },

  // Writes the final answer in the multi-model lane, from the specialists' notes.
  final: { id: "anthropic/claude-sonnet-5.5", vendor: "Anthropic" },

  // The single model in the multimodal lane: text, images, audio, and PDFs in one request.
  multimodal: { id: "google/gemini-3.8-flash", vendor: "Google" },
};

const SPECIALISTS = ["vision", "audio", "document", "language"];

module.exports = { ROSTER, SPECIALISTS };
