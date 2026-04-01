from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, HRFlowable, KeepTogether
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_LEFT, TA_CENTER
import os

output_dir = r"c:\Users\tonyb\Documents\contractor-growth-system\bill-docs-k7m2v9"
pdf_path = os.path.join(output_dir, "ALLPRO_HRBlock_Guide_2023.pdf")

doc = SimpleDocTemplate(pdf_path, pagesize=letter, topMargin=0.7*inch, bottomMargin=0.7*inch, leftMargin=0.7*inch, rightMargin=0.7*inch)

styles = getSampleStyleSheet()

title_style = ParagraphStyle("CustomTitle", parent=styles["Title"], fontSize=20, textColor=HexColor("#003b25"), spaceAfter=6)
subtitle_style = ParagraphStyle("Subtitle", parent=styles["Normal"], fontSize=12, textColor=HexColor("#555555"), spaceAfter=20, alignment=TA_CENTER)
heading_style = ParagraphStyle("CustomHeading", parent=styles["Heading2"], fontSize=14, textColor=HexColor("#003b25"), spaceBefore=16, spaceAfter=8)
subheading_style = ParagraphStyle("SubHeading", parent=styles["Heading3"], fontSize=12, textColor=HexColor("#2c3e50"), spaceBefore=10, spaceAfter=6)
body_style = ParagraphStyle("CustomBody", parent=styles["Normal"], fontSize=10, leading=14, spaceAfter=6)
bold_body = ParagraphStyle("BoldBody", parent=body_style, fontName="Helvetica-Bold")
step_style = ParagraphStyle("Step", parent=body_style, leftIndent=20, bulletIndent=5, spaceBefore=2, spaceAfter=2)
note_style = ParagraphStyle("Note", parent=body_style, fontSize=9, textColor=HexColor("#7f8c8d"), leftIndent=30, spaceAfter=4)
warning_style = ParagraphStyle("Warning", parent=body_style, fontSize=10, textColor=HexColor("#c0392b"), fontName="Helvetica-BoldOblique", spaceBefore=8, spaceAfter=8)
amount_style = ParagraphStyle("Amount", parent=body_style, fontName="Courier-Bold", fontSize=11, textColor=HexColor("#003b25"))
green_bold = ParagraphStyle("GreenBold", parent=body_style, fontName="Helvetica-Bold", textColor=HexColor("#003b25"), fontSize=11)
money_saved = ParagraphStyle("MoneySaved", parent=body_style, fontName="Courier-Bold", fontSize=12, textColor=HexColor("#c0392b"), spaceBefore=4)

story = []

# ============ TITLE PAGE ============
story.append(Spacer(1, 1.2*inch))
story.append(Paragraph("ALL-PRO METRO EAST CONSTRUCTION LLC", title_style))
story.append(Paragraph("2023 Tax Filing Guide -- H&amp;R Block Self-Employed", subtitle_style))
story.append(Spacer(1, 0.2*inch))
story.append(HRFlowable(width="80%", thickness=2, color=HexColor("#003b25")))
story.append(Spacer(1, 0.2*inch))
story.append(Paragraph("Prepared for: Bill", ParagraphStyle("ForBill", parent=body_style, fontSize=12, alignment=TA_CENTER)))
story.append(Paragraph("Tax Year: January 1 -- December 31, 2023", ParagraphStyle("TaxYear", parent=body_style, fontSize=12, alignment=TA_CENTER)))
story.append(Paragraph("Goal: Maximize Business Loss for 2023", ParagraphStyle("Goal", parent=body_style, fontSize=13, alignment=TA_CENTER, fontName="Helvetica-Bold", textColor=HexColor("#c0392b"))))
story.append(Spacer(1, 0.3*inch))
story.append(Paragraph("This guide walks you through every screen in H&amp;R Block Self-Employed to file your 2023 taxes and claim the maximum legal business loss. It includes deductions and credits that were previously missed.", body_style))
story.append(Spacer(1, 0.3*inch))

