import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as path from 'path';

interface AcceptanceCriteria {
  description: string;
  tags: string[];
  severity?: number;
  complexity?: number;
  phase?: string;
  status?: 'true' | 'false' | 'inProgress' | 'TODO' | boolean;
}

interface Feature {
  name: string;
  tags: string[];
  severity?: number;
  phase?: string;
  status?: 'true' | 'false' | 'inProgress' | 'TODO' | boolean;
  acceptance_criteria: AcceptanceCriteria[];
}

interface FeatureMap {
  features: Feature[];
}

function loadFeatureMap(filePath: string): FeatureMap {
  const file = fs.readFileSync(filePath, 'utf8');
  return yaml.load(file) as FeatureMap;
}

function generateFecovRBTReportHtml(featureMap: FeatureMap): string {
  let html = `<html><head><title>FECOV RBT Report</title></head><body>`;
  html += `<h1>FECOV RBT Report</h1>`;
  // Podsumowanie statusów i pokrycia dla tagów
  const tagTypes = ['manualUI', 'manualAPI', 'automateUI', 'automateAPI', 'exploratoryTesting'];
  const tagStats: Record<string, { total: number, done: number }> = {};
  tagTypes.forEach(tag => tagStats[tag] = { total: 0, done: 0 });
  featureMap.features.forEach(f => {
    f.acceptance_criteria.forEach(ac => {
      ac.tags.forEach(tag => {
        if (tagStats[tag]) {
          tagStats[tag].total++;
          if (ac.status === true || ac.status === 'true') tagStats[tag].done++;
        }
      });
    });
  });
  html += `<h2>Pokrycie ilościowe dla typów tagów</h2><ul>`;
  tagTypes.forEach(tag => {
    html += `<li>${tag}: <b style='color:green;'>${tagStats[tag].done}</b> / <b>${tagStats[tag].total}</b> zrobione</li>`;
  });
  html += `</ul>`;

  html += `<h2>Lista wszystkich Features i Acceptance Criteria</h2>`;
  featureMap.features.forEach(f => {
    // Kolor statusu feature
    let featureColor = '#888';
    if (f.status === true || f.status === 'true') featureColor = 'green';
    else if (f.status === false || f.status === 'false') featureColor = 'red';
    else if (f.status === 'TODO') featureColor = '#00bfc9';
    else if (f.status === 'inProgress' || f.status === 'InProgress') featureColor = '#ff9800';
    html += `<h3 style='color:${featureColor}'>${f.name}</h3>`;
    html += `<div><b>Severity:</b> ${f.severity ?? '-'}</div>`;
    html += `<div><b>Phase:</b> ${f.phase ?? '-'}</div>`;
    html += `<div><b>Tagi:</b> ${Array.isArray(f.tags) ? f.tags.join(', ') : '-'}</div>`;
    html += `<ul style='background:#f5f5f5;'>`;
    f.acceptance_criteria.forEach(ac => {
      // Kolor statusu AC
      let acColor = '#888';
      if (ac.status === true || ac.status === 'true') acColor = 'green';
      else if (ac.status === false || ac.status === 'false') acColor = 'red';
      else if (ac.status === 'TODO') acColor = '#00bfc9';
      else if (ac.status === 'inProgress' || ac.status === 'InProgress') acColor = '#ff9800';
      html += `<li style='color:${acColor}'><b>${ac.description}</b><br/>Severity: ${ac.severity ?? '-'} | Complexity: ${ac.complexity ?? '-'} | Phase: ${ac.phase ?? '-'} | Tagi: ${Array.isArray(ac.tags) ? ac.tags.join(', ') : '-'}</li>`;
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
    const html = generateFecovRBTReportHtml(featureMap);
    const now = new Date();
    const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0,19);
    const htmlPath = path.join('reports', `${baseName}_fecovRBT_report_${dateStr}.html`);
    fs.writeFileSync(htmlPath, html);
    console.log(`FECOV RBT report generated: ${htmlPath}`);
  }
}

main();
