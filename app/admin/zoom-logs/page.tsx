import ZoomLogsTable from '@/components/admin/ZoomLogsTable';
import ZoomWebhookEventsTable from '@/components/admin/ZoomWebhookEventsTable';

export default function ZoomLogsPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Zoom Session Logs</h1>
        <p className="mt-1 text-sm text-gray-500">
          Monitor Zoom webhook events and user button clicks for session tracking
        </p>
      </div>

      {/* Webhook Events Section - Events from Zoom API */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">
          Webhook Events from Zoom
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          These events are received directly from Zoom when meetings start/end and participants join/leave.
          If no events appear, check your Zoom app webhook configuration.
        </p>
        <ZoomWebhookEventsTable />
      </section>

      {/* Button Click Logs Section - User actions */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">
          Button Click Logs
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          These logs are recorded when coaches click &quot;Start Meeting&quot; or athletes click &quot;Join Meeting&quot; buttons.
        </p>
        <ZoomLogsTable />
      </section>
    </div>
  );
}
