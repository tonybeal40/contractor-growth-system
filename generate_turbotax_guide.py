from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, HRFlowable
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_LEFT, TA_CENTER
import os

output_dir = r"c:\Users\tonyb\OneDrive\Documents\Playground\bill-docs-k7m2v9"
os.makedirs(output_dir, exist_ok=True)
pdf_path = os.path.join(output_dir, "ALLPRO_TurboTax_Guide_2023.pdf")

doc = SimpleDocTemplate(pdf_path, pagesize=letter, topMargin=0.75*inch, bottomMargin=0.75*inch, leftMargin=0.75*inch, rightMargin=0.75*inch)

styles = getSampleStyleSheet()

# Custom styles
title_style = ParagraphStyle("CustomTitle", parent=styles["Title"], fontSize=20, textColor=HexColor("#1a1a2e"), spaceAfter=6)
subtitle_style = ParagraphStyle("Subtitle", parent=styles["Normal"], fontSize=12, textColor=HexColor("#555555"), spaceAfter=20, alignment=TA_CENTER)
heading_style = ParagraphStyle("CustomHeading", parent=styles["Heading2"], fontSize=14, textColor=HexColor("#c0392b"), spaceBefore=16, spaceAfter=8)
subheading_style = ParagraphStyle("SubHeading", parent=styles["Heading3"], fontSize=12, textColor=HexColor("#2c3e50"), spaceBefore=10, spaceAfter=6)
body_style = ParagraphStyle("CustomBody", parent=styles["Normal"], fontSize=10, leading=14, spaceAfter=6)
bold_body = ParagraphStyle("BoldBody", parent=body_style, fontName="Helvetica-Bold")
step_style = ParagraphStyle("Step", parent=body_style, leftIndent=20, bulletIndent=5, spaceBefore=2, spaceAfter=2)
note_style = ParagraphStyle("Note", parent=body_style, fontSize=9, textColor=HexColor("#7f8c8d"), leftIndent=30, spaceAfter=4)
warning_style = ParagraphStyle("Warning", parent=body_style, fontSize=10, textColor=HexColor("#c0392b"), fontName="Helvetica-BoldOblique", spaceBefore=8, spaceAfter=8)
amount_style = ParagraphStyle("Amount", parent=body_style, fontName="Courier-Bold", fontSize=11, textColor=HexColor("#27ae60"))

story = []

# Title page
story.append(Spacer(1, 1.5*inch))
story.append(Paragraph("ALL-PRO METRO EAST CONSTRUCTION LLC", title_style))
story.append(Paragraph("2023 Tax Filing Guide for TurboTax Self-Employed", subtitle_style))
story.append(Spacer(1, 0.3*inch))
story.append(HRFlowable(width="80%", thickness=2, color=HexColor("#c0392b")))
story.append(Spacer(1, 0.3*inch))
story.append(Paragraph("Prepared for: Bill", ParagraphStyle("ForBill", parent=body_style, fontSize=12, alignment=TA_CENTER)))
story.append(Paragraph("Tax Year: January 1 - December 31, 2023", ParagraphStyle("TaxYear", parent=body_style, fontSize=12, alignment=TA_CENTER)))
story.append(Spacer(1, 0.3*inch))
story.append(Paragraph("This guide walks you through every screen and line in TurboTax Self-Employed to file your 2023 business taxes. Have your Excel workbook open beside you as you go.", body_style))
story.append(Spacer(1, 0.5*inch))
story.append(Paragraph("<b>DISCLAIMER:</b> This guide is for reference only. Final CPA/attorney review is still recommended before filing. Tax laws change and individual circumstances vary.", warning_style))
story.append(PageBreak())

