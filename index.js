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
}
    
// parse the content of the chapter page and then add it to
// a markdown file.
const getPage = (url, { title, href, orderNumber }) => async () => {
  const section = await loadSection(url);
  const $ = cheerio.load(section);

  $(".marker").remove();
  $(".mediaPointer-Jmh4d").remove();

  const text = $(".renderFrame-1yHgQ .body-block").text();

  const chapterSummary = $("#study_summary1").text();
  const frontMatter = `---
title: ${title}
date: ${new Date()}
draft: false
description: "${chapterSummary}"

order: ${orderNumber}
---

`;

  if (text) {
    const prettyMD = prettier.format(text, { parser: "markdown" });
    const file = frontMatter + prettyMD.replace(/[:\.;!?\),](?=\d)/g, ".\n\n");

    const splitFilePath = ("." + href).split("/");

    const chapterName = splitFilePath.pop();
    const joinedFilePath = splitFilePath.join("/");

    // for debugging purposes.
    console.log("Writing page", title);
    return;

    // await mkdirp(joinedFilePath);
    // await writeFile(`${joinedFilePath}/${chapterName}.md`, file);
    // return;
  }
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
const navigateToPage = async (url, PromiseChain) => {
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

      if (listWithBook.length > 0) {
        parseThroughList($, listWithBook, PromiseChain);
      } else {
        PromiseChain = PromiseChain.then(
          getPage(hrefForPage, {
            title: pageTitle,
            href: noQueryParams,
            orderNumber,
          })
        );
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

    if (hrefValue) {
      navigateToPage(hrefValue, PromiseChain);
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
    if (index === 2 && hrefValue) {
      navigateManifest(hrefValue);
    }
  });
};

navigateThroughTiles(GOSPEL_LIBRARY_URL);
