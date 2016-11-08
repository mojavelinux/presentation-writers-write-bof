// Require Node modules in the browser thanks to Browserify: http://browserify.org
var bespoke = require('bespoke');
var classes = require('bespoke-classes');
var nav = require('bespoke-nav');
var hash = require('bespoke-hash');
var prism = require('bespoke-prism');

// Bespoke.js
bespoke.from({ parent: 'article.deck', slides: 'section' }, [
  classes(),
  nav(),
  hash(),
  prism(),
  function (deck) {

    const R_KEY = 82;
    const ratios = ['auto', '4/3', '16/9'];
    const html = document.body.parentElement
    html.dataset.aspectRatio = ratios[0];

    function goToNextRatio() {
      const ratioIdx = ratios.indexOf(html.dataset.aspectRatio)
      const nextRatioIdx = (ratioIdx + 1) % ratios.length
      html.dataset.aspectRatio = ratios[nextRatioIdx]
    }

    window.addEventListener('keydown', function (e) {
      if (e.keyCode === R_KEY) {
        goToNextRatio()
      }
    });

    window.addEventListener('message', ({ source, data }) => {
      if (data.command === 'NEXT_RATIO') {
        goToNextRatio()
      }
    })
  },
  function (deck) {

    const style = document.createElement('style')
    style.textContent = ``
    document.head.appendChild(style)

    const html = document.body.parentElement
    const parent = document.querySelector('.bespoke-parent')
    const zoomMin = 1
    const zoomMax = 20
    let slideIdx = 0

    function applyZoom(newZoom) {
      newZoom = Math.max(zoomMin, Math.min(newZoom, zoomMax))
      html.style = '--slide-zoom: ' + newZoom
      html.dataset.zoom = (newZoom === 1) ? 'false' : 'true'
      return newZoom
    }

    const Z_KEY = 90;
    const J_KEY = 74;
    const K_KEY = 75;

    let currentZoom = applyZoom(1)

    window.addEventListener('keydown', function (e) {

      if (e.keyCode === Z_KEY) {
        const shift = (e.shiftKey) ? -1 : +1
        currentZoom = applyZoom(currentZoom + shift)
      }

      if (e.keyCode === J_KEY) {
        slideIdx += 1
      }

      if (e.keyCode === K_KEY) {
        slideIdx -= 1
      }

      // style.textContent = `[data-zoom="true"] .bespoke-slide:nth-child(-n+${slideIdx}),
      // [data-zoom="true"] .bespoke-slide:nth-child(${slideIdx + currentZoom * currentZoom}) ~ .bespoke-slide {
      //   display: none;
      // }`

      style.textContent = `[data-zoom="true"] .bespoke-slide:nth-child(-n+${slideIdx}) {
        display: none;
      }`
    });
  },
  function (deck) {

    const style = document.createElement('style')
    style.textContent = ``
    document.head.appendChild(style)

    const classes = Array.from(
      new Set(
        Array.from(document.querySelectorAll('.bespoke-slide'))
          .map((slide) => Array.from(slide.classList))
          .reduce((a,b) => a.concat(b), [])
          .filter((clas) => clas.startsWith('slide-'))
        )
    )

    classes.unshift('ALL')
    let currentClass = classes[0]

    const S_KEY = 83;

    window.addEventListener('keydown', function (e) {

      if (e.keyCode === S_KEY) {

        const classIdx = classes.indexOf(currentClass)
        const shift = (e.shiftKey) ? -1 : +1
        const nextClassIdx = (classIdx + shift) % classes.length
        currentClass = classes[nextClassIdx]

        if (currentClass === 'ALL') {
          style.textContent = ``
        }
        else {
          style.textContent = `.bespoke-slide:not(.${currentClass}) {
            display: none;
          }`
        }
      }
    });
  },
  function (deck) {

    const F_KEY = 70

    const searchBar = document.createElement('div')
    searchBar.classList.add('searchBar')
    searchBar.classList.add('hidden')
    const searchInput = document.createElement('input')
    searchBar.appendChild(searchInput)

    const slideContents = deck.slides.map(function (slide) {
      return {
        slide,
        text: slide.innerText,
        textAndNotes: slide.textContent,
      }
    })

    document.body.appendChild(searchBar)

    searchBar.addEventListener('keydown', function (e) {
      e.stopPropagation()
    })

    searchBar.addEventListener('keyup', function (e) {

      slideContents.forEach(function ({ slide, text, textAndNotes }) {

        const txt = textAndNotes.toLowerCase()
        const val = searchInput.value.toLowerCase()

        if (txt.includes(val) || val === '') {
          slide.classList.remove('hidden')
        }
        else {
          slide.classList.add('hidden')
        }
      })
    })

    window.addEventListener('keydown', function (e) {

      if (e.keyCode === F_KEY) {
        searchBar.classList.toggle('hidden')
        searchInput.focus()
        e.preventDefault()
      }
    });
  },
  function (deck) {

    const metas = {}
    Array.from(document.querySelectorAll('head meta')).forEach((meta) => {
        metas[meta.getAttribute('name')] = meta.getAttribute('content')
    })

    const steps = deck.slides.map((slide, slideIdx) => {

      const notes = [].slice.call(slide.querySelectorAll('aside[role="note"] p'))
        .map((note) => note.textContent)
        .join('\n')

      // if (slide.bullets.length > 0) {
      //   return slide.bullets.map((b, bulletIdx) => {
      //     return {
      //       cursor: String(slideIdx) + '.' + String(bulletIdx),
      //       states: [],
      //       notes,
      //     }
      //   })
      // }

      return {
        cursor: String(slideIdx),
        states: [],
        notes,
      }
    })

    const details = {
      title: document.title || '',
      authors: metas.author || '',
      description: metas.description || '',
      vendor: 'bespoke.js',
      steps,
      ratios: ['16/9'],
      themes: ['default'],
    }

    window.addEventListener('message', ({ source, data: { command, commandArgs } }) => {

      switch (command) {

        case 'get-slide-deck-details':
          source.postMessage({ event: 'slide-deck-details', eventData: { details } }, '*')
          break;

        case 'go-to-step':
          const { cursor } = commandArgs
          const [slideIdx, subslideIdx] = cursor.split('.')
          deck.slide(Number(slideIdx))
          deck.activateBullet(Number(slideIdx), Number(subslideIdx))
          break;

        default:
          console.debug(`unknown protocol command ${command} with args`, commandArgs)
      }
    })
  }
]);
