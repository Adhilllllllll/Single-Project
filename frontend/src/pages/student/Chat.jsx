import React from "react";
import ChatTest from "../../components/ChatTest";

const Chat = () => {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-900">Chat with Advisor</h2>

            {/* Real-time Chat Component */}
            <ChatTest />
        </div>
    );
};

export default Chat;
