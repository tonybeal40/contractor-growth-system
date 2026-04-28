Set-Location "C:\Users\tonyb\contractor-growth-system-work"
$baseDir = "C:\Users\tonyb\contractor-growth-system-work"

# Extract nav and footer from the template
$tpl = Get-Content "$baseDir\deck-builder-freeburg-il.html" -Raw
$navHtml    = ([regex]::Match($tpl, '(?s)(<nav class="nav" id="nav">.*?</nav>)')).Groups[1].Value
$footerHtml = ([regex]::Match($tpl, '(?s)(<footer class="footer">.*?</footer>)')).Groups[1].Value

# Sidebar service metadata (same 13 services for all cities)
$svcMeta = @(
    @{S='deck-builder';      N='Deck Builder'},
    @{S='fence-company';     N='Fence Company'},
    @{S='landscaping';       N='Landscaping'},
    @{S='concrete';          N='Concrete'},
    @{S='patios';            N='Patios &amp; Walls'},
    @{S='remodeling';        N='Remodeling'},
    @{S='sunroom';           N='Sunroom Addition'},
    @{S='bathroom-remodel';  N='Bathroom Remodel'},
    @{S='kitchen-remodel';   N='Kitchen Remodel'},
    @{S='shower-remodel';    N='Shower Remodel'},
    @{S='tree-service';      N='Tree Service'},
    @{S='mulch-rock';        N='Mulch &amp; Rock'},
    @{S='landscape-cleanup'; N='Landscape Cleanup'}
)

function Get-SBLinks([string]$cs, [string]$cur) {
    ($svcMeta | Where-Object { $_['S'] -ne $cur } | ForEach-Object {
        "          <li style=`"font-size:0.8rem;color:var(--light);padding:0.2rem 0;`"><a href=`"/$($_.S)-$cs-il.html`" style=`"color:var(--light);`">&#x2192; $($_.N)</a></li>"
    }) -join "`n"
}

function MkPage($p) {
    $cu = "https://allprometroeastconstruction.com/$($p.fn)"
    $sb = Get-SBLinks $p.cs $p.ss
    $f  = $p.fq
    $html = @"
<!DOCTYPE html>
<html lang="en">
<head>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());</script>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-35DEM1MGDT"></script>
<script>gtag('config','G-35DEM1MGDT',{page_path:window.location.pathname});</script>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="canonical" href="$cu">
<title>$($p.ti)</title>
<meta name="description" content="$($p.md)">
<link rel="preload" as="image" href="/images/branding/logo-nav.webp" type="image/webp">
<link rel="stylesheet" href="/styles.css">
<link rel="icon" type="image/png" href="/images/branding/logo-square.png">
<meta property="og:title" content="$($p.ti)">
<meta property="og:description" content="$($p.md)">
<meta property="og:url" content="$cu">
<meta property="og:image" content="https://allprometroeastconstruction.com/images/branding/logo-square.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://allprometroeastconstruction.com/images/branding/logo-square.png">
<meta name="robots" content="index, follow">
<script>(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i+"?ref=bwt";y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y)})(window,document,"clarity","script","weti9tqt5q");</script>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "GeneralContractor",
  "name": "All-Pro Construction & Landscape",
  "description": "$($p.md)",
  "url": "https://allprometroeastconstruction.com/",
  "telephone": "+1-618-581-0676",
  "logo": "https://allprometroeastconstruction.com/images/branding/logo-square.png",
  "foundingDate": "2001",
  "address": {"@type":"PostalAddress","addressLocality":"Belleville","addressRegion":"IL","postalCode":"62220","addressCountry":"US"},
  "areaServed": {"@type":"City","name":"$($p.av)"},
  "aggregateRating": {"@type":"AggregateRating","ratingValue":"4.7","reviewCount":"40","bestRating":"5"}
}
</script>
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[
    {"@type":"Question","name":'$($f[0].Q)',"acceptedAnswer":{"@type":"Answer","text":'$($f[0].A)'}},
    {"@type":"Question","name":'$($f[1].Q)',"acceptedAnswer":{"@type":"Answer","text":'$($f[1].A)'}},
    {"@type":"Question","name":'$($f[2].Q)',"acceptedAnswer":{"@type":"Answer","text":'$($f[2].A)'}},
    {"@type":"Question","name":'$($f[3].Q)',"acceptedAnswer":{"@type":"Answer","text":'$($f[3].A)'}}
]}
</script>
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[
  {"@type":"ListItem","position":1,"name":"Home","item":"https://allprometroeastconstruction.com/"},
  {"@type":"ListItem","position":2,"name":"$($p.bsn)","item":"$($p.bsu)"},
  {"@type":"ListItem","position":3,"name":"$($p.bcl)","item":"$cu"}
]}
</script>
</head>
<body>
$navHtml

<section class="page-hero" style="padding:3rem 0 2rem;">
  <div class="container">
    <div class="hero-badge">$($p.hb)</div>
    <h1>$($p.h1)</h1>
    <p class="hero-sub">$($p.hs)</p>
    <div class="hero-ctas">
      <a href="tel:6185810676" class="btn-primary">&#128222; Call 618-581-0676</a>
      <a href="/contact.html" class="btn-secondary">Free Estimate &#x2192;</a>
    </div>
    <div class="hero-trust">
      <span>&#11088; 4.7 Stars &middot; 40 Reviews</span>
      <span>&#10003; Licensed &amp; Insured IL</span>
      <span>&#10003; 23 Years Metro East</span>
      <span>&#10003; Owner on Every Job</span>
    </div>
  </div>
</section>

<div class="content-section">
  <div class="container content-layout">
    <div class="content-body">
      <h2>$($p.h2)</h2>
      <p>$($p.cp)</p>

      <h3>Our $($p.bsn) Services in $($p.cn)</h3>
      <ul>
$($p.sl)
      </ul>

      <h3>Why $($p.cn) Homeowners Choose All-Pro</h3>
      <ul>
        <li><strong>23+ years in Metro East</strong> — we know $($p.cn) soil, codes, and climate.</li>
        <li><strong>Owner on every job</strong> — Bill Sessions personally manages every project.</li>
        <li><strong>No subcontractors</strong> — our own crew from start to finish.</li>
        <li><strong>Licensed &amp; insured in Illinois</strong> — full liability and workers comp.</li>
        <li><strong>Free written estimates</strong> — no pressure, no surprises.</li>
      </ul>

      <a href="/contact.html" class="btn-primary">$($p.ct)</a>
    </div>

    <div class="sidebar-card">
      <h3>Free Estimate in $($p.cn)</h3>
      <p style="color:var(--muted);font-size:0.9rem;margin-bottom:1rem;">Call or request online — Bill personally responds with a written estimate.</p>
      <p style="color:var(--light);font-size:0.9rem;">&#128222; <a href="tel:6185810676" style="color:var(--red);font-weight:700;">618-581-0676</a></p>
      <a href="/contact.html" class="btn-primary">Request Estimate &#x2192;</a>
      <ul style="list-style:none;margin-top:1.5rem;">
        <li style="color:var(--muted);font-size:0.85rem;padding:0.4rem 0;border-bottom:1px solid var(--dark3);">&#10003; Licensed &amp; Insured in Illinois</li>
        <li style="color:var(--muted);font-size:0.85rem;padding:0.4rem 0;border-bottom:1px solid var(--dark3);">&#10003; 4.7 Stars &middot; 40 Reviews</li>
        <li style="color:var(--muted);font-size:0.85rem;padding:0.4rem 0;border-bottom:1px solid var(--dark3);">&#10003; 23 Years Metro East</li>
        <li style="color:var(--muted);font-size:0.85rem;padding:0.4rem 0;border-bottom:1px solid var(--dark3);">&#10003; Owner on Every Job</li>
        <li style="color:var(--muted);font-size:0.85rem;padding:0.4rem 0;">&#10003; Free Written Estimates</li>
      </ul>
      <div style="margin-top:1.5rem;padding-top:1.5rem;border-top:1px solid var(--dark3);">
        <h4 style="font-size:0.85rem;color:var(--muted);margin-bottom:0.75rem;">More Services in $($p.cn)</h4>
        <ul style="list-style:none;">