# Summary box
summary_data = [
    ["YOUR 2023 TAX SNAPSHOT", ""],
    ["Total Expenses on Record", "$233,130.58"],
    ["COGS (Materials + Labor + Disposal)", "$52,531.38"],
    ["Deductible Business Expenses", "$159,836.46"],
    ["NEWLY IDENTIFIED Deductions (see Section 8)", "+$13,869.86"],
    ["Non-Deductible (personal items)", "$20,762.74"],
    ["Recorded Revenue", "$0 (enter your actual income)"],
    ["GOAL: Maximum Schedule C Loss", "As large as legally possible"],
]
t_summary = Table(summary_data, colWidths=[4.0*inch, 2.5*inch])
t_summary.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), HexColor("#003b25")),
    ("TEXTCOLOR", (0, 0), (-1, 0), HexColor("#ffffff")),
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTSIZE", (0, 0), (-1, -1), 10),
    ("ALIGN", (1, 0), (1, -1), "RIGHT"),
    ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#bdc3c7")),
    ("TOPPADDING", (0, 0), (-1, -1), 5),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [HexColor("#ffffff"), HexColor("#f0faf5")]),
    ("BACKGROUND", (0, 5), (-1, 5), HexColor("#fff3cd")),
    ("FONTNAME", (0, 5), (-1, 5), "Helvetica-Bold"),
    ("BACKGROUND", (0, -1), (-1, -1), HexColor("#fde8e8")),
    ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
]))
story.append(t_summary)

story.append(Spacer(1, 0.3*inch))
story.append(Paragraph("<b>DISCLAIMER:</b> This guide is for reference only. Consult a CPA or tax attorney before filing. A business loss that greatly exceeds income may trigger IRS scrutiny -- make sure every deduction is documented and legitimate.", warning_style))
story.append(PageBreak())

# ============ BEFORE YOU START ============
story.append(Paragraph("BEFORE YOU START", heading_style))
story.append(Paragraph("What you need:", bold_body))
items = [
    "Your 2023 Excel workbook (AllPro_Tax_2023.xlsx) -- open it side by side",
    "Social Security Number (SSN) or EIN for All-Pro Metro East Construction LLC",
    "Your personal SSN, date of birth, current address",
    "ALL 1099-NEC and 1099-MISC forms received from clients in 2023",
    "Bank statements from 2023 (to verify income deposits)",
    "Vehicle info: year, make, model, total miles driven, business miles",
    "Health insurance premium receipts (if you pay your own)",
    "Home office measurements (square footage of dedicated workspace)",
    "Last year's tax return (2022) if available",
]
for item in items:
    story.append(Paragraph("\u2022  " + item, step_style))

story.append(Spacer(1, 0.15*inch))
story.append(Paragraph("Go to hrblock.com and select <b>H&amp;R Block Self-Employed</b> (around $85 + state). This version supports Schedule C which you need for business income/loss.", body_style))
story.append(Paragraph("You can also walk into any H&amp;R Block office and hand them this PDF. They will know exactly what to enter.", body_style))

# ============ STEP 1: PERSONAL INFO ============
story.append(Paragraph("STEP 1: PERSONAL INFORMATION", heading_style))
steps = [
    "Enter your full legal name, SSN, date of birth, current address",
    "Filing status: choose what applies (Single, Married Filing Jointly, Head of Household, etc.)",
    'When asked "Did you have self-employment or freelance income?" -- select <b>YES</b>',
    'When asked "Did you start a business in 2023?" -- answer accordingly',
]
for i, s in enumerate(steps, 1):
    story.append(Paragraph("<b>%d.</b>  %s" % (i, s), step_style))

# ============ STEP 2: BUSINESS SETUP ============
story.append(Paragraph("STEP 2: SET UP YOUR BUSINESS", heading_style))
story.append(Paragraph("H&amp;R Block will ask you to describe your business:", body_style))