# ===== SECTION 1: BEFORE YOU START =====
story.append(Paragraph("BEFORE YOU START", heading_style))
story.append(Paragraph("What you need handy:", bold_body))
items = [
    "Your 2023 Excel workbook (AllPro_Tax_2023.xlsx)",
    "Social Security Number (SSN) or EIN for All-Pro Metro East Construction LLC",
    "Your personal SSN, date of birth, address",
    "Any 1099-NEC or 1099-MISC forms received from clients",
    "Bank statements (for verification if needed)",
    "Last year's tax return (if available)",
]
for item in items:
    story.append(Paragraph("\u2022  " + item, step_style))

story.append(Spacer(1, 0.2*inch))
story.append(Paragraph("Which TurboTax version:", bold_body))
story.append(Paragraph("Use <b>TurboTax Self-Employed</b> (or TurboTax Premium with Self-Employed add-on). This is required because you have Schedule C business income. Do NOT use the basic or deluxe version -- they do not support Schedule C.", body_style))

# ===== SECTION 2: PERSONAL INFO =====
story.append(Paragraph("STEP 1: PERSONAL INFORMATION", heading_style))
story.append(Paragraph("When TurboTax asks for your personal info:", body_style))
steps = [
    "Enter your full legal name, SSN, date of birth, and current address",
    "Filing status: Choose whatever applies to you (Single, Married Filing Jointly, etc.)",
    'When asked "Did you have any self-employment income?" -- select <b>YES</b>',
]
for i, s in enumerate(steps, 1):
    story.append(Paragraph("<b>%d.</b>  %s" % (i, s), step_style))

# ===== SECTION 3: INCOME =====
story.append(Paragraph("STEP 2: BUSINESS INCOME (Schedule C)", heading_style))
story.append(Paragraph("TurboTax will walk you through setting up your business:", body_style))

story.append(Paragraph("Business Setup Screens:", subheading_style))
biz_steps = [
    ("Business name:", "All-Pro Metro East Construction LLC"),
    ("Business type:", "Select <b>LLC</b> (single-member LLC taxed as sole proprietorship)"),
    ("EIN:", "Enter your EIN if you have one. If not, use your SSN."),
    ("Business started:", 'Enter the year the business started (or select "before 2023" if applicable)'),
    ("Industry/Business code:", '<b>238990</b> -- "All Other Specialty Trade Contractors"'),
    ("Business address:", "Enter your business address"),
    ("Accounting method:", "<b>Cash</b> (this matches your bank-based records)"),
    ("Did you make any payments that required 1099s?", "If you paid any subcontractors over $600, answer Yes"),
]
for label, val in biz_steps:
    story.append(Paragraph("\u2022  <b>%s</b> %s" % (label, val), step_style))

story.append(Spacer(1, 0.15*inch))
story.append(Paragraph("Business Income:", subheading_style))
story.append(Paragraph("Your 2023 records show <b>$0 in recorded revenue/deposits</b> in the spreadsheet. However, you likely DID receive income -- it may have been deposited as cash or through a separate account.", body_style))
story.append(Paragraph("<b>IMPORTANT:</b> You MUST report all income received, even if it is not in the spreadsheet. Check your 1099 forms and bank deposits. Enter the total on the Gross receipts or sales line.", warning_style))
story.append(Paragraph("When TurboTax asks about income:", body_style))
income_steps = [
    '"Did you receive any 1099-NEC forms?" -- Enter each one you received',
    '"Any other self-employment income?" -- Enter any cash/check payments not on a 1099',
    "The TOTAL of all 1099s + other income = your <b>Gross Receipts</b> (Schedule C, Line 1)",
]
for i, s in enumerate(income_steps, 1):
    story.append(Paragraph("<b>%d.</b>  %s" % (i, s), step_style))

# ===== SECTION 4: COGS =====
story.append(Paragraph("STEP 3: COST OF GOODS SOLD (COGS)", heading_style))
story.append(Paragraph("TurboTax will ask if you had Cost of Goods Sold. Answer <b>YES</b>.", body_style))
story.append(Paragraph("From your records, your total COGS is:", body_style))
story.append(Paragraph("<b>$52,531.38</b>", amount_style))
story.append(Spacer(1, 0.1*inch))

