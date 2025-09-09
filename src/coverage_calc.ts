import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as path from 'path';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';

interface AcceptanceCriteria {
  description: string;
  tags: string[];
  status: 'true' | 'false' | 'inProgress' | 'TODO' | boolean;
  severity?: number;
  complexity?: number;
  risk?: number;
  for_test?: boolean;
  test_cases?: {
    manual?: string[];
    automate?: string[];
  };
}

interface Feature {
  name: string;
  tags: string[];
  severity?: number;
  risk?: number;
  for_test?: boolean;
  acceptance_criteria: AcceptanceCriteria[];
}

interface FeatureMap {
  features: Feature[];
}

function loadFeatureMap(filePath: string): FeatureMap {
  const file = fs.readFileSync(filePath, 'utf8');
  return yaml.load(file) as FeatureMap;
}

type TagType = 'manualUI' | 'manualAPI' | 'automateUI' | 'automateAPI';

function calculateCoverage(features: Feature[]) {
  const tagTypes: TagType[] = ['manualUI', 'manualAPI', 'automateUI', 'automateAPI'];
  const featureResults: any[] = [];
  const tagTotals: Record<TagType, { total: number, covered: number }> = {
    manualUI: { total: 0, covered: 0 },
    manualAPI: { total: 0, covered: 0 },
    automateUI: { total: 0, covered: 0 },
    automateAPI: { total: 0, covered: 0 }
  };

  // sortujemy features po severity malejąco
  const sortedFeatures = [...features].sort((a, b) => (b.severity || 0) - (a.severity || 0));
  sortedFeatures.forEach(feature => {
    const tagCoverage: Record<TagType, { total: number, covered: number }> = {
      manualUI: { total: 0, covered: 0 },
      manualAPI: { total: 0, covered: 0 },
      automateUI: { total: 0, covered: 0 },
      automateAPI: { total: 0, covered: 0 }
    };
    // kalkulacja risk dla acceptance criteria
    feature.acceptance_criteria.forEach(ac => {
      tagTypes.forEach(tag => {
        if (ac.tags.includes(tag)) {
          tagCoverage[tag].total++;
          tagTotals[tag].total++;
          if ((ac.status as any) === true || (ac.status as any) === 'true') {
            tagCoverage[tag].covered++;
            tagTotals[tag].covered++;
          }
        }
      });
      // risk = (feature.severity + ac.severity + ac.complexity)/3
      if (typeof feature.severity === 'number' && typeof ac.severity === 'number' && typeof ac.complexity === 'number') {
        ac.risk = Math.round((feature.severity + ac.severity + ac.complexity) / 3 * 100) / 100;
      } else {
        ac.risk = undefined;
      }
    });
    // risk dla feature: średnia z risk acceptance criteria
    let risks = feature.acceptance_criteria.map(ac => typeof ac.risk === 'number' ? ac.risk : null).filter((v): v is number => v !== null);
  feature.risk = risks.length ? Math.round(risks.reduce((a,b)=>a+b,0)/risks.length * 100) / 100 : undefined;
    // Oblicz łączne pokrycie dla feature (tylko dla obecnych tagów)
    const presentTags = tagTypes.filter(tag => feature.tags.includes(tag));
    const presentCoverages = presentTags.map(tag => tagCoverage[tag].total ? (tagCoverage[tag].covered/tagCoverage[tag].total) : 0);
    const summaryCoverage = presentCoverages.length ? Math.round((presentCoverages.reduce((a,b)=>a+b,0)/presentCoverages.length)*100) : 'NA';
    featureResults.push({
      name: feature.name,
      coverage: Object.fromEntries(tagTypes.map(tag => [
        tag,
        feature.tags.includes(tag)
          ? (tagCoverage[tag].total ? Math.round((tagCoverage[tag].covered/tagCoverage[tag].total)*100) : 0)
          : 'NA'
      ])),
      summaryCoverage,
      severity: feature.severity,
      risk: feature.risk,
      acceptance_criteria: feature.acceptance_criteria
    });
  });

  const totalCoverage = Object.fromEntries(tagTypes.map(tag => [tag, tagTotals[tag].total ? Math.round((tagTotals[tag].covered/tagTotals[tag].total)*100) : 0]));

  return {
    features: featureResults,
    totalCoverage
  };
}

