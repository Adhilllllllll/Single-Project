import React, { useState, useEffect } from "react";

// Mock data for the session
const MOCK_SESSION = {
    student: { name: "Emma Davis", initials: "ED", email: "emma@example.com" },
    advisor: { name: "Dr. Michael Johnson", initials: "MJ" },
    reviewer: { name: "You", initials: "YO" },
    domain: "Full Stack Development",
    duration: "60 minutes",
    project: "E-Commerce API",
};

// Mock chat messages
const MOCK_MESSAGES = [
    { id: 1, sender: "Emma Davis", initials: "ED", message: "Hello! I'm ready for the review.", time: "10:02 AM", isOwn: false },
    { id: 2, sender: "You", initials: "YO", message: "Great! Let's start with your project overview.", time: "10:03 AM", isOwn: true },
    { id: 3, sender: "Emma Davis", initials: "ED", message: "Sure, I'll share my screen now.", time: "10:04 AM", isOwn: false },
];

const ReviewSession = () => {
    // Control states (UI only)
    const [isMicOn, setIsMicOn] = useState(true);
    const [isCameraOn, setIsCameraOn] = useState(true);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [chatMessage, setChatMessage] = useState("");
    const [messages, setMessages] = useState(MOCK_MESSAGES);

    // Timer state
    const [timer, setTimer] = useState(0);

    // Timer effect
    useEffect(() => {
        const interval = setInterval(() => {
            setTimer((prev) => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // Format timer
    const formatTimer = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    // Send message (UI only)
    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!chatMessage.trim()) return;
        setMessages([
            ...messages,
            {
                id: Date.now(),
                sender: "You",
                initials: "YO",
                message: chatMessage,
                time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
                isOwn: true,
            },
        ]);
        setChatMessage("");
    };

    return (
        <div className="space-y-6">
            {/* Session Header */}
            <div className="flex justify-between items-center">
                <div>
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold text-slate-900">Review Session</h2>
                        <span className="px-2 py-1 bg-red-100 text-red-600 text-xs font-bold rounded-full flex items-center gap-1">
                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                            Live
                        </span>
                    </div>
                    <p className="text-slate-500">Live review with <span className="font-medium text-slate-700">{MOCK_SESSION.student.name}</span></p>
                </div>
                <div className="bg-purple-100 text-purple-700 px-4 py-2 rounded-lg text-sm font-bold">
                    Session Timer: {formatTimer(timer)}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Video & Controls */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Main Video Container */}
                    <div className="relative bg-slate-900 rounded-xl overflow-hidden aspect-video">
                        {/* Live indicator */}
                        <div className="absolute top-4 left-4 px-2 py-1 bg-red-600 text-white text-xs font-bold rounded flex items-center gap-1">
                            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                            LIVE
                        </div>

                        {/* Timer */}
                        <div className="absolute top-4 right-4 px-3 py-1 bg-black/50 text-white text-sm font-mono rounded">
                            ⏱️ {formatTimer(timer)}
                        </div>

                        {/* Center Avatar */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <div className="w-24 h-24 rounded-full bg-purple-600 flex items-center justify-center text-white text-3xl font-bold mb-3">
                                {MOCK_SESSION.student.initials}
                            </div>
                            <p className="text-white font-medium">{MOCK_SESSION.student.name}</p>
                            <p className="text-slate-400 text-sm">Student</p>
                        </div>

                        {/* Camera off indicator */}
                        {!isCameraOn && (
                            <div className="absolute bottom-4 left-4 text-slate-400 text-xs">
                                Camera is off
                            </div>
                        )}
                    </div>

                    {/* Screen Share Placeholder */}
                    <div className="bg-slate-100 border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center mb-3">
                            <svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <p className="text-slate-700 font-medium">Student Screen Share</p>
                        <p className="text-slate-500 text-sm">Waiting for student to share screen…</p>
                    </div>

                    {/* Control Bar */}
                    <div className="flex items-center justify-center gap-3 py-4">
                        {/* Microphone */}
                        <button
                            onClick={() => setIsMicOn(!isMicOn)}
                            className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isMicOn ? "bg-slate-200 text-slate-700 hover:bg-slate-300" : "bg-red-100 text-red-600"
                                }`}
                            title={isMicOn ? "Mute" : "Unmute"}
                        >
                            {isMicOn ? (
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                </svg>
                            ) : (
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                                </svg>
                            )}
                        </button>

                        {/* Camera */}
                        <button
                            onClick={() => setIsCameraOn(!isCameraOn)}
                            className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isCameraOn ? "bg-slate-200 text-slate-700 hover:bg-slate-300" : "bg-red-100 text-red-600"
                                }`}
                            title={isCameraOn ? "Turn off camera" : "Turn on camera"}
                        >
                            {isCameraOn ? (
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            ) : (
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                            )}
                        </button>

                        {/* Screen Share */}
                        <button
                            onClick={() => setIsScreenSharing(!isScreenSharing)}
                            className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isScreenSharing ? "bg-purple-600 text-white" : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                                }`}
                            title={isScreenSharing ? "Stop sharing" : "Share screen"}
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </button>

                        {/* End Call */}
                        <button
                            className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition-colors"
                            title="End call"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.28 3H5z" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Right Sidebar */}
                <div className="space-y-4">
                    {/* Participants Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-slate-900">Participants</h3>
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">3 Online</span>
                        </div>
                        <div className="space-y-3">
                            {/* Student */}
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-sm">
                                        {MOCK_SESSION.student.initials}
                                    </div>
                                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                                </div>
                                <div>
                                    <p className="font-medium text-slate-900 text-sm">{MOCK_SESSION.student.name}</p>
                                    <p className="text-xs text-slate-500">Student</p>
                                </div>
                            </div>
                            {/* Advisor */}
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                                        {MOCK_SESSION.advisor.initials}
                                    </div>
                                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                                </div>
                                <div>
                                    <p className="font-medium text-slate-900 text-sm">{MOCK_SESSION.advisor.name}</p>
                                    <p className="text-xs text-slate-500">Advisor</p>
                                </div>
                            </div>
                            {/* Reviewer (You) */}
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold text-sm">
                                        {MOCK_SESSION.reviewer.initials}
                                    </div>
                                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                                </div>
                                <div>
                                    <p className="font-medium text-slate-900 text-sm">{MOCK_SESSION.reviewer.name}</p>
                                    <p className="text-xs text-slate-500">Reviewer</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Session Information Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                        <h3 className="font-bold text-slate-900 mb-3">Session Information</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Student</span>
                                <span className="font-medium text-slate-900">{MOCK_SESSION.student.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Advisor</span>
                                <span className="font-medium text-slate-900">{MOCK_SESSION.advisor.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Domain</span>
                                <span className="font-medium text-slate-900">{MOCK_SESSION.domain}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Duration</span>
                                <span className="font-medium text-slate-900">{MOCK_SESSION.duration}</span>
                            </div>
                        </div>
                        <div className="mt-4 p-2 bg-green-50 border border-green-100 rounded-lg">
                            <p className="text-xs text-green-700 flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Attendance tracked – All participants present
                            </p>
                        </div>
                    </div>

                    {/* Chat Panel */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-80">
                        <div className="p-3 border-b border-slate-200">
                            <h3 className="font-bold text-slate-900">Chat</h3>
                        </div>
                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-3">
                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex gap-2 ${msg.isOwn ? "flex-row-reverse" : ""}`}>
                                    <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${msg.isOwn ? "bg-green-100 text-green-600" : "bg-purple-100 text-purple-600"
                                        }`}>
                                        {msg.initials}
                                    </div>
                                    <div className={`max-w-[75%] ${msg.isOwn ? "text-right" : ""}`}>
                                        <div className={`px-3 py-2 rounded-lg text-sm ${msg.isOwn ? "bg-purple-600 text-white" : "bg-slate-100 text-slate-700"
                                            }`}>
                                            {msg.message}
                                        </div>
                                        <span className="text-xs text-slate-400 mt-1 block">{msg.time}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {/* Input */}
                        <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={chatMessage}
                                    onChange={(e) => setChatMessage(e.target.value)}
                                    placeholder="Type a message..."
                                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                                />
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
                                >
                                    Send
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReviewSession;
