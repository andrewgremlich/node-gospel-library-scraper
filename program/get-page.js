import mkdirp from "mkdirp";
import cheerio from "cheerio";
import prettier from "prettier";

import { loadSection, makeFrontMatter, writeFile, statFile } from "./utils.js";

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
  const frontMatter = makeFrontMatter`title: ${title}date: ${new Date()}description: ${chapterSummary}order: ${
    sectionOrderNumber || orderNumber
  }`;
  const prettyHTML = prettier.format(text, { parser: "html" });
  const fileData = frontMatter + prettyHTML;

  const splitFilePath = ("." + href).split("/");

  const chapterName = splitFilePath.pop();
  const joinedFilePath = splitFilePath.join("/");

  const newFileName = `${joinedFilePath}/${chapterName}.md`;

  try {
    const stats = await statFile(newFileName);
    console.log("already written", newFileName);
  } catch (e) {
    if (process.env.DEBUG === true) {
      console.error(e);
    }

    console.log("Writing", newFileName);
    await mkdirp(joinedFilePath);
    await writeFile(newFileName, fileData);
  }

  return;
};

// parse the content of the chapter page and then add it to
// a markdown file.
export const getPage = (
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
  });

  const text = $(".renderFrame-1yHgQ .body-block").html();
  const isRightFolder = href.split(/\//g);

  const chapterSummary = $("#study_summary1").text();

  await writeIndedMDFile(dominant, isRightFolder, sectionOrderNumber);

  if (text) {
    await writeSectionOfBook(
      text,
      chapterSummary,
      title,
      href,
      orderNumber,
      sectionOrderNumber
    );
  }

  //NEEDED for promise chain to work.
  return;
};
