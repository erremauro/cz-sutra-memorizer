<?php
/**
 * Plugin Name: CZ Sutra Memorizer
 * Plugin URI: https://github.com/erremauro/cz-sutra-memorizer
 * Description: Fornisce una Single Page App in React per memorizzare i sutra attraverso schede con testo, romaji e traduzione.
 * Version: 0.1.0
 * Author: Roberto Mauro
 * License: ISC
 * Text Domain: cz-sutra-memorizer
 *
 * @package CignoZen\SutraMemorizer
 */

declare(strict_types=1);

if (! defined('ABSPATH')) {
    exit;
}

/**
 * Restituisce i dati dei sutra dal file JSON.
 *
 * @return array<int, array<string, mixed>>
 */
function cz_sutra_memorizer_get_sutras(): array
{
    static $sutras;

    if (null !== $sutras) {
        return $sutras;
    }

    $data_file = plugin_dir_path(__FILE__) . 'data/sutras.json';
    if (! file_exists($data_file)) {
        $sutras = [];
        return $sutras;
    }

    $contents = file_get_contents($data_file); // phpcs:ignore WordPressVIPMinimum.Performance.FetchingRemoteData.FileGetContentsUnknown
    if (false === $contents) {
        $sutras = [];
        return $sutras;
    }

    $decoded = json_decode($contents, true);
    if (! is_array($decoded)) {
        $sutras = [];
        return $sutras;
    }

    $sutras = $decoded;

    return $sutras;
}

/**
 * Registra script e stili del plugin.
 */
function cz_sutra_memorizer_register_assets(): void
{
    $asset_url  = plugin_dir_url(__FILE__) . 'assets/';
    $asset_path = plugin_dir_path(__FILE__) . 'assets/';

    $script_path = $asset_path . 'sutra-app.js';
    if (! file_exists($script_path)) {
        return;
    }

    wp_register_style(
        'cz-sutra-memorizer',
        $asset_url . 'styles.css',
        [],
        file_exists($asset_path . 'styles.css') ? filemtime($asset_path . 'styles.css') : null
    );

    wp_register_script(
        'cz-sutra-memorizer',
        $asset_url . 'sutra-app.js',
        ['wp-element'],
        filemtime($script_path),
        true
    );
}
add_action('init', 'cz_sutra_memorizer_register_assets');

/**
 * Carica il text domain del plugin.
 */
function cz_sutra_memorizer_load_textdomain(): void
{
    load_plugin_textdomain('cz-sutra-memorizer', false, basename(plugin_dir_path(__FILE__)) . '/languages');
}
add_action('plugins_loaded', 'cz_sutra_memorizer_load_textdomain');

/**
 * Prepara i dati dei sutra per il frontend.
 *
 * @param array<int, array<string, mixed>> $sutras Elenco dei sutra.
 * @return array<int, array<string, mixed>>
 */
function cz_sutra_memorizer_prepare_sutras(array $sutras): array
{
    $base_url = plugin_dir_url(__FILE__);

    return array_map(
        static function ($sutra) use ($base_url) {
            if (! is_array($sutra)) {
                return [];
            }

            if (! empty($sutra['audio']) && is_string($sutra['audio']) && strpos($sutra['audio'], '://') === false) {
                $sutra['audio'] = $base_url . ltrim($sutra['audio'], '/');
            }

            if (! empty($sutra['cards']) && is_array($sutra['cards'])) {
                $sutra['cards'] = array_map(
                    static function ($card) {
                        if (! is_array($card)) {
                            return [];
                        }

                        if (isset($card['audioStart'])) {
                            $card['audioStart'] = is_numeric($card['audioStart']) ? (float) $card['audioStart'] : null;
                        }

                        if (isset($card['audioEnd'])) {
                            $card['audioEnd'] = is_numeric($card['audioEnd']) ? (float) $card['audioEnd'] : null;
                        }

                        return $card;
                    },
                    $sutra['cards']
                );
            } else {
                $sutra['cards'] = [];
            }

            return $sutra;
        },
        $sutras
    );
}

/**
 * Restituisce l'output dello shortcode della SPA.
 *
 * @return string
 */
function cz_sutra_memorizer_render_shortcode(): string
{
    $sutras = cz_sutra_memorizer_prepare_sutras(cz_sutra_memorizer_get_sutras());
    if (! wp_script_is('cz-sutra-memorizer', 'registered')) {
        cz_sutra_memorizer_register_assets();
    }

    if (! wp_script_is('cz-sutra-memorizer', 'registered')) {
        return '<div class="cz-sutra-memorizer-error">Impossibile caricare l\'applicazione: script non disponibile.</div>';
    }

    wp_enqueue_style('cz-sutra-memorizer');
    wp_enqueue_script('cz-sutra-memorizer');

    $config = [
        'sutras'        => $sutras,
        'textDomain'    => 'cz-sutra-memorizer',
        'strings'       => [
            'selectSutra'   => __('Seleziona un sutra', 'cz-sutra-memorizer'),
            'playSegment'   => __('Riproduci segmento', 'cz-sutra-memorizer'),
            'noAudio'       => __('Audio non disponibile', 'cz-sutra-memorizer'),
            'noSutras'      => __('Nessun sutra disponibile al momento.', 'cz-sutra-memorizer'),
            'textLabel'     => __('Testo', 'cz-sutra-memorizer'),
            'originalLabel' => __('Originale', 'cz-sutra-memorizer'),
            'translationLabel' => __('Traduzione', 'cz-sutra-memorizer'),
            'audioMissing'  => __('Questo sutra non ha un audio associato.', 'cz-sutra-memorizer'),
            'playFullAudio' => __('Riproduci audio completo', 'cz-sutra-memorizer'),
            'stopAudio'     => __('Ferma audio', 'cz-sutra-memorizer'),
            'restartSegment'=> __('Ricomincia segmento', 'cz-sutra-memorizer'),
            'pauseAudio'    => __('Metti in pausa', 'cz-sutra-memorizer'),
            'resumeAudio'   => __('Riprendi audio', 'cz-sutra-memorizer'),
            'elapsedLabel'  => __('Tempo trascorso', 'cz-sutra-memorizer'),
            'durationLabel' => __('Durata', 'cz-sutra-memorizer'),
            'showOriginal'  => __('Mostra originale', 'cz-sutra-memorizer'),
            'hideOriginal'  => __('Nascondi originale', 'cz-sutra-memorizer'),
            'showTranslation' => __('Mostra traduzione', 'cz-sutra-memorizer'),
            'hideTranslation' => __('Nascondi traduzione', 'cz-sutra-memorizer'),
            'previousCard'  => __('Scheda precedente', 'cz-sutra-memorizer'),
            'nextCard'      => __('Scheda successiva', 'cz-sutra-memorizer'),
            'cardIndicatorLabel' => __('Vai alla scheda', 'cz-sutra-memorizer'),
        ],
    ];

    wp_add_inline_script(
        'cz-sutra-memorizer',
        'window.czSutraMemorizerConfig = ' . wp_json_encode($config) . ';',
        'before'
    );

    return '<div id="cz-sutra-memorizer-root"></div>';
}
add_shortcode('cz-sutra-memo', 'cz_sutra_memorizer_render_shortcode');
