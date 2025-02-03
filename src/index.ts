import * as cheerio from "cheerio";
import consola from "consola";
import fs from "fs";
import yoctoSpinner from "yocto-spinner";

import { getHTML } from "#lib/get-html";
import { wait } from "#lib/wait";

(async function () {
  const spinner = yoctoSpinner({
    text: "Scraping schema.org types...",
  }).start();
  const types = await scrapeSchemaOrgTypes();

  let schemaOrgs: SchemaOrg[] = [];

  for (const type of types) {
    try {
      spinner.text = `(${schemaOrgs.length}) Scraping schema.org properties for ${type}...`;
      const properties = await scrapeSchemaOrgProperties({ type });
      schemaOrgs.push({ type, properties });
    } catch (error) {
      consola.error(error);
    } finally {
      await wait(50);
    }
  }

  const writeStream = fs.createWriteStream("schema-org.json");

  writeStream.on("error", (error) => {
    consola.error(error);
  });
  writeStream.on("finish", () => {
    spinner.success("Finished scraping schema.org types");
  });

  writeStream.write(JSON.stringify(schemaOrgs, null, 2));
  writeStream.end();

  if (types.length !== schemaOrgs.length) {
    consola.error(
      `Expected ${types.length} schema.org types but got ${schemaOrgs.length}`
    );
  }
})();

type SchemaOrgType = string;
type SchemaOrgProperty = string;

type SchemaOrg = {
  type: SchemaOrgType;
  properties: SchemaOrgProperty[];
};

async function scrapeSchemaOrgTypes(): Promise<SchemaOrgType[]> {
  const htmlContent = await getHTML({
    url: "https://schema.org/docs/full.html",
  });
  const $ = cheerio.load(htmlContent);

  const { types } = $.extract({
    types: [
      {
        selector: "a.core",
        value: (el) => $(el).text().trim(),
      },
    ],
  });

  return types;
}

async function scrapeSchemaOrgProperties({
  type,
}: {
  type: SchemaOrgType;
}): Promise<SchemaOrgProperty[]> {
  const htmlContent = await getHTML({
    url: `https://schema.org/${type}`,
  });

  const $ = cheerio.load(htmlContent);
  const { properties } = $.extract({
    properties: [
      {
        selector: ".prop-nam .core",
        value: (el) => $(el).text().trim(),
      },
    ],
  });

  return properties;
}
