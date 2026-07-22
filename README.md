# KilnCalc 5.0

GitHub Pages-ready Progressive Web App generated from:

`5ca11d3d-9c88-470d-a741-48ac9814ad98.xlsx`

Workbook label: **V 22 juli 2026**

## Included features

- Exact active Excel calculation formulas and lookup values
- Round and rectangular glass modes
- Automatic mode switching
- Automatic diagonal replacement and locked diameter
- Project library with update/delete
- Single-project and all-project JSON export
- JSON import
- Undo and redo
- Recent/current project persistence
- Validation warnings and incompatible-setting prevention
- Printable A4 firing report / Save as PDF
- Native share support
- Glass-type comparison
- Collapsible sections
- Light, dark and system appearance
- Offline PWA installation
- Version check via `version.json`
- Automatic service-worker cache refresh after deployment

## Publish on existing GitHub Pages site

1. Extract the ZIP.
2. Upload all files from the extracted folder to the root of the existing GitHub repository.
3. Overwrite files with identical names and commit.
4. Keep Pages set to **main / root**.
5. Open the GitHub Pages address in Safari and refresh.
6. If an old Home Screen version remains, close it, refresh in Safari, and reopen it. The new service worker uses a different cache name.

## Calculation notes

The calculation engine reproduces the active formulas from the uploaded workbook, including the default input case:

- Bullseye-COE90
- 40 cm effective size
- 6 mm thickness
- First heating
- FullFuse
- No Bubble Soak
- 330 °C/hour ceramic maximum rate

Expected results:

- Minutes per mm: 18.36
- First heating: 110 minutes
- First heating rate: 271 °C/hour
- Top temperature: 804 °C
- Anneal time: 73 minutes
- Anneal hold: 24 minutes
- Total estimated duration: 4.1 hours
