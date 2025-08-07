import React, { useEffect, useState, useRef } from "react";
import axios from "axios";

const CallList = () => {
  const [allCalls, setAllCalls] = useState([]);
  const [displayedCalls, setDisplayedCalls] = useState([]);
  const [selectedCall, setSelectedCall] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationKey, setPaginationKey] = useState(null);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const sidebarRef = useRef(null);
  const callsPerPage = 50;

  const fetchCalls = async (pagination_key = null) => {
    setIsFetching(true);
    setLoading(true);
    try {
      const params = {
        limit: callsPerPage,
        sort_order: "descending",
      };
      if (pagination_key) {
        params.pagination_key = pagination_key;
      }
      const res = await axios.post(
        "https://api.retellai.com/v2/list-calls",
        params,
        {
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_RETELL_API_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );
      const fetchedCalls = res.data || [];

      if (pagination_key) {
        setAllCalls((prev) => [...prev, ...fetchedCalls]);
      } else {
        setAllCalls(fetchedCalls);
      }

      setHasMoreData(fetchedCalls.length === callsPerPage);

      if (fetchedCalls.length > 0) {
        setPaginationKey(fetchedCalls[fetchedCalls.length - 1].call_id);
      } else {
        setPaginationKey(null);
      }
    } catch (error) {
      console.error("Error fetching call list:", error);
    } finally {
      setIsFetching(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalls();
  }, []);

  useEffect(() => {
    const start = (currentPage - 1) * callsPerPage;
    const end = start + callsPerPage;
    setDisplayedCalls(allCalls.slice(start, end));
  }, [currentPage, allCalls]);

  const handleNextPage = () => {
    const nextPage = currentPage + 1;
    const start = (nextPage - 1) * callsPerPage;

    if (start >= allCalls.length && hasMoreData && !isFetching) {
      fetchCalls(paginationKey).then(() => {
        setCurrentPage(nextPage);
      });
    } else {
      setCurrentPage(nextPage);
    }
  };

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const formatDuration = (seconds) => {
    if (!seconds) return "0";

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    let result = [];
    if (hours > 0) result.push(`${hours} hr`);
    if (minutes > 0) result.push(`${minutes} min`);
    if (secs > 0 || result.length === 0) result.push(`${secs}`);

    return result.join(" ");
  };

  const formatCost = (costValue) => {
    if (!costValue) return "0.000";

    const str = String(costValue).replace("$", "");

    const floatVal = parseFloat(str);
    if (isNaN(floatVal)) return "0.000";

    const adjusted = floatVal / 100;
    return adjusted.toFixed(3);
  };

  const isFirstPage = currentPage === 1;
  const isLastPage =
    !hasMoreData && currentPage * callsPerPage >= allCalls.length;

  console.log("displayedCalls", displayedCalls);

  return (
    <div className="relative w-full">
      <div className="p-6">
        <h2 className="text-lg font-semibold mb-4">Call List</h2>
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : displayedCalls.length === 0 ? (
          <div className="text-center py-10 text-gray-500">No calls found</div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-md shadow border">
              <table className="min-w-full text-sm text-left text-gray-700">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 whitespace-nowrap">#</th>
                    <th className="px-4 py-2 whitespace-nowrap">Time</th>
                    <th className="px-4 py-2 whitespace-nowrap">Duration</th>
                    <th className="px-4 py-2 whitespace-nowrap">Cost</th>
                    <th className="px-4 py-2 whitespace-nowrap">Call Status</th>
                    <th className="px-4 py-2 whitespace-nowrap">
                      Disconnection Reason
                    </th>
                    <th className="px-4 py-2 whitespace-nowrap">
                      User Sentiment
                    </th>
                    <th className="px-4 py-2 whitespace-nowrap">Successful</th>
                    <th className="px-4 py-2 whitespace-nowrap">From Number</th>
                    <th className="px-4 py-2 whitespace-nowrap">To Number</th>
                    <th className="px-4 py-2 whitespace-nowrap">Logs</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedCalls.map((call, index) => (
                    <tr
                      key={call.call_id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedCall(call)}
                    >
                      <td className="px-5 py-3">
                        {(currentPage - 1) * callsPerPage + index + 1}
                      </td>
                      <td className="px-5 py-3">
                        {new Date(call.start_timestamp).toLocaleString()}
                      </td>
                      <td className="px-5 py-3">
                        {formatDuration(
                          call.call_cost?.total_duration_seconds
                        ) || "0"}{" "}
                        sec
                      </td>
                      <td className="px-5 py-3">
                        ${formatCost(call.call_cost?.combined_cost) || "0.00"}
                      </td>
                      <td className="px-5 py-3">{call.call_status || "-"}</td>
                      <td className="px-5 py-3">
                        {call.disconnection_reason || "-"}
                      </td>
                      <td className="px-5 py-3">
                        {call.call_analysis?.user_sentiment || "-"}
                      </td>
                      <td className="px-5 py-3">
                        {call.call_analysis?.call_successful
                          ? "Yes"
                          : "No" || "-"}
                      </td>
                      <td className="px-5 py-3">{call.from_number || "-"}</td>
                      <td className="px-5 py-3">{call.to_number || "-"}</td>
                      <td className="px-5 py-3 text-blue-500 underline">
                        Call Logs
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-500">
                Showing {(currentPage - 1) * callsPerPage + 1} to{" "}
                {(currentPage - 1) * callsPerPage + displayedCalls.length} of{" "}
                {hasMoreData ? "many" : allCalls.length} calls
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handlePrevPage}
                  disabled={isFirstPage || isFetching}
                  className={`px-4 py-2 rounded ${isFirstPage || isFetching
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-blue-500 text-white hover:bg-blue-600 cursor-pointer"
                    }`}
                >
                  Previous
                </button>
                <button
                  onClick={handleNextPage}
                  disabled={isLastPage || isFetching}
                  className={`px-4 py-2 rounded ${isLastPage || isFetching
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-blue-500 text-white hover:bg-blue-600 cursor-pointer"
                    }`}
                >
                  Next
                </button>
              </div>
            </div>
            {isLastPage && (
              <div className="text-center mt-2 text-gray-500">
                That's it, you have seen all calls
              </div>
            )}
          </>
        )}
      </div>
      <div
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ease-in-out ${selectedCall ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        onClick={() => setSelectedCall(null)}
      />
      <div
        ref={sidebarRef}
        className={`fixed top-0 right-0 h-full w-full sm:w-[60%] md:w-[50%] lg:w-[40%] bg-white z-50 shadow-xl transform transition-transform duration-300 ease-in-out ${selectedCall ? "translate-x-0" : "translate-x-full"
          }`}
      >
        <div className="p-6 h-full overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-lg">Call Details</h3>
            <button
              className="text-gray-500 hover:text-gray-700 text-xl cursor-pointer"
              onClick={() => setSelectedCall(null)}
            >
              &times;
            </button>
          </div>
          {selectedCall && (
            <div className="space-y-3 text-sm">
              <div>
                <strong>Time:</strong>{" "}
                {new Date(selectedCall.start_timestamp).toLocaleString()}
              </div>
              <div>
                <strong>Duration:</strong>{" "}
                {formatDuration(
                  selectedCall.call_cost?.total_duration_seconds
                ) || "0"}{" "}
                sec
              </div>
              <div>
                <strong>Cost:</strong> 
                ${formatCost(selectedCall.call_cost?.combined_cost) || "0.00"}
              </div>
              <div>
                <strong>Call Status:</strong> {selectedCall.call_status}
              </div>
              <div>
                <strong>Disconnection Reason:</strong>{" "}
                {selectedCall.disconnection_reason}
              </div>
              <div>
                <strong>User Sentiment:</strong>{" "}
                {selectedCall.call_analysis?.user_sentiment}
              </div>
              <div>
                <strong>Call Successful:</strong>{" "}
                {selectedCall.call_analysis?.call_successful ? "Yes" : "No"}
              </div>
              <div>
                <strong>From:</strong> {selectedCall.from_number}
              </div>
              <div>
                <strong>To:</strong> {selectedCall.to_number}
              </div>
              <div>
                <strong>Call ID:</strong> {selectedCall?.call_id}
              </div>
              <div>
                <strong>Type:</strong> {selectedCall?.direction}
              </div>
              <div>
                <strong>Summary:</strong>
              </div>
              <div className="bg-gray-50 p-3 rounded text-xs max-h-[400px] overflow-y-auto">
                {selectedCall?.call_analysis?.call_summary ||
                  "Summary not available"}
              </div>
              <div>
                <strong>Transcript:</strong>
              </div>
              <pre className="bg-gray-50 p-3 rounded text-xs max-h-[400px] overflow-y-auto">
                {selectedCall?.transcript || "Transcript not available"}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CallList;
