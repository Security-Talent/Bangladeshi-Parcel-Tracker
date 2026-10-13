"use strict";

const { request } = require("./http");
const { requireText, validateOptions } = require("./validation");

/** Fetch the provider-specific Rokomari tracking page with tracking number and phone. */
async function rokomari(trackingNumber, phone, options = {}) {
  requireText(trackingNumber, "trackingNumber");
  requireText(phone, "phone");
  validateOptions(options);
  const url = new URL("https://www.rokomari.com/ordertrack");
  url.searchParams.set("orderId", trackingNumber);
  url.searchParams.set("countryISOCode", "BD");
  url.searchParams.set("phn", phone);
  return request({
    courier: "Rokomari",
    url: url.toString(),
    headers: { Accept: "text/html" },
    options
  });
}

module.exports = rokomari;
