"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";

export default function ChatPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [contacts, setContacts] = useState([]);
    const [selectedContact, setSelectedContact] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputMsg, setInputMsg] = useState("");
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef(null);

    // Redirect if not logged in
    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/");
        }
    }, [user, authLoading, router]);

    // Fetch contacts
    useEffect(() => {
        const fetchContacts = async () => {
            try {
                const res = await api.chat.getContacts();
                setContacts(res);
                if (res.length > 0) {
                    setSelectedContact(res[0]);
                }
            } catch (err) {
                console.error("Error fetching contacts:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchContacts();
    }, []);

    // Polling messages
    useEffect(() => {
        let interval;
        const fetchMessages = async () => {
            if (!selectedContact) return;
            try {
                const res = await api.chat.getMessages(selectedContact.user_id);
                setMessages(res);
            } catch (err) {
                console.error("Error fetching messages:", err);
            }
        };

        if (selectedContact) {
            fetchMessages();
            interval = setInterval(fetchMessages, 3000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [selectedContact]);

    // Scroll to bottom on new message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!inputMsg.trim() || !selectedContact) return;
        
        const tempMsg = inputMsg;
        setInputMsg("");

        try {
            await api.chat.sendMessage({
                content: tempMsg,
                receiver_id: selectedContact.user_id
            });
            // Fetch immediately after send
            const res = await api.chat.getMessages(selectedContact.user_id);
            setMessages(res);
        } catch (err) {
            console.error("Error sending message:", err);
            // Revert on fail
            setInputMsg(tempMsg);
        }
    };

    if (loading || authLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
            </div>
        );
    }
    
    if (!user) return null;

    return (
        <div className="max-w-6xl mx-auto w-full h-[calc(100vh-120px)] flex bg-panel border border-outline rounded-3xl shadow-panel overflow-hidden">
            {/* Sidebar */}
            <div className="w-1/3 border-r border-outline flex flex-col bg-main">
                <div className="p-5 border-b border-outline">
                    <h2 className="text-xl font-bold bg-gradient-to-r from-teal-500 to-cyan-500 bg-clip-text text-transparent">
                        Messages
                    </h2>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {contacts.length === 0 ? (
                        <p className="text-muted text-sm text-center mt-5">No contacts available.</p>
                    ) : (
                        contacts.map(contact => (
                            <button
                                key={contact.user_id}
                                onClick={() => setSelectedContact(contact)}
                                className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all duration-300 text-left ${
                                    selectedContact?.user_id === contact.user_id
                                        ? "bg-teal-500/10 border border-teal-500/20 shadow-sm"
                                        : "hover:bg-panel border border-transparent"
                                }`}
                            >
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shrink-0">
                                    <span className="text-white font-bold text-sm">
                                        {contact.first_name?.[0]?.toUpperCase()}
                                    </span>
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <p className={`font-semibold text-sm truncate ${selectedContact?.user_id === contact.user_id ? "text-teal-500" : "text-primary"}`}>
                                        {contact.first_name} {contact.last_name}
                                    </p>
                                    <p className="text-xs text-muted truncate">
                                        {contact.role === "fizjoterapeuta" ? "Physiotherapist" : "Patient"}
                                    </p>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
                {selectedContact ? (
                    <>
                        {/* Chat Header */}
                        <div className="p-5 border-b border-outline flex items-center gap-3 bg-panel/50 backdrop-blur-sm">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
                                <span className="text-white font-bold text-sm">
                                    {selectedContact.first_name?.[0]?.toUpperCase()}
                                </span>
                            </div>
                            <div>
                                <h3 className="font-bold text-primary">
                                    {selectedContact.first_name} {selectedContact.last_name}
                                </h3>
                                <p className="text-xs text-emerald-500">Online</p>
                            </div>
                        </div>

                        {/* Messages List */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-4">
                            {messages.length === 0 ? (
                                <div className="h-full flex items-center justify-center flex-col gap-2 text-muted">
                                    <svg className="w-12 h-12 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                                    <p>No messages yet. Say hello!</p>
                                </div>
                            ) : (
                                messages.map((msg, idx) => {
                                    const isMe = msg.sender_id === user?.user_id;
                                    return (
                                        <div key={idx} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                                            <div className={`max-w-[70%] rounded-2xl px-5 py-3 shadow-sm ${
                                                isMe 
                                                    ? "bg-gradient-to-br from-teal-500 to-cyan-500 text-white rounded-br-none" 
                                                    : "bg-panel border border-outline text-primary rounded-bl-none"
                                            }`}>
                                                <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                                                <p className={`text-[10px] mt-1 text-right ${isMe ? "text-teal-100" : "text-muted"}`}>
                                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-panel/50 backdrop-blur-sm border-t border-outline">
                            <form onSubmit={handleSend} className="flex gap-2">
                                <input
                                    type="text"
                                    value={inputMsg}
                                    onChange={(e) => setInputMsg(e.target.value)}
                                    placeholder="Type a message..."
                                    className="flex-1 bg-main border border-outline rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all text-primary placeholder:text-muted"
                                />
                                <button
                                    type="submit"
                                    disabled={!inputMsg.trim()}
                                    className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white p-3 rounded-xl shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted">
                        <svg className="w-16 h-16 opacity-20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                        <p>Select a contact to start messaging</p>
                    </div>
                )}
            </div>
        </div>
    );
}
