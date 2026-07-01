"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";
import NavBar from "@/components/NavBar";
import { useAuth } from "@/context/AuthContext";

// URL of the standalone telegram-bot Socket.IO server (see telegram-bot/server.js)
const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4001";

export default function TelegramFeedPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const socketRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  // Load history once on mount
  useEffect(() => {
    if (!user) return;
    fetch("/api/telegram/messages")
      .then((res) => res.json())
      .then((data) => setMessages(data.messages || []))
      .finally(() => setHistoryLoading(false));
  }, [user]);

  // Connect to socket server for live updates
  useEffect(() => {
    if (!user) return;

    const socket = io(SOCKET_URL, { transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("telegram:message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (loading || !user) {
    return (
      <>
        <NavBar />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-paper-dim font-ledger">Loading…</p>
        </main>
      </>
    );
  }

  return (
    <>
      <NavBar />
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-10 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="font-ledger text-accent text-sm tracking-widest mb-2">
              LIVE FEED
            </p>
            <h1 className="text-2xl font-semibold text-paper">
              Telegram group messages
            </h1>
          </div>
          <span
            className={`text-xs px-2.5 py-1 rounded-full border ${
              connected
                ? "text-ok border-ok/40 bg-ok/10"
                : "text-danger border-danger/40 bg-danger/10"
            }`}
          >
            {connected ? "Connected" : "Disconnected"}
          </span>
        </div>
        <p className="text-paper-dim text-sm mb-8">
          Messages stream in as the bot reads them from groups it has joined.
        </p>

        <div className="border border-line rounded-sm flex-1 min-h-[400px] max-h-[600px] overflow-y-auto divide-y divide-line bg-ink-raised">
          {historyLoading ? (
            <p className="text-paper-dim text-sm font-ledger p-4">Loading…</p>
          ) : messages.length === 0 ? (
            <p className="text-paper-dim text-sm p-6 text-center">
              No messages yet. Once the bot is added to a group with privacy
              mode disabled, messages will appear here in real time.
            </p>
          ) : (
            messages.map((m) => (
              <div key={m._id} className="px-4 py-3">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-sm text-accent font-medium">
                    {m.fromUsername}
                  </span>
                  <span className="text-xs text-paper-dim">
                    in {m.chatTitle}
                  </span>
                  <span className="text-xs text-paper-dim ml-auto font-ledger">
                    {new Date(m.sentAt).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-paper text-sm break-words">{m.text}</p>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </main>
    </>
  );
}
