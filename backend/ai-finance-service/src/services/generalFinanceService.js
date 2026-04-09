import {createTextModel, requireApiKey} from "../utils/ragHelpers.js"

export const generateGeneralResponse = async (question) => {
  const apiKey = requireApiKey("generateGeneralResponse")
  const model = createTextModel(apiKey)

  const prompt = `
    You are a Financial Guide for the 'Wealthy' app. 
    Provide a clear, concise, and professional explanation for the following financial concept.don't give long answers.
    
    Question: "${question}"
    
    Guidelines:
    - Keep it educational and encouraging.
    - If the question is not about finance, politely decline to answer.
    - Use simple terms for beginners.
    - give short and concise answers.
  `

  const result = await model.generateContent(prompt)
  return result.response.text()
}
