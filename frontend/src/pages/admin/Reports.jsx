import React from "react";
import Layout from "../../components/Layout";

const Reports = () => {
    return (
        <Layout>
            <div className="space-y-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Reports</h2>
                    <p className="text-slate-500">Generate and view system reports</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                    <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="text-lg font-medium text-slate-700 mb-2">Reports Module</h3>
                    <p className="text-slate-500">Report generation functionality coming soon</p>
                </div>
            </div>
        </Layout>
    );
};

export default Reports;
