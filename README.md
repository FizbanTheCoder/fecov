# FEatureCOvearageBYTEst

## Opis
Projekt służy do generowania raportów pokrycia funkcjonalnego oraz checklist testowych na podstawie pliku `featureMap.yml`. Pozwala także na generowanie raportów z przebiegu testów.

## Struktura katalogów
- `src/` – kod źródłowy narzędzi
- `reports/` – generowane raporty pokrycia
- `testPlan/` – generowane checklisty i raporty testów

## Szybki start
1. Zainstaluj zależności:
	```pwsh
	npm install
	```
2. Przygotuj plik `featureMap.yml` według wzoru w repozytorium.
3. Wygeneruj raport pokrycia:
	```pwsh
	npm run fecov
	```
	Raporty znajdziesz w folderze `reports`.
4. Wygeneruj checklistę testów:
	```pwsh
	npm run generateTestPlan
	```
	Pliki znajdziesz w folderze `testPlan`.
5. Wygeneruj szablon wyników testów:
	```pwsh
	npm run generateTestRunResults
	```
	Uzupełnij plik `testPlan/testRunResults.yml` ręcznie.
6. Wygeneruj raport z przebiegu testów:
	```pwsh
	npm run generateTestReport
	```
	Raporty znajdziesz w folderze `testPlan`.

## Skrypty npm
- `build` – kompilacja TypeScript
- `fecov` – generowanie raportu pokrycia
- `generateTestPlan` – generowanie checklisty testów
- `generateTestRunResults` – generowanie szablonu wyników testów
- `generateTestReport` – generowanie raportu z przebiegu testów

## Wymagania
- Node.js >= 18
- npm

## Kontakt
Autor: FizbanTheCoder
