import prettier from "prettier";
import cheerio from "cheerio";
import mkdirp from "mkdirp";

import {
  loadSection,
  makeFrontMatter,
  writeFile,
  noQueryParams
} from "./utils.js";

const writeIndedMDFile = async (
  dominant,
  isRightFolder,
  sectionOrderNumber
) => {
  if (sectionOrderNumber && isRightFolder.length === 6 && dominant) {
    const indexOfBookFrontMatter = makeFrontMatter`title: ${dominant}date: ${new Date()}order: ${sectionOrderNumber}`;
    const indexFile = `${indexOfBookFrontMatter}## ${dominant}`;

    const dirToWrite = [...isRightFolder];
    dirToWrite.splice(5, 1, "");
    const joinToHref = "." + dirToWrite.join("/");

    await mkdirp(joinToHref);
    await writeFile(joinToHref + "_index.md", indexFile);
  }

  return;
};

const writeSectionOfBook = async (
  text,
  chapterSummary,
  title,
  href,
  orderNumber,
  sectionOrderNumber
) => {
  if (text) {
    const frontMatter = makeFrontMatter`title: ${title}date: ${new Date()}description: ${chapterSummary}order: ${
      sectionOrderNumber || orderNumber
    }`;
    const prettyHTML = prettier.format(text, { parser: "html" });
    const file = frontMatter + prettyHTML;

    const splitFilePath = ("." + href).split("/");

    const chapterName = splitFilePath.pop();
    const joinedFilePath = splitFilePath.join("/");

    await mkdirp(joinedFilePath);
    await writeFile(`${joinedFilePath}/${chapterName}.md`, file);
  }

  return;
};

// parse the content of the chapter page and then add it to
// a markdown file.
const getPage = (
  url,
  { title, href, orderNumber, sectionOrderNumber }
) => async () => {
  const section = await loadSection(url);
  const $ = cheerio.load(section);

  const dominant = $(".dominant").text();

  $(".marker").remove();
  $(".mediaPointer-Jmh4d").remove();
  $("a").removeAttr("href").removeAttr("class");
  $("p").removeAttr("data-aid").removeAttr("id").removeAttr("class");
  $("span").removeAttr("class").removeAttr("data-page");

  $("p").each(function (index, paragraph) {
    $(this).html($(this).text());
  })

  const text = $(".renderFrame-1yHgQ .body-block").html();
  const isRightFolder = href.split(/\//g);

  const chapterSummary = $("#study_summary1").text();

  await writeIndedMDFile(dominant, isRightFolder, sectionOrderNumber);
  await writeSectionOfBook(
    text,
    chapterSummary,
    title,
    href,
    orderNumber,
    sectionOrderNumber
  );

  //NEEDED for promise chain to work.
  return;
};

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
