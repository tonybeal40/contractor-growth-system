from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, HRFlowable
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_LEFT, TA_CENTER
import os

output_dir = r"c:\Users\tonyb\Documents\contractor-growth-system\bill-docs-k7m2v9"
pdf_path = os.path.join(output_dir, "ALLPRO_HRBlock_Guide_2025.pdf")

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
story.append(Paragraph("2025 Tax Filing Guide -- H&amp;R Block Self-Employed", subtitle_style))
story.append(Spacer(1, 0.2*inch))
story.append(HRFlowable(width="80%", thickness=2, color=HexColor("#003b25")))
story.append(Spacer(1, 0.2*inch))
story.append(Paragraph("Prepared for: Bill", ParagraphStyle("ForBill", parent=body_style, fontSize=12, alignment=TA_CENTER)))
story.append(Paragraph("Tax Year: January 1 -- December 31, 2025", ParagraphStyle("TaxYear", parent=body_style, fontSize=12, alignment=TA_CENTER)))
story.append(Paragraph("Goal: Maximize Deductions and Minimize Tax Liability", ParagraphStyle("Goal", parent=body_style, fontSize=13, alignment=TA_CENTER, fontName="Helvetica-Bold", textColor=HexColor("#c0392b"))))
story.append(Spacer(1, 0.3*inch))
story.append(Paragraph("This guide walks you through every screen in H&amp;R Block Self-Employed to file your 2025 taxes. 2025 was a PROFITABLE year -- the strategy is to maximize every legal deduction to reduce your taxable income as much as possible.", body_style))
story.append(Spacer(1, 0.2*inch))

summary_data = [
    ["YOUR 2025 TAX SNAPSHOT", ""],
    ["Gross Revenue (Deposits/Income)", "$369,331.93"],
    ["Cost of Goods Sold (COGS)", "$49,832.74"],
    ["Gross Profit", "$319,499.19"],
    ["Business Expenses (on record)", "$140,707.12"],
    ["Vehicle Writeoff", "$20,676.13"],
    ["NEWLY IDENTIFIED Deductions (see Section 8)", "+$10,676.13"],
    ["Non-Deductible Transfers", "$49,592.80"],
    ["Payroll (Contract Labor)", "$49,194.49"],
    ["Net Income BEFORE new deductions", "$178,792.07"],
    ["Net Income AFTER new deductions", "~$168,115.94"],
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
    ("BACKGROUND", (0, 7), (-1, 7), HexColor("#fff3cd")),
    ("FONTNAME", (0, 7), (-1, 7), "Helvetica-Bold"),
    ("BACKGROUND", (0, -1), (-1, -1), HexColor("#fde8e8")),
    ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
]))
story.append(t_summary)

story.append(Spacer(1, 0.3*inch))
story.append(Paragraph("<b>DISCLAIMER:</b> This guide is for reference only. Consult a CPA or tax attorney before filing. Keep all receipts and bank statements as documentation.", warning_style))
story.append(PageBreak())

# ============ BEFORE YOU START ============
story.append(Paragraph("BEFORE YOU START", heading_style))
story.append(Paragraph("What you need:", bold_body))
items = [
    "Your 2025 Excel workbook (AllPro_Tax_2025.xlsx) -- open it side by side",
    "Social Security Number (SSN) or EIN for All-Pro Metro East Construction LLC",
    "Your personal SSN, date of birth, current address",
    "ALL 1099-NEC and 1099-MISC forms received from clients in 2025",
    "Bank statements from 2025 (you had $369,331.93 in deposits)",
    "Vehicle info: year, make, model, total miles driven, business miles",
    "Health insurance premium receipts (if you pay your own)",
    "Home office measurements (square footage of dedicated workspace)",
    "Last year's 2023 return (the loss carries forward via QBI)",
    "Any estimated tax payments made during 2025",
]
for item in items:
    story.append(Paragraph("\u2022  " + item, step_style))

