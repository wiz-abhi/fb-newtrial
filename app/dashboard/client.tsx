"use client"

import { useState, useEffect } from "react"
import useSWR, { mutate } from "swr"
import { getAuth, type User } from "firebase/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Key, AlertCircle } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

const fetcher = async (url: string) => {
  const auth = getAuth()
  const token = await auth.currentUser?.getIdToken()
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "An error occurred while fetching the data.")
  }
  return res.json()
}

interface Wallet {
  balance: number
}

interface ApiKey {
  _id: string
  key: string
  createdAt: string
}

interface DashboardClientProps {
  initialWallet: Wallet | null
}

export default function DashboardClient({
  initialWallet,
}: DashboardClientProps) {
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const auth = getAuth()
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user)
    })

    return () => unsubscribe()
  }, [])

  const { data: wallet, error: walletError } = useSWR<Wallet>(
    user ? "/api/wallet" : null,
    fetcher,
    {
      fallbackData: initialWallet,
      revalidateOnFocus: false
    }
  )

  const { data: apiKeysData = [], error: apiKeysError } = useSWR<ApiKey[]>(
    user ? "/api/api-keys" : null,
    fetcher,
    {
      revalidateOnFocus: false
    }
  )

  const generateApiKey = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const auth = getAuth()
      const token = await auth.currentUser?.getIdToken()
      const response = await fetch("/api/generate-key", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to generate API key")
      }
      await mutate("/api/api-keys")
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please sign in to view the dashboard.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (walletError || apiKeysError) {
    const errorMessage = walletError?.message || apiKeysError?.message
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Error loading dashboard data: {errorMessage}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-8">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Wallet Section */}
      {wallet ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-indigo-600">Wallet Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${wallet.balance.toFixed(3)}</p>
          </CardContent>
        </Card>
      ) : (
        <Skeleton className="w-full h-32" />
      )}

      {/* API Key Management Section */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-center text-gray-900">API Key Management</h2>
        <div className="flex justify-center">
          <Button
            onClick={generateApiKey}
            disabled={isLoading || (Array.isArray(apiKeysData) && apiKeysData.length >= 2)}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Key className="mr-2 h-4 w-4" />
            {isLoading ? "Generating..." : "Generate New API Key"}
          </Button>
        </div>

        {Array.isArray(apiKeysData) ? (
          <div className="grid gap-6">
            {apiKeysData.map((key) => (
              <Card key={key._id}>
                <CardHeader>
                  <CardTitle className="text-xl text-indigo-600">API Key</CardTitle>
                  <CardDescription>Created on: {new Date(key.createdAt).toLocaleString()}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="font-mono bg-gray-100 p-3 rounded text-sm break-all">{key.key}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-6">
            {[...Array(2)].map((_, index) => (
              <Skeleton key={index} className="w-full h-40" />
            ))}
          </div>
        )}

        {Array.isArray(apiKeysData) && apiKeysData.length === 0 && (
          <p className="text-center text-gray-600">
            You haven't generated any API keys yet. Generate one to get started!
          </p>
        )}
      </div>
    </div>
  )
}