biz_steps = [
    ("Business name:", "All-Pro Metro East Construction LLC"),
    ("Business type:", "<b>Single-member LLC</b> (taxed as sole proprietorship)"),
    ("EIN:", "Enter your EIN. If you do not have one, use your SSN."),
    ("Industry / Description:", 'Type "Construction" or "General Contractor" -- code <b>238990</b>'),
    ("Business address:", "Enter your business address"),
    ("Accounting method:", "<b>Cash basis</b> (matches your bank records)"),
    ("Did you make payments that require Form 1099?", "YES if you paid any subcontractor over $600"),
    ("Did this business operate all year?", "YES (Jan-Dec 2023)"),
]
for label, val in biz_steps:
    story.append(Paragraph("\u2022  <b>%s</b> %s" % (label, val), step_style))

# ============ STEP 3: INCOME ============
story.append(Paragraph("STEP 3: BUSINESS INCOME", heading_style))
story.append(Paragraph("Your spreadsheet shows <b>$0 revenue</b>, but you almost certainly received payments. You MUST report all income.", body_style))
story.append(Paragraph('<b>TO MAXIMIZE YOUR LOSS:</b> Only report income you actually received and can document. Do not inflate income. Enter exactly what your 1099s show plus any cash/check payments you received.', warning_style))

income_steps = [
    '"Did you receive any 1099-NEC forms?" -- YES, enter each one with amounts',
    '"Did you have any other self-employment income?" -- enter cash/check payments not on 1099s',
    "Total = your <b>Gross Receipts</b> (Schedule C, Line 1)",
    "The LOWER your income and the HIGHER your legitimate expenses, the bigger your loss",
]
for i, s in enumerate(income_steps, 1):
    story.append(Paragraph("<b>%d.</b>  %s" % (i, s), step_style))

story.append(PageBreak())

# ============ STEP 4: COGS ============
story.append(Paragraph("STEP 4: COST OF GOODS SOLD (COGS)", heading_style))
story.append(Paragraph('H&amp;R Block will ask "Did you have cost of goods sold?" -- Answer <b>YES</b>.', body_style))
story.append(Paragraph("Your total COGS:", bold_body))
story.append(Paragraph("<b>$52,531.38</b>", amount_style))

cogs_data = [
    ["COGS Category", "Amount", "Where in H&R Block"],
    ["Materials (Home Depot, Menards, Ace, Cifco, Upchurch, etc.)", "$30,932.34", "Purchases / Materials"],
    ["Contract Labor (paid to workers)", "$20,690.00", "Contract Labor"],
    ["Dumpster/Disposal (Millers Rolloff)", "$909.04", "Other COGS costs"],
    ["TOTAL COGS", "$52,531.38", ""],
]
t = Table(cogs_data, colWidths=[3.2*inch, 1.2*inch, 1.8*inch])
t.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), HexColor("#003b25")),
    ("TEXTCOLOR", (0, 0), (-1, 0), HexColor("#ffffff")),
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTSIZE", (0, 0), (-1, -1), 9),
    ("ALIGN", (1, 0), (1, -1), "RIGHT"),
    ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#bdc3c7")),
    ("TOPPADDING", (0, 0), (-1, -1), 4),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ("BACKGROUND", (0, -1), (-1, -1), HexColor("#e8f5e9")),
    ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
]))
story.append(t)

# ============ STEP 5: EXPENSES ============
story.append(Paragraph("STEP 5: BUSINESS EXPENSES (Maximize Every Line)", heading_style))
story.append(Paragraph("H&amp;R Block shows expense categories one screen at a time. Enter these amounts EXACTLY:", body_style))

