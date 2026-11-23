export const GOOGLE_RETURN_KEY = "ceda:return-after-google";

export function googleAuthorizationUrl(value) {
  const url = new URL(value);
  if (url.origin !== "https://accounts.google.com" || url.username || url.password || url.hash) {
    throw new Error("Google sign-in returned an invalid destination.");
  }
  return url.href;
}

export function readGoogleReturn(storage) {
  try {
    const value = JSON.parse(storage.getItem(GOOGLE_RETURN_KEY));
    return {
      target: typeof value?.target === "string" && value.target.length <= 1024 ? value.target : null,
      staff: value?.staff === true,
    };
  } catch { return { target: null, staff: false }; }
}

export function googleFailureMessage(reason) {
  return {
    cancelled: "Google sign-in was cancelled. You can try again.",
    "link-required": "This email already has a CEDA account. Sign in with your usual method, then choose Connect Google in your profile or staff account menu.",
    "email-mismatch": "Choose the Google account with the same email address as your CEDA account.",
  }[reason] || "Google sign-in could not be verified. Please try again.";
}
