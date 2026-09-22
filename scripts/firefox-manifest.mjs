// Firefox MV3 differs from Chrome in three places, and only these:
// - background: an event page listing its scripts, not a service worker. The
//   worker's importScripts('lib/languages.js') becomes the first entry.
// - gecko id, which AMO requires and which must never change once published.
// - data_collection_permissions, required of new add-ons since Nov 2025. The
//   word and the paragraph around it go to Google: that is "websiteContent",
//   and Firefox shows it on the install prompt. Declaring it needs Firefox 140,
//   which is also past 127, where MV3 host permissions began to be granted at
//   install rather than left for the reader to find.
export function firefoxManifest(m) {
    const ff = structuredClone(m);
    const sw = ff.background?.service_worker;
    if (sw) ff.background = { scripts: ['lib/languages.js', sw] };
    ff.browser_specific_settings = {
        gecko: {
            id: 'contextreader@contextreader.github.io',
            strict_min_version: '140.0',
            data_collection_permissions: { required: ['websiteContent'] },
        },
    };
    return ff;
}
