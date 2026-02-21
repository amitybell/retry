const MIN_DELAY = 3_000;
const MAX_DELAY = 10_000;
const BACKOFF = 1000;
const TICK_TIMEOUT = 1000;
const COUNTDOWN_DECREMENT = 1000;
const MIN_ICON_NUM = 1;
const MAX_ICON_NUM = 10;

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
    this.delay = Math.min(MAX_DELAY, this.delay + BACKOFF);
  }

  #tick() {
    if (this.countdown <= 0) {
      refreshTab(this.tabId);
      return;
    }

    render({ tabId: this.tabId, countdown: this.countdown });
    this.countdown -= COUNTDOWN_DECREMENT;
    this.timeout = setTimeout(() => this.#tick(), TICK_TIMEOUT);
  }
}

const states: { [tabId: number]: State } = {};

const retryStatusCodes = new Set([403, 429]);

browser.webRequest.onResponseStarted.addListener(
  ({ statusCode, method, tabId }) => {
    if (retryStatusCodes.has(statusCode) && method === "GET") {
      resetState(tabId);
    } else {
      deleteState(tabId);
    }
  },
  {
    urls: ["<all_urls>"],
    types: ["main_frame"],
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
  render({ tabId });
  browser.tabs.reload(tabId, { bypassCache: true });
};

type RenderProps = {
  tabId: number;
  countdown?: number;
};

const render = async (props: RenderProps) => {
  const { tabId, countdown } = props;

  const show = !!countdown;
  const title = show ? `${(countdown / 1000).toFixed(1)}s` : null;
  const icon = show ? iconPath(countdown / 1000) : null;

  const res = await Promise.allSettled([
    browser.browserAction.setBadgeText({ tabId, text: title }),
    browser.pageAction.setTitle({ tabId, title }),
    icon && browser.pageAction.setIcon({ tabId, path: icon }),
  ]);
  res.forEach((r) => {
    if (r.status === "rejected") {
      console.error("ReTry: render error:", r.reason);
    }
  });

  if (show) {
    browser.pageAction.show(tabId);
  } else {
    browser.pageAction.hide(tabId);
  }
};

const refreshActiveTab = async () => {
  const tabs = await browser.tabs.query({ active: true });
  tabs.forEach((tab) => {
    if (tab.id) {
      refreshTab(tab.id);
    }
  });
};

const iconPath = (n: number) => {
  n = Math.ceil(n);
  return MIN_ICON_NUM <= n && n <= MAX_ICON_NUM
    ? `icons/${n}.svg`
    : `icons/icon.svg`;
};

const main = async () => {
  browser.browserAction.onClicked.addListener(refreshActiveTab);
  browser.pageAction.onClicked.addListener((tab) => {
    if (tab.id) {
      refreshTab(tab.id);
    }
  });
};

main();
