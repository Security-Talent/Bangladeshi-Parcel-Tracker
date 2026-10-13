import tracker, { track, type TrackResult } from "../index";

const normalized: Promise<TrackResult> = track({ courier: "redx", trackingNumber: "EXAMPLE" });
const listed: string[] = tracker.getSupportedCouriers();
void normalized;
void listed;
