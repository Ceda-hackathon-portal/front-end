export async function saveDraftWithFeedback(draft, save) {
  try {
    const result = await save(draft);
    if (result === true) return { ok: true, draft };
    return {
      ok: false,
      draft,
      conflict: Boolean(result?.conflict),
      message: result?.message || "The draft could not be saved. Your edits remain open.",
    };
  } catch (error) {
    return {
      ok: false,
      draft,
      conflict: error?.status === 409,
      message: error?.status === 409
        ? "Revision conflict: the server has a newer application version. Your edits remain open; reload the latest draft before retrying."
        : error?.message || "The draft could not be saved. Your edits remain open.",
    };
  }
}
