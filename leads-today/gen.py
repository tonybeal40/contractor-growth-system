from pathlib import Path


ROOT = Path(__file__).resolve().parent
PHONE = "(618) 581-0676"
SITE = "https://allprometroeastconstruction.com"


def write(name: str, content: str) -> None:
    (ROOT / name).write_text(content.strip() + "\n", encoding="utf-8")


gbp_posts = [
    (
        "Belleville kitchen remodel planning",
        "Planning a kitchen remodel in Belleville? Start with the layout, cabinet plan, appliance locations, lighting, plumbing, and flooring before buying finish materials.",
        f"{SITE}/kitchen-remodel-belleville-il.html?utm_source=google_business_profile&utm_medium=organic&utm_campaign=remodel_focus_202608&utm_content=kitchen_belleville",
    ),
    (
        "Belleville bathroom remodel planning",
        "A useful bathroom estimate separates finishes from waterproofing, plumbing, ventilation, electrical work, and possible moisture repair. Send a room photo or request a written estimate.",
        f"{SITE}/bathroom-remodel-belleville-il.html?utm_source=google_business_profile&utm_medium=organic&utm_campaign=remodel_focus_202608&utm_content=bathroom_belleville",
    ),
    (
        "O'Fallon kitchen remodel planning",
        "Before ordering cabinets or counters, decide what stays, what moves, and which trade work belongs in the same written scope. All-Pro evaluates focused updates and larger kitchen remodels.",
        f"{SITE}/kitchen-remodel-ofallon-il.html?utm_source=google_business_profile&utm_medium=organic&utm_campaign=remodel_focus_202608&utm_content=kitchen_ofallon",
    ),
    (
        "O'Fallon bathroom remodel planning",
        "Trying to choose between a focused bathroom update, a tub-to-shower conversion, or a full rebuild? Start with the problem, the room condition, and one coordinated scope.",
        f"{SITE}/bathroom-remodel-ofallon-il.html?utm_source=google_business_profile&utm_medium=organic&utm_campaign=remodel_focus_202608&utm_content=bathroom_ofallon",
    ),
]

lines = [
    "GOOGLE BUSINESS PROFILE POSTS - PROOF-SAFE REMODEL CAMPAIGN",
    "Use a real photo only when the project record and city are confirmed.",
    "Otherwise use a planning graphic, material detail, or accurately labeled Metro East example.",
    "Never add a testimonial, city, availability claim, or result that cannot be verified.",
    "",
]
for index, (title, copy, url) in enumerate(gbp_posts, start=1):
    lines.extend(
        [
            f"-- POST {index}: {title} --",
            copy,
            "",
            f"Request a free written estimate or call {PHONE}.",
            url,
            "",
        ]
    )
write("01-gbp-posts.txt", "\n".join(lines))


review_sms = """
REVIEW REQUEST SMS TEMPLATES
Send only to an actual customer. Ask for an honest review without offering an incentive or screening by rating.

-- FIRST REQUEST --
Hi [Name], it is William at All-Pro. Thank you for choosing us for your [project]. If you would like to share your honest experience, here is our website review form: https://allprometroeastconstruction.com/review.html

-- ONE FOLLOW-UP --
Hi [Name], William from All-Pro here. One quick follow-up in case the review link got buried. We appreciate honest feedback: https://allprometroeastconstruction.com/review.html Thank you.
"""
write("02-review-request-sms.txt", review_sms)


facebook_posts = """
FACEBOOK POSTS - REMODEL PLANNING CAMPAIGN
Use a verified project photo only when the city and permission are documented. Otherwise use a planning graphic or accurately labeled inspiration image.

-- BELLEVILLE KITCHEN --
Planning a kitchen remodel in Belleville? A clear scope should connect cabinets, counters, appliances, lighting, plumbing, flooring, and finish work before materials are ordered.

Request a free written estimate: https://allprometroeastconstruction.com/kitchen-remodel-belleville-il.html?utm_source=facebook&utm_medium=organic_social&utm_campaign=remodel_focus_202608&utm_content=kitchen_belleville
Call (618) 581-0676.

-- BELLEVILLE BATHROOM --
Bathroom problems are not always surface-deep. Waterproofing, ventilation, plumbing, subfloor condition, and hidden moisture should be considered before new tile and fixtures cover the room.

Start here: https://allprometroeastconstruction.com/bathroom-remodel-belleville-il.html?utm_source=facebook&utm_medium=organic_social&utm_campaign=remodel_focus_202608&utm_content=bathroom_belleville
Call (618) 581-0676.

-- O'FALLON KITCHEN --
Focused update or full kitchen remodel? Decide what stays, what moves, and what needs repair before choosing the finish level. All-Pro provides written estimates after reviewing the actual scope.

Start here: https://allprometroeastconstruction.com/kitchen-remodel-ofallon-il.html?utm_source=facebook&utm_medium=organic_social&utm_campaign=remodel_focus_202608&utm_content=kitchen_ofallon
Call (618) 581-0676.

-- O'FALLON BATHROOM --
Compare a focused update, tub-to-shower conversion, walk-in shower, or full bathroom rebuild based on the room condition and the problem you need to solve.

Start here: https://allprometroeastconstruction.com/bathroom-remodel-ofallon-il.html?utm_source=facebook&utm_medium=organic_social&utm_campaign=remodel_focus_202608&utm_content=bathroom_ofallon
Call (618) 581-0676.
"""
write("03-facebook-posts.txt", facebook_posts)


checklist = """
ALL-PRO REMODEL CAMPAIGN CHECKLIST

BEFORE POSTING
[ ] Confirm the Google Business Profile is controlled by Bill or an approved manager.
[ ] Use the exact business name, phone, website, and service area from the source-of-truth record.
[ ] Use a real project image only when permission and city evidence are recorded.
[ ] If proof is incomplete, use a planning graphic or label the image as a Metro East example.
[ ] Confirm current availability with Bill before mentioning openings or start dates.

PUBLISH AND TRACK
[ ] Publish one relevant update with the matching UTM-tagged landing page.
[ ] Check that the landing page form, phone button, and thank-you route work.
[ ] Review GA4 source/medium and the lead email for the campaign fields.
[ ] Respond to calls, messages, and form requests promptly, without promising a fixed response time publicly.

NEVER PUBLISH
[ ] No invented customer quotes, star ratings, project locations, timelines, or outcomes.
[ ] No licensing, insurance, warranty, or guarantee claim unless current documentation supports it.
[ ] No fake scarcity or availability language.
"""
write("00-TODAYS-CHECKLIST.txt", checklist)

print("Generated proof-safe GBP, Facebook, review, and campaign checklist files.")
