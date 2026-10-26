# MALEE Trade Dashboard Update Workflow

Updated source workbook: `Malee SEPTEMBER 69.xlsx`

Source workbook modified: `2026-10-26 11:56:50`

## Monthly update steps

1. Update the Excel workbook first using the MALEE MOC trade-report workflow.
2. Save the new workbook in `<local MALEE workbook folder>` with the latest month name.
3. Point `SOURCE_WORKBOOK` in `work/build_malee_dashboard_data.py` to the latest workbook path if the file name changed.
4. Run `python -X utf8 .\work\build_malee_dashboard_data.py`.
5. Start or refresh local host from `outputs\malee-apr69-dashboard`.
6. Verify:
   - sheet filter excludes `Reference` and `Sheet1`;
   - latest period appears in raw table and charts;
   - value, YoY, and MoM charts render;
   - clicking a chart point shows value, YoY, MoM, previous period, previous-year value, and Excel cell.

Create and hash-check a local snapshot before editing. Open only that snapshot in Excel read-only, save under the new month name, and confirm the original workbook hash is unchanged. Verify the final destination hash before regenerating dashboard data.

For Com Code 203000000 use the top 15 countries and add countries without workbook rows into Other. For 203020000 and 209000000 use the top 100 to complete the existing country rows, then reconcile Other to the total. Preserve blank countries outside the canned-fruit top 15. Treat an absent country as zero only when the complete report reconciles and Other is zero.

For HS 20098920 and 2009, match Thai and English country names and divide both raw value and quantity by 1,000,000. Keep Avg/Unit and world-less-coconut formulas. Extend every affected value, volume, and average-unit chart series together.

## Source mapping currently used

- `ผลไม้กระป๋อง(Month)`: monthly country rows and total rows from Excel columns B:DB.
- `ผลไม้กระป๋อง(Q)`: completed quarterly totals from the monthly quarter-total row 32, Excel columns B:AJ. Add a quarter only after all three monthly values exist; Q3/2569 is complete at September.
- `ยอดส่งออกน้ำมะพร้าว`: HS 20098920 rows, quantity/value/avg unit, Excel columns C:BG.
- `น้ำผลไม้`: HS 2009 rows, quantity/value/ASP plus world less coconut formulas, Excel columns C:CQ.
- `น้ำผลไม้รายเดือน`: monthly country rows, other/total/coconut adjustment rows, Excel columns B:BR.
- `นม`: monthly country rows and total rows, Excel columns B:BR.

## Calculation logic

- MoM is calculated from the immediately preceding period in the same row.
- MoM is unavailable across gaps in the source calendar. Historical source gaps are preserved rather than filled.
- YoY is calculated against the same month or same quarter in the prior year.
- Blank or zero prior values return blank YoY/MoM to avoid false infinite growth.
- Formula rows use the cached values saved by Excel after `CalculateFullRebuild`.
- Com Code country inputs retain the established two-decimal precision. Summing rounded canned-fruit country rows can differ slightly from the unrounded MOC total; retain the rounding difference in the update audit.

## Primary web sources for the workbook update

- Ministry of Commerce Trade Report home: https://tradereport.moc.go.th/th
- MOC report: ตลาดส่งออกสำคัญของไทยรายสินค้า: https://tradereport.moc.go.th/th/stat/reportcomcodeexport04
- MOC report: รายพิกัดศุลกากร: https://tradereport.moc.go.th/th/stat/reporthscodeexport01