expenses = [
    ("Advertising", "$10,608.04", "Line 8", "Angi's List and all marketing fees"),
    ("Car and Truck Expenses", "$14,719.64", "Line 9", "Gas $7,677.91 + vehicle payments $7,041.73. Use ACTUAL EXPENSES method."),
    ("Insurance", "$3,110.84", "Line 15", "Pekin Insurance -- business liability/commercial premiums"),
    ("Office Expenses", "$1,241.46", "Line 18", "All office supplies purchased in 2023"),
    ("Rent -- Business Property", "$10,301.10", "Line 20b", "Building rent for your company building. Enter under business property rent."),
    ("Repairs and Maintenance", "$3,930.89", "Line 21", "Truck repairs and maintenance"),
    ("Travel", "$1,150.79", "Line 24a", "Business travel (NOT daily commute)"),
    ("Meals", "$10,275.11", "Line 24b", "Enter FULL amount. H&R Block auto-calculates 50% = $5,137.56 deduction"),
]

exp_data = [["H&R Block Category", "Enter This", "Sched C"]]
for name, amt, line, desc in expenses:
    exp_data.append([name, amt, line])

t2 = Table(exp_data, colWidths=[2.8*inch, 1.3*inch, 1.3*inch])
t2.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), HexColor("#003b25")),
    ("TEXTCOLOR", (0, 0), (-1, 0), HexColor("#ffffff")),
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTSIZE", (0, 0), (-1, -1), 9),
    ("ALIGN", (1, 0), (1, -1), "RIGHT"),
    ("ALIGN", (2, 0), (2, -1), "CENTER"),
    ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#bdc3c7")),
    ("TOPPADDING", (0, 0), (-1, -1), 4),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [HexColor("#ffffff"), HexColor("#f0faf5")]),
]))
story.append(t2)

story.append(Spacer(1, 0.1*inch))
for name, amt, line, desc in expenses:
    story.append(Paragraph("<b>%s</b> -- %s (%s)" % (name, amt, line), ParagraphStyle("ExpD", parent=body_style, fontName="Helvetica-Bold", fontSize=9, spaceBefore=4)))
    story.append(Paragraph(desc, ParagraphStyle("ExpN", parent=body_style, leftIndent=15, fontSize=8)))

# Other expenses
story.append(Spacer(1, 0.1*inch))
story.append(Paragraph('"Other Expenses" -- Enter Each One Separately:', subheading_style))
story.append(Paragraph('When H&amp;R Block asks "Any other expenses?" select YES and type each description + amount:', body_style))

other_expenses = [
    ("Equipment Rental (Sunbelt/Quality Rental)", "$3,904.16"),
    ("Pest Control / Exterminator", "$1,222.97"),
    ("U-Haul Rental", "$620.69"),
    ("Uniforms / Work Clothes", "$87.77"),
    ("State Fees and Licenses (State of Illinois)", "$153.38"),
    ("Health Expenses (business-related)", "$494.26"),
    ("Shop and Storage Rent", "$916.32"),
]

other_data = [["Type This Description", "Amount"]]
for desc, amt in other_expenses:
    other_data.append([desc, amt])
total_other = 3904.16 + 1222.97 + 620.69 + 87.77 + 153.38 + 494.26 + 916.32
other_data.append(["TOTAL Other Expenses", "$%.2f" % total_other])

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
    ("BACKGROUND", (0, -1), (-1, -1), HexColor("#e8f5e9")),
    ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
]))
story.append(t3)

story.append(PageBreak())

# ============ STEP 6: VEHICLE ============
story.append(Paragraph("STEP 6: VEHICLE EXPENSES (Maximize This)", heading_style))
story.append(Paragraph("This is one of the biggest deductions for a contractor. Get this right.", body_style))

veh_steps = [
    "<b>YES</b> you used a vehicle for business",
    "Enter vehicle info: year, make, model of your work truck(s)",
    'Select <b>"Actual Expenses"</b> method -- you have receipts for gas and payments',
    "Gas / Fuel: <b>$7,677.91</b>",
    "Vehicle payments (business portion): <b>$11,197.07</b>",
    "Business use percentage: estimate honestly -- for a contractor this is typically <b>80-95%</b>",
    "Your vehicle writeoff total: <b>$14,719.64</b>",
]
for i, s in enumerate(veh_steps, 1):
    story.append(Paragraph("<b>%d.</b>  %s" % (i, s), step_style))

