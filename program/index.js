import cheerio from "cheerio";

import { navigateToPage } from "./page.js";
import { loadSection, beginIndexFileStructure } from "./utils.js";

const GOSPEL_LIBRARY_URL = `/study/scriptures`;

// Navigate the book of scripture manifest for all the books.
const navigateManifest = async (url) => {
  const section = await loadSection(url);
  const $ = cheerio.load(section);

  await beginIndexFileStructure(url);

  // Start the promise chain to attach promises to.
  let PromiseChain = Promise.resolve();

  $(".manifest a").each((index, element) => {
    const hrefValue = $(element).attr("href");
    const sectionOrderNumber = index + 1;

    if (hrefValue) {
      navigateToPage(hrefValue, PromiseChain, sectionOrderNumber);
    }
  });
};

const navigateThroughTiles = (async (url) => {
  const section = await loadSection(url);
  const $ = cheerio.load(section);

  $(".tile-3KqhL").each((index, element) => {
    const hrefValue = $(element).attr("href");

    // This index number pertains to whatever book of scripture found
    // in GOSPEL_LIBRARY_URL
    /**
     * 0 = OT
     * 1 = NT
     * 2 = BOM
     * 3 = D&C
     * 4 = PGP
     */
    if (index === 0 && hrefValue) {
      navigateManifest(hrefValue);
    }
  });
})(GOSPEL_LIBRARY_URL);
