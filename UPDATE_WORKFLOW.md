# MALEE Trade Dashboard Update Workflow

Updated source workbook: `D:\OneDrive\stock\Valuation หุ้น\Malee\Malee JUNE 69.xlsx`

Source workbook modified: `2026-07-24 11:40:10`

## Monthly update steps

1. Update the Excel workbook first using the MALEE MOC trade-report workflow.
2. Save the new workbook in `D:\OneDrive\stock\Valuation หุ้น\Malee` with the latest month name.
3. Point `SOURCE_WORKBOOK` in `work/build_malee_dashboard_data.py` to the latest workbook path if the file name changed.
4. Run `python -X utf8 .\work\build_malee_dashboard_data.py`.
5. Start or refresh local host from `outputs\malee-apr69-dashboard`.
6. Verify:
   - sheet filter excludes `Reference` and `Sheet1`;
   - latest period appears in raw table and charts;
   - value, YoY, and MoM charts render;
   - clicking a chart point shows value, YoY, MoM, previous period, previous-year value, and Excel cell.

## Source mapping currently used

- `ผลไม้กระป๋อง(Month)`: monthly country rows and total rows from Excel columns B:CY.
- `ผลไม้กระป๋อง(Q)`: quarterly total row from Excel columns B:AI.
- `ยอดส่งออกน้ำมะพร้าว`: HS 20098920 rows, quantity/value/avg unit, Excel columns C:BD.
- `น้ำผลไม้`: HS 2009 rows, quantity/value/ASP plus world less coconut formulas, Excel columns C:CN.
- `น้ำผลไม้รายเดือน`: monthly country rows, other/total/coconut adjustment rows, Excel columns B:BO.
- `นม`: monthly country rows and total rows, Excel columns B:BO.

## Calculation logic

- MoM is calculated from the immediately preceding period in the same row.
- YoY is calculated against the same month or same quarter in the prior year.
- Blank or zero prior values return blank YoY/MoM to avoid false infinite growth.
- Formula rows use the cached values saved by Excel after `CalculateFullRebuild`.

## Primary web sources for the workbook update

- Ministry of Commerce Trade Report home: https://tradereport.moc.go.th/th
- MOC report: ตลาดส่งออกสำคัญของไทยรายสินค้า: https://tradereport.moc.go.th/th/stat/reportcomcodeexport04
- MOC report: รายพิกัดศุลกากร: https://tradereport.moc.go.th/th/stat/reporthscodeexport01
