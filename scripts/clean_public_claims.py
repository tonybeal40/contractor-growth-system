#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BUSINESS_TYPES = {"LocalBusiness", "HomeAndConstructionBusiness", "GeneralContractor"}
ADDRESS = {
    "@type": "PostalAddress",
    "streetAddress": "1115 Priscilla Ct",
    "addressLocality": "New Athens",
    "addressRegion": "IL",
    "postalCode": "62264",
    "addressCountry": "US",
}
SCRIPT_RE = re.compile(
    r'(<script[^>]*type=["\']application/ld\+json["\'][^>]*>)(.*?)(</script>)',
    re.I | re.S,
)

EXACT_REPLACEMENTS = (
    (
        "<strong>Estimate within 24 hours</strong>",
        "<strong>Request a written estimate</strong>",
    ),
    (
        "<strong>We respond within 24 hours</strong>",
        "<strong>Prompt local follow-up</strong>",
    ),
    (
        "<strong>Concrete quote within 24 hours</strong>",
        "<strong>Request a concrete estimate</strong>",
    ),
    (
        "<strong>Request now · Responding within 24 hours</strong>",
        "<strong>Request now · Direct local follow-up</strong>",
    ),
    (
        "Share your Edwardsville deck idea and we will follow up within 24 hours.",
        "Share your Edwardsville deck idea and we will follow up about availability and next steps.",
    ),
    (
        "Drop us a note and we will reply within 24 hours with ideas and pricing.",
        "Drop us a note and we will follow up about ideas, scope, and the estimate process.",
    ),
    (
        "Bill responds personally &mdash; usually same day.",
        "The All-Pro team follows up directly about availability and the next step.",
    ),
    (
        "Bill responds personally — usually same day.",
        "The All-Pro team follows up directly about availability and the next step.",
    ),
    (
        "Bill will personally follow up &mdash; usually same day.",
        "The All-Pro team will follow up directly about availability and the next step.",
    ),
    (
        "Tell us about your project and we'll be in touch within 24 hours.",
        "Tell us about your project and we'll follow up about the next step.",
    ),
    (
        "Call or submit a request and we'll confirm a time within 24 hours.",
        "Call or submit a request and we'll follow up about scheduling.",
    ),
    (
        "Call or fill out the form. We'll get back to you within 24 hours.",
        "Call or fill out the form. We'll follow up about availability and the next step.",
    ),
    (
        "Send us the project details and we’ll be back within 24 hours with scheduling and pricing.",
        "Send us the project details and we’ll follow up about scheduling and the estimate process.",
    ),
    (
        ". serving Metro East since 2002",
        ". Serving Metro East since 2002",
    ),
    (
        "Permits and inspections handled by All-Pro",
        "Permit responsibilities identified in the written scope",
    ),
    (
        "Full service from design to final cleanup — one crew, no subs.",
        "The written scope identifies the work, cleanup, and any trade partners involved.",
    ),
    (
        "Full service from design to final cleanup â€” one crew, no subs.",
        "The written scope identifies the work, cleanup, and any trade partners involved.",
    ),
    (
        "All-Pro Construction &amp; Landscape handles tree trimming, pruning, and full tree removal across Belleville, O'Fallon, Fairview Heights, Edwardsville, and all of Metro East. Bill Session is on every job — no subs, no surprises. We clean up completely when we're done.",
        "All-Pro Construction &amp; Landscape accepts tree-service requests across Belleville, O'Fallon, Fairview Heights, Edwardsville, and Metro East. The written scope should identify the approved work, cleanup, equipment, and any specialty trade partners involved.",
    ),
    (
        "All-Pro Construction &amp; Landscape handles tree trimming, pruning, and full tree removal across Belleville, O'Fallon, Fairview Heights, Edwardsville, and all of Metro East. Bill Session is on every job â€” no subs, no surprises. We clean up completely when we're done.",
        "All-Pro Construction &amp; Landscape accepts tree-service requests across Belleville, O'Fallon, Fairview Heights, Edwardsville, and Metro East. The written scope should identify the approved work, cleanup, equipment, and any specialty trade partners involved.",
    ),
    (
        "Full outdoor living build &middot; Owner on-site daily",
        "Full outdoor living scope &middot; Direct local contact",
    ),
    (
        "Owner on-site oversight instead of a handoff to a random crew lead",
        "A written scope with a clearly identified project contact",
    ),
    (
        "23-year local Metro East company",
        "Serving Metro East since 2002",
    ),
    (
        "23-year track record of outdoor living installations across Metro East",
        "local outdoor-living experience across Metro East since 2002",
    ),
    (
        "brings local service dating to 2002 to every",
        "has served Metro East since 2002 and brings local experience to each",
    ),
    (
        "has served Metro East since 2002 and works on every",
        "has served Metro East since 2002 and brings local experience to each",
    ),
    (
        "we bring service dating to 2002 of Metro East remodeling expertise to every",
        "we apply local Metro East experience to each",
    ),
    (
        "With service dating to 2002 building in Belleville and surrounding communities, we",
        "Serving Belleville and surrounding communities since 2002, we",
    ),
    (
        "with service dating to 2002, All-Pro",
        "Serving Metro East since 2002, All-Pro",
    ),
    (
        "with service dating to 2002, we",
        "Serving Metro East since 2002, we",
    ),
    (
        "With service dating to 2002 of experience and",
        "Serving Metro East since 2002 with",
    ),
    (
        "after service dating to 2002 of building both",
        "after years of building both",
    ),
    (
        "We have service dating to 2002 serving the Metro East region",
        "We have served the Metro East region since 2002",
    ),
    (
        "service dating to 2002 Serving Metro East",
        "Serving Metro East Since 2002",
    ),
    (
        "service dating to 2002 serving Metro East",
        "serving Metro East since 2002",
    ),
    (
        "service dating to 2002</strong> Serving Metro East",
        "Serving Since 2002</strong> Metro East",
    ),
    (
        "service dating to 2002 doing bathroom remodels",
        "serving Metro East since 2002 with bathroom remodeling experience",
    ),
    (
        "service dating to 2002 doing kitchen and bathroom remodels",
        "serving Metro East since 2002 with kitchen and bathroom remodeling experience",
    ),
    (
        "Metro East and Metro East",
        "Metro East Illinois",
    ),
    (
        "for service dating to 2002",
        "since 2002",
    ),
    (
        "over service dating to 2002",
        "since 2002",
    ),
    (
        "Local for service dating to 2002",
        "Local since 2002",
    ),
    (
        ". service dating to 2002.",
        ". Serving Metro East since 2002.",
    ),
    (
        "service dating to 2002",
        "service since 2002",
    ),
    (
        "With service since 2002 building in Belleville and across the region, we",
        "Serving Belleville and the region since 2002, we",
    ),
    (
        "service since 2002 serving Belleville and Metro East",
        "Serving Belleville and Metro East since 2002",
    ),
    (
        "All-Pro Construction &amp; Landscape's service since 2002 of serving Southern Illinois",
        "All-Pro Construction &amp; Landscape's service in Southern Illinois. The company has served the region since 2002",
    ),
    (
        "All-Pro Construction & Landscape's service since 2002 of serving Southern Illinois",
        "All-Pro Construction & Landscape's service in Southern Illinois. The company has served the region since 2002",
    ),
    (
        "All-Pro Construction &amp; Available scopes include",
        "Available scopes include",
    ),
    (
        "All-Pro Construction & Available scopes include",
        "Available scopes include",
    ),
    (
        "All-Pro handles all trades and permits to keep your project on schedule.",
        "The written scope should identify trade coordination, permit responsibilities, and schedule assumptions.",
    ),
    (
        "All-Pro manages all permit applications and inspections on your behalf.",
        "Permit and inspection responsibilities should be confirmed for the specific scope and jurisdiction before work begins.",
    ),
    (
        "Bill Sessions handles every estimate personally — you talk to the owner, not a salesperson",
        "Call Bill Session directly to discuss the estimate request — you talk to a local contact, not a call center",
    ),
    (
        "Bill Sessions handles every estimate personally — you are not passed off to a salesperson",
        "Call Bill Session directly to discuss the estimate request — you are not passed to a call center",
    ),
    (
        "public reviews on HomeAdvisor with public review profiles",
        "a public review profile on HomeAdvisor",
    ),
    (
        "Tree work is high-risk. We carry full liability and workers' comp so you're never on the hook if something goes wrong.",
        "Tree work is high risk. Request current insurance documentation and confirm the approved scope before work begins.",
    ),
    (
        "Documentation available on request subs we can trust and refer to clients.",
        "Local trade partners we can coordinate with or refer when the project calls for a specialty.",
    ),
    (
        "All-Pro Construction &amp; Landscape builds sunroom additions throughout Caseyville and St. Clair County. A sunroom is one of the best investments a Caseyville homeowner can make â€” it extends your usable living space, brings in natural light, and adds measurable value to your home. We build three-season rooms for three seasons of enjoyment and fully insulated four-season rooms designed for year-round use with heating and cooling. Every sunroom addition is permitted, engineered, and built to last by our own crew â€” no subcontractors, no handoffs.",
        "All-Pro Construction &amp; Landscape accepts sunroom-addition requests in Caseyville and St. Clair County. Available scopes can include three-season rooms, insulated four-season rooms, and screened enclosures. The written scope should identify foundation conditions, seasonal use, permits, engineering, heating or cooling, and any specialty trade partners involved.",
    ),
    (
        "Yes — All-Pro Construction & Landscape has been doing kitchen remodels in Belleville IL and Metro East since 2002.",
        "Yes — All-Pro Construction & Landscape accepts kitchen-remodel requests in Belleville and Metro East. The company has served the region since 2002.",
    ),
    (
        "Yes — All-Pro Construction & Landscape has completed bathroom remodels throughout Belleville IL and Metro East since 2002.",
        "Yes — All-Pro Construction & Landscape accepts bathroom-remodel requests in Belleville and Metro East. The company has served the region since 2002.",
    ),
    (
        "serving Metro East since 2002 with kitchen and bathroom remodeling experience in Belleville, O'Fallon, Shiloh, and surrounding cities",
        "Serving Metro East since 2002; kitchen and bathroom requests are accepted in Belleville, O'Fallon, Shiloh, and surrounding cities",
    ),
    (
        "serving Metro East since 2002 with bathroom remodeling experience in Belleville, O'Fallon, Edwardsville, and surrounding Metro East cities",
        "Serving Metro East since 2002; bathroom-remodel requests are accepted in Belleville, O'Fallon, Edwardsville, and surrounding Metro East cities",
    ),
    (
        "We manage permits, inspections, and subcontractors so you do not have to",
        "The written scope identifies permit, inspection, and trade-coordination responsibilities",
    ),
    (
        "We manage permits, plumbing subs, and tile — one call handles everything",
        "The written scope identifies permit, plumbing, tile, and trade-coordination responsibilities",
    ),
    (
        "We do not rush tile work — waterproofing and cure times are done right",
        "The written scope should identify waterproofing steps and appropriate cure times",
    ),
    (
        "current documentation available on request &middot; public reviews &middot; public review profiles",
        "Current documentation is available on request; see the linked public review profiles",
    ),
    (
        ">current documentation available on request<",
        ">Current documentation available on request<",
    ),
    (
        ". documentation available on request",
        ". Documentation available on request",
    ),
    (
        ">documentation available on request",
        ">Documentation available on request",
    ),
    (
        "Are you documentation available on request in Illinois?",
        "Can you provide current insurance and applicable license documentation?",
    ),
    (
        "All-Pro is Current documentation is available on request",
        "Current documentation is available on request",
    ),
    (
        "a public review profiles on Angi/HomeAdvisor",
        "public review profiles on Angi/HomeAdvisor",
    ),
    (
        "All-Pro Construction & Landscape has built hundreds of patios across Metro East Illinois.",
        "All-Pro Construction & Landscape accepts patio projects across Metro East Illinois.",
    ),
    (
        "All-Pro Construction &amp; Landscape has built hundreds of patios across Metro East Illinois.",
        "All-Pro Construction &amp; Landscape accepts patio projects across Metro East Illinois.",
    ),
    (
        "All-Pro Construction & Landscape has been building custom sunrooms and screen rooms across Metro East Illinois since 2002.",
        "All-Pro Construction & Landscape accepts custom sunroom and screen-room requests across Metro East Illinois.",
    ),
    (
        "All-Pro Construction &amp; Landscape has been building custom sunrooms and screen rooms across Metro East Illinois since 2002.",
        "All-Pro Construction &amp; Landscape accepts custom sunroom and screen-room requests across Metro East Illinois.",
    ),
    (
        "since 2001 — over 23 years",
        "since 2002",
    ),
    (
        "since 2001 &mdash; over 23 years",
        "since 2002",
    ),
    (
        "for over 23 years",
        "since 2002",
    ),
    (
        "for 23+ years",
        "since 2002",
    ),
    (
        "Owner · CEO · 23+ Years in the Field",
        "Owner · Direct Local Contact · Serving Since 2002",
    ),
    (
        "since 2001",
        "since 2002",
    ),
    (
        "founded in 2001",
        "founded in 2002",
    ),
    (
        "established in 2001",
        "established in 2002",
    ),
    (
        "Licensed and insured contractor in Metro East Illinois for",
        "Local Metro East Illinois contractor for",
    ),
    (
        "Licensed, insured, 23 years.",
        "Serving Metro East since 2002.",
    ),
    (
        "Licensed, insured, owner on every job.",
        "Serving Metro East since 2002 with direct local contact.",
    ),
    (
        "St. Clair County licensed and insured.",
        "Serving St. Clair County since 2002.",
    ),
    (
        "Owner on every job. Free estimates.",
        "Direct local contact. Free estimates.",
    ),
    (
        "Licensed &amp; Insured &middot; 4.7 &#11088; HomeAdvisor &middot; 23 Years Serving Metro East",
        "Serving Metro East Since 2002 &middot; Written Estimates &middot; Public Review Profiles",
    ),
    (
        "Licensed & Insured &middot; 4.7 &#11088; HomeAdvisor &middot; 23 Years Serving Metro East",
        "Serving Metro East Since 2002 &middot; Written Estimates &middot; Public Review Profiles",
    ),
    (
        "Licensed &amp; Insured · 4.7 ⭐ HomeAdvisor · 23 Years Serving Metro East",
        "Serving Metro East Since 2002 · Written Estimates · Public Review Profiles",
    ),
    (
        "Metro East&#39;s most trusted contractor. Locally owned. 23 years. Owner on every job.",
        "Local Metro East contractor serving homeowners since 2002. Written estimates and direct local contact.",
    ),
    (
        "Metro East's most trusted contractor. Locally owned. 23 years. Owner on every job.",
        "Local Metro East contractor serving homeowners since 2002. Written estimates and direct local contact.",
    ),
    (
        "Metro East&#39;s trusted contractor for kitchen remodels, bathroom remodels, decks, landscaping, and outdoor projects. Locally owned. 23 years. Owner on every job.",
        "Local Metro East contractor for remodels, decks, landscaping, and outdoor projects. Serving the region since 2002.",
    ),
    (
        "Metro East's trusted contractor for kitchen remodels, bathroom remodels, decks, landscaping, and outdoor projects. Locally owned. 23 years. Owner on every job.",
        "Local Metro East contractor for remodels, decks, landscaping, and outdoor projects. Serving the region since 2002.",
    ),
    (
        "Owner Bill Session is personally involved in every estimate and every project. When you call All-Pro, you get a contractor who shows up, communicates clearly, and finishes the job right the first time.",
        "Call Bill Session directly to discuss the project scope, property, and estimate request. A written estimate follows a review of the actual work, access, selections, and trade requirements.",
    ),
    (
        "Owner Bill Session personally handles every estimate and is on every job. You get clear communication, a written estimate, and workmanship that holds up through Illinois winters.",
        "Call Bill Session directly to discuss the scope, property, and estimate request. A written estimate follows a review of the actual work, access, selections, and trade requirements.",
    ),
    (
        "Owner Bill Sessions personally handles every estimate and is on every job. You get clear communication, a written estimate, and workmanship that holds up through Illinois winters.",
        "Call Bill Session directly to discuss the scope, property, and estimate request. A written estimate follows a review of the actual work, access, selections, and trade requirements.",
    ),
    (
        "Owner Bill Session handles every estimate personally.",
        "Call Bill Session directly to discuss the estimate request.",
    ),
    (
        "Owner Bill Sessions handles every estimate personally.",
        "Call Bill Session directly to discuss the estimate request.",
    ),
    (
        "Bill personally handles every estimate.",
        "Call Bill directly to discuss the estimate request.",
    ),
    (
        "Owner Bill Session handles every estimate.",
        "Call Bill Session directly to discuss the estimate request.",
    ),
    (
        "Owner Bill Session on every jobsite",
        "Direct local contact",
    ),
    (
        "Owner Bill on every job site",
        "Direct local contact",
    ),
    (
        "Owner involved on every job",
        "Direct local contact",
    ),
    (
        "Bill Session personally handles every estimate, every size.",
        "Call Bill Session directly to discuss projects of any size.",
    ),
    (
        "Bill Session personally oversees every deck build",
        "Call Bill Session directly with deck-scope questions",
    ),
    (
        "Bill Session personally on-site — not a subcontractor",
        "Call Bill Session directly with project-scope questions",
    ),
    (
        "Owner Bill Session personally handles every estimate and is on every job.",
        "Call Bill Session directly to discuss the estimate request and project scope.",
    ),
    (
        "We design and build everything — no subcontractors. Owner Bill Session is on every job from first shovel to final seal.",
        "The written scope identifies the approved work, materials, drainage details, and any trade partners involved. Call Bill Session directly with project-scope questions.",
    ),
    (
        "Every sunroom is built on a proper foundation, uses insulated glass or screens rated for Illinois weather, and comes with a full workmanship guarantee. Owner Bill Session manages every project personally.",
        "Sunroom planning should identify foundation conditions, seasonal use, glass or screen selections, permits, engineering, and any trade requirements in the written scope.",
    ),
    (
        "<strong>👷 Owner</strong> on Every Job",
        "<strong>Direct local contact</strong>",
    ),
    (
        "Bill personally responds with a written estimate.",
        "A written estimate follows a review of the project scope.",
    ),
    (
        "We've been serving",
        "All-Pro has been serving",
    ),
    (
        "We&#39;ve been serving",
        "All-Pro has been serving",
    ),
    (
        "We're licensed and insured in Illinois, and every project comes with clear communication from start to finish.",
        "Homeowners should request current insurance and applicable license information for the approved scope.",
    ),
    (
        "We&#39;re licensed and insured in Illinois, and every project comes with clear communication from start to finish.",
        "Homeowners should request current insurance and applicable license information for the approved scope.",
    ),
    (
        "with the same licensed, insured crew",
        "with the same local team",
    ),
    (
        "Based in Metro East. Licensed and insured across the region. Not sure if we cover your area? Just call.",
        "Based in New Athens and serving Metro East. Call to confirm availability for your address and scope.",
    ),
    (
        "Owner on every job, no subcontracting the important stuff.",
        "Direct local contact; ask which trade partners are included in your project scope.",
    ),
    (
        "Owner On Every Job",
        "Direct Local Contact",
    ),
    (
        "Owner on Every Job",
        "Direct Local Contact",
    ),
    (
        "Owner on every job",
        "direct local contact",
    ),
    (
        "University Educated Crew",
        "Written Project Scope",
    ),
    (
        "New Athens, IL · 60-Mile Radius",
        "New Athens, IL · Metro East Service Area",
    ),
    (
        "60-Mile Territory",
        "Metro East Service Area",
    ),
    (
        "the entire Metro East 50-mile radius",
        "the Metro East service area",
    ),
    (
        "50-Mile Radius",
        "Metro East Service Area",
    ),
    (
        "60-Mile Radius",
        "Metro East Service Area",
    ),
    (
        "50-mile radius",
        "Metro East service area",
    ),
    (
        "60-mile radius",
        "Metro East service area",
    ),
    (
        "<strong>4.7 ⭐</strong> HomeAdvisor · 40 Reviews",
        "<strong>Public reviews</strong> Angi/HomeAdvisor",
    ),
    (
        "105 reviews",
        "public review profiles",
    ),
    (
        "Licensed &amp; Insured",
        "Documentation Available on Request",
    ),
    (
        "Licensed & Insured",
        "Documentation Available on Request",
    ),
    (
        "Documentation Available on Request in Illinois",
        "Current Documentation Available on Request",
    ),
    (
        "Documentation Available on Request IL",
        "Current Documentation Available on Request",
    ),
    (
        "We are Documentation Available on Request",
        "Current documentation is available on request",
    ),
    (
        "We're Documentation Available on Request",
        "Current documentation is available on request",
    ),
    (
        "<strong>direct local contact</strong>",
        "<strong>Direct local contact</strong>",
    ),
    (
        "with a full workmanship warranty",
        "with written scope and material details",
    ),
    (
        "Every deck is designed to meet Illinois building code and carries a full workmanship warranty.",
        "Deck plans should identify code, permit, material, and written-scope requirements before work begins.",
    ),
)

