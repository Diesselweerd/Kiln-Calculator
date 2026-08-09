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


## Version 5.2.3

- Removes Bubble Soak from the graph source sequence when it is set to `SKIP`.
- Eliminates the remaining downward connector to the skipped Bubble Soak target.
- Connects the end of Transformation directly to the next active phase.
- Prevents nonnumeric values such as `Skip` from being interpreted as 0 °C.
- Displays `SKIP` as the no-bubble-soak input choice.
- Keeps the programmed schedule calculations unchanged.


## Version 5.2.4

- Removes all x-axis time labels from the firing schedule graph.
- Removes the `Programmed elapsed time` title.
- Removes vertical time-grid lines.
- Leaves only a straight horizontal x-axis baseline.
- Retains all prior Bubble Soak and natural-cooling corrections.


## Version 5.2.5

- Renames the graph annotation beside the final programmed point to `Natural cooling`.
- Removes `duration not calculated` from that adjacent annotation.
- Retains the explanatory natural-cooling text elsewhere in the interface.
- Retains all previous graph and Bubble Soak corrections.


## Version 5.2.6

- Changes the Diagonal explanatory text under `Shapes and dimensions`.
- Old: `Rounded to one decimal, as in Excel.`
- New: `Rounded to one decimal.`
- Retains all previous graph, Bubble Soak and natural-cooling corrections.


## Version 5.3.0

- Adds a `Celsius (°C)` / `Fahrenheit (°F)` selector.
- Celsius mode is unchanged from version 5.2.6.
- Fahrenheit temperatures are displayed using `Tf = (Tc × 1.8) + 32`.
- Fahrenheit rates are displayed using `Tf = Tc × 1.8`.
- The ceramic-mould maximum-rate input accepts the selected rate unit.
- Fahrenheit rate input is converted back to Celsius internally before calculation.
- Schedule cards, calculated results, comparison table and firing graph use the selected unit.
- All calculations remain based on the original Celsius engine.


## Version 5.3.1

- Visible Heating history choice renamed to `1st heating`.
- Bubble Soak `SKIP` displays `Skip` for Rate and Target in Fahrenheit mode.
- Rate sentinel `9999` remains `9999` in Fahrenheit mode.
- End-phase Rate value `End` remains `End` in Fahrenheit mode.


## Version 5.3.2

- Renames `2e or more heating` to `2nd or additional heating`.
- Renames `Old fuse + New layer` to `New layer to existing fuse`.
- Simplifies the temperature selector labels to `Celsius` and `Fahrenheit`.
- Preserves the existing internal values for saved-project compatibility.


## Version 5.3.3

- Limits `Diameter / effective size` input to whole centimetres.
- Rounds entered or calculated effective-size values to the nearest integer.
- Displays no decimal places in the Diameter / effective size field or result.
- Leaves Length, Width and the separate Diagonal result unchanged.


## Version 5.3.4

- Fixes editing of `Diameter / effective size`.
- All digits can now be deleted so a completely new value can be entered.
- While the active field is empty, the displayed effective-size result shows an em dash.
- A valid entered value is still rounded to the nearest whole centimetre.
- If the field is left empty, the previous valid value is restored.


## Version 5.3.5

- Corrects the remaining deletion problem in `Diameter / effective size`.
- The field no longer triggers recalculation after every individual keystroke.
- Every digit can therefore be removed before a replacement value is entered.
- Rounding and recalculation occur when the edit is completed by changing or leaving the field.
- An empty field restores the previous valid whole-number value only after leaving the field.


## Version 5.3.6

- In Fahrenheit mode, numeric temperatures in `Automatic firing schedule` are rounded to whole degrees.
- `Skip` and `End` remain unchanged.
- Celsius formatting is unchanged.


## Version 5.3.7

- Replaces the default Project description text `Proefstuk` with the placeholder `Enter your project's name here`.
- Converts Ceramic mold maximum rate from Celsius to Fahrenheit with `Tf = (Tc × 1.8) + 32`.
- Converts back to Celsius with `Tc = (Tf − 32) / 1.8`.
- Displays and finalizes the Fahrenheit input as a rounded whole number.


## Version 5.3.8

- Confirms that Ceramic mold maximum rate remains internally stored and calculated in Celsius.
- Fahrenheit mode now provides a rounded display conversion only.
- Returning to Celsius restores the canonical stored Celsius value directly.
- No Fahrenheit-to-Celsius calculation is performed for this field.
- The Fahrenheit representation is read-only to prevent changing the canonical value through a display-only unit.


