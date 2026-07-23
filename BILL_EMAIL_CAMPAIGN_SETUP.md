# Bill Email Campaign Setup

The campaign must run as `williamosessionallpro@gmail.com`. Do not share Bill's password with Codex, OpenClaw, or another person.

## Connect Bill

1. Sign into Google as `williamosessionallpro@gmail.com` in a separate browser profile.
2. Give that account editor access to the `All-Pro Leads` spreadsheet and its bound Apps Script project.
3. Open the Apps Script editor as Bill and paste the current `allpro-form-handler.gs` file.
4. Deploy a new version of the existing web app without changing the public URL.
5. In Script Properties, set:
   - `MARKETING_POSTAL_ADDRESS` = `1115 Priscilla Ct, New Athens, IL 62264`
   - `MARKETING_MIN_DAYS_BETWEEN` = `28`
   - `MARKETING_SEND_ENABLED` = `false`
   - `MARKETING_CAMPAIGN_ID` = a unique monthly value such as `allpro-check-in-2026-08`
6. While still signed in as Bill, run `setupMarketingCampaignSystem()` and approve the permissions.
7. Run `sendSeasonalCampaignTest()`. Confirm Tony receives a message whose real From address is Bill's Gmail.
8. Run `previewSeasonalCampaign()` and confirm the eligible count contains only explicit opt-ins.
9. Set `MARKETING_SEND_ENABLED` to `true` only after the sender, consent, address, unsubscribe link, and message have been reviewed.
10. Run `sendSeasonalCampaignBatch()` once for each approved recipient. Despite the legacy function name, the code sends exactly one person per execution.

## Monthly Operation

- Use a new `MARKETING_CAMPAIGN_ID` for genuinely new monthly content.
- The code still blocks anyone contacted fewer than 28 days ago.
- Review the person's name and actual service interest before each execution.
- Tony receives a BCC at `tonybeal40@gmail.com`.
- Process `REMOVE`, unsubscribe requests, negative responses, and bounces before the next send.
- The website review link is conditional and should only be used by customers for whom All-Pro completed work.

## Business Mailbox Later

The repository currently references `billsessions@allprometroeastconstruction.com`, but it is not the approved sender until the exact address, mailbox access, SPF, DKIM, DMARC, and Gmail/Workspace connection are confirmed. Update the sender configuration only after that verification.
