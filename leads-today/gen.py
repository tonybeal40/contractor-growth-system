services = [
    ("Deck Build", "deck"),
    ("Privacy Fence", "fencing"),
    ("Concrete Patio", "patio"),
    ("Tree Trimming", "tree service"),
    ("Mulch & Rock Install", "landscaping"),
    ("Spring Cleanup", "landscape cleanup"),
]

cities = [
    "Belleville IL", "O'Fallon IL", "Edwardsville IL",
    "Collinsville IL", "Fairview Heights IL", "Swansea IL",
    "Shiloh IL", "Maryville IL", "Glen Carbon IL", "Troy IL",
]

pairs = [
    ("Deck Build", "Belleville IL"), ("Privacy Fence", "O'Fallon IL"),
    ("Concrete Patio", "Edwardsville IL"), ("Tree Trimming", "Collinsville IL"),
    ("Mulch & Rock Install", "Fairview Heights IL"), ("Spring Cleanup", "Swansea IL"),
    ("Composite Deck", "Shiloh IL"), ("Bathroom Remodel", "Maryville IL"),
    ("Privacy Fence", "Glen Carbon IL"), ("Tree Trimming", "Troy IL"),
    ("Deck Build", "O'Fallon IL"), ("Spring Cleanup", "Belleville IL"),
    ("Mulch & Rock Install", "Collinsville IL"), ("Concrete Patio", "Edwardsville IL"),
    ("Privacy Fence", "Fairview Heights IL"), ("Tree Trimming", "Belleville IL"),
]
ctas = [
    "Call/text us at (618) 581-0676 for a FREE quote.",
    "Free estimates -- call or text (618) 581-0676.",
    "Book your project now: (618) 581-0676.",
    "Limited spring openings left -- call (618) 581-0676 today!",
]

# GBP Posts
lines = ["="*60, "GOOGLE BUSINESS PROFILE POSTS -- COPY & PASTE TODAY",
         "Go to: business.google.com > Posts > Add Update",
         "Post 1-2 per day. Use your own before/after photo.", "="*60, ""]
for i, (svc, city) in enumerate(pairs):
    cta = ctas[i % len(ctas)]
    tag = city.replace(" ","").replace("'","")
    svc2 = svc.replace(" ","")
    lines.append(f"-- POST {i+1} --")
    lines.append(f"Before/After: {svc} in {city}")
    lines.append("")
    lines.append(f"Just finished this {svc.lower()} project in {city} and the homeowners love it!")
    lines.append("")
    lines.append(f"{cta}")
    lines.append("allprometroeastconstruction.com")
    lines.append("")
    lines.append(f"#{tag} #MetroEastIL #{svc2} #AllProMetroEast #ContractorIL")
    lines.append("")
with open("01-gbp-posts.txt","w",encoding="utf-8") as f:
    f.write("\n".join(lines))
print(f"GBP: {len(pairs)} posts")

# SMS
sms = [
    ("SHORT (best open rate)",
     "Hey [Name]! It's William at All-Pro Metro East. Really appreciate you trusting us with your [project]. Mind leaving a quick Google review? Takes 60 sec: https://g.page/r/YOURLINK/review"),
    ("DECK/OUTDOOR",
     "Hi [Name], William from All-Pro here! Hope you're loving the new [deck/patio/fence]. A Google review would help other Metro East homeowners find us: https://g.page/r/YOURLINK/review -- thanks!"),
    ("LANDSCAPING",
     "Hey [Name]! Loving how the yard looks? If happy, please leave us a Google review -- really helps: https://g.page/r/YOURLINK/review -- All-Pro, William"),
    ("REMODELING",
     "Hi [Name], William at All-Pro. Hope you're enjoying the [bathroom/kitchen] every day! A quick Google review would mean a lot: https://g.page/r/YOURLINK/review Thanks!"),
    ("FOLLOW-UP (day 3 if no response)",
     "Hey [Name], no pressure at all! If you get a chance, a Google review helps our small local business so much. Even just stars: https://g.page/r/YOURLINK/review -- William, All-Pro"),
]
lines2 = ["="*60,"REVIEW REQUEST SMS TEMPLATES -- SEND TODAY",
          "Replace [Name] [project] and YOURLINK",
          "Get your link: business.google.com > Read Reviews > Get more reviews","="*60,""]
for label, msg in sms:
    lines2.append(f"-- {label} --")
    lines2.append(msg)
    lines2.append("")
