"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/");
        }
    }, [user, authLoading, router]);

    const fetchContacts = async () => {
        try {
            const res = await api.chat.getContacts();
            setContacts(res);
            setContacts((prevContacts) => {
                return res;
            });
        } catch (err) {
            console.error("Error fetching contacts:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchContacts();
    }, []);

    useEffect(() => {
        if (contacts.length > 0 && !selectedContact) {
            setSelectedContact(contacts[0]);
        }
    }, [contacts, selectedContact]);

    useEffect(() => {
        let interval;
        const fetchMessages = async () => {
            if (!selectedContact) return;
            try {
                const res = await api.chat.getMessages(selectedContact.user_id);
                setMessages(res);
                const contactsRes = await api.chat.getContacts();
                setContacts(contactsRes);
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
            const res = await api.chat.getMessages(selectedContact.user_id);
            setMessages(res);
        } catch (err) {
            console.error("Error sending message:", err);
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
                                className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all duration-300 text-left ${selectedContact?.user_id === contact.user_id
                                        ? "bg-teal-500/10 border border-teal-500/20 shadow-sm"
                                        : "hover:bg-panel border border-transparent"
                                    }`}
                            >
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shrink-0">
                                    <span className="text-white font-bold text-sm">
                                        {contact.first_name?.[0]?.toUpperCase()}
                                    </span>
                                </div>
                                <div className="flex-1 overflow-hidden flex justify-between items-center">
                                    <div>
                                        <p className={`text-sm truncate ${selectedContact?.user_id === contact.user_id
                                                ? "text-teal-500 font-bold"
                                                : contact.has_unread
                                                    ? "text-primary font-black"
                                                    : "text-primary font-medium"
                                            }`}>
                                            {contact.first_name} {contact.last_name}
                                        </p>
                                        <p className={`text-xs truncate ${contact.has_unread ? "text-primary font-bold" : "text-muted"}`}>
                                            {contact.role === "fizjoterapeuta" ? "Physiotherapist" : "Patient"}
                                        </p>
                                    </div>
                                    {contact.has_unread && (
                                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] shrink-0"></div>
                                    )}
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            <div className="flex-1 flex flex-col">
                {selectedContact ? (
                    <>
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

                        <div className="flex-1 overflow-y-auto p-5 space-y-4">
                            {messages.length === 0 ? (
                                <div className="h-full flex items-center justify-center flex-col gap-2 text-muted">
                                    <svg className="w-12 h-12 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                                    <p>No messages yet. Say hello!</p>
                                </div>
                            ) : (
                                messages.map((msg, idx) => {
                                    const isSystem = msg.content === "[SYSTEM:PLAN_UPDATE]";

                                    if (isSystem) {
                                        const isPatient = user?.role === "pacjent";
                                        const dateStr = new Date(msg.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });

                                        const contentBlock = (
                                            <div className="flex flex-col items-center justify-center text-center p-4">
                                                <span className="text-xs font-bold text-teal-400 uppercase tracking-wide">
                                                    Plan Rehabilitacji Zaktualizowany
                                                </span>
                                                <span className="text-[10px] text-muted mt-1">{dateStr}</span>
                                                {isPatient && (
                                                    <span className="text-xs text-emerald-400 mt-2 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 font-semibold group-hover:bg-emerald-500/20 transition-colors">
                                                        Kliknij aby przejść do planu
                                                    </span>
                                                )}
                                            </div>
                                        );

                                        return (
                                            <div key={idx} className="flex justify-center my-4 w-full">
                                                {isPatient ? (
                                                    <Link
                                                        href="/dashboard/plan"
                                                        className="w-full max-w-sm rounded-xl bg-panel border border-teal-500/30 hover:border-teal-500/60 shadow-lg shadow-teal-500/10 transition-all cursor-pointer no-underline group"
                                                    >
                                                        {contentBlock}
                                                    </Link>
                                                ) : (
                                                    <div className="w-full max-w-sm rounded-xl bg-panel/50 border border-outline/50 shadow-sm cursor-default">
                                                        {contentBlock}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }

                                    const isMe = msg.sender_id === user?.user_id;
                                    return (
                                        <div key={idx} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                                            <div className={`max-w-[70%] rounded-2xl px-5 py-3 shadow-sm ${isMe
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
