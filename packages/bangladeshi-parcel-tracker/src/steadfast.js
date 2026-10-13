"use strict";

const { request } = require("./http");
const { requireText, validateOptions } = require("./validation");

/** Fetch provider-specific Steadfast tracking data for a tracking number. */
async function steadfast(trackingNumber, options = {}) {
  requireText(trackingNumber, "trackingNumber");
  validateOptions(options);
  return request({
    courier: "Steadfast",
    url: `https://steadfast.com.bd/track/consignment/${encodeURIComponent(trackingNumber)}`,
    headers: { Accept: "application/json" },
    options
  });
}

module.exports = steadfast;
