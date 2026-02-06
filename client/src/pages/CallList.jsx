import { useEffect, useState, useRef } from "react";
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
  const [filterType, setFilterType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const sidebarRef = useRef(null);
  const callsPerPage = 50;

  const fetchCalls = async (
    pagination_key = null,
    type = filterType,
    start = startDate,
    end = endDate,
  ) => {
    setIsFetching(true);
    setLoading(true);
    try {
      const params = {
        limit: callsPerPage,
        sort_order: "descending",
      };

      const filterCriteria = {};

      if (type === "Support") {
        filterCriteria.from_number = ["+12182745624", "+912250323317"];
        filterCriteria.to_number = ["+12182745624", "+912250323317"];
      } else if (type === "Sales")
        filterCriteria.from_number = ["+12182504277", "+912250323032"];

      if (start || end) {
        filterCriteria.start_timestamp = {};
        const startDay = new Date(start || end);
        const endDay = new Date(end || start);
        startDay.setHours(0, 0, 0, 0);
        endDay.setHours(23, 59, 59, 999);
        filterCriteria.start_timestamp.lower_threshold = startDay.getTime();
        filterCriteria.start_timestamp.upper_threshold = endDay.getTime();
      }

      if (pagination_key) params.pagination_key = pagination_key;
      if (Object.keys(filterCriteria).length > 0)
        params.filter_criteria = filterCriteria;

      const res = await axios.post(
        "https://api.retellai.com/v2/list-calls",
        params,
        {
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_RETELL_API_TOKEN}`,
            "Content-Type": "application/json",
          },
        },
      );

      const fetchedCalls = res.data || [];
      setAllCalls((prev) =>
        pagination_key ? [...prev, ...fetchedCalls] : fetchedCalls,
      );
      setHasMoreData(fetchedCalls.length === callsPerPage);
      setPaginationKey(
        fetchedCalls.length > 0
          ? fetchedCalls[fetchedCalls.length - 1].call_id
          : null,
      );
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
    setDisplayedCalls(
      allCalls.slice(
        (currentPage - 1) * callsPerPage,
        currentPage * callsPerPage,
      ),
    );
  }, [currentPage, allCalls]);
  useEffect(() => {
    setCurrentPage(1);
    fetchCalls(null, filterType, startDate, endDate);
  }, [filterType, startDate, endDate]);

  const handleNextPage = () => {
    const nextPage = currentPage + 1;
    const start = (nextPage - 1) * callsPerPage;
    if (start >= allCalls.length && hasMoreData && !isFetching)
      fetchCalls(paginationKey, filterType, startDate, endDate).then(() =>
        setCurrentPage(nextPage),
      );
    else setCurrentPage(nextPage);
  };

  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));

  const formatDuration = (seconds) => {
    if (!seconds) return "0 sec";
    const h = Math.floor(seconds / 3600),
      m = Math.floor((seconds % 3600) / 60),
      s = seconds % 60;
    return `${h > 0 ? h + " hr " : ""}${m > 0 ? m + " min " : ""}${s} sec`;
  };

  const formatCost = (costValue) => {
    if (!costValue) return "0.000";
    const val = parseFloat(String(costValue).replace("$", "")) / 100;
    return isNaN(val) ? "0.000" : val.toFixed(3);
  };

  const isFirstPage = currentPage === 1;
  const isLastPage =
    !hasMoreData && currentPage * callsPerPage >= allCalls.length;

  return (
    <div className="relative w-full min-h-screen bg-gray-50">
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Call List</h2>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">
              Filter Type:
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-400 focus:outline-none"
            >
              <option value="">All</option>
              <option value="Sales">Sales</option>
              <option value="Support">Support</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">
              Start Date:
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-400 focus:outline-none"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">
              End Date:
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : displayedCalls.length === 0 ? (
          <div className="text-center py-16 text-gray-500 text-lg">
            No calls found
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg shadow border border-gray-200 bg-white">
              <table className="min-w-full text-sm text-left text-gray-700 border-collapse">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 border-b border-gray-300">#</th>
                    <th className="px-4 py-3 border-b border-gray-300">Time</th>
                    <th className="px-4 py-3 border-b border-gray-300">
                      Duration
                    </th>
                    <th className="px-4 py-3 border-b border-gray-300">Cost</th>
                    <th className="px-4 py-3 border-b border-gray-300">
                      Call Status
                    </th>
                    <th className="px-4 py-3 border-b border-gray-300">
                      Disconnection Reason
                    </th>
                    <th className="px-4 py-3 border-b border-gray-300">
                      User Sentiment
                    </th>
                    <th className="px-4 py-3 border-b border-gray-300">
                      Successful
                    </th>
                    <th className="px-4 py-3 border-b border-gray-300">
                      From Number
                    </th>
                    <th className="px-4 py-3 border-b border-gray-300">
                      To Number
                    </th>
                    <th className="px-4 py-3 border-b border-gray-300">Logs</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedCalls.map((call, index) => (
                    <tr
                      key={call.call_id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => setSelectedCall(call)}
                    >
                      <td className="px-5 py-4 border-b border-gray-300">
                        {(currentPage - 1) * callsPerPage + index + 1}
                      </td>
                      <td className="px-5 py-4 border-b border-gray-300">
                        {new Date(call.start_timestamp).toLocaleString()}
                      </td>
                      <td className="px-5 py-4 border-b border-gray-300">
                        {formatDuration(call.call_cost?.total_duration_seconds)}
                      </td>
                      <td className="px-5 py-4 border-b border-gray-300">
                        ${formatCost(call.call_cost?.combined_cost)}
                      </td>
                      <td className="px-5 py-4 border-b border-gray-300">
                        {call.call_status || "-"}
                      </td>
                      <td className="px-5 py-4 border-b border-gray-300">
                        {call.disconnection_reason || "-"}
                      </td>
                      <td className="px-5 py-4 border-b border-gray-300">
                        {call.call_analysis?.user_sentiment || "-"}
                      </td>
                      <td className="px-5 py-4 border-b border-gray-300">
                        {call.call_analysis?.call_successful ? "Yes" : "No"}
                      </td>
                      <td className="px-5 py-4 border-b border-gray-300">
                        {call.from_number || "-"}
                      </td>
                      <td className="px-5 py-4 border-b border-gray-300">
                        {call.to_number || "-"}
                      </td>
                      <td className="px-5 py-4 border-b text-blue-500 border-gray-300 underline">
                        Call Logs
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center mt-6">
              <div className="text-sm text-gray-600">
                Showing {(currentPage - 1) * callsPerPage + 1} to{" "}
                {(currentPage - 1) * callsPerPage + displayedCalls.length} of{" "}
                {hasMoreData ? "many" : allCalls.length} calls
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handlePrevPage}
                  disabled={isFirstPage || isFetching}
                  className={`px-5 py-2 rounded-md font-medium text-sm ${
                    isFirstPage || isFetching
                      ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                      : "bg-blue-500 text-white hover:bg-blue-600"
                  }`}
                >
                  Previous
                </button>
                <button
                  onClick={handleNextPage}
                  disabled={isLastPage || isFetching}
                  className={`px-5 py-2 rounded-md font-medium text-sm ${
                    isLastPage || isFetching
                      ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                      : "bg-blue-500 text-white hover:bg-blue-600"
                  }`}
                >
                  Next
                </button>
              </div>
            </div>

            {isLastPage && (
              <div className="text-center mt-3 text-gray-500 text-sm">
                That's it, you have seen all calls
              </div>
            )}
          </>
        )}
      </div>

      {/* Sidebar */}
      <div
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ease-in-out ${
          selectedCall ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setSelectedCall(null)}
      />
      <div
        ref={sidebarRef}
        className={`fixed top-0 right-0 h-full w-full sm:w-[60%] md:w-[50%] lg:w-[40%] bg-white z-50 shadow-2xl transform transition-transform duration-300 ease-in-out ${
          selectedCall ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-6 h-full overflow-y-auto">
          <div className="flex justify-between items-center mb-5 border-b pb-3 border-gray-300">
            <h3 className="font-semibold text-xl text-gray-800">
              Call Details
            </h3>
            <button
              className="text-gray-500 hover:text-gray-700 text-2xl cursor-pointer"
              onClick={() => setSelectedCall(null)}
            >
              &times;
            </button>
          </div>
          {selectedCall && (
            <div className="space-y-4 text-sm text-gray-700">
              {[
                [
                  "Time",
                  new Date(selectedCall.start_timestamp).toLocaleString(),
                ],
                [
                  "Duration",
                  formatDuration(
                    selectedCall.call_cost?.total_duration_seconds,
                  ),
                ],
                [
                  "Cost",
                  `$${formatCost(selectedCall.call_cost?.combined_cost)}`,
                ],
                ["Call Status", selectedCall.call_status],
                ["Disconnection Reason", selectedCall.disconnection_reason],
                ["User Sentiment", selectedCall.call_analysis?.user_sentiment],
                [
                  "Call Successful",
                  selectedCall.call_analysis?.call_successful ? "Yes" : "No",
                ],
                ["From", selectedCall.from_number],
                ["To", selectedCall.to_number],
                ["Call ID", selectedCall.call_id],
                ["Type", selectedCall.direction],
              ].map(([label, value]) => (
                <div key={label}>
                  <strong>{label}:</strong> {value || "-"}
                </div>
              ))}

              <div>
                <strong>Summary:</strong>
                <div className="bg-gray-50 p-3 rounded text-xs max-h-[300px] overflow-y-auto">
                  {selectedCall.call_analysis?.call_summary ||
                    "Summary not available"}
                </div>
              </div>
              <div>
                <strong>Transcript:</strong>
                <pre className="bg-gray-50 p-3 rounded text-xs max-h-[300px] overflow-y-auto">
                  {selectedCall.transcript || "Transcript not available"}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CallList;