story.append(Spacer(1, 0.15*inch))
story.append(Paragraph("Go to hrblock.com and select <b>H&amp;R Block Self-Employed</b>. Or walk into any H&amp;R Block office and hand them this PDF.", body_style))

# ============ STEP 1 ============
story.append(Paragraph("STEP 1: PERSONAL INFORMATION", heading_style))
steps = [
    "Enter your full legal name, SSN, date of birth, current address",
    "Filing status: choose what applies (Single, Married Filing Jointly, etc.)",
    'When asked "Did you have self-employment income?" -- select <b>YES</b>',
]
for i, s in enumerate(steps, 1):
    story.append(Paragraph("<b>%d.</b>  %s" % (i, s), step_style))

# ============ STEP 2: BUSINESS SETUP ============
story.append(Paragraph("STEP 2: SET UP YOUR BUSINESS", heading_style))
biz_steps = [
    ("Business name:", "All-Pro Metro East Construction LLC"),
    ("Business type:", "<b>Single-member LLC</b> (taxed as sole proprietorship)"),
    ("EIN:", "Enter your EIN. If you do not have one, use your SSN."),
    ("Industry:", 'Type "Construction" or "General Contractor" -- code <b>238990</b>'),
    ("Business address:", "Enter your business address"),
    ("Accounting method:", "<b>Cash basis</b>"),
    ("1099 payments:", "YES if you paid any subcontractor over $600"),
]
for label, val in biz_steps:
    story.append(Paragraph("\u2022  <b>%s</b> %s" % (label, val), step_style))

# ============ STEP 3: INCOME ============
story.append(Paragraph("STEP 3: BUSINESS INCOME -- $369,331.93", heading_style))
story.append(Paragraph("2025 was a strong revenue year. Your bank records show:", body_style))

income_data = [
    ["Month", "Deposits", "Month", "Deposits"],
    ["January", "$7,113.78", "July", "$29,245.94"],
    ["February", "$0", "August", "$40,112.38"],
    ["March", "$3,575.00", "September", "$38,566.18"],
    ["April", "$15,160.00", "October", "$33,110.82"],
    ["May", "$99,479.82", "November", "$46,059.53"],
    ["June", "$8,705.00", "December", "$68,733.48"],
    ["", "", "TOTAL", "$369,331.93"],
]
t_inc = Table(income_data, colWidths=[1.2*inch, 1.3*inch, 1.2*inch, 1.3*inch])
t_inc.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), HexColor("#003b25")),
    ("TEXTCOLOR", (0, 0), (-1, 0), HexColor("#ffffff")),
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTSIZE", (0, 0), (-1, -1), 9),
    ("ALIGN", (1, 0), (1, -1), "RIGHT"),
    ("ALIGN", (3, 0), (3, -1), "RIGHT"),
    ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#bdc3c7")),
    ("TOPPADDING", (0, 0), (-1, -1), 3),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ("BACKGROUND", (0, -1), (-1, -1), HexColor("#e8f5e9")),
    ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
]))
story.append(t_inc)

story.append(Spacer(1, 0.1*inch))
story.append(Paragraph("Enter each 1099-NEC you received. If the total of your 1099s does not equal $369,331.93, enter the difference as other self-employment income.", body_style))
story.append(Paragraph("<b>NOTE:</b> $20,530 in deposits bounced back (returned items). These reduce your actual income. Make sure your 1099 totals reflect only money you actually kept.", warning_style))

story.append(PageBreak())

# ============ STEP 4: COGS ============
story.append(Paragraph("STEP 4: COST OF GOODS SOLD -- $49,832.74", heading_style))
story.append(Paragraph('Answer <b>YES</b> when asked about Cost of Goods Sold.', body_style))