## Version 5.3.9
- Project description placeholder changed to "Enter your project's name here".


## Version 5.3.10

- `Enter your project's name here` is now an actual visible default value in the Project description field.
- It is no longer implemented only as placeholder text.


## Version 5.3.11

- Sets the default Ceramic mold maximum rate to `330 °C`.
- Fahrenheit mode displays the equivalent as `626 °F`.
- Both Celsius and Fahrenheit values are displayed as whole numbers.
- Celsius remains the canonical internal model value.


## Version 5.3.12

- Corrects Ceramic mold maximum rate to a true rate conversion.
- Default: `330 °C/hour`.
- Fahrenheit equivalent: `594 °F/hour`.
- Rate conversion uses `°F/hour = °C/hour × 1.8`; no `+32` offset is applied.
- Both unit modes display whole numbers.


## Version 5.3.13

- Deep correction of the Ceramic mold maximum rate default.
- Canonical default is `330 °C/hour`.
- Fahrenheit display is `594 °F/hour` (`330 × 1.8`).
- No `+32` temperature offset is used because this field is a rate.
- Adds a one-time migration of the autosaved current state, which previously overrode corrected source defaults in existing browser/PWA installations.
- New projects also explicitly start at the corrected canonical rate.


## Version 5.3.14
- Robustly stores Ceramic mold maximum rate only as canonical °C/hour.
- Default is 330 °C/hour; Fahrenheit display is 594 °F/hour.
- Uses a new state schema to prevent legacy local-storage values from overriding the corrected default.
- Uses versioned JavaScript filenames to prevent stale browser/PWA code from applying old conversion logic.
- Centralizes all ceramic-rate rendering and conversion; no +32 offset is used.


## Version 5.3.15

- All calculated Fahrenheit rates in **Automatic firing schedule** are rounded and displayed as whole numbers.
- Fahrenheit rate conversion remains `°F/hour = °C/hour × 1.8`.
- Celsius schedule-rate display remains unchanged.
- Fahrenheit rates embedded in schedule notes are also displayed as whole numbers.


## Version 5.3.16

- Printing/PDF uses the exact current **Project description** as the document title.
- The same Project description is printed visibly as the title at the top of the PDF.
- The former `KilnCalc - ` prefix has been removed.
- The regular application title is restored after printing.


## Version 5.3.17

- Round glass: the field title is `Diameter`.
- Rectangular glass: the field title is `Diameter (surface equivalent)`.
- Rectangular surface area is `Length × Width`.
- Surface-equivalent diameter is `1.1284 × √(Length × Width)`.
- The surface-equivalent diameter is used as the rectangular effective size in calculations.
- The displayed equivalent diameter remains rounded to the nearest whole centimetre.
- The geometric `Diagonal` remains calculated separately and displayed to one decimal.
- All version 5.3.16 Printing/PDF functionality is retained.

## Version 5.3.18
- Removed the diagonal calculation and its display from Shape & dimensions.
- Rectangular glass uses the surface-equivalent diameter `1.1284 × √(Length × Width)` in the same effective-size role as the entered diameter for round glass.
- Rectangular validation now uses the surface-equivalent diameter instead of the diagonal.
- Version 5.3.17 surface-equivalent diameter behavior and prior Printing/PDF functionality are retained.


## Version 5.3.20

- Based on version 5.3.18.
- When **Round glass** is selected, the visible `Length` and `Width` fields are cleared.
- Round mode stores Length and Width as zero so old rectangular values cannot reappear after autosave/reload.
- The version 5.3.18 removal of the diagonal calculation/display is retained.
- Rectangular glass continues to use the surface-equivalent diameter.


## Version 5.3.21
- Removed the automatic rectangular-mode checkbox in Shape and dimensions.
- Removed its associated automatic shape-switching logic.
- Removed the information box directly below it beginning with `Both dimensions are required`.
- All other version 5.3.20 behavior is retained.


## Version 5.3.22
- Replaces the rectangular-glass Help & calculation notes sentence with:
  `enter length and width; to calculate the surface area equivalent diameter.`
- Removes the **SHARE** option from the bottom of the page.
- Removes the unused sharing JavaScript handler.