REGEX_REPLACEMENTS = (
    (
        re.compile(
            r"(?:All-Pro\s+(?:(?:determines? what is required|checks local requirements)\s+and\s+)?(?:handles|pulls|manages)|We\s+(?:handle|pull|manage))\s+"
            r"(?:all\s+|every\s+|any needed\s+|the\s+)?(?:necessary\s+)?permit(?:s|ting)?"
            r"[^.<\"\r\n]*(?:\.|(?=<)|$)",
            re.I,
        ),
        "Permit and inspection responsibilities should be confirmed in the written scope for the project and jurisdiction.",
    ),
    (
        re.compile(
            r"We manage (?:the )?(?:inspection process|inspections)(?:\s+from start to finish|\s+so you do not have to navigate it alone)?(?:\s*(?:&mdash;|&#8212;|—|â€”|-)[^.<]*)?\.",
            re.I,
        ),
        "Inspection responsibilities should be confirmed before work begins.",
    ),
    (
        re.compile(
            r"we manage permit requirements so you do not have to navigate city hall alone\.",
            re.I,
        ),
        "the written scope should identify permit responsibilities for the project and jurisdiction.",
    ),
    (
        re.compile(
            r"All-Pro handles permits on every job\. Written estimate, owner on-site, permits coordinated\s*(?:&mdash;|&#8212;|—|â€”|-)\s*no runaround\.",
            re.I,
        ),
        "The written estimate should identify the approved scope, permit responsibilities, and project contacts.",
    ),
    (
        re.compile(
            r"All-Pro handles permit applications on every project\s*(?:&mdash;|&#8212;|—|â€”|-)\s*(?:it(?:'|&#39;)s included in our process at no extra charge|you don(?:'|&#39;)t pay extra for our permit coordination)\.",
            re.I,
        ),
        "Permit responsibilities and any associated costs should be confirmed in the written estimate.",
    ),
    (
        re.compile(r"\bDocumentation available on request, no subs\b", re.I),
        "Current documentation and trade responsibilities available on request",
    ),
    (
        re.compile(
            r"Most bathroom remodels in ([^.<]+) take 1 to 3 weeks\.\s*"
            r"The written scope should identify trade coordination, permit responsibilities, and schedule assumptions\.",
            re.I,
        ),
        "Bathroom-remodel timing varies with scope, inspections, material lead times, and trade scheduling. "
        "The written estimate should identify sequencing and schedule assumptions.",
    ),
    (
        re.compile(
            r"Most structural, plumbing, or electrical changes require a permit in [^.<]+\.\s*"
            r"Permit and inspection responsibilities should be confirmed for the specific scope and jurisdiction before work begins\.",
            re.I,
        ),
        "Permit requirements depend on the structural, plumbing, and electrical scope. Confirm local requirements and permit responsibilities before work begins.",
    ),
    (
        re.compile(
            r"Is All-Pro documentation available on request for ([^?<]+)\?",
            re.I,
        ),
        r"What documentation should I verify for \1?",
    ),
    (
        re.compile(
            r"Yes\. Current documentation is available on request in Illinois for ([^.]+)\. "
            r"We carry full liability and workers compensation coverage for every [^.]+\.",
            re.I,
        ),
        r"Request current insurance and any applicable license documentation before \1 begins. Requirements can depend on the project scope and jurisdiction.",
    ),
    (
        re.compile(
            r"(has served Metro East since 2002 and brings local experience to each[^.<]*\.)\s+"
            r"Serving Metro East since 2002 with direct local contact\.",
            re.I,
        ),
        r"\1 Written estimates and direct local contact.",
    ),
    (
        re.compile(
            r"licensed, insured, and backed by 23 years in Metro East",
            re.I,
        ),
        "serving Metro East since 2002 with written estimates",
    ),
    (
        re.compile(
            r"brings 23 years of Metro East (?:experience|expertise) to every",
            re.I,
        ),
        "brings local service dating to 2002 to every",
    ),
    (
        re.compile(r"with over 23 years of experience", re.I),
        "with service dating to 2002",
    ),
    (
        re.compile(r"23 years of Metro East (?:experience|expertise)", re.I),
        "local experience dating to 2002",
    ),
    (
        re.compile(r"23\+ years serving Metro East Illinois", re.I),
        "Serving Metro East Illinois since 2002",
    ),
    (
        re.compile(r"23 years serving Metro East Illinois", re.I),
        "Serving Metro East Illinois since 2002",
    ),
    (
        re.compile(r"23\+ years in Metro East", re.I),
        "Serving Metro East since 2002",
    ),
    (
        re.compile(r"23 Years Metro East", re.I),
        "Serving Since 2002",
    ),
    (
        re.compile(r"23\+? Years Experience", re.I),
        "Serving Since 2002",
    ),
    (
        re.compile(r"23 Years (?:in Metro East|Local)", re.I),
        "Serving Since 2002",
    ),
    (
        re.compile(r"23 years of quality work", re.I),
        "Local service dating to 2002",
    ),
    (
        re.compile(r"\b23 years\b", re.I),
        "service dating to 2002",
    ),
    (
        re.compile(r"\b23\+\s+years\b", re.I),
        "service dating to 2002",
    ),
    (
        re.compile(
            r"Is All-Pro licensed and insured in ([^?<]+)\?",
            re.I,
        ),
        r"What documentation should I verify before work begins in \1?",
    ),
    (
        re.compile(
            r"Yes\s*(?:&mdash;|&#8212;|—|-|â€”)?\s*All-Pro is fully licensed as an Illinois contractor and fully insured for all work in ([^.<]+)\.",
            re.I,
        ),
        r"Ask for current insurance information and any license details required for the approved scope in \1 before work begins.",
    ),
    (
        re.compile(r"(?i)(>)(?:(?:&#10003;|✓)\s*)?Owner on Every Job(<)"),
        r"\1Direct Local Contact\2",
    ),
    (
        re.compile(r"\bowner on every job(?:site)?\b", re.I),
        "direct local contact",
    ),
    (
        re.compile(r"\bOwner Bill Sessions? on every job(?:site)?\b", re.I),
        "Direct local contact",
    ),
    (
        re.compile(
            r"owner Bill Sessions? is personally involved in every estimate and every project",
            re.I,
        ),
        "homeowners can call Bill Session directly to discuss the estimate and project scope",
    ),
    (
        re.compile(
            r"Bill Sessions? is on site for every ([^.<]+) tree job\s*(?:&mdash;|&#8212;|—|â€”)\s*we do not send an unsupervised crew to your property and trust for the best\.\s*Licensed, insured, and experienced with trees of all sizes\.",
            re.I,
        ),
        r"Call Bill Session directly to discuss the \1 tree-service scope. Request current documentation and confirm site, equipment, utility, and disposal requirements before work begins.",
    ),
    (
        re.compile(r"(?i)(>)(?:(?:&#10003;|✓)\s*)?Licensed &amp; Insured(?: in Illinois| IL)?(<)"),
        r"\1Request Current Documentation\2",
    ),
    (
        re.compile(r"(?i)(>)(?:(?:&#10003;|✓)\s*)?Licensed &amp; insured (?:&#8212;|&mdash;|—|â€”) (?:IL|Illinois) contractor(<)"),
        r"\1Request Current Insurance and Applicable License Information\2",
    ),
    (
        re.compile(r"(?i)(>)(?:(?:&#10003;|✓)\s*)?Owner Bill Sessions? on every job(<)"),
        r"\1Call Bill Session Directly\2",
    ),
    (
        re.compile(r"(?i)(>)(?:&#11088;\s*)?4\.7 Stars?\s*(?:&middot;|·)\s*40 Reviews(<)"),
        r"\1Public Reviews &middot; Angi/HomeAdvisor\2",
    ),
    (
        re.compile(r"(?i)(>)(?:&#10003;\s*)?4\.7 stars?\s*(?:&middot;|·)\s*40 verified reviews(<)"),
        r"\1Public Reviews &middot; Angi/HomeAdvisor\2",
    ),
    (
        re.compile(
            r"<div class=[\"']footer-badge[\"']><span class=[\"']stars[\"']>.*?</span>\s*4\.7\s*(?:&middot;|·)\s*(?:40|200\+) Reviews\s*(?:&middot;|·)\s*HomeAdvisor</div>",
            re.I | re.S,
        ),
        '<div class="footer-badge">Public review profiles: Angi/HomeAdvisor</div>',
    ),
    (
        re.compile(r"4\.7\s*(?:&#11088;|⭐)?\s*HomeAdvisor", re.I),
        "Public Reviews: Angi/HomeAdvisor",
    ),
    (
        re.compile(r"4\.7\s*(?:Stars?|⭐)\s*(?:&middot;|·)\s*(?:40|200\+)\s*(?:verified\s*)?Reviews", re.I),
        "Public Reviews &middot; Angi/HomeAdvisor",
    ),
    (
        re.compile(r"\b4\.7\s*(?:stars?|⭐)\b", re.I),
        "public reviews",
    ),
    (
        re.compile(
            r"\b4\.7\b\s*(?:&middot;|·)\s*public review profiles\s*(?:&middot;|·)\s*HomeAdvisor",
            re.I,
        ),
        "Public reviews on Angi/HomeAdvisor",
    ),
    (
        re.compile(r"\b4\.7\b\s*(?:&middot;|·)\s*HomeAdvisor", re.I),
        "Public reviews on Angi/HomeAdvisor",
    ),
    (
        re.compile(r"\b4\.7\b\s*(?:&middot;|·)\s*public review profiles\b", re.I),
        "Public review profiles",
    ),
    (
        re.compile(r"\b4\.7-star rating on HomeAdvisor\b", re.I),
        "public review profiles on Angi/HomeAdvisor",
    ),
    (
        re.compile(r"\b4\.7\s*(?:⭐|&#11088;)\s*(?:on\s*)?HomeAdvisor\b", re.I),
        "Public reviews on Angi/HomeAdvisor",
    ),
    (
        re.compile(r"\b4\.7 Star\b\s*HomeAdvisor Rating", re.I),
        "Public reviews on Angi/HomeAdvisor",
    ),
    (
        re.compile(r"\b(?:40\+?|105|200\+)\s+(?:verified\s+)?reviews?\b", re.I),
        "public review profiles",
    ),
    (
        re.compile(r"4\.7\s*(?:&middot;|·)\s*(?:40|200\+)\s*Reviews\s*(?:&middot;|·)\s*HomeAdvisor", re.I),
        "Public Reviews &middot; Angi/HomeAdvisor",
    ),
    (
        re.compile(r"(?:Owner\s+)?Bill Sessions? personally manages every project\.", re.I),
        "Call Bill Session directly to discuss the project scope.",
    ),
    (
        re.compile(
            r"Every job is done by our own crew\s*(?:&mdash;|&#8212;|—|â€”)\s*no subcontractors\s*(?:&mdash;|&#8212;|—|â€”)\s*and backed by a workmanship guarantee\.\s*Owner Bill Sessions? personally reviews every project\.",
            re.I,
        ),
        "Project scopes identify the work and any trade partners involved. Ask about current warranty terms before approval, and call Bill directly with scope questions.",
    ),
    (
        re.compile(r"Owner Bill Sessions? personally reviews every project\.", re.I),
        "Call Bill Session directly with project-scope questions.",
    ),
    (
        re.compile(r"\blicensed concrete contractor\b", re.I),
        "local concrete contractor",
    ),
    (
        re.compile(r"\blicensed and insured contractor\b", re.I),
        "local contractor",
    ),
    (
        re.compile(r"\binsured, licensed, and experienced crews\b", re.I),
        "experienced crews with current documentation available on request",
    ),
    (
        re.compile(r"\blicensed, insured, free estimates\b", re.I),
        "serving Metro East since 2002, free estimates",
    ),
    (
        re.compile(r"\blicensed, insured\b", re.I),
        "documentation available on request",
    ),
    (
        re.compile(r"\blicensed\s*(?:&amp;|&|and)\s*insured\b", re.I),
        "documentation available on request",
    ),
    (
        re.compile(r"\binsured\s*(?:&amp;|&|and|,)\s*licensed\b", re.I),
        "documentation available on request",
    ),
    (
        re.compile(r"(?:&mdash;|&#8212;|—|â€”)\s*full liability and workers comp(?:ensation)?\.", re.I),
        "&mdash; verify current insurance and applicable trade licensing before work begins.",
    ),
    (
        re.compile(r"\bServing Your Neighborhood Since 2001\b", re.I),
        "Serving Metro East Since 2002",
    ),
    (
        re.compile(r"\bSince 2001\b", re.I),
        "Since 2002",
    ),
    (
        re.compile(r"\bFully documentation available on request\b", re.I),
        "Current documentation is available on request",
    ),
    (
        re.compile(r"\bdocumentation available on request in Illinois\b", re.I),
        "current documentation available on request",
    ),
    (
        re.compile(r"\bWe(?:'re| are) current documentation available on request\b", re.I),
        "Current documentation is available on request",
    ),
    (
        re.compile(r"\bMetro East(?:&#39;|')s most trusted contractor\b", re.I),
        "Local Metro East contractor",
    ),
    (
        re.compile(r"\bWe(?:'ve| have) built hundreds of decks\b", re.I),
        "All-Pro builds decks",
    ),
    (
        re.compile(r"\bhas built hundreds of decks\b", re.I),
        "builds decks",
    ),
    (
        re.compile(r"\b([A-Z][A-Za-z.' -]+) homeowners trust us for\b"),
        r"Homeowners in \1 can request",
    ),
    (
        re.compile(
            r"((?:^|[.!?]\s+))[A-Z][A-Za-z.' -]{1,30} homeowners love our 3-season rooms, "
            r"4-season heated sunrooms, and screened porch enclosures\.",
        ),
        r"\1Available scopes include 3-season rooms, insulated 4-season rooms, and screened porch enclosures.",
    ),
    (
        re.compile(r"Is All-Pro licensed for concrete work in ([^?<]+)\?", re.I),
        r"What documentation should I verify for concrete work in \1?",
    ),
    (
        re.compile(
            r"Yes\s*(?:&mdash;|&#8212;|—|-|â€”)?\s*All-Pro is fully licensed as an Illinois contractor for all concrete work in ([^.<]+)\.",
            re.I,
        ),
        r"Request current insurance information and confirm any license or permit requirements that apply to concrete work in \1 before work begins.",
    ),
    (
        re.compile(r"Is All-Pro insured for tree work in ([^?<]+)\?", re.I),
        r"What documentation should I verify for tree work in \1?",
    ),
    (
        re.compile(
            r"Yes\s*(?:&mdash;|&#8212;|—|-|â€”)?\s*Current documentation is available on request for all tree service work in ([^.<]+)\.",
            re.I,
        ),
        r"Request current insurance information and confirm any permit, utility, equipment, or licensing requirements that apply to tree work in \1 before work begins.",
    ),
    (
        re.compile(r"<strong>No subcontractors</strong>\s*(?:&mdash;|&#8212;|—|â€”)\s*our own crew from start to finish\.", re.I),
        "<strong>Coordinated project scope</strong> &mdash; ask which trade partners are included.",
    ),
    (
        re.compile(
            r"Highland homeowners in Madison County appreciate that All-Pro approaches every shower remodel with owner-level accountability\s*(?:&mdash;|&#8212;|—|â€”)\s*no subcontracting the tile to the lowest bidder, no shortcuts on waterproofing, no surprise charges at the end of the job\.\s*We give Highland homeowners a clear written estimate, a realistic timeline, and a finished shower that consistently exceeds expectations\.",
            re.I,
        ),
        "The written scope should identify tile work, waterproofing details, trade responsibilities, selections, pricing, and the expected schedule before a Highland shower remodel begins.",
    ),
    (
        re.compile(r"<strong>Licensed &amp; insured in Illinois</strong>\s*(?:&mdash;|&#8212;|—|â€”)\s*full liability and workers comp\.", re.I),
        "<strong>Documentation on request</strong> &mdash; verify current insurance and applicable trade licensing before work begins.",
    ),
    (
        re.compile(r"(?i)(>)(?:&#10003;\s*)?4\.7 stars?\s*(?:&middot;|·)\s*200\+ (?:verified )?reviews(<)"),
        r"\1Public Reviews &middot; Angi/HomeAdvisor\2",
    ),
    (
        re.compile(r"(?i)(>)4\.7\s*(?:&middot;|·)\s*(?:40|200\+) Reviews\s*(?:&middot;|·)\s*HomeAdvisor(<)"),
        r"\1Public Reviews &middot; Angi/HomeAdvisor\2",
    ),
    (
        re.compile(
            r"Call us for any ([^.<]+?) project in the 60-mile Metro East radius\.",
            re.I,
        ),
        "Call 618-581-0676 to confirm availability for your address and scope.",
    ),
    (
        re.compile(
            r"and communities throughout the 60-mile Metro East radius\. Call us regardless of your location (?:&mdash;|—) if you(?:&#39;|')re in Southern Illinois between St\. Louis and 60 miles out, we likely serve your area\.",
            re.I,
        ),
        "and other Metro East communities. Call 618-581-0676 to confirm availability for your address and scope.",
    ),
    (
        re.compile(
            r"Owner Bill Session personally handles every estimate and is on every job\. You get clear communication, a written estimate, and workmanship that holds up through Illinois winters\.",
            re.I,
        ),
        "Call Bill Session directly to discuss the scope, property, and estimate request. A written estimate follows a review of the actual work, access, selections, and trade requirements.",
    ),
)


