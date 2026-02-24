import React from "react";

/* ============================================
   Tab Switcher Component
   Reusable tab navigation component
============================================ */
const TabSwitcher = React.memo(({ tabs, activeTab, onTabChange }) => {
    return (
        <div className="flex border-b border-slate-200">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`px-4 py-3 text-sm font-medium transition-colors relative ${activeTab === tab.id
                            ? "text-orange-600"
                            : "text-slate-500 hover:text-slate-700"
                        }`}
                >
                    {tab.label}
                    {activeTab === tab.id && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500"></span>
                    )}
                </button>
            ))}
        </div>
    );
});

TabSwitcher.displayName = "TabSwitcher";

/* ============================================
   Status Badge Component
   Reusable status indicator
============================================ */
const StatusBadge = React.memo(({ status, variant = "default" }) => {
    const getStyles = () => {
        switch (status?.toLowerCase()) {
            case "completed":
                return "bg-green-100 text-green-700";
            case "in progress":
                return "bg-yellow-100 text-yellow-700";
            case "pending":
                return "bg-slate-100 text-slate-600";
            case "upcoming":
                return "bg-blue-100 text-blue-700";
            case "attended":
                return "bg-green-100 text-green-700";
            case "not attended":
                return "bg-slate-100 text-slate-600";
            default:
                return "bg-slate-100 text-slate-600";
        }
    };

    return (
        <span className={`px-3 py-1 rounded text-xs font-medium ${getStyles()}`}>
            {status}
        </span>
    );
});

StatusBadge.displayName = "StatusBadge";

/* ============================================
   Priority Badge Component
   Reusable priority indicator
============================================ */
const PriorityBadge = React.memo(({ priority }) => {
    const getStyles = () => {
        switch (priority?.toLowerCase()) {
            case "high":
                return "bg-red-100 text-red-700";
            case "medium":
                return "bg-yellow-100 text-yellow-700";
            case "low":
                return "bg-blue-100 text-blue-700";
            default:
                return "bg-slate-100 text-slate-600";
        }
    };

    return (
        <span className={`px-3 py-1 rounded text-xs font-medium ${getStyles()}`}>
            {priority}
        </span>
    );
});

PriorityBadge.displayName = "PriorityBadge";

/* ============================================
   Attendance Badge Component
   Shows attended status with checkmark icon
============================================ */
const AttendanceBadge = React.memo(({ attended }) => {
    if (attended) {
        return (
            <span className="flex items-center gap-1 text-green-600 text-sm">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Attended
            </span>
        );
    }
    return <span className="text-slate-500 text-sm">Not Attended</span>;
});

AttendanceBadge.displayName = "AttendanceBadge";

/* ============================================
   Reusable Data Table Component
============================================ */
const DataTable = React.memo(({ columns, data, renderRow, emptyMessage = "No data available" }) => {
    if (!data || data.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                <svg className="w-12 h-12 mx-auto text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-slate-500">{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase text-xs">
                    <tr>
                        {columns.map((col) => (
                            <th key={col.key} className="px-6 py-4">
                                {col.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {data.map((row, index) => renderRow(row, index))}
                </tbody>
            </table>
        </div>
    );
});

DataTable.displayName = "DataTable";

export { TabSwitcher, StatusBadge, PriorityBadge, AttendanceBadge, DataTable };
