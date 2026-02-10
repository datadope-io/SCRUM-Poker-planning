import { GoogleGenAI, Type } from '@google/genai';

let aiClient = null;

const getClient = () => {
  if (aiClient) return aiClient;

  let apiKey = '';
  try {
    if (typeof process !== 'undefined' && process.env) {
      apiKey = process.env.API_KEY || '';
    }
  } catch (e) {
    console.warn("Could not access process.env.API_KEY");
  }

  if (!apiKey) {
    console.warn("API Key missing. AI features will use fallback logic.");
    return null;
  }

  try {
    aiClient = new GoogleGenAI({ apiKey });
    return aiClient;
  } catch (e) {
    console.error("Failed to initialize GoogleGenAI client:", e);
    return null;
  }
};

export const generateAiVote = async (story, personaName, personaRole) => {
  if (!story.title.trim() && !story.description.trim()) {
     const cards = [1, 2, 3, 5, 8, 13, 21];
     const points = cards[Math.floor(Math.random() * cards.length)];
     return {
       points,
       reasoning: "I don't have any context on the story, so I'm providing a random estimate to participate."
     };
  }

  const client = getClient();

  if (!client) {
    return {
      points: 8,
      reasoning: "I'm currently offline (API Key missing), but this looks like a medium effort task."
    };
  }

  const model = "gemini-3-flash-preview";

  const prompt = `
    You are participating in a Planning Poker session for software estimation.

    Your Persona:
    Name: ${personaName}
    Role: ${personaRole}

    The Story to Estimate:
    Title: "${story.title}"
    Description: "${story.description}"

    Task:
    1. Analyze the complexity of the story based on your persona's perspective.
    2. Select a Story Point value from the Fibonacci sequence: [1, 2, 3, 5, 8, 13, 21].
       - 1-3: Simple, well-understood tasks.
       - 5-8: Medium complexity, some unknowns or significant effort.
       - 13-21: High complexity, high risk, or too large (needs splitting).
    3. Provide a short, one-sentence reasoning for your vote, sounding like your persona.

    Return JSON format.
  `;

  try {
    const response = await client.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            points: { type: Type.NUMBER, description: "The Fibonacci story point value (1, 2, 3, 5, 8, 13, 21)" },
            reasoning: { type: Type.STRING, description: "A short explanation of the estimate from the persona's view" }
          },
          required: ["points", "reasoning"]
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No response from Gemini");

    const result = JSON.parse(jsonText);

    const validPoints = [1, 2, 3, 5, 8, 13, 21];
    let points = result.points;
    if (!validPoints.includes(points)) {
       points = validPoints.reduce((prev, curr) =>
         Math.abs(curr - points) < Math.abs(prev - points) ? curr : prev
       );
    }

    return {
      points: points,
      reasoning: result.reasoning
    };

  } catch (error) {
    console.error("Error generating AI vote:", error);
    return {
      points: 8,
      reasoning: "I'm having trouble connecting to my brain, but this feels complex."
    };
  }
};
