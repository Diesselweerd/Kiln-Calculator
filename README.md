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


## Version 5.1.4

- Clean rebuild from working Version 5.1.1.
- Restores the complete firing schedule.
- Applies requested option labels and section order.
- Moves total duration below the schedule.
- Refresh unregisters the old service worker, clears KilnCalc caches, and reloads with a unique timestamp.


## Version 5.1.5

- Renames “Total estimated duration” to “Programmed duration”.
- States clearly that natural cooling is not included.
- Adds an explanation that natural cooling depends on kiln, load, insulation, and ambient temperature.
- Shows expected completion as programmed duration plus natural cooling.
- Firing calculations remain unchanged.


## Version 5.1.6

- Adds a dynamic temperature-versus-programmed-time graph.
- Natural cooling is dashed and excluded from programmed duration.
- Firing calculations are unchanged.


## Version 5.1.7

- Moves the graph out of the programmed-duration result card.
- Constrains the graph to the full available width of the display panel.
- Removes the forced 720 px minimum width and horizontal scrollbar.
- Reduces and responsively scales graph labels and explanatory text.
- Keeps the firing calculations unchanged.


## Version 5.2

- Corrects the horizontal axis to use true cumulative programmed time.
- Calculates ramp time from temperature difference divided by ramp rate.
- Adds all hold times to the cumulative time.
- Starts natural cooling exactly at the last programmed data point.
- Keeps natural cooling outside the programmed duration and time axis.


## Version 5.2.1

- Omits the bubble-soak graph point when Bubble Soak is set to `SKIP`.
- Also omits bubble-soak segments with a zero-minute hold.
- Does not draw a plateau or label for an omitted bubble-soak segment.
- Connects the previous programmed point directly to the next active segment.
- Firing calculations and the schedule table remain unchanged.


## Version 5.2.2

- Fixes the remaining bubble-soak graph issue.
- Reads the actual Bubble Soak input field directly.
- When Bubble Soak is `SKIP`, step 2 is removed from the graph.
- No step-2 point, plateau, label, or connecting vertex is drawn.
- The schedule table and firing calculations remain unchanged.
