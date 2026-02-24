import React from "react";
import ChatTest from "../../components/ChatTest";

const Chat = () => {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-900">Chat</h2>
                <p className="text-slate-500">Communicate with students and reviewers</p>
            </div>

            {/* Real-time Chat Component */}
            <ChatTest />
        </div>
    );
};

export default Chat;
