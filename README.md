# fecov - feature coverage
## Opis
Projekt służy do generowania raportów pokrycia funkcjonalnego oraz checklist testowych na podstawie plików `.fecov.yml`. Pozwala także na generowanie raportów z przebiegu testów.

## Struktura katalogów
- `src/` – kod źródłowy narzędzi
- `reports/` – generowane raporty pokrycia
- `testPlan/` – generowane checklisty i raporty testów

## Szybki start
1. Zainstaluj zależności:
	```pwsh
	npm install
	```
2. Przygotuj pliki `.fecov.yml` według wzoru w repozytorium.
3. Wygeneruj raport pokrycia:
	```pwsh
	npm run fecov_coverage
	```
	Raporty znajdziesz w folderze `reports`.
4. Wygeneruj checklistę testów:
	```pwsh
	npm run fecov_generateTestPlan
	```
	Pliki znajdziesz w folderze `testPlan`.
5. Wygeneruj szablon wyników testów:
	```pwsh
	npm run fecov_generateTestRunResults
	```
	Pliki znajdziesz w folderze `testPlan`.
6. Wygeneruj raport z przebiegu testów:
	```pwsh
	npm run fecov_generateTestReport
	```
	Raporty znajdziesz w folderze `testPlan`.

## Skrypty npm
- `build` – kompilacja TypeScript
- `fecov_coverage` – generowanie raportu pokrycia
- `fecov_generateTestPlan` – generowanie checklisty testów
- `fecov_generateTestRunResults` – generowanie szablonu wyników testów
- `fecov_generateTestReport` – generowanie raportu z przebiegu testów

## Wymagania
- Node.js >= 18
- npm

## Uruchamianie jako ES Modules
Projekt korzysta z loadera `ts-node/esm` do uruchamiania TypeScript jako ES Modules:
```pwsh
npm run fecov_coverage
```

## Kontakt
Autor: FizbanTheCoder
