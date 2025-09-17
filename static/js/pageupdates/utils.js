console.log("----utils.js");
export function findUuidInURL() {
    // console.log("----finding UUID in URL:");
    const currentUrl = window.location.href;
    const regex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gm;
    const str = window.location.href;

    let m;
    let result = [];
    while ((m = regex.exec(str)) !== null) {
        // This is necessary to avoid infinite loops with zero-width matches
        if (m.index === regex.lastIndex) {
            regex.lastIndex++;
        }

        // The result can be accessed through the `m`-variable.
        // however, sometimes there can be a second UUID in the URL, from the query string
        // we only ever want the first, because that's the ID of the element we're editing
        // so we're pushing all results into an array and making sure we're always returning the first match
        m.forEach((match, groupIndex) => {
            // console.log(`Found match, group ${groupIndex}: ${match}`);
            result.push(match);
        });
    }
    return result[0];
}