def clean_text(value: str) -> str:
    cleaned = value
    for _ in range(3):
        previous = cleaned
        for old, new in EXACT_REPLACEMENTS:
            cleaned = cleaned.replace(old, new)
        for pattern, replacement in REGEX_REPLACEMENTS:
            cleaned = pattern.sub(replacement, cleaned)
        if cleaned == previous:
            break
    return cleaned


def business_entity(value: dict[str, object]) -> bool:
    raw_type = value.get("@type", [])
    types = set(raw_type if isinstance(raw_type, list) else [raw_type])
    name = str(value.get("name", "")).lower()
    entity_id = str(value.get("@id", "")).lower()
    return bool(types & BUSINESS_TYPES and ("all-pro" in name or "#business" in entity_id))


def clean_json(value: object) -> tuple[object, bool]:
    changed = False
    if isinstance(value, list):
        items = []
        for item in value:
            updated, item_changed = clean_json(item)
            items.append(updated)
            changed = changed or item_changed
        return items, changed
    if not isinstance(value, dict):
        if isinstance(value, str):
            updated = clean_text(value)
            return updated, updated != value
        return value, False

    updated_dict: dict[str, object] = {}
    for key, item in value.items():
        updated, item_changed = clean_json(item)
        updated_dict[key] = updated
        changed = changed or item_changed

    if business_entity(updated_dict):
        if updated_dict.get("foundingDate") != "2002":
            updated_dict["foundingDate"] = "2002"
            changed = True
        if updated_dict.get("address") != ADDRESS:
            updated_dict["address"] = ADDRESS.copy()
            changed = True
        if "aggregateRating" in updated_dict:
            del updated_dict["aggregateRating"]
            changed = True
        if "review" in updated_dict:
            del updated_dict["review"]
            changed = True
    return updated_dict, changed


