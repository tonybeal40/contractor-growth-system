# Social Authorization And Platform Rules

Use manager invitations or OAuth. Do not give this tool a Facebook, Google, Nextdoor, or Yelp password.

## Facebook Page

The publisher uses Meta's Page feed endpoint with a Page access token. The app/user must have permission to create content for the Page; current Meta implementations generally require `pages_manage_posts` and related Page access. Keep the Page ID and token in environment variables and complete Meta app review/business verification when Meta requires it.

Environment variables:

```text
META_PAGE_ID
META_PAGE_ACCESS_TOKEN
META_GRAPH_VERSION
```

Official SDK: https://github.com/facebook/facebook-nodejs-business-sdk

## Google Business Profile

Google supports local post creation through `accounts.locations.localPosts.create`. It requires an approved Business Profile API project, OAuth, and the `business.manage` scope.

Environment variables:

```text
GOOGLE_BUSINESS_ACCOUNT_ID
GOOGLE_BUSINESS_LOCATION_ID
GOOGLE_BUSINESS_ACCESS_TOKEN
```

Official reference: https://developers.google.com/my-business/reference/rest/v4/accounts.locations.localPosts/create

## Nextdoor

Nextdoor offers two separate approved API lanes:

- Displaying Content Search API for public posts by keyword, coordinates, and radius
- Publish API for a logged-in neighbor/business profile to create its own posts

Apply for access, use OAuth, and request only the scopes needed (`post:write` for publishing and the approved content-search access for monitoring). Posting must come from the linked Nextdoor user or business profile.

Official references:

- https://developer.nextdoor.com/reference/search-posts
- https://developer.nextdoor.com/reference/create-post
- https://developer.nextdoor.com/docs/sharing-overview

Environment variables:

```text
NEXTDOOR_ACCESS_TOKEN
NEXTDOOR_SECURE_PROFILE_ID
```

## Yelp

Yelp's public APIs do not provide a general small-business social-post endpoint. Listing updates, leads webhooks, and review-response APIs are partner products with separate approval. Publish ordinary updates manually through Yelp for Business unless Yelp grants a specific partner integration.

Official overview: https://docs.developer.yelp.com/docs/overview

## Approval Rule

Every post must be reviewed for factual accuracy. Do not say a job was completed, a slot is open, a discount exists, or a review was received unless the underlying proof is recorded.
