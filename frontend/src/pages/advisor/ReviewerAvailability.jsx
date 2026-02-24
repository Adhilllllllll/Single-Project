import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchReviewersAvailability,
  fetchAdvisorReviews,
} from "../../features/advisor/advisorSlice";
import AssignReviewModal from "../../components/AssignReviewModal";
import api from "../../api/axios";

// Map dayOfWeek numbers to day names
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Convert 24h time to 12h format
const formatTime = (time) => {
  if (!time) return "";
  const [hours, minutes] = time.split(":");
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

// Format time range
const formatTimeRange = (startTime, endTime) => {
  if (!startTime || !endTime) return "";
  const [startH] = startTime.split(":");
  const [endH] = endTime.split(":");
  const sH = parseInt(startH, 10);
  const eH = parseInt(endH, 10);
  const ampm = eH >= 12 ? "PM" : "AM";
  return `${sH % 12 || 12}-${eH % 12 || 12} ${ampm}`;
};

// Domain options
const DOMAINS = [
  "All Domains",
  "Python",
  "React",
  "DataScience",
  "JavaScript",
  "Node.js",
  "General",
];

const ReviewerAvailability = () => {
  const dispatch = useDispatch();
  const { reviewers, loading, error } = useSelector((state) => state.advisor);

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [domainFilter, setDomainFilter] = useState("All Domains");
  const [assignModal, setAssignModal] = useState({
    open: false,
    reviewer: null,
  });
  const [assignLoading, setAssignLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Date-specific availability state
  const [selectedDate, setSelectedDate] = useState("");
  const [dateSlots, setDateSlots] = useState([]);
  const [dateSlotsLoading, setDateSlotsLoading] = useState(false);

  useEffect(() => {
    dispatch(fetchReviewersAvailability());
  }, [dispatch]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // Fetch date-specific availability when date changes
  useEffect(() => {
    if (!selectedDate) {
      setDateSlots([]);
      return;
    }

    const fetchDateSlots = async () => {
      setDateSlotsLoading(true);
      try {
        const res = await api.get(
          `/reviewer/availability/by-date?date=${selectedDate}`,
        );
        setDateSlots(res.data || []);
      } catch (err) {
        console.error("Failed to fetch date slots:", err);
        setDateSlots([]);
      } finally {
        setDateSlotsLoading(false);
      }
    };
    fetchDateSlots();
  }, [selectedDate]);

  // Filter reviewers
  const filteredReviewers = useMemo(() => {
    return reviewers.filter((reviewer) => {
      const matchesSearch = reviewer.name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesDomain =
        domainFilter === "All Domains" ||
        reviewer.title?.includes(domainFilter) ||
        reviewer.domain?.includes(domainFilter);
      return matchesSearch && matchesDomain;
    });
  }, [reviewers, searchQuery, domainFilter]);

  // Group slots by day (Mon-Sat)
  const getSlotsByDay = (slots) => {
    const grouped = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    slots?.forEach((slot) => {
      if (slot.dayOfWeek >= 1 && slot.dayOfWeek <= 6) {
        grouped[slot.dayOfWeek].push(slot);
      }
    });
    return grouped;
  };

  // Handlers
  const handleOpenAssignModal = useCallback((reviewer = null) => {
    setAssignModal({ open: true, reviewer });
  }, []);

  const handleCloseAssignModal = useCallback(() => {
    setAssignModal({ open: false, reviewer: null });
  }, []);

  const handleAssignReview = async (data) => {
    setAssignLoading(true);
    setErrorMessage("");
    try {
      await api.post("/reviews", data);
      setSuccessMessage("Review assigned successfully!");
      handleCloseAssignModal();
      dispatch(fetchReviewersAvailability());
      dispatch(fetchAdvisorReviews());
    } catch (err) {
      console.error("Assign review error:", err);
      const message =
        err.response?.data?.message ||
        "Failed to assign review. Please try again.";
      setErrorMessage(message);
    } finally {
      setAssignLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">
          Reviewer Availability
        </h2>
        <p className="text-slate-500">
          Check reviewer schedules and assign reviews
        </p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          {successMessage}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* API Error Message */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {errorMessage}
        </div>
      )}

      {/* Search and Filter */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <svg
            className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search reviewers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <select
          value={domainFilter}
          onChange={(e) => setDomainFilter(e.target.value)}
          className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 min-w-32"
        >
          {DOMAINS.map((domain) => (
            <option key={domain} value={domain}>
              {domain}
            </option>
          ))}
        </select>
      </div>

      {/* Date-Specific Availability Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="font-semibold text-slate-900">
              Check Availability by Date
            </h3>
            <p className="text-sm text-slate-500">
              Select a date to see who's available
            </p>
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {dateSlotsLoading ? (
          <div className="flex items-center justify-center py-6">
            <div className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-2 text-slate-500 text-sm">Loading...</span>
          </div>
        ) : !selectedDate ? (
          <p className="text-slate-400 text-sm py-4">
            Select a date above to see available slots.
          </p>
        ) : dateSlots.length === 0 ? (
          <p className="text-amber-600 text-sm py-4">
            No availability found for{" "}
            {new Date(selectedDate).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
            .
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dateSlots.map((slot, index) => (
              <div
                key={slot._id || index}
                className="flex items-center justify-between p-3 bg-green-50 border border-green-100 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold">
                    {slot.reviewerId?.name?.charAt(0) || "R"}
                  </div>
                  <div>
                    <div className="font-medium text-slate-900 text-sm">
                      {slot.reviewerId?.name || "Unknown"}
                    </div>
                    <div className="text-xs text-green-700">
                      {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                    </div>
                  </div>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded ${slot.availabilityType === "specific" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}
                >
                  {slot.availabilityType === "specific" ? "One-time" : "Weekly"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      {loading.reviewers ? (
        <div className="flex justify-center items-center h-64">
          <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredReviewers.length === 0 ? (
        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center text-slate-400">
          {searchQuery || domainFilter !== "All Domains"
            ? "No reviewers match your filters"
            : "No reviewers found"}
        </div>
      ) : (
        <div className="space-y-6">
          {filteredReviewers.map((reviewer) => {
            const slotsByDay = getSlotsByDay(reviewer.slots);
            const status = reviewer.reviewerStatus || "available";

            return (
              <div
                key={reviewer._id}
                className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
              >
                {/* Reviewer Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center font-bold">
                        {reviewer.name?.charAt(0) || "R"}
                      </div>
                      {/* Status indicator dot */}
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                          status === "available"
                            ? "bg-green-500"
                            : status === "busy"
                              ? "bg-yellow-500"
                              : status === "dnd"
                                ? "bg-red-500"
                                : "bg-slate-400"
                        }`}
                      ></span>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">
                        {reviewer.name}
                      </div>
                      <div className="text-sm text-slate-500">
                        Domain: {reviewer.title}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded text-sm font-medium ${
                      status === "available"
                        ? "bg-green-100 text-green-700"
                        : status === "busy"
                          ? "bg-yellow-100 text-yellow-700"
                          : status === "dnd"
                            ? "bg-red-100 text-red-700"
                            : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {status === "available"
                      ? "Available"
                      : status === "busy"
                        ? "Busy"
                        : status === "dnd"
                          ? "Do Not Disturb"
                          : status}
                  </span>
                </div>

                {/* Weekly Availability Grid */}
                <div className="p-4">
                  <div className="text-sm font-medium text-slate-700 mb-3">
                    Weekly Availability
                  </div>
                  <div className="grid grid-cols-6 gap-3">
                    {WEEKDAYS.map((day, idx) => {
                      const dayNum = idx + 1;
                      const daySlots = slotsByDay[dayNum] || [];

                      return (
                        <div
                          key={day}
                          className="bg-slate-50 rounded-lg p-3 min-h-24"
                        >
                          <div className="text-xs font-semibold text-slate-600 mb-2">
                            {day}
                          </div>
                          <div className="space-y-1">
                            {daySlots.length > 0 ? (
                              daySlots.map((slot, i) => (
                                <div
                                  key={i}
                                  className="flex items-center gap-1 text-xs text-green-700"
                                >
                                  <svg
                                    className="w-3 h-3"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                  </svg>
                                  {formatTimeRange(
                                    slot.startTime,
                                    slot.endTime,
                                  )}
                                </div>
                              ))
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Specific Date Availability */}
                  {reviewer.specificSlots &&
                    reviewer.specificSlots.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <div className="text-sm font-medium text-slate-700 mb-2">
                          Upcoming Specific Dates
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {reviewer.specificSlots
                            .filter((slot) => {
                              const slotDate = new Date(slot.specificDate);
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              return slotDate >= today;
                            })
                            .slice(0, 5)
                            .map((slot, i) => {
                              const date = new Date(slot.specificDate);
                              const dateStr = date.toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              });
                              return (
                                <div
                                  key={i}
                                  className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs"
                                >
                                  <div className="font-semibold text-blue-700">
                                    {dateStr}
                                  </div>
                                  <div className="text-blue-600">
                                    {formatTime(slot.startTime)} -{" "}
                                    {formatTime(slot.endTime)}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}
                </div>

                {/* Assign Button */}
                <div className="px-4 pb-4">
                  <button
                    onClick={() => handleOpenAssignModal(reviewer)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                  >
                    Assign Review
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Assign Review Modal */}
      <AssignReviewModal
        isOpen={assignModal.open}
        onClose={handleCloseAssignModal}
        onSubmit={handleAssignReview}
        isLoading={assignLoading}
        preselectedReviewer={assignModal.reviewer}
      />
    </div>
  );
};

export default ReviewerAvailability;
