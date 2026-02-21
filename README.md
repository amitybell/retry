# ReTry

Firefox extension that automatically reloads the page on 403 (Forbidden) and 429 (Rate limited) errors.

## Install

Install in Firefox by visiting the extension page: https://addons.mozilla.org/en-US/firefox/addon/retry/

## Use-Case

If you frequent websites like Reddit, Hugging Face, etc. especially with the Tor Browser, you will find that you're often met with a 403 or 429 error page or even just a blank page.

At least for now, simply refreshing the page is often enough to bypass the error page.

This extension aims to automate that page refresh.

## Permissions

- `webRequest` - required in order to listen for the HTTP response status code
- `<all_urls>` - required in order to listen to the status code of all pages (not just Reddit, etc.)

## Screenshots

![](screenshots/countdown3.jpg)
![](screenshots/countdown2.jpg)
![](screenshots/countdown1.jpg)