story.append(Paragraph("COGS Breakdown:", subheading_style))
cogs_items = [
    ("Materials (Home Depot, Menards, Ace, Cifco, Upchurch, etc.)", "$30,932.34"),
    ("Contract Labor (Bill Payroll -- paid to workers)", "$20,690.00"),
    ("Dumpster/Disposal Fees (Millers Rolloff)", "$909.04"),
]
cogs_data = [["Category", "Amount"]]
for cat, amt in cogs_items:
    cogs_data.append([cat, amt])
cogs_data.append(["TOTAL COGS", "$52,531.38"])

t = Table(cogs_data, colWidths=[4.5*inch, 1.5*inch])
t.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), HexColor("#2c3e50")),
    ("TEXTCOLOR", (0, 0), (-1, 0), HexColor("#ffffff")),
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTSIZE", (0, 0), (-1, -1), 9),
    ("ALIGN", (1, 0), (1, -1), "RIGHT"),
    ("BACKGROUND", (0, -1), (-1, -1), HexColor("#ecf0f1")),
    ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
    ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#bdc3c7")),
    ("TOPPADDING", (0, 0), (-1, -1), 4),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
]))
story.append(t)

story.append(Spacer(1, 0.1*inch))
story.append(Paragraph("In TurboTax, when it asks about COGS:", body_style))
tt_cogs = [
    '"Purchases" or "Materials and supplies" -- enter <b>$30,932.34</b>',
    '"Contract labor" (labor paid to others, not yourself) -- enter <b>$20,690.00</b>',
    '"Other costs" -- enter <b>$909.04</b> (dumpster/disposal fees)',
]
for i, s in enumerate(tt_cogs, 1):
    story.append(Paragraph("<b>%d.</b>  %s" % (i, s), step_style))

story.append(Paragraph('<i>Note: The $1,450.00 labeled "Bil Payroll" in the data appears to be additional contract labor. It is included in the labor total above if it was worker pay. Verify this.</i>', note_style))

story.append(PageBreak())

# ===== SECTION 5: BUSINESS EXPENSES =====
story.append(Paragraph("STEP 4: BUSINESS EXPENSES (Line by Line)", heading_style))
story.append(Paragraph("Total deductible business expenses: <b>$159,836.46</b>", body_style))
story.append(Paragraph("TurboTax will show you expense categories one at a time. Here is exactly what to enter on each screen:", body_style))
story.append(Spacer(1, 0.1*inch))

expenses = [
    ("Advertising", "$10,608.04", "Angi's List / marketing fees. TurboTax line: Advertising", "Schedule C Line 8"),
    ("Car and Truck Expenses", "$14,719.64", "Vehicle gas ($7,677.91) + vehicle payments used for business ($7,041.73). Choose Actual Expenses method, NOT standard mileage. Enter gas, repairs, payments proportional to business use.", "Schedule C Line 9"),
    ("Contract Labor", "$20,690.00", "Already entered under COGS above. Do NOT double-enter here. Skip this if TurboTax already captured it in COGS.", "Schedule C Line 11"),
    ("Insurance (other than health)", "$3,110.84", "Pekin Insurance -- business liability/commercial insurance premiums", "Schedule C Line 15"),
    ("Office Expense / Supplies", "$1,241.46", "Office supplies purchased throughout the year", "Schedule C Line 18"),
    ("Rent -- Business Property", "$10,301.10", "Building rent for company building ($10,301.10). Enter under Other business property rent, NOT vehicles/equipment.", "Schedule C Line 20b"),
    ("Repairs and Maintenance", "$3,930.89", "Truck repairs and general maintenance", "Schedule C Line 21"),
    ("Meals (Business)", "$10,275.11", "Business entertainment/meals (lunch, dinner, networking). Note: Only <b>50%</b> is deductible for 2023. Enter the FULL amount ($10,275.11) -- TurboTax will automatically calculate the 50% deduction ($5,137.56).", "Schedule C Line 24b"),
    ("Travel", "$1,150.79", "Business travel expenses (not daily commuting)", "Schedule C Line 24a"),
    ("Other Expenses", "$0", "See the detailed list below for items to enter under Other Expenses", "Schedule C Line 27a"),
]

