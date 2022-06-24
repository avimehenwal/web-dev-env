const ChromeLauncher = require("chrome-launcher");
const CDP = require("chrome-remote-interface");
const puppeteer = require("puppeteer");
const atob = require("atob");
const btoa = require("btoa");

async function main() {
  // const chrome = await ChromeLauncher.launch({
  //   chromeFlags: [
  //     "--window-size=1900,1200",
  //     "--user-data-dir=/tmp/chrome-testing",
  //     "--auto-open-devtools-for-tabs",
  //   ],
  // });

  console.log(`chrme debugger at port ${chrome.port}`);
  const cdp = await CDP({ port: chrome.port });
  const { Page, Network } = cdp;

  // setup handlers
  Network.requestWillBeSent((params) => {
    console.log(params.request.url);
  });

  // enable events then start
  await Promise.all([Page.enable(), Network.enable()]);

  await Page.navigate({ url: "https://github.com" });

  // cdp.on("event", (message) => {
  //   if (message.method === "Network.requestWillBeSent") {
  //     console.log(`Network.requestWillBeSent`);
  //     console.log(message.params);
  //   }
  // });
}

main();
