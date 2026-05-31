import { jsonResponse } from '../../cloudflare/lib/http.js';
import { getArticleFetchStatus } from '../../cloudflare/lib/articles.js';
import { getReportStatus, listReportLogs } from '../../cloudflare/lib/reports.js';

export async function onRequestGet(context) {
  const reportStatus = await getReportStatus(context.env);
  const feedStatus = await getArticleFetchStatus(context.env);
  const logs = await listReportLogs(context.env, 100);

  return jsonResponse({
    success: true,
    data: {
      logs: logs.length ? logs : [
        {
          timestamp: new Date().toISOString(),
          level: 'info',
          category: 'system',
          message: 'Cloudflare Pages Function logging endpoint active',
          details: { reportStatus, feedStatus },
        },
      ],
      status: { reportStatus, feedStatus },
      total: logs.length || 1,
    },
  });
}
