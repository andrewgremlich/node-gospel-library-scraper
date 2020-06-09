import cheerio from "cheerio";
import commander from "commander";

import { navigateToPage } from "./page.js";
import { loadSection, beginIndexFileStructure } from "./utils.js";
import { parseBook, libraryUrl } from "./command-line-parsers.js";

const { program } = commander;

program.version("0.2.0");

program
  .option("-d, --debug", "Debug the web scraper application")
  .option("-b, --book <acronym>", "Book of Scripture the parse.", parseBook)
  .option("-l, --library-url <url>", "Library URL to parse from.", libraryUrl);

program.parse(process.argv);

if (program.debug) {
  process.env.DEBUG = true;
}

// Navigate the book of scripture manifest for all the books.
const navigateManifest = async url => {
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

(async () => {
  const section = await loadSection(program.libraryUrl);
  const $ = cheerio.load(section);

  $(".tile-3KqhL").each((index, element) => {
    const hrefValue = $(element).attr("href");

    if (index === program.book && hrefValue) {
      navigateManifest(hrefValue);
    }
  });
})();