$sb
        </ul>
      </div>
    </div>
  </div>
</div>

$footerHtml

<script>
  const nav=document.getElementById('nav');
  window.addEventListener('scroll',()=>{nav.classList.toggle('scrolled',window.scrollY>50);});
</script>
</body>
</html>
"@
    [System.IO.File]::WriteAllText((Join-Path $baseDir $p.fn), $html, [System.Text.Encoding]::UTF8)
    Write-Host "Created: $($p.fn)" -ForegroundColor Green
}

# ─── SERVICE LIST HTML SNIPPETS ──────────────────────────────────────────────
$SL_LANDSCAPE = @"
        <li>Full landscape bed design and installation</li>
        <li>Native and ornamental plant selection and installation</li>
        <li>Mulch and decorative rock delivery and installation</li>
        <li>Yard grading and drainage improvements</li>
        <li>Spring and fall cleanup services</li>
        <li>Sod installation and lawn preparation</li>
        <li>Retaining walls and garden edging</li>
"@

$SL_REMODEL = @"
        <li>Basement finishing and full conversions</li>
        <li>Bathroom gut-remodels and updates</li>
        <li>Full kitchen transformations</li>
        <li>Whole-home remodels and room additions</li>
        <li>Flooring, drywall, and trim work</li>
        <li>Structural modifications and open-concept conversions</li>
        <li>All trades coordinated and managed in-house</li>
"@

$SL_DECK = @"
        <li>Ground-level and elevated decks</li>
        <li>Multi-level and wraparound decks</li>
        <li>Composite decking (Trex, TimberTech)</li>
        <li>Pressure-treated and hardwood decks</li>
        <li>Covered decks, pergolas, and screened porches</li>
        <li>Deck repairs and replacements</li>
"@

$SL_FENCE = @"
        <li>Wood privacy, picket, and split-rail fencing</li>
        <li>Vinyl fencing (low-maintenance, color-through)</li>
        <li>Chain link fencing (residential and commercial)</li>
        <li>Aluminum ornamental fencing</li>
        <li>Gate installation and post-and-rail fencing</li>
        <li>Fence repairs and panel replacements</li>
"@

$SL_CONCRETE = @"
        <li>Concrete driveways (new pours and replacements)</li>
        <li>Concrete patios, walkways, and steps</li>
        <li>Sidewalks and garage aprons</li>
        <li>Footings, pads, and foundations</li>
        <li>Stamped and decorative concrete</li>
        <li>Concrete repairs and resurfacing</li>
"@

$SL_PATIOS = @"
        <li>Brick and paver patio installation</li>
        <li>Natural stone and flagstone patios</li>
        <li>Concrete patios (plain and stamped)</li>
        <li>Retaining walls with proper drainage</li>
        <li>Garden walls and raised planting beds</li>
        <li>Outdoor living space design and layout</li>
"@

$SL_SUNROOM = @"
        <li>Three-season sunroom additions</li>
        <li>Four-season insulated sunroom additions</li>
        <li>Custom windows, framing, and rooflines</li>
        <li>Electrical and HVAC rough-in coordination</li>
        <li>Foundation and structural work included</li>
        <li>Permits and inspections handled by All-Pro</li>
"@

$SL_BATH = @"
        <li>Full bathroom gut-remodels</li>
        <li>Walk-in shower conversions</li>
        <li>Custom tile work (walls, floors, and niches)</li>
        <li>Vanity and fixture upgrades</li>
        <li>Tub-to-shower conversions</li>
        <li>Accessibility modifications and grab-bar installs</li>
"@

$SL_KITCHEN = @"
        <li>Cabinet installation (stock, semi-custom, custom)</li>
        <li>Countertop replacement (granite, quartz, laminate)</li>
        <li>Open-concept wall removal and structural work</li>
        <li>Kitchen island additions</li>
        <li>Appliance-ready electrical and plumbing rough-ins</li>
        <li>Flooring and lighting updates</li>
"@

$SL_SHOWER = @"
        <li>Walk-in shower conversions (tub-to-shower)</li>
        <li>Custom tile walls, floors, and shower niches</li>
        <li>Frameless glass door and enclosure installation</li>
        <li>Built-in bench and niche additions</li>
        <li>Waterproofing and liner installation</li>
        <li>Fixture and showerhead upgrades</li>
"@

$SL_TREE = @"
        <li>Tree trimming and crown reduction</li>
        <li>Full tree removal (any size)</li>
        <li>Stump grinding and root removal</li>
        <li>Storm damage cleanup and emergency response</li>
        <li>Deadwood and hazard limb removal</li>
        <li>Land clearing and lot preparation</li>
"@

$SL_MULCH = @"
        <li>Bulk mulch delivery and professional installation</li>
        <li>Hardwood, cedar, and dyed mulch options</li>
        <li>Decorative rock and gravel installation</li>
        <li>River rock, lava rock, and pea gravel options</li>
        <li>Landscape liner and weed barrier installation</li>
        <li>Clean bed edging and refreshing</li>
"@

$SL_CLEANUP = @"
        <li>Spring yard cleanup and debris removal</li>
        <li>Fall leaf removal and hauling</li>
        <li>Landscape bed weeding and edging</li>
        <li>Full yard debris hauling</li>
        <li>Gutter cleaning (seasonal add-on)</li>
        <li>Recurring cleanup programs available</li>
"@

# ─── PAGE DEFINITIONS ────────────────────────────────────────────────────────

