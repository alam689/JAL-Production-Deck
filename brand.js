/**
 * Deck branding, read from the signed-in DeckSpace profile.
 *
 * DeckSpace writes "presented by" and "presented for" into this browser's own
 * storage whenever the profile changes. A deck is served from the same origin
 * as the app, so it can read that directly — which means a deck is branded the
 * same whether it is running inside a library card, inside the viewer, or on
 * its own in a tab. Nothing here talks to the app, and nothing is sent
 * anywhere; with no profile stored the deck keeps the names it was built with.
 *
 * The two names are whatever the user typed, so they are only ever written as
 * text nodes — never as markup, and never straight into a CSS string.
 */
;(function () {
  'use strict'

  var KEY = 'deckspace.brand'
  var DOT = ' · '

  /** null whenever there is nothing to say — a missing name is not a brand. */
  function read() {
    try {
      var raw = localStorage.getItem(KEY)
      if (!raw) return null
      var saved = JSON.parse(raw)
      var by = String((saved && saved.presentedBy) || '').trim()
      var to = String((saved && saved.presentedFor) || '').trim()
      return by ? { by: by, to: to } : null
    } catch (e) {
      // private window, blocked storage, or something else wrote the key
      return null
    }
  }

  var tail = function (brand) {
    return brand.to ? DOT + 'for ' + brand.to : ''
  }

  /** "<by>" in the base colour, the client tail in the accent, as text. */
  function fill(el, brand, bold) {
    el.textContent = ''
    var host = el
    if (bold) {
      host = document.createElement('b')
      el.appendChild(host)
    }
    host.appendChild(document.createTextNode(brand.by))
    if (!brand.to) return
    var accent = document.createElement('span')
    accent.textContent = tail(brand)
    host.appendChild(accent)
  }

  /** A CSS `content` value — quoted, with the quoting characters escaped. */
  function cssString(value) {
    return '"' + value.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"'
  }

  function apply() {
    var brand = read()
    if (!brand) return

    // the bar at the top of a slide deck, or of the scrolling document
    var mark = document.querySelector('.chrome .wordmark, .topbar .wordmark')
    if (mark) fill(mark, brand, false)

    // the scroll deck closes on a real footer rather than a per-slide one
    var foot = document.querySelector('footer .brandline')
    if (foot) fill(foot, brand, true)

    // A deck that names the company in its own prose marks each mention so it
    // can follow the profile too. These read mid-sentence, so they take the
    // company on its own — never the "· for <client>" tail.
    Array.prototype.forEach.call(document.querySelectorAll('.brandname'), function (el) {
      el.textContent = brand.by
    })

    // every slide's footer line reads this, falling back to its built-in text
    document.documentElement.style.setProperty(
      '--deck-foot',
      cssString(brand.by + tail(brand)),
    )
  }

  apply()

  // Saving the profile in the app fires this in every other same-origin
  // context — which includes a deck running in a card or in the viewer.
  addEventListener('storage', function (e) {
    if (!e.key || e.key === KEY) apply()
  })
})()
