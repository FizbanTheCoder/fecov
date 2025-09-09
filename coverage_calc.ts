import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as path from 'path';

interface AcceptanceCriteria {
  description: string;
  tags: string[];
  status: 'true' | 'false' | 'inProgress' | 'TODO' | boolean;
  test_cases?: {
    manual?: string[];
    automate?: string[];
  };
}

interface Feature {
  name: string;
  tags: string[];
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

  features.forEach(feature => {
    const tagCoverage: Record<TagType, { total: number, covered: number }> = {
      manualUI: { total: 0, covered: 0 },
      manualAPI: { total: 0, covered: 0 },
      automateUI: { total: 0, covered: 0 },
      automateAPI: { total: 0, covered: 0 }
    };
    feature.acceptance_criteria.forEach(ac => {
      tagTypes.forEach(tag => {
        if (ac.tags.includes(tag)) {
          tagCoverage[tag].total++;
          tagTotals[tag].total++;
          if ((ac.status as any) === true || (ac.status as any) === 'true') {
            tagCoverage[tag].covered++;
            tagTotals[tag].covered++;
          }
          // TODO oraz InProgress traktujemy jak false (nie pokryte)
          // więc nie zwiększamy covered, tylko total
          // (już total++ jest wyżej)
          // Jeśli status to 'false', 'TODO', 'InProgress', nie robimy nic
        }
      });
    });
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
      summaryCoverage
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
  html += `<h1>Feature Coverage Report</h1>`;
  html += `<h2>Coverage Summary</h2>`;
  html += `<ul>`;
  Object.entries(result.totalCoverage).forEach(([tag, percent]) => {
    html += `<li>${tag}: ${percent}%</li>`;
  });
  html += `</ul>`;
  html += `<table border="1"><tr><th>Feature</th><th>manualUI</th><th>manualAPI</th><th>automateUI</th><th>automateAPI</th><th>Summary</th></tr>`;
  const featureMap = (global as any).featureMap || null;
  // Sekcja TODO i inProgress
  if (featureMap) {
    let todoRows = '';
    let inProgressRows = '';
    featureMap.features.forEach((feature: any) => {
      feature.acceptance_criteria.forEach((ac: any) => {
        if (ac.status === 'TODO') {
          todoRows += `<tr><td colspan="6" style="color: #00bfc9; background: #e6fcfa; font-weight: bold;">TODO: ${feature.name} - ${ac.description}</td></tr>`;
        }
        if (ac.status === 'inProgress' || ac.status === 'InProgress') {
          inProgressRows += `<tr><td colspan="6" style="color: #ff9800; background: #fff3e0; font-weight: bold;">InProgress: ${feature.name} - ${ac.description}</td></tr>`;
        }
      });
    });
    if (todoRows) html += `<tr><td colspan="6" style="background: #e6fcfa;"><b>Acceptance Criteria w statusie TODO:</b></td></tr>` + todoRows;
    if (inProgressRows) html += `<tr><td colspan="6" style="background: #fff3e0;"><b>Acceptance Criteria w statusie InProgress:</b></td></tr>` + inProgressRows;
  }
  // featureMap must be passed to result for this to work
  result.features.forEach((f: any, idx: number) => {
    html += `<tr><td>${f.name}</td>`;
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
  html += `</table></body></html>`;
  return html;
}
function printCoverageToTerminal(result: any) {
  console.log('Feature Coverage Report');
  console.log('Coverage Summary:');
  Object.entries(result.totalCoverage).forEach(([tag, percent]) => {
    console.log(`  ${tag}: ${percent}%`);
  });
  console.log('\nFeature details:');
  const featureMap = (global as any).featureMap || null;
  result.features.forEach((f: any, idx: number) => {
    console.log(`- ${f.name}`);
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
  const featureMap = (global as any).featureMap || null;
  let txt = 'Feature Coverage Report\n';
  txt += 'Coverage Summary:\n';
  Object.entries(result.totalCoverage).forEach(([tag, percent]) => {
    txt += `  ${tag}: ${percent}%\n`;
  });
  txt += '\nFeature details:\n';
  result.features.forEach((f: any, idx: number) => {
    txt += `- ${f.name}\n`;
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

function main() {
  const featureMapPath = path.resolve('featureMap.yml');
  const featureMap = loadFeatureMap(featureMapPath);
  const result = calculateCoverage(featureMap.features);
  // przekazujemy featureMap do globalnego obiektu, by był dostępny w raportach
  (global as any).featureMap = featureMap;
  const html = generateHtmlReport(result);
  fs.writeFileSync(path.resolve('coverage_report.html'), html);
  saveCoverageToTxt(result, path.resolve('coverage_report.txt'));
  printCoverageToTerminal(result);
  console.log('Coverage report generated: coverage_report.html & coverage_report.txt');
}

main();
