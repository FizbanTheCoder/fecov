import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as path from 'path';

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

function generateMarkdownChecklist(featureMap: FeatureMap): string {
  let md = '# Test Plan Checklist\n\n';
  featureMap.features.forEach(feature => {
    if (feature.for_test) {
      md += `[ ] ${feature.name}    passed: [ ]\n`;
      feature.acceptance_criteria.forEach(ac => {
        if (ac.for_test) {
          md += `  [ ] ${ac.description}    passed: [ ]\n`;
          if (ac.test_cases?.manual) {
            md += `    Manual test cases: ${ac.test_cases.manual.join(', ')}\n`;
          }
          if (ac.test_cases?.automate) {
            md += `    Automated test cases: ${ac.test_cases.automate.join(', ')}\n`;
          }
          md += `    how_tested: [ ] manual [ ] automated\n`;
        }
      });
      md += '\n';
    }
  });
  return md;
}

function generateHtmlChecklist(featureMap: FeatureMap): string {
  let html = `<!DOCTYPE html><html><head><meta charset='utf-8'><title>Test Plan Checklist</title></head><body>`;
  html += `<h1>Test Plan Checklist</h1>`;
  featureMap.features.forEach(feature => {
    if (feature.for_test) {
      html += `<div style='margin-bottom:20px;'><label><input type='checkbox'> <b>${feature.name}</b></label> passed: <input type='checkbox'> <ul>`;
      feature.acceptance_criteria.forEach(ac => {
        if (ac.for_test) {
          html += `<li><label><input type='checkbox'> ${ac.description}</label> passed: <input type='checkbox'><ul>`;
          if (ac.test_cases?.manual) {
            html += `<li>Manual test cases: ${ac.test_cases.manual.join(', ')}</li>`;
          }
          if (ac.test_cases?.automate) {
            html += `<li>Automated test cases: ${ac.test_cases.automate.join(', ')}</li>`;
          }
          html += `<li>how_tested: <input type='checkbox'> manual <input type='checkbox'> automated</li>`;
          html += `</ul></li>`;
        }
      });
      html += `</ul></div>`;
    }
  });
  html += `</body></html>`;
  return html;
}

function main() {
  const workspaceDir = process.cwd();
  const testPlanDir = path.resolve('testPlan');
  if (!fs.existsSync(testPlanDir)) {
    fs.mkdirSync(testPlanDir, { recursive: true });
  }
  // Only process *.fecov.yml files
  const fecovFiles = fs.readdirSync(workspaceDir).filter(f => f.endsWith('.fecov.yml'));
  if (fecovFiles.length === 0) {
    console.error('Brak plików *.fecov.yml w katalogu projektu!');
    return;
  }
  for (const file of fecovFiles) {
    const featureMapPath = path.join(workspaceDir, file);
    const baseName = path.basename(file, '.fecov.yml');
    const featureMap = loadFeatureMap(featureMapPath);
    const markdown = generateMarkdownChecklist(featureMap);
    const html = generateHtmlChecklist(featureMap);
    const now = new Date();
    const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0,19);
    const mdPath = path.join(testPlanDir, `${baseName}_testPlan_${dateStr}.md`);
    const htmlPath = path.join(testPlanDir, `${baseName}_testPlan_${dateStr}.html`);
    fs.writeFileSync(mdPath, markdown);
    fs.writeFileSync(htmlPath, html);
    console.log('Test plan checklist generated:', mdPath, htmlPath);
  }
}

main();
