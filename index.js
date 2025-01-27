import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { createClient } from "@supabase/supabase-js";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { OpenAIEmbeddings } from "@langchain/openai";
import { StringOutputParser } from "@langchain/core/output_parsers";
import {
  RunnableSequence,
  RunnablePassthrough,
} from "@langchain/core/runnables";

const openaiAPIKey = import.meta.env.VITE_OPENAI_API_KEY;
const supabaseURL = import.meta.env.VITE_SUPABASE_URL;
const supabaseAPIKey = import.meta.env.VITE_SUPABASE_API_KEY;

const embeddings = new OpenAIEmbeddings({ apiKey: openaiAPIKey });

const vectorStore = new SupabaseVectorStore(embeddings, {
  client: createClient(supabaseURL, supabaseAPIKey),
  tableName: "documents",
  queryName: "match_documents",
});

const retrievers = vectorStore.asRetriever();

const llm = new ChatOpenAI({ apiKey: openaiAPIKey });

const userQuestion =
  "I recently came across scrimba and was wondering what is a scrim, can you tell me the meaning of a scrim?";

//1.
const promptTemplate = PromptTemplate.fromTemplate(
  "Given some conversation history (if any) and a user question, Turn this users question into a standalone question\n: {user_question} \n Conversation History: {conv_history}"
);

const answerPromptTemplate = PromptTemplate.fromTemplate(
  `You are a helpful and enthusiastic support bot who can answer a given question about Scrimba based on the context provided and a conversation history. Try to find the answer in the context. If you really don't know the answer, say "I'm sorry, I don't know the answer to that." And direct the questioner to email help@scrimba.com. Don't try to make up an answer. Always speak as if you were chatting to a friend.
Question: {question}\n
Context:  {context}\n
conversation history: {conv_history}
`
);

const promptTemplateChain = RunnableSequence.from([
  promptTemplate,
  llm,
  new StringOutputParser(),
]);

const response = await promptTemplateChain.invoke({
  user_question: userQuestion,
});
console.log(response);

// const res = response.map((r) => {
//   return r.pageContent;
// });

// const responseArr = res.join("\n");

const retrievalTenplateChain = RunnableSequence.from([
  (prevResult) => prevResult.standalone_question,
  retrievers,
  combineDocuments,
  new StringOutputParser(),
]);

const answerPromptTemplateChain = RunnableSequence.from([
  answerPromptTemplate,
  llm,
  new StringOutputParser(),
]);

const chain = RunnableSequence.from([
  {
    standalone_question: promptTemplateChain,
    original_input: new RunnablePassthrough(),
  },
  {
    context: retrievalTenplateChain,
    question: ({ original_input }) => original_input.user_question,
    conv_history: ({ original_input }) => original_input.conv_history,
  },
  answerPromptTemplateChain,
]);

document.addEventListener("submit", (e) => {
  e.preventDefault();
  progressConversation();
});
/////

const convHistory = [];

async function progressConversation() {
  const userInput = document.getElementById("user-input");
  const chatbotConversation = document.getElementById(
    "chatbot-conversation-container"
  );
  const question = userInput.value;
  userInput.value = "";

  // add human message
  const newHumanSpeechBubble = document.createElement("div");
  newHumanSpeechBubble.classList.add("speech", "speech-human");
  chatbotConversation.appendChild(newHumanSpeechBubble);
  newHumanSpeechBubble.textContent = question;
  chatbotConversation.scrollTop = chatbotConversation.scrollHeight;

  const answerResponse = await chain.invoke({
    user_question: question,
    conv_history: formatConvHistory(convHistory),
  });
  console.log("answerResponse", answerResponse);
  convHistory.push(question);
  convHistory.push(quanswerResponseestion);

  // add AI message
  const newAiSpeechBubble = document.createElement("div");
  newAiSpeechBubble.classList.add("speech", "speech-ai");
  chatbotConversation.appendChild(newAiSpeechBubble);
  newAiSpeechBubble.textContent = answerResponse;
  chatbotConversation.scrollTop = chatbotConversation.scrollHeight;
}

function combineDocuments(docs) {
  return docs.map((doc) => doc.pageContent).join("\n\n");
}

function formatConvHistory(messages) {
  return messages.map((message, i) => {
    if (i % 2 === 0) {
      return `Human: ${message}`;
    } else {
      return `AI: ${message}`;
    }
  });
}