cogs_data = [
    ["COGS Category", "Amount", "Where in H&R Block"],
    ["Contract Labor / Payroll (paid to workers)", "$49,194.49", "Contract Labor"],
    ["Materials (supplies, lumber, hardware)", "$638.25", "Purchases / Materials"],
    ["TOTAL COGS", "$49,832.74", ""],
]
t_cogs = Table(cogs_data, colWidths=[3.2*inch, 1.2*inch, 1.8*inch])
t_cogs.setStyle(TableStyle([
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
story.append(t_cogs)

story.append(Paragraph("<b>Key workers paid in 2025:</b> Brian Davis, Casey Williamson, and others via Zelle. Make sure you filed 1099-NEC for anyone paid over $600.", body_style))

# ============ STEP 5: EXPENSES ============
story.append(Paragraph("STEP 5: BUSINESS EXPENSES -- $140,707.12", heading_style))
story.append(Paragraph("Enter these amounts on each screen:", body_style))

expenses = [
    ("Car and Truck Expenses", "$20,676.13", "Line 9", "Vehicle gas/fuel ($19,431.09) + vehicle costs ($1,245.04). Use ACTUAL EXPENSES method. Business use: 80-95%."),
    ("Insurance", "$1,179.88", "Line 15", "Business insurance premiums (Pekin/State Farm business portion)"),
    ("Repairs and Maintenance", "$65.16", "Line 21", "Equipment and truck repairs"),
    ("Meals (Business)", "$0", "Line 24b", "Identify any meals in the card transactions below and enter at 50%"),
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

# ============ CARD TRANSACTIONS TO CATEGORIZE ============
story.append(Spacer(1, 0.1*inch))
story.append(Paragraph("IMPORTANT: Card Transactions to Categorize", subheading_style))
story.append(Paragraph("Your 2025 data has many raw card transactions that need to be sorted. The big ones:", body_style))

card_cats = [
    ("Home Depot / Menards / Tractor Supply / Hardware", "~$3,500", "Materials (COGS) or Supplies (Expense)"),
    ("Gas stations (Circle K, BP, Motomart, Casey's, QT)", "~$2,800", "Car/Truck Expenses (fuel)"),
    ("Dollar General / Walmart / Schnucks / IGA", "~$1,200", "Office Supplies or Personal (non-deductible)"),
    ("Insurance (State Farm recurring)", "~$1,840", "Insurance (Line 15)"),
    ("AT&T / Phone (recurring 888-270-2644)", "~$4,905", "Phone/Internet (80% business)"),
    ("Dumpster (618-2869595 = Millers Rolloff)", "~$1,335", "COGS or Other Expenses"),
    ("Verify Vend (Providence RI = equipment/tools)", "~$1,985", "Equipment/Tools (Other Expenses)"),
]

card_data = [["Transaction Type", "Est. Total", "Enter Under"]]
for desc, amt, where in card_cats:
    card_data.append([desc, amt, where])

t_card = Table(card_data, colWidths=[3.0*inch, 1.0*inch, 2.2*inch])
t_card.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), HexColor("#2c3e50")),
    ("TEXTCOLOR", (0, 0), (-1, 0), HexColor("#ffffff")),
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTSIZE", (0, 0), (-1, -1), 8),
    ("ALIGN", (1, 0), (1, -1), "RIGHT"),
    ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#bdc3c7")),
    ("TOPPADDING", (0, 0), (-1, -1), 3),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
]))
story.append(t_card)
story.append(Paragraph("<i>Have the H&amp;R Block preparer go through the Excel CATEGORIZED_2025 tab line by line. Many of these card transactions are deductible but need proper categorization.</i>", note_style))

story.append(PageBreak())

