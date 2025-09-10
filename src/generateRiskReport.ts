import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as path from 'path';

interface AcceptanceCriteria {
  description: string;
  tags: string[];
  severity?: number;
  complexity?: number;
}

interface Feature {
  name: string;
  tags: string[];
  severity?: number;
  risk?: number;
  acceptance_criteria: AcceptanceCriteria[];
}

interface FeatureMap {
  features: Feature[];
}

function loadFeatureMap(filePath: string): FeatureMap {
  const file = fs.readFileSync(filePath, 'utf8');
  return yaml.load(file) as FeatureMap;
}

function generateRiskReportHtml(featureMap: FeatureMap): string {
  let html = `<html><head><title>Feature Risk & RBT Report</title></head><body>`;
  html += `<h1>Feature Risk & RBT Report</h1>`;
  html += `<h2>RBT - Severity & Risk dla funkcji</h2>`;
  html += `<table border='1'><tr><th>Feature</th><th>Tags</th><th>Severity</th><th>Risk</th></tr>`;
  featureMap.features.forEach(f => {
    // risk = średnia z (feature.severity + ac.severity + ac.complexity)/3 dla wszystkich ac
    let risks = f.acceptance_criteria.map(ac => (typeof f.severity === 'number' && typeof ac.severity === 'number' && typeof ac.complexity === 'number') ? (f.severity + ac.severity + ac.complexity)/3 : null).filter((v): v is number => v !== null);
    let risk = risks.length ? Math.round(risks.reduce((a,b)=>a+b,0)/risks.length * 100) / 100 : '-';
    html += `<tr><td>${f.name}</td><td>${Array.isArray(f.tags) ? f.tags.join(', ') : '-'}</td><td>${f.severity ?? '-'}</td><td>${risk}</td></tr>`;
  });
  html += `</table>`;
  html += `<h2>Lista Features i Acceptance Criteria</h2>`;
  featureMap.features.forEach(f => {
    html += `<h3>${f.name} <span style='color:#d32f2f'>(S:${f.severity ?? '-'})</span></h3>`;
    html += `<div><b>Tagi:</b> ${Array.isArray(f.tags) ? f.tags.join(', ') : '-'}</div>`;
    html += `<ul style='background:#f5f5f5;'>`;
    f.acceptance_criteria.forEach(ac => {
      html += `<li><b>${ac.description}</b> <br/>Tagi: ${Array.isArray(ac.tags) ? ac.tags.join(', ') : '-'} | Severity: ${ac.severity ?? '-'} | Complexity: ${ac.complexity ?? '-'}</li>`;
    });
    html += `</ul>`;
  });
  html += `</body></html>`;
  return html;
}

function main() {
  // Find all *.fecov.yml files in workspace root
  const workspaceDir = process.cwd();
  const fecovFiles = fs.readdirSync(workspaceDir).filter(f => f.endsWith('.fecov.yml'));
  if (fecovFiles.length === 0) {
    console.error('Brak plików *.fecov.yml w katalogu projektu!');
    return;
  }
  for (const file of fecovFiles) {
    const featureMapPath = path.join(workspaceDir, file);
    const baseName = path.basename(file, '.fecov.yml');
    const featureMap = loadFeatureMap(featureMapPath);
    const html = generateRiskReportHtml(featureMap);
    const now = new Date();
    const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0,19);
    const htmlPath = path.join('reports', `${baseName}_risk_report_${dateStr}.html`);
    fs.writeFileSync(htmlPath, html);
    console.log(`Risk report generated: ${htmlPath}`);
  }
}

main();
