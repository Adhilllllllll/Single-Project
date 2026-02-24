/**
 * ReviewRoom - Placeholder Page for Video Call Integration
 * 
 * CURRENT STATE: Placeholder UI
 * FUTURE STATE: WebRTC + Socket.IO video call interface
 * 
 * URL: /review-room/:reviewId
 * 
 * The reviewId serves as:
 *   1. Database reference to ReviewSession
 *   2. Socket.IO room identifier
 *   3. WebRTC signaling room identifier
 * 
 * No changes to this URL structure will be needed
 * when video calling is implemented.
 */

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import api from "../../api/axios";

const ReviewRoom = () => {
    const { reviewId } = useParams();
    const navigate = useNavigate();
    const { user, isAuthenticated } = useSelector((state) => state.auth);

    const [review, setReview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Redirect to login if not authenticated
        if (!isAuthenticated) {
            navigate("/login", { replace: true });
            return;
        }

        // Fetch review details to validate access
        const fetchReview = async () => {
            try {
                // Try to get review based on user role
                let endpoint = "";
                if (user?.role === "reviewer") {
                    endpoint = `/reviews/reviewer/${reviewId}`;
                } else if (user?.role === "advisor") {
                    endpoint = `/reviews/advisor/${reviewId}`;
                } else if (user?.role === "student") {
                    endpoint = `/reviews/student/${reviewId}/report`;
                }

                if (endpoint) {
                    const res = await api.get(endpoint);
                    setReview(res.data.review || res.data);
                }
            } catch (err) {
                console.error("Failed to fetch review:", err);
                setError("Unable to access this review room. Please check your permissions.");
            } finally {
                setLoading(false);
            }
        };

        fetchReview();
    }, [reviewId, isAuthenticated, user, navigate]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-slate-400 mt-4">Loading review room...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <div className="bg-slate-800 rounded-xl p-8 max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-white mb-2">Access Denied</h2>
                    <p className="text-slate-400 mb-6">{error}</p>
                    <button
                        onClick={() => navigate(-1)}
                        className="px-6 py-2.5 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-2xl p-8 max-w-lg w-full text-center">
                {/* Video Icon */}
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                </div>

                {/* Title */}
                <h1 className="text-2xl font-bold text-white mb-2">Video Call Coming Soon</h1>
                <p className="text-slate-400 mb-6">
                    The video call feature will be enabled before the scheduled review.
                </p>

                {/* Review Info */}
                {review && (
                    <div className="bg-slate-700/50 rounded-xl p-4 mb-6 text-left">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <span className="text-slate-500">Room ID</span>
                                <p className="text-slate-300 font-mono text-xs truncate">{reviewId}</p>
                            </div>
                            <div>
                                <span className="text-slate-500">Status</span>
                                <p className="text-green-400 capitalize">{review.status || "Scheduled"}</p>
                            </div>
                            {review.scheduledAt && (
                                <div className="col-span-2">
                                    <span className="text-slate-500">Scheduled</span>
                                    <p className="text-slate-300">
                                        {new Date(review.scheduledAt).toLocaleString()}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Future Integration Note */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
                    <div className="flex items-start gap-3 text-left">
                        <svg className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                            <p className="text-blue-400 font-medium text-sm">What to expect</p>
                            <p className="text-blue-300/70 text-xs mt-1">
                                This room will support real-time video calls between reviewers and students.
                                You'll receive a notification when the feature is ready.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex-1 px-4 py-2.5 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
                    >
                        Go Back
                    </button>
                    <button
                        onClick={() => window.location.reload()}
                        className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors"
                    >
                        Refresh
                    </button>
                </div>

                {/* Technical Footer */}
                <p className="text-slate-600 text-xs mt-6">
                    Room: {reviewId} • Socket.IO + WebRTC Ready
                </p>
            </div>
        </div>
    );
};

export default ReviewRoom;
