import * as DiffDom from 'diff-dom'

export enum EventType {
  AjaxContentRequested = 'AjaxContentRequested',
  AjaxContentRejected = 'AjaxContentRejected',
  AjaxContentWillLoad = 'AjaxContentWillLoad',
  AjaxContentLoaded = 'AjaxContentLoaded',
}

const defaultDiffDomOpts = {
  preDiffApply(info: any): true | void {
    if (
      info.diff.action === 'removeElement' &&
      info.node.tagName === 'SCRIPT'
    ) {
      return true
    }
  },
}

const defaultStartOpts: IStartOpts = {
  elemSelector: 'a[href]:not([target]):not([download])',
  observeMutations: true,
  smoothScrollAnchors: false,
  diffDomOpts: defaultDiffDomOpts,
}

const defaultNavOpts: INavOpts = {
  smoothScrollAnchor: undefined,
  pushHistory: true,
}

const domParser = new DOMParser()
let diffDom: any | null
let mutationObserver: MutationObserver | null
let options = defaultStartOpts
let started = false

export function start(partStartOpts?: Partial<IStartOpts>): void {
  const startOpts = (
    Object.assign({}, defaultStartOpts, partStartOpts) as IStartOpts
  )

  if (started) {
    stop()
  }

  diffDom = new DiffDom(
    Object.assign({}, defaultDiffDomOpts, startOpts.diffDomOpts)
  )

  document.querySelectorAll(startOpts.elemSelector)
    .forEach(bindElem)

  addEventListener('popstate', handleHistoryPopState)

  if (startOpts.observeMutations) {
    mutationObserver = new MutationObserver(handleMutations)
    mutationObserver.observe(document.documentElement, {
      attributes: true,
      childList: true,
      subtree: true,
    })
  }

  started = true
  options = startOpts
}

export function stop(): void {
  if (!started) {
    return
  }

  started = false

  if (mutationObserver) {
    mutationObserver.disconnect()
    mutationObserver = null
  }

  for (const elem of document.getElementsByTagName('*')) {
    if (elem instanceof HTMLElement) {
      unbindElem(elem)
    }
  }

  removeEventListener('popstate', handleHistoryPopState)
  options = defaultStartOpts
  diffDom = null
}

export async function navigate(
  url: string,
  partNavOpts?: Partial<INavOpts>,
): Promise<void> {

  const navOpts = (
    Object.assign({}, defaultNavOpts, partNavOpts) as INavOpts
  )

  const eventCancelled = !document.dispatchEvent(
    new CustomEvent(EventType.AjaxContentRequested, {
      cancelable: true,
      detail: { url },
    })
  )

  const response = await fetch(url)

  if (eventCancelled) {
    return
  }

  if (!response.ok) {
    document.dispatchEvent(
      new CustomEvent(EventType.AjaxContentRejected, {
        detail: { response },
      })
    )
    return
  }

  const contentType = response.headers.get('content-type') || ''

  if (contentType.indexOf('text/html') === undefined) {
    location.href = url
    return
  }

  const responseText = await response.text()
  const newDoc = domParser.parseFromString(responseText, 'text/html')

  document.dispatchEvent(
    new CustomEvent(EventType.AjaxContentWillLoad, {
      detail: { response, document: newDoc },
    })
  )

  const headDiff = diffDom.diff(document.head, newDoc.head)
  const bodyDiff = diffDom.diff(document.body, newDoc.body)
  diffDom.apply(document.head, headDiff)
  diffDom.apply(document.body, bodyDiff)

  if (navOpts.pushHistory) {
    history.pushState(null, '', url)
  }

  if (location.hash) {
    const scrollToElem = document.querySelector(location.hash)
    if (scrollToElem) {
      const smoothScroll = (navOpts.smoothScrollAnchor === undefined ?
        options.smoothScrollAnchors : navOpts.smoothScrollAnchor)
      if (!smoothScroll) {
        scrollToElem.scrollIntoView()
      } else {
        scrollToElem.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }

  document.querySelectorAll(options.elemSelector)
    .forEach(bindElem)

  document.dispatchEvent(
    new CustomEvent(EventType.AjaxContentLoaded, {
      detail: { response },
    })
  )
}

function handleMutations(mutations: MutationRecord[]): void {
  for (const mutation of mutations) {
    if (mutation.type === 'attributes') {
      handleAttributesMutation(mutation)
    } else if (mutation.type === 'childList') {
      handleChildListMutation(mutation)
    }
  }
}

function handleAttributesMutation(mutation: MutationRecord): void {
  if (
    mutation.target instanceof HTMLAnchorElement &&
    mutation.target.matches(options.elemSelector) &&
    mutation.attributeName === 'href'
  ) {
    unbindElem(mutation.target)
    bindElem(mutation.target)
  }
}

function handleChildListMutation(mutation: MutationRecord): void {
  for (const addedNode of mutation.addedNodes) {
    if (!(addedNode instanceof HTMLElement)) {
      continue
    }
    if (
      addedNode instanceof HTMLAnchorElement &&
      addedNode.matches(options.elemSelector)
    ) {
      bindElem(addedNode)
    }
    const elems = addedNode.querySelectorAll(options.elemSelector)
    for (const elem of elems) {
      if (elem instanceof HTMLAnchorElement) {
        bindElem(elem)
      }
    }
  }
}

function bindElem(elem: HTMLElement): void {
  if (!(elem instanceof HTMLAnchorElement)) {
    throw new Error(`Only ${HTMLAnchorElement.name} is supported.`)
  }
  if (elem.href && elem.host === location.host) {
    elem.removeEventListener('click', handleElemClick)
    elem.addEventListener('click', handleElemClick)
  }
}

function unbindElem(elem: HTMLElement): void {
  elem.removeEventListener('click', handleElemClick)
}

function handleElemClick(
  this: HTMLAnchorElement,
  event: Event,
): void {

  event.preventDefault()

  if (!this.href || this.href === location.href) {
    return
  }

  navigate(this.href, { pushHistory: true })
}

function handleHistoryPopState(): void {
  navigate(location.href, { pushHistory: false })
}

export interface IStartOpts {
  readonly elemSelector: string
  readonly smoothScrollAnchors: boolean
  readonly observeMutations: boolean
  readonly diffDomOpts: {}
}

export interface INavOpts {
  readonly smoothScrollAnchor?: boolean
  readonly pushHistory: boolean
}
