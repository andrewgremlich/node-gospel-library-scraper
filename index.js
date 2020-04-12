import fs from "fs";
import { promisify } from "util";

import fetch from "node-fetch";
import cheerio from "cheerio";
import prettier from "prettier";
import mkdirp from "mkdirp";

const CHURCH_URL = "https://www.churchofjesuschrist.org";
const GOSPEL_LIBRARY_URL = `/study/scriptures?lang=eng`;

const writeFile = promisify(fs.writeFile);

const loadSection = (url) =>
  new Promise((resolve, reject) => {
    fetch(`${CHURCH_URL}${url}`)
      .then((data) => data.text())
      .then((section) => {
        resolve(section);
      })
      .catch((err) => reject(err));
  });

const getPage = (url, { title, href, orderNumber }) => () =>
  new Promise((resolve, reject) => {
    loadSection(url).then((section) => {
      const $ = cheerio.load(section);
      $(".marker").remove();
      $(".mediaPointer-Jmh4d").remove();

      const chapterSummary = $("#study_summary1").text();
      const frontMatter = `---
title: ${title}
date: ${new Date()}
draft: false
description: "${chapterSummary}"

order: ${orderNumber}
---
    
`;

      if ($(".renderFrame-1yHgQ .body-block").text()) {
        const text = $(".renderFrame-1yHgQ .body-block").text();
        const prettyMD = prettier.format(text, { parser: "markdown" });

        const splitNumbers = prettyMD.replace(/[:\.;!?\),](?=\d)/g, ".\n\n");

        const dir = "." + href;

        const splitFilePath = dir.split("/");
        const chapterName = splitFilePath.pop();
        const joinedFilePath = splitFilePath.join("/");

        const file = frontMatter + splitNumbers;

        console.log("Writing page", title);

        mkdirp(joinedFilePath).then(() => {
          writeFile(`${joinedFilePath}/${chapterName}.md`, file).then(() => {
            resolve();
          });
        });
      }
    });
  });

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

const navigateToPage = (url, PromiseChain) =>
  loadSection(url)
    .then((section) => {
      const $ = cheerio.load(section);
      const activeLink = $("a.active-mDRbE");
      const listWithBook = $("ul.active-mDRbE a.item-3cCP7");

      activeLink.each((index, element) => {
        if ($(element).attr("href")) {
          const pageTitle = $(element).text();
          const hrefForPage = $(element).attr("href");
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
    })
    .catch((err) => console.error(err));

const navigateManifest = (url) =>
  loadSection(url)
    .then((section) => {
      const $ = cheerio.load(section);

      let PromiseChain = Promise.resolve(3);

      $(".manifest a").each((index, element) => {
        if ($(element).attr("href")) {
          const hrefForPage = $(element).attr("href");

          navigateToPage(hrefForPage, PromiseChain);
        }
      });
    })
    .catch((err) => console.error(err));

const navigateThroughTiles = (url) =>
  loadSection(url)
    .then((section) => {
      const $ = cheerio.load(section);

      $(".tile-3KqhL").each((index, element) => {
        if (index === 0 && $(element).attr("href")) {
          navigateManifest($(element).attr("href"));
        }
      });
    })
    .catch((err) => console.error(err));

navigateThroughTiles(GOSPEL_LIBRARY_URL);