$pages = @(

# ── ALTON: LANDSCAPING ───────────────────────────────────────────────────────
@{
  fn='landscaping-alton-il.html'
  ti='Landscaping Contractor Alton IL | All-Pro Construction'
  md='All-Pro provides full-service landscaping in Alton, IL — bed design, plantings, mulch, grading, and complete yard transformations. Licensed, insured, free estimates. Call 618-581-0676.'
  h1='Landscaping in Alton, IL'
  hb='Serving Alton &amp; Madison County'
  hs='Full-service landscaping in Alton and Madison County — bed design, plantings, mulch, grading, and complete yard transformations. Free estimates, owner on every job.'
  av='Alton, IL'
  bsn='Landscaping'
  bsu='https://allprometroeastconstruction.com/landscaping.html'
  bcl='Landscaping Alton, IL'
  h2='Landscaping in Alton, IL'
  cp='All-Pro Construction &amp; Landscape has transformed yards throughout Alton and Madison County for over 23 years. From the historic riverfront neighborhoods and the bluff-top properties of Upper Alton to newer subdivisions along the Route 140 corridor, Alton homeowners trust us for complete landscape makeovers. We understand the drainage challenges unique to Alton terrain and know which plantings thrive in this part of the Metro East. Whether you need new beds, grading, sod, or a full property overhaul, our crew handles every detail.'
  sl=$SL_LANDSCAPE
  ct='Get Your Free Landscaping Estimate in Alton &#x2192;'
  cn='Alton'
  cs='alton'
  ss='landscaping'
  fq=@(
    @{Q='How much does landscaping cost in Alton, IL?'; A='Landscaping projects in Alton range from about $500 for basic mulching and bed refresh to $5,000+ for full yard transformations with new beds, plantings, and grading. Call All-Pro at 618-581-0676 for a free written estimate.'},
    @{Q='What does All-Pro landscaping include in Alton?'; A='We handle bed design, plant installation, mulch, rock, yard grading, drainage, sod, and edging for Alton homeowners. Full service from design to final cleanup — one crew, no subs.'},
    @{Q='What time of year is best for landscaping in Alton?'; A='Spring through fall is ideal in Alton, IL. Spring works best for new plantings and bed installations; fall is great for cleanup, overseeding, and mulch prep. We work nearly year-round on suitable projects.'},
    @{Q='Does All-Pro serve Alton, IL for landscaping?'; A='Yes — All-Pro serves all of Alton and Madison County. We have 23+ years serving the Metro East region including Alton, Godfrey, Bethalto, and Wood River. Call 618-581-0676.'}
  )
},

# ── ALTON: REMODELING ────────────────────────────────────────────────────────
@{
  fn='remodeling-alton-il.html'
  ti='Remodeling Contractor Alton IL | All-Pro Construction'
  md='All-Pro manages complete home remodels in Alton, IL — basement, bath, kitchen, and whole-home renovations. Licensed, insured, no subs. Free estimates. Call 618-581-0676.'
  h1='Home Remodeling in Alton, IL'
  hb='Serving Alton &amp; Madison County'
  hs='Complete home remodeling in Alton and Madison County — basement, bath, kitchen, and whole-home renovations. We manage every trade. Owner on every job.'
  av='Alton, IL'
  bsn='Remodeling'
  bsu='https://allprometroeastconstruction.com/remodeling.html'
  bcl='Remodeling Alton, IL'
  h2='Home Remodeling in Alton, IL'
  cp='All-Pro Construction &amp; Landscape manages complete home remodels throughout Alton and Madison County. Alton has a rich stock of older homes — many dating to the late 1800s and early 1900s — that require experienced contractors who respect historic character while delivering modern finishes. Our crew handles everything from basement conversions in Alton riverfront homes to kitchen gut-remodels in Upper Alton subdivisions. We coordinate every trade — framing, plumbing, electrical, drywall, tile, and finish work — keeping your project on schedule and on budget.'
  sl=$SL_REMODEL
  ct='Get Your Free Remodeling Estimate in Alton &#x2192;'
  cn='Alton'
  cs='alton'
  ss='remodeling'
  fq=@(
    @{Q='How much does a home remodel cost in Alton, IL?'; A='Remodeling costs in Alton vary by scope. Bathroom remodels run $8,000-$25,000+; kitchen remodels $10,000-$50,000+; basement finishes $15,000-$40,000+. All-Pro provides detailed written estimates before any work begins.'},
    @{Q='How long does a remodeling project take in Alton?'; A='Most remodeling projects in Alton take 2-8 weeks depending on scope and complexity. We set a realistic schedule upfront and update you throughout the project.'},
    @{Q='Does All-Pro pull permits for remodeling in Alton?'; A='Yes. All-Pro handles all necessary permits for structural, plumbing, and electrical work in Alton, IL. We manage the inspection process from start to finish — no stress for you.'},
    @{Q='What trades does All-Pro manage for Alton remodeling projects?'; A='We self-perform framing, demo, tile, flooring, and cabinet work. We coordinate licensed plumbers and electricians as needed. One company to call — no parade of independent subs.'}
  )
},

# ── FREEBURG: LANDSCAPING ────────────────────────────────────────────────────
@{
  fn='landscaping-freeburg-il.html'
  ti='Landscaping Contractor Freeburg IL | All-Pro Construction'
  md='All-Pro provides full-service landscaping in Freeburg, IL — bed design, plantings, mulch, grading, and yard transformations. St. Clair County licensed and insured. Free estimates. Call 618-581-0676.'
  h1='Landscaping in Freeburg, IL'
  hb='Serving Freeburg &amp; St. Clair County'
  hs='Full-service landscaping in Freeburg and St. Clair County — bed design, plantings, mulch, grading, and complete yard transformations. Free estimates, owner on every job.'
  av='Freeburg, IL'
  bsn='Landscaping'
  bsu='https://allprometroeastconstruction.com/landscaping.html'
  bcl='Landscaping Freeburg, IL'
  h2='Landscaping in Freeburg, IL'
  cp='All-Pro Construction &amp; Landscape has served Freeburg and St. Clair County homeowners for over 23 years. Freeburg properties tend toward larger lots with mature trees and more open yard space — ideal for ambitious landscape overhauls. We handle full bed redesigns, privacy plantings along fence lines, grading projects to address drainage, and mulch or rock installations on any scale. Our crew knows the soil conditions and micro-climates of this part of St. Clair County and brings that local knowledge to every job in Freeburg.'
  sl=$SL_LANDSCAPE
  ct='Get Your Free Landscaping Estimate in Freeburg &#x2192;'
  cn='Freeburg'
  cs='freeburg'
  ss='landscaping'
  fq=@(
    @{Q='How much does landscaping cost in Freeburg, IL?'; A='Landscaping in Freeburg runs about $500 for basic mulching to $5,000+ for full yard transformations with new beds and plantings. Larger Freeburg lots may run higher. Call All-Pro at 618-581-0676 for a free estimate.'},
    @{Q='What does All-Pro landscaping include in Freeburg?'; A='We cover bed design and installation, plant selection, mulch, decorative rock, yard grading, drainage fixes, sod, and edging. Full-service from design to final cleanup for Freeburg homeowners.'},
    @{Q='What season is best for landscaping in Freeburg, IL?'; A='Spring and fall are ideal in Freeburg. Spring is perfect for new plantings and bed installs; fall works well for cleanup, overseeding, and mulch prep. We work nearly year-round on the right projects.'},
    @{Q='Does All-Pro serve Freeburg for landscaping?'; A='Yes — All-Pro serves all of Freeburg and St. Clair County. We have been serving this area for 23+ years. Call 618-581-0676 to schedule your free estimate.'}
  )
},

# ── FREEBURG: REMODELING ─────────────────────────────────────────────────────
@{
  fn='remodeling-freeburg-il.html'
  ti='Remodeling Contractor Freeburg IL | All-Pro Construction'
  md='All-Pro manages complete home remodels in Freeburg, IL — basement, bath, kitchen, and whole-home renovations. St. Clair County licensed and insured. Free estimates. Call 618-581-0676.'
  h1='Home Remodeling in Freeburg, IL'
  hb='Serving Freeburg &amp; St. Clair County'
  hs='Complete home remodeling in Freeburg and St. Clair County — basement, bath, kitchen, and whole-home renovations. We manage every trade. Owner on every job.'
  av='Freeburg, IL'
  bsn='Remodeling'
  bsu='https://allprometroeastconstruction.com/remodeling.html'
  bcl='Remodeling Freeburg, IL'
  h2='Home Remodeling in Freeburg, IL'
  cp='All-Pro Construction &amp; Landscape handles complete home remodels in Freeburg, IL and throughout St. Clair County. Freeburg has a mix of older farmhouses, mid-century ranches, and newer construction — each requiring a different approach. Our crew adapts to the home in front of us. From finishing a basement in a newer build to gutting and redoing a bathroom in a 1960s ranch, we coordinate every trade and manage every detail. Bill Sessions is on site for every Freeburg project — no handoffs to a project manager you have never met.'
  sl=$SL_REMODEL
  ct='Get Your Free Remodeling Estimate in Freeburg &#x2192;'
  cn='Freeburg'
  cs='freeburg'
  ss='remodeling'
  fq=@(
    @{Q='How much does a home remodel cost in Freeburg, IL?'; A='Remodeling costs in Freeburg vary: bathroom remodels $8,000-$25,000+; kitchen remodels $10,000-$50,000+; basement finishes $15,000-$40,000+. We provide detailed written estimates before work begins.'},
    @{Q='How long does a remodeling project take in Freeburg?'; A='Most Freeburg remodeling projects run 2-8 weeks depending on scope. We set a realistic schedule before work starts and stick to it.'},
    @{Q='Does All-Pro pull permits for remodeling in Freeburg?'; A='Yes. All-Pro handles all permits for structural, plumbing, and electrical work in Freeburg. We manage inspections from start to finish — no headaches for you.'},
    @{Q='What trades does All-Pro coordinate for Freeburg remodels?'; A='We self-perform framing, demo, tile, flooring, and cabinet work. We coordinate licensed plumbers and electricians as needed. One call handles the whole project.'}
  )
},

# ── CASEYVILLE: DECK BUILDER ─────────────────────────────────────────────────
@{
  fn='deck-builder-caseyville-il.html'
  ti='Deck Builder Caseyville IL | All-Pro Construction'
  md='All-Pro builds custom decks in Caseyville, IL — wood, composite, multi-level, and covered decks. St. Clair County licensed and insured. Free estimates. Call 618-581-0676.'
  h1='Deck Builder in Caseyville, IL'
  hb='Serving Caseyville &amp; St. Clair County'
  hs='Custom deck construction in Caseyville and St. Clair County — wood, composite, multi-level, and covered decks. Free estimates, owner on every job.'
  av='Caseyville, IL'
  bsn='Decks'
  bsu='https://allprometroeastconstruction.com/decks.html'
  bcl='Decks Caseyville, IL'
  h2='Custom Deck Construction in Caseyville, IL'
  cp='All-Pro Construction &amp; Landscape has built custom decks across Caseyville and St. Clair County for over 23 years. Caseyville sits at a convenient crossroads near I-255, I-55, and I-64 — making it one of the fastest-growing communities in Metro East. As Caseyville homeowners invest in their properties, outdoor living additions like custom decks add serious value and usability. We build with pressure-treated lumber, composite decking (Trex, TimberTech), and hardwood options, and every deck is designed to meet Illinois building code with a full workmanship warranty.'
  sl=$SL_DECK
  ct='Get Your Free Deck Estimate in Caseyville &#x2192;'
  cn='Caseyville'
  cs='caseyville'
  ss='deck-builder'
  fq=@(
    @{Q='How much does a deck cost in Caseyville, IL?'; A='Pressure-treated decks in Caseyville typically start around $15-$25 per sq ft. Composite decks run $30-$60+ per sq ft. Call All-Pro at 618-581-0676 for a free written quote with no pressure.'},
    @{Q='Do I need a permit for a deck in Caseyville, IL?'; A='Most decks over 30 inches above grade require a permit in Illinois. All-Pro pulls all permits in Caseyville and manages the inspection process — no hassle for you.'},
    @{Q='How long does deck construction take in Caseyville?'; A='A typical residential deck in Caseyville takes 3-7 days depending on size and complexity. We give you a precise build schedule before work starts.'},
    @{Q='Does All-Pro build covered decks and pergolas in Caseyville?'; A='Yes — we build covered decks, screened porches, and pergola-covered outdoor rooms in Caseyville. Ask about adding a roof or screen system to your deck project.'}
  )
},

# ── CASEYVILLE: FENCE COMPANY ────────────────────────────────────────────────
@{
  fn='fence-company-caseyville-il.html'
  ti='Fence Company Caseyville IL | All-Pro Construction'
  md='All-Pro installs wood, vinyl, chain link, and aluminum fencing in Caseyville, IL. St. Clair County licensed and insured. Free estimates. Call 618-581-0676.'
  h1='Fence Installation in Caseyville, IL'
  hb='Serving Caseyville &amp; St. Clair County'
  hs='Professional fence installation in Caseyville and St. Clair County — wood, vinyl, chain link, and aluminum. Residential and commercial. Free estimates.'
  av='Caseyville, IL'
  bsn='Fencing'
  bsu='https://allprometroeastconstruction.com/fencing.html'
  bcl='Fencing Caseyville, IL'
  h2='Fence Installation in Caseyville, IL'
  cp='All-Pro Construction &amp; Landscape installs fencing throughout Caseyville and St. Clair County. Whether you need a wood privacy fence for a backyard near the Caseyville Road corridor, a vinyl fence for a low-maintenance option, chain link for a commercial property, or aluminum ornamental fencing to frame a front yard, we do it all. Our fencing crews handle residential and commercial projects of any size, and we manage permit requirements so you do not have to navigate city hall alone.'
  sl=$SL_FENCE
  ct='Get Your Free Fence Estimate in Caseyville &#x2192;'
  cn='Caseyville'
  cs='caseyville'
  ss='fence-company'
  fq=@(
    @{Q='How much does fence installation cost in Caseyville, IL?'; A='Fence installation in Caseyville typically runs $2,500-$12,000+ depending on material, style, and linear footage. Wood and chain link tend to be most affordable; vinyl and aluminum run higher. Call for a free estimate.'},
    @{Q='Do I need a permit for a fence in Caseyville?'; A='Permit requirements vary in Caseyville. All-Pro checks local requirements and handles any needed permits and inspections — one less thing for you to worry about.'},
    @{Q='What fence materials does All-Pro install in Caseyville?'; A='We install wood (privacy, picket, split-rail), vinyl (privacy and semi-privacy), chain link (galvanized and vinyl-coated), and aluminum ornamental fencing in Caseyville.'},
    @{Q='Does All-Pro serve Caseyville for fencing?'; A='Yes — All-Pro serves all of Caseyville and St. Clair County. Licensed and insured in Illinois with 23 years in Metro East. Call 618-581-0676.'}
  )
},

# ── CASEYVILLE: LANDSCAPING ──────────────────────────────────────────────────
@{
  fn='landscaping-caseyville-il.html'
  ti='Landscaping Contractor Caseyville IL | All-Pro Construction'
  md='All-Pro provides full-service landscaping in Caseyville, IL — bed design, plantings, mulch, grading, and yard transformations. St. Clair County licensed and insured. Free estimates. Call 618-581-0676.'
  h1='Landscaping in Caseyville, IL'
  hb='Serving Caseyville &amp; St. Clair County'
  hs='Full-service landscaping in Caseyville and St. Clair County — bed design, plantings, mulch, grading, and complete yard transformations. Free estimates, owner on every job.'
  av='Caseyville, IL'
  bsn='Landscaping'
  bsu='https://allprometroeastconstruction.com/landscaping.html'
  bcl='Landscaping Caseyville, IL'
  h2='Landscaping in Caseyville, IL'
  cp='All-Pro Construction &amp; Landscape delivers professional landscaping to Caseyville and the surrounding St. Clair County area. As one of Metro East most conveniently located communities — sitting near the I-255, I-55, and I-64 interchange — Caseyville continues to attract homeowners who want their properties to look as good as the neighborhoods they have chosen. We design and install landscape beds, select and install plants, grade yards for proper drainage, and refresh existing landscapes with new mulch and rock. No job is too large or too routine for our crew.'
  sl=$SL_LANDSCAPE
  ct='Get Your Free Landscaping Estimate in Caseyville &#x2192;'
  cn='Caseyville'
  cs='caseyville'
  ss='landscaping'
  fq=@(
    @{Q='How much does landscaping cost in Caseyville, IL?'; A='Landscaping in Caseyville ranges from about $500 for basic mulching and bed refresh to $5,000+ for full yard transformations. Call All-Pro at 618-581-0676 for a free written estimate.'},
    @{Q='What does All-Pro landscaping include in Caseyville?'; A='We handle bed design, plant installation, mulch, decorative rock, yard grading, drainage improvements, sod installation, and edging. Full service from design to cleanup.'},
    @{Q='What season is best for landscaping in Caseyville, IL?'; A='Spring through fall is prime season in Caseyville. Spring for new plantings; fall for cleanup and mulch prep. We work nearly year-round depending on the project type.'},
    @{Q='Does All-Pro serve Caseyville for landscaping?'; A='Yes — All-Pro serves all of Caseyville and St. Clair County. We have 23+ years in Metro East. Call 618-581-0676 to schedule your free estimate.'}
  )
},

# ── CASEYVILLE: CONCRETE ─────────────────────────────────────────────────────
@{
  fn='concrete-caseyville-il.html'
  ti='Concrete Contractor Caseyville IL | All-Pro Construction'
  md='All-Pro pours and finishes driveways, patios, sidewalks, and footings in Caseyville, IL. Properly engineered for Illinois freeze-thaw. Free estimates. Call 618-581-0676.'
  h1='Concrete Work in Caseyville, IL'
  hb='Serving Caseyville &amp; St. Clair County'
  hs='Professional concrete work in Caseyville and St. Clair County — driveways, patios, sidewalks, footings, and stamped concrete. Engineered for Illinois winters. Free estimates.'
  av='Caseyville, IL'
  bsn='Concrete'
  bsu='https://allprometroeastconstruction.com/concrete.html'
  bcl='Concrete Caseyville, IL'
  h2='Concrete Work in Caseyville, IL'
  cp='All-Pro Construction &amp; Landscape handles concrete work throughout Caseyville and St. Clair County. Illinois freeze-thaw cycles demand concrete that is properly mixed, poured, and finished — shortcuts here lead to cracking and heaving within a season or two. Our crew uses the right mix designs, control joint spacing, and reinforcement for every Caseyville project. From replacement driveways along residential streets to new patios and sidewalks for commercial properties near the Interstate 255 corridor, we deliver concrete work that lasts.'
  sl=$SL_CONCRETE
  ct='Get Your Free Concrete Estimate in Caseyville &#x2192;'
  cn='Caseyville'
  cs='caseyville'
  ss='concrete'
  fq=@(
    @{Q='How much does concrete work cost in Caseyville, IL?'; A='Basic concrete in Caseyville runs $4-$8 per sq ft for standard flatwork. Stamped or decorative concrete runs $8-$15+ per sq ft. Driveways typically total $3,000-$8,000+. Call for a free estimate.'},
    @{Q='Do concrete projects in Caseyville require permits?'; A='Footings, foundations, and structural concrete typically require permits in Caseyville. All-Pro handles all permits and inspections — no extra work for you.'},
    @{Q='How long does a concrete project take in Caseyville?'; A='Most residential concrete projects in Caseyville take 2-5 days including prep, pour, and finishing. Cure time varies. We give you a clear schedule before work starts.'},
    @{Q='How does All-Pro handle Illinois freeze-thaw for concrete in Caseyville?'; A='We use proper mix designs with fiber reinforcement, adequate slab thickness, and correctly spaced control joints. This is essential for concrete longevity in Caseyville and St. Clair County winters.'}
  )
},

# ── CASEYVILLE: PATIOS ───────────────────────────────────────────────────────
@{
  fn='patios-caseyville-il.html'
  ti='Patio &amp; Retaining Wall Contractor Caseyville IL | All-Pro Construction'
  md='All-Pro installs brick, stone, and concrete patios and retaining walls in Caseyville, IL. St. Clair County licensed and insured. Free estimates. Call 618-581-0676.'
  h1='Patios &amp; Retaining Walls in Caseyville, IL'
  hb='Serving Caseyville &amp; St. Clair County'
  hs='Brick, stone, and concrete patio installation plus retaining walls in Caseyville and St. Clair County. Proper drainage built in. Free estimates, owner on every job.'
  av='Caseyville, IL'
  bsn='Patios'
  bsu='https://allprometroeastconstruction.com/patios.html'
  bcl='Patios Caseyville, IL'
  h2='Patios &amp; Retaining Walls in Caseyville, IL'
  cp='All-Pro Construction &amp; Landscape installs patios and retaining walls throughout Caseyville and St. Clair County. A well-built patio extends your living space; a properly engineered retaining wall protects your yard from erosion and drainage issues. We design and build brick paver patios, natural stone and flagstone surfaces, plain and stamped concrete patios, and retaining walls with proper drainage systems built in from the start. Caseyville homeowners benefit from our 23-year track record of outdoor living installations across Metro East.'
  sl=$SL_PATIOS
  ct='Get Your Free Patio Estimate in Caseyville &#x2192;'
  cn='Caseyville'
  cs='caseyville'
  ss='patios'
  fq=@(
    @{Q='How much does a patio cost in Caseyville, IL?'; A='Patio projects in Caseyville typically range from $3,000 for a basic concrete patio to $15,000+ for large brick paver or natural stone installations. Retaining walls add to the total. Call for a free estimate.'},
    @{Q='What patio materials does All-Pro use in Caseyville?'; A='We install brick pavers, concrete pavers, natural flagstone, poured concrete (plain and stamped), and natural stone walls in Caseyville, IL.'},
    @{Q='Do retaining walls in Caseyville require a permit?'; A='Retaining walls over 4 feet in height typically require a permit. All-Pro handles permit applications and inspections in Caseyville — no extra steps for you.'},
    @{Q='How long does a patio installation take in Caseyville?'; A='Most patio projects in Caseyville take 3-7 days depending on size and material. We provide a project timeline before any work begins.'}
  )
},

# ── CASEYVILLE: REMODELING ───────────────────────────────────────────────────
@{
  fn='remodeling-caseyville-il.html'
  ti='Remodeling Contractor Caseyville IL | All-Pro Construction'
  md='All-Pro manages complete home remodels in Caseyville, IL — basement, bath, kitchen, and whole-home renovations. St. Clair County licensed and insured. Free estimates. Call 618-581-0676.'
  h1='Home Remodeling in Caseyville, IL'
  hb='Serving Caseyville &amp; St. Clair County'
  hs='Complete home remodeling in Caseyville and St. Clair County — basement, bath, kitchen, and whole-home renovations. We manage every trade. Owner on every job.'
  av='Caseyville, IL'
  bsn='Remodeling'
  bsu='https://allprometroeastconstruction.com/remodeling.html'
  bcl='Remodeling Caseyville, IL'
  h2='Home Remodeling in Caseyville, IL'
  cp='All-Pro Construction &amp; Landscape manages complete home remodeling projects throughout Caseyville and St. Clair County. Caseyville is a growing community with a diverse housing stock — from ranch homes built in the 1970s and 1980s to newer construction near the O Fallon and Collinsville borders. Our remodeling crew handles all of it: basement finishes, bathroom gut-remodels, full kitchen transformations, and structural modifications for open-concept layouts. We self-perform most of the work and coordinate licensed plumbers and electricians — one company managing everything from demolition to final trim.'
  sl=$SL_REMODEL
  ct='Get Your Free Remodeling Estimate in Caseyville &#x2192;'
  cn='Caseyville'
  cs='caseyville'
  ss='remodeling'
  fq=@(
    @{Q='How much does a home remodel cost in Caseyville, IL?'; A='Remodeling in Caseyville varies by scope. Bathroom remodels run $8,000-$25,000+; kitchen remodels $10,000-$50,000+; basement finishes $15,000-$40,000+. We provide detailed written estimates before any work begins.'},
    @{Q='How long does a remodeling project take in Caseyville?'; A='Most Caseyville remodeling projects take 2-8 weeks depending on scope. We set a realistic schedule before starting and keep you informed throughout.'},
    @{Q='Does All-Pro pull permits for remodeling in Caseyville?'; A='Yes. All-Pro handles all permits for structural, plumbing, and electrical work in Caseyville. We manage the inspection process so you do not have to navigate it alone.'},
    @{Q='What trades does All-Pro manage for Caseyville remodels?'; A='We self-perform framing, demo, tile, flooring, and cabinet work. We coordinate licensed plumbers and electricians as needed. One company manages the entire project.'}
  )
},

# ── CASEYVILLE: SUNROOM ──────────────────────────────────────────────────────
@{
  fn='sunroom-caseyville-il.html'
  ti='Sunroom Addition Caseyville IL | All-Pro Construction'
  md='All-Pro builds three-season and four-season sunroom additions in Caseyville, IL. Extend your living space and add home value. Free estimates. Call 618-581-0676.'
  h1='Sunroom Additions in Caseyville, IL'
  hb='Serving Caseyville &amp; St. Clair County'
  hs='Three-season and four-season sunroom additions in Caseyville and St. Clair County. Extend your living space, add home value. Owner on every job. Free estimates.'
  av='Caseyville, IL'
  bsn='Sunrooms'
  bsu='https://allprometroeastconstruction.com/sunroom.html'
  bcl='Sunrooms Caseyville, IL'
  h2='Sunroom Additions in Caseyville, IL'
  cp='All-Pro Construction &amp; Landscape builds sunroom additions throughout Caseyville and St. Clair County. A sunroom is one of the best investments a Caseyville homeowner can make — it extends your usable living space, brings in natural light, and adds measurable value to your home. We build three-season rooms for three seasons of enjoyment and fully insulated four-season rooms designed for year-round use with heating and cooling. Every sunroom addition is permitted, engineered, and built to last by our own crew — no subcontractors, no handoffs.'
  sl=$SL_SUNROOM
  ct='Get Your Free Sunroom Estimate in Caseyville &#x2192;'
  cn='Caseyville'
  cs='caseyville'
  ss='sunroom'
  fq=@(
    @{Q='How much does a sunroom addition cost in Caseyville, IL?'; A='Sunroom additions in Caseyville typically range from $15,000 for a basic three-season room to $50,000+ for a fully insulated four-season addition. Call All-Pro at 618-581-0676 for a detailed written estimate.'},
    @{Q='What is the difference between a three-season and four-season sunroom?'; A='A three-season sunroom in Caseyville uses standard windows and is comfortable spring through fall. A four-season sunroom is fully insulated with HVAC integration for year-round use — better for Caseyville winters.'},
    @{Q='Do sunroom additions in Caseyville require a permit?'; A='Yes. Sunroom additions are structural projects that require a building permit in Caseyville. All-Pro handles the permit application and manages all inspections from start to finish.'},
    @{Q='How long does a sunroom addition take in Caseyville?'; A='Most sunroom additions in Caseyville take 2-4 weeks from groundbreaking to final walkthrough. We provide a detailed schedule before work begins.'}
  )
},

# ── CASEYVILLE: BATHROOM REMODEL ─────────────────────────────────────────────
@{
  fn='bathroom-remodel-caseyville-il.html'
  ti='Bathroom Remodel Caseyville IL | All-Pro Construction'
  md='All-Pro handles full bathroom remodels in Caseyville, IL — custom tile, walk-in showers, vanities, and fixtures. St. Clair County licensed and insured. Free estimates. Call 618-581-0676.'
  h1='Bathroom Remodel in Caseyville, IL'
  hb='Serving Caseyville &amp; St. Clair County'
  hs='Full bathroom remodels in Caseyville and St. Clair County — custom tile, walk-in showers, vanities, and complete gut-remodels. Owner on every job. Free estimates.'
  av='Caseyville, IL'
  bsn='Bathroom Remodel'
  bsu='https://allprometroeastconstruction.com/bathroom-remodel.html'
  bcl='Bathroom Remodel Caseyville, IL'
  h2='Bathroom Remodel in Caseyville, IL'
  cp='All-Pro Construction &amp; Landscape handles complete bathroom remodels throughout Caseyville and St. Clair County. Whether you want to convert an outdated tub-shower combo into a custom walk-in shower, replace dated tile throughout, or do a full gut-remodel down to the studs, our crew manages every aspect. We self-perform demo, waterproofing, tile, drywall, vanity installation, and fixture work — coordinating licensed plumbers for any rough-in changes. Caseyville homeowners get a single point of contact from the first estimate to the final walkthrough.'
  sl=$SL_BATH
  ct='Get Your Free Bathroom Remodel Estimate in Caseyville &#x2192;'
  cn='Caseyville'
  cs='caseyville'
  ss='bathroom-remodel'
  fq=@(
    @{Q='How much does a bathroom remodel cost in Caseyville, IL?'; A='Full bathroom remodels in Caseyville typically run $8,000-$25,000+ depending on size and scope. Basic fixture and tile updates start lower; full gut-remodels with custom tile run higher. Call for a free estimate.'},
    @{Q='How long does a bathroom remodel take in Caseyville?'; A='Most bathroom remodels in Caseyville take 1-3 weeks. Full gut-remodels with custom tile can take toward the higher end. We give you a schedule before work starts and stick to it.'},
    @{Q='Does All-Pro handle permits for bathroom remodels in Caseyville?'; A='Permits are required when structural or plumbing work is involved. All-Pro determines what is required and handles all permits and inspections for Caseyville bathroom remodels.'},
    @{Q='Can All-Pro convert a tub to a walk-in shower in Caseyville?'; A='Yes — tub-to-shower conversions are one of our most popular Caseyville bathroom projects. We handle demo, new drain work, waterproofing, custom tile, and frameless glass doors.'}
  )
},

# ── CASEYVILLE: KITCHEN REMODEL ──────────────────────────────────────────────
@{
  fn='kitchen-remodel-caseyville-il.html'
  ti='Kitchen Remodel Caseyville IL | All-Pro Construction'
  md='All-Pro handles full kitchen remodels in Caseyville, IL — cabinets, countertops, open-concept conversions, and islands. St. Clair County licensed and insured. Free estimates. Call 618-581-0676.'
  h1='Kitchen Remodel in Caseyville, IL'
  hb='Serving Caseyville &amp; St. Clair County'
  hs='Full kitchen remodels in Caseyville and St. Clair County — cabinets, countertops, open-concept conversions, and island additions. Owner on every job. Free estimates.'
  av='Caseyville, IL'
  bsn='Kitchen Remodel'
  bsu='https://allprometroeastconstruction.com/kitchen-remodel.html'
  bcl='Kitchen Remodel Caseyville, IL'
  h2='Kitchen Remodel in Caseyville, IL'
  cp='All-Pro Construction &amp; Landscape manages complete kitchen remodels throughout Caseyville and St. Clair County. The kitchen is the most-used room in any home, and Caseyville homeowners increasingly want kitchens that match the quality of the community they have invested in. We handle cabinet installations, countertop replacements, structural work for open-concept conversions, island additions, and all the electrical and plumbing rough-ins needed for new appliance locations. From design to the final light fixture, we coordinate every trade and manage every detail.'
  sl=$SL_KITCHEN
  ct='Get Your Free Kitchen Remodel Estimate in Caseyville &#x2192;'
  cn='Caseyville'
  cs='caseyville'
  ss='kitchen-remodel'
  fq=@(
    @{Q='How much does a kitchen remodel cost in Caseyville, IL?'; A='Kitchen remodels in Caseyville typically range from $10,000 for basic updates to $50,000+ for full gut-remodels with custom cabinets and high-end countertops. We provide detailed written estimates.'},
    @{Q='How long does a kitchen remodel take in Caseyville?'; A='Most kitchen remodels in Caseyville take 2-6 weeks depending on the scope of work. We set a schedule upfront and keep you updated at every stage.'},
    @{Q='What cabinet options are available for kitchen remodels in Caseyville?'; A='All-Pro installs stock cabinets (fastest lead time), semi-custom cabinets (more options and sizes), and fully custom cabinets (built to your exact specs) for Caseyville kitchen remodels.'},
    @{Q='Do kitchen remodels in Caseyville require permits?'; A='Structural changes and electrical panel upgrades require permits. All-Pro handles permit applications and inspections for all Caseyville kitchen projects that require them.'}
  )
},

# ── CASEYVILLE: SHOWER REMODEL ───────────────────────────────────────────────
@{
  fn='shower-remodel-caseyville-il.html'
  ti='Shower Remodel Caseyville IL | All-Pro Construction'
  md='All-Pro handles shower remodels in Caseyville, IL — walk-in conversions, custom tile, frameless glass, and tub-to-shower transformations. Free estimates. Call 618-581-0676.'
  h1='Shower Remodel in Caseyville, IL'
  hb='Serving Caseyville &amp; St. Clair County'
  hs='Custom shower remodels in Caseyville and St. Clair County — walk-in conversions, custom tile, frameless glass doors, and tub-to-shower transformations. Free estimates.'
  av='Caseyville, IL'
  bsn='Shower Remodel'
  bsu='https://allprometroeastconstruction.com/shower-remodel.html'
  bcl='Shower Remodel Caseyville, IL'
  h2='Shower Remodel in Caseyville, IL'
  cp='All-Pro Construction &amp; Landscape remodels showers throughout Caseyville and St. Clair County. A dated fiberglass insert or a cramped tub-shower combo can make an entire bathroom feel old. Our crew replaces them with custom-tiled walk-in showers, niche storage, bench seating, and frameless glass enclosures. We handle all the waterproofing, tile layout planning, and finish details that separate a shower that lasts from one that fails in a few years. Caseyville homeowners get a full-service shower remodel from one company — no coordinating separate tile setters and glass companies.'
  sl=$SL_SHOWER
  ct='Get Your Free Shower Remodel Estimate in Caseyville &#x2192;'
  cn='Caseyville'
  cs='caseyville'
  ss='shower-remodel'
  fq=@(
    @{Q='How much does a shower remodel cost in Caseyville, IL?'; A='Shower remodels in Caseyville typically run $3,000-$12,000+ depending on size, tile selection, and whether it includes a tub removal and frameless glass door. Call All-Pro for a free estimate.'},
    @{Q='How long does a shower remodel take in Caseyville?'; A='Most shower remodels in Caseyville take 3-7 days. Larger tub-to-shower conversions with tile and glass can take toward the higher end. We provide a schedule before work starts.'},
    @{Q='Does All-Pro install frameless glass doors in Caseyville?'; A='Yes. Frameless glass shower doors and enclosures are a popular upgrade in Caseyville. We measure, order, and install — you get one contractor for the whole job.'},
    @{Q='What tile options are available for shower remodels in Caseyville?'; A='We work with ceramic, porcelain, natural stone, and large-format tiles for Caseyville shower projects. We can help you select tile that fits your budget and design goals.'}
  )
},

# ── CASEYVILLE: TREE SERVICE ─────────────────────────────────────────────────
@{
  fn='tree-service-caseyville-il.html'
  ti='Tree Service Caseyville IL | All-Pro Construction'
  md='All-Pro provides tree trimming, removal, and stump grinding in Caseyville, IL. Licensed, insured, owner on every job. Free estimates. Call 618-581-0676.'
  h1='Tree Service in Caseyville, IL'
  hb='Serving Caseyville &amp; St. Clair County'
  hs='Professional tree trimming, removal, and stump grinding in Caseyville and St. Clair County. Storm cleanup. Licensed and insured. Owner on every job. Free estimates.'
  av='Caseyville, IL'
  bsn='Tree Service'
  bsu='https://allprometroeastconstruction.com/index.html'
  bcl='Tree Service Caseyville, IL'
  h2='Tree Service in Caseyville, IL'
  cp='All-Pro Construction &amp; Landscape provides professional tree services throughout Caseyville and St. Clair County. Caseyville properties range from newer lots with young trees to established yards with mature hardwoods that need proper care and occasional removal. Our tree service crew handles trimming, full removal, stump grinding, and storm damage cleanup. Bill Sessions is on site for every Caseyville tree job — we do not send an unsupervised crew to your property and trust for the best. Licensed, insured, and experienced with trees of all sizes.'
  sl=$SL_TREE
  ct='Get Your Free Tree Service Estimate in Caseyville &#x2192;'
  cn='Caseyville'
  cs='caseyville'
  ss='tree-service'
  fq=@(
    @{Q='How much does tree service cost in Caseyville, IL?'; A='Tree trimming in Caseyville typically runs $200-$800 per tree depending on size and complexity. Full tree removal runs $500-$2,000+ depending on the tree. Call All-Pro at 618-581-0676 for a free estimate.'},
    @{Q='How much does stump grinding cost in Caseyville?'; A='Stump grinding in Caseyville typically runs $75-$400 depending on stump diameter and accessibility. We grind the stump below grade so you can replant or sod over the area.'},
    @{Q='Does All-Pro handle storm damage tree cleanup in Caseyville?'; A='Yes. All-Pro prioritizes storm damage calls in Caseyville and responds quickly after major storms. We remove fallen limbs and trees safely and haul everything away.'},
    @{Q='Is All-Pro licensed and insured for tree service in Caseyville?'; A='Yes. All-Pro is fully licensed and insured in Illinois for tree service work. We carry full liability and workers compensation coverage for every Caseyville job.'}
  )
},

# ── CASEYVILLE: MULCH & ROCK ─────────────────────────────────────────────────
@{
  fn='mulch-rock-caseyville-il.html'
  ti='Mulch &amp; Rock Installation Caseyville IL | All-Pro Construction'
  md='All-Pro delivers and installs mulch and decorative rock in Caseyville, IL. Hardwood, cedar, dyed mulch, river rock, and more. Free estimates. Call 618-581-0676.'
  h1='Mulch &amp; Rock in Caseyville, IL'
  hb='Serving Caseyville &amp; St. Clair County'
  hs='Professional mulch and decorative rock installation in Caseyville and St. Clair County. Hardwood, cedar, dyed mulch, river rock, and lava rock. Free estimates.'
  av='Caseyville, IL'
  bsn='Mulch &amp; Rock'
  bsu='https://allprometroeastconstruction.com/landscaping.html'
  bcl='Mulch &amp; Rock Caseyville, IL'
  h2='Mulch &amp; Rock Installation in Caseyville, IL'
  cp='All-Pro Construction &amp; Landscape delivers and installs mulch and decorative rock throughout Caseyville and St. Clair County. Fresh mulch does more than look good — it retains soil moisture, suppresses weeds, and regulates soil temperature through Caseyville summers and winters. We offer hardwood mulch, cedar mulch, and dyed mulch options, as well as decorative rock including river rock, lava rock, and pea gravel. Our crew handles bed prep, liner installation, and a clean finished edge so Caseyville yards look sharp and stay that way longer.'
  sl=$SL_MULCH
  ct='Get Your Free Mulch &amp; Rock Estimate in Caseyville &#x2192;'
  cn='Caseyville'
  cs='caseyville'
  ss='mulch-rock'
  fq=@(
    @{Q='How much does mulch installation cost in Caseyville, IL?'; A='Mulch delivery and installation in Caseyville typically runs $200-$1,500+ depending on the number of beds and cubic yards needed. Rock installations run higher. Call All-Pro for a free estimate.'},
    @{Q='What mulch types does All-Pro offer in Caseyville?'; A='We offer hardwood bark mulch, cedar mulch (natural insect-repelling), and dyed mulch (black, brown, red) for Caseyville properties. We can help you choose the right type for your beds.'},
    @{Q='What decorative rock options are available in Caseyville?'; A='We install river rock, lava rock, pea gravel, limestone screenings, and other decorative stone options for Caseyville landscape beds and pathways.'},
    @{Q='When is the best time to install mulch in Caseyville?'; A='Spring is ideal for mulch installation in Caseyville — before summer heat sets in. Fall is also a great time to refresh beds before winter. We install year-round on suitable days.'}
  )
},

# ── CASEYVILLE: LANDSCAPE CLEANUP ───────────────────────────────────────────
@{
  fn='landscape-cleanup-caseyville-il.html'
  ti='Landscape Cleanup Caseyville IL | All-Pro Construction'
  md='All-Pro provides spring and fall landscape cleanup in Caseyville, IL — leaf removal, bed weeding, debris hauling, and full yard cleanup. Free estimates. Call 618-581-0676.'
  h1='Landscape Cleanup in Caseyville, IL'
  hb='Serving Caseyville &amp; St. Clair County'
  hs='Spring and fall landscape cleanup in Caseyville and St. Clair County — leaf removal, bed weeding, edging, and full yard debris hauling. Free estimates.'
  av='Caseyville, IL'
  bsn='Landscape Cleanup'
  bsu='https://allprometroeastconstruction.com/landscaping.html'
  bcl='Landscape Cleanup Caseyville, IL'
  h2='Landscape Cleanup in Caseyville, IL'
  cp='All-Pro Construction &amp; Landscape handles spring and fall yard cleanups throughout Caseyville and St. Clair County. After a long winter, Caseyville yards need more than just a mow — they need dead debris cleared from beds, leaves and sticks hauled out, and edges refreshed before the growing season begins. Our fall cleanups remove the leaf accumulation that smothers grass and harbors insects over winter. We haul everything away so you are left with a clean, ready yard. One-time or recurring service is available depending on what fits your needs.'
  sl=$SL_CLEANUP
  ct='Get Your Free Landscape Cleanup Estimate in Caseyville &#x2192;'
  cn='Caseyville'
  cs='caseyville'
  ss='landscape-cleanup'
  fq=@(
    @{Q='How much does landscape cleanup cost in Caseyville, IL?'; A='Landscape cleanup in Caseyville typically runs $150-$800+ depending on yard size and the amount of debris. Spring cleanups after heavy winters tend to run higher. Call All-Pro for a free estimate.'},
    @{Q='What is included in a spring cleanup in Caseyville?'; A='Spring cleanup in Caseyville includes leaf and debris removal from lawn and beds, bed weeding and edging, dead material cutback, and full haul-away. We leave the yard ready for the growing season.'},
    @{Q='What is included in a fall cleanup in Caseyville?'; A='Fall cleanup includes leaf blowing and removal, bed cleanup, final mow preparation, and debris hauling. A clean fall yard in Caseyville means less work — and a healthier lawn — come spring.'},
    @{Q='Does All-Pro offer recurring landscape cleanup in Caseyville?'; A='Yes. We offer one-time cleanup visits as well as seasonal programs for Caseyville homeowners who want regular maintenance throughout the year. Ask about recurring service pricing.'}
  )
}

) # end $pages array