function generateHtmlReport(result: any) {
  let html = `<html><head><title>Feature Coverage Report</title></head><body>`;
  // Sekcja TODO/inProgress nad tabelami
  const featureMap = (global as any).featureMap || null;
  if (featureMap) {
    let todoList = '';
    let inProgressList = '';
    featureMap.features.forEach((feature: any) => {
      feature.acceptance_criteria.forEach((ac: any) => {
        if (ac.status === 'TODO') {
          todoList += `<li><b>TODO:</b> ${feature.name} - ${ac.description}</li>`;
        }
        if (ac.status === 'inProgress' || ac.status === 'InProgress') {
          inProgressList += `<li><b>InProgress:</b> ${feature.name} - ${ac.description}</li>`;
        }
      });
    });
    if (todoList) html += `<h3>Acceptance Criteria w statusie TODO:</h3><ul style="background: #e6fcfa; color: #00bfc9;">${todoList}</ul>`;
    if (inProgressList) html += `<h3>Acceptance Criteria w statusie InProgress:</h3><ul style="background: #fff3e0; color: #ff9800;">${inProgressList}</ul>`;
  }

  // Tabela Pokrycie
  html += `<h1>Feature Coverage Report</h1>`;
  html += `<h2>Coverage Summary</h2>`;
  html += `<ul>`;
  Object.entries(result.totalCoverage).forEach(([tag, percent]) => {
    html += `<li>${tag}: ${percent}%</li>`;
  });
  html += `</ul>`;
  html += `<h2>Pokrycie szczegółowe</h2>`;
  html += `<table border="1"><tr><th>Feature (Severity)</th><th>manualUI</th><th>manualAPI</th><th>automateUI</th><th>automateAPI</th><th>Summary</th></tr>`;
  result.features.forEach((f: any, idx: number) => {
    html += `<tr><td>${f.name} <span style='color:#d32f2f'>(S:${f.severity ?? '-'}, R:${f.risk ?? '-'})</span></td>`;
    ['manualUI','manualAPI','automateUI','automateAPI'].forEach(tag => {
      html += `<td>${f.coverage[tag] === 'NA' ? 'NA' : f.coverage[tag] + '%'}</td>`;
    });
    html += `<td>${f.summaryCoverage === 'NA' ? 'NA' : f.summaryCoverage + '%'}</td></tr>`;
    // Test case display
    let manualCases: string[] = [];
    let automateCases: string[] = [];
    if (featureMap && featureMap.features && featureMap.features[idx]) {
      featureMap.features[idx].acceptance_criteria.forEach((ac: any) => {
        if (ac.test_cases?.manual) manualCases.push(...ac.test_cases.manual);
        if (ac.test_cases?.automate) automateCases.push(...ac.test_cases.automate);
      });
    }
    if (manualCases.length || automateCases.length) {
      html += `<tr><td colspan="6" style="color: #a020f0; background: #f8f6ff; font-weight: bold;">Test Case'y:</td></tr>`;
      if (manualCases.length) html += `<tr><td colspan="6" style="color: #a020f0;">Manual: ${manualCases.join(', ')}</td></tr>`;
      if (automateCases.length) html += `<tr><td colspan="6" style="color: #a020f0;">Automate: ${automateCases.join(', ')}</td></tr>`;
    }
  });
  html += `</table>`;

  // Szczegółowe RBT dla acceptance criteria
  if (featureMap) {
    html += `<h2>Szczegółowe RBT dla Acceptance Criteria</h2>`;
    featureMap.features.forEach((feature: any, idx: number) => {
      html += `<h3>${feature.name}</h3>`;
      html += `<ul style='background:#f5f5f5;'>`;
      feature.acceptance_criteria.forEach((ac: any) => {
        html += `<li>${ac.description} <span style='color:#1976d2'>(S:${ac.severity ?? '-'}, C:${ac.complexity ?? '-'}, R:${ac.risk ?? '-'})</span></li>`;
      });
      html += `</ul>`;
    });
  }

  // Tabela RBT
  html += `<h2>RBT - Severity & Risk dla funkcji</h2>`;
  html += `<table border="1"><tr><th>Feature</th><th>Severity</th><th>Risk</th></tr>`;
  result.features.forEach((f: any) => {
    html += `<tr><td>${f.name}</td><td>${f.severity ?? '-'}</td><td>${f.risk ?? '-'}</td></tr>`;
  });
  html += `</table>`;
  html += `</body></html>`;
  return html;
}
function printCoverageToTerminal(result: any) {
  // Tabela RBT dla funkcji
  console.log('\nRBT - Severity & Risk dla funkcji:');
  console.log('Feature | Severity | Risk');
  result.features.forEach((f: any) => {
    console.log(`${f.name} | ${f.severity ?? '-'} | ${f.risk ?? '-'}`);
  });
  console.log('Feature Coverage Report');
  console.log('Coverage Summary:');
  Object.entries(result.totalCoverage).forEach(([tag, percent]) => {
    console.log(`  ${tag}: ${percent}%`);
  });
  console.log('\nFeature details:');
  const featureMap = (global as any).featureMap || null;
  result.features.forEach((f: any, idx: number) => {
  console.log(`- ${f.name} (S:${f.severity ?? '-'}, R:${f.risk ?? '-'})`);
    // Szczegóły acceptance criteria
    if (featureMap && featureMap.features && featureMap.features[idx]) {
      console.log(`  Acceptance Criteria:`);
      featureMap.features[idx].acceptance_criteria.forEach((ac: any) => {
        console.log(`    ${ac.description} (S:${ac.severity ?? '-'}, C:${ac.complexity ?? '-'}, R:${ac.risk ?? '-'})`);
      });
    }
    Object.entries(f.coverage).forEach(([tag, percent]) => {
      if (percent === 'NA') {
        console.log(`    ${tag}: NA`);
      } else {
        console.log(`    ${tag}: ${percent}%`);
      }
    });
    console.log(`    Summary: ${f.summaryCoverage === 'NA' ? 'NA' : f.summaryCoverage + '%'}`);
    // Test case display
    let manualCases: string[] = [];
    let automateCases: string[] = [];
    if (featureMap && featureMap.features && featureMap.features[idx]) {
      featureMap.features[idx].acceptance_criteria.forEach((ac: any) => {
        if (ac.test_cases?.manual) manualCases.push(...ac.test_cases.manual);
        if (ac.test_cases?.automate) automateCases.push(...ac.test_cases.automate);
      });
    }
    if (manualCases.length) console.log(`    Manual Test Cases: ${manualCases.join(', ')}`);
    if (automateCases.length) console.log(`    Automate Test Cases: ${automateCases.join(', ')}`);
  });
  // Sekcja TODO i inProgress
  if (featureMap) {
    let todoRows = '';
    let inProgressRows = '';
    featureMap.features.forEach((feature: any) => {
      feature.acceptance_criteria.forEach((ac: any) => {
        if (ac.status === 'TODO') {
          todoRows += `TODO: ${feature.name} - ${ac.description}` + '\n';
        }
        if (ac.status === 'inProgress' || ac.status === 'InProgress') {
          inProgressRows += `InProgress: ${feature.name} - ${ac.description}` + '\n';
        }
      });
    });
    if (todoRows) console.log('\nAcceptance Criteria w statusie TODO (turkusowy):\n' + todoRows);
    if (inProgressRows) console.log('\nAcceptance Criteria w statusie InProgress (pomarańczowy):\n' + inProgressRows);
  }
  // Całkowite pokrycie: średnia z summaryCoverage wszystkich features (pomijając NA)
  const summaryValues = result.features.map((f: any) => typeof f.summaryCoverage === 'number' ? f.summaryCoverage : null).filter((v: number | null): v is number => v !== null);
  const totalSummary = summaryValues.length ? Math.round(summaryValues.reduce((a: number, b: number) => a+b, 0)/summaryValues.length) : 'NA';
  console.log(`\nCałkowite pokrycie: ${totalSummary === 'NA' ? 'NA' : totalSummary + '%'}`);
  console.log('Pokrycie dla każdego taga:');
  Object.entries(result.totalCoverage).forEach(([tag, percent]) => {
    console.log(`  ${tag}: ${percent}%`);
  });
}