def clean_json_script(match: re.Match[str]) -> str:
    opening, payload, closing = match.groups()
    try:
        parsed = json.loads(payload)
    except json.JSONDecodeError:
        return match.group(0)
    cleaned, changed = clean_json(parsed)
    if not changed:
        return match.group(0)
    rendered = json.dumps(cleaned, ensure_ascii=False, indent=2)
    return f"{opening}\n{rendered}\n{closing}"


def clean_html(html: str) -> str:
    parts: list[str] = []
    cursor = 0
    for match in SCRIPT_RE.finditer(html):
        parts.append(clean_text(html[cursor:match.start()]))
        parts.append(clean_json_script(match))
        cursor = match.end()
    parts.append(clean_text(html[cursor:]))
    return "".join(parts)


def target_paths() -> list[Path]:
    excluded_prefixes = ("allpro-crm-private-", "allpro-outreach-preview-", "lawnmex-")
    paths = [
        path
        for path in ROOT.glob("*.html")
        if not path.name.startswith(excluded_prefixes)
    ]
    paths.extend((ROOT / "blog").glob("*.html"))
    return sorted(paths)


def main() -> int:
    parser = argparse.ArgumentParser(description="Remove stale or unsupported public trust claims.")
    parser.add_argument("--write", action="store_true", help="Update root HTML files in place.")
    args = parser.parse_args()

    changed_files: list[Path] = []
    for path in target_paths():
        original = path.read_text(encoding="utf-8", errors="replace")
        cleaned = clean_html(original)
        if cleaned == original:
            continue
        changed_files.append(path)
        if args.write:
            path.write_text(cleaned, encoding="utf-8")

    action = "Updated" if args.write else "Would update"
    print(f"{action} {len(changed_files)} HTML files.")
    for path in changed_files[:25]:
        print(path.relative_to(ROOT).as_posix())
    if len(changed_files) > 25:
        print(f"... and {len(changed_files) - 25} more")
    return 0 if args.write or not changed_files else 1


if __name__ == "__main__":
    raise SystemExit(main())