exp_data = [["TurboTax Category", "Enter This Amount", "Sched C Line"]]
for name, amt, desc, line in expenses:
    exp_data.append([name, amt, line])

t2 = Table(exp_data, colWidths=[2.5*inch, 1.5*inch, 1.5*inch])
t2.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), HexColor("#c0392b")),
    ("TEXTCOLOR", (0, 0), (-1, 0), HexColor("#ffffff")),
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTSIZE", (0, 0), (-1, -1), 9),
    ("ALIGN", (1, 0), (1, -1), "RIGHT"),
    ("ALIGN", (2, 0), (2, -1), "CENTER"),
    ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#bdc3c7")),
    ("TOPPADDING", (0, 0), (-1, -1), 4),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [HexColor("#ffffff"), HexColor("#f9f9f9")]),
]))
story.append(t2)

story.append(Spacer(1, 0.15*inch))
story.append(Paragraph("Detailed Notes for Each Category:", subheading_style))

for name, amt, desc, line in expenses:
    story.append(Paragraph("<b>%s</b> -- %s (%s)" % (name, amt, line), ParagraphStyle("ExpDetail", parent=body_style, fontName="Helvetica-Bold", fontSize=10, spaceBefore=8)))
    story.append(Paragraph(desc, ParagraphStyle("ExpDesc", parent=body_style, leftIndent=15, fontSize=9)))

story.append(Spacer(1, 0.15*inch))
story.append(Paragraph('"Other Expenses" -- Itemize These:', subheading_style))
story.append(Paragraph('When TurboTax asks "Any other expenses not listed above?" select YES and enter each of these:', body_style))

other_expenses = [
    ("Equipment Rental (Sunbelt/Quality Rental)", "$3,904.16"),
    ("Dumpster/Disposal Fees", "$909.04 (if not already in COGS)"),
    ("Pest Control / Exterminator", "$1,222.97"),
    ("U-Haul Rental", "$620.69"),
    ("Uniforms / Work Clothes", "$87.77"),
    ("State Fees / Licenses (State of Illinois)", "$153.38"),
    ("Health / Medical (business-related)", "$494.26"),
    ("Shop/Storage Rent", "$916.32"),
]

other_data = [["Description (type this in TurboTax)", "Amount"]]
for desc, amt in other_expenses:
    other_data.append([desc, amt])

t3 = Table(other_data, colWidths=[4.5*inch, 1.5*inch])
t3.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), HexColor("#2c3e50")),
    ("TEXTCOLOR", (0, 0), (-1, 0), HexColor("#ffffff")),
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTSIZE", (0, 0), (-1, -1), 9),
    ("ALIGN", (1, 0), (1, -1), "RIGHT"),
    ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#bdc3c7")),
    ("TOPPADDING", (0, 0), (-1, -1), 4),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
]))
story.append(t3)

story.append(PageBreak())

# ===== SECTION 6: NON-DEDUCTIBLE WARNING =====
story.append(Paragraph("ITEMS TO NOT DEDUCT (Non-Deductible)", heading_style))
story.append(Paragraph("The following items from your records are classified as <b>Non-Deductible</b> ($20,762.74 total). Do NOT enter these as business expenses:", body_style))

non_ded = [
    ("Building Rent (Company Building)", "$10,301.10", "Already captured above IF it is a legit business rent. Verify."),
    ("Phone/Internet (AT&amp;T)", "$5,610.70", "Personal phone bills are NOT deductible unless you have a dedicated business line. If it is a mix, only deduct the business percentage."),
    ("Equipment Rental (Sunbelt)", "$3,904.16", "These were flagged as non-deductible but ARE likely deductible -- verify and move to expenses if business-use."),
    ("Storage Rent", "$946.32", "Verify if business storage -- if yes, it IS deductible."),
]

