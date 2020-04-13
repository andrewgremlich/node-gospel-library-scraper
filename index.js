import fs from "fs";
import { promisify } from "util";

import fetch from "node-fetch";
import cheerio from "cheerio";
import prettier from "prettier";
import mkdirp from "mkdirp";

const CHURCH_URL = "https://www.churchofjesuschrist.org";
const GOSPEL_LIBRARY_URL = `/study/scriptures?lang=eng`;

const writeFile = promisify(fs.writeFile);

// Load the section or HTML of the requested page.
const loadSection = async (url) => {
  const sectionData = await fetch(`${CHURCH_URL}${url}`);
  const parsedTextData = sectionData.text();
  return parsedTextData;
};

const makeFrontMatter = (names, ...params) => {
  const toBeStringFrontMatter = names
    .filter((name) => name)
    .map((name, index) => `${name}${params[index]}`)
    .join("\n");

  return `---
${toBeStringFrontMatter}
---

`;
};

// parse the content of the chapter page and then add it to
// a markdown file.
const getPage = (
  url,
  { title, href, orderNumber, sectionOrderNumber }
) => async () => {
  const section = await loadSection(url);
  const $ = cheerio.load(section);

  $(".marker").remove();
  $(".mediaPointer-Jmh4d").remove();

  const text = $(".renderFrame-1yHgQ .body-block").text();

  const dominant = $(".dominant").text();
  const isRightFolder = href.split(/\//g);

  if (sectionOrderNumber && isRightFolder.length === 6 && dominant) {
    const indexOfBookFrontMatter = makeFrontMatter`title: ${dominant}date: ${new Date()}order: ${sectionOrderNumber}`;
    const indexFile = `${indexOfBookFrontMatter}## ${dominant}`;

    const dirToWrite = [...isRightFolder];
    dirToWrite.splice(5, 1, "");
    const joinToHref = "." + dirToWrite.join("/");

    await mkdirp(joinToHref);
    await writeFile(joinToHref + "_index.md", indexFile);
  }

  if (text) {
    const chapterSummary = $("#study_summary1").text();
    const frontMatter = makeFrontMatter`title: ${title}date: ${new Date()}description: ${chapterSummary}order: ${
      sectionOrderNumber || orderNumber
    }`;
    const prettyMD = prettier.format(text, { parser: "markdown" });
    const file = frontMatter + prettyMD.replace(/[:\.;!?\),](?=\d)/g, ".\n\n");

    const splitFilePath = ("." + href).split("/");

    const chapterName = splitFilePath.pop();
    const joinedFilePath = splitFilePath.join("/");

    // for debugging purposes.
    // console.log("Writing page", title);

    await mkdirp(joinedFilePath);
    await writeFile(`${joinedFilePath}/${chapterName}.md`, file);
  }

  //NEEDED for promise chain to work.
  return;
};

// Go through the list of chapters with the list that is open.
const parseThroughList = ($, listWithBook, PromiseChain) => {
  listWithBook.each((index, element) => {
    const pageTitle = $(element).text();
    const hrefForPage = $(element).attr("href");
    const [noQueryParams] = hrefForPage.split("?");
    const orderNumber = index + 1;

    PromiseChain = PromiseChain.then(
      getPage(hrefForPage, {
        title: pageTitle,
        href: noQueryParams,
        orderNumber,
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
      const [noQueryParams] = hrefForPage.split("?");
      const orderNumber = index + 1;

      PromiseChain = PromiseChain.then(
        getPage(hrefForPage, {
          title: pageTitle,
          href: noQueryParams,
          orderNumber,
          sectionOrderNumber,
        })
      );

      //WILL overwrite all 1.md files from previous getPage call.
      if (listWithBook.length > 0) {
        parseThroughList($, listWithBook, PromiseChain);
      }
    }
  });
};

// Navigate the book of scripture manifest for all the books.
const navigateManifest = async (url) => {
  const section = await loadSection(url);
  const $ = cheerio.load(section);

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

const navigateThroughTiles = async (url) => {
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
};

navigateThroughTiles(GOSPEL_LIBRARY_URL);
