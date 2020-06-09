import cheerio from "cheerio";

import { getPage } from "./get-page.js";
import { loadSection, noQueryParams } from "./utils.js";

// Go through the list of chapters with the list that is open.
const parseThroughList = ($, listWithBook, PromiseChain) => {
  listWithBook.each((index, element) => {
    const pageTitle = $(element).text();
    const hrefForPage = $(element).attr("href");

    const straightURL = noQueryParams(hrefForPage);
    const orderNumber = index + 1;

    PromiseChain = PromiseChain.then(
      getPage(hrefForPage, {
        title: pageTitle,
        href: straightURL,
        orderNumber
      })
    );
  });
};

// Go to the chapter URL
const navigateToPage = async (url, PromiseChain, sectionOrderNumber) => {
  const section = await loadSection(url);

  const $ = cheerio.load(section);
  const activeLink = $("a.active-mDRbE");
  const listWithBook = $("ul.active-mDRbE a.item-3cCP7");

  activeLink.each((index, element) => {
    const hrefForPage = $(element).attr("href");
    const pageTitle = $(element).text();

    if (hrefForPage) {
      const straightURL = noQueryParams(hrefForPage);
      const orderNumber = index + 1;

      PromiseChain = PromiseChain.then(
        getPage(hrefForPage, {
          title: pageTitle,
          href: straightURL,
          orderNumber,
          sectionOrderNumber
        })
      );

      //WILL overwrite all 1.md files from previous getPage call.
      if (listWithBook.length > 0) {
        parseThroughList($, listWithBook, PromiseChain);
      }
    }
  });
};

export { navigateToPage };