for name, amt, note in non_ded:
    story.append(Paragraph("<b>%s</b> -- %s" % (name, amt), ParagraphStyle("NonDed", parent=body_style, fontName="Helvetica-Bold", spaceBefore=6)))
    story.append(Paragraph(note, ParagraphStyle("NonDedNote", parent=body_style, leftIndent=15, fontSize=9, textColor=HexColor("#7f8c8d"))))

story.append(Spacer(1, 0.15*inch))
story.append(Paragraph('<b>IMPORTANT NOTE ON NON-DEDUCTIBLE ITEMS:</b> Some items flagged as "Non-Deductible" in the spreadsheet (like equipment rental and phone bills) may actually be partially or fully deductible. Review each with a tax professional. If you used your phone 50% for business, you can deduct 50% of the phone bill.', warning_style))

# ===== SECTION 7: CHARITABLE =====
story.append(Paragraph("STEP 5: CHARITABLE CONTRIBUTIONS", heading_style))
story.append(Paragraph("Your records show <b>$11,866.46</b> in charitable contributions.", body_style))
story.append(Paragraph("<b>These go on Schedule A (Itemized Deductions), NOT Schedule C.</b> They are personal deductions, not business expenses.", body_style))
story.append(Paragraph("When TurboTax asks about charitable donations:", body_style))
charity_steps = [
    'Under "Deductions &amp; Credits" section, find "Charitable Donations"',
    "Enter <b>$11,866.46</b> as cash donations to qualified organizations",
    "You will need the names of the organizations -- check your bank statements",
    "You will only benefit from this if you ITEMIZE deductions (instead of taking standard deduction)",
]
for i, s in enumerate(charity_steps, 1):
    story.append(Paragraph("<b>%d.</b>  %s" % (i, s), step_style))

# ===== SECTION 8: ATM/CREDIT CARDS =====
story.append(Paragraph("STEP 6: ATM WITHDRAWALS &amp; CREDIT CARD PAYMENTS", heading_style))
story.append(Paragraph("Your records show:", body_style))
story.append(Paragraph("<b>ATM/Cash Withdrawals:</b> $65,470.00", bold_body))
story.append(Paragraph("<b>Credit Card Payments:</b> $30,549.44", bold_body))
story.append(Spacer(1, 0.1*inch))
story.append(Paragraph("<b>These are NOT directly deductible as-is.</b> ATM withdrawals and credit card payments are transfers of money -- not expenses themselves. The actual expenses come from what the cash/credit was SPENT on.", warning_style))
story.append(Paragraph("If you used ATM cash to buy materials, pay workers, or cover business costs, those specific purchases are the deductions -- not the ATM withdrawal itself. Since these are already categorized elsewhere in your records, do NOT enter them separately in TurboTax.", body_style))

story.append(PageBreak())

# ===== SECTION 9: VEHICLE =====
story.append(Paragraph("STEP 7: VEHICLE EXPENSES", heading_style))
story.append(Paragraph("TurboTax will ask about vehicle use. Here is what to enter:", body_style))
veh_steps = [
    "When asked if you used a vehicle for business -- <b>YES</b>",
    "Enter vehicle info (year, make, model)",
    'Select <b>"Actual Expenses"</b> method (you have gas receipts and vehicle payments tracked)',
    "Enter gas/fuel: <b>$7,677.91</b>",
    "Enter vehicle payments (business portion): <b>$11,197.07</b>",
    "TurboTax will ask what % was business use -- estimate honestly (e.g., 80%, 90%)",
    "Your spreadsheet shows a vehicle writeoff of <b>$14,719.64</b> -- this is gas + business portion of payments",
    "If you have a vehicle loan, the INTEREST portion may also be deductible -- have your loan statement ready",
]
for i, s in enumerate(veh_steps, 1):
    story.append(Paragraph("<b>%d.</b>  %s" % (i, s), step_style))

story.append(Paragraph("<i>Alternative: If you tracked mileage, you can use Standard Mileage Rate instead ($0.655/mile for 2023). Choose whichever gives you a bigger deduction -- but you cannot use both methods.</i>", note_style))