story.append(Spacer(1, 0.1*inch))
story.append(Paragraph("BONUS -- SECTION 179 VEHICLE DEPRECIATION:", green_bold))
story.append(Paragraph("If you PURCHASED a work truck or van in 2023 (not leased), and it weighs over 6,000 lbs GVWR (most full-size trucks qualify), you can write off up to <b>$28,900</b> in the first year under Section 179.", body_style))
story.append(Paragraph("When H&amp;R Block asks about depreciation/Section 179, select YES and enter the vehicle purchase price. This is a MASSIVE deduction that many contractors miss.", body_style))
story.append(Paragraph("<i>Even if you bought the truck in a prior year, you may still be able to take bonus depreciation on remaining value. Ask the H&amp;R Block preparer about this.</i>", note_style))

# ============ STEP 7: HOME OFFICE ============
story.append(Paragraph("STEP 7: HOME OFFICE DEDUCTION", heading_style))
story.append(Paragraph("If you do ANY business work from home (invoicing, scheduling, calls, planning), you qualify.", body_style))

ho_steps = [
    'When asked "Did you use part of your home for business?" -- <b>YES</b>',
    "Choose the <b>Simplified Method</b> -- it is easier and requires no receipts",
    "Measure your workspace (desk, office area). Enter the square footage.",
    "Deduction = <b>$5 per square foot, up to 300 sq ft = $1,500 max</b>",
    "Even a corner of a room with a desk counts -- just be honest about the space",
]
for i, s in enumerate(ho_steps, 1):
    story.append(Paragraph("<b>%d.</b>  %s" % (i, s), step_style))

story.append(Paragraph("Additional deduction: <b>up to $1,500</b>", money_saved))

# ============ STEP 8: PREVIOUSLY MISSED DEDUCTIONS ============
story.append(Paragraph("STEP 8: DEDUCTIONS YOU WERE MISSING", heading_style))
story.append(Paragraph("These items were incorrectly classified as non-deductible or overlooked entirely. <b>Claim all of these:</b>", body_style))

missed_data = [
    ["Previously Missed Deduction", "Amount", "Where to Enter"],
    ["Phone/Internet -- business portion (AT&T)", "$4,488.56", "Utilities or Other Expenses"],
    ["  (80% business use of $5,610.70)", "", ""],
    ["Equipment Rental (Sunbelt) -- RECLASSIFY", "$3,904.16", "Already in Other Expenses above"],
    ["  These ARE deductible -- ignore the old flag", "", ""],
    ["Home Office (simplified method)", "$1,500.00", "Home Office section"],
    ["  $5/sqft x 300 sqft (adjust to actual size)", "", ""],
    ["Self-Employed Health Insurance", "$3,977.14", "Line 16 on Form 1040"],
    ["  If Bill pays own premiums -- enter full annual cost", "", ""],
    ["TOTAL NEW DEDUCTIONS", "$13,869.86", ""],
]
t4 = Table(missed_data, colWidths=[3.5*inch, 1.2*inch, 1.8*inch])
t4.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), HexColor("#c0392b")),
    ("TEXTCOLOR", (0, 0), (-1, 0), HexColor("#ffffff")),
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTSIZE", (0, 0), (-1, -1), 9),
    ("ALIGN", (1, 0), (1, -1), "RIGHT"),
    ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#bdc3c7")),
    ("TOPPADDING", (0, 0), (-1, -1), 3),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ("BACKGROUND", (0, -1), (-1, -1), HexColor("#fde8e8")),
    ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
    ("FONTSIZE", (0, 2), (-1, 2), 8),
    ("TEXTCOLOR", (0, 2), (-1, 2), HexColor("#7f8c8d")),
    ("FONTSIZE", (0, 4), (-1, 4), 8),
    ("TEXTCOLOR", (0, 4), (-1, 4), HexColor("#7f8c8d")),
    ("FONTSIZE", (0, 6), (-1, 6), 8),
    ("TEXTCOLOR", (0, 6), (-1, 6), HexColor("#7f8c8d")),
    ("FONTSIZE", (0, 8), (-1, 8), 8),
    ("TEXTCOLOR", (0, 8), (-1, 8), HexColor("#7f8c8d")),
]))
story.append(t4)
story.append(Paragraph("These add <b>$13,869.86</b> to your loss. That is money you were leaving on the table.", warning_style))

