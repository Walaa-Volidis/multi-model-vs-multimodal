// All user-facing explanatory copy lives here so it can be reviewed in one place.

export type Concept = "model" | "modal";

export interface Example {
  title: string;
  detail: string;
}

export interface ConceptContent {
  concept: Concept;
  name: string;
  nickname: string;
  definition: string;
  explainer: string[];
  examples: Example[];
}

export const MULTI_MODEL: ConceptContent = {
  concept: "model",
  name: "Multi-model",
  nickname: "Many brains",
  definition:
    "A system that uses several different AI models together, giving each one the part of the job it does best.",
  explainer: [
    "Think of a team of specialists. Instead of asking one model to do everything, a multi-model system hands work to different models and combines what they produce.",
    "A router can pick the right model for each request, a pipeline can pass the output of one model into the next, or several models can answer the same question and vote.",
  ],
  examples: [
    {
      title: "Smart routing",
      detail: "A chat app sends quick questions to a small, fast model and hard reasoning problems to a larger one.",
    },
    {
      title: "A model pipeline",
      detail:
        "A speech-to-text model transcribes a call, a language model summarizes it, and a text-to-speech model reads the summary aloud.",
    },
    {
      title: "Ensembling",
      detail: "Three models each label the same support ticket, and the label most of them agree on wins.",
    },
  ],
};

export const MULTIMODAL: ConceptContent = {
  concept: "modal",
  name: "Multimodal",
  nickname: "Many senses",
  definition:
    "A single AI model that can understand, and sometimes produce, more than one type of data: text, images, audio, or video.",
  explainer: [
    "A “modality” is a type of data. A text-only model has one sense: it reads words. A multimodal model has several, so it can look at a picture and read your question about it at the same time.",
    "Because one model sees everything together, it can connect the pieces, like matching what you said with what is in the photo.",
  ],
  examples: [
    {
      title: "Ask about a photo",
      detail: "Take a picture of a menu and ask which dishes are vegetarian. One model reads the image and answers in text.",
    },
    {
      title: "Chart to insight",
      detail: "Paste a screenshot of a sales chart and ask what changed this quarter.",
    },
    {
      title: "Talk out loud",
      detail: "Ask a question with your voice and hear a spoken reply, with one model handling the audio in and out.",
    },
  ],
};

export const GLOSSARY = {
  modality: "A type of data, such as text, images, audio, or video.",
  router: "A small component that decides which model should handle each request.",
};

export const MNEMONIC = { model: "Model = brains.", modal: "Modal = senses." };
