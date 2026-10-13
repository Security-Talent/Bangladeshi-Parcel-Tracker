"use strict";

const { request } = require("./http");
const { requireText, validateOptions } = require("./validation");

/** Fetch provider-specific Sundarban tracking data for a tracking number. */
async function sundarban(trackingNumber, options = {}) {
  requireText(trackingNumber, "trackingNumber");
  validateOptions(options);
  return request({
    courier: "Sundarban",
    url: "https://tracking.sundarbancourierltd.com/Home/getDatabyCN",
    method: "POST",
    body: { selectedtypes: "cnno", selectedtimes: "7", inputvalue: trackingNumber },
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    options,
    canRetry: false
  });
}

module.exports = sundarban;
