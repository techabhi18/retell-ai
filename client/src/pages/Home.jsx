import React, { useState } from "react";
import Papa from "papaparse";
import axios from "axios";

const MAX_ROWS = 15;

export default function Home() {
    const [csvData, setCsvData] = useState([]);
    const [headers, setHeaders] = useState([]);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [batchName, setBatchName] = useState("");
    const [fileName, setFileName] = useState("");

    const handleFileUpload = (e) => {
        setError("");
        const file = e.target.files[0];
        if (!file) return;
        setFileName(file.name);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: function (results) {
                const rows = results.data;
                if (rows.length > MAX_ROWS) {
                    setError("Maximum 15 rows allowed.");
                    return;
                }

                const firstRow = rows[0];
                const cols = Object.keys(firstRow);
                if (!cols.includes("phone number")) {
                    setError("CSV must include 'phone number' column.");
                    return;
                }

                setHeaders(cols);
                setCsvData(rows);
            },
            error: function (err) {
                setError("Failed to parse CSV: " + err.message);
            },
        });
    };

    const handleTriggerCall = async () => {
        setLoading(true);
        if (csvData.length === 0 || !batchName) {
            setError("Please fill in all required fields and upload a valid CSV.");
            return;
        }

        const tasks = csvData.map((row) => {
            const { ["phone number"]: to_number, ...rest } = row;
            return {
                to_number: `+${to_number}`,
                retell_llm_dynamic_variables: rest,
            };
        });

        try {
            await axios.post(
                "https://api.retellai.com/create-batch-call",
                {
                    name: batchName,
                    from_number: "+16178907576",
                    tasks,
                },
                {
                    headers: {
                        Authorization: `Bearer ${import.meta.env.VITE_RETELL_API_TOKEN}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            setMessage("Batch call triggered successfully. Recipients will receive the call shortly.");
            setCsvData([]);
            setHeaders([]);
            setBatchName("");
            setFileName("");
            setError("");
        } catch (err) {
            setError(err.response?.data?.message || "Failed to trigger call. Please try again.");
            setMessage("");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h2 className="text-2xl font-bold m-auto my-10 text-center">Send Batch Call</h2>
            <div className="flex flex-col lg:flex-row gap-6 max-w-6xl mx-auto mt-10 p-6">
                <div className="w-full lg:w-1/2 space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Batch Call Name</label>
                        <input
                            type="text"
                            value={batchName}
                            onChange={(e) => setBatchName(e.target.value)}
                            placeholder="Enter"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring focus:border-blue-300"
                        />
                    </div>

                    <div>
                        <div className="block text-sm font-medium text-gray-700 mb-1">From number</div>
                        <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed">+1(617)890-7576 (AI Voice Agent)</div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Upload Recipients</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="file"
                                accept=".csv"
                                onChange={handleFileUpload}
                                className="block w-full text-sm text-gray-900 bg-gray-50 border border-gray-300 rounded-lg cursor-pointer focus:outline-none p-2"
                            />
                        </div>
                        {fileName && (
                            <div className="mt-2 flex items-center gap-2">
                                <span className="bg-red-100 text-red-800 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded">CSV</span>
                                <span className="text-sm text-gray-600">{fileName}</span>
                            </div>
                        )}
                    </div>

                    {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
                    {message && <div className="text-green-500 text-sm mt-2">{message}</div>}

                    <button
                        onClick={handleTriggerCall}
                        disabled={csvData.length === 0 || !batchName}
                        className={`mt-4 w-full px-4 py-2 text-white rounded-md font-medium transition duration-150 cursor-pointer bg-blue-500 ${csvData.length === 0 || !batchName || loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                        {loading ? "Sending..." : "Send"}
                    </button>
                </div>

                <div className="w-full lg:w-1/2 overflow-x-auto border border-gray-200 rounded-lg">
                    {csvData.length > 0 && (
                        <table className="min-w-full text-sm text-left text-gray-700">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-4 py-2">ID</th>
                                    {headers.map((header, idx) => (
                                        <th key={idx} className="px-4 py-2 capitalize">{header}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {csvData.map((row, idx) => (
                                    <tr key={idx} className="border-b hover:bg-gray-50">
                                        <td className="px-4 py-2">{idx + 1}</td>
                                        {headers.map((key, i) => (
                                            <td key={i} className="px-4 py-2">{row[key]}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
