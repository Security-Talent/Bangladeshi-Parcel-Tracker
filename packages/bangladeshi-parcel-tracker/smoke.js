const tracker = require("./index");

async function smoke() {
  const courier = process.env.COURIER;
  const trackingNumber = process.env.TRACKING_NUMBER;
  const phone = process.env.PHONE;

  if (!courier || !trackingNumber || !Object.prototype.hasOwnProperty.call(tracker, courier)) {
    throw new Error("Set COURIER, TRACKING_NUMBER, and (for Pathao/Rokomari) PHONE to run a live smoke request.");
  }
  if (["pathao", "rokomari"].includes(courier) && !phone) {
    throw new Error("PHONE is required for Pathao and Rokomari.");
  }

  const result = ["pathao", "rokomari"].includes(courier)
    ? await tracker[courier](trackingNumber, phone)
    : await tracker[courier](trackingNumber);

  console.log(`${courier} tracking request completed successfully.`);
}

smoke().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