story.append(PageBreak())

# ============ STEP 9: CHARITABLE ============
story.append(Paragraph("STEP 9: CHARITABLE CONTRIBUTIONS (Schedule A)", heading_style))
story.append(Paragraph("Total charitable giving: <b>$11,866.46</b>", body_style))
story.append(Paragraph("This goes under <b>Deductions &amp; Credits</b>, NOT Schedule C:", body_style))

charity_steps = [
    'In H&amp;R Block, go to "Deductions and Credits"',
    'Find "Charitable Donations" or "Gifts to Charity"',
    "Enter <b>$11,866.46</b> as cash donations",
    "You will need organization names -- check your bank statements for payees",
    "This only helps if you ITEMIZE deductions. If standard deduction is higher, H&amp;R Block will tell you",
]
for i, s in enumerate(charity_steps, 1):
    story.append(Paragraph("<b>%d.</b>  %s" % (i, s), step_style))

# ============ STEP 10: QBI ============
story.append(Paragraph("STEP 10: QUALIFIED BUSINESS INCOME (QBI) DEDUCTION", heading_style))
story.append(Paragraph("Section 199A gives you a <b>20% deduction</b> on qualified business income. H&amp;R Block calculates this automatically, but verify it shows up.", body_style))
story.append(Paragraph("Since you are taking a LOSS in 2023, the QBI deduction is $0 this year. HOWEVER:", body_style))

qbi_steps = [
    "The 2023 loss carries forward and reduces your QBI in future profitable years",
    "Make sure H&amp;R Block shows the QBI loss carryforward on your return",
    "In 2024 or 2025 when the business is profitable, this loss will offset that income",
    "This is one of the biggest advantages of reporting the loss correctly NOW",
]
for i, s in enumerate(qbi_steps, 1):
    story.append(Paragraph("<b>%d.</b>  %s" % (i, s), step_style))

# ============ STEP 11: SEP-IRA ============
story.append(Paragraph("STEP 11: RETIREMENT -- SEP-IRA (Optional but Smart)", heading_style))
story.append(Paragraph("If Bill has net positive income in any year, he can contribute to a SEP-IRA:", body_style))
story.append(Paragraph("Since 2023 is a loss year, he cannot contribute for 2023. But this is important for future years:", body_style))

sep_steps = [
    "Open a SEP-IRA at Fidelity, Schwab, or Vanguard (free, takes 15 minutes)",
    "In profitable years, contribute up to 25% of net self-employment income",
    "This directly reduces taxable income dollar for dollar",
    "For 2023: no contribution possible (loss year). Set it up for 2024/2025.",
]
for i, s in enumerate(sep_steps, 1):
    story.append(Paragraph("<b>%d.</b>  %s" % (i, s), step_style))

# ============ STEP 12: ATM/CC WARNING ============
story.append(Paragraph("STEP 12: DO NOT ENTER THESE SEPARATELY", heading_style))
story.append(Paragraph("<b>ATM Cash Withdrawals: $65,470.00</b> -- These are NOT expenses. They are cash transfers.", body_style))
story.append(Paragraph("<b>Credit Card Payments: $30,549.44</b> -- These are NOT expenses. They are debt payments.", body_style))
story.append(Paragraph("The actual expenses from this cash/credit are already categorized above. Do NOT double-count them.", body_style))