# ============ STEP 6: VEHICLE ============
story.append(Paragraph("STEP 6: VEHICLE EXPENSES -- $20,676.13", heading_style))
veh_steps = [
    "When asked about vehicle for business -- <b>YES</b>",
    "Enter vehicle info (year, make, model of work truck)",
    'Select <b>"Actual Expenses"</b> method',
    "Gas/Fuel from gas stations: approximately <b>$19,431</b> (includes gas station card purchases)",
    "Vehicle payments/costs: <b>$1,245</b>",
    "Business use percentage: <b>80-95%</b> (you are a full-time contractor)",
    "Total vehicle writeoff: <b>$20,676.13</b>",
]
for i, s in enumerate(veh_steps, 1):
    story.append(Paragraph("<b>%d.</b>  %s" % (i, s), step_style))

story.append(Spacer(1, 0.1*inch))
story.append(Paragraph("SECTION 179 VEHICLE DEPRECIATION:", green_bold))
story.append(Paragraph("If you purchased a work truck/van in 2025 weighing over 6,000 lbs GVWR, you can write off up to <b>$30,500</b> (2025 limit) in the first year. This is HUGE for reducing your taxable income on a profitable year.", body_style))

# ============ STEP 7: HOME OFFICE ============
story.append(Paragraph("STEP 7: HOME OFFICE DEDUCTION", heading_style))
ho_steps = [
    'When asked "Did you use part of your home for business?" -- <b>YES</b>',
    "Choose the <b>Simplified Method</b>",
    "Enter square footage of your workspace",
    "Deduction = <b>$5/sq ft, up to 300 sq ft = $1,500 max</b>",
]
for i, s in enumerate(ho_steps, 1):
    story.append(Paragraph("<b>%d.</b>  %s" % (i, s), step_style))
story.append(Paragraph("Additional deduction: <b>up to $1,500</b>", money_saved))

# ============ STEP 8: MISSED DEDUCTIONS ============
story.append(Paragraph("STEP 8: DEDUCTIONS TO ADD (Previously Missed)", heading_style))
story.append(Paragraph("These reduce your $178,792 net income further:", body_style))

missed_data = [
    ["Deduction", "Amount", "Where to Enter"],
    ["Phone/Internet (AT&T) -- 80% business", "$3,924.00", "Utilities or Other Expenses"],
    ["  (80% of ~$4,905 in recurring phone charges)", "", ""],
    ["Home Office (simplified method)", "$1,500.00", "Home Office section"],
    ["Self-Employed Health Insurance", "$3,977.14", "Line 16 on Form 1040"],
    ["  (if Bill pays own premiums -- enter actual)", "", ""],
    ["SEP-IRA Contribution (up to 25% of net)", "Up to $42,198", "Retirement section"],
    ["  (25% of ~$168,792 net SE income)", "", ""],
    ["QBI Deduction (20% of qualified income)", "~$33,758", "Auto-calculated"],
    ["  (Section 199A -- H&R Block calculates this)", "", ""],
    ["2023 QBI Loss Carryforward", "Reduces QBI", "Auto-calculated"],
    ["TOTAL ADDITIONAL SAVINGS", "$10,676+", ""],
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
    ("FONTSIZE", (0, 5), (-1, 5), 8),
    ("TEXTCOLOR", (0, 5), (-1, 5), HexColor("#7f8c8d")),
    ("FONTSIZE", (0, 7), (-1, 7), 8),
    ("TEXTCOLOR", (0, 7), (-1, 7), HexColor("#7f8c8d")),
    ("FONTSIZE", (0, 9), (-1, 9), 8),
    ("TEXTCOLOR", (0, 9), (-1, 9), HexColor("#7f8c8d")),
]))
story.append(t4)

story.append(Spacer(1, 0.1*inch))
story.append(Paragraph("<b>THE BIG ONE -- SEP-IRA:</b> Since 2025 is profitable, Bill can open a SEP-IRA and contribute up to 25% of net self-employment income. On ~$168K net, that is up to <b>$42,198</b> that comes RIGHT OFF his taxable income. He has until the filing deadline (including extensions) to make this contribution for 2025.", warning_style))

story.append(PageBreak())

