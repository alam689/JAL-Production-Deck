/**
 * Renaming slides from the deck's own Slides grid.
 *
 * A deck's slide names are baked into it at build time, but the name that
 * suits one audience rarely suits the next. This adds a Rename control to
 * every row of the grid and keeps the new names in this browser's storage,
 * keyed by deck file — so the rename survives a reload and shows wherever the
 * deck runs, without touching the generated HTML.
 *
 * Clearing the box (or typing the name it already had) drops the override and
 * puts the built-in name back, which is the whole reset story.
 *
 * Names are whatever the user typed, so they are only ever written as text.
 */
;(function () {
  'use strict'

  var KEY = 'deckspace.slidenames'
  var ov = document.getElementById('overview')
  if (!ov || !ov.querySelector('li')) return // the scroll deck has no grid

  /** Overrides are per deck file: two decks can rename the same slide id. */
  function deckKey() {
    return (location.pathname.split('/').pop() || 'deck').toLowerCase()
  }

  function readAll() {
    try {
      var raw = localStorage.getItem(KEY)
      var all = raw ? JSON.parse(raw) : null
      return all && typeof all === 'object' ? all : {}
    } catch (e) {
      return {} // private window, blocked storage, or something else wrote the key
    }
  }

  function readMine() {
    var mine = readAll()[deckKey()]
    return mine && typeof mine === 'object' ? mine : {}
  }

  function save(id, value) {
    var all = readAll()
    var k = deckKey()
    var mine = all[k] && typeof all[k] === 'object' ? all[k] : {}
    var next = (value || '').trim()

    if (!next || next === original(id)) delete mine[id]
    else mine[id] = next

    if (Object.keys(mine).length) all[k] = mine
    else delete all[k]

    try {
      // with every override cleared the key goes too, rather than lingering
      // as an empty object
      if (Object.keys(all).length) localStorage.setItem(KEY, JSON.stringify(all))
      else localStorage.removeItem(KEY)
    } catch (e) {
      /* nothing persists, but the name still holds for this page view */
    }
  }

  var origins = {} // slide id -> the name the deck was built with
  function original(id) {
    return origins[id] || ''
  }

  function rowId(li) {
    var a = li.querySelector('a')
    return a ? (a.getAttribute('href') || '').slice(1) : ''
  }

  /* ---------------------------------------------------------------- build */

  // The grid row is `<a><span>07</span>Placing an order</a>`: the name is a
  // bare text node, so it gets wrapped once to have something to write to.
  // It cannot be a <span> — the grid already styles those as the number.
  function build() {
    Array.prototype.forEach.call(ov.querySelectorAll('li'), function (li) {
      var a = li.querySelector('a')
      if (!a || a.querySelector('.slname')) return

      var num = a.querySelector('span')
      var text = ''
      var node = a.lastChild
      while (node && node !== num) {
        var prev = node.previousSibling
        text = (node.textContent || '') + text
        a.removeChild(node)
        node = prev
      }

      var label = document.createElement('i')
      label.className = 'slname'
      label.textContent = text
      a.appendChild(label)
      origins[rowId(li)] = text

      var btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'slrename'
      btn.textContent = 'Rename'
      li.appendChild(btn)
    })
  }

  function paint() {
    var mine = readMine()
    Array.prototype.forEach.call(ov.querySelectorAll('li'), function (li) {
      var label = li.querySelector('.slname')
      if (!label) return
      var id = rowId(li)
      var custom = (mine[id] || '').trim()

      label.textContent = custom || original(id)
      li.classList.toggle('renamed', Boolean(custom))

      var btn = li.querySelector('.slrename')
      if (btn) {
        btn.title = custom
          ? 'Renamed from “' + original(id) + '” — clear the box to put it back'
          : 'Rename this slide'
        btn.setAttribute('aria-label', 'Rename slide: ' + label.textContent)
      }
      // keep the slide itself honest; it is what the deck reports as its title
      var section = document.getElementById(id)
      if (section) section.setAttribute('data-title', label.textContent)
    })
  }

  /* ----------------------------------------------------------- the editor */

  function edit(li) {
    if (li.querySelector('.slinput')) return
    var label = li.querySelector('.slname')
    var id = rowId(li)
    if (!label || !id) return

    var input = document.createElement('input')
    input.type = 'text'
    input.className = 'slinput'
    input.value = label.textContent
    input.setAttribute('aria-label', 'Slide name')
    input.placeholder = original(id)
    li.appendChild(input)
    li.classList.add('editing')
    input.focus()
    input.select()

    var closed = false
    function close(keep) {
      if (closed) return
      closed = true
      li.classList.remove('editing')
      if (keep) save(id, input.value)
      input.remove()
      paint()
    }

    // The deck drives itself from arrow keys and single letters, so every
    // keystroke has to stop here while a name is being typed.
    input.addEventListener('keydown', function (e) {
      e.stopPropagation()
      if (e.key === 'Enter') {
        e.preventDefault()
        close(true)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        close(false)
      }
    })
    input.addEventListener('blur', function () {
      close(true)
    })
  }

  // The grid turns a click on a row into navigation, so the button sits
  // outside the <a> and stops the click from getting that far.
  ov.addEventListener(
    'click',
    function (e) {
      var btn = e.target.closest && e.target.closest('.slrename')
      if (!btn) return
      e.preventDefault()
      e.stopPropagation()
      edit(btn.parentNode)
    },
    true,
  )

  var style = document.createElement('style')
  style.textContent = [
    '.overview li{position:relative}',
    '.overview .slname{font-style:normal}',
    '.overview .slrename{position:absolute; right:7px; top:50%; transform:translateY(-50%);',
    '  opacity:0; padding:3px 8px; border-radius:6px; cursor:pointer; transition:opacity .12s;',
    '  border:1px solid rgba(255,255,255,.22); background:rgba(7,11,31,.9); color:#E8ECF8;',
    '  font-family:"JetBrains Mono",monospace; font-size:.58rem; letter-spacing:.12em; text-transform:uppercase}',
    '.overview li:hover .slrename,.overview li:focus-within .slrename{opacity:1}',
    /* a renamed row keeps its button faintly on, so custom names are findable */
    '.overview li.renamed .slrename{opacity:.45}',
    '.overview .slrename:hover,.overview .slrename:focus{opacity:1; border-color:#F26B1D; color:#F5A524}',
    '.overview li.editing .slrename{display:none}',
    '.overview .slinput{position:absolute; left:38px; right:7px; top:6px; bottom:6px;',
    '  box-sizing:border-box; padding:0 10px; border-radius:8px; border:1px solid #F26B1D;',
    '  background:#0B1020; color:#E8ECF8; font:inherit; font-size:.92rem}',
    '.overview .slinput:focus{outline:none}',
    '.overview .slhint{max-width:1300px; margin:0 auto 14px; color:rgba(232,236,248,.55); font-size:.8rem}',
  ].join('\n')
  document.head.appendChild(style)

  var hint = document.createElement('p')
  hint.className = 'slhint'
  hint.textContent =
    'Hover a slide and choose Rename to retitle it. Clear the box to put the built-in name back.'
  var list = ov.querySelector('ol')
  if (list) ov.insertBefore(hint, list)

  build()
  paint()

  // renaming in one copy of the deck (a card, the viewer, another tab)
  // should show in the others
  addEventListener('storage', function (e) {
    if (!e.key || e.key === KEY) paint()
  })
})()
