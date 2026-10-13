"use strict";

const { request } = require("./http");
const { requireText, validateOptions } = require("./validation");

/** Fetch provider-specific RedX tracking data for a tracking number. */
async function redx(trackingNumber, options = {}) {
  requireText(trackingNumber, "trackingNumber");
  validateOptions(options);
  return request({
    courier: "RedX",
    url: `https://api.redx.com.bd/v1/logistics/global-tracking/${encodeURIComponent(trackingNumber)}`,
    headers: { Accept: "application/json" },
    options
  });
}

module.exports = redx;
