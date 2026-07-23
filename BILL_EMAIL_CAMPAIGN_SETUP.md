# Bill Email Campaign Setup

The campaign must run as `williamosessionallpro@gmail.com`. Do not share Bill's password with Codex, OpenClaw, or another person.

## Current Account Policy

- Keep `williamosessionallpro@gmail.com` as Bill's working Google Business Profile account and customer-outreach sender.
- Send each approved customer message from Bill's Gmail to one recipient at a time.
- BCC `tonybeal40@gmail.com` on every customer-outreach message so Tony receives a private copy.
- Keep replies directed to Bill's Gmail. A BCC copies the original message only; it does not automatically forward later customer replies.
- Keep Tony's Gmail as an additional Google Business Profile owner when Google permits it.
- Add `billsessions@allprometroeastconstruction.com` later as an additional profile owner only after that mailbox can receive mail and is registered as a Google Account.
- Do not switch customer outreach to the company-domain address until mailbox access and sender authentication are proven.

## Connect Bill

1. Sign into Google as `williamosessionallpro@gmail.com` in a separate browser profile.
2. Give that account editor access to the `All-Pro Leads` spreadsheet and its bound Apps Script project.
3. Open the Apps Script editor as Bill and paste the current `allpro-form-handler.gs` file.
4. Deploy a new version of the existing web app without changing the public URL.
5. In Script Properties, set:
   - `MARKETING_POSTAL_ADDRESS` = `1115 Priscilla Ct, New Athens, IL 62264`
   - `MARKETING_MIN_DAYS_BETWEEN` = `28`
   - `MARKETING_DAILY_LIMIT` = `6`
   - `MARKETING_MIN_MINUTES_BETWEEN_SENDS` = `90`
   - `MARKETING_SEND_ENABLED` = `false`
   - `MARKETING_BILL_APPROVED` = `false`
   - `MARKETING_CAMPAIGN_ID` = a unique monthly value such as `allpro-check-in-2026-08`
6. While still signed in as Bill, run `setupMarketingCampaignSystem()` and approve the permissions.
7. Run `sendSeasonalCampaignTest()`. Confirm Tony receives a message whose real From address is Bill's Gmail.
8. Run `previewSeasonalCampaign()` and confirm the eligible count contains only explicit opt-ins.
9. Ask Bill to reply `APPROVED` to the internal campaign-approval message. Preserve the reply in Gmail under `All-Pro Outreach/Approvals`.
10. After that reply is received, set `MARKETING_BILL_APPROVED` to `true`.
11. Set `MARKETING_SEND_ENABLED` to `true` only after the sender, consent, address, unsubscribe link, and message have been reviewed.
12. Run `sendSeasonalCampaignBatch()` once for each approved recipient. Despite the legacy function name, the code sends exactly one person per execution.

## Monthly Operation

- Use a new `MARKETING_CAMPAIGN_ID` for genuinely new monthly content.
- The code still blocks anyone contacted fewer than 28 days ago.
- Up to six individually reviewed messages may be sent in one day, with at least 90 minutes between sends.
- Each execution sends one person. Review the next person before running it again.
- Review the person's name and actual service interest before each execution.
- Keep the recurring message focused on current All-Pro scheduling availability. Do not describe a prior inquiry or imply that All-Pro completed work for the recipient.
- Set `MARKETING_BILL_APPROVED` back to `false` whenever the campaign message or operating policy changes materially, then obtain a new approval from Bill.
- Tony receives a BCC at `tonybeal40@gmail.com`.
- Process `REMOVE`, unsubscribe requests, negative responses, and bounces before the next send.
- Do not place the website-review link in this recurring availability message. Use a separate review request only for customers for whom All-Pro completed work.

## Business Mailbox Later

The repository currently references `billsessions@allprometroeastconstruction.com`, but it is not the approved sender until the exact address, mailbox access, SPF, DKIM, DMARC, and Gmail/Workspace connection are confirmed. Update the sender configuration only after that verification.
