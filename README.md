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


## Version 5.0.1
- All unrestricted controller rates display as `999`.
- The former `FULL` display is now `999`.
- Schedule stages are labelled as Heating, Controlled cooling, or Natural cooling.
- No underlying workbook calculations were changed.


## Version 5.0.2 update fix

Version 5.0.1 accidentally contained `APP_VERSION = 5.0.0` while
`version.json` contained `5.0.1`. This caused the app to show the update
banner permanently. Version 5.0.2 corrects that mismatch.

The Refresh button now also:
- requests an immediate service-worker update;
- clears only KilnCalc caches;
- reloads with a versioned URL;
- reloads once when the new service worker becomes active.


## Version 5.1

- Maximum unrestricted heating displays as `9999`.
- Natural cooling, formerly shown as `FULL`, displays as `9999`.
- Controlled heating and cooling rates remain unchanged.
- Underlying calculation formulas are unchanged.
- Version checking and forced-refresh behavior from Version 5.0.2 are retained.


## Version 5.1.1

- Corrects the browser tab title to `KilnCalc 5.1`.
- Corrects the visible app header to `KilnCalc 5.1`.
- Corrects the installable PWA name to `KilnCalc 5.1 Glass Fusing Calculator`.
- Keeps all Version 5.1 calculation and rate-display behavior unchanged.


## Version 5.1.2
- Enclosure/dams option `N.v.t.` renamed to `Not applicable`.
- Process `Slump-Other` renamed to `Slump`.
- Process `Slump-Ceramic` and its ceramic-only input fields removed.
- Total estimated duration moved to the bottom of section 3, Automatic firing schedule.
- Calculated results moved to section 4.
- Underlying firing formulas remain unchanged.


## Version 5.1.3

- Restores the complete Automatic firing schedule in section 3.
- Removes obsolete JavaScript references to the deleted Oven type and Ceramic maximum-rate fields.
- Makes form reading defensive against missing controls.
- Keeps Total estimated duration at the bottom of the schedule.
- Underlying firing calculations remain unchanged.
