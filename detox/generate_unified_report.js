// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable no-console, no-process-env */

/**
 * Generates a unified HTML report combining results from all E2E platforms.
 *
 * Usage: node generate_unified_report.js
 *
 * Reads environment variables:
 *   PLATFORM_DATA - JSON string with per-platform stats:
 *     [{"name":"Detox iOS","status":"success","tests":200,"passes":198,...,"reportUrl":"https://..."},
 *      {"name":"Maestro iOS","status":"not_run"}, ...]
 *   OUTPUT_DIR - Directory to write the HTML file
 */

const fs = require('fs');
const path = require('path');

function escapeHtml(str) {
    if (typeof str !== 'string') {
        return str;
    }
    return str.
        replace(/&/g, '&amp;').
        replace(/</g, '&lt;').
        replace(/>/g, '&gt;').
        replace(/"/g, '&quot;');
}

function generateUnifiedHtml(platforms) {
    const totalTests = platforms.reduce((sum, p) => sum + (p.tests || 0), 0);
    const totalPasses = platforms.reduce((sum, p) => sum + (p.passes || 0), 0);
    const totalFailures = platforms.reduce((sum, p) => sum + (p.failures || 0), 0);
    const totalSkipped = platforms.reduce((sum, p) => sum + (p.skipped || 0), 0);
    const totalErrors = platforms.reduce((sum, p) => sum + (p.errors || 0), 0);
    const overallPercent = totalTests > 0 ? ((totalPasses / totalTests) * 100).toFixed(2) : '0.00';

    const platformRows = platforms.map((p) => {
        if (p.status === 'not_run') {
            return `<tr class="not-run">
                <td>${escapeHtml(p.name)}</td>
                <td colspan="6" class="not-run-cell">NOT RUN</td>
            </tr>`;
        }
        const pct = p.tests > 0 ? ((p.passes / p.tests) * 100).toFixed(2) : '0.00';
        const rowClass = p.failures > 0 ? 'failed' : 'passed';
        const link = p.reportUrl ? `<a href="${escapeHtml(p.reportUrl)}">${pct}%</a>` : `${pct}%`;
        return `<tr class="${rowClass}">
            <td>${escapeHtml(p.name)}</td>
            <td>${p.tests}</td>
            <td>${p.passes}</td>
            <td>${p.failures}</td>
            <td>${p.skipped}</td>
            <td>${p.errors}</td>
            <td>${link}</td>
        </tr>`;
    }).join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Unified E2E Test Report</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; background: #f5f5f5; }
  .container { max-width: 900px; margin: 0 auto; background: white; border-radius: 8px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
  h1 { margin-top: 0; color: #1e325c; }
  .summary { display: flex; gap: 24px; margin-bottom: 24px; flex-wrap: wrap; }
  .stat { background: #f8f9fa; border-radius: 8px; padding: 16px 24px; text-align: center; min-width: 100px; }
  .stat .value { font-size: 28px; font-weight: 700; }
  .stat .label { font-size: 12px; color: #666; text-transform: uppercase; margin-top: 4px; }
  .stat.pass .value { color: #2e7d32; }
  .stat.fail .value { color: #c62828; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th { background: #1e325c; color: white; padding: 12px; text-align: center; }
  td { padding: 10px 12px; text-align: center; border-bottom: 1px solid #e0e0e0; }
  tr.passed td:first-child { border-left: 4px solid #2e7d32; }
  tr.failed td:first-child { border-left: 4px solid #c62828; }
  tr.not-run td:first-child { border-left: 4px solid #9e9e9e; }
  .not-run-cell { color: #9e9e9e; font-style: italic; }
  a { color: #1565c0; text-decoration: none; }
  a:hover { text-decoration: underline; }
  .timestamp { color: #999; font-size: 12px; margin-top: 24px; }
</style>
</head>
<body>
<div class="container">
  <h1>Unified E2E Test Report</h1>
  <div class="summary">
    <div class="stat"><div class="value">${totalTests}</div><div class="label">Total Tests</div></div>
    <div class="stat pass"><div class="value">${totalPasses}</div><div class="label">Passed</div></div>
    <div class="stat fail"><div class="value">${totalFailures}</div><div class="label">Failed</div></div>
    <div class="stat"><div class="value">${totalSkipped}</div><div class="label">Skipped</div></div>
    <div class="stat"><div class="value">${overallPercent}%</div><div class="label">Pass Rate</div></div>
  </div>
  <table>
    <thead>
      <tr><th>Platform</th><th>Tests</th><th>Passed</th><th>Failed</th><th>Skipped</th><th>Errors</th><th>Pass Rate</th></tr>
    </thead>
    <tbody>
      ${platformRows}
    </tbody>
    <tfoot>
      <tr style="font-weight:700;background:#f8f9fa;">
        <td>Total</td><td>${totalTests}</td><td>${totalPasses}</td><td>${totalFailures}</td><td>${totalSkipped}</td><td>${totalErrors}</td><td>${overallPercent}%</td>
      </tr>
    </tfoot>
  </table>
  <p class="timestamp">Generated: ${new Date().toISOString()}</p>
</div>
</body>
</html>`;
}

function main() {
    const platformDataJson = process.env.PLATFORM_DATA;
    const outputDir = process.env.OUTPUT_DIR || '.';

    if (!platformDataJson) {
        console.error('PLATFORM_DATA environment variable is required');
        process.exit(1);
    }

    let platforms;
    try {
        platforms = JSON.parse(platformDataJson);
    } catch (err) {
        console.error('PLATFORM_DATA is not valid JSON:', err.message);
        process.exit(1);
    }
    const html = generateUnifiedHtml(platforms);
    const outputPath = path.join(outputDir, 'unified-report.html');

    fs.mkdirSync(outputDir, {recursive: true});
    fs.writeFileSync(outputPath, html);
    console.log(`Unified report written to ${outputPath}`);
}

main();
