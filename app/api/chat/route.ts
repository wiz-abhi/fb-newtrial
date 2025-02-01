import { NextResponse } from "next/server"
import axios from "axios"
import { getWalletByApiKey, updateWalletBalance } from "@/lib/mongodb"
import { calculateCost } from "@/lib/pricing"

export async function POST(request: Request) {
  try {
    const { messages, model = "gpt-3.5-turbo" } = await request.json()
    const apiKey = request.headers.get("x-api-key")

    if (!apiKey) {
      return NextResponse.json({ error: "API key is required" }, { status: 401 })
    }

    const wallet = await getWalletByApiKey(apiKey)
    if (!wallet) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 })
    }

    // Ensure all required environment variables are set
    if (
      !process.env.AZURE_OPENAI_ENDPOINT ||
      !process.env.AZURE_OPENAI_DEPLOYMENT_NAME ||
      !process.env.AZURE_OPENAI_API_KEY
    ) {
      console.error("Missing required environment variables")
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    const response = await axios.post(
      `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT_NAME}/chat/completions?api-version=2023-05-15`,
      { messages, model },
      {
        headers: {
          "Content-Type": "application/json",
          "api-key": process.env.AZURE_OPENAI_API_KEY,
        },
      },
    )

    const tokensUsed = response.data.usage.total_tokens
    const cost = calculateCost(model, tokensUsed)

    if (wallet.balance < cost) {
      return NextResponse.json({ error: "Insufficient funds" }, { status: 402 })
    }

    await updateWalletBalance(wallet.userId, -cost, `Chat completion (${model})`)

    return NextResponse.json({
      ...response.data,
      cost,
      remainingBalance: wallet.balance - cost,
    })
  } catch (error) {
    console.error("Failed to process chat request:", error)
    if (axios.isAxiosError(error)) {
      console.error("Axios error details:", error.response?.data)
    }
    return NextResponse.json({ error: "Failed to process chat request" }, { status: 500 })
  }
}
