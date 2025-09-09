import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as path from 'path';

interface AcceptanceCriteria {
  description: string;
  for_test?: boolean;
  test_cases?: {
    manual?: string[];
    automate?: string[];
  };
}

interface Feature {
  name: string;
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

function generateTestRunResultsYaml(featureMap: FeatureMap): string {
  const results: any = { test_run: [] };
  featureMap.features.forEach(feature => {
    if (feature.for_test) {
      const featureResult: any = {
        feature: feature.name,
        passed: null,
        acceptance_criteria: []
      };
      feature.acceptance_criteria.forEach(ac => {
        if (ac.for_test) {
          featureResult.acceptance_criteria.push({
            description: ac.description,
            passed: null,
            how_tested: null,
            notes: ''
          });
        }
      });
      results.test_run.push(featureResult);
    }
  });
  return yaml.dump(results, { lineWidth: 120 });
}

function main() {
  const featureMapPath = path.resolve('featureMap.yml');
  const featureMap = loadFeatureMap(featureMapPath);
  const yamlResults = generateTestRunResultsYaml(featureMap);
  const yamlPath = path.resolve('testPlan', 'testRunResults.yml');
  fs.writeFileSync(yamlPath, yamlResults);
  console.log('Test run results YAML generated:', yamlPath);
}

main();
