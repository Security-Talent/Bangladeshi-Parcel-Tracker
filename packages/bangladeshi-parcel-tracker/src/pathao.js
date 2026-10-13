"use strict";

const { request } = require("./http");
const { requireText, validateOptions } = require("./validation");

/** Fetch provider-specific Pathao tracking data using the required phone number. */
async function pathao(trackingNumber, phone, options = {}) {
  requireText(trackingNumber, "trackingNumber");
  requireText(phone, "phone");
  validateOptions(options);
  return request({
    courier: "Pathao",
    url: "https://merchant.pathao.com/api/v1/user/tracking",
    method: "POST",
    body: { consignment_id: trackingNumber, phone_no: phone },
    headers: {
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json",
      Origin: "https://merchant.pathao.com"
    },
    options,
    canRetry: false
  });
}

module.exports = pathao;