# ============ NON-DEDUCTIBLE ============
story.append(Paragraph("NON-DEDUCTIBLE TRANSFERS -- DO NOT CLAIM", heading_style))
story.append(Paragraph("Total non-deductible: <b>$49,592.80</b>. These are personal transfers and debt payments:", body_style))

non_ded = [
    ("Zelle to Nadia Session / Tabitha Session", "~$5,886", "Personal transfers -- NOT business expenses"),
    ("Bank transfers to other accounts", "~$29,063", "Moving money between accounts -- NOT expenses"),
    ("Discover / Mercury Card / CEFCU / Catholic CCU", "~$14,644", "Credit card and loan payments -- NOT expenses"),
]
for name, amt, note in non_ded:
    story.append(Paragraph("<b>%s</b> -- %s" % (name, amt), ParagraphStyle("ND", parent=body_style, fontName="Helvetica-Bold", spaceBefore=6)))
    story.append(Paragraph(note, ParagraphStyle("NDN", parent=body_style, leftIndent=15, fontSize=9, textColor=HexColor("#7f8c8d"))))

# ============ SE TAX ============
story.append(Paragraph("STEP 9: SELF-EMPLOYMENT TAX", heading_style))
story.append(Paragraph("Since 2025 is profitable, you WILL owe SE tax:", body_style))
se_items = [
    "SE tax = 15.3% on net SE income",
    "On ~$168K net income, SE tax is approximately <b>$23,765</b>",
    "You deduct HALF ($11,883) on your 1040 -- H&amp;R Block does this automatically",
    "If you did NOT make quarterly estimated payments, you may owe a penalty",
    "The SEP-IRA contribution reduces your net income which reduces SE tax too",
]
for item in se_items:
    story.append(Paragraph("\u2022  " + item, step_style))

# ============ QBI ============
story.append(Paragraph("STEP 10: QBI DEDUCTION (Section 199A)", heading_style))
story.append(Paragraph("This is automatic but worth <b>~$33,758</b> (20% of qualified business income).", body_style))
story.append(Paragraph("Since you had a QBI loss in 2023, that carryforward reduces your 2025 QBI. H&amp;R Block should pick this up from your 2023 return. <b>Make sure you import or enter your 2023 return data.</b>", body_style))

# ============ ESTIMATED TAXES ============
story.append(Paragraph("STEP 11: ESTIMATED TAX PAYMENTS", heading_style))
story.append(Paragraph("Did you make quarterly estimated payments in 2025? If yes:", body_style))
est_steps = [
    "Enter each payment: Q1 (April), Q2 (June), Q3 (September), Q4 (January 2026)",
    "These reduce what you owe when you file",
    "If you did NOT make estimated payments, expect to owe taxes plus a small penalty",
    "For 2026: set up quarterly payments based on 2025 income to avoid penalties",
]
for i, s in enumerate(est_steps, 1):
    story.append(Paragraph("<b>%d.</b>  %s" % (i, s), step_style))

story.append(PageBreak())

# ============ FINAL REVIEW ============
story.append(Paragraph("STEP 12: FINAL REVIEW -- VERIFY THESE NUMBERS", heading_style))

review_data = [
    ["Schedule C Line", "Description", "Amount"],
    ["Line 1", "Gross Receipts", "$369,331.93"],
    ["Line 4", "Cost of Goods Sold", "$49,832.74"],
    ["Line 7", "Gross Profit", "$319,499.19"],
    ["Line 9", "Car/Truck Expenses", "$20,676.13"],
    ["Line 15", "Insurance", "$1,179.88"],
    ["Line 21", "Repairs", "$65.16"],
    ["Line 25", "Utilities (Phone 80%)", "$3,924.00"],
    ["Line 27a", "Other Expenses", "~$120,030.99"],
    ["Line 30", "Home Office", "$1,500.00"],
    ["", "TOTAL EXPENSES", "~$147,376.16"],
    ["Line 31", "NET PROFIT (before 1040 deductions)", "~$172,123.03"],
    ["", "", ""],
    ["Form 1040", "Description", "Savings"],
    ["Line 15", "SEP-IRA Deduction", "Up to $42,198"],
    ["Line 16", "Self-Employed Health Insurance", "$3,977 (if applicable)"],
    ["Line 17", "Half of SE Tax Deduction", "~$11,883"],
    ["QBI", "Qualified Business Income Deduction (20%)", "~$33,758"],
]