function saveCoverageToTxt(result: any, filePath: string) {
  let txt = 'Feature Coverage Report\n';
  txt += 'Coverage Summary:\n';
  Object.entries(result.totalCoverage).forEach(([tag, percent]) => {
    txt += `  ${tag}: ${percent}%\n`;
  });
  txt += '\nRBT - Severity & Risk dla funkcji:\n';
  txt += 'Feature | Severity | Risk\n';
  result.features.forEach((f: any) => {
    txt += `${f.name} | ${f.severity ?? '-'} | ${f.risk ?? '-'}\n`;
  });
  const featureMap = (global as any).featureMap || null;
  txt += '\nFeature details:\n';
  result.features.forEach((f: any, idx: number) => {
  txt += `- ${f.name} (S:${f.severity ?? '-'}, R:${f.risk ?? '-'})\n`;
    // Szczegóły acceptance criteria
    if (featureMap && featureMap.features && featureMap.features[idx]) {
      txt += `  Acceptance Criteria:\n`;
      featureMap.features[idx].acceptance_criteria.forEach((ac: any) => {
        txt += `    ${ac.description} (S:${ac.severity ?? '-'}, C:${ac.complexity ?? '-'}, R:${ac.risk ?? '-'})\n`;
      });
    }
    Object.entries(f.coverage).forEach(([tag, percent]) => {
      if (percent === 'NA') {
        txt += `    ${tag}: NA\n`;
      } else {
        txt += `    ${tag}: ${percent}%\n`;
      }
    });
    txt += `    Summary: ${f.summaryCoverage === 'NA' ? 'NA' : f.summaryCoverage + '%'}\n`;
    // Test case display
    let manualCases: string[] = [];
    let automateCases: string[] = [];
      if (featureMap && featureMap.features && featureMap.features[idx]) {
        featureMap.features[idx].acceptance_criteria.forEach((ac: any) => {
          if (ac.test_cases?.manual) manualCases.push(...ac.test_cases.manual);
          if (ac.test_cases?.automate) automateCases.push(...ac.test_cases.automate);
        });
      }
    if (manualCases.length) txt += `    Manual Test Cases: ${manualCases.join(', ')}\n`;
    if (automateCases.length) txt += `    Automate Test Cases: ${automateCases.join(', ')}\n`;
  });
  // usunięto powieloną deklarację featureMap
  // Sekcja TODO i inProgress
  if (featureMap) {
    let todoRows = '';
    let inProgressRows = '';
    featureMap.features.forEach((feature: any) => {
      feature.acceptance_criteria.forEach((ac: any) => {
        if (ac.status === 'TODO') {
          todoRows += `TODO: ${feature.name} - ${ac.description}` + '\n';
        }
        if (ac.status === 'inProgress' || ac.status === 'InProgress') {
          inProgressRows += `InProgress: ${feature.name} - ${ac.description}` + '\n';
        }
      });
    });
    if (todoRows) txt += `\nAcceptance Criteria w statusie TODO (turkusowy):\n` + todoRows;
    if (inProgressRows) txt += `\nAcceptance Criteria w statusie InProgress (pomarańczowy):\n` + inProgressRows;
  }
  // Całkowite pokrycie: średnia z summaryCoverage wszystkich features (pomijając NA)
  const summaryValues = result.features.map((f: any) => typeof f.summaryCoverage === 'number' ? f.summaryCoverage : null).filter((v: number | null): v is number => v !== null);
  const totalSummary = summaryValues.length ? Math.round(summaryValues.reduce((a: number, b: number) => a+b, 0)/summaryValues.length) : 'NA';
  txt += `\nCałkowite pokrycie: ${totalSummary === 'NA' ? 'NA' : totalSummary + '%'}\n`;
  txt += 'Pokrycie dla każdego taga:\n';
  Object.entries(result.totalCoverage).forEach(([tag, percent]) => {
    txt += `  ${tag}: ${percent}%\n`;
  });
  fs.writeFileSync(filePath, txt);
}