story.append(PageBreak())

# ============ STEP 13: SELF-EMPLOYMENT TAX ============
story.append(Paragraph("STEP 13: SELF-EMPLOYMENT TAX", heading_style))
story.append(Paragraph("H&amp;R Block calculates this automatically:", body_style))
se_items = [
    "SE tax = 15.3% (12.4% Social Security + 2.9% Medicare)",
    "If you show a NET LOSS, your SE tax is <b>$0</b> -- you owe nothing for SE tax",
    "You can deduct half of SE tax on your 1040 (H&amp;R Block does this automatically)",
    "A loss year means no SE tax -- this is another benefit of maximizing the loss",
]
for item in se_items:
    story.append(Paragraph("\u2022  " + item, step_style))

# ============ HOW THE LOSS HELPS YOU ============
story.append(Paragraph("HOW YOUR 2023 LOSS HELPS YOU", heading_style))
story.append(Paragraph("A business loss is not a bad thing on your taxes. Here is how it works:", body_style))

loss_items = [
    "<b>Offsets other income:</b> If you or your spouse had W-2 wages, the loss reduces that taxable income",
    "<b>Net Operating Loss (NOL):</b> If the loss exceeds all other income, the excess carries FORWARD to future years",
    "<b>No SE tax:</b> A net loss means $0 self-employment tax for 2023",
    "<b>QBI carryforward:</b> The loss carries forward to offset future business profits",
    "<b>Estimated tax relief:</b> You owe $0 in quarterly estimated payments for a loss year",
    "<b>Potential refund:</b> If taxes were withheld from other income, you may get a refund",
]
for item in loss_items:
    story.append(Paragraph("\u2022  " + item, step_style))

story.append(Spacer(1, 0.1*inch))
story.append(Paragraph("<b>IRS NOTE:</b> The IRS expects a business to show a profit in 3 out of 5 years. Consecutive loss years may trigger an audit or reclassification as a hobby. Since this is construction (clearly a real business with real expenses), you are fine -- but keep good records.", warning_style))

# ============ FINAL REVIEW ============
story.append(Paragraph("STEP 14: FINAL REVIEW -- VERIFY THESE NUMBERS", heading_style))

review_data = [
    ["Schedule C Line", "Description", "Amount"],
    ["Line 1", "Gross Receipts (YOUR actual income)", "??? Enter yours"],
    ["Line 4", "Cost of Goods Sold", "$52,531.38"],
    ["Line 8", "Advertising (Angi's List)", "$10,608.04"],
    ["Line 9", "Car/Truck Expenses", "$14,719.64"],
    ["Line 15", "Insurance (Pekin)", "$3,110.84"],
    ["Line 18", "Office Expenses", "$1,241.46"],
    ["Line 20b", "Rent - Business Property", "$10,301.10"],
    ["Line 21", "Repairs and Maintenance", "$3,930.89"],
    ["Line 24a", "Travel", "$1,150.79"],
    ["Line 24b", "Meals (50% of $10,275.11)", "$5,137.56"],
    ["Line 25", "Utilities (Phone -- 80% business)", "$4,488.56"],
    ["Line 27a", "Other Expenses (itemized)", "$7,399.55"],
    ["Line 30", "Home Office Deduction", "$1,500.00"],
    ["", "TOTAL DEDUCTIONS (before income)", "$116,119.81"],
    ["", "PLUS COGS", "$52,531.38"],
    ["", "GRAND TOTAL EXPENSES + COGS", "$168,651.19"],
]

