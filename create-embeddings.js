import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { createClient } from "@supabase/supabase-js";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { OpenAIEmbeddings } from "@langchain/openai";

const supabaseURL = import.meta.env.VITE_SUPABASE_URL;
const supabaseAPIKey = import.meta.env.VITE_SUPABASE_API_KEY;
const openaiAPIKey = import.meta.env.VITE_SUPABASE_API_KEY;

try {
  const result = await fetch("scrimba-info.txt");
  const text = await result.text();
  const text_splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    separators: ["\n\n", "\n", " ", ""],
    chunkOverlap: 50,
  });
  const chunks = await text_splitter.createDocuments([text]);
  console.log(chunks);

  const client = createClient(supabaseURL, supabaseAPIKey);

  const vectorStore = await SupabaseVectorStore.fromDocuments(
    chunks,
    new OpenAIEmbeddings({
      apiKey: openaiAPIKey,
      dangerouslyAllowBrowser: true,
    }),
    {
      client,
      tableName: "documents",
    }
  );
  console.log(vectorStore);
} catch (err) {
  console.log(err);
}
