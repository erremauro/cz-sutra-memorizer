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
        d: 'M12 5V2L7 7l5 5V8c2.8 0 5 2.2 5 5s-2.2 5-5 5c-1.5 0-2.8-.7-3.7-1.7l-1.4 1.4C8.1 19.3 9.9 20.3 12 20.3c3.9 0 7-3.1 7-7s-3.1-7-7-7zM7.9 10.4 6.5 9C5.7 9.9 5.3 11 5.3 12.3c0 1 .3 1.9.8 2.7L4 15v3l5-5-1.1-.6z',
        fill: 'currentColor'
      })
    );
  }

  function IconAudio() {
    return createElement(
      'svg',
      {
        className: 'cz-icon',
        viewBox: '0 0 24 24',
        role: 'presentation',
        'aria-hidden': 'true'
      },
      createElement('path', {
        d: 'M4 9v6h3l4 4V5L7 9H4zm13.5 3c0-1.77-.77-3.29-2.5-4.5v9c1.73-1.21 2.5-2.73 2.5-4.5zm-2.5-9v2c3.5 1.25 5.5 4.14 5.5 7 0 2.86-2 5.75-5.5 7v-2c2.62-1.14 3.5-3.12 3.5-5 0-1.88-.88-3.86-3.5-5z',
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
    var secondsFloat = clamped - minutes * 60;
    var secs = Math.floor(secondsFloat);
    var millis = Math.floor((secondsFloat - secs) * 1000);

    var minutesStr = minutes < 10 ? '0' + minutes : String(minutes);
    var secondsStr = secs < 10 ? '0' + secs : String(secs);
    var millisStr = millis.toString().padStart(3, '0');

    return minutesStr + ':' + secondsStr + '.' + millisStr;
  }

  function SutraSelector(props) {
    var sutras = Array.isArray(props.sutras) ? props.sutras : [];
    var disabled = sutras.length === 0;

    var options = sutras.map(function (sutra) {
      var label = sutra && sutra.title ? sutra.title : (sutra && sutra.id ? sutra.id : '');
      return createElement('option', { key: sutra.id || label, value: sutra.id || '' }, label);
    });

    if (options.length === 0) {
      options.push(createElement('option', { key: 'empty', value: '' }, '—'));
    }

    return createElement(
      'div',
      { className: 'cz-sutra-selector' },
      createElement(
        'label',
        { className: 'cz-sutra-selector__label', htmlFor: 'cz-sutra-select' },
        props.strings.selectSutra
      ),
      createElement(
        'select',
        {
          id: 'cz-sutra-select',
          className: 'cz-sutra-selector__select',
          value: props.selectedId || '',
          disabled: disabled,
          onChange: function (event) {
            var nextId = event.target.value;
            props.onChange(nextId || null);
          }
        },
        options
      )
    );
  }

  function Card(props) {
    var card = props.card || {};
    var labelSequence = card.sequence ? '#' + card.sequence : '';
    var headerChildren = [
      createElement('span', { key: 'seq', className: 'cz-card__sequence' }, labelSequence)
    ];

    if (props.canPlay) {
      if (props.isActive && props.playbackMode === 'segment') {
        headerChildren.push(
          createElement(
            'div',
            { key: 'actions', className: 'cz-card__actions' },
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
                  createElement(props.isSegmentPaused ? IconPlay : IconPlay, null),
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
          )
        );
      } else {
        headerChildren.push(
          createElement(
            'button',
            {
              key: 'btn',
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
          )
        );
      }
    } else {
      headerChildren.push(
        createElement(
          'span',
          { key: 'info', className: 'cz-card__action cz-card__action--disabled' },
          props.strings.noAudio
        )
      );
    }

    var stateOriginal = useState(false);
    var showOriginal = stateOriginal[0];
    var setShowOriginal = stateOriginal[1];
    var stateTranslation = useState(false);
    var showTranslation = stateTranslation[0];
    var setShowTranslation = stateTranslation[1];

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

    return createElement(
      'article',
      {
        className: 'cz-card' + (props.isActive ? ' is-active' : '')
      },
      createElement('header', { className: 'cz-card__header' }, headerChildren),
      createElement(
        'div',
        { className: 'cz-card__block cz-card__block--romaji cz-card__block--primary' },
        createElement('span', { className: 'cz-card__label' }, props.strings.textLabel),
        createElement('p', { className: 'cz-card__text' }, card.romaji || '')
      ),
      createElement(
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
          createElement('span', { className: 'cz-collapsible__label' }, props.strings.originalLabel),
          createElement(
            'span',
            { className: 'cz-collapsible__action' },
            showOriginal ? props.strings.hideOriginal : props.strings.showOriginal
          )
        ),
        showOriginal
          ? createElement(
              'div',
              { className: 'cz-collapsible__content' },
              createElement('p', { className: 'cz-card__text' }, card.original || '')
            )
          : null
      ),
      createElement(
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
          createElement('span', { className: 'cz-collapsible__label' }, props.strings.translationLabel),
          createElement(
            'span',
            { className: 'cz-collapsible__action' },
            showTranslation ? props.strings.hideTranslation : props.strings.showTranslation
          )
        ),
        showTranslation
          ? createElement(
              'div',
              { className: 'cz-collapsible__content' },
              createElement('p', { className: 'cz-card__text' }, card.translation || '')
            )
          : null
      )
    );
  }

  function App(props) {
    var config = props.config || {};
    var sutras = Array.isArray(config.sutras) ? config.sutras : [];
    var strings = Object.assign({}, fallbackStrings, config.strings || {});

    var initialId = sutras.length > 0 && sutras[0].id ? sutras[0].id : null;

    var stateSelected = useState(initialId);
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
      setProgress(audio.currentTime || endPoint || 0);
    }, [clearLimiter]);

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
    var stateActiveIndex = useState(0);
    var activeIndex = stateActiveIndex[0];
    var setActiveIndex = stateActiveIndex[1];

    var getCardIdentifier = useCallback(function (card, index) {
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

      try {
        if (hasStart) {
          audio.currentTime = start;
        }
      } catch (error) {
        // Ignora eventuali errori di seek su audio non pronto.
      }

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
      setProgress(audio.currentTime || start || 0);

      var playPromise = audio.play();

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
          });
      } else {
        setIsPlaying(true);
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

    var paginationNodes = cards.map(function (card, index) {
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

    useEffect(
      function () {
        if (currentSutra && Array.isArray(currentSutra.cards)) {
          setActiveIndex(0);
        }
      },
      [currentSutra]
    );

    var infoBar = null;
    if (currentSutra) {
      if (currentSutra.audio) {
        var cappedDuration = duration || 0;
        var elapsed = Math.max(0, Math.min(progress, cappedDuration));
        var formattedElapsed = formatTime(elapsed);
        var formattedDuration = formatTime(cappedDuration);
        var percentage = cappedDuration > 0 ? Math.min(100, (elapsed / cappedDuration) * 100) : 0;

        var sliderValue = cappedDuration > 0 ? elapsed : 0;

        infoBar = createElement(
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
          }),
          createElement(
            'div',
            { className: 'cz-audio-progress__time' },
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
          )
        );
      } else {
        infoBar = createElement('div', { className: 'cz-audio-status is-missing' }, strings.audioMissing);
      }
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
              currentSutra.description
                ? createElement('p', { className: 'cz-sutra-description' }, currentSutra.description)
                : null,
              currentSutra.audio
                ? createElement(
                    'div',
                    { className: 'cz-audio-controls' },
                    (function () {
                      var primaryButtonLabel = strings.playFullAudio;
                      var primaryButtonIcon = IconAudio;
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

                      return createElement(
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
                    })(),
                    createElement(
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
                    )
                  )
                : null,
              infoBar
            ),
            createElement(
              'div',
              { className: 'cz-carousel' },
              createElement(
                'div',
                { className: 'cz-carousel__frame' },
                createElement(
                  'button',
                  {
                    type: 'button',
                    className: 'cz-carousel__nav cz-carousel__nav--prev',
                    onClick: goPrev,
                    disabled: activeIndex === 0 || !cards || cards.length === 0,
                    'aria-label': strings.previousCard
                  },
                  '‹'
                ),
                createElement(
                  'div',
                  { className: 'cz-carousel__viewport' },
                  activeCardNode ||
                    createElement('div', { className: 'cz-carousel__empty' }, strings.noSutras)
                ),
                createElement(
                  'button',
                  {
                    type: 'button',
                    className: 'cz-carousel__nav cz-carousel__nav--next',
                    onClick: goNext,
                    disabled: !cards || activeIndex >= cards.length - 1,
                    'aria-label': strings.nextCard
                  },
                  '›'
                )
              ),
              createElement(
                'div',
                { className: 'cz-carousel__footer' },
                createElement(
                  'div',
                  { className: 'cz-carousel__pagination' },
                  paginationNodes
                )
              )
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
