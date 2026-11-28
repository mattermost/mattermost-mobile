// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Prints a server's listing user password, derived as detox/provision/listing-user.ts derives it. The secret comes
// through the environment, never argv, so it stays out of the process list.
import {createHmac} from "node:crypto";

const key = process.env.LISTING_KEY;
const site = process.env.LISTING_SITE;
if (!key || !site) {
  console.error("LISTING_KEY and LISTING_SITE are required");
  process.exit(1);
}

const digest = createHmac("sha256", key).update(`mobile-e2e-listing-user:${site}`).digest("base64url");
process.stdout.write(`${digest.slice(0, 32)}Aa1!`);
