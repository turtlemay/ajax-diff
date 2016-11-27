This browser module quickly ajaxifies any site. It automatically fetches all your local links with ajax, compares the fetched document with the current one using [diff-dom](https://github.com/fiduswriter/diffDOM), then merges `head` and `body` changes into the current page.

Inspired by [Turbolinks](https://github.com/turbolinks/turbolinks).

# Installation

```
npm install ajax-diff
```

# Simple Usage

```js
// Import the module.
import * as ajaxDiff from 'ajax-diff'

// Start handling links.
ajaxDiff.start()
```

Now you have a smart single-page ajax site!

# Advanced Usage

Optionally pass a configuration object:

```js
ajaxDiff.start({
  // Query selector defines which elements to bind the ajax handler to. (Only anchor elements are supported.)
  elemSelector: 'a[href]:not([target]):not([download])',

  // Use MutationObserver to automatically bind listeners to changed or newly added elements.
  observeMutations: true,

  // Use native Element.scrollIntoView when navigating to anchors. (Polyfill not included.)
  smoothScrollAnchors: false,
})

```

You can also invoke ajax navigation manually:

```js
ajaxDiff.navigate('/', {
  // Whether to create a new history state.
  pushHistory: true,

  // Defaults to the option already passed to start(), otherwise false.
  smoothScrollAnchor: false,
})
```

Some events are dispatched during navigation:

```js
document.addEventListener('AjaxContentRequested', event => {
  // We have started an ajax request for a local page.

  // Event data:
  //   event.detail.url
})

document.addEventListener('AjaxContentRejected', event => {
  // We got a bad response from the server and have ceased loading.

  // Event data:
  //   event.detail.response
})

document.addEventListener('AjaxContentWillLoad', event => {
  // We got a valid response and are preparing to merge the fetched document.
  // Perform any processing/transformations on the fetched document here.

  // Event data:
  //   event.detail.response
  //   event.detail.document
})

document.addEventListener('AjaxContentLoaded', event => {
  // Merging is complete and the DOM has been modified to reflect changes.

  // Event data:
  //   event.detail.response
})

```