t5 = Table(review_data, colWidths=[1.3*inch, 2.8*inch, 1.5*inch])
t5.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), HexColor("#003b25")),
    ("TEXTCOLOR", (0, 0), (-1, 0), HexColor("#ffffff")),
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTSIZE", (0, 0), (-1, -1), 9),
    ("ALIGN", (2, 0), (2, -1), "RIGHT"),
    ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#bdc3c7")),
    ("TOPPADDING", (0, 0), (-1, -1), 4),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ("ROWBACKGROUNDS", (0, 1), (-1, 12), [HexColor("#ffffff"), HexColor("#f0faf5")]),
    ("BACKGROUND", (0, 13), (-1, 13), HexColor("#003b25")),
    ("TEXTCOLOR", (0, 13), (-1, 13), HexColor("#ffffff")),
    ("FONTNAME", (0, 13), (-1, 13), "Helvetica-Bold"),
    ("BACKGROUND", (0, 11), (-1, 11), HexColor("#e8f5e9")),
    ("FONTNAME", (0, 11), (-1, 11), "Helvetica-Bold"),
]))
story.append(t5)

story.append(Spacer(1, 0.2*inch))
story.append(Paragraph("<b>With a SEP-IRA + QBI + other deductions, your taxable income could drop from ~$172K to under $85K.</b> That is potentially $30,000+ in tax savings.", green_bold))

# ============ CHECKLIST ============
story.append(Spacer(1, 0.2*inch))
story.append(Paragraph("FINAL CHECKLIST", heading_style))
checklist = [
    "Entered ALL income from 1099s (total should match ~$369K minus bounced deposits)",
    "Entered COGS: labor ($49,194) + materials ($638)",
    "Entered vehicle expenses with Actual Expenses method ($20,676)",
    "Asked about Section 179 vehicle depreciation",
    "Claimed Home Office deduction ($1,500)",
    "Entered phone/internet at 80% business use (~$3,924)",
    "Had H&R Block categorize raw card transactions from Excel",
    "Entered health insurance premiums (if applicable)",
    "Opened SEP-IRA and made 2025 contribution (up to $42,198)",
    "Verified QBI deduction and 2023 loss carryforward",
    "Entered any estimated tax payments made in 2025",
    "Verified non-deductible transfers are NOT claimed as expenses",
    "Filed 1099-NEC for Brian Davis, Casey Williamson, and any other workers paid 600+",
    "Set up 2026 quarterly estimated payments",
    "Saved/printed final return for records",
]
for item in checklist:
    story.append(Paragraph("\u2610  " + item, step_style))

story.append(Spacer(1, 0.3*inch))
story.append(HRFlowable(width="100%", thickness=1, color=HexColor("#bdc3c7")))
story.append(Spacer(1, 0.1*inch))
story.append(Paragraph("Prepared for All-Pro Metro East Construction LLC -- 2025 Tax Year", ParagraphStyle("Footer", parent=body_style, fontSize=8, textColor=HexColor("#999999"), alignment=TA_CENTER)))
story.append(Paragraph("This document is for guidance only. Consult a CPA or tax professional before filing.", ParagraphStyle("Footer2", parent=body_style, fontSize=8, textColor=HexColor("#c0392b"), alignment=TA_CENTER)))

doc.build(story)
print("PDF created: %s" % pdf_path)
print("File size: %d bytes" % os.path.getsize(pdf_path))
