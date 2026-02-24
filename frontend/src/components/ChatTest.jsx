import React, { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import api from "../api/axios";
import {
    getSocket,
    joinConversation,
    leaveConversation,
    sendChatMessage,
} from "../socket/socketClient";

/**
 * Chat Component with Contacts and Request Features
 */
const ChatTest = () => {
    const { user } = useSelector((state) => state.auth);
    const [conversations, setConversations] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [chatRequests, setChatRequests] = useState([]);
    const [activeConversation, setActiveConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("conversations");
    const [socketStatus, setSocketStatus] = useState("disconnected");
    const messagesEndRef = useRef(null);

    // Check socket status
    useEffect(() => {
        const checkSocket = () => {
            const socket = getSocket();
            setSocketStatus(socket?.connected ? "connected" : "disconnected");
        };
        checkSocket();
        const interval = setInterval(checkSocket, 2000);
        return () => clearInterval(interval);
    }, []);

    // Listen for new messages
    useEffect(() => {
        const handleNewMessage = (event) => {
            const message = event.detail;
            if (message.conversationId === activeConversation?._id) {
                setMessages((prev) => [...prev, message]);
            }
        };
        window.addEventListener("socket:chatMessage", handleNewMessage);
        return () => window.removeEventListener("socket:chatMessage", handleNewMessage);
    }, [activeConversation]);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Fetch data on mount
    useEffect(() => {
        fetchConversations();
        fetchContacts();
        if (user?.role === "advisor") {
            fetchChatRequests();
        }
    }, [user?.role]);

    const fetchConversations = async () => {
        try {
            setLoading(true);
            const res = await api.get("/chat/conversations");
            setConversations(res.data.conversations || []);
        } catch (err) {
            console.error("Failed to fetch conversations:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchContacts = async () => {
        try {
            const res = await api.get("/chat/contacts");
            setContacts(res.data.contacts || []);
        } catch (err) {
            console.error("Failed to fetch contacts:", err);
        }
    };

    const fetchChatRequests = async () => {
        try {
            const res = await api.get("/chat/requests?status=pending");
            setChatRequests(res.data.requests || []);
        } catch (err) {
            console.error("Failed to fetch chat requests:", err);
        }
    };

    const startConversationWithContact = async (contactId) => {
        try {
            const res = await api.post("/chat/conversations", { targetUserId: contactId });
            const conv = res.data.conversation;
            await fetchConversations();
            selectConversation(conv);
            setActiveTab("conversations");
        } catch (err) {
            alert(err.response?.data?.message || "Failed to start conversation");
        }
    };

    const requestChatWithReviewer = async (reviewerId) => {
        try {
            await api.post("/chat/request", { reviewerId, reason: "Need to discuss review questions" });
            alert("Chat request sent to advisor for approval!");
            fetchContacts();
        } catch (err) {
            alert(err.response?.data?.message || "Failed to send request");
        }
    };

    const approveChatRequest = async (requestId) => {
        try {
            await api.patch(`/chat/request/${requestId}/approve`);
            setChatRequests(prev => prev.filter(r => r._id !== requestId));
            alert("Chat request approved!");
        } catch (err) {
            alert(err.response?.data?.message || "Failed to approve");
        }
    };

    const rejectChatRequest = async (requestId) => {
        try {
            await api.patch(`/chat/request/${requestId}/reject`);
            setChatRequests(prev => prev.filter(r => r._id !== requestId));
            alert("Chat request rejected");
        } catch (err) {
            alert(err.response?.data?.message || "Failed to reject");
        }
    };

    const selectConversation = async (conv) => {
        if (activeConversation) {
            leaveConversation(activeConversation._id);
        }
        setActiveConversation(conv);
        joinConversation(conv._id);
        try {
            const res = await api.get(`/chat/${conv._id}/messages`);
            setMessages(res.data.messages || []);
        } catch (err) {
            console.error("Failed to fetch messages:", err);
        }
    };

    const handleSendMessage = () => {
        if (!newMessage.trim() || !activeConversation) return;
        sendChatMessage(activeConversation._id, newMessage);
        setNewMessage("");
    };

    return (
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
                <h2 className="text-lg font-bold">💬 Chat</h2>
                <div className="flex items-center gap-2 mt-1 text-sm">
                    <span className={`w-2 h-2 rounded-full ${socketStatus === "connected" ? "bg-green-400" : "bg-red-400"}`}></span>
                    Socket: {socketStatus}
                    <span className="text-blue-200">| {user?.name} ({user?.role})</span>
                    {user?.role === "advisor" && chatRequests.length > 0 && (
                        <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                            {chatRequests.length} pending requests
                        </span>
                    )}
                </div>
            </div>

            <div className="flex h-[450px]">
                {/* Sidebar */}
                <div className="w-72 border-r border-slate-200 flex flex-col">
                    {/* Tabs */}
                    <div className="flex border-b border-slate-200">
                        <button onClick={() => setActiveTab("conversations")} className={`flex-1 px-3 py-2 text-sm font-medium ${activeTab === "conversations" ? "border-b-2 border-blue-600 text-blue-600" : "text-slate-500"}`}>
                            Chats
                        </button>
                        <button onClick={() => setActiveTab("contacts")} className={`flex-1 px-3 py-2 text-sm font-medium ${activeTab === "contacts" ? "border-b-2 border-blue-600 text-blue-600" : "text-slate-500"}`}>
                            Contacts
                        </button>
                        {user?.role === "advisor" && (
                            <button onClick={() => setActiveTab("requests")} className={`flex-1 px-3 py-2 text-sm font-medium relative ${activeTab === "requests" ? "border-b-2 border-blue-600 text-blue-600" : "text-slate-500"}`}>
                                Requests
                                {chatRequests.length > 0 && (
                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                                        {chatRequests.length}
                                    </span>
                                )}
                            </button>
                        )}
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 overflow-y-auto">
                        {activeTab === "conversations" && (
                            <>
                                {loading ? (
                                    <div className="p-4 text-center text-slate-400">Loading...</div>
                                ) : conversations.length === 0 ? (
                                    <div className="p-4 text-center text-slate-400 text-sm">No conversations yet. Select a contact to start chatting!</div>
                                ) : (
                                    conversations.map((conv) => (
                                        <div key={conv._id} onClick={() => selectConversation(conv)} className={`p-3 border-b cursor-pointer hover:bg-slate-50 ${activeConversation?._id === conv._id ? "bg-blue-50" : ""}`}>
                                            <div className="font-medium text-sm">{conv.otherParticipant?.name || "Unknown"}</div>
                                            <div className="text-xs text-slate-500 truncate">{conv.lastMessage || "No messages"}</div>
                                        </div>
                                    ))
                                )}
                            </>
                        )}

                        {activeTab === "contacts" && (
                            <>
                                {contacts.length === 0 ? (
                                    <div className="p-4 text-center text-slate-400 text-sm">No contacts available</div>
                                ) : (
                                    contacts.map((contact) => (
                                        <div key={contact._id} className="p-3 border-b flex items-center justify-between hover:bg-slate-50">
                                            <div>
                                                <div className="font-medium text-sm">{contact.name}</div>
                                                <div className="text-xs text-slate-500">{contact.role}</div>
                                            </div>
                                            {contact.canRequestChat ? (
                                                <button onClick={() => requestChatWithReviewer(contact._id)} className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded hover:bg-yellow-200">
                                                    Request
                                                </button>
                                            ) : (
                                                <button onClick={() => startConversationWithContact(contact._id)} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200">
                                                    Chat
                                                </button>
                                            )}
                                        </div>
                                    ))
                                )}
                            </>
                        )}

                        {activeTab === "requests" && user?.role === "advisor" && (
                            <>
                                {chatRequests.length === 0 ? (
                                    <div className="p-4 text-center text-slate-400 text-sm">No pending requests</div>
                                ) : (
                                    chatRequests.map((req) => (
                                        <div key={req._id} className="p-3 border-b">
                                            <div className="text-sm font-medium">{req.studentId?.name}</div>
                                            <div className="text-xs text-slate-500">wants to chat with {req.reviewerId?.name}</div>
                                            <div className="text-xs text-slate-400 mt-1">{req.reason}</div>
                                            <div className="flex gap-2 mt-2">
                                                <button onClick={() => approveChatRequest(req._id)} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200">
                                                    Approve
                                                </button>
                                                <button onClick={() => rejectChatRequest(req._id)} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200">
                                                    Reject
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 flex flex-col">
                    {activeConversation ? (
                        <>
                            <div className="p-3 border-b bg-slate-50">
                                <div className="font-medium">{activeConversation.otherParticipant?.name}</div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {messages.length === 0 ? (
                                    <div className="text-center text-slate-400 text-sm">No messages yet</div>
                                ) : (
                                    messages.map((msg, idx) => (
                                        <div key={msg._id || idx} className={`flex ${msg.senderId === user?._id || msg.senderId === user?.id ? "justify-end" : "justify-start"}`}>
                                            <div className={`max-w-xs px-3 py-2 rounded-lg ${msg.senderId === user?._id || msg.senderId === user?.id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-800"}`}>
                                                <div className="text-sm">{msg.content}</div>
                                                <div className={`text-xs mt-1 ${msg.senderId === user?._id || msg.senderId === user?.id ? "text-blue-200" : "text-slate-400"}`}>
                                                    {new Date(msg.createdAt).toLocaleTimeString()}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                            <div className="p-3 border-t">
                                <div className="flex gap-2">
                                    <input type="text" placeholder="Type a message..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyPress={(e) => e.key === "Enter" && handleSendMessage()} className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    <button onClick={handleSendMessage} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Send</button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-slate-400">
                            Select a conversation or contact to start chatting
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChatTest;
