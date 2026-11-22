export function fetchFailure(cause) {
  const cancelled = cause?.name === "AbortError";
  return {
    status: 0,
    code: cancelled ? "REQUEST_ABORTED" : "API_UNAVAILABLE",
    message: cancelled ? "The request was cancelled." : "Cannot reach the CEDA API. Check that the local backend is running on localhost:3001.",
    cause,
  };
}
