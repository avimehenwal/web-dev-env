import * as puppeteer from "puppeteer";
import * as prettier from "prettier";
import atob from "atob";
import btoa from "btoa";

const scriptUrlPatterns = ["*"];
const requestCache = new Map();

async function interceptRequestsForPage(page) {
  // https://puppeteer.github.io/puppeteer/docs/next/puppeteer.target.createcdpsession/
  const client = await page.target().createCDPSession();
  await client.send("Network.enable");

  await client.send("Network.setRequestInterception", {
    patterns: scriptUrlPatterns.map((pattern) => ({
      urlPattern: pattern,
      resourceType: "Script",
      interceptionStage: "HeadersReceived",
    })),
  });

  client.on(
    "Network.requestIntercepted",
    async ({ interceptionId, request, responseHeaders, resourceType }) => {
      console.log(
        `Intercepted ${request.url} {interception id: ${interceptionId}}`
      );

      const response = await client.send(
        "Network.getResponseBodyForInterception",
        { interceptionId }
      );

      const contentTypeHeader = Object.keys(responseHeaders).find(
        (k) => k.toLowerCase() === "content-type"
      );
      let newBody,
        contentType = responseHeaders[contentTypeHeader];

      if (requestCache.has(response.body)) {
        newBody = requestCache.get(response.body);
      } else {
        const bodyData = response.base64Encoded
          ? atob(response.body)
          : response.body;
        try {
          if (resourceType === "Script")
            newBody = prettier.format(bodyData, { parser: "babel" });
          else newBody === bodyData;
        } catch (e) {
          console.log(
            `Failed to process ${request.url} {interception id: ${interceptionId}}: ${e}`
          );
          newBody = bodyData;
        }

        requestCache.set(response.body, newBody);
      }

      const newHeaders = [
        "Date: " + new Date().toUTCString(),
        "Connection: closed",
        "Content-Length: " + newBody.length,
        "Content-Type: " + contentType,
      ];

      console.log(`Continuing interception ${interceptionId}`);
      client.send("Network.continueInterceptedRequest", {
        interceptionId,
        rawResponse: btoa(
          "HTTP/1.1 200 OK" +
            "\r\n" +
            newHeaders.join("\r\n") +
            "\r\n\r\n" +
            newBody
        ),
      });
    }
  );
}

async function add_header_to_all_requests(page) {
  const client = await page.target().createCDPSession();
  await client.send("Network.enable");
  await client.send("Network.setRequestInterception", {
    patterns: scriptUrlPatterns.map((pattern) => ({
      urlPattern: pattern,
      resourceType: "Script",
      interceptionStage: "HeadersReceived",
    })),
  });

  client.on("Network.requestWillBeSent", async ({ requestId, request }) => {
    console.dir(`want to send -> ${request.url}`);
    await page.setExtraHTTPHeaders({
      "avi-mehenwal-header": "avi mehewal header bitch",
    });
  });
}

(async function main() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    devtools: true,
    ignoreDefaultArgs: ["--disable-extensions", "--enable-automation"],
    args: [
      `--start-maximized`,
      // `--load-extension=./node_modules/.bin/vue-devtools`,
    ],
  });

  // get the first page from the browser-tabs
  // const page = (await browser.pages())[0];
  const page = await browser.newPage();
  await page.goto("http://localhost:3000/");
  // works only in headless mode
  // await page.pdf({ path: "google.pdf" });

  await add_header_to_all_requests(page);

  browser.on("targetcreated", async (target) => {
    const page = await target.page();
    await add_header_to_all_requests(page);
  });
})();
