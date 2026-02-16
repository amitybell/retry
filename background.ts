const MIN_DELAY = 5_000;
const MAX_DELAY = 20_000;
const BACKOFF = 1.25;
const TICK_TIMEOUT = 500;
const COUNTDOWN_DECREMENT = 500;

class State {
  tabId: number;
  delay = MIN_DELAY;
  countdown = 0;
  timeout?: ReturnType<typeof setTimeout>;

  constructor(tabId: number) {
    this.tabId = tabId;
  }

  stop() {
    if (this.timeout != null) {
      clearTimeout(this.timeout);
      this.timeout = undefined;
    }
  }

  reset() {
    this.stop();
    this.countdown = this.delay;
    this.timeout = setTimeout(() => this.#tick(), TICK_TIMEOUT);
    this.delay = Math.min(MAX_DELAY, this.delay * BACKOFF);
  }

  #tick() {
    this.countdown -= COUNTDOWN_DECREMENT;
    if (this.countdown <= 0) {
      refreshTab(this.tabId);
      return;
    }

    browser.browserAction.setBadgeText({
      tabId: this.tabId,
      text: `${(this.countdown / 1000).toFixed(1)}s`,
    });
    this.timeout = setTimeout(() => this.#tick(), TICK_TIMEOUT);
  }
}

const states: { [tabId: number]: State } = {};

const retryStatusCodes = new Set([403, 429]);

browser.webRequest.onResponseStarted.addListener(
  ({ statusCode, method, url, tabId }) => {
    if (retryStatusCodes.has(statusCode) && method === "GET") {
      resetState(tabId);
    } else {
      deleteState(tabId);
    }
  },
  {
    urls: ["<all_urls>"],
  },
);

const deleteState = (tabId: number) => {
  states[tabId]?.stop();
  delete states[tabId];
};

const resetState = (tabId: number) => {
  states[tabId] ??= new State(tabId);
  states[tabId].reset();
};

const refreshTab = async (tabId: number) => {
  states[tabId]?.stop();
  browser.browserAction.setBadgeText({ tabId, text: "" });
  browser.tabs.reload(tabId, { bypassCache: true });
};

const refreshActiveTab = async () => {
  const tabs = await browser.tabs.query({ active: true });
  tabs.forEach((tab) => {
    if (tab.id) {
      refreshTab(tab.id);
    }
  });
};

browser.browserAction.onClicked.addListener(refreshActiveTab);
