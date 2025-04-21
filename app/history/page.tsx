// app/history/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Clock, Trash2, ArrowRight, LogOut } from "lucide-react";

interface User {
  id: number;
  name?: string;
  email: string;
}

interface HistoryItem {
  id: string;
  timestamp: string;
  cipherType: string;
  input: string;
  output: string;
  operation: "encrypt" | "decrypt" | "inverse" | "crack" | "brute-force";
  key?: string;
}

export default function HistoryPage() {
  const router = useRouter();

  // --- State ---
  const [user, setUser] = useState<User | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState< string >("all");
  const [error, setError] = useState<string | null>(null);

  // --- Load user & fetch history ---
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) {
      router.push("/login");
      return;
    }
    const u: User = JSON.parse(stored);
    if (!u?.id) {
      router.push("/login");
      return;
    }
    setUser(u);

    fetch(`/api/history?userId=${u.id}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Fetch error: ${res.status}`);
        return res.json() as Promise<HistoryItem[]>;
      })
      .then((data) => {
        setHistory(data);
      })
      .catch((e: Error) => {
        setError(e.message);
      });
  }, [router]);

  // --- Logout ---
  const handleLogout = () => {
    localStorage.removeItem("user");
    router.push("/login");
  };

  // --- Delete single history item ---
  const handleDeleteItem = async (id: string) => {
    if (!user) return;
    try {
      const res = await fetch(`/api/history?id=${id}&user_id=${user.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        console.error("Delete failed:", await res.text());
        return;
      }
      setHistory((h) => h.filter((item) => item.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  // --- Clear all history for this user ---
  const handleClearHistory = async () => {
    if (!user) return;
    if (!confirm("Clear your entire history?")) return;
    try {
      const res = await fetch(
               `/api/history?all=true&user_id=${user.id}`,   // <-- make sure this is exactly "user_id"
                 { method: "DELETE" }
               );
      if (!res.ok) {
        console.error("Clear failed:", await res.text());
        return;
      }
      setHistory([]);
    } catch (e) {
      console.error(e);
    }
  };

  // --- Filter tab view ---
  const filtered =
    activeTab === "all"
      ? history
      : history.filter((h) => h.cipherType.toLowerCase() === activeTab);

  const formatTime = (ts: string) =>
    new Date(ts).toLocaleString();

  // --- Loading / error states ---
  if (!user) {
    return <div className="container mx-auto p-8 text-center">Loading…</div>;
  }
  if (error) {
    return (
      <div className="container mx-auto p-8 text-center text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-emerald-700">
            Encryption History
          </h1>
          <p className="mt-2 text-gray-600">
            View and manage your previous operations
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="bg-blue-50 p-3 rounded-md">
            Logged in as{" "}
            <span className="font-bold">{user.name || user.email}</span>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="border-red-300 text-red-600 hover:bg-red-50"
          >
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Button>
        </div>
      </div>

      {/* Tabs + Clear */}
      <div className="mb-6">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <div className="flex justify-between items-center">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="caesar">Caesar</TabsTrigger>
              <TabsTrigger value="affine">Affine</TabsTrigger>
              <TabsTrigger value="vigenère">Vigenère</TabsTrigger>
              <TabsTrigger value="playfair">Playfair</TabsTrigger>
              <TabsTrigger value="hill">Hill</TabsTrigger>
            </TabsList>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleClearHistory}
              disabled={history.length === 0}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Clear History
            </Button>
          </div>
          <TabsContent value={activeTab} className="mt-6">
            {filtered.length ? (
              <div className="space-y-4">
                {filtered.map((item) => (
                  <Card key={item.id} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg flex items-center">
                            {item.cipherType} Cipher
                            <Badge
                              className={`ml-3 ${
                                item.operation === "encrypt"
                                  ? "bg-emerald-500"
                                  : item.operation === "decrypt"
                                  ? "bg-blue-500"
                                  : item.operation === "inverse"
                                  ? "bg-purple-500"
                                  : item.operation === "crack"
                                  ? "bg-yellow-400"
                                  : "bg-yellow-600"
                              }`}
                            >
                              {item.operation === "encrypt"
                                ? "Encrypted"
                                : item.operation === "decrypt"
                                ? "Decrypted"
                                : item.operation === "inverse"
                                ? "Inverse"
                                : item.operation === "crack"
                                ? "Cracked"
                                : "Brute‑Forced"}
                            </Badge>
                          </CardTitle>
                          <CardDescription className="flex items-center mt-1">
                            <Clock className="h-3 w-3 mr-1" />{" "}
                            {formatTime(item.timestamp)}
                          </CardDescription>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-500">
                            Input
                          </p>
                          <p className="font-mono bg-gray-50 p-2 rounded break-all">
                            {item.input}
                          </p>
                        </div>
                        <div className="flex justify-center items-center">
                          <div className="flex flex-col items-center">
                            <ArrowRight className="h-5 w-5 text-gray-400" />
                            <p className="text-xs text-gray-500 mt-1">
                              Key: {item.key}
                            </p>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">
                            Output
                          </p>
                          <p className="font-mono bg-gray-50 p-2 rounded break-all">
                            {item.output}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center p-8 bg-gray-50 rounded-lg">
                <p className="text-gray-500">
                  No history in this category.
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => router.push("/")}
                >
                  Go to Dashboard
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