// ...existing code...
async function main() {
  const argv = await yargs(hideBin(process.argv))
    .option('featureMap', {
      alias: 'f',
      type: 'string',
      description: 'Ścieżka do pliku featureMap.yml',
      default: 'featureMap.yml'
    })
    .option('output', {
      alias: 'o',
      type: 'string',
      description: 'Folder na raporty',
      default: 'reports'
    })
    .option('rbt', {
      type: 'boolean',
      description: 'Tylko tabela RBT',
      default: false
    })
    .help()
    .parse();

  const outputDir = path.resolve(argv.output);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
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
    const result = calculateCoverage(featureMap.features);
    (global as any).featureMap = featureMap;
    const html = generateHtmlReport(result);
    const now = new Date();
    const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0,19);
    const htmlPath = path.join(outputDir, `${baseName}_coverage_report_${dateStr}.html`);
    const txtPath = path.join(outputDir, `${baseName}_coverage_report_${dateStr}.txt`);
    fs.writeFileSync(htmlPath, html);
    saveCoverageToTxt(result, txtPath);
    if (argv.rbt) {
      // tylko tabela RBT
      console.log(`\nRBT - Severity & Risk dla funkcji (${baseName}):`);
      console.log('Feature | Severity | Risk');
      result.features.forEach((f: any) => {
        console.log(`${f.name} | ${f.severity ?? '-'} | ${f.risk ?? '-'}`);
      });
    } else {
      printCoverageToTerminal(result);
      console.log(`Coverage report generated: ${htmlPath} & ${txtPath}`);
    }
  }
  }
  main();

// ...existing code...
