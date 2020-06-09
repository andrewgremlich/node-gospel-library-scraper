import fs from "fs";
import { promisify } from "util";

import fetch from "node-fetch";
import mkdirp from "mkdirp";

const CHURCH_URL = "https://www.churchofjesuschrist.org";

export const writeFile = promisify(fs.writeFile);

export const statFile = promisify(fs.stat);

export const noQueryParams = url => url.split("?")[0];

// Load the section or HTML of the requested page.
export const loadSection = async url => {
  const sectionData = await fetch(`${CHURCH_URL}${url}`);
  const parsedTextData = sectionData.text();
  return parsedTextData;
};

export const makeFrontMatter = (names, ...params) => {
  const toBeStringFrontMatter = names
    .filter(name => name)
    .map((name, index) => `${name}${params[index]}`)
    .join("\n");

  return `---
${toBeStringFrontMatter}
---
  
`;
};

export const beginIndexFileStructure = async url => {
  const noQuery = noQueryParams(url);
  const urlPath = noQuery.split("/");

  let constructPath = ".";

  for (let pathPortion of urlPath) {
    if (pathPortion) {
      constructPath = constructPath + "/" + pathPortion;

      const frontMatterForIndex = makeFrontMatter`title: ${pathPortion}description: Index file for ${pathPortion}`;
      const fileContent = `# index
  Index file for path for path ${constructPath}
  `;

      await mkdirp(constructPath);
      await writeFile(
        `${constructPath}/_index.md`,
        frontMatterForIndex + fileContent
      );
    }
  }
};