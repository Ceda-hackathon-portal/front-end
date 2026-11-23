export function fetchFailure(cause) {
  const cancelled = cause?.name === "AbortError";
  return {
    status: 0,
    code: cancelled ? "REQUEST_ABORTED" : "API_UNAVAILABLE",
    message: cancelled ? "The request was cancelled." : "Cannot reach CEDA. Check your connection and try again. If the problem continues, contact support.",
    cause,
  };
}
