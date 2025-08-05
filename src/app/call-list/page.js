"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";

const CallList = () => {
    const [calls, setCalls] = useState([]);
    const [selectedCall, setSelectedCall] = useState(null);

    useEffect(() => {
        const fetchCalls = async () => {
            try {
                const res = await axios.post(
                    "https://api.retellai.com/v2/list-calls",
                    {
                        limit: 100,
                        sort_order: "descending",
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${process.env.NEXT_PUBLIC_RETELL_API_TOKEN}`,
                            "Content-Type": "application/json",
                        },
                    }
                );
                setCalls(res.data || []);
            } catch (error) {
                console.error("Error fetching call list:", error);
            }
        };

        fetchCalls();
    }, []);

    console.log("calls", calls);

    return (
        <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Call List</h2>
            <div className="overflow-x-auto rounded-md shadow border">
                <table className="w-full text-sm text-left text-gray-700">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="px-4 py-2">Time</th>
                            <th className="px-4 py-2">Duration</th>
                            <th className="px-4 py-2">Type</th>
                            <th className="px-4 py-2">Cost</th>
                            <th className="px-4 py-2">Call Status</th>
                            <th className="px-4 py-2">Disconnection Reason</th>
                            <th className="px-4 py-2">User Sentiment</th>
                            <th className="px-4 py-2">From Number</th>
                            <th className="px-4 py-2">To Number</th>
                            <th className="px-4 py-2">Logs</th>
                        </tr>
                    </thead>
                    <tbody>
                        {calls.map((call) => (
                            <tr
                                key={call.session_id}
                                className="hover:bg-gray-50 cursor-pointer"
                                onClick={() => setSelectedCall(call)}
                            >
                                <td className="px-4 py-2">{new Date(call.start_timestamp).toLocaleString()}</td>
                                <td className="px-4 py-2">{call.call_cost.total_duration_seconds || "0"} seconds</td>
                                <td className="px-4 py-2">{call.call_type}</td>
                                <td className="px-4 py-2">₹{call.call_cost.combined_cost.toFixed(2) || "0.00"}</td>
                                <td className="px-4 py-2">{call.call_status}</td>
                                <td className="px-4 py-2">{call.disconnection_reason}</td>
                                <td className="px-4 py-2">{call.call_analysis.user_sentiment}</td>
                                <td className="px-4 py-2">{call.from_number}</td>
                                <td className="px-4 py-2">{call.to_number}</td>
                                <td className="px-4 py-2 text-blue-500 underline">Call Logs</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {selectedCall && (
                <div className="mt-6 border rounded-lg p-4 shadow">
                    <h3 className="font-medium text-lg mb-2">Call Summary</h3>
                    <p><strong>To:</strong> {selectedCall.to_number}</p>
                    <p><strong>From:</strong> {selectedCall.from_number}</p>
                    <p><strong>Session ID:</strong> {selectedCall.session_id}</p>
                    <p><strong>User Sentiment:</strong> {selectedCall.user_sentiment}</p>
                    <p><strong>Disconnection Reason:</strong> {selectedCall.disconnection_reason}</p>
                    <p><strong>Transcript:</strong></p>
                    <pre className="bg-gray-50 p-2 mt-2 rounded text-sm overflow-x-auto max-h-60">
                        {selectedCall.transcript || "Transcript not available"}
                    </pre>
                </div>
            )}
        </div>
    );
};

export default CallList;