with open("02-review-request-sms.txt","w",encoding="utf-8") as f:
    f.write("\n".join(lines2))
print(f"SMS: {len(sms)} templates")

# Facebook posts
fb = [
    ("Tree Service Promo",
"""Spring tree work season is HERE -- schedule is filling fast!

All-Pro Metro East Construction is booking tree trimming, removal, and stump grinding across Belleville, O'Fallon, Collinsville, Edwardsville, and 35+ more Metro East cities.

Free estimates. Licensed & insured.
(618) 581-0676 | allprometroeastconstruction.com

#MetroEastIL #TreeService #BellevilleIL #OFallonIL #SpringCleanup"""),
    ("Mulch/Rock Before & After",
"""BEFORE & AFTER -- Mulch & Decorative Rock Install in [City], IL!

We refreshed the flower beds with fresh hardwood mulch + river rock edging. Total transformation in ONE day.

Free quote: (618) 581-0676
allprometroeastconstruction.com

#MetroEastLandscaping #MulchInstall #CurbAppeal #AllProMetroEast"""),
    ("Spring Cleanup Deal",
"""Spring Cleanup Specials -- Metro East IL!

Leaf removal, bed edging, weeding, debris hauling. We service Belleville, O'Fallon, Swansea, Collinsville, Edwardsville + 35 more cities.

FREE ESTIMATES -- limited spring slots open NOW.
(618) 581-0676 | allprometroeastconstruction.com

#SpringCleanup #MetroEastIL #LandscapingIL"""),
    ("Deck Build Social Proof",
"""Just wrapped up this beautiful composite deck build in [City], IL!

All-Pro Metro East builds decks, pergolas, patios, and privacy fencing. On time, on budget.

Free estimates. 35+ Metro East cities.
(618) 581-0676 | allprometroeastconstruction.com

#DeckBuilder #MetroEastIL #OutdoorLiving #AllPro"""),
    ("Urgency / Limited Slots",
"""Only a few project slots left for May!

Thinking about: landscaping, spring cleanup, tree trimming, new deck, patio, or privacy fence?

Get your FREE estimate NOW before we're booked out.

(618) 581-0676 | allprometroeastconstruction.com

#MetroEastIL #HomeImprovement #BellevilleIL"""),
]
lines3 = ["="*60,"FACEBOOK POSTS -- POST 1-2 TODAY, SCHEDULE THE REST",
          "Add a real before/after photo. Replace [City] with actual city.","="*60,""]
for label, post in fb:
    lines3.append(f"-- {label} --")
    lines3.append(post)
    lines3.append("")
with open("03-facebook-posts.txt","w",encoding="utf-8") as f:
    f.write("\n".join(lines3))
print(f"Facebook: {len(fb)} posts")

# Checklist
checklist = """TODAY'S LEAD GEN CHECKLIST -- All-Pro Metro East
=================================================

IMMEDIATE (next 2 hours):
[ ] Text 5-10 past customers using 02-review-request-sms.txt
    -> Each new Google review = local pack ranking boost
[ ] Post 1 Facebook post from 03-facebook-posts.txt WITH a real photo
[ ] Post 1 GBP update from 01-gbp-posts.txt WITH a real photo
    -> business.google.com > Posts > Add Update

TODAY (this afternoon):
[ ] Set up Google Local Services Ads
    -> ads.google.com/local-services-ads
    -> $10/day, pay per CALL only, shows Google Guaranteed badge
    -> Services: Decks, Fencing, Landscaping, Tree Service, Remodeling
    -> Area: Belleville IL + 25mi radius
    -> Upload license + insurance for the Google Guarantee badge
[ ] Post 2nd Facebook post (tree trimming or spring cleanup)
[ ] Share Facebook post to Belleville/O'Fallon community groups

THIS WEEK:
[ ] 1 GBP post per day (16 ready in 01-gbp-posts.txt)
[ ] 2-3 Facebook posts this week (5 ready in 03-facebook-posts.txt)
[ ] Day 3 review request follow-up SMS for non-responders
[ ] Add real before/after job photos to GBP (42% more map clicks)

FILES IN: leads-today/
  01-gbp-posts.txt          -- 16 GBP post captions
  02-review-request-sms.txt -- 5 SMS templates
  03-facebook-posts.txt     -- 5 Facebook posts
  00-TODAYS-CHECKLIST.txt   -- this file
"""
with open("00-TODAYS-CHECKLIST.txt","w",encoding="utf-8") as f:
    f.write(checklist)
print("Checklist written")
print("All done!")
