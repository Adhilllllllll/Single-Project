import  React, { useState, useEffect } from "react";
import api from "../../api/axios";

const RecentActivity = () => {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchActivities();
    }, []);

    const fetchActivities = async () => {
        try {
            setLoading(true);
            const res = await api.get("/admin/recent-activity");
            setActivities(res.data.activities || []);
        } catch (err) {
            console.error("Failed to fetch activities:", err);
        } finally {
            setLoading(false);
        }
    };



    const getActivityColor = (type) => {
        switch (type) {
            case "complete":
                return "bg-green-500";
            case "add":
                return "bg-blue-500";
            case "pending":
                return "bg-amber-500";
            case "register":
                return "bg-purple-500";
            default:
                return "bg-slate-400";
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-slate-900">Recent Activity</h2>
                <p className="text-slate-500">Track all system activities and events</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-slate-900">Activity Feed</h3>
                    <button
                        onClick={fetchActivities}
                        className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                        Refresh
                    </button>
                </div>
                <div className="p-6 space-y-6">
                    {loading ? (
                        <div className="text-center py-4 text-slate-500">Loading activities...</div>
                    ) : activities.length === 0 ? (
                        <div className="text-center py-4 text-slate-500">No recent activities</div>
                    ) : (
                        activities.map((act) => (
                            <div key={act.id} className="flex gap-4">
                                <div className={`mt-1 flex-shrink-0 w-2.5 h-2.5 rounded-full ${getActivityColor(act.type)}`} />
                                <div>
                                    <p className="text-sm text-slate-800 leading-snug">{act.message}</p>
                                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        {act.time}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};



export default RecentActivity;

//complet