# ─── GENERATE ALL PAGES ──────────────────────────────────────────────────────
foreach ($page in $pages) {
    MkPage $page
}

Write-Host "`nAll $($pages.Count) pages created." -ForegroundColor Cyan

# ─── UPDATE SITEMAP ──────────────────────────────────────────────────────────
$sitemapPath = "$baseDir\sitemap.xml"
$sitemap = Get-Content $sitemapPath -Raw

$newEntries = @"

  <!-- New service pages: Alton, Freeburg, Caseyville (2026-04-28) -->
  <url>
    <loc>https://allprometroeastconstruction.com/landscaping-alton-il.html</loc>
    <lastmod>2026-04-28</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://allprometroeastconstruction.com/remodeling-alton-il.html</loc>
    <lastmod>2026-04-28</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://allprometroeastconstruction.com/landscaping-freeburg-il.html</loc>
    <lastmod>2026-04-28</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://allprometroeastconstruction.com/remodeling-freeburg-il.html</loc>
    <lastmod>2026-04-28</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://allprometroeastconstruction.com/deck-builder-caseyville-il.html</loc>
    <lastmod>2026-04-28</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://allprometroeastconstruction.com/fence-company-caseyville-il.html</loc>
    <lastmod>2026-04-28</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://allprometroeastconstruction.com/landscaping-caseyville-il.html</loc>
    <lastmod>2026-04-28</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://allprometroeastconstruction.com/concrete-caseyville-il.html</loc>
    <lastmod>2026-04-28</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://allprometroeastconstruction.com/patios-caseyville-il.html</loc>
    <lastmod>2026-04-28</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://allprometroeastconstruction.com/remodeling-caseyville-il.html</loc>
    <lastmod>2026-04-28</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://allprometroeastconstruction.com/sunroom-caseyville-il.html</loc>
    <lastmod>2026-04-28</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://allprometroeastconstruction.com/bathroom-remodel-caseyville-il.html</loc>
    <lastmod>2026-04-28</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://allprometroeastconstruction.com/kitchen-remodel-caseyville-il.html</loc>
    <lastmod>2026-04-28</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://allprometroeastconstruction.com/shower-remodel-caseyville-il.html</loc>
    <lastmod>2026-04-28</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://allprometroeastconstruction.com/tree-service-caseyville-il.html</loc>
    <lastmod>2026-04-28</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://allprometroeastconstruction.com/mulch-rock-caseyville-il.html</loc>
    <lastmod>2026-04-28</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://allprometroeastconstruction.com/landscape-cleanup-caseyville-il.html</loc>
    <lastmod>2026-04-28</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
"@

$sitemap = $sitemap -replace '</urlset>', "$newEntries`n</urlset>"
[System.IO.File]::WriteAllText($sitemapPath, $sitemap, [System.Text.Encoding]::UTF8)
Write-Host "Sitemap updated with 17 new entries." -ForegroundColor Cyan
