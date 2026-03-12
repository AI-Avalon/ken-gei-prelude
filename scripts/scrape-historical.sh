#!/bin/bash
# Trigger historical scraping of all university events (2022-2026)
# This calls the deployed scrape endpoint with allPages=true

SITE_URL="https://ken-gei-prelude.pages.dev"
CRON_SECRET="025ae89cdad4abcefb36462bfac4eac50feea30542582fd4ceaef9e1c36d26b7"

echo "🎵 Crescendo — Historical Event Scraper"
echo "========================================="
echo "Scraping all university events from 2022 onwards..."
echo ""

response=$(curl -s -X POST "${SITE_URL}/api/cron/scrape?allPages=true" \
  -H "X-Cron-Secret: ${CRON_SECRET}" \
  -H "Content-Type: application/json")

echo "Response:"
echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
echo ""
echo "Done!"
