import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as path from 'path';

interface TestRunAcceptanceCriteria {
  description: string;
  passed: boolean | null;
  how_tested: string | null;
  notes: string;
}

interface TestRunFeature {
  feature: string;
  passed: boolean | null;
  acceptance_criteria: TestRunAcceptanceCriteria[];
}

interface TestRunResults {
  test_run: TestRunFeature[];
}

function loadTestRunResults(filePath: string): TestRunResults {
  const file = fs.readFileSync(filePath, 'utf8');
  return yaml.load(file) as TestRunResults;
}

function generateTestReportMarkdown(results: TestRunResults): string {
  let md = '# Test Run Report\n\n';
  let total = 0, passed = 0, failed = 0;
  results.test_run.forEach(feature => {
    feature.acceptance_criteria.forEach(ac => {
      total++;
      if (ac.passed === true) passed++;
      if (ac.passed === false) failed++;
    });
  });
  md += `**Total tests:** ${total}  |  **Passed:** ${passed}  |  **Failed:** ${failed}\n\n`;
  results.test_run.forEach(feature => {
    md += `## Feature: ${feature.feature}\n`;
    md += `- Passed: ${feature.passed === true ? '✅' : feature.passed === false ? '❌' : '[ ]'}\n`;
    feature.acceptance_criteria.forEach(ac => {
      md += `  - [${ac.passed === true ? 'x' : ' '}] ${ac.description}\n`;
      md += `    How tested: ${ac.how_tested ?? ''}\n`;
      if (ac.notes) md += `    Notes: ${ac.notes}\n`;
    });
    md += '\n';
  });
  return md;
}

function generateTestReportHtml(results: TestRunResults): string {
  let html = `<!DOCTYPE html><html><head><meta charset='utf-8'><title>Test Run Report</title></head><body>`;
  html += `<h1>Test Run Report</h1>`;
  let total = 0, passed = 0, failed = 0;
  results.test_run.forEach(feature => {
    feature.acceptance_criteria.forEach(ac => {
      total++;
      if (ac.passed === true) passed++;
      if (ac.passed === false) failed++;
    });
  });
  html += `<div><b>Total tests:</b> ${total} &nbsp; | &nbsp; <b>Passed:</b> ${passed} &nbsp; | &nbsp; <b>Failed:</b> ${failed}</div><br/>`;
  results.test_run.forEach(feature => {
    const featureColor = feature.passed === true ? '#2ecc40' : feature.passed === false ? '#ff4136' : '#888';
    html += `<div style='margin-bottom:20px;'><h2>Feature: <span style='color:${featureColor}'>${feature.feature}</span></h2>`;
    html += `<div><b>Status:</b> <span style='color:${featureColor}'>${feature.passed === true ? 'Zdany' : feature.passed === false ? 'Niezdany' : 'Brak wyniku'}</span></div>`;
    html += `<ul>`;
    feature.acceptance_criteria.forEach(ac => {
      const acColor = ac.passed === true ? '#2ecc40' : ac.passed === false ? '#ff4136' : '#888';
      html += `<li><span style='color:${acColor}; font-weight:bold;'>${ac.description}</span>`;
      html += `<ul>`;
      html += `<li>How tested: ${ac.how_tested ?? ''}</li>`;
      if (ac.notes) html += `<li>Notes: ${ac.notes}</li>`;
      html += `</ul></li>`;
    });
    html += `</ul></div>`;
  });
  html += `</body></html>`;
  return html;
}

function main() {
  const testRunPath = path.resolve('testPlan', 'testRunResults.yml');
  const results = loadTestRunResults(testRunPath);
  const markdown = generateTestReportMarkdown(results);
  const html = generateTestReportHtml(results);
  fs.writeFileSync(path.resolve('testPlan', 'testRunReport.md'), markdown);
  fs.writeFileSync(path.resolve('testPlan', 'testRunReport.html'), html);
  console.log('Test run report generated: testRunReport.md, testRunReport.html');
}

main();