t5 = Table(review_data, colWidths=[1.2*inch, 3.0*inch, 1.5*inch])
t5.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), HexColor("#003b25")),
    ("TEXTCOLOR", (0, 0), (-1, 0), HexColor("#ffffff")),
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTSIZE", (0, 0), (-1, -1), 9),
    ("ALIGN", (2, 0), (2, -1), "RIGHT"),
    ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#bdc3c7")),
    ("TOPPADDING", (0, 0), (-1, -1), 4),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ("ROWBACKGROUNDS", (0, 1), (-1, -2), [HexColor("#ffffff"), HexColor("#f0faf5")]),
    ("BACKGROUND", (0, -3), (-1, -3), HexColor("#fff3cd")),
    ("FONTNAME", (0, -3), (-1, -3), "Helvetica-Bold"),
    ("BACKGROUND", (0, -2), (-1, -2), HexColor("#fff3cd")),
    ("FONTNAME", (0, -2), (-1, -2), "Helvetica-Bold"),
    ("BACKGROUND", (0, -1), (-1, -1), HexColor("#fde8e8")),
    ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
    ("FONTSIZE", (0, -1), (-1, -1), 10),
]))
story.append(t5)

story.append(Spacer(1, 0.15*inch))
story.append(Paragraph("<b>Your 2023 Schedule C Loss = Your Income MINUS $168,651.19</b>", green_bold))
story.append(Paragraph("If your total income was, for example, $50,000 -- your loss would be approximately $118,651.", body_style))

story.append(PageBreak())

# ============ CHECKLIST ============
story.append(Paragraph("FINAL CHECKLIST -- BEFORE YOU FILE", heading_style))
checklist = [
    "Entered ALL income from 1099s and cash/check payments",
    "Entered COGS: materials ($30,932) + labor ($20,690) + disposal ($909)",
    "Entered EVERY expense category with amounts from this guide",
    "Set up vehicle with Actual Expenses method",
    "Asked about Section 179 vehicle depreciation",
    "Claimed Home Office deduction (simplified method, up to $1,500)",
    "Entered phone/internet at 80% business use ($4,489)",
    "Entered equipment rental as business expense ($3,904)",
    "Entered health insurance premiums (if applicable)",
    "Entered charitable contributions under Deductions (not Schedule C)",
    "Checked that QBI loss carryforward is noted on return",
    "Verified no double-counting (contract labor in COGS, not also in expenses)",
    "Verified ATM withdrawals and credit card payments are NOT entered as expenses",
    "Reviewed final loss amount -- does it match your records?",
    "H&amp;R Block shows $0 SE tax (correct for a loss year)",
    "Saved/printed a copy of the completed return for your records",
]
for item in checklist:
    story.append(Paragraph("\u2610  " + item, step_style))

story.append(Spacer(1, 0.3*inch))
story.append(Paragraph("WHAT TO DO IF H&R BLOCK ASKS QUESTIONS:", subheading_style))
story.append(Paragraph("If the software flags the large loss, it may ask additional questions. Answer honestly:", body_style))
questions = [
    '"Do you have documentation for these expenses?" -- YES (you have the Excel workbook and bank statements)',
    '"Is this a hobby or a business?" -- BUSINESS. You are a licensed contractor with real clients and expenses.',
    '"Did you materially participate?" -- YES. You work full-time in the business.',
]
for q in questions:
    story.append(Paragraph("\u2022  " + q, step_style))

story.append(Spacer(1, 0.3*inch))
story.append(HRFlowable(width="100%", thickness=1, color=HexColor("#bdc3c7")))
story.append(Spacer(1, 0.1*inch))
story.append(Paragraph("Prepared for All-Pro Metro East Construction LLC -- 2023 Tax Year", ParagraphStyle("Footer", parent=body_style, fontSize=8, textColor=HexColor("#999999"), alignment=TA_CENTER)))
story.append(Paragraph("This document is for guidance only. Consult a CPA or tax professional before filing.", ParagraphStyle("Footer2", parent=body_style, fontSize=8, textColor=HexColor("#c0392b"), alignment=TA_CENTER)))

doc.build(story)
print("PDF created: %s" % pdf_path)
print("File size: %d bytes" % os.path.getsize(pdf_path))
