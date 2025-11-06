(function () {
  if (!window.wp || !window.wp.element) {
    // WordPress React runtime not available, abort setup.
    return;
  }

  var element = window.wp.element;
  var createElement = element.createElement;
  var reactRender = typeof element.render === 'function' ? element.render : null;
  var createRoot = typeof element.createRoot === 'function' ? element.createRoot : null;
  var useState = element.useState;
  var useMemo = element.useMemo;
  var useEffect = element.useEffect;
  var useRef = element.useRef;
  var useCallback = element.useCallback;
  var rootInstance = null;

  var fallbackStrings = {
    selectSutra: 'Seleziona un sutra',
    filterPlaceholder: 'Cerca sutra',
    noMatches: 'Nessun risultato',
    playSegment: 'Riproduci segmento',
    noAudio: 'Audio non disponibile',
    noSutras: 'Nessun sutra disponibile al momento.',
    textLabel: 'Testo',
    originalLabel: 'Originale',
    translationLabel: 'Traduzione',
    audioMissing: 'Questo sutra non ha un audio associato.',
    playFullAudio: 'Riproduci audio completo',
    stopAudio: 'Ferma audio',
    restartSegment: 'Ricomincia segmento',
    pauseAudio: 'Metti in pausa',
    resumeAudio: 'Riprendi audio',
    elapsedLabel: 'Tempo trascorso',
    durationLabel: 'Durata',
    showOriginal: 'Mostra originale',
    hideOriginal: 'Nascondi originale',
    showTranslation: 'Mostra traduzione',
    hideTranslation: 'Nascondi traduzione',
    previousCard: 'Scheda precedente',
    nextCard: 'Scheda successiva',
    cardIndicatorLabel: 'Vai alla scheda'
  };

  function computeCardIdentifier(card, index) {
    if (!card || typeof card !== 'object') {
      return null;
    }

    if (card.id !== undefined && card.id !== null && card.id !== '') {
      return String(card.id);
    }

    if (card.sequence !== undefined && card.sequence !== null && card.sequence !== '') {
      return 'sequence:' + String(card.sequence);
    }

    if (typeof index === 'number' && !Number.isNaN(index)) {
      return 'index:' + index;
    }

    if (card.romaji) {
      return 'romaji:' + String(card.romaji);
    }

    return null;
  }

  function findCardIndexByIdentifier(cards, identifier) {
    if (!Array.isArray(cards) || !identifier) {
      return 0;
    }

    for (var i = 0; i < cards.length; i += 1) {
      if (computeCardIdentifier(cards[i], i) === identifier) {
        return i;
      }
    }

    return 0;
  }

  function getInitialSelectionFromUrl(sutras) {
    var defaultId = sutras.length > 0 && sutras[0].id ? sutras[0].id : null;
    var selection = {
      sutraId: defaultId,
      cardIdentifier: null
    };

    if (typeof window === 'undefined' || !window.location || typeof URLSearchParams === 'undefined') {
      return selection;
    }

    try {
      var params = new URLSearchParams(window.location.search);
      var sutraParam = params.get('sutra');
      var cardParam = params.get('card');

      if (sutraParam) {
        for (var i = 0; i < sutras.length; i += 1) {
          if (sutras[i] && sutras[i].id === sutraParam) {
            selection.sutraId = sutraParam;
            break;
          }
        }
      }

      if (cardParam) {
        selection.cardIdentifier = cardParam;
      }
    } catch (error) {
      // Ignora problemi di parsing dell'URL.
    }

    return selection;
  }

  function syncSelectedStateToUrl(sutraId, cardIdentifier, replaceState) {
    if (typeof window === 'undefined' || !window.history || typeof window.history.replaceState !== 'function') {
      return;
    }

    try {
      var currentUrl = new URL(window.location.href);
      if (sutraId) {
        currentUrl.searchParams.set('sutra', sutraId);
      } else {
        currentUrl.searchParams.delete('sutra');
      }

      if (cardIdentifier) {
        currentUrl.searchParams.set('card', cardIdentifier);
      } else {
        currentUrl.searchParams.delete('card');
      }

      var method = replaceState ? 'replaceState' : 'pushState';
      var historyMethod = window.history[method];
      if (typeof historyMethod === 'function') {
        historyMethod.call(window.history, window.history.state, '', currentUrl.toString());
      }
    } catch (error) {
      // Ignora eventuali errori di manipolazione della history.
    }
  }

  function normalizeSutraTitleValue(rawTitle) {
    var normalized = {
      original: '',
      romaji: '',
      translation: ''
    };

    if (!rawTitle) {
      return normalized;
    }

    if (typeof rawTitle === 'string') {
      normalized.romaji = rawTitle;
      return normalized;
    }

    if (typeof rawTitle === 'object') {
      if (rawTitle.original) {
        normalized.original = String(rawTitle.original);
      }
      if (rawTitle.romaji) {
        normalized.romaji = String(rawTitle.romaji);
      }
      if (rawTitle.translation) {
        normalized.translation = String(rawTitle.translation);
      }
    }

    normalized.original = normalized.original.trim();
    normalized.romaji = normalized.romaji.trim();
    normalized.translation = normalized.translation.trim();

    return normalized;
  }

  function buildSutraSelectorLabel(normalizedTitle, fallback) {
    if (!normalizedTitle) {
      return fallback;
    }

    var romaji = normalizedTitle.romaji;
    var translation = normalizedTitle.translation;
    var original = normalizedTitle.original;

    if (romaji && translation) {
      return romaji + ' (' + translation + ')';
    }

    if (romaji && original) {
      return romaji + ' (' + original + ')';
    }

    if (romaji) {
      return romaji;
    }

    if (original && translation) {
      return original + ' (' + translation + ')';
    }

    if (original) {
      return original;
    }

    if (translation) {
      return translation;
    }

    return fallback;
  }

  function IconPlay() {
    return createElement(
      'svg',
      {
        className: 'cz-icon',
        viewBox: '0 0 24 24',
        role: 'presentation',
        'aria-hidden': 'true'
      },
      createElement('path', {
        d: 'M8 5v14l11-7z',
        fill: 'currentColor'
      })
    );
  }

  function IconStop() {
    return createElement(
      'svg',
      {
        className: 'cz-icon',
        viewBox: '0 0 24 24',
        role: 'presentation',
        'aria-hidden': 'true'
      },
      createElement('path', {
        d: 'M6 6h12v12H6z',
        fill: 'currentColor'
      })
    );
  }

  function IconRestart() {
    return createElement(
      'svg',
      {
        className: 'cz-icon',
        viewBox: '0 0 24 24',
        role: 'presentation',
        'aria-hidden': 'true'
      },
      createElement('path', {
        d: 'M21 18 13 12l8-6v12z',
        fill: 'currentColor'
      }),
      createElement('path', {
        d: 'M13 18 5 12l8-6v12z',
        fill: 'currentColor'
      })
    );
  }

  function IconPause() {
    return createElement(
      'svg',
      {
        className: 'cz-icon',
        viewBox: '0 0 24 24',
        role: 'presentation',
        'aria-hidden': 'true'
      },
      createElement('path', {
        d: 'M6 5h4v14H6zm8 0h4v14h-4z',
        fill: 'currentColor'
      })
    );
  }

  function formatTime(seconds) {
    if (seconds === undefined || seconds === null || Number.isNaN(seconds) || !Number.isFinite(seconds)) {
      return '00:00.000';
    }

    var clamped = Math.max(0, seconds);
    var minutes = Math.floor(clamped / 60);
    var secs = Math.floor(clamped - minutes * 60);

    var minutesStr = minutes < 10 ? '0' + minutes : String(minutes);
    var secondsStr = secs < 10 ? '0' + secs : String(secs);

    return minutesStr + ':' + secondsStr;
  }

  function SutraSelector(props) {
    var sutras = Array.isArray(props.sutras) ? props.sutras : [];
    var isDisabled = sutras.length === 0;

    var normalizedOptions = useMemo(
      function () {
        return sutras.map(function (sutra, index) {
          var fallbackLabel = sutra && sutra.id ? String(sutra.id) : 'Sutra ' + (index + 1);
          var normalizedTitle = normalizeSutraTitleValue(sutra ? sutra.title : null);
          var label = buildSutraSelectorLabel(normalizedTitle, fallbackLabel);

          var value = sutra && sutra.id ? String(sutra.id) : '';

          return {
            key: sutra && sutra.id ? String(sutra.id) : 'sutra-' + index,
            label: label,
            value: value,
            original: sutra
          };
        });
      },
      [sutras]
    );

    var selectedOption = null;
    var i;
    for (i = 0; i < normalizedOptions.length; i += 1) {
      if (props.selectedId && normalizedOptions[i].value === String(props.selectedId)) {
        selectedOption = normalizedOptions[i];
        break;
      }
    }

    if (!selectedOption && normalizedOptions.length > 0) {
      selectedOption = normalizedOptions[0];
    }

    var displayLabel = selectedOption ? selectedOption.label : props.strings.selectSutra;
    var wrapperRef = useRef(null);
    var triggerRef = useRef(null);
    var searchRef = useRef(null);
    var stateOpen = useState(false);
    var isOpen = stateOpen[0];
    var setIsOpen = stateOpen[1];
    var stateQuery = useState('');
    var queryValue = stateQuery[0];
    var setQueryValue = stateQuery[1];
    var listId = useMemo(
      function () {
        return 'cz-sutra-selector-list-' + Math.random().toString(36).slice(2);
      },
      []
    );
    var triggerId = useMemo(
      function () {
        return 'cz-sutra-selector-trigger-' + Math.random().toString(36).slice(2);
      },
      []
    );

    useEffect(
      function () {
        if (!isOpen) {
          return undefined;
        }

        var handleDocMouse = function (event) {
          var wrapper = wrapperRef.current;
          if (wrapper && !wrapper.contains(event.target)) {
            setIsOpen(false);
            setQueryValue('');
            if (triggerRef.current) {
              triggerRef.current.focus();
            }
          }
        };

        var handleDocKey = function (event) {
          if (event.key === 'Escape') {
            setIsOpen(false);
            setQueryValue('');
            if (triggerRef.current) {
              triggerRef.current.focus();
            }
          }
        };

        document.addEventListener('mousedown', handleDocMouse);
        document.addEventListener('keydown', handleDocKey);

        return function () {
          document.removeEventListener('mousedown', handleDocMouse);
          document.removeEventListener('keydown', handleDocKey);
        };
      },
      [isOpen]
    );

    useEffect(
      function () {
        if (!isOpen) {
          return undefined;
        }

        var timer = setTimeout(function () {
          if (searchRef.current && typeof searchRef.current.focus === 'function') {
            searchRef.current.focus();
            if (typeof searchRef.current.select === 'function') {
              searchRef.current.select();
            }
          }
        }, 0);

        return function () {
          clearTimeout(timer);
        };
      },
      [isOpen]
    );

    var filteredOptions = useMemo(
      function () {
        var normalizedQuery = queryValue.trim().toLowerCase();
        if (!normalizedQuery) {
          return normalizedOptions;
        }

        return normalizedOptions.filter(function (option) {
          var label = option && option.label ? option.label.toLowerCase() : '';
          var value = option && option.value ? option.value.toLowerCase() : '';
          return label.indexOf(normalizedQuery) !== -1 || value.indexOf(normalizedQuery) !== -1;
        });
      },
      [normalizedOptions, queryValue]
    );

    var handleToggle = function () {
      if (isDisabled) {
        return;
      }

      var nextOpen = !isOpen;
      setIsOpen(nextOpen);
      if (!nextOpen) {
        setQueryValue('');
      } else {
        setQueryValue('');
      }
    };

    var handleSelect = function (option) {
      if (!option) {
        return;
      }

      var nextValue = option.original && option.original.id ? String(option.original.id) : null;
      if (typeof props.onChange === 'function') {
        props.onChange(nextValue);
      }

      setIsOpen(false);
      setQueryValue('');
      if (triggerRef.current) {
        triggerRef.current.focus();
      }
    };

    var handleSearchChange = function (event) {
      setQueryValue(event.target.value);
    };

    var handleSearchKeyDown = function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        if (filteredOptions.length > 0) {
          handleSelect(filteredOptions[0]);
        }
      }
    };

    var popover = null;
    if (isOpen && !isDisabled) {
      var listChildren = null;
      if (filteredOptions.length > 0) {
        listChildren = filteredOptions.map(function (option) {
          var isActive = Boolean(
            selectedOption && option && selectedOption.value === option.value
          );
          return createElement(
            'li',
            { key: option.key },
            createElement(
              'button',
              {
                type: 'button',
                className:
                  'cz-sutra-selector__item' + (isActive ? ' is-active' : ''),
                role: 'option',
                'aria-selected': isActive ? 'true' : 'false',
                onClick: function () {
                  handleSelect(option);
                }
              },
              option.label
            )
          );
        });
      } else {
        listChildren = createElement(
          'li',
          { className: 'cz-sutra-selector__empty', role: 'presentation' },
          props.strings.noMatches || 'Nessun risultato'
        );
      }

      popover = createElement(
        'div',
        {
          className: 'cz-sutra-selector__popover',
          role: 'dialog',
          'aria-label': props.strings.selectSutra
        },
        createElement(
          'div',
          { className: 'cz-sutra-selector__search' },
          createElement('input', {
            ref: searchRef,
            type: 'text',
            className: 'cz-sutra-selector__search-input',
            value: queryValue,
            onChange: handleSearchChange,
            onKeyDown: handleSearchKeyDown,
            placeholder: props.strings.filterPlaceholder || '',
            'aria-label': props.strings.filterPlaceholder || props.strings.selectSutra,
            autoComplete: 'off'
          })
        ),
        createElement(
          'ul',
          {
            className: 'cz-sutra-selector__list',
            role: 'listbox',
            id: listId
          },
          listChildren
        )
      );
    }

    return createElement(
      'div',
      { className: 'cz-sutra-selector', ref: wrapperRef },
      createElement(
        'label',
        { className: 'cz-sutra-selector__label', htmlFor: triggerId },
        props.strings.selectSutra
      ),
      createElement(
        'div',
        { className: 'cz-sutra-selector__picker' },
        createElement(
          'button',
          {
            ref: triggerRef,
            type: 'button',
            className:
              'cz-sutra-selector__trigger' + (isDisabled ? ' is-disabled' : ''),
            onClick: handleToggle,
            'aria-haspopup': 'listbox',
            'aria-expanded': isOpen && !isDisabled ? 'true' : 'false',
            'aria-controls': isOpen && !isDisabled ? listId : undefined,
            id: triggerId,
            disabled: isDisabled,
            title: displayLabel
          },
          createElement('span', { className: 'cz-sutra-selector__trigger-label' }, displayLabel),
          createElement('span', { className: 'cz-sutra-selector__caret', 'aria-hidden': 'true' }, '▾')
        ),
        popover
      )
    );
  }

  function Card(props) {
    var card = props.card || {};
    var totalCount =
      typeof props.total === 'number' && Number.isFinite(props.total) && props.total > 0
        ? props.total
        : null;
    var currentIndex =
      typeof props.index === 'number' && Number.isFinite(props.index) && props.index >= 0
        ? props.index
        : null;
    var labelSequence = '';
    if (totalCount !== null && currentIndex !== null) {
      labelSequence = 'Parte ' + (currentIndex + 1) + '/' + totalCount;
    } else if (card.sequence) {
      labelSequence = 'Parte ' + card.sequence;
    }
    var headerActions = null;

    if (props.canPlay) {
      if (props.isActive && props.playbackMode === 'segment') {
        headerActions = createElement(
          'div',
          { className: 'cz-card__actions' },
          props.isSegmentPlaying
            ? createElement(
                'button',
                {
                  type: 'button',
                  className: 'cz-card__action',
                  onClick: props.onPause || function () {},
                  'aria-label': props.strings.pauseAudio,
                  title: props.strings.pauseAudio
                },
                createElement(IconPause, null),
                createElement('span', { className: 'cz-sr-only' }, props.strings.pauseAudio)
              )
            : createElement(
                'button',
                {
                  type: 'button',
                  className: 'cz-card__action',
                  onClick: function () {
                    if (props.isSegmentPaused) {
                      if (props.onResume) {
                        props.onResume();
                      }
                    } else {
                      props.onPlay(card);
                    }
                  },
                  'aria-label': props.isSegmentPaused ? props.strings.resumeAudio : props.strings.playSegment,
                  title: props.isSegmentPaused ? props.strings.resumeAudio : props.strings.playSegment
                },
                createElement(IconPlay, null),
                createElement(
                  'span',
                  { className: 'cz-sr-only' },
                  props.isSegmentPaused ? props.strings.resumeAudio : props.strings.playSegment
                )
              ),
          createElement(
            'button',
            {
              type: 'button',
              className: 'cz-card__action',
              onClick: function () {
                props.onRestart(card);
              },
              'aria-label': props.strings.restartSegment,
              title: props.strings.restartSegment
            },
            createElement(IconRestart, null),
            createElement('span', { className: 'cz-sr-only' }, props.strings.restartSegment)
          ),
          createElement(
            'button',
            {
              type: 'button',
              className: 'cz-card__action cz-card__action--stop',
              onClick: props.onStop,
              'aria-label': props.strings.stopAudio,
              title: props.strings.stopAudio
            },
            createElement(IconStop, null),
            createElement('span', { className: 'cz-sr-only' }, props.strings.stopAudio)
          )
        );
      } else {
        headerActions = createElement(
          'button',
          {
            type: 'button',
            className: 'cz-card__action',
            onClick: function () {
              props.onPlay(card);
            },
            'aria-label': props.strings.playSegment,
            title: props.strings.playSegment
          },
          createElement(IconPlay, null),
          createElement('span', { className: 'cz-sr-only' }, props.strings.playSegment)
        );
      }
    } else {
      headerActions = createElement(
        'button',
        {
          type: 'button',
          className: 'cz-card__action cz-card__action--disabled',
          disabled: true,
          'aria-disabled': 'true'
        },
        props.strings.noAudio
      );
    }

    var statePrimary = useState(true);
    var showPrimary = statePrimary[0];
    var setShowPrimary = statePrimary[1];
    var stateOriginal = useState(false);
    var showOriginal = stateOriginal[0];
    var setShowOriginal = stateOriginal[1];
    var stateTranslation = useState(false);
    var showTranslation = stateTranslation[0];
    var setShowTranslation = stateTranslation[1];

    var togglePrimary = function () {
      setShowPrimary(function (prev) {
        return !prev;
      });
    };

    var toggleOriginal = function () {
      setShowOriginal(function (prev) {
        return !prev;
      });
    };

    var toggleTranslation = function () {
      setShowTranslation(function (prev) {
        return !prev;
      });
    };

    var primaryLabel = props.strings.textLabel || 'Testo';
    var hasOriginal = Boolean(card.original);
    var hasTranslation = Boolean(card.translation);

    var primaryHeader = createElement(
      'header',
      { className: 'cz-card__header' },
      createElement(
        'button',
        {
          type: 'button',
          className: 'cz-collapsible__header',
          onClick: togglePrimary,
          'aria-expanded': showPrimary,
          'aria-label': primaryLabel,
          style: { marginTop: 0 }
        },
        createElement(
          'svg',
          {
            className: 'cz-collapsible__chevron',
            viewBox: '0 0 24 24',
            width: '16',
            height: '16',
            'aria-hidden': 'true',
            focusable: 'false',
            style: { transform: showPrimary ? 'rotate(0deg)' : 'rotate(-90deg)' }
          },
          createElement('path', {
            d: 'M6.23 8.97a1 1 0 0 1 1.41 0L12 13.34l4.36-4.37a1 1 0 1 1 1.41 1.42l-5.06 5.06a1 1 0 0 1-1.41 0L6.23 10.4a1 1 0 0 1 0-1.42z',
            fill: 'currentColor'
          })
        ),
        createElement('span', { className: 'cz-card__sequence' }, labelSequence || 'Parte')
      ),
      headerActions
    );

    return createElement(
      'article',
      {
        className: 'cz-card' + (props.isActive ? ' is-active' : '')
      },
      createElement(
        'div',
        { className: 'cz-collapsible cz-collapsible--primary' + (showPrimary ? ' is-open' : '') },
        primaryHeader,
        card.note
          ? createElement('p', { className: 'cz-card__note' }, card.note)
          : null,
        showPrimary
          ? createElement(
              'div',
              { className: 'cz-collapsible__content' },
              createElement(
                'div',
                { className: 'cz-card__block cz-card__block--romaji cz-card__block--primary' },
                createElement('p', { className: 'cz-card__text' }, card.romaji || '')
              )
            )
          : null
      ),
      hasOriginal
        ? createElement(
            'div',
            { className: 'cz-collapsible' + (showOriginal ? ' is-open' : '') },
            createElement(
              'button',
              {
                type: 'button',
                className: 'cz-collapsible__header',
                onClick: toggleOriginal,
                'aria-expanded': showOriginal
              },
              createElement(
                'svg',
                {
                  className: 'cz-collapsible__chevron',
                  viewBox: '0 0 24 24',
                  width: '16',
                  height: '16',
                  'aria-hidden': 'true',
                  focusable: 'false'
                },
                createElement('path', {
                  d: 'M6.23 8.97a1 1 0 0 1 1.41 0L12 13.34l4.36-4.37a1 1 0 1 1 1.41 1.42l-5.06 5.06a1 1 0 0 1-1.41 0L6.23 10.4a1 1 0 0 1 0-1.42z',
                  fill: 'currentColor'
                })
              ),
              createElement('span', { className: 'cz-collapsible__label' }, props.strings.originalLabel)
            ),
            showOriginal
              ? createElement(
                  'div',
                  { className: 'cz-collapsible__content' },
                  createElement('p', { className: 'cz-card__text' }, card.original || '')
                )
              : null
          )
        : null,
      hasTranslation
        ? createElement(
            'div',
            { className: 'cz-collapsible' + (showTranslation ? ' is-open' : '') },
            createElement(
              'button',
              {
                type: 'button',
                className: 'cz-collapsible__header',
                onClick: toggleTranslation,
                'aria-expanded': showTranslation
              },
              createElement(
                'svg',
                {
                  className: 'cz-collapsible__chevron',
                  viewBox: '0 0 24 24',
                  width: '16',
                  height: '16',
                  'aria-hidden': 'true',
                  focusable: 'false'
                },
                createElement('path', {
                  d: 'M6.23 8.97a1 1 0 0 1 1.41 0L12 13.34l4.36-4.37a1 1 0 1 1 1.41 1.42l-5.06 5.06a1 1 0 0 1-1.41 0L6.23 10.4a1 1 0 0 1 0-1.42z',
                  fill: 'currentColor'
                })
              ),
              createElement('span', { className: 'cz-collapsible__label' }, props.strings.translationLabel)
            ),
            showTranslation
              ? createElement(
                  'div',
                  { className: 'cz-collapsible__content' },
                  createElement('p', { className: 'cz-card__text' }, card.translation || '')
                )
              : null
          )
        : null
    );
  }

  function App(props) {
    var config = props.config || {};
    var sutras = Array.isArray(config.sutras) ? config.sutras : [];
    var strings = Object.assign({}, fallbackStrings, config.strings || {});

    var initialSelection = getInitialSelectionFromUrl(sutras);
    var initialId = initialSelection.sutraId;
    var initialSutra = null;

    if (initialId) {
      for (var i = 0; i < sutras.length; i += 1) {
        if (sutras[i] && sutras[i].id === initialId) {
          initialSutra = sutras[i];
          break;
        }
      }
    }

    if (!initialSutra && sutras.length > 0) {
      initialSutra = sutras[0];
      initialId = initialSutra && initialSutra.id ? initialSutra.id : null;
    }

    var initialActiveIndex = 0;
    if (
      initialSutra &&
      Array.isArray(initialSutra.cards) &&
      initialSutra.cards.length > 0 &&
      initialSelection.cardIdentifier
    ) {
      initialActiveIndex = findCardIndexByIdentifier(initialSutra.cards, initialSelection.cardIdentifier);
    }

    var stateSelected = useState(function () {
      return initialId;
    });
    var selectedId = stateSelected[0];
    var setSelectedId = stateSelected[1];

    var stateCurrentCard = useState(null);
    var currentCardId = stateCurrentCard[0];
    var setCurrentCardId = stateCurrentCard[1];

    var stateIsPlaying = useState(false);
    var isPlaying = stateIsPlaying[0];
    var setIsPlaying = stateIsPlaying[1];

    var statePlaybackMode = useState(null);
    var playbackMode = statePlaybackMode[0];
    var setPlaybackMode = statePlaybackMode[1];

    var stateProgress = useState(0);
    var progress = stateProgress[0];
    var setProgress = stateProgress[1];

    var stateDuration = useState(0);
    var duration = stateDuration[0];
    var setDuration = stateDuration[1];

    var stateScrubbing = useState(false);
    var isScrubbing = stateScrubbing[0];
    var setIsScrubbing = stateScrubbing[1];

    var audioRef = useRef(null);
    var limiterRef = useRef(null);
    var segmentContextRef = useRef(null);
    var targetEndRef = useRef(null);
    var lastSyncedSelectionRef = useRef('');
    var prevSutraIdRef = useRef(null);

    var clearLimiter = useCallback(function (audio) {
      if (!audio) {
        return;
      }

      if (limiterRef.current) {
        audio.removeEventListener('timeupdate', limiterRef.current);
        limiterRef.current = null;
      }
    }, []);

    var stopPlayback = useCallback(function () {
      var audio = audioRef.current;
      if (!audio) {
        setIsPlaying(false);
        setPlaybackMode(null);
        setCurrentCardId(null);
        segmentContextRef.current = null;
        targetEndRef.current = null;
        setProgress(0);
        return;
      }

      clearLimiter(audio);
      audio.pause();

      try {
        if (
          playbackMode === 'segment' &&
          segmentContextRef.current &&
          typeof segmentContextRef.current.start === 'number'
        ) {
          audio.currentTime = segmentContextRef.current.start;
        } else {
          audio.currentTime = 0;
        }
      } catch (error) {
        // Ignora eventuali errori di seek.
      }

      setIsPlaying(false);
      setPlaybackMode(null);
      setCurrentCardId(null);
      segmentContextRef.current = null;
      targetEndRef.current = null;
      setProgress(audio.currentTime || 0);
    }, [clearLimiter, playbackMode]);

    var pausePlayback = useCallback(function () {
      var audio = audioRef.current;
      if (!audio) {
        return;
      }

      audio.pause();
      setIsPlaying(false);
    }, []);

    var resumePlayback = useCallback(function () {
      var audio = audioRef.current;
      if (!audio) {
        return;
      }

      var playPromise = audio.play();

      if (playPromise && typeof playPromise.then === 'function') {
        playPromise
          .then(function () {
            setIsPlaying(true);
          })
          .catch(function () {
            setIsPlaying(false);
          });
      } else {
        setIsPlaying(true);
      }
    }, []);

    var pauseAtSegmentEnd = useCallback(function () {
      var audio = audioRef.current;
      if (!audio) {
        setIsPlaying(false);
        targetEndRef.current = null;
        segmentContextRef.current = null;
        setPlaybackMode(null);
        setCurrentCardId(null);
        setProgress(0);
        return;
      }

      clearLimiter(audio);
      audio.pause();

      var context = segmentContextRef.current;
      var endPoint =
        context && context.end !== null && typeof context.end === 'number'
          ? context.end
          : audio.currentTime || 0;

      try {
        audio.currentTime = endPoint;
      } catch (error) {
        // Ignora eventuali errori di seek.
      }

      setIsPlaying(false);
      targetEndRef.current = null;
      segmentContextRef.current = null;
      setPlaybackMode(null);
      setCurrentCardId(null);
      setProgress(audio.currentTime || endPoint || 0);
    }, [clearLimiter, setCurrentCardId, setPlaybackMode]);

    var scrubTo = useCallback(
      function (value) {
        if (Number.isNaN(value)) {
          return;
        }

        var audio = audioRef.current;
        var effectiveDuration = duration || (audio && audio.duration) || 0;
        var upperBound = effectiveDuration > 0 ? effectiveDuration : 0;
        var clamped = Math.min(Math.max(value, 0), upperBound);

        if (audio) {
          try {
            audio.currentTime = clamped;
          } catch (error) {
            // Ignora problemi di seek.
          }
        }

        setProgress(clamped);

        if (segmentContextRef.current) {
          var context = segmentContextRef.current;
          var segmentStart = typeof context.start === 'number' ? context.start : 0;
          var segmentEnd = context.end !== null && typeof context.end === 'number' ? context.end : null;
          var outOfSegment = clamped < segmentStart || (segmentEnd !== null && clamped > segmentEnd);

          if (outOfSegment) {
            segmentContextRef.current = null;
            targetEndRef.current = null;

            if (playbackMode === 'segment') {
              setPlaybackMode('full');
              setCurrentCardId(null);
            }
          }
        }
      },
      [duration, playbackMode, setCurrentCardId, setPlaybackMode]
    );

    var handleScrubStart = useCallback(function () {
      setIsScrubbing(true);
    }, []);

    var handleScrubInput = useCallback(
      function (event) {
        var value = parseFloat(event.target.value);
        if (Number.isNaN(value)) {
          return;
        }
        scrubTo(value);
      },
      [scrubTo]
    );

    var handleScrubEnd = useCallback(
      function (event) {
        setIsScrubbing(false);
        if (!event || !event.target) {
          return;
        }
        var value = parseFloat(event.target.value);
        if (Number.isNaN(value)) {
          return;
        }
        scrubTo(value);
      },
      [scrubTo]
    );

    var restartSegment = function () {
      var audio = audioRef.current;
      var context = segmentContextRef.current;

      if (!audio || !context) {
        return;
      }

      clearLimiter(audio);

      var endPoint = context.end !== null && typeof context.end === 'number' ? context.end : null;
      targetEndRef.current = endPoint;

      if (endPoint !== null) {
        var limiter = function () {
          if (audio.currentTime >= endPoint) {
            pauseAtSegmentEnd();
          }
        };

        limiterRef.current = limiter;
        audio.addEventListener('timeupdate', limiter);
      }

      try {
        if (typeof context.start === 'number') {
          audio.currentTime = context.start;
        } else {
          audio.currentTime = 0;
        }
      } catch (error) {
        // Ignora il fallimento del seek.
      }

      setProgress(audio.currentTime || 0);
      setPlaybackMode('segment');
      setCurrentCardId(context.cardId || null);

      var playPromise = audio.play();

      if (playPromise && typeof playPromise.then === 'function') {
        playPromise
          .then(function () {
            setIsPlaying(true);
          })
          .catch(function () {
            setIsPlaying(false);
            setPlaybackMode(null);
          });
      } else {
        setIsPlaying(true);
      }
    };

    var playFullAudio = function () {
      var audio = audioRef.current;

      if (!audio || !currentSutra || !currentSutra.audio) {
        return;
      }

      clearLimiter(audio);
      segmentContextRef.current = null;
      setCurrentCardId(null);
      setPlaybackMode('full');
      targetEndRef.current = null;

      try {
        audio.currentTime = 0;
      } catch (error) {
        // Ignora errori di seek.
      }

      setProgress(0);
      var playPromise = audio.play();

      if (playPromise && typeof playPromise.then === 'function') {
        playPromise
          .then(function () {
            setIsPlaying(true);
          })
          .catch(function () {
            setIsPlaying(false);
            setPlaybackMode(null);
          });
      } else {
        setIsPlaying(true);
      }
    };

    var currentSutra = useMemo(
      function () {
        if (!selectedId) {
          return sutras.length > 0 ? sutras[0] : null;
        }

        for (var i = 0; i < sutras.length; i += 1) {
          if (sutras[i].id === selectedId) {
            return sutras[i];
          }
        }

        return sutras.length > 0 ? sutras[0] : null;
      },
      [selectedId, sutras]
    );

    useEffect(
      function () {
        var audio = audioRef.current;
        if (!audio) {
          return undefined;
        }

        var handleEnded = function () {
          setIsPlaying(false);
          clearLimiter(audio);
          setPlaybackMode(null);
          setCurrentCardId(null);
          segmentContextRef.current = null;
          targetEndRef.current = null;
          setProgress(0);

          try {
            audio.currentTime = 0;
          } catch (error) {
            // Ignora eventuali errori di seek.
          }
        };

        audio.addEventListener('ended', handleEnded);

        return function () {
          audio.removeEventListener('ended', handleEnded);
        };
      },
      []
    );

    useEffect(
      function () {
        var audio = audioRef.current;

        if (!audio) {
          return;
        }

        clearLimiter(audio);

        audio.pause();
        try {
          audio.currentTime = 0;
        } catch (error) {
          // Ignora problemi di seek.
        }

        setIsPlaying(false);
        setCurrentCardId(null);
        setPlaybackMode(null);
        segmentContextRef.current = null;
        targetEndRef.current = null;
        setProgress(0);
        setDuration(0);

        if (currentSutra && currentSutra.audio) {
          audio.src = currentSutra.audio;
          audio.load();
        } else {
          audio.removeAttribute('src');
        }
      },
      [currentSutra]
    );

    useEffect(
      function () {
        var audio = audioRef.current;
        if (!audio) {
          return undefined;
        } else {
          var applyDuration = function () {
            setDuration(audio.duration || 0);
            setProgress(audio.currentTime || 0);
          };

          var handleProgress = function () {
            var current = audio.currentTime || 0;
            var endPoint = targetEndRef.current;
            if (endPoint !== null && typeof endPoint === 'number' && current >= endPoint) {
              pauseAtSegmentEnd();
              return;
            }
            if (!isScrubbing) {
              setProgress(current);
            }
          };

          audio.addEventListener('loadedmetadata', applyDuration);
          audio.addEventListener('timeupdate', handleProgress);
          audio.addEventListener('seeked', handleProgress);

          if (audio.readyState >= 1) {
            applyDuration();
          }

          return function () {
            audio.removeEventListener('loadedmetadata', applyDuration);
            audio.removeEventListener('timeupdate', handleProgress);
            audio.removeEventListener('seeked', handleProgress);
          };
        }
      },
      [pauseAtSegmentEnd, isScrubbing]
    );

    var handleSutraChange = function (newId) {
      setSelectedId(newId);
      setCurrentCardId(null);
      setPlaybackMode(null);
      segmentContextRef.current = null;
      targetEndRef.current = null;
      setProgress(0);
    };

    var cards = currentSutra && Array.isArray(currentSutra.cards) ? currentSutra.cards : [];
    var hasMultipleCards = cards.length > 1;
    var stateActiveIndex = useState(function () {
      return initialActiveIndex;
    });
    var activeIndex = stateActiveIndex[0];
    var setActiveIndex = stateActiveIndex[1];

    var getCardIdentifier = useCallback(function (card, index) {
      return computeCardIdentifier(card, index);
    }, []);

    var playSegment = useCallback(function (card, index) {
      var cardIndex = typeof index === 'number' && !Number.isNaN(index) ? index : cards.indexOf(card);
      var identifier = getCardIdentifier(card, cardIndex);
      setCurrentCardId(identifier);

      var audio = audioRef.current;
      if (!audio || !currentSutra || !currentSutra.audio) {
        return;
      }

      clearLimiter(audio);
      audio.pause();

      var hasStart = typeof card.audioStart === 'number' && !Number.isNaN(card.audioStart);
      var hasEnd = typeof card.audioEnd === 'number' && !Number.isNaN(card.audioEnd);

      var start = hasStart ? card.audioStart : 0;
      var end = hasEnd ? card.audioEnd : null;

      segmentContextRef.current = {
        cardId: identifier,
        start: start,
        end: end
      };
      targetEndRef.current = end;

      if (end !== null && (!hasStart || end <= start)) {
        end = null;
      }

      if (end !== null) {
        var limiter = function () {
          if (audio.currentTime >= end) {
            pauseAtSegmentEnd();
          }
        };

        limiterRef.current = limiter;
        audio.addEventListener('timeupdate', limiter);
      }

      setPlaybackMode('segment');

      var settleAttempts = 0;
      var settleHandler = null;
      var SEEK_TOLERANCE = 0.05;
      var MAX_SEEK_ATTEMPTS = 8;

      var clearSettleHandler = function () {
        if (settleHandler) {
          audio.removeEventListener('timeupdate', settleHandler);
          settleHandler = null;
        }
      };

      var commencePlayback = function () {
        setProgress(audio.currentTime || start || 0);
        var playPromise = audio.play();

        if (hasStart) {
          settleHandler = function () {
            var diffPlayback = Math.abs((audio.currentTime || 0) - start);
            if (diffPlayback <= SEEK_TOLERANCE || settleAttempts >= MAX_SEEK_ATTEMPTS) {
              clearSettleHandler();
              return;
            }
            settleAttempts += 1;
            try {
              if (typeof audio.fastSeek === 'function') {
                audio.fastSeek(start);
              } else {
                audio.currentTime = start;
              }
            } catch (error) {
              clearSettleHandler();
            }
          };
          audio.addEventListener('timeupdate', settleHandler);
        }

        if (playPromise && typeof playPromise.then === 'function') {
          playPromise
            .then(function () {
              setIsPlaying(true);
            })
            .catch(function () {
              setIsPlaying(false);
              setPlaybackMode(null);
              setCurrentCardId(null);
              segmentContextRef.current = null;
              targetEndRef.current = null;
              clearSettleHandler();
            });
        } else {
          setIsPlaying(true);
        }
      };

      var seekTimeout = null;
      var handleSeeked = function () {
        if (seekTimeout !== null) {
          clearTimeout(seekTimeout);
          seekTimeout = null;
        }
        audio.removeEventListener('seeked', handleSeeked);
        commencePlayback();
      };

      audio.addEventListener('seeked', handleSeeked);

      try {
        if (hasStart) {
          if (typeof audio.fastSeek === 'function') {
            audio.fastSeek(start);
          } else {
            audio.currentTime = start;
          }
        } else {
          handleSeeked();
          return;
        }
      } catch (error) {
        audio.removeEventListener('seeked', handleSeeked);
        commencePlayback();
        return;
      }

      if (audio.readyState >= 1 && Math.abs((audio.currentTime || 0) - start) < 0.005) {
        handleSeeked();
      } else {
        seekTimeout = setTimeout(handleSeeked, 150);
      }
    }, [
      cards,
      clearLimiter,
      currentSutra,
      getCardIdentifier,
      pauseAtSegmentEnd,
      setCurrentCardId,
      setIsPlaying,
      setPlaybackMode,
      setProgress
    ]);

    var goToIndex = useCallback(
      function (index) {
        if (!cards || cards.length === 0) {
          return;
        }

        var clamped = Math.max(0, Math.min(index, cards.length - 1));
        setActiveIndex(clamped);
      },
      [cards, setActiveIndex]
    );

    var goNext = useCallback(
      function () {
        if (!cards || cards.length === 0) {
          return;
        }
        if (activeIndex < cards.length - 1) {
          goToIndex(activeIndex + 1);
        }
      },
      [activeIndex, cards, goToIndex]
    );

    var goPrev = useCallback(
      function () {
        if (!cards || cards.length === 0) {
          return;
        }
        if (activeIndex > 0) {
          goToIndex(activeIndex - 1);
        }
      },
      [activeIndex, cards, goToIndex]
    );

    var activeCard = cards[activeIndex] || null;
    var activeCardNode = null;
    if (activeCard) {
      var canPlayActive =
        Boolean(currentSutra && currentSutra.audio) &&
        typeof activeCard.audioStart === 'number' &&
        !Number.isNaN(activeCard.audioStart);

      var thisCardIdentifier = getCardIdentifier(activeCard, activeIndex);
      var thisCardIsCurrent = currentCardId !== null && currentCardId === thisCardIdentifier;
      var isCardPlaying = isPlaying && playbackMode === 'segment' && thisCardIsCurrent;
      var isCardPaused = !isPlaying && playbackMode === 'segment' && thisCardIsCurrent;

      activeCardNode = createElement(Card, {
        key: activeCard.id || activeCard.sequence || String(activeIndex),
        card: activeCard,
        onPlay: function () {
          playSegment(activeCard, activeIndex);
        },
        isActive: true,
        canPlay: canPlayActive,
        index: activeIndex,
        total: cards.length,
        strings: strings,
        playbackMode: playbackMode,
        isSegmentPlaying: isCardPlaying,
        isSegmentPaused: isCardPaused,
        onRestart: restartSegment,
        onStop: stopPlayback,
        onPause: pausePlayback,
        onResume: resumePlayback
      });
    }

    var paginationNodes = null;
    if (hasMultipleCards) {
      paginationNodes = cards.map(function (card, index) {
        var label = strings.cardIndicatorLabel + ' ' + (index + 1);
        return createElement(
          'button',
          {
            key: card.id || card.sequence || String(index),
            type: 'button',
            className: 'cz-carousel__dot' + (index === activeIndex ? ' is-active' : ''),
            onClick: function () {
              goToIndex(index);
            },
            'aria-label': label,
            'aria-current': index === activeIndex ? 'true' : 'false'
          },
          index + 1
        );
      });
    }

    var navGroup = null;
    if (hasMultipleCards) {
      navGroup = createElement(
        'div',
        { className: 'cz-carousel__nav-group' },
        createElement(
          'button',
          {
            type: 'button',
            className: 'cz-carousel__nav cz-carousel__nav--prev',
            onClick: goPrev,
            disabled: activeIndex === 0,
            'aria-label': strings.previousCard
          },
          createElement(
            'svg',
            {
              className: 'cz-carousel__nav-icon',
              viewBox: '0 0 24 24',
              width: '16',
              height: '16',
              'aria-hidden': 'true',
              focusable: 'false',
              style: { transform: 'rotate(90deg)' }
            },
            createElement('path', {
              d: 'M6.23 8.97a1 1 0 0 1 1.41 0L12 13.34l4.36-4.37a1 1 0 1 1 1.41 1.42l-5.06 5.06a1 1 0 0 1-1.41 0L6.23 10.4a1 1 0 0 1 0-1.42z',
              fill: 'currentColor'
            })
          )
        ),
        createElement(
          'button',
          {
            type: 'button',
            className: 'cz-carousel__nav cz-carousel__nav--next',
            onClick: goNext,
            disabled: activeIndex >= cards.length - 1,
            'aria-label': strings.nextCard
          },
          createElement(
            'svg',
            {
              className: 'cz-carousel__nav-icon',
              viewBox: '0 0 24 24',
              width: '16',
              height: '16',
              'aria-hidden': 'true',
              focusable: 'false',
              style: { transform: 'rotate(-90deg)' }
            },
            createElement('path', {
              d: 'M6.23 8.97a1 1 0 0 1 1.41 0L12 13.34l4.36-4.37a1 1 0 1 1 1.41 1.42l-5.06 5.06a1 1 0 0 1-1.41 0L6.23 10.4a1 1 0 0 1 0-1.42z',
              fill: 'currentColor'
            })
          )
        )
      );
    }

    var paginationFooter = null;
    if (hasMultipleCards && paginationNodes && paginationNodes.length > 0) {
      paginationFooter = createElement(
        'div',
        { className: 'cz-carousel__footer' },
        createElement('div', { className: 'cz-carousel__pagination' }, paginationNodes)
      );
    }

    useEffect(
      function () {
        var currentId = currentSutra && currentSutra.id ? currentSutra.id : null;
        if (prevSutraIdRef.current === null) {
          prevSutraIdRef.current = currentId;
          return;
        }

        if (prevSutraIdRef.current !== currentId) {
          prevSutraIdRef.current = currentId;
          setActiveIndex(0);
        }
      },
      [currentSutra, setActiveIndex]
    );

    useEffect(
      function () {
        var cardIdentifier = null;
        if (Array.isArray(cards) && cards.length > 0 && typeof activeIndex === 'number') {
          var safeIndex = Math.max(0, Math.min(activeIndex, cards.length - 1));
          var card = cards[safeIndex];
          cardIdentifier = getCardIdentifier(card, safeIndex);
        }

        var descriptor = String(selectedId || '') + '|' + String(cardIdentifier || '');
        if (descriptor === lastSyncedSelectionRef.current) {
          return;
        }

        var shouldReplace = lastSyncedSelectionRef.current === '';
        syncSelectedStateToUrl(selectedId, cardIdentifier, shouldReplace);
        lastSyncedSelectionRef.current = descriptor;
      },
      [selectedId, activeIndex, cards, getCardIdentifier]
    );

    var audioPanel = null;
    var audioStatus = null;
    if (currentSutra) {
      if (currentSutra.audio) {
        var cappedDuration = duration || 0;
        var elapsed = Math.max(0, Math.min(progress, cappedDuration));
        var formattedElapsed = formatTime(elapsed);
        var formattedDuration = formatTime(cappedDuration);
        var percentage = cappedDuration > 0 ? Math.min(100, (elapsed / cappedDuration) * 100) : 0;

        var sliderValue = cappedDuration > 0 ? elapsed : 0;
        var progressString = elapsed.toFixed(3);

        var handleCopyProgress = function () {
          try {
            if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
              navigator.clipboard.writeText(progressString).catch(function () {});
              return;
            }
          } catch (error) {
            // Ignore clipboard API errors and fallback.
          }

          try {
            var input = document.createElement('textarea');
            input.value = progressString;
            input.setAttribute('readonly', '');
            input.style.position = 'absolute';
            input.style.left = '-9999px';
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
          } catch (error2) {
            // Silently ignore if copying fails.
          }
        };

        var timeNode = createElement(
          'button',
          {
            type: 'button',
            className: 'cz-audio-progress__time',
            onClick: handleCopyProgress
          },
          createElement(
            'span',
            { className: 'cz-audio-progress__elapsed', 'aria-label': strings.elapsedLabel },
            formattedElapsed
          ),
          createElement('span', { className: 'cz-audio-progress__divider' }, '/'),
          createElement(
            'span',
            { className: 'cz-audio-progress__duration', 'aria-label': strings.durationLabel },
            formattedDuration
          )
        );

        var infoBar = createElement(
          'div',
          { className: 'cz-audio-progress' },
          createElement('input', {
            type: 'range',
            min: 0,
            max: cappedDuration || 0,
            step: 0.001,
            value: sliderValue,
            className: 'cz-audio-progress__slider',
            style: { '--cz-progress': percentage + '%' },
            onPointerDown: handleScrubStart,
            onPointerUp: handleScrubEnd,
            onPointerCancel: handleScrubEnd,
            onMouseDown: handleScrubStart,
            onMouseUp: handleScrubEnd,
            onTouchStart: handleScrubStart,
            onTouchEnd: handleScrubEnd,
            onBlur: handleScrubEnd,
            onInput: handleScrubInput,
            onChange: handleScrubInput,
            disabled: cappedDuration <= 0,
            'aria-label': strings.elapsedLabel
          })
        );

        var primaryButtonLabel = strings.playFullAudio;
        var primaryButtonIcon = IconPlay;
        var primaryButtonHandler = playFullAudio;

        if (isPlaying) {
          primaryButtonLabel = strings.pauseAudio;
          primaryButtonIcon = IconPause;
          primaryButtonHandler = pausePlayback;
        } else if (
          playbackMode === 'segment' &&
          currentCardId !== null
        ) {
          primaryButtonLabel = strings.resumeAudio;
          primaryButtonIcon = IconPlay;
          primaryButtonHandler = resumePlayback;
        } else if (
          (playbackMode === 'full' &&
            progress > 0 &&
            (duration || 0) > 0 &&
            progress < (duration || 0)) ||
          (playbackMode === null && progress > 0)
        ) {
          primaryButtonLabel = strings.resumeAudio;
          primaryButtonIcon = IconPlay;
          primaryButtonHandler = resumePlayback;
        }

        var primaryButton = createElement(
          'button',
          {
            type: 'button',
            className: 'cz-card__action',
            onClick: primaryButtonHandler,
            'aria-label': primaryButtonLabel,
            title: primaryButtonLabel
          },
          createElement(primaryButtonIcon, null),
          createElement('span', { className: 'cz-sr-only' }, primaryButtonLabel)
        );

        var stopButton = createElement(
          'button',
          {
            type: 'button',
            className: 'cz-card__action cz-card__action--stop',
            onClick: stopPlayback,
            disabled: !isPlaying && progress === 0,
            'aria-label': strings.stopAudio,
            title: strings.stopAudio
          },
          createElement(IconStop, null),
          createElement('span', { className: 'cz-sr-only' }, strings.stopAudio)
        );

        var controlsBar = createElement(
          'div',
          { className: 'cz-audio-controls' },
          primaryButton,
          stopButton,
          timeNode
        );

        audioPanel = createElement(
          'div',
          { className: 'cz-audio-panel' },
          infoBar,
          controlsBar
        );
      } else {
        audioStatus = createElement('div', { className: 'cz-audio-status is-missing' }, strings.audioMissing);
      }
    }

    var currentSutraTitleData = normalizeSutraTitleValue(currentSutra ? currentSutra.title : null);
    var romajiHeading = currentSutraTitleData.romaji;
    var originalHeading = currentSutraTitleData.original;
    var hasHeadingParts = Boolean(romajiHeading || originalHeading);
    var fallbackHeading = '';
    if (!hasHeadingParts) {
      if (currentSutraTitleData.translation) {
        fallbackHeading = currentSutraTitleData.translation;
      } else if (currentSutra && currentSutra.id) {
        fallbackHeading = String(currentSutra.id);
      }
    }
    var sutraSubtitleText =
      hasHeadingParts && currentSutraTitleData.translation
        ? '(' + currentSutraTitleData.translation + ')'
        : '';
    var sutraHeadingNode = null;
    if (hasHeadingParts) {
      var headingChildren = [];
      if (romajiHeading) {
        headingChildren.push(romajiHeading);
      }
      if (romajiHeading && originalHeading) {
        headingChildren.push(' ');
      }
      if (originalHeading) {
        headingChildren.push(
          createElement('span', { className: 'cz-sutra-title__original' }, originalHeading)
        );
      }
      sutraHeadingNode = createElement('h2', { className: 'cz-sutra-title' }, headingChildren);
    } else if (fallbackHeading) {
      sutraHeadingNode = createElement('h2', { className: 'cz-sutra-title' }, fallbackHeading);
    }

    return createElement(
      'div',
      { className: 'cz-sutra-memorizer' },
      createElement(SutraSelector, {
        sutras: sutras,
        selectedId: currentSutra ? currentSutra.id : null,
        onChange: handleSutraChange,
        strings: strings
      }),
      currentSutra
        ? createElement(
            'section',
            { className: 'cz-sutra-panel' },
            createElement(
              'div',
              { className: 'cz-panel-header' },
              sutraHeadingNode,
              sutraSubtitleText
                ? createElement('p', { className: 'cz-sutra-subtitle' }, sutraSubtitleText)
                : null,
              currentSutra.description
                ? createElement('p', { className: 'cz-sutra-description' }, currentSutra.description)
                : null,
              audioPanel,
              audioStatus
            ),
            createElement(
              'div',
              { className: 'cz-carousel' },
              navGroup,
              createElement(
                'div',
                { className: 'cz-carousel__frame' },
                createElement(
                  'div',
                  { className: 'cz-carousel__viewport' },
                  activeCardNode ||
                    createElement('div', { className: 'cz-carousel__empty' }, strings.noSutras)
                )
              ),
              paginationFooter
            ),
            createElement('audio', {
              ref: audioRef,
              className: 'cz-sutra-audio',
              preload: 'metadata'
            })
          )
        : createElement('div', { className: 'cz-sutra-empty' }, strings.noSutras)
    );
  }

  function mountApp() {
    var container = document.getElementById('cz-sutra-memorizer-root');
    if (!container) {
      return;
    }

    var config = window.czSutraMemorizerConfig || {};
    var app = createElement(App, { config: config });

    if (createRoot) {
      if (!rootInstance) {
        rootInstance = createRoot(container);
      }
      rootInstance.render(app);
      return;
    }

    if (reactRender) {
      reactRender(app, container);
      return;
    }

    if (window.ReactDOM && typeof window.ReactDOM.render === 'function') {
      window.ReactDOM.render(app, container);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountApp);
  } else {
    mountApp();
  }
})();