# ===== SECTION 10: SE TAX =====
story.append(Paragraph("STEP 8: SELF-EMPLOYMENT TAX", heading_style))
story.append(Paragraph("TurboTax calculates this automatically. As a self-employed individual, you pay:", body_style))
se_items = [
    "Social Security tax: 12.4% (on first $160,200 of net earnings for 2023)",
    "Medicare tax: 2.9% (on all net earnings)",
    "Total SE tax rate: 15.3%",
    "You can deduct HALF of the SE tax on your 1040 (TurboTax does this automatically)",
]
for item in se_items:
    story.append(Paragraph("\u2022  " + item, step_style))

# ===== SECTION 11: REVIEW =====
story.append(Paragraph("STEP 9: REVIEW &amp; FILE", heading_style))
story.append(Paragraph("Before you submit, verify these numbers match:", body_style))

review_data = [
    ["Schedule C Line", "Description", "Expected Amount"],
    ["Line 1", "Gross Receipts (from 1099s + other income)", "??? (enter YOUR total)"],
    ["Line 4", "Cost of Goods Sold", "$52,531.38"],
    ["Line 8", "Advertising", "$10,608.04"],
    ["Line 9", "Car/Truck Expenses", "$14,719.64"],
    ["Line 15", "Insurance", "$3,110.84"],
    ["Line 18", "Office Expense", "$1,241.46"],
    ["Line 20b", "Rent -- Business Property", "$10,301.10"],
    ["Line 21", "Repairs", "$3,930.89"],
    ["Line 24a", "Travel", "$1,150.79"],
    ["Line 24b", "Meals (50%)", "$5,137.56"],
    ["Line 27a", "Other Expenses", "~$8,308.55"],
]

t4 = Table(review_data, colWidths=[1.2*inch, 2.8*inch, 1.8*inch])
t4.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), HexColor("#1a1a2e")),
    ("TEXTCOLOR", (0, 0), (-1, 0), HexColor("#ffffff")),
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTSIZE", (0, 0), (-1, -1), 9),
    ("ALIGN", (2, 0), (2, -1), "RIGHT"),
    ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#bdc3c7")),
    ("TOPPADDING", (0, 0), (-1, -1), 4),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [HexColor("#ffffff"), HexColor("#f2f2f2")]),
]))
story.append(t4)

story.append(Spacer(1, 0.2*inch))
story.append(Paragraph("FINAL CHECKLIST", heading_style))
checklist = [
    "Did you enter ALL income (1099s + cash/checks)?",
    "Did you enter COGS (materials + contract labor + disposal)?",
    "Did you enter each expense category with the amounts above?",
    "Did you set up your vehicle with actual expenses?",
    "Did you enter charitable contributions under Deductions (not Schedule C)?",
    "Did you review for double-counting (e.g., contract labor in COGS AND expenses)?",
    "Did you answer estimated tax questions (may owe quarterly payments going forward)?",
    "Did TurboTax calculate your self-employment tax?",
    "Did you review the final return before e-filing?",
]
for item in checklist:
    story.append(Paragraph("\u2610  " + item, step_style))

story.append(Spacer(1, 0.3*inch))
story.append(HRFlowable(width="100%", thickness=1, color=HexColor("#bdc3c7")))
story.append(Spacer(1, 0.1*inch))
story.append(Paragraph("Prepared by All-Pro Metro East Construction LLC Tax Package System", ParagraphStyle("Footer", parent=body_style, fontSize=8, textColor=HexColor("#999999"), alignment=TA_CENTER)))
story.append(Paragraph("This document is for guidance only -- consult a CPA for final review.", ParagraphStyle("Footer2", parent=body_style, fontSize=8, textColor=HexColor("#c0392b"), alignment=TA_CENTER)))

doc.build(story)
print("PDF created: %s" % pdf_path)
print("File size: %d bytes" % os.path.getsize(pdf_path))
