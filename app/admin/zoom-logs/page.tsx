import ZoomLogsTable from '@/components/admin/ZoomLogsTable';

export default function ZoomLogsPage() {
  // Client-side only to avoid server-side auth issues

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Zoom Session Logs</h1>
        <p className="mt-1 text-sm text-gray-500">
          Track when coaches and athletes click zoom meeting buttons
        </p>
      </div>

      {/* Zoom Logs Table */}
      <ZoomLogsTable />
    </div>
  );
}