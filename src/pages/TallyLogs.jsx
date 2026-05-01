import { useEffect, useState } from "react";
import Badge from "../components/Badge";
import Card from "../components/Card";
import TableWrap from "../components/TableWrap";
import { tallyApi } from "../api/api";
import { formatDateTime } from "../utils/format";

export default function TallyLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await tallyApi.logs();
      setLogs(res.logs || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
          Tally Logs
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Currently stores dummy Tally payloads. Real Tally response will use the same log structure later.
        </p>
      </div>

      <TableWrap>
        <table className="min-w-[1000px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Voucher Type</th>
              <th className="px-4 py-3">Voucher No.</th>
              <th className="px-4 py-3">Mode</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Message</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td className="px-4 py-6" colSpan="6">Loading...</td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td className="px-4 py-6" colSpan="6">No tally logs found.</td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log._id}>
                  <td className="px-4 py-3">{formatDateTime(log.createdAt)}</td>
                  <td className="px-4 py-3">{log.voucherType}</td>
                  <td className="px-4 py-3 font-semibold">{log.voucherNumber}</td>
                  <td className="px-4 py-3">{log.mode}</td>
                  <td className="px-4 py-3"><Badge value={log.status} /></td>
                  <td className="px-4 py-3">{log.response?.message || log.errorMessage || "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableWrap>
    </div>
  );
}