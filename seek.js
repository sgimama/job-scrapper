const puppeteer = require("puppeteer");
const ObjectsToCsv = require("objects-to-csv");
const { convert } = require("html-to-text");

//Scrapper job seek New Zealand
(async () => {
  const jobSearch = "react";
  const salaryRange = "100000-200000";
  const numberOfPages = 3;
  const withDescription = false;

  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  const jobsArray = [];
  for (let i = 1; i <= numberOfPages; i++) {
    await page.goto(
      `https://www.seek.co.nz/${jobSearch}-jobs/in-All-Auckland?salaryrange=${salaryRange}&salarytype=annual&page=${i}`
    );
    await page.waitForSelector("[data-search-sol-meta]");

    let elements;
    const jobs = await page.evaluate(() => {
      let jobsObject = [];
      elements = document.querySelectorAll("[data-search-sol-meta] article");
      elements.forEach((element) => {
        const links = element.querySelectorAll("a");
        const company = element.querySelector('[data-automation="jobCompany"]');
        const salary = element.querySelector('[data-automation="jobSalary"]');
        const location = element.querySelector(
          '[data-automation="jobLocation"]'
        );
        const area = element.querySelector('[data-automation="jobArea"]');

        links.forEach((url) => {
          const hrefs = url.getAttribute("href");

          if (
            hrefs.includes("/job/") &&
            !jobsObject.find((e) => e.url.includes(hrefs))
          )
            jobsObject.push({
              url: `https://www.seek.co.nz${hrefs}`,
              company: company?.innerHTML,
              salary: salary?.innerHTML,
              location: location?.innerHTML,
              area: area?.innerHTML,
            });
        });
      });
      return jobsObject;
    });
    if (withDescription) {
      for (let i = 0; i < jobs.length; i++) {
        await page.goto(jobs[i]?.url);
        await page.waitForSelector('[data-automation="jobAdDetails"]');
        const desc = await page.evaluate(() => {
          const description = document.querySelector(
            '[data-automation="jobAdDetails"]'
          );
          return description?.innerHTML;
        });
        jobs[i] = {
          ...jobs[i],
          description: convert(desc, {
            wordwrap: 130,
          }),
        };
      }
    }

    jobsArray.push(...jobs)
  }
  await browser.close();

  const csv = new ObjectsToCsv(jobsArray);
  await csv.toDisk("./jobsArray.csv", { allColumns: true });
})();
