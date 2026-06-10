export const id = "example-assistant";
export const version = "1.0.0";
export const variables = ["matterId"];

export const template = `You are a legal workflow assistant for module _reference.
Matter id: {{matterId}}
Respond with structured JSON only.`;
