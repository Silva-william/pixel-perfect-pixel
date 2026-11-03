/** Reserve the tab during the tap, before fetching a private original's URL. */
export async function openOriginalInBrowser(resolveUrl: () => Promise<string>): Promise<void> {
  const tab = window.open("about:blank", "_blank");
  if (tab) tab.opener = null;

  try {
    const url = await resolveUrl();
    if (tab && !tab.closed) {
      tab.location.replace(url);
    } else {
      // Embedded/mobile browsers may block new tabs entirely.
      window.location.assign(url);
    }
  } catch (error) {
    tab?.close();
    throw error;
  }
}