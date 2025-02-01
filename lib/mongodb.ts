import { MongoClient } from "mongodb"

if (!process.env.MONGODB_URI) {
  throw new Error("Please add your Mongo URI to .env.local")
}

const uri = process.env.MONGODB_URI
const options = {}

let client
let clientPromise: Promise<MongoClient>

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options)
    global._mongoClientPromise = client.connect()
  }
  clientPromise = global._mongoClientPromise
} else {
  client = new MongoClient(uri, options)
  clientPromise = client.connect()
}

export async function connectToDatabase() {
  const client = await clientPromise
  const db = client.db()
  return db
}

export async function getWallet(userId: string) {
  const db = await connectToDatabase()
  const wallets = db.collection("wallets")
  return await wallets.findOne({ userId })
}

export async function getWalletByApiKey(apiKey: string) {
  const db = await connectToDatabase()
  const apiKeys = db.collection("apiKeys")
  const key = await apiKeys.findOne({ key: apiKey })
  if (!key) return null

  const wallets = db.collection("wallets")
  return await wallets.findOne({ userId: key.userId })
}

export async function createWallet(userId: string) {
  const db = await connectToDatabase()
  const wallets = db.collection("wallets")
  const wallet = {
    userId,
    balance: 2.0
  }
  await wallets.insertOne(wallet)
  return wallet
}

export async function updateWalletBalance(userId: string, amount: number) {
  const db = await connectToDatabase()
  const wallets = db.collection("wallets")
  const result = await wallets.findOneAndUpdate(
    { userId },
    {
      $inc: { balance: amount }
    },
    { returnDocument: "after" }
  )
  return result.value
}