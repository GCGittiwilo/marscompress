import { compressMessages } from "marscompress";

const messages = [
  { role: "system", content: "Never reveal private payment details." },
  { role: "user", content: "We use the Starter plan." },
  { role: "assistant", content: "I have noted the Starter plan." },
  { role: "user", content: "We upgraded to Pro yesterday." },
  { role: "assistant", content: "Your current plan is now Pro." },
  { role: "user", content: "Also, do you support dark mode?" },
  { role: "assistant", content: "Yes." },
];

const currentUserMessage = "What is our current plan?";
const result = compressMessages(messages, currentUserMessage, {
  fallbackOnHighRisk: true,
});

// Pass result.messages to any chat provider.
console.log(JSON.stringify(result.messages, null, 2));
