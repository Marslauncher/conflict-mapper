import { jsonResponse } from '../../cloudflare/lib/http.js';
import { getArticleFetchStatus } from '../../cloudflare/lib/articles.js';
import { getReportStatus, listReportLogs } from '../../cloudflare/lib/reports.js';

export async function onRequestGet(context) {
  const reportStatus = await getReportStatus(context.env);
  const feedStatus = await getArticleFetchStatus(context.env);
  const logs = await listReportLogs(context.env, 100);
  const statusLogs = [];

  if (reportStatus?.phase && reportStatus.phase !== 'idle') {
    statusLogs.push({
      timestamp: reportStatus.updatedAt || reportStatus.lastRun || new Date().toISOString(),
      level: reportStatus.phase === 'failed' ? 'error' : reportStatus.phase === 'stale' ? 'warn' : 'info',
      category: 'analysis',
      message: reportStatus.message || `Report engine phase: ${reportStatus.phase}`,
      details: {
        phase: reportStatus.phase,
        scope: reportStatus.scope,
        slug: reportStatus.slug,
        progress: reportStatus.progress,
        mitigation: reportStatus.mitigation,
        errorType: reportStatus.errorType,
      },
    });
  }

  if (feedStatus?.phase || feedStatus?.message) {
    statusLogs.push({
      timestamp: feedStatus.updatedAt || feedStatus.lastFetch || new Date().toISOString(),
      level: feedStatus.feedFailures ? 'warn' : 'info',
      category: 'rss',
      message: feedStatus.message || 'RSS fetch status updated',
      details: {
        phase: feedStatus.phase,
        checkedFeeds: feedStatus.checkedFeeds,
        totalFeeds: feedStatus.totalFeeds,
        articlesAdded: feedStatus.articlesAdded,
        totalArticles: feedStatus.totalArticles,
        translatedArticles: feedStatus.translatedArticles,
        unmatchedArticles: feedStatus.unmatchedArticles,
        feedFailures: feedStatus.feedFailures,
      },
    });
  }

  const combinedLogs = [...statusLogs, ...logs].slice(0, 100);

  return jsonResponse({
    success: true,
    data: {
      logs: combinedLogs.length ? combinedLogs : [
        {
          timestamp: new Date().toISOString(),
          level: 'info',
          category: 'system',
          message: 'Cloudflare Pages Function logging endpoint active',
          details: { reportStatus, feedStatus },
        },
      ],
      status: { reportStatus, feedStatus },
      total: combinedLogs.length || 1,
    },
  });
}
