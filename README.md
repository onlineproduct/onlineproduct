# Cloudfloor Store — Worker v2.1 (Current Wrangler JSONC)

এই প্যাকেজ Cloudflare Wrangler-এর বর্তমান `wrangler.jsonc` configuration format অনুযায়ী তৈরি। পুরনো `wrangler.toml` রাখা হয়নি।

## লক্ষ্য
একবার Worker deploy করার পর D1-এ অসংখ্য landing page রাখা যাবে। প্রতিটি page-এর আলাদা slug/live URL থাকবে; page data update করতে Worker redeploy লাগবে না।

## Deploy
1. Cloudflare account-এ login করুন।
2. Wrangler দিয়ে project folder থেকে `wrangler deploy` চালান।
3. `d1_databases`-এ `DB` binding এবং `cloudfloor_pages` database name দেওয়া আছে। Wrangler-এর supported automatic provisioning ব্যবহার করা হলে প্রথম deploy-এ resource তৈরি হতে পারে।
4. Migration apply করুন যদি প্রয়োজন হয়: `npx wrangler d1 migrations apply cloudfloor_pages --remote`

## API
- POST /api/pages — নতুন page তৈরি; response-এ live URL
- GET /api/pages — page list
- GET /api/page/:id-or-slug — page data
- PUT /api/pages/:id-or-slug — page update; redeploy নয়
- DELETE /api/pages/:id-or-slug — page delete
- GET /p/:slug — public live page

## UI behavior
- Mobile left edge swipe: Sections panel
- Mobile right edge swipe: Style panel
- Empty/scrim tap: panels close
- Desktop: panels visible

## Important
এই project-এ D1 binding প্রয়োজন। Cloudflare Dashboard-এর সাধারণ static drag-and-drop uploader build/configured Worker project-এর পূর্ণ deployment support নাও দিতে পারে; Wrangler deployment is the reliable method for this project.
