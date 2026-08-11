<?php
/**
 * Plugin Name: RankWoven SEO
 * Description: Connects a WordPress site to RankWoven and syncs posts, pages, and image media for SEO optimization.
 * Version: 0.1.1
 * Author: RankWoven
 * Text Domain: rankwoven-seo
 * Requires at least: 6.0
 * Requires PHP: 8.0
 */

if (!defined('ABSPATH')) {
    exit;
}

final class RankWoven_SEO_Plugin
{
    private const VERSION = '0.1.1';
    private const OPTION_API_BASE_URL = 'rankwoven_api_base_url';
    private const OPTION_SITE_ID = 'rankwoven_site_id';
    private const OPTION_SITE_TOKEN = 'rankwoven_site_token';
    private const OPTION_GA4_PROPERTY_ID = 'rankwoven_ga4_property_id';
    private const OPTION_TWITTER_USERNAME = 'rankwoven_twitter_username';
    private const OPTION_FACEBOOK_APP_ID = 'rankwoven_facebook_app_id';
    private const OPTION_WP_ADMIN_USERNAME = 'rankwoven_wp_admin_username';
    private const OPTION_WP_APPLICATION_PASSWORD = 'rankwoven_wp_application_password';
    private const OPTION_LAST_SYNC_RESULT = 'rankwoven_last_sync_result';
    private const OPTION_LAST_TOKEN_USED_AT = 'rankwoven_last_token_used_at';
    private const OPTION_LAST_ERROR = 'rankwoven_last_error';
    private const OPTION_LAST_SITEMAP_RESULT = 'rankwoven_last_sitemap_result';
    private const OPTION_LAST_SITEMAP_SUBMISSION_RESULT = 'rankwoven_last_sitemap_submission_result';
    private const OPTION_CONTENT_META_SETTINGS = 'rankwoven_content_meta_settings';
    private const OPTION_IMAGE_ATTRIBUTE_SETTINGS = 'rankwoven_image_attribute_settings';
    private const OPTION_IMAGE_BULK_LAST_ID = 'rankwoven_image_bulk_last_id';
    private const OPTION_IMAGE_BULK_LOG = 'rankwoven_image_bulk_log';
    private const META_EDITOR_FOCUS_KEYPHRASE = '_rankwoven_focus_keyphrase';
    private const META_EDITOR_SEO_TITLE = '_rankwoven_seo_title';
    private const META_EDITOR_SEO_SCORE = '_rankwoven_seo_score';
    private const META_EDITOR_META_DESCRIPTION = '_rankwoven_meta_description';
    private const META_EDITOR_META_KEYWORDS = '_rankwoven_meta_keywords';
    private const META_EDITOR_ANALYSIS = '_rankwoven_seo_analysis';
    private const IMAGE_BULK_BATCH_SIZE = 50;
    private const SYNC_PAGE_SIZE = 100;
    private const SYNC_MAX_BATCH_PAGES = 10000;
    private const REST_NAMESPACE = 'rankwoven/v1';

    public function __construct()
    {
        add_action('init', [$this, 'register_editor_seo_meta_fields']);
        add_action('admin_menu', [$this, 'register_admin_page']);
        add_action('add_meta_boxes', [$this, 'register_editor_seo_meta_boxes']);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_admin_assets']);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_editor_seo_assets']);
        add_action('save_post', [$this, 'handle_editor_seo_post_save'], 10, 2);
        add_action('admin_post_rankwoven_save_settings', [$this, 'handle_save_settings']);
        add_action('admin_post_rankwoven_connect_site', [$this, 'handle_connect_site']);
        add_action('admin_post_rankwoven_sync_content', [$this, 'handle_sync_content']);
        add_action('admin_post_rankwoven_generate_sitemap', [$this, 'handle_generate_sitemap']);
        add_action('admin_post_rankwoven_submit_sitemap_google', [$this, 'handle_submit_sitemap_google']);
        add_action('admin_post_rankwoven_run_seo_audit', [$this, 'handle_run_seo_audit']);
        add_action('admin_post_rankwoven_manage_suggestions', [$this, 'handle_manage_suggestions']);
        add_action('admin_post_rankwoven_save_image_attributes', [$this, 'handle_save_image_attributes']);
        add_action('admin_post_rankwoven_test_image_attributes', [$this, 'handle_test_image_attributes']);
        add_action('admin_post_rankwoven_bulk_update_image_attributes', [$this, 'handle_bulk_update_image_attributes']);
        add_action('admin_post_rankwoven_reset_image_bulk_counter', [$this, 'handle_reset_image_bulk_counter']);
        add_action('wp_ajax_rankwoven_editor_seo', [$this, 'handle_editor_seo_ajax']);
        add_action('add_attachment', [$this, 'handle_new_attachment']);
        add_action('wp_head', [$this, 'render_frontend_seo_meta_tags'], 1);
        add_action('template_redirect', [$this, 'maybe_render_sitemap_xml']);
        add_filter('the_content', [$this, 'add_image_title_attributes_to_content']);
        add_filter('redirect_canonical', [$this, 'disable_core_sitemap_redirect'], 10, 2);
        add_filter('robots_txt', [$this, 'append_sitemap_to_robots_txt'], 20, 2);
        add_action('rest_api_init', [$this, 'register_rest_routes']);
    }

    public function register_admin_page(): void
    {
        $tabs = $this->get_admin_menu_tabs();

        add_menu_page(
            __('RankWoven SEO', 'rankwoven-seo'),
            __('RankWoven SEO', 'rankwoven-seo'),
            'manage_options',
            'rankwoven-seo',
            [$this, 'render_admin_page'],
            'dashicons-chart-line',
            58
        );

        foreach ($tabs as $tab_config) {
            add_submenu_page(
                'rankwoven-seo',
                $tab_config['label'],
                $tab_config['label'],
                'manage_options',
                $tab_config['slug'],
                [$this, 'render_admin_page']
            );
        }

        add_options_page(
            __('RankWoven SEO', 'rankwoven-seo'),
            __('RankWoven SEO', 'rankwoven-seo'),
            'manage_options',
            'rankwoven-seo-settings',
            [$this, 'render_admin_page']
        );
    }

    private function get_admin_menu_tabs(): array
    {
        return [
            'dashboard' => [
                'label' => __('儀表板', 'rankwoven-seo'),
                'slug' => 'rankwoven-seo'
            ],
            'connection' => [
                'label' => __('一般設定', 'rankwoven-seo'),
                'slug' => 'rankwoven-seo-connection'
            ],
            'content_meta' => [
                'label' => __('搜尋外觀', 'rankwoven-seo'),
                'slug' => 'rankwoven-seo-search-appearance'
            ],
            'sitemap' => [
                'label' => __('網站地圖', 'rankwoven-seo'),
                'slug' => 'rankwoven-seo-sitemap'
            ],
            'link_assistant' => [
                'label' => __('Link Assistant', 'rankwoven-seo'),
                'slug' => 'rankwoven-seo-link-assistant'
            ],
            'seo_analysis' => [
                'label' => __('SEO 分析', 'rankwoven-seo'),
                'slug' => 'rankwoven-seo-analysis'
            ],
            'image_attributes' => [
                'label' => __('圖片屬性', 'rankwoven-seo'),
                'slug' => 'rankwoven-seo-image-attributes'
            ],
            'image_bulk' => [
                'label' => __('工具類', 'rankwoven-seo'),
                'slug' => 'rankwoven-seo-tools'
            ],
            'diagnostics' => [
                'label' => __('診斷', 'rankwoven-seo'),
                'slug' => 'rankwoven-seo-diagnostics'
            ]
        ];
    }

    private function get_supported_editor_post_types(): array
    {
        return array_values(array_filter(['post', 'page', 'portfolio', 'product'], 'post_type_exists'));
    }

    public function register_editor_seo_meta_fields(): void
    {
        foreach ($this->get_supported_editor_post_types() as $post_type) {
            register_post_meta($post_type, self::META_EDITOR_FOCUS_KEYPHRASE, [
                'type' => 'string',
                'single' => true,
                'show_in_rest' => true,
                'sanitize_callback' => 'sanitize_text_field',
                'auth_callback' => static fn (): bool => current_user_can('edit_posts')
            ]);
            register_post_meta($post_type, self::META_EDITOR_SEO_TITLE, [
                'type' => 'string',
                'single' => true,
                'show_in_rest' => true,
                'sanitize_callback' => 'sanitize_text_field',
                'auth_callback' => static fn (): bool => current_user_can('edit_posts')
            ]);
            register_post_meta($post_type, self::META_EDITOR_SEO_SCORE, [
                'type' => 'integer',
                'single' => true,
                'show_in_rest' => true,
                'sanitize_callback' => static fn ($value): int => max(0, min(100, (int) $value)),
                'auth_callback' => static fn (): bool => current_user_can('edit_posts')
            ]);
            register_post_meta($post_type, self::META_EDITOR_META_DESCRIPTION, [
                'type' => 'string',
                'single' => true,
                'show_in_rest' => true,
                'sanitize_callback' => 'sanitize_textarea_field',
                'auth_callback' => static fn (): bool => current_user_can('edit_posts')
            ]);
            register_post_meta($post_type, self::META_EDITOR_META_KEYWORDS, [
                'type' => 'string',
                'single' => true,
                'show_in_rest' => true,
                'sanitize_callback' => 'sanitize_text_field',
                'auth_callback' => static fn (): bool => current_user_can('edit_posts')
            ]);
            register_post_meta($post_type, self::META_EDITOR_ANALYSIS, [
                'type' => 'string',
                'single' => true,
                'show_in_rest' => true,
                'sanitize_callback' => 'sanitize_textarea_field',
                'auth_callback' => static fn (): bool => current_user_can('edit_posts')
            ]);
        }
    }

    public function register_editor_seo_meta_boxes(): void
    {
        foreach ($this->get_supported_editor_post_types() as $post_type) {
            add_meta_box(
                'rankwoven_editor_seo',
                __('RankWoven SEO', 'rankwoven-seo'),
                [$this, 'render_editor_seo_meta_box'],
                $post_type,
                'normal',
                'high'
            );
        }
    }

    public function enqueue_admin_assets(string $hook_suffix): void
    {
        $page = sanitize_key(wp_unslash($_GET['page'] ?? ''));
        if ($page === '' || strpos($page, 'rankwoven-seo') !== 0) {
            return;
        }

        wp_enqueue_style(
            'rankwoven-admin',
            plugin_dir_url(__FILE__) . 'assets/admin.css',
            [],
            self::VERSION
        );
    }

    public function enqueue_editor_seo_assets(string $hook_suffix): void
    {
        if (!in_array($hook_suffix, ['post.php', 'post-new.php'], true)) {
            return;
        }

        $screen = function_exists('get_current_screen') ? get_current_screen() : null;
        if (!$screen || !in_array((string) ($screen->post_type ?? ''), $this->get_supported_editor_post_types(), true)) {
            return;
        }

        wp_enqueue_script(
            'rankwoven-editor-seo',
            plugin_dir_url(__FILE__) . 'assets/editor-seo.js',
            ['wp-data'],
            self::VERSION,
            true
        );

        wp_localize_script('rankwoven-editor-seo', 'rankwovenEditorSeoConfig', [
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('rankwoven_editor_seo'),
            'postType' => (string) ($screen->post_type ?? ''),
            'supportedPostTypes' => $this->get_supported_editor_post_types()
        ]);
    }

    public function render_editor_seo_meta_box(WP_Post $post): void
    {
        $focus_keyphrase = $this->get_post_focus_keyphrase($post);
        $seo_title = $this->get_post_seo_title($post);
        $saved_seo_title = sanitize_text_field((string) get_post_meta($post->ID, self::META_EDITOR_SEO_TITLE, true));
        if ($saved_seo_title !== '') {
            $seo_title = $saved_seo_title;
        }

        $meta_description = sanitize_textarea_field($this->get_post_meta_description($post, wp_strip_all_tags((string) $post->post_excerpt)));
        $meta_keywords = $this->get_post_meta_keywords($post);
        $seo_score = max(0, min(100, (int) get_post_meta($post->ID, self::META_EDITOR_SEO_SCORE, true)));
        $analysis = sanitize_textarea_field((string) get_post_meta($post->ID, self::META_EDITOR_ANALYSIS, true));
        $slug = sanitize_title((string) $post->post_name);
        $api_ready = $this->get_api_base_url() !== ''
            && sanitize_text_field(get_option(self::OPTION_SITE_ID, '')) !== ''
            && sanitize_text_field(get_option(self::OPTION_SITE_TOKEN, '')) !== '';
        ?>
        <div id="rankwoven-editor-seo-metabox" class="rankwoven-editor-seo-metabox">
            <?php wp_nonce_field('rankwoven_editor_seo_fields', 'rankwoven_editor_seo_fields_nonce'); ?>
            <p>
                <?php echo esc_html__('Use the current title, content, and focus keyphrase to generate SEO title, slug, and meta description.', 'rankwoven-seo'); ?>
            </p>
            <?php if (!$api_ready) : ?>
                <p class="description">
                    <?php echo esc_html__('AI generation requires a configured RankWoven site connection. You can still save manual SEO fields.', 'rankwoven-seo'); ?>
                </p>
            <?php endif; ?>
            <p>
                <label for="rankwoven_focus_keyphrase" style="display:block;font-weight:600;margin-bottom:6px;">
                    <?php echo esc_html__('Focus keyphrase', 'rankwoven-seo'); ?>
                </label>
                <input type="text" id="rankwoven_focus_keyphrase" name="rankwoven_focus_keyphrase" class="widefat" value="<?php echo esc_attr($focus_keyphrase); ?>" />
            </p>
            <p>
                <label for="rankwoven_seo_title" style="display:block;font-weight:600;margin-bottom:6px;">
                    <?php echo esc_html__('SEO title', 'rankwoven-seo'); ?>
                </label>
                <input type="text" id="rankwoven_seo_title" name="rankwoven_seo_title" class="widefat" value="<?php echo esc_attr($seo_title); ?>" />
            </p>
            <p>
                <label for="rankwoven_seo_slug" style="display:block;font-weight:600;margin-bottom:6px;">
                    <?php echo esc_html__('Slug', 'rankwoven-seo'); ?>
                </label>
                <input type="text" id="rankwoven_seo_slug" name="rankwoven_seo_slug" class="widefat" value="<?php echo esc_attr($slug); ?>" />
            </p>
            <p>
                <label for="rankwoven_meta_description" style="display:block;font-weight:600;margin-bottom:6px;">
                    <?php echo esc_html__('Meta description', 'rankwoven-seo'); ?>
                </label>
                <textarea id="rankwoven_meta_description" name="rankwoven_meta_description" class="widefat" rows="4"><?php echo esc_textarea($meta_description); ?></textarea>
            </p>
            <p>
                <label for="rankwoven_meta_keywords" style="display:block;font-weight:600;margin-bottom:6px;">
                    <?php echo esc_html__('Keywords', 'rankwoven-seo'); ?>
                </label>
                <input type="text" id="rankwoven_meta_keywords" name="rankwoven_meta_keywords" class="widefat" value="<?php echo esc_attr($meta_keywords); ?>" />
                <span class="description">
                    <?php echo esc_html__('Separate keywords with commas.', 'rankwoven-seo'); ?>
                </span>
            </p>
            <p>
                <label for="rankwoven_seo_score" style="display:block;font-weight:600;margin-bottom:6px;">
                    <?php echo esc_html__('Content SEO score', 'rankwoven-seo'); ?>
                </label>
                <input
                    type="text"
                    id="rankwoven_seo_score"
                    class="regular-text"
                    value="<?php echo esc_attr($seo_score > 0 ? sprintf('%d/100', $seo_score) : '0/100'); ?>"
                    readonly
                />
            </p>
            <p>
                <label for="rankwoven_seo_analysis" style="display:block;font-weight:600;margin-bottom:6px;">
                    <?php echo esc_html__('Analysis', 'rankwoven-seo'); ?>
                </label>
                <textarea id="rankwoven_seo_analysis" class="widefat" rows="4" readonly><?php echo esc_textarea($analysis); ?></textarea>
            </p>
            <p class="rankwoven-editor-seo-actions">
                <button type="button" class="button button-primary" data-rankwoven-editor-seo-action="generate"<?php echo $api_ready ? '' : ' disabled'; ?>>
                    <?php echo esc_html__('Generate & Apply SEO', 'rankwoven-seo'); ?>
                </button>
                <button type="button" class="button" data-rankwoven-editor-seo-action="save">
                    <?php echo esc_html__('Save SEO Fields', 'rankwoven-seo'); ?>
                </button>
            </p>
            <p class="description" data-rankwoven-editor-seo-status>
                <?php echo esc_html__('Saved values are stored with the current post and can be generated again at any time.', 'rankwoven-seo'); ?>
            </p>
        </div>
        <?php
    }

    private function get_post_seo_title(WP_Post $post): string
    {
        $meta_keys = $this->get_editor_seo_title_meta_keys();
        foreach ($meta_keys as $meta_key) {
            $value = sanitize_text_field((string) get_post_meta($post->ID, $meta_key, true));
            if ($value !== '') {
                return $value;
            }
        }

        $content_meta_settings = $this->get_content_meta_settings_for_post_type($post->post_type);
        $template = sanitize_text_field((string) ($content_meta_settings['seo_title_template'] ?? ''));
        if ($template !== '') {
            $rendered = $this->render_content_meta_template($template, $post, wp_strip_all_tags((string) $post->post_excerpt));
            if ($rendered !== '') {
                return sanitize_text_field($rendered);
            }
        }

        $title = get_the_title($post);
        return is_string($title) ? sanitize_text_field($title) : '';
    }

    private function get_editor_seo_title_meta_keys(): array
    {
        return [
            self::META_EDITOR_SEO_TITLE,
            '_yoast_wpseo_title',
            'rank_math_title',
            '_aioseo_title',
            '_aioseop_title'
        ];
    }

    private function get_editor_seo_meta_description_keys(): array
    {
        return [
            self::META_EDITOR_META_DESCRIPTION,
            '_yoast_wpseo_metadesc',
            'rank_math_description',
            '_aioseo_description',
            '_aioseop_description'
        ];
    }

    private function get_post_meta_keywords(WP_Post $post): string
    {
        $keywords = get_post_meta($post->ID, self::META_EDITOR_META_KEYWORDS, true);
        $keywords = $this->sanitize_editor_meta_keywords($keywords);
        if ($keywords !== '') {
            return $keywords;
        }

        $content_meta_settings = $this->get_content_meta_settings_for_post_type($post->post_type);
        $template = sanitize_text_field((string) ($content_meta_settings['meta_keywords_template'] ?? ''));
        if ($template === '') {
            return '';
        }

        $rendered = $this->render_content_meta_template($template, $post, wp_strip_all_tags((string) $post->post_excerpt));
        return $this->sanitize_editor_meta_keywords($rendered);
    }

    private function get_post_focus_keyphrase(WP_Post $post): string
    {
        return sanitize_text_field((string) get_post_meta($post->ID, self::META_EDITOR_FOCUS_KEYPHRASE, true));
    }

    private function sanitize_editor_meta_keywords($value): string
    {
        if (is_array($value)) {
            $value = implode(',', array_map('strval', $value));
        }

        $raw_keywords = str_replace(["\r", "\n", ';', '，'], ',', wp_strip_all_tags((string) $value));
        $parts = preg_split('/\s*,\s*/', sanitize_text_field($raw_keywords)) ?: [];
        $keywords = [];

        foreach ($parts as $part) {
            $keyword = trim($part);
            if ($keyword !== '' && !in_array($keyword, $keywords, true)) {
                $keywords[] = $keyword;
            }
        }

        return implode(', ', $keywords);
    }

    public function render_frontend_seo_meta_tags(): void
    {
        if (is_admin() || !is_singular($this->get_supported_editor_post_types())) {
            return;
        }

        $post = get_queried_object();
        if (!($post instanceof WP_Post)) {
            return;
        }

        $description = $this->get_post_meta_description($post, wp_strip_all_tags((string) $post->post_excerpt));
        $keywords = $this->get_post_meta_keywords($post);
        $title = $this->get_post_seo_title($post);
        $site_name = sanitize_text_field((string) get_bloginfo('name'));
        $preview_image = $this->get_post_preview_image($post);
        $image_url = (string) ($preview_image['url'] ?? '');
        $image_alt = (string) ($preview_image['alt'] ?? '');
        $twitter_username = $this->get_twitter_username($post);
        $facebook_app_id = $this->get_facebook_app_id($post);
        $canonical_url = get_permalink($post);
        $url = is_string($canonical_url) ? esc_url_raw($canonical_url) : '';

        echo "\n";
        $this->render_head_meta_tag(['name' => 'description', 'content' => $description]);
        $this->render_head_meta_tag(['name' => 'keywords', 'content' => $keywords]);

        echo '<!-- Google+ -->' . "\n";
        $this->render_head_meta_tag(['itemprop' => 'name', 'content' => $title]);
        $this->render_head_meta_tag(['itemprop' => 'description', 'content' => $description]);
        $this->render_head_meta_tag(['itemprop' => 'image', 'content' => $image_url]);

        echo '<!-- Weibo -->' . "\n";
        $this->render_head_meta_tag(['name' => 'weibo:type', 'content' => 'webpage']);
        $this->render_head_meta_tag(['name' => 'weibo:webpage:title', 'content' => $title]);
        $this->render_head_meta_tag(['name' => 'weibo:webpage:description', 'content' => $description]);
        $this->render_head_meta_tag(['name' => 'weibo:webpage:image', 'content' => $image_url]);

        echo '<!-- Twitter Card -->' . "\n";
        $this->render_head_meta_tag(['name' => 'twitter:card', 'content' => 'summary']);
        $this->render_head_meta_tag(['name' => 'twitter:site', 'content' => $twitter_username]);
        $this->render_head_meta_tag(['name' => 'twitter:title', 'content' => $title]);
        $this->render_head_meta_tag(['name' => 'twitter:description', 'content' => $description]);
        $this->render_head_meta_tag(['name' => 'twitter:creator', 'content' => $twitter_username]);
        $this->render_head_meta_tag(['name' => 'twitter:image', 'content' => $image_url]);
        $this->render_head_meta_tag(['name' => 'twitter:image:alt', 'content' => $image_alt]);

        echo '<!-- LinkedIn / Facebook -->' . "\n";
        $this->render_head_meta_tag(['property' => 'fb:app_id', 'content' => $facebook_app_id]);
        $this->render_head_meta_tag(['prefix' => 'og: http://ogp.me/ns#', 'property' => 'og:type', 'content' => 'website']);
        $this->render_head_meta_tag(['prefix' => 'og: http://ogp.me/ns#', 'property' => 'og:title', 'content' => $title]);
        $this->render_head_meta_tag(['prefix' => 'og: http://ogp.me/ns#', 'property' => 'og:image', 'content' => $image_url]);
        $this->render_head_meta_tag(['prefix' => 'og: http://ogp.me/ns#', 'property' => 'og:site_name', 'content' => $site_name]);
        $this->render_head_meta_tag(['prefix' => 'og: http://ogp.me/ns#', 'property' => 'og:description', 'content' => $description]);
        $this->render_head_meta_tag(['prefix' => 'og: http://ogp.me/ns#', 'property' => 'og:url', 'content' => $url]);
    }

    public function maybe_render_sitemap_xml(): void
    {
        if (!$this->is_sitemap_request()) {
            return;
        }

        $xml = $this->build_sitemap_xml($this->get_sitemap_entries());

        nocache_headers();
        status_header(200);
        header('Content-Type: application/xml; charset=UTF-8');
        echo $xml;
        exit;
    }

    public function append_sitemap_to_robots_txt(string $output, bool $public): string
    {
        if (!$public) {
            return $output;
        }

        $sitemap_url = $this->get_sitemap_url();
        if (str_contains($output, $sitemap_url)) {
            return $output;
        }

        $trimmed_output = rtrim($output);
        $suffix = $trimmed_output === '' ? '' : "\n";

        return $trimmed_output . $suffix . 'Sitemap: ' . $sitemap_url . "\n";
    }

    public function disable_core_sitemap_redirect($redirect_url, $requested_url)
    {
        if ($this->is_sitemap_request()) {
            return false;
        }

        return $redirect_url;
    }

    private function get_post_preview_image(WP_Post $post): array
    {
        $image_id = (int) get_post_thumbnail_id($post->ID);
        if ($image_id > 0) {
            $image_url = wp_get_attachment_image_url($image_id, 'full');
            if (is_string($image_url) && $image_url !== '') {
                $image_alt = sanitize_text_field((string) get_post_meta($image_id, '_wp_attachment_image_alt', true));
                if ($image_alt === '') {
                    $image_alt = sanitize_text_field((string) get_the_title($image_id));
                }

                return [
                    'url' => esc_url_raw($image_url),
                    'alt' => $image_alt
                ];
            }
        }

        $site_icon_url = function_exists('get_site_icon_url') ? get_site_icon_url(512) : '';
        if (is_string($site_icon_url) && $site_icon_url !== '') {
            return [
                'url' => esc_url_raw($site_icon_url),
                'alt' => sanitize_text_field((string) get_bloginfo('name'))
            ];
        }

        return [
            'url' => '',
            'alt' => ''
        ];
    }

    private function get_twitter_username(WP_Post $post): string
    {
        $saved_username = sanitize_text_field((string) get_option(self::OPTION_TWITTER_USERNAME, ''));
        $username = apply_filters('rankwoven_seo_twitter_username', $saved_username, $post);
        if (!is_string($username)) {
            return '';
        }

        $normalized_username = ltrim(sanitize_text_field($username), '@');
        return $normalized_username !== '' ? '@' . $normalized_username : '';
    }

    private function get_facebook_app_id(WP_Post $post): string
    {
        $saved_app_id = sanitize_text_field((string) get_option(self::OPTION_FACEBOOK_APP_ID, ''));
        $app_id = apply_filters('rankwoven_seo_facebook_app_id', $saved_app_id, $post);
        return is_string($app_id) ? sanitize_text_field($app_id) : '';
    }

    private function render_head_meta_tag(array $attributes): void
    {
        $content = (string) ($attributes['content'] ?? '');
        if ($content === '') {
            return;
        }

        $html_attributes = [];
        foreach ($attributes as $name => $value) {
            $normalized_name = sanitize_key((string) $name);
            if ($normalized_name === '') {
                continue;
            }

            $html_attributes[] = sprintf('%s="%s"', $normalized_name, esc_attr((string) $value));
        }

        if ($html_attributes !== []) {
            echo '<meta ' . implode(' ', $html_attributes) . '>' . "\n";
        }
    }

    private function normalize_editor_seo_slug(string $value, string $fallback = ''): string
    {
        $slug = sanitize_title($value);
        if ($slug === '' && $fallback !== '') {
            $slug = sanitize_title($fallback);
        }

        return $slug !== '' ? $slug : 'rankwoven-seo';
    }

    private function truncate_editor_seo_text(string $value, int $max_length): string
    {
        $trimmed = trim(wp_strip_all_tags($value));
        if ($trimmed === '') {
            return '';
        }

        if (function_exists('mb_strlen') && function_exists('mb_substr')) {
            return mb_strlen($trimmed) <= $max_length ? $trimmed : trim((string) mb_substr($trimmed, 0, $max_length));
        }

        return strlen($trimmed) <= $max_length ? $trimmed : trim(substr($trimmed, 0, $max_length));
    }

    private function build_local_editor_seo_values(
        string $focus_keyphrase,
        string $current_title,
        string $current_seo_title,
        string $current_slug,
        string $current_meta_description,
        string $excerpt,
        string $content_html,
        string $fallback_reason = ''
    ): array {
        $normalized_keyphrase = trim(wp_strip_all_tags($focus_keyphrase));
        $normalized_title = trim(wp_strip_all_tags($current_title));
        $normalized_seo_title = trim(wp_strip_all_tags($current_seo_title));
        $normalized_excerpt = trim(wp_strip_all_tags($excerpt));
        $normalized_content = trim(wp_strip_all_tags($content_html));
        $seed_title = $normalized_seo_title !== ''
            ? $normalized_seo_title
            : ($normalized_title !== '' ? $normalized_title : $normalized_keyphrase);
        $seo_title_base = $normalized_keyphrase !== ''
            ? sprintf('%s - %s', $normalized_keyphrase, $seed_title)
            : $seed_title;
        $seo_title = $this->truncate_editor_seo_text($seo_title_base, 65);

        if ($seo_title === '') {
            $seo_title = $this->truncate_editor_seo_text($seed_title !== '' ? $seed_title : __('RankWoven SEO 建議', 'rankwoven-seo'), 65);
        }

        $slug_seed = $normalized_keyphrase !== ''
            ? $normalized_keyphrase
            : ($current_slug !== '' ? $current_slug : $seed_title);
        $slug = $this->normalize_editor_seo_slug($slug_seed, $seed_title);

        $meta_source = trim(wp_strip_all_tags($current_meta_description));
        if ($meta_source === '') {
            $meta_source = $normalized_excerpt !== '' ? $normalized_excerpt : ($normalized_content !== '' ? $normalized_content : $seed_title);
        }

        $meta_description_base = $normalized_keyphrase !== ''
            ? sprintf('%s。圍繞 %s 進一步優化頁面結構、標題與可讀性。', $meta_source, $normalized_keyphrase)
            : sprintf('%s。', $meta_source);
        $meta_description = $this->truncate_editor_seo_text($meta_description_base, 160);

        $score_data = $this->calculate_local_editor_seo_score(
            $normalized_keyphrase,
            $seo_title,
            $slug,
            $meta_description,
            $content_html
        );

        $analysis = (string) ($score_data['analysis'] ?? '');
        if ($fallback_reason !== '') {
            $friendly_reason = $fallback_reason;
            if (str_contains($fallback_reason, '/editor-seo not found')) {
                $friendly_reason = __('正式 API 尚未部署 AI SEO 生成路由。', 'rankwoven-seo');
            } elseif (str_contains($fallback_reason, 'cURL error') || str_contains($fallback_reason, 'wp_remote_post')) {
                $friendly_reason = __('外掛暫時無法連接遠端 AI 服務。', 'rankwoven-seo');
            }

            $analysis = sprintf(
                /* translators: 1: fallback reason, 2: local analysis summary */
                __('遠端 AI 服務暫時不可用，已改用本地 SEO 建議。原因：%1$s %2$s', 'rankwoven-seo'),
                $friendly_reason,
                $analysis
            );
        }

        return [
            'seoTitle' => $seo_title,
            'slug' => $slug,
            'seoScore' => max(0, min(100, (int) ($score_data['seoScore'] ?? 0))),
            'scoreSummary' => (string) ($score_data['analysis'] ?? ''),
            'metaDescription' => $meta_description,
            'analysis' => trim($analysis)
        ];
    }

    private function calculate_local_editor_seo_score(
        string $focus_keyphrase,
        string $seo_title,
        string $slug,
        string $meta_description,
        string $content_html
    ): array {
        $normalized_keyphrase = function_exists('mb_strtolower')
            ? mb_strtolower(trim(wp_strip_all_tags($focus_keyphrase)))
            : strtolower(trim(wp_strip_all_tags($focus_keyphrase)));
        $normalized_title = trim(wp_strip_all_tags($seo_title));
        $normalized_meta_description = trim(wp_strip_all_tags($meta_description));
        $normalized_content = trim(wp_strip_all_tags($content_html));
        $lower_title = function_exists('mb_strtolower') ? mb_strtolower($normalized_title) : strtolower($normalized_title);
        $lower_meta_description = function_exists('mb_strtolower') ? mb_strtolower($normalized_meta_description) : strtolower($normalized_meta_description);
        $lower_content = function_exists('mb_strtolower') ? mb_strtolower($normalized_content) : strtolower($normalized_content);
        $title_length = function_exists('mb_strlen') ? mb_strlen($normalized_title) : strlen($normalized_title);
        $meta_length = function_exists('mb_strlen') ? mb_strlen($normalized_meta_description) : strlen($normalized_meta_description);
        $content_length = function_exists('mb_strlen') ? mb_strlen($normalized_content) : strlen($normalized_content);
        $h1_count = preg_match_all('/<h1\b/i', $content_html, $matches);
        $internal_link_count = preg_match_all('/<a\s+[^>]*href=["\'][^"\']+["\']/i', $content_html, $matches);

        $score = 0;
        $messages = [];

        if ($title_length >= 25 && $title_length <= 65) {
            $score += 15;
        } elseif ($title_length >= 15 && $title_length <= 80) {
            $score += 8;
            $messages[] = __('SEO title 可再調整到 25-65 字之間。', 'rankwoven-seo');
        } else {
            $messages[] = __('SEO title 過短或過長，建議調整到 25-65 字。', 'rankwoven-seo');
        }

        if ($normalized_keyphrase === '') {
            $messages[] = __('尚未設定 Focus keyphrase，無法評估關鍵詞相關性。', 'rankwoven-seo');
        } else {
            if ($lower_title !== '' && str_contains($lower_title, $normalized_keyphrase)) {
                $score += 15;
            } else {
                $messages[] = __('SEO title 尚未包含 Focus keyphrase。', 'rankwoven-seo');
            }

            if ($lower_meta_description !== '' && str_contains($lower_meta_description, $normalized_keyphrase)) {
                $score += 10;
            } else {
                $messages[] = __('Meta description 尚未包含 Focus keyphrase。', 'rankwoven-seo');
            }

            if ($lower_content !== '' && str_contains($lower_content, $normalized_keyphrase)) {
                $score += 10;
            } else {
                $messages[] = __('內容正文尚未包含 Focus keyphrase。', 'rankwoven-seo');
            }
        }

        if ($meta_length >= 70 && $meta_length <= 160) {
            $score += 15;
        } elseif ($meta_length >= 50 && $meta_length <= 180) {
            $score += 8;
            $messages[] = __('Meta description 可再調整到 70-160 字之間。', 'rankwoven-seo');
        } else {
            $messages[] = __('Meta description 過短、缺失或過長。', 'rankwoven-seo');
        }

        if ($slug !== '') {
            $score += 10;
        } else {
            $messages[] = __('Slug 為空或不利於 SEO。', 'rankwoven-seo');
        }

        if ($content_length >= 300) {
            $score += 10;
        } elseif ($content_length >= 150) {
            $score += 5;
            $messages[] = __('內容略短，建議補充更多主題細節。', 'rankwoven-seo');
        } else {
            $messages[] = __('內容過短，難以支撐主要關鍵詞排名。', 'rankwoven-seo');
        }

        if ($h1_count === 1) {
            $score += 10;
        } elseif ($h1_count === 0) {
            $messages[] = __('內容缺少 H1，建議保留一個主標題。', 'rankwoven-seo');
        } else {
            $score += 5;
            $messages[] = __('內容有多個 H1，建議只保留一個。', 'rankwoven-seo');
        }

        if ($internal_link_count >= 2) {
            $score += 5;
        } elseif ($internal_link_count === 1) {
            $score += 3;
            $messages[] = __('建議再補至少一條內部連結。', 'rankwoven-seo');
        } else {
            $messages[] = __('內容尚未包含內部連結。', 'rankwoven-seo');
        }

        $summary = empty($messages)
            ? __('目前內容 SEO 分數 100/100。主要 SEO 檢查項均已達標。', 'rankwoven-seo')
            : sprintf(
                /* translators: 1: SEO score, 2: optimization hints */
                __('目前內容 SEO 分數 %1$d/100。待優化：%2$s', 'rankwoven-seo'),
                $score,
                implode('；', $messages)
            );

        return [
            'seoScore' => max(0, min(100, $score)),
            'analysis' => $summary
        ];
    }

    private function save_editor_seo_meta_value(int $post_id, string $meta_key, string $value): void
    {
        if ($value === '') {
            delete_post_meta($post_id, $meta_key);
            return;
        }

        update_post_meta($post_id, $meta_key, $value);
    }

    private function sync_editor_seo_meta_keys(int $post_id, string $seo_title, string $meta_description): void
    {
        foreach ($this->get_editor_seo_title_meta_keys() as $meta_key) {
            $this->save_editor_seo_meta_value($post_id, $meta_key, $seo_title);
        }

        foreach ($this->get_editor_seo_meta_description_keys() as $meta_key) {
            $this->save_editor_seo_meta_value($post_id, $meta_key, $meta_description);
        }
    }

    private function generate_editor_seo_values_from_api(array $payload)
    {
        $api_base_url = $this->get_api_base_url();
        $site_id = sanitize_text_field(get_option(self::OPTION_SITE_ID, ''));
        $site_token = sanitize_text_field(get_option(self::OPTION_SITE_TOKEN, ''));

        if ($api_base_url === '' || $site_id === '' || $site_token === '') {
            return new WP_Error('rankwoven_editor_seo_not_configured', __('RankWoven site connection is not configured.', 'rankwoven-seo'));
        }

        $response = wp_remote_post(
            $this->build_api_url('/api/v1/site-connections/' . rawurlencode($site_id) . '/editor-seo'),
            [
                'timeout' => 45,
                'headers' => [
                    'Authorization' => 'Bearer ' . $site_token,
                    'Content-Type' => 'application/json'
                ],
                'body' => wp_json_encode($payload)
            ]
        );

        if (is_wp_error($response)) {
            return new WP_Error('rankwoven_editor_seo_generate_failed', $response->get_error_message());
        }

        $body = $this->decode_response_body($response);
        if (!($body['success'] ?? false) || empty($body['data']) || !is_array($body['data'])) {
            $message = is_string($body['message'] ?? null) ? $body['message'] : __('SEO generation failed.', 'rankwoven-seo');
            return new WP_Error('rankwoven_editor_seo_generate_failed', $message);
        }

        $data = $body['data'];
        $seo_title = sanitize_text_field((string) ($data['seoTitle'] ?? ''));
        $slug = $this->normalize_editor_seo_slug((string) ($data['slug'] ?? ''), (string) ($payload['currentTitle'] ?? ''));
        $meta_description = sanitize_textarea_field((string) ($data['metaDescription'] ?? ''));
        $meta_keywords = $this->sanitize_editor_meta_keywords($data['metaKeywords'] ?? $data['keywords'] ?? $payload['currentMetaKeywords'] ?? '');
        $seo_score = max(0, min(100, (int) ($data['seoScore'] ?? 0)));
        $score_summary = sanitize_textarea_field((string) ($data['scoreSummary'] ?? ''));
        $analysis = sanitize_textarea_field((string) ($data['analysis'] ?? ''));

        if ($seo_title === '') {
            $seo_title = sanitize_text_field((string) ($payload['currentSeoTitle'] ?? $payload['currentTitle'] ?? ''));
        }

        if ($meta_description === '') {
            $meta_description = sanitize_textarea_field((string) ($payload['currentMetaDescription'] ?? ''));
        }

        if ($analysis === '') {
            $analysis = $score_summary !== ''
                ? $score_summary
                : __('SEO suggestions generated successfully.', 'rankwoven-seo');
        }

        return [
            'seoTitle' => $seo_title,
            'slug' => $slug,
            'seoScore' => $seo_score,
            'scoreSummary' => $score_summary,
            'metaDescription' => $meta_description,
            'metaKeywords' => $meta_keywords,
            'analysis' => $analysis
        ];
    }

    public function handle_editor_seo_ajax(): void
    {
        check_ajax_referer('rankwoven_editor_seo', 'nonce');

        $post_id = (int) ($_POST['postId'] ?? 0);
        $post = get_post($post_id);

        if (!($post instanceof WP_Post) || !in_array($post->post_type, $this->get_supported_editor_post_types(), true)) {
            wp_send_json_error([
                'message' => __('Post not found or not supported.', 'rankwoven-seo')
            ], 404);
        }

        if (!current_user_can('edit_post', $post_id)) {
            wp_send_json_error([
                'message' => __('You do not have permission to edit this post.', 'rankwoven-seo')
            ], 403);
        }

        $mode = sanitize_key(wp_unslash($_POST['mode'] ?? 'save'));
        $focus_keyphrase = sanitize_text_field(wp_unslash($_POST['focusKeyphrase'] ?? ''));
        $seo_title = sanitize_text_field(wp_unslash($_POST['seoTitle'] ?? ''));
        $slug = sanitize_title(wp_unslash($_POST['slug'] ?? ''));
        $meta_description = sanitize_textarea_field(wp_unslash($_POST['metaDescription'] ?? ''));
        $meta_keywords = $this->sanitize_editor_meta_keywords(wp_unslash($_POST['metaKeywords'] ?? ''));
        $seo_score = max(0, min(100, (int) ($_POST['seoScore'] ?? 0)));
        $analysis = sanitize_textarea_field(wp_unslash($_POST['analysis'] ?? ''));
        $current_title = sanitize_text_field(wp_unslash($_POST['currentTitle'] ?? $post->post_title));
        $current_seo_title = sanitize_text_field(wp_unslash($_POST['currentSeoTitle'] ?? $seo_title));
        $current_slug = sanitize_title(wp_unslash($_POST['currentSlug'] ?? $post->post_name));
        $content_html = wp_kses_post(wp_unslash($_POST['contentHtml'] ?? $post->post_content));
        $excerpt = wp_kses_post(wp_unslash($_POST['excerpt'] ?? $post->post_excerpt));
        $locale = sanitize_text_field(wp_unslash($_POST['locale'] ?? get_locale()));

        if ($mode === 'generate' && $this->get_api_base_url() !== '' && sanitize_text_field(get_option(self::OPTION_SITE_ID, '')) !== '' && sanitize_text_field(get_option(self::OPTION_SITE_TOKEN, '')) !== '') {
            $generated = $this->generate_editor_seo_values_from_api([
                'mode' => $mode === 'generate' ? 'generate' : 'analyze',
                'postType' => $post->post_type,
                'currentTitle' => $current_title,
                'currentSeoTitle' => $current_seo_title,
                'currentSlug' => $current_slug,
                'focusKeyphrase' => $focus_keyphrase,
                'excerpt' => $excerpt,
                'contentHtml' => $content_html,
                'currentMetaDescription' => $meta_description,
                'currentMetaKeywords' => $meta_keywords,
                'locale' => $locale
            ]);

            if (is_wp_error($generated)) {
                $generated = $this->build_local_editor_seo_values(
                    $focus_keyphrase,
                    $current_title,
                    $current_seo_title,
                    $current_slug,
                    $meta_description,
                    $excerpt,
                    $content_html,
                    $generated->get_error_message()
                );
            }

            $seo_title = sanitize_text_field((string) ($generated['seoTitle'] ?? ''));
            $slug = $this->normalize_editor_seo_slug((string) ($generated['slug'] ?? ''), $current_title);
            $seo_score = max(0, min(100, (int) ($generated['seoScore'] ?? 0)));
            $meta_description = sanitize_textarea_field((string) ($generated['metaDescription'] ?? ''));
            $meta_keywords = $this->sanitize_editor_meta_keywords($generated['metaKeywords'] ?? $meta_keywords);
            $analysis = sanitize_textarea_field((string) ($generated['analysis'] ?? ''));
        }

        if ($mode === 'save') {
            $local_analysis = $this->calculate_local_editor_seo_score(
                $focus_keyphrase,
                $seo_title !== '' ? $seo_title : $current_seo_title,
                $slug !== '' ? $slug : $current_slug,
                $meta_description,
                $content_html
            );
            $seo_score = max(0, min(100, (int) ($local_analysis['seoScore'] ?? 0)));
            $analysis = sanitize_textarea_field((string) ($local_analysis['analysis'] ?? $analysis));
        }

        $save_result = wp_update_post(wp_slash([
            'ID' => $post_id,
            'post_name' => $slug !== '' ? $slug : $current_slug
        ]), true);

        if (is_wp_error($save_result)) {
            wp_send_json_error([
                'message' => $save_result->get_error_message()
            ], 500);
        }

        $this->save_editor_seo_meta_value($post_id, self::META_EDITOR_FOCUS_KEYPHRASE, $focus_keyphrase);
        $this->save_editor_seo_meta_value($post_id, self::META_EDITOR_SEO_TITLE, $seo_title);
        update_post_meta($post_id, self::META_EDITOR_SEO_SCORE, $seo_score);
        $this->save_editor_seo_meta_value($post_id, self::META_EDITOR_META_DESCRIPTION, $meta_description);
        $this->save_editor_seo_meta_value($post_id, self::META_EDITOR_META_KEYWORDS, $meta_keywords);
        $this->save_editor_seo_meta_value($post_id, self::META_EDITOR_ANALYSIS, $analysis);
        $this->sync_editor_seo_meta_keys($post_id, $seo_title, $meta_description);

        wp_send_json_success([
            'postId' => $post_id,
            'postType' => $post->post_type,
            'focusKeyphrase' => $focus_keyphrase,
            'seoTitle' => $seo_title,
            'slug' => $slug !== '' ? $slug : $current_slug,
            'seoScore' => $seo_score,
            'metaDescription' => $meta_description,
            'metaKeywords' => $meta_keywords,
            'analysis' => $analysis,
            'mode' => $mode
        ]);
    }

    public function handle_editor_seo_post_save(int $post_id, $post): void
    {
        if (!($post instanceof WP_Post)) {
            $post = get_post($post_id);
        }

        if (!($post instanceof WP_Post)) {
            return;
        }

        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
            return;
        }

        if (wp_is_post_revision($post_id) || wp_is_post_autosave($post_id)) {
            return;
        }

        if (!in_array($post->post_type, $this->get_supported_editor_post_types(), true)) {
            return;
        }

        $nonce = sanitize_text_field(wp_unslash($_POST['rankwoven_editor_seo_fields_nonce'] ?? ''));
        if ($nonce === '' || !wp_verify_nonce($nonce, 'rankwoven_editor_seo_fields')) {
            return;
        }

        if (!current_user_can('edit_post', $post_id)) {
            return;
        }

        $focus_keyphrase = sanitize_text_field(wp_unslash($_POST['rankwoven_focus_keyphrase'] ?? ''));
        $seo_title = sanitize_text_field(wp_unslash($_POST['rankwoven_seo_title'] ?? ''));
        $slug = sanitize_title(wp_unslash($_POST['rankwoven_seo_slug'] ?? $post->post_name));
        $meta_description = sanitize_textarea_field(wp_unslash($_POST['rankwoven_meta_description'] ?? ''));
        $meta_keywords = $this->sanitize_editor_meta_keywords(wp_unslash($_POST['rankwoven_meta_keywords'] ?? ''));

        $local_analysis = $this->calculate_local_editor_seo_score(
            $focus_keyphrase,
            $seo_title !== '' ? $seo_title : sanitize_text_field((string) get_the_title($post_id)),
            $slug !== '' ? $slug : sanitize_title($post->post_name),
            $meta_description,
            (string) $post->post_content
        );

        $this->save_editor_seo_meta_value($post_id, self::META_EDITOR_FOCUS_KEYPHRASE, $focus_keyphrase);
        $this->save_editor_seo_meta_value($post_id, self::META_EDITOR_SEO_TITLE, $seo_title);
        update_post_meta($post_id, self::META_EDITOR_SEO_SCORE, max(0, min(100, (int) ($local_analysis['seoScore'] ?? 0))));
        $this->save_editor_seo_meta_value($post_id, self::META_EDITOR_META_DESCRIPTION, $meta_description);
        $this->save_editor_seo_meta_value($post_id, self::META_EDITOR_META_KEYWORDS, $meta_keywords);
        $this->save_editor_seo_meta_value($post_id, self::META_EDITOR_ANALYSIS, sanitize_textarea_field((string) ($local_analysis['analysis'] ?? '')));
        $this->sync_editor_seo_meta_keys($post_id, $seo_title, $meta_description);
    }

    public function render_admin_page(): void
    {
        if (!current_user_can('manage_options')) {
            return;
        }

        $api_base_url = get_option(self::OPTION_API_BASE_URL, 'http://localhost:3011');
        $site_id = get_option(self::OPTION_SITE_ID, '');
        $ga4_property_id = get_option(self::OPTION_GA4_PROPERTY_ID, '');
        $twitter_username = get_option(self::OPTION_TWITTER_USERNAME, '');
        $facebook_app_id = get_option(self::OPTION_FACEBOOK_APP_ID, '');
        $wp_admin_username = get_option(self::OPTION_WP_ADMIN_USERNAME, '');
        $wp_application_password = get_option(self::OPTION_WP_APPLICATION_PASSWORD, '');
        $last_sync_result = get_option(self::OPTION_LAST_SYNC_RESULT, []);
        $active_tab = $this->get_active_admin_tab();
        $connection_label = $this->is_saas_site_ready()
            ? __('Connected to RankWoven SaaS', 'rankwoven-seo')
            : __('Connection required', 'rankwoven-seo');
        ?>
        <div class="wrap rankwoven-admin-wrap">
            <section class="rankwoven-admin-hero">
                <div>
                    <span class="rankwoven-eyebrow"><?php echo esc_html__('AI SEO Control Center', 'rankwoven-seo'); ?></span>
                    <h1><?php echo esc_html__('RankWoven SEO', 'rankwoven-seo'); ?></h1>
                    <p>
                        <?php echo esc_html__('Manage search appearance, SEO analysis, sitemap submission, image attributes, and safe internal-link writeback from one WordPress-native panel.', 'rankwoven-seo'); ?>
                    </p>
                </div>
                <span class="rankwoven-status-pill <?php echo $this->is_saas_site_ready() ? 'is-ready' : 'is-warning'; ?>">
                    <?php echo esc_html($connection_label); ?>
                </span>
            </section>
            <?php $this->render_admin_notice(); ?>
            <?php $this->render_admin_tabs($active_tab); ?>

            <?php if ($active_tab === 'dashboard') : ?>
                <?php $this->render_dashboard_page(); ?>
        </div>
                <?php return; ?>
            <?php endif; ?>

            <?php if ($active_tab === 'content_meta') : ?>
                <?php $this->render_content_meta_page(); ?>
        </div>
                <?php return; ?>
            <?php endif; ?>

            <?php if ($active_tab === 'seo_analysis') : ?>
                <?php $this->render_seo_analysis_page(); ?>
        </div>
                <?php return; ?>
            <?php endif; ?>

            <?php if ($active_tab === 'link_assistant') : ?>
                <?php $this->render_link_assistant_page(); ?>
        </div>
                <?php return; ?>
            <?php endif; ?>

            <?php if ($active_tab === 'sitemap') : ?>
                <?php $this->render_sitemap_page(); ?>
        </div>
                <?php return; ?>
            <?php endif; ?>

            <?php if ($active_tab === 'image_attributes') : ?>
                <?php $this->render_image_attributes_page(); ?>
        </div>
                <?php return; ?>
            <?php endif; ?>

            <?php if ($active_tab === 'image_bulk') : ?>
                <?php $this->render_image_bulk_page(); ?>
        </div>
                <?php return; ?>
            <?php endif; ?>

            <?php if ($active_tab === 'diagnostics') : ?>
                <?php $this->render_diagnostics_page(); ?>
        </div>
                <?php return; ?>
            <?php endif; ?>

            <h2><?php echo esc_html__('API Connection', 'rankwoven-seo'); ?></h2>
            <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
                <?php wp_nonce_field('rankwoven_save_settings'); ?>
                <input type="hidden" name="action" value="rankwoven_save_settings" />
                <input type="hidden" name="rankwoven_settings_scope" value="connection" />
                <table class="form-table" role="presentation">
                    <tr>
                        <th scope="row">
                            <label for="rankwoven_api_base_url"><?php echo esc_html__('API Base URL', 'rankwoven-seo'); ?></label>
                        </th>
                        <td>
                            <input
                                id="rankwoven_api_base_url"
                                name="rankwoven_api_base_url"
                                type="url"
                                class="regular-text"
                                value="<?php echo esc_attr($api_base_url); ?>"
                                placeholder="https://api.rankwoven.com"
                            />
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">
                            <label><?php echo esc_html__('Site ID', 'rankwoven-seo'); ?></label>
                        </th>
                        <td>
                            <?php if ($site_id !== '') : ?>
                                <code style="font-size:14px;"><?php echo esc_html($site_id); ?></code>
                                <p class="description">
                                    <?php echo esc_html__('Automatically generated when this site is connected to RankWoven.', 'rankwoven-seo'); ?>
                                </p>
                            <?php else : ?>
                                <span class="description">
                                    <?php echo esc_html__('Not connected yet. Click "Connect This Site" below to auto-generate your Site ID and Token.', 'rankwoven-seo'); ?>
                                </span>
                            <?php endif; ?>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">
                            <label for="rankwoven_ga4_property_id"><?php echo esc_html__('GA4 Property ID', 'rankwoven-seo'); ?></label>
                        </th>
                        <td>
                            <input
                                id="rankwoven_ga4_property_id"
                                name="rankwoven_ga4_property_id"
                                type="text"
                                class="regular-text"
                                value="<?php echo esc_attr($ga4_property_id); ?>"
                                placeholder="123456789"
                            />
                            <p class="description">
                                <?php echo esc_html__('Enter this WordPress site GA4 Property ID. RankWoven uses it to read SEO analytics for this site after the platform service account has access to the property.', 'rankwoven-seo'); ?>
                            </p>
                        </td>
                    </tr>
                </table>

                <h2><?php echo esc_html__('Social Sharing Meta', 'rankwoven-seo'); ?></h2>
                <p>
                    <?php echo esc_html__('These public values are used for Twitter Card and Facebook Open Graph tags on supported frontend pages.', 'rankwoven-seo'); ?>
                </p>
                <table class="form-table" role="presentation">
                    <tr>
                        <th scope="row">
                            <label for="rankwoven_twitter_username"><?php echo esc_html__('Twitter/X Username', 'rankwoven-seo'); ?></label>
                        </th>
                        <td>
                            <input
                                id="rankwoven_twitter_username"
                                name="rankwoven_twitter_username"
                                type="text"
                                class="regular-text"
                                value="<?php echo esc_attr($twitter_username); ?>"
                                placeholder="@rankwoven"
                            />
                            <p class="description">
                                <?php echo esc_html__('Used for twitter:site and twitter:creator. Leave blank to omit those tags.', 'rankwoven-seo'); ?>
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">
                            <label for="rankwoven_facebook_app_id"><?php echo esc_html__('Facebook App ID', 'rankwoven-seo'); ?></label>
                        </th>
                        <td>
                            <input
                                id="rankwoven_facebook_app_id"
                                name="rankwoven_facebook_app_id"
                                type="text"
                                class="regular-text"
                                value="<?php echo esc_attr($facebook_app_id); ?>"
                                placeholder="123456789012345"
                            />
                            <p class="description">
                                <?php echo esc_html__('Used for fb:app_id. Leave blank to omit the tag.', 'rankwoven-seo'); ?>
                            </p>
                        </td>
                    </tr>
                </table>

                <h2><?php echo esc_html__('WordPress Application Password', 'rankwoven-seo'); ?></h2>
                <p>
                    <?php echo esc_html__('Create an application password from your WordPress administrator profile, then save the username and application password here. RankWoven will use this administrator identity for approved future content updates so WordPress keeps an audit trail.', 'rankwoven-seo'); ?>
                </p>
                <table class="form-table" role="presentation">
                    <tr>
                        <th scope="row">
                            <label for="rankwoven_wp_admin_username"><?php echo esc_html__('Administrator Username', 'rankwoven-seo'); ?></label>
                        </th>
                        <td>
                            <input
                                id="rankwoven_wp_admin_username"
                                name="rankwoven_wp_admin_username"
                                type="text"
                                class="regular-text"
                                value="<?php echo esc_attr($wp_admin_username); ?>"
                                autocomplete="username"
                            />
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">
                            <label for="rankwoven_wp_application_password"><?php echo esc_html__('Application Password', 'rankwoven-seo'); ?></label>
                        </th>
                        <td>
                            <input
                                id="rankwoven_wp_application_password"
                                name="rankwoven_wp_application_password"
                                type="password"
                                class="regular-text"
                                value=""
                                autocomplete="new-password"
                                placeholder="<?php echo esc_attr($wp_application_password !== '' ? __('Already saved; leave blank to keep current password', 'rankwoven-seo') : __('Paste application password', 'rankwoven-seo')); ?>"
                            />
                            <p class="description">
                                <?php echo esc_html__('Users must create this password themselves in WordPress: Users -> Profile -> Application Passwords. Do not use your normal login password.', 'rankwoven-seo'); ?>
                            </p>
                        </td>
                    </tr>
                </table>
                <?php submit_button(__('Save Settings', 'rankwoven-seo')); ?>
            </form>

            <h2><?php echo esc_html__('Site Connection', 'rankwoven-seo'); ?></h2>
            <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
                <?php wp_nonce_field('rankwoven_connect_site'); ?>
                <input type="hidden" name="action" value="rankwoven_connect_site" />
                <?php submit_button(__('Connect This Site', 'rankwoven-seo'), 'primary'); ?>
            </form>

            <h2><?php echo esc_html__('Article Sync', 'rankwoven-seo'); ?></h2>
            <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
                <?php wp_nonce_field('rankwoven_sync_content'); ?>
                <input type="hidden" name="action" value="rankwoven_sync_content" />
                <?php submit_button(__('Sync Posts, Pages, and Media', 'rankwoven-seo'), 'secondary'); ?>
            </form>

            <?php if (is_array($last_sync_result) && !empty($last_sync_result)) : ?>
                <h3><?php echo esc_html__('Last Sync Result', 'rankwoven-seo'); ?></h3>
                <table class="widefat striped">
                    <tbody>
                        <tr>
                            <th><?php echo esc_html__('Synced At', 'rankwoven-seo'); ?></th>
                            <td><?php echo esc_html($last_sync_result['syncedAt'] ?? ''); ?></td>
                        </tr>
                        <tr>
                            <th><?php echo esc_html__('Articles', 'rankwoven-seo'); ?></th>
                            <td><?php echo esc_html((string) ($last_sync_result['articlesReceived'] ?? 0)); ?></td>
                        </tr>
                        <tr>
                            <th><?php echo esc_html__('Media', 'rankwoven-seo'); ?></th>
                            <td><?php echo esc_html((string) ($last_sync_result['mediaReceived'] ?? 0)); ?></td>
                        </tr>
                        <tr>
                            <th><?php echo esc_html__('Article Pages Synced', 'rankwoven-seo'); ?></th>
                            <td><?php echo esc_html((string) ($last_sync_result['articlePagesSynced'] ?? 1)); ?></td>
                        </tr>
                        <tr>
                            <th><?php echo esc_html__('Media Pages Synced', 'rankwoven-seo'); ?></th>
                            <td><?php echo esc_html((string) ($last_sync_result['mediaPagesSynced'] ?? 1)); ?></td>
                        </tr>
                        <tr>
                            <th><?php echo esc_html__('Sync Mode', 'rankwoven-seo'); ?></th>
                            <td><?php echo esc_html((string) ($last_sync_result['syncMode'] ?? 'full')); ?></td>
                        </tr>
                        <?php if (!empty($last_sync_result['updatedAfter'])) : ?>
                            <tr>
                                <th><?php echo esc_html__('Updated After', 'rankwoven-seo'); ?></th>
                                <td><?php echo esc_html((string) $last_sync_result['updatedAfter']); ?></td>
                            </tr>
                        <?php endif; ?>
                        <?php if (!empty($last_sync_result['syncTaskId'])) : ?>
                            <tr>
                                <th><?php echo esc_html__('Sync Task ID', 'rankwoven-seo'); ?></th>
                                <td><code><?php echo esc_html((string) $last_sync_result['syncTaskId']); ?></code></td>
                            </tr>
                        <?php endif; ?>
                    </tbody>
                </table>
            <?php endif; ?>
        </div>
        <?php
    }

    private function render_admin_tabs(string $active_tab): void
    {
        $tabs = $this->get_admin_menu_tabs();
        ?>
        <h2 class="nav-tab-wrapper rankwoven-admin-tabs">
            <?php foreach ($tabs as $tab => $tab_config) : ?>
                <a
                    class="nav-tab <?php echo $active_tab === $tab ? 'nav-tab-active' : ''; ?>"
                    href="<?php echo esc_url($this->get_admin_tab_url($tab)); ?>"
                >
                    <?php echo esc_html($tab_config['label']); ?>
                </a>
            <?php endforeach; ?>
        </h2>
        <?php
    }

    private function render_dashboard_page(): void
    {
        $last_sync_result = get_option(self::OPTION_LAST_SYNC_RESULT, []);
        $last_sync_result = is_array($last_sync_result) ? $last_sync_result : [];
        $last_sitemap_result = get_option(self::OPTION_LAST_SITEMAP_RESULT, []);
        $last_sitemap_result = is_array($last_sitemap_result) ? $last_sitemap_result : [];
        $last_submission_result = get_option(self::OPTION_LAST_SITEMAP_SUBMISSION_RESULT, []);
        $last_submission_result = is_array($last_submission_result) ? $last_submission_result : [];
        $audit_data = $this->is_saas_site_ready() ? $this->request_saas_site_api('GET', 'audits') : [];
        $suggestions_data = $this->is_saas_site_ready() ? $this->request_saas_site_api('GET', 'suggestions?targetType=article&limit=100') : [];
        $latest_audit = is_wp_error($audit_data) ? [] : $this->get_latest_audit_from_data($audit_data);
        $issues = is_wp_error($audit_data) ? [] : $this->get_audit_issues_from_data($audit_data);
        $internal_link_suggestions = is_wp_error($suggestions_data) ? [] : $this->get_internal_link_suggestions_from_data($suggestions_data);
        ?>
        <section class="rankwoven-panel">
            <div class="rankwoven-section-heading">
                <span class="rankwoven-eyebrow"><?php echo esc_html__('Overview', 'rankwoven-seo'); ?></span>
                <h2><?php echo esc_html__('總覽', 'rankwoven-seo'); ?></h2>
                <p>
                    <?php echo esc_html__('RankWoven keeps AI generation, SEO analysis, sitemap submission, and internal-link suggestions in the SaaS API while this WordPress plugin stays lightweight and reviewable.', 'rankwoven-seo'); ?>
                </p>
            </div>

            <div class="rankwoven-stat-grid">
                <?php $this->render_admin_metric_card(__('API connection', 'rankwoven-seo'), $this->is_saas_site_ready() ? __('Connected', 'rankwoven-seo') : __('Not connected', 'rankwoven-seo'), $this->is_saas_site_ready() ? 'ready' : 'warning'); ?>
                <?php $this->render_admin_metric_card(__('Last sync', 'rankwoven-seo'), $this->get_last_sync_label($last_sync_result)); ?>
                <?php $this->render_admin_metric_card(__('最新 SEO 分數', 'rankwoven-seo'), !empty($latest_audit['score']) ? sprintf('%d/100', (int) $latest_audit['score']) : __('尚未審計', 'rankwoven-seo'), 'score'); ?>
                <?php $this->render_admin_metric_card(__('審計問題', 'rankwoven-seo'), (string) count($issues)); ?>
                <?php $this->render_admin_metric_card(__('內部連結機會', 'rankwoven-seo'), (string) count($internal_link_suggestions), 'ready'); ?>
                <?php $this->render_admin_metric_card(__('Sitemap 條目', 'rankwoven-seo'), (string) ($last_sitemap_result['entryCount'] ?? 0)); ?>
                <?php $this->render_admin_metric_card(__('最近一次 Google Sitemap 提交', 'rankwoven-seo'), (string) ($last_submission_result['submittedAt'] ?? $last_submission_result['attemptedAt'] ?? __('尚未提交', 'rankwoven-seo'))); ?>
            </div>
        </section>

        <section class="rankwoven-panel">
            <div class="rankwoven-section-heading">
                <span class="rankwoven-eyebrow"><?php echo esc_html__('Quick actions', 'rankwoven-seo'); ?></span>
                <h2><?php echo esc_html__('快速操作', 'rankwoven-seo'); ?></h2>
            </div>
            <div class="rankwoven-action-grid">
                <?php $this->render_admin_post_button('rankwoven_sync_content', 'rankwoven_sync_content', __('同步內容', 'rankwoven-seo'), 'secondary'); ?>
                <?php $this->render_admin_post_button('rankwoven_run_seo_audit', 'rankwoven_run_seo_audit', __('執行 SEO 分析', 'rankwoven-seo'), 'primary'); ?>
                <?php $this->render_admin_post_button('rankwoven_generate_sitemap', 'rankwoven_generate_sitemap', __('生成 Sitemap', 'rankwoven-seo'), 'secondary'); ?>
                <?php $this->render_admin_post_button('rankwoven_submit_sitemap_google', 'rankwoven_submit_sitemap_google', __('提交到 Google', 'rankwoven-seo'), 'secondary'); ?>
            </div>
        </section>

        <?php if (is_wp_error($audit_data) || is_wp_error($suggestions_data)) : ?>
            <div class="notice notice-warning inline">
                <p>
                    <?php echo esc_html__('部分 SaaS 資料未能載入，請檢查 API Base URL、Site ID、Site Token，以及 SaaS API 是否已部署。', 'rankwoven-seo'); ?>
                </p>
            </div>
        <?php endif; ?>
        <?php
    }

    private function render_seo_analysis_page(): void
    {
        $audit_data = $this->is_saas_site_ready() ? $this->request_saas_site_api('GET', 'audits') : new WP_Error('rankwoven_not_connected', __('Please connect this site before running SEO Analysis.', 'rankwoven-seo'));
        ?>
        <h2><?php echo esc_html__('SEO 分析', 'rankwoven-seo'); ?></h2>
        <p>
            <?php echo esc_html__('對已同步的 WordPress 內容執行 SaaS 端 SEO 分析，並在後台直接檢視最新問題。', 'rankwoven-seo'); ?>
        </p>
        <p>
            <?php $this->render_admin_post_button('rankwoven_run_seo_audit', 'rankwoven_run_seo_audit', __('執行 SEO 分析', 'rankwoven-seo'), 'primary'); ?>
        </p>

        <?php if (is_wp_error($audit_data)) : ?>
            <div class="notice notice-warning inline"><p><?php echo esc_html($audit_data->get_error_message()); ?></p></div>
            <?php return; ?>
        <?php endif; ?>

        <?php
        $latest_audit = $this->get_latest_audit_from_data($audit_data);
        $issues = $this->get_audit_issues_from_data($audit_data);
        ?>
        <h3><?php echo esc_html__('最新審計', 'rankwoven-seo'); ?></h3>
        <table class="widefat striped" style="max-width: 960px;">
            <tbody>
                <?php $this->render_diagnostic_row(__('分數', 'rankwoven-seo'), !empty($latest_audit['score']) ? sprintf('%d/100', (int) $latest_audit['score']) : __('尚未審計', 'rankwoven-seo')); ?>
                <?php $this->render_diagnostic_row(__('規則版本', 'rankwoven-seo'), sanitize_text_field((string) ($latest_audit['rulesVersion'] ?? ''))); ?>
                <?php $this->render_diagnostic_row(__('建立時間', 'rankwoven-seo'), sanitize_text_field((string) ($latest_audit['createdAt'] ?? ''))); ?>
                <?php $this->render_diagnostic_row(__('問題數量', 'rankwoven-seo'), (string) count($issues)); ?>
            </tbody>
        </table>

        <h3><?php echo esc_html__('問題列表', 'rankwoven-seo'); ?></h3>
        <?php if (empty($issues)) : ?>
            <p><?php echo esc_html__('目前尚未找到問題。請先同步內容，再執行審計。', 'rankwoven-seo'); ?></p>
        <?php else : ?>
            <table class="widefat striped">
                <thead>
                    <tr>
                        <th><?php echo esc_html__('嚴重程度', 'rankwoven-seo'); ?></th>
                        <th><?php echo esc_html__('目標內容', 'rankwoven-seo'); ?></th>
                        <th><?php echo esc_html__('規則', 'rankwoven-seo'); ?></th>
                        <th><?php echo esc_html__('訊息', 'rankwoven-seo'); ?></th>
                        <th><?php echo esc_html__('建議', 'rankwoven-seo'); ?></th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($issues as $issue) : ?>
                        <tr>
                            <td><?php echo esc_html((string) ($issue['severity'] ?? '')); ?></td>
                            <td><?php echo esc_html($this->get_suggestion_target_label($issue)); ?></td>
                            <td><code><?php echo esc_html((string) ($issue['ruleCode'] ?? '')); ?></code></td>
                            <td><?php echo esc_html((string) ($issue['message'] ?? '')); ?></td>
                            <td><?php echo esc_html($this->get_suggestion_summary_text((string) ($issue['suggestedValue'] ?? ''))); ?></td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        <?php endif; ?>
        <?php
    }

    private function render_link_assistant_page(): void
    {
        $suggestions_data = $this->is_saas_site_ready() ? $this->request_saas_site_api('GET', 'suggestions?targetType=article&limit=100') : new WP_Error('rankwoven_not_connected', __('Please connect this site before using Link Assistant.', 'rankwoven-seo'));
        ?>
        <h2><?php echo esc_html__('內部連結', 'rankwoven-seo'); ?></h2>
        <p>
            <?php echo esc_html__('檢視 SaaS 生成的內部連結機會。已批准的建議只會在內容尾部追加「相關閱讀」文字連結區塊，不會重寫既有 WPBakery 或頁面建構器結構。', 'rankwoven-seo'); ?>
        </p>

        <?php if (is_wp_error($suggestions_data)) : ?>
            <div class="notice notice-warning inline"><p><?php echo esc_html($suggestions_data->get_error_message()); ?></p></div>
            <?php return; ?>
        <?php endif; ?>

        <?php $suggestions = $this->get_internal_link_suggestions_from_data($suggestions_data); ?>
        <?php if (empty($suggestions)) : ?>
            <p><?php echo esc_html__('目前尚未產生內部連結建議。請先同步內容，再執行 SEO 分析。', 'rankwoven-seo'); ?></p>
            <p><?php $this->render_admin_post_button('rankwoven_run_seo_audit', 'rankwoven_run_seo_audit', __('執行 SEO 分析', 'rankwoven-seo'), 'primary'); ?></p>
            <?php return; ?>
        <?php endif; ?>

        <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
            <?php wp_nonce_field('rankwoven_manage_suggestions'); ?>
            <input type="hidden" name="action" value="rankwoven_manage_suggestions" />
            <table class="widefat striped">
                <thead>
                    <tr>
                        <th style="width:36px;"><span class="screen-reader-text"><?php echo esc_html__('Select', 'rankwoven-seo'); ?></span></th>
                        <th><?php echo esc_html__('來源內容', 'rankwoven-seo'); ?></th>
                        <th><?php echo esc_html__('建議連結', 'rankwoven-seo'); ?></th>
                        <th><?php echo esc_html__('狀態', 'rankwoven-seo'); ?></th>
                        <th><?php echo esc_html__('建立時間', 'rankwoven-seo'); ?></th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($suggestions as $suggestion) : ?>
                        <?php
                        $status = sanitize_key((string) ($suggestion['status'] ?? ''));
                        $suggestion_id = sanitize_text_field((string) ($suggestion['id'] ?? ''));
                        ?>
                        <tr>
                            <td>
                                <?php if ($suggestion_id !== '' && in_array($status, ['pending', 'approved', 'failed'], true)) : ?>
                                    <input type="checkbox" name="rankwoven_suggestion_ids[]" value="<?php echo esc_attr($suggestion_id); ?>" />
                                <?php endif; ?>
                            </td>
                            <td><?php echo esc_html($this->get_suggestion_target_label($suggestion)); ?></td>
                            <td><?php $this->render_internal_link_candidate_list($suggestion); ?></td>
                            <td><?php echo esc_html($status !== '' ? $status : __('Unknown', 'rankwoven-seo')); ?></td>
                            <td><?php echo esc_html((string) ($suggestion['createdAt'] ?? '')); ?></td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
            <p>
                <button type="submit" class="button" name="rankwoven_suggestion_action" value="approve">
                    <?php echo esc_html__('批准所選', 'rankwoven-seo'); ?>
                </button>
                <button type="submit" class="button button-primary" name="rankwoven_suggestion_action" value="apply">
                    <?php echo esc_html__('批准並套用所選', 'rankwoven-seo'); ?>
                </button>
            </p>
        </form>
        <?php
    }

    private function render_content_meta_page(): void
    {
        $settings = $this->get_content_meta_settings();
        $supported_post_types = $this->get_supported_editor_post_types();
        ?>
        <h2><?php echo esc_html__('Content Meta Settings', 'rankwoven-seo'); ?></h2>
        <p>
            <?php echo esc_html__('Set default SEO title, meta description, and keywords templates for each content type. These values apply when a single post does not already have its own saved SEO fields.', 'rankwoven-seo'); ?>
        </p>
        <p class="description">
            <?php echo esc_html__('Available placeholders:', 'rankwoven-seo'); ?>
            <code>{{title}}</code>
            <code>{{excerpt}}</code>
            <code>{{focus_keyphrase}}</code>
            <code>{{site_name}}</code>
            <code>{{slug}}</code>
            <code>{{post_type}}</code>
            <code>{{post_type_label}}</code>
        </p>

        <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
            <?php wp_nonce_field('rankwoven_save_settings'); ?>
            <input type="hidden" name="action" value="rankwoven_save_settings" />
            <input type="hidden" name="rankwoven_settings_scope" value="content_meta" />

            <?php foreach ($supported_post_types as $post_type) : ?>
                <?php
                $post_type_object = get_post_type_object($post_type);
                $post_type_label = is_object($post_type_object)
                    ? sanitize_text_field((string) ($post_type_object->labels->singular_name ?? $post_type))
                    : sanitize_text_field($post_type);
                $post_type_settings = $settings[$post_type] ?? $this->get_default_content_meta_settings();
                ?>
                <details class="rankwoven-settings-card" open>
                    <summary>
                        <?php echo esc_html($post_type_label); ?>
                    </summary>
                    <table class="form-table" role="presentation">
                        <?php $this->render_content_meta_field_row(
                            sprintf('rankwoven_content_meta_settings[%s][seo_title_template]', $post_type),
                            (string) ($post_type_settings['seo_title_template'] ?? ''),
                            __('SEO Title Template', 'rankwoven-seo'),
                            __('Default SEO title used for this content type. Example: {{title}} | {{site_name}}.', 'rankwoven-seo')
                        ); ?>
                        <?php $this->render_content_meta_field_row(
                            sprintf('rankwoven_content_meta_settings[%s][meta_description_template]', $post_type),
                            (string) ($post_type_settings['meta_description_template'] ?? ''),
                            __('Meta Description Template', 'rankwoven-seo'),
                            __('Default meta description used when the post itself does not already have one. Example: {{excerpt}}.', 'rankwoven-seo'),
                            true
                        ); ?>
                        <?php $this->render_content_meta_field_row(
                            sprintf('rankwoven_content_meta_settings[%s][meta_keywords_template]', $post_type),
                            (string) ($post_type_settings['meta_keywords_template'] ?? ''),
                            __('Meta Keywords Template', 'rankwoven-seo'),
                            __('Default keywords for this content type. Example: {{focus_keyphrase}}.', 'rankwoven-seo')
                        ); ?>
                    </table>
                </details>
            <?php endforeach; ?>

            <?php submit_button(__('Save Content Meta Settings', 'rankwoven-seo')); ?>
        </form>
        <?php
    }

    private function render_content_meta_field_row(string $field_name, string $value, string $label, string $description, bool $multiline = false): void
    {
        $field_id = sanitize_key(str_replace(['[', ']'], ['_', ''], $field_name));
        ?>
        <tr>
            <th scope="row">
                <label for="<?php echo esc_attr($field_id); ?>"><?php echo esc_html($label); ?></label>
            </th>
            <td>
                <?php if ($multiline) : ?>
                    <textarea
                        id="<?php echo esc_attr($field_id); ?>"
                        name="<?php echo esc_attr($field_name); ?>"
                        class="large-text"
                        rows="3"
                    ><?php echo esc_textarea($value); ?></textarea>
                <?php else : ?>
                    <input
                        type="text"
                        id="<?php echo esc_attr($field_id); ?>"
                        name="<?php echo esc_attr($field_name); ?>"
                        class="regular-text"
                        value="<?php echo esc_attr($value); ?>"
                    />
                <?php endif; ?>
                <p class="description"><?php echo esc_html($description); ?></p>
            </td>
        </tr>
        <?php
    }

    private function render_diagnostics_page(): void
    {
        $api_base_url = $this->get_api_base_url();
        $site_id = sanitize_text_field(get_option(self::OPTION_SITE_ID, ''));
        $site_token = sanitize_text_field(get_option(self::OPTION_SITE_TOKEN, ''));
        $ga4_property_id = sanitize_text_field(get_option(self::OPTION_GA4_PROPERTY_ID, ''));
        $twitter_username = sanitize_text_field(get_option(self::OPTION_TWITTER_USERNAME, ''));
        $facebook_app_id = sanitize_text_field(get_option(self::OPTION_FACEBOOK_APP_ID, ''));
        $wp_credentials = $this->get_wordpress_admin_credentials();
        $last_sync_result = get_option(self::OPTION_LAST_SYNC_RESULT, []);
        $last_sync_result = is_array($last_sync_result) ? $last_sync_result : [];
        $last_error = get_option(self::OPTION_LAST_ERROR, []);
        $last_error = is_array($last_error) ? $last_error : [];
        $image_settings = $this->get_image_attribute_settings();
        ?>
        <h2><?php echo esc_html__('Read-only Diagnostics', 'rankwoven-seo'); ?></h2>
        <p><?php echo esc_html__('Use this page to inspect the local RankWoven plugin connection state without changing settings.', 'rankwoven-seo'); ?></p>

        <table class="widefat striped">
            <tbody>
                <?php $this->render_diagnostic_row(__('API Base URL', 'rankwoven-seo'), $api_base_url !== '' ? $api_base_url : __('Not configured', 'rankwoven-seo')); ?>
                <?php $this->render_diagnostic_row(__('API connection', 'rankwoven-seo'), $this->get_api_connection_status_label($api_base_url)); ?>
                <?php $this->render_diagnostic_row(__('Site ID', 'rankwoven-seo'), $site_id !== '' ? $site_id : __('Not configured', 'rankwoven-seo')); ?>
                <?php $this->render_diagnostic_row(__('Token status', 'rankwoven-seo'), $site_token !== '' ? __('Configured locally', 'rankwoven-seo') : __('Not configured', 'rankwoven-seo')); ?>
                <?php $this->render_diagnostic_row(__('GA4 Property ID', 'rankwoven-seo'), $ga4_property_id !== '' ? $ga4_property_id : __('Not configured', 'rankwoven-seo')); ?>
                <?php $this->render_diagnostic_row(__('Twitter/X Username', 'rankwoven-seo'), $twitter_username !== '' ? '@' . $twitter_username : __('Not configured', 'rankwoven-seo')); ?>
                <?php $this->render_diagnostic_row(__('Facebook App ID', 'rankwoven-seo'), $facebook_app_id !== '' ? $facebook_app_id : __('Not configured', 'rankwoven-seo')); ?>
                <?php $this->render_diagnostic_row(__('Token last local use', 'rankwoven-seo'), $this->get_last_token_used_label()); ?>
                <?php $this->render_diagnostic_row(__('Last sync', 'rankwoven-seo'), $this->get_last_sync_label($last_sync_result)); ?>
                <?php $this->render_diagnostic_row(__('Image attribute settings', 'rankwoven-seo'), $this->get_image_attribute_settings_label($image_settings)); ?>
                <?php $this->render_diagnostic_row(__('Application Password', 'rankwoven-seo'), $this->get_application_password_status_label($wp_credentials)); ?>
                <?php $this->render_diagnostic_row(__('Last error', 'rankwoven-seo'), $this->get_last_error_label($last_error)); ?>
            </tbody>
        </table>
        <?php
    }

    private function render_sitemap_page(): void
    {
        $sitemap_url = home_url('/sitemap.xml');
        $last_sitemap_result = get_option(self::OPTION_LAST_SITEMAP_RESULT, []);
        $last_sitemap_result = is_array($last_sitemap_result) ? $last_sitemap_result : [];
        $last_submission_result = get_option(self::OPTION_LAST_SITEMAP_SUBMISSION_RESULT, []);
        $last_submission_result = is_array($last_submission_result) ? $last_submission_result : [];
        $sitemap_post_types = $last_sitemap_result['postTypes'] ?? [];
        $sitemap_post_types = is_array($sitemap_post_types) ? $sitemap_post_types : [];
        $sitemap_post_types = array_map(static fn ($post_type): string => sanitize_text_field((string) $post_type), $sitemap_post_types);
        ?>
        <h2><?php echo esc_html__('Sitemap.xml', 'rankwoven-seo'); ?></h2>
        <p>
            <?php echo esc_html__('This sitemap is generated dynamically from published Posts, Pages, Portfolio items, and Products.', 'rankwoven-seo'); ?>
        </p>
        <p>
            <code><?php echo esc_html($sitemap_url); ?></code>
            <a href="<?php echo esc_url($sitemap_url); ?>" target="_blank" rel="noopener noreferrer" style="margin-left:12px;">
                <?php echo esc_html__('Open sitemap.xml', 'rankwoven-seo'); ?>
            </a>
        </p>
        <p>
            <?php $this->render_admin_post_button('rankwoven_generate_sitemap', 'rankwoven_generate_sitemap', __('Generate sitemap.xml', 'rankwoven-seo'), 'primary'); ?>
            <?php $this->render_admin_post_button('rankwoven_submit_sitemap_google', 'rankwoven_submit_sitemap_google', __('Submit to Google', 'rankwoven-seo'), 'secondary'); ?>
        </p>

        <h3><?php echo esc_html__('Last Sitemap Build', 'rankwoven-seo'); ?></h3>
        <table class="widefat striped">
            <tbody>
                <tr>
                    <th><?php echo esc_html__('Generated At', 'rankwoven-seo'); ?></th>
                    <td><?php echo esc_html((string) ($last_sitemap_result['generatedAt'] ?? __('Not generated yet', 'rankwoven-seo'))); ?></td>
                </tr>
                <tr>
                    <th><?php echo esc_html__('Entry Count', 'rankwoven-seo'); ?></th>
                    <td><?php echo esc_html((string) ($last_sitemap_result['entryCount'] ?? 0)); ?></td>
                </tr>
                <tr>
                    <th><?php echo esc_html__('Included Post Types', 'rankwoven-seo'); ?></th>
                    <td><?php echo esc_html(implode(', ', $sitemap_post_types)); ?></td>
                </tr>
            </tbody>
        </table>

        <h3><?php echo esc_html__('Last Google Submission', 'rankwoven-seo'); ?></h3>
        <table class="widefat striped">
            <tbody>
                <tr>
                    <th><?php echo esc_html__('Last Attempt', 'rankwoven-seo'); ?></th>
                    <td><?php echo esc_html((string) ($last_submission_result['attemptedAt'] ?? __('Not submitted yet', 'rankwoven-seo'))); ?></td>
                </tr>
                <tr>
                    <th><?php echo esc_html__('Search Console Property', 'rankwoven-seo'); ?></th>
                    <td><?php echo esc_html((string) ($last_submission_result['propertyUrl'] ?? '')); ?></td>
                </tr>
                <tr>
                    <th><?php echo esc_html__('Sitemap URL', 'rankwoven-seo'); ?></th>
                    <td><?php echo esc_html((string) ($last_submission_result['sitemapUrl'] ?? $sitemap_url)); ?></td>
                </tr>
                <tr>
                    <th><?php echo esc_html__('Message', 'rankwoven-seo'); ?></th>
                    <td><?php echo esc_html((string) ($last_submission_result['message'] ?? __('Not submitted yet', 'rankwoven-seo'))); ?></td>
                </tr>
            </tbody>
        </table>
        <?php
    }

    private function render_image_attributes_page(): void
    {
        $settings = $this->get_image_attribute_settings();
        ?>
        <h2><?php echo esc_html__('Image Attribute Settings', 'rankwoven-seo'); ?></h2>
        <p>
            <?php echo esc_html__('Use new image filenames to automatically generate image title, alternative text, caption, and description.', 'rankwoven-seo'); ?>
        </p>
        <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
            <?php wp_nonce_field('rankwoven_save_image_attributes'); ?>
            <input type="hidden" name="action" value="rankwoven_save_image_attributes" />
            <table class="form-table" role="presentation">
                <tr>
                    <th scope="row"><?php echo esc_html__('General Settings', 'rankwoven-seo'); ?></th>
                    <td>
                        <?php $this->render_checkbox('set_title', $settings, __('Set title for newly uploaded images', 'rankwoven-seo')); ?>
                        <?php $this->render_checkbox('set_alt_text', $settings, __('Set alternative text for newly uploaded images', 'rankwoven-seo')); ?>
                        <?php $this->render_checkbox('set_caption', $settings, __('Set caption for newly uploaded images', 'rankwoven-seo')); ?>
                        <?php $this->render_checkbox('set_description', $settings, __('Set description for newly uploaded images', 'rankwoven-seo')); ?>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><?php echo esc_html__('Filename Cleanup', 'rankwoven-seo'); ?></th>
                    <td>
                        <?php $this->render_checkbox('remove_hyphen', $settings, __('Remove hyphens from filenames', 'rankwoven-seo'), '-'); ?>
                        <?php $this->render_checkbox('remove_underscore', $settings, __('Remove underscores from filenames', 'rankwoven-seo'), '_'); ?>
                        <?php $this->render_checkbox('remove_period', $settings, __('Remove periods from filenames', 'rankwoven-seo'), '.'); ?>
                        <?php $this->render_checkbox('remove_comma', $settings, __('Remove commas from filenames', 'rankwoven-seo'), ','); ?>
                        <?php $this->render_checkbox('remove_numbers', $settings, __('Remove all numbers from filenames', 'rankwoven-seo')); ?>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><?php echo esc_html__('Basic SEO Settings', 'rankwoven-seo'); ?></th>
                    <td>
                        <?php $this->render_checkbox('insert_title_attribute', $settings, __('Insert image title into content HTML output', 'rankwoven-seo')); ?>
                        <p class="description">
                            <?php echo esc_html__('When enabled, RankWoven adds a title attribute to rendered image tags when a title is available.', 'rankwoven-seo'); ?>
                        </p>
                    </td>
                </tr>
            </table>
            <?php submit_button(__('Save Image Attribute Settings', 'rankwoven-seo')); ?>
        </form>
        <?php
    }

    private function render_image_bulk_page(): void
    {
        $last_processed_id = (int) get_option(self::OPTION_IMAGE_BULK_LAST_ID, 0);
        $remaining_count = $this->get_remaining_image_count($last_processed_id);
        $processed_count = $this->get_processed_image_count($last_processed_id);
        $log = get_option(self::OPTION_IMAGE_BULK_LOG, []);
        ?>
        <h2><?php echo esc_html__('Bulk Image Attribute Updater', 'rankwoven-seo'); ?></h2>
        <p>
            <?php echo esc_html__('Run the bulk updater to update existing image titles, captions, descriptions, and alternative text from filenames.', 'rankwoven-seo'); ?>
        </p>
        <div class="notice notice-warning inline">
            <p><strong><?php echo esc_html__('Important:', 'rankwoven-seo'); ?></strong> <?php echo esc_html__('Back up this WordPress database before running a bulk update.', 'rankwoven-seo'); ?></p>
            <p><?php echo esc_html__('Use the test button to update one image and review the result first. Each bulk run processes the next batch of images to reduce timeout risk.', 'rankwoven-seo'); ?></p>
        </div>

        <p>
            <?php $this->render_admin_post_button('rankwoven_bulk_update_image_attributes', 'rankwoven_bulk_update_image_attributes', __('Run Bulk Updater', 'rankwoven-seo'), 'primary'); ?>
            <?php $this->render_admin_post_button('rankwoven_test_image_attributes', 'rankwoven_test_image_attributes', __('Test Bulk Updater', 'rankwoven-seo'), 'secondary'); ?>
            <button type="button" class="button" disabled><?php echo esc_html__('Stop Bulk Updater', 'rankwoven-seo'); ?></button>
        </p>

        <h2><?php echo esc_html__('Tools', 'rankwoven-seo'); ?></h2>
        <p><?php echo esc_html__('Reset the counter if you need to start processing images again from the beginning.', 'rankwoven-seo'); ?></p>
        <?php $this->render_admin_post_button('rankwoven_reset_image_bulk_counter', 'rankwoven_reset_image_bulk_counter', __('Reset Counter', 'rankwoven-seo'), 'secondary'); ?>

        <h2><?php echo esc_html__('Event Log', 'rankwoven-seo'); ?></h2>
        <table class="widefat striped">
            <tbody>
                <tr>
                    <th><?php echo esc_html__('Remaining images', 'rankwoven-seo'); ?></th>
                    <td><?php echo esc_html((string) $remaining_count); ?></td>
                </tr>
                <tr>
                    <th><?php echo esc_html__('Processed images', 'rankwoven-seo'); ?></th>
                    <td><?php echo esc_html((string) $processed_count); ?></td>
                </tr>
            </tbody>
        </table>
        <textarea class="large-text code" rows="12" readonly><?php echo esc_textarea(implode("\n", is_array($log) ? $log : [])); ?></textarea>
        <?php
    }

    public function handle_save_settings(): void
    {
        $this->assert_admin_action('rankwoven_save_settings');

        $scope = sanitize_key(wp_unslash($_POST['rankwoven_settings_scope'] ?? 'connection'));
        if ($scope === 'content_meta') {
            $content_meta_settings = $this->sanitize_content_meta_settings(wp_unslash($_POST['rankwoven_content_meta_settings'] ?? []));
            update_option(self::OPTION_CONTENT_META_SETTINGS, $content_meta_settings);
            delete_option(self::OPTION_LAST_ERROR);
            $this->redirect_with_status('settings_saved', 'content_meta');
        }

        update_option(
            self::OPTION_API_BASE_URL,
            esc_url_raw(wp_unslash($_POST['rankwoven_api_base_url'] ?? ''))
        );
        $ga4_property_id = sanitize_text_field(wp_unslash($_POST['rankwoven_ga4_property_id'] ?? ''));
        update_option(self::OPTION_GA4_PROPERTY_ID, $ga4_property_id);
        $twitter_username = ltrim(sanitize_text_field(wp_unslash($_POST['rankwoven_twitter_username'] ?? '')), '@');
        $facebook_app_id = sanitize_text_field(wp_unslash($_POST['rankwoven_facebook_app_id'] ?? ''));
        update_option(self::OPTION_TWITTER_USERNAME, $twitter_username);
        update_option(self::OPTION_FACEBOOK_APP_ID, $facebook_app_id);

        $wp_admin_username = sanitize_text_field(wp_unslash($_POST['rankwoven_wp_admin_username'] ?? ''));
        $wp_application_password = sanitize_text_field(wp_unslash($_POST['rankwoven_wp_application_password'] ?? ''));

        update_option(self::OPTION_WP_ADMIN_USERNAME, $wp_admin_username);

        if ($wp_admin_username === '') {
            delete_option(self::OPTION_WP_APPLICATION_PASSWORD);
        } elseif ($wp_application_password !== '') {
            update_option(self::OPTION_WP_APPLICATION_PASSWORD, $wp_application_password);
        }

        $site_id = sanitize_text_field(get_option(self::OPTION_SITE_ID, ''));
        if ($site_id !== '' && !$this->sync_analytics_settings_to_saas($site_id, $ga4_property_id)) {
            $this->redirect_with_status('analytics_settings_update_failed');
        }

        if ($site_id !== '' && $wp_admin_username !== '' && $wp_application_password !== '') {
            if (!$this->sync_wordpress_credentials_to_saas($site_id, $wp_admin_username, $wp_application_password)) {
                $this->redirect_with_status('wordpress_credentials_update_failed');
            }

            update_option(self::OPTION_LAST_TOKEN_USED_AT, gmdate('c'));
            delete_option(self::OPTION_LAST_ERROR);
            $this->redirect_with_status('wordpress_credentials_updated');
        }

        delete_option(self::OPTION_LAST_ERROR);
        $this->redirect_with_status('settings_saved');
    }

    public function handle_connect_site(): void
    {
        $this->assert_admin_action('rankwoven_connect_site');

        $api_base_url = $this->get_api_base_url();
        if ($api_base_url === '') {
            $this->redirect_with_status('missing_api_base_url');
        }

        $wp_credentials = $this->get_wordpress_admin_credentials();
        if ($wp_credentials['username'] === '' || $wp_credentials['applicationPassword'] === '') {
            $this->redirect_with_status('missing_wordpress_application_password');
        }

        $payload = [
            'platform' => 'wordpress',
            'name' => get_bloginfo('name'),
            'siteUrl' => home_url('/'),
            'cmsVersion' => get_bloginfo('version'),
            'pluginVersion' => self::VERSION,
            'googleAnalyticsPropertyId' => sanitize_text_field(get_option(self::OPTION_GA4_PROPERTY_ID, '')),
            'wordpressAdminUsername' => $wp_credentials['username'],
            'wordpressApplicationPassword' => $wp_credentials['applicationPassword']
        ];

        $existing_site_id = sanitize_text_field(get_option(self::OPTION_SITE_ID, ''));
        $existing_site_token = sanitize_text_field(get_option(self::OPTION_SITE_TOKEN, ''));
        if ($existing_site_id !== '' && $existing_site_token !== '') {
            // 同一站點已連接過：更新資訊並沿用既有 token，避免 SaaS 後台重複新增站點。
            $response = wp_remote_request(
                $this->build_api_url('/api/v1/site-connections/' . $existing_site_id),
                [
                    'method' => 'PUT',
                    'timeout' => 30,
                    'headers' => [
                        'Content-Type' => 'application/json',
                        'Authorization' => 'Bearer ' . $existing_site_token
                    ],
                    'body' => wp_json_encode($payload)
                ]
            );
        } else {
            // 首次連接：建立新站點並取得 token。
            $response = wp_remote_post($this->build_api_url('/api/v1/site-connections'), [
                'timeout' => 30,
                'headers' => ['Content-Type' => 'application/json'],
                'body' => wp_json_encode($payload)
            ]);
        }

        if (is_wp_error($response)) {
            $this->redirect_with_status('connection_failed');
        }

        $body = $this->decode_response_body($response);
        if (!($body['success'] ?? false) || empty($body['data']['site']['id'])) {
            $this->redirect_with_status('connection_failed');
        }

        $new_site_id = sanitize_text_field($body['data']['site']['id']);
        $new_api_token = isset($body['data']['apiToken']) ? sanitize_text_field($body['data']['apiToken']) : '';

        update_option(self::OPTION_SITE_ID, $new_site_id);
        if ($new_api_token !== '') {
            // 僅在 API 重新發出新 token 時覆寫；否則保留本地既有 token 不變。
            update_option(self::OPTION_SITE_TOKEN, $new_api_token);
        }
        update_option(self::OPTION_LAST_TOKEN_USED_AT, gmdate('c'));
        delete_option(self::OPTION_LAST_ERROR);

        $this->redirect_with_status('site_connected');
    }

    public function handle_sync_content(): void
    {
        $this->assert_admin_action('rankwoven_sync_content');

        $site_id = sanitize_text_field(get_option(self::OPTION_SITE_ID, ''));
        $site_token = sanitize_text_field(get_option(self::OPTION_SITE_TOKEN, ''));

        if ($site_id === '' || $site_token === '') {
            $this->redirect_with_status('missing_site_credentials');
        }

        $sync_started_at = gmdate('c');
        $updated_after = $this->get_incremental_updated_after();
        $task_response = $this->create_sync_task($site_id, $site_token, $sync_started_at, $updated_after);

        if (is_wp_error($task_response)) {
            $this->redirect_with_status('sync_failed');
        }

        $task_body = $this->decode_response_body($task_response);
        $this->redirect_if_sync_response_failed($task_response, $task_body);

        $sync_task_id = sanitize_text_field($task_body['data']['task']['id'] ?? '');
        if ($sync_task_id === '') {
            $this->redirect_with_status('sync_failed');
        }

        $sync_summary = $this->sync_paginated_content_batches(
            $site_id,
            $site_token,
            $sync_task_id,
            $sync_started_at,
            $updated_after
        );

        update_option(self::OPTION_LAST_SYNC_RESULT, [
            'syncedAt' => gmdate('c'),
            'syncStartedAt' => $sync_started_at,
            'updatedAfter' => $updated_after,
            'syncMode' => $updated_after === '' ? 'full' : 'incremental',
            'syncTaskId' => $sync_task_id,
            'articlesReceived' => (int) $sync_summary['articlesReceived'],
            'mediaReceived' => (int) $sync_summary['mediaReceived'],
            'articlePagesSynced' => (int) $sync_summary['articlePagesSynced'],
            'mediaPagesSynced' => (int) $sync_summary['mediaPagesSynced']
        ]);
        update_option(self::OPTION_LAST_TOKEN_USED_AT, gmdate('c'));
        delete_option(self::OPTION_LAST_ERROR);

        $this->redirect_with_status('sync_completed');
    }

    public function handle_generate_sitemap(): void
    {
        $this->assert_admin_action('rankwoven_generate_sitemap');

        $sitemap_result = $this->build_sitemap_generation_result();
        update_option(self::OPTION_LAST_SITEMAP_RESULT, $sitemap_result);
        delete_option(self::OPTION_LAST_ERROR);

        $this->redirect_with_status('sitemap_generated', 'sitemap');
    }

    public function handle_submit_sitemap_google(): void
    {
        $this->assert_admin_action('rankwoven_submit_sitemap_google');

        $api_base_url = $this->get_api_base_url();
        if ($api_base_url === '') {
            $this->redirect_with_status('missing_api_base_url', 'sitemap');
        }

        $site_id = sanitize_text_field(get_option(self::OPTION_SITE_ID, ''));
        $site_token = sanitize_text_field(get_option(self::OPTION_SITE_TOKEN, ''));
        if ($site_id === '' || $site_token === '') {
            $this->redirect_with_status('missing_site_credentials', 'sitemap');
        }

        $sitemap_url = $this->get_sitemap_url();
        $attempted_at = gmdate('c');
        $response = wp_remote_post(
            $this->build_api_url('/api/v1/site-connections/' . rawurlencode($site_id) . '/search-console/sitemaps'),
            [
                'timeout' => 45,
                'headers' => [
                    'Authorization' => 'Bearer ' . $site_token,
                    'Content-Type' => 'application/json',
                    'Accept' => 'application/json'
                ],
                'body' => wp_json_encode([
                    'sitemapPath' => 'sitemap.xml'
                ])
            ]
        );

        if (is_wp_error($response)) {
            update_option(self::OPTION_LAST_SITEMAP_SUBMISSION_RESULT, [
                'attemptedAt' => $attempted_at,
                'success' => false,
                'sitemapUrl' => $sitemap_url,
                'propertyUrl' => '',
                'message' => $response->get_error_message()
            ]);
            $this->redirect_with_status('sitemap_submit_failed', 'sitemap');
        }

        $body = $this->decode_response_body($response);
        $response_code = (int) wp_remote_retrieve_response_code($response);
        if (!($body['success'] ?? false)) {
            $error_code = sanitize_text_field((string) ($body['error']['code'] ?? ''));
            $message = is_string($body['message'] ?? null) ? $body['message'] : __('Google sitemap submission failed.', 'rankwoven-seo');

            update_option(self::OPTION_LAST_SITEMAP_SUBMISSION_RESULT, [
                'attemptedAt' => $attempted_at,
                'success' => false,
                'sitemapUrl' => $sitemap_url,
                'propertyUrl' => '',
                'message' => $message
            ]);

            if ($response_code === 401 || $error_code === 'SITE_TOKEN_INVALID') {
                $this->redirect_with_status('site_token_invalid', 'sitemap');
            }

            if ($error_code === 'GOOGLE_CREDENTIALS_NOT_CONFIGURED') {
                $this->redirect_with_status('google_credentials_not_configured', 'sitemap');
            }

            $this->redirect_with_status('sitemap_submit_failed', 'sitemap');
        }

        $data = is_array($body['data'] ?? null) ? $body['data'] : [];
        $property_url = sanitize_text_field((string) ($data['propertyUrl'] ?? ''));
        $submitted_at = sanitize_text_field((string) ($data['submittedAt'] ?? $attempted_at));
        $message = is_string($body['message'] ?? null)
            ? sanitize_text_field((string) $body['message'])
            : __('Sitemap 已提交到 Google Search Console。', 'rankwoven-seo');

        update_option(self::OPTION_LAST_SITEMAP_SUBMISSION_RESULT, [
            'attemptedAt' => $attempted_at,
            'submittedAt' => $submitted_at,
            'success' => true,
            'sitemapUrl' => $sitemap_url,
            'propertyUrl' => $property_url,
            'message' => $message
        ]);
        update_option(self::OPTION_LAST_TOKEN_USED_AT, gmdate('c'));
        delete_option(self::OPTION_LAST_ERROR);

        $this->redirect_with_status('sitemap_submitted', 'sitemap');
    }

    public function handle_run_seo_audit(): void
    {
        $this->assert_admin_action('rankwoven_run_seo_audit');

        $result = $this->request_saas_site_api('POST', 'audits');
        if (is_wp_error($result)) {
            $this->redirect_with_status('seo_audit_failed', 'seo_analysis');
        }

        delete_option(self::OPTION_LAST_ERROR);
        $this->redirect_with_status('seo_audit_completed', 'seo_analysis');
    }

    public function handle_manage_suggestions(): void
    {
        $this->assert_admin_action('rankwoven_manage_suggestions');

        $raw_ids = wp_unslash($_POST['rankwoven_suggestion_ids'] ?? []);
        $suggestion_ids = is_array($raw_ids)
            ? array_values(array_filter(array_map(static fn($id): string => sanitize_text_field((string) $id), $raw_ids)))
            : [];
        if (empty($suggestion_ids)) {
            $this->redirect_with_status('suggestions_missing_selection', 'link_assistant');
        }

        $mode = sanitize_key(wp_unslash($_POST['rankwoven_suggestion_action'] ?? ''));
        if ($mode === 'approve') {
            $result = $this->request_saas_site_api('POST', 'suggestions/batch-approve', [
                'suggestionIds' => $suggestion_ids
            ]);
        } elseif ($mode === 'apply') {
            $approve_result = $this->request_saas_site_api('POST', 'suggestions/batch-approve', [
                'suggestionIds' => $suggestion_ids
            ]);
            if (is_wp_error($approve_result)) {
                $this->redirect_with_status('suggestions_action_failed', 'link_assistant');
            }

            $result = $this->request_saas_site_api('POST', 'suggestions/batch-apply', [
                'suggestionIds' => $suggestion_ids
            ]);
        } else {
            $this->redirect_with_status('suggestions_action_failed', 'link_assistant');
        }

        if (is_wp_error($result)) {
            $this->redirect_with_status('suggestions_action_failed', 'link_assistant');
        }

        delete_option(self::OPTION_LAST_ERROR);
        $this->redirect_with_status($mode === 'apply' ? 'suggestions_applied' : 'suggestions_approved', 'link_assistant');
    }

    public function handle_save_image_attributes(): void
    {
        $this->assert_admin_action('rankwoven_save_image_attributes');

        update_option(self::OPTION_IMAGE_ATTRIBUTE_SETTINGS, $this->sanitize_image_attribute_settings(wp_unslash($_POST)));
        $this->redirect_with_status('image_attribute_settings_saved', 'image_attributes');
    }

    public function handle_test_image_attributes(): void
    {
        $this->assert_admin_action('rankwoven_test_image_attributes');

        $image_ids = $this->get_next_image_attachment_ids(0, 1);
        if (empty($image_ids)) {
            $this->append_image_bulk_log(__('No image attachments found for testing.', 'rankwoven-seo'));
            $this->redirect_with_status('image_bulk_no_images', 'image_bulk');
        }

        $result = $this->update_image_attachment_attributes((int) $image_ids[0]);
        $this->append_image_bulk_log(sprintf(
            /* translators: 1: attachment ID, 2: generated image text */
            __('Test updated image #%1$d as "%2$s".', 'rankwoven-seo'),
            (int) $image_ids[0],
            $result
        ));

        $this->redirect_with_status('image_bulk_test_completed', 'image_bulk');
    }

    public function handle_bulk_update_image_attributes(): void
    {
        $this->assert_admin_action('rankwoven_bulk_update_image_attributes');

        $last_processed_id = (int) get_option(self::OPTION_IMAGE_BULK_LAST_ID, 0);
        $image_ids = $this->get_next_image_attachment_ids($last_processed_id, self::IMAGE_BULK_BATCH_SIZE);

        if (empty($image_ids)) {
            $this->append_image_bulk_log(__('No remaining image attachments to update.', 'rankwoven-seo'));
            $this->redirect_with_status('image_bulk_no_images', 'image_bulk');
        }

        $updated_count = 0;
        foreach ($image_ids as $image_id) {
            $this->update_image_attachment_attributes((int) $image_id);
            update_option(self::OPTION_IMAGE_BULK_LAST_ID, (int) $image_id);
            $updated_count++;
        }

        $this->append_image_bulk_log(sprintf(
            /* translators: 1: updated count, 2: highest processed attachment ID */
            __('Bulk updated %1$d images. Last processed attachment ID: %2$d.', 'rankwoven-seo'),
            $updated_count,
            (int) end($image_ids)
        ));

        $this->redirect_with_status('image_bulk_completed', 'image_bulk');
    }

    public function handle_reset_image_bulk_counter(): void
    {
        $this->assert_admin_action('rankwoven_reset_image_bulk_counter');

        update_option(self::OPTION_IMAGE_BULK_LAST_ID, 0);
        $this->append_image_bulk_log(__('Bulk updater counter was reset.', 'rankwoven-seo'));
        $this->redirect_with_status('image_bulk_counter_reset', 'image_bulk');
    }

    public function handle_new_attachment(int $attachment_id): void
    {
        if (!$this->is_image_attachment($attachment_id)) {
            return;
        }

        $this->update_image_attachment_attributes($attachment_id);
    }

    public function add_image_title_attributes_to_content(string $content): string
    {
        $settings = $this->get_image_attribute_settings();
        if (!$settings['insert_title_attribute'] || !class_exists('WP_HTML_Tag_Processor')) {
            return $content;
        }

        $processor = new WP_HTML_Tag_Processor($content);
        while ($processor->next_tag('img')) {
            if ((string) $processor->get_attribute('title') !== '') {
                continue;
            }

            $title = $this->get_title_for_content_image($processor);
            if ($title !== '') {
                $processor->set_attribute('title', $title);
            }
        }

        return $processor->get_updated_html();
    }

    public function register_rest_routes(): void
    {
        register_rest_route(self::REST_NAMESPACE, '/site', [
            'methods' => 'GET',
            'callback' => [$this, 'get_site_rest_response'],
            'permission_callback' => [$this, 'authorize_rest_request']
        ]);

        register_rest_route(self::REST_NAMESPACE, '/posts', [
            'methods' => 'GET',
            'callback' => [$this, 'get_posts_rest_response'],
            'permission_callback' => [$this, 'authorize_rest_request'],
            'args' => $this->get_pagination_args()
        ]);

        register_rest_route(self::REST_NAMESPACE, '/posts/(?P<id>\d+)', [
            'methods' => 'GET',
            'callback' => [$this, 'get_single_post_rest_response'],
            'permission_callback' => [$this, 'authorize_rest_request']
        ]);

        register_rest_route(self::REST_NAMESPACE, '/posts/(?P<id>\d+)/apply', [
            'methods' => 'POST',
            'callback' => [$this, 'apply_single_post_rest_response'],
            'permission_callback' => [$this, 'authorize_post_write_request']
        ]);

        register_rest_route(self::REST_NAMESPACE, '/media', [
            'methods' => 'GET',
            'callback' => [$this, 'get_media_rest_response'],
            'permission_callback' => [$this, 'authorize_rest_request'],
            'args' => $this->get_pagination_args()
        ]);

        register_rest_route(self::REST_NAMESPACE, '/media/(?P<id>\d+)', [
            'methods' => 'GET',
            'callback' => [$this, 'get_single_media_rest_response'],
            'permission_callback' => [$this, 'authorize_rest_request']
        ]);

        register_rest_route(self::REST_NAMESPACE, '/media/(?P<id>\d+)/apply', [
            'methods' => 'POST',
            'callback' => [$this, 'apply_single_media_rest_response'],
            'permission_callback' => [$this, 'authorize_media_write_request']
        ]);
    }

    public function authorize_rest_request(WP_REST_Request $request): bool
    {
        if ($this->is_site_token_authorized($request)) {
            return true;
        }

        return current_user_can('edit_posts') || current_user_can('upload_files');
    }

    public function authorize_post_write_request(WP_REST_Request $request): bool
    {
        return current_user_can('edit_post', (int) $request->get_param('id'));
    }

    public function authorize_media_write_request(WP_REST_Request $request): bool
    {
        return current_user_can('edit_post', (int) $request->get_param('id'));
    }

    private function is_site_token_authorized(WP_REST_Request $request): bool
    {
        $site_token = sanitize_text_field(get_option(self::OPTION_SITE_TOKEN, ''));
        if ($site_token === '') {
            return false;
        }

        $authorization = $request->get_header('authorization');
        if (!is_string($authorization) || !str_starts_with($authorization, 'Bearer ')) {
            return false;
        }

        return trim(substr($authorization, 7)) === $site_token;
    }

    public function get_site_rest_response(): WP_REST_Response
    {
        return new WP_REST_Response([
            'platform' => 'wordpress',
            'name' => get_bloginfo('name'),
            'siteUrl' => home_url('/'),
            'cmsVersion' => get_bloginfo('version'),
            'pluginVersion' => self::VERSION
        ]);
    }

    public function get_posts_rest_response(WP_REST_Request $request): WP_REST_Response
    {
        $per_page = (int) $request->get_param('perPage');
        $page = (int) $request->get_param('page');
        $updated_after = sanitize_text_field((string) $request->get_param('updatedAfter'));

        return new WP_REST_Response([
            'articles' => $this->get_synced_articles($per_page, $page, $updated_after),
            'page' => $page,
            'perPage' => $per_page,
            'updatedAfter' => $updated_after
        ]);
    }

    public function get_single_post_rest_response(WP_REST_Request $request): WP_REST_Response
    {
        $article = $this->get_synced_article_by_id((int) $request->get_param('id'));

        if ($article === null) {
            return new WP_REST_Response([
                'success' => false,
                'message' => __('Article not found or cannot be synced.', 'rankwoven-seo')
            ], 404);
        }

        return new WP_REST_Response([
            'article' => $article
        ]);
    }

    public function get_media_rest_response(WP_REST_Request $request): WP_REST_Response
    {
        $per_page = (int) $request->get_param('perPage');
        $page = (int) $request->get_param('page');
        $updated_after = sanitize_text_field((string) $request->get_param('updatedAfter'));

        return new WP_REST_Response([
            'media' => $this->get_synced_media($per_page, $page, $updated_after),
            'page' => $page,
            'perPage' => $per_page,
            'updatedAfter' => $updated_after
        ]);
    }

    public function get_single_media_rest_response(WP_REST_Request $request): WP_REST_Response
    {
        $media = $this->get_synced_media_by_id((int) $request->get_param('id'));

        if ($media === null) {
            return new WP_REST_Response([
                'success' => false,
                'message' => __('Media item not found or cannot be synced.', 'rankwoven-seo')
            ], 404);
        }

        return new WP_REST_Response([
            'media' => $media
        ]);
    }

    public function apply_single_post_rest_response(WP_REST_Request $request): WP_REST_Response
    {
        $post_id = (int) $request->get_param('id');
        $post = get_post($post_id);

        if (!($post instanceof WP_Post) || !in_array($post->post_type, $this->get_supported_editor_post_types(), true)) {
            return new WP_REST_Response([
                'success' => false,
                'message' => __('Article not found or cannot be updated.', 'rankwoven-seo')
            ], 404);
        }

        $payload = $request->get_json_params();
        $payload = is_array($payload) ? $payload : [];
        $post_update = ['ID' => $post_id];
        $changed_fields = [];

        if (isset($payload['title'])) {
            $post_update['post_title'] = sanitize_text_field((string) $payload['title']);
            $changed_fields[] = 'title';
        }

        if (isset($payload['excerpt'])) {
            $post_update['post_excerpt'] = wp_kses_post((string) $payload['excerpt']);
            $changed_fields[] = 'excerpt';
        }

        if (isset($payload['contentHtml'])) {
            $post_update['post_content'] = wp_kses_post((string) $payload['contentHtml']);
            $changed_fields[] = 'contentHtml';
        }

        if (isset($payload['metaDescription'])) {
            update_post_meta($post_id, '_rankwoven_meta_description', sanitize_textarea_field((string) $payload['metaDescription']));
            $changed_fields[] = 'metaDescription';
        }

        if (count($post_update) > 1) {
            $updated_post_id = wp_update_post(wp_slash($post_update), true);
            if (is_wp_error($updated_post_id)) {
                return new WP_REST_Response([
                    'success' => false,
                    'message' => $updated_post_id->get_error_message()
                ], 500);
            }
        }

        return new WP_REST_Response([
            'success' => true,
            'changedFields' => array_values(array_unique($changed_fields)),
            'appliedAt' => gmdate('c'),
            'article' => $this->get_synced_article_by_id($post_id)
        ]);
    }

    public function apply_single_media_rest_response(WP_REST_Request $request): WP_REST_Response
    {
        $attachment_id = (int) $request->get_param('id');
        $attachment = get_post($attachment_id);

        if (!($attachment instanceof WP_Post) || $attachment->post_type !== 'attachment') {
            return new WP_REST_Response([
                'success' => false,
                'message' => __('Media item not found or cannot be updated.', 'rankwoven-seo')
            ], 404);
        }

        $payload = $request->get_json_params();
        $payload = is_array($payload) ? $payload : [];
        $post_update = ['ID' => $attachment_id];
        $changed_fields = [];

        if (isset($payload['title'])) {
            $post_update['post_title'] = sanitize_text_field((string) $payload['title']);
            $changed_fields[] = 'title';
        }

        if (isset($payload['caption'])) {
            $post_update['post_excerpt'] = wp_kses_post((string) $payload['caption']);
            $changed_fields[] = 'caption';
        }

        if (isset($payload['description'])) {
            $post_update['post_content'] = wp_kses_post((string) $payload['description']);
            $changed_fields[] = 'description';
        }

        if (isset($payload['altText'])) {
            update_post_meta($attachment_id, '_wp_attachment_image_alt', sanitize_textarea_field((string) $payload['altText']));
            $changed_fields[] = 'altText';
        }

        if (isset($payload['fileName'])) {
            $rename_result = $this->rename_attachment_file($attachment_id, (string) $payload['fileName']);
            if (is_wp_error($rename_result)) {
                return new WP_REST_Response([
                    'success' => false,
                    'message' => $rename_result->get_error_message()
                ], 500);
            }
            $changed_fields[] = 'fileName';
        }

        if (count($post_update) > 1) {
            $updated_post_id = wp_update_post(wp_slash($post_update), true);
            if (is_wp_error($updated_post_id)) {
                return new WP_REST_Response([
                    'success' => false,
                    'message' => $updated_post_id->get_error_message()
                ], 500);
            }
        }

        return new WP_REST_Response([
            'success' => true,
            'changedFields' => array_values(array_unique($changed_fields)),
            'appliedAt' => gmdate('c'),
            'media' => $this->get_synced_media_by_id($attachment_id)
        ]);
    }

    private function rename_attachment_file(int $attachment_id, string $requested_file_name)
    {
        $attached_file = get_attached_file($attachment_id);
        if (!is_string($attached_file) || $attached_file === '' || !file_exists($attached_file)) {
            return new WP_Error('rankwoven_attachment_file_missing', __('Attachment file not found on disk.', 'rankwoven-seo'));
        }

        $current_filename = basename($attached_file);
        $current_extension = pathinfo($current_filename, PATHINFO_EXTENSION);
        $current_directory = dirname($attached_file);
        $sanitized_file_name = sanitize_file_name($requested_file_name);
        $desired_basename = pathinfo($sanitized_file_name, PATHINFO_FILENAME);

        if ($desired_basename === '') {
            return new WP_Error('rankwoven_invalid_file_name', __('Invalid media filename.', 'rankwoven-seo'));
        }

        $target_filename = $desired_basename . ($current_extension !== '' ? '.' . $current_extension : '');
        if ($target_filename === $current_filename) {
            return true;
        }

        $target_filename = wp_unique_filename($current_directory, $target_filename);
        $target_path = trailingslashit($current_directory) . $target_filename;

        if (!@rename($attached_file, $target_path)) {
            return new WP_Error('rankwoven_attachment_rename_failed', __('Unable to rename attachment file.', 'rankwoven-seo'));
        }

        $metadata = wp_get_attachment_metadata($attachment_id);
        $current_basename = pathinfo($current_filename, PATHINFO_FILENAME);
        $new_basename = pathinfo($target_filename, PATHINFO_FILENAME);

        if (is_array($metadata)) {
            if (!empty($metadata['sizes']) && is_array($metadata['sizes'])) {
                foreach ($metadata['sizes'] as $size_key => $size_meta) {
                    if (empty($size_meta['file']) || !is_string($size_meta['file'])) {
                        continue;
                    }

                    $old_size_file = $size_meta['file'];
                    $suffix = str_starts_with($old_size_file, $current_basename)
                        ? substr($old_size_file, strlen($current_basename))
                        : '-' . $old_size_file;
                    $new_size_file = $new_basename . $suffix;
                    $old_size_path = trailingslashit($current_directory) . $old_size_file;
                    $new_size_path = trailingslashit($current_directory) . $new_size_file;

                    if (file_exists($old_size_path)) {
                        @rename($old_size_path, $new_size_path);
                    }

                    $metadata['sizes'][$size_key]['file'] = $new_size_file;
                }
            }

            if (!empty($metadata['original_image']) && is_string($metadata['original_image'])) {
                $old_original_file = $metadata['original_image'];
                $suffix = str_starts_with($old_original_file, $current_basename)
                    ? substr($old_original_file, strlen($current_basename))
                    : '-' . $old_original_file;
                $new_original_file = $new_basename . $suffix;
                $old_original_path = trailingslashit($current_directory) . $old_original_file;
                $new_original_path = trailingslashit($current_directory) . $new_original_file;

                if (file_exists($old_original_path)) {
                    @rename($old_original_path, $new_original_path);
                }

                $metadata['original_image'] = $new_original_file;
            }

            $relative_target_path = _wp_relative_upload_path($target_path);
            if (is_string($relative_target_path) && $relative_target_path !== '') {
                $metadata['file'] = $relative_target_path;
            }

            wp_update_attachment_metadata($attachment_id, $metadata);
        }

        update_attached_file($attachment_id, $target_path);

        return true;
    }

    private function get_synced_articles(int $per_page, int $page, string $updated_after = ''): array
    {
        $query_args = [
            'post_type' => $this->get_supported_editor_post_types(),
            'post_status' => ['publish', 'draft', 'pending', 'future'],
            'posts_per_page' => $this->normalize_per_page($per_page),
            'paged' => max(1, $page),
            'orderby' => 'modified',
            'order' => 'DESC',
            'no_found_rows' => true
        ];

        $date_query = $this->get_modified_after_date_query($updated_after);
        if (!empty($date_query)) {
            $query_args['date_query'] = $date_query;
        }

        $posts = get_posts($query_args);

        return array_map([$this, 'map_post_to_synced_article'], $posts);
    }

    private function get_synced_article_by_id(int $post_id): ?array
    {
        $post = get_post($post_id);

        if (!($post instanceof WP_Post)) {
            return null;
        }

        if (!in_array($post->post_type, $this->get_supported_editor_post_types(), true)) {
            return null;
        }

        if (!in_array((string) get_post_status($post), ['publish', 'draft', 'pending', 'future'], true)) {
            return null;
        }

        return $this->map_post_to_synced_article($post);
    }

    private function get_synced_media(int $per_page, int $page, string $updated_after = ''): array
    {
        $query_args = [
            'post_type' => 'attachment',
            'post_status' => 'inherit',
            'post_mime_type' => 'image',
            'posts_per_page' => $this->normalize_per_page($per_page),
            'paged' => max(1, $page),
            'orderby' => 'modified',
            'order' => 'DESC',
            'no_found_rows' => true
        ];

        $date_query = $this->get_modified_after_date_query($updated_after);
        if (!empty($date_query)) {
            $query_args['date_query'] = $date_query;
        }

        $attachments = get_posts($query_args);

        return array_map([$this, 'map_attachment_to_synced_media'], $attachments);
    }

    private function get_synced_media_by_id(int $attachment_id): ?array
    {
        $attachment = get_post($attachment_id);

        if (!($attachment instanceof WP_Post) || $attachment->post_type !== 'attachment') {
            return null;
        }

        if ((string) $attachment->post_status !== 'inherit') {
            return null;
        }

        if (!$this->is_image_attachment($attachment_id)) {
            return null;
        }

        return $this->map_attachment_to_synced_media($attachment);
    }

    private function create_sync_task(
        string $site_id,
        string $site_token,
        string $sync_started_at,
        string $updated_after
    ) {
        $body = [
            'syncStartedAt' => $sync_started_at
        ];

        if ($updated_after !== '') {
            $body['updatedAfter'] = $updated_after;
        }

        return wp_remote_post($this->build_api_url('/api/v1/site-connections/' . rawurlencode($site_id) . '/sync-tasks'), [
            'timeout' => 30,
            'headers' => [
                'Authorization' => 'Bearer ' . $site_token,
                'Content-Type' => 'application/json'
            ],
            'body' => wp_json_encode($body)
        ]);
    }

    private function sync_paginated_content_batches(
        string $site_id,
        string $site_token,
        string $sync_task_id,
        string $sync_started_at,
        string $updated_after
    ): array
    {
        $article_pages_synced = 0;
        $media_pages_synced = 0;
        $articles_received = 0;
        $media_received = 0;
        $page = 1;

        while ($page <= self::SYNC_MAX_BATCH_PAGES) {
            $articles = $this->get_synced_articles(self::SYNC_PAGE_SIZE, $page, $updated_after);
            $media = $this->get_synced_media(self::SYNC_PAGE_SIZE, $page, $updated_after);
            $article_count = count($articles);
            $media_count = count($media);
            $is_final_batch = $article_count < self::SYNC_PAGE_SIZE && $media_count < self::SYNC_PAGE_SIZE;

            if ($article_count > 0) {
                $article_pages_synced++;
            }

            if ($media_count > 0) {
                $media_pages_synced++;
            }

            $response = $this->send_sync_batch(
                $site_id,
                $site_token,
                $sync_task_id,
                $page,
                $sync_started_at,
                $updated_after,
                $articles,
                $media,
                $is_final_batch
            );

            if (is_wp_error($response)) {
                $this->redirect_with_status('sync_failed');
            }

            $body = $this->decode_response_body($response);
            $this->redirect_if_sync_response_failed($response, $body);

            $articles_received = (int) ($body['data']['task']['articlesReceived'] ?? ($articles_received + $article_count));
            $media_received = (int) ($body['data']['task']['mediaReceived'] ?? ($media_received + $media_count));

            if ($is_final_batch) {
                break;
            }

            $page++;
        }

        if ($page > self::SYNC_MAX_BATCH_PAGES) {
            $this->redirect_with_status('sync_failed');
        }

        return [
            'articlesReceived' => $articles_received,
            'mediaReceived' => $media_received,
            'articlePagesSynced' => $article_pages_synced,
            'mediaPagesSynced' => $media_pages_synced
        ];
    }

    private function send_sync_batch(
        string $site_id,
        string $site_token,
        string $sync_task_id,
        int $batch_index,
        string $sync_started_at,
        string $updated_after,
        array $articles,
        array $media,
        bool $is_final_batch
    ) {
        $body = [
            'batchIndex' => $batch_index,
            'syncStartedAt' => $sync_started_at,
            'articles' => $articles,
            'media' => $media,
            'isFinalBatch' => $is_final_batch
        ];

        if ($updated_after !== '') {
            $body['updatedAfter'] = $updated_after;
        }

        return wp_remote_post($this->build_api_url('/api/v1/site-connections/' . rawurlencode($site_id) . '/sync-tasks/' . rawurlencode($sync_task_id) . '/batches'), [
            'timeout' => 45,
            'headers' => [
                'Authorization' => 'Bearer ' . $site_token,
                'Content-Type' => 'application/json'
            ],
            'body' => wp_json_encode($body)
        ]);
    }

    private function redirect_if_sync_response_failed($response, array $body): void
    {
        if (($body['success'] ?? false)) {
            return;
        }

        $error_code = $body['error']['code'] ?? '';
        if (wp_remote_retrieve_response_code($response) === 401 || $error_code === 'SITE_TOKEN_INVALID') {
            $this->redirect_with_status('site_token_invalid');
        }

        $this->redirect_with_status('sync_failed');
    }

    private function get_incremental_updated_after(): string
    {
        $last_sync_result = get_option(self::OPTION_LAST_SYNC_RESULT, []);
        if (!is_array($last_sync_result)) {
            return '';
        }

        $value = sanitize_text_field((string) ($last_sync_result['syncStartedAt'] ?? $last_sync_result['syncedAt'] ?? ''));
        return strtotime($value) === false ? '' : $value;
    }

    private function get_modified_after_date_query(string $updated_after): array
    {
        if ($updated_after === '') {
            return [];
        }

        $timestamp = strtotime($updated_after);
        if ($timestamp === false) {
            return [];
        }

        return [
            [
                'column' => 'post_modified_gmt',
                'after' => gmdate('Y-m-d H:i:s', $timestamp),
                'inclusive' => false
            ]
        ];
    }

    private function map_post_to_synced_article(WP_Post $post): array
    {
        $categories = $this->get_post_taxonomy_term_names($post, true);
        $tags = $this->get_post_taxonomy_term_names($post, false);
        $featured_image_id = get_post_thumbnail_id($post->ID);
        $excerpt_source = $post->post_excerpt !== ''
            ? $post->post_excerpt
            : $this->extract_plain_text_content($post->post_content);
        $excerpt = $excerpt_source !== ''
            ? wp_trim_words($excerpt_source, 40, '')
            : '';
        $meta_description = $this->get_post_meta_description($post, $excerpt);

        return [
            'cmsId' => (string) $post->ID,
            'type' => $post->post_type,
            'title' => get_the_title($post),
            'slug' => $post->post_name,
            'status' => get_post_status($post),
            'url' => get_permalink($post) ?: '',
            'excerpt' => $excerpt,
            'metaDescription' => $meta_description,
            'contentHtml' => $post->post_content,
            'author' => get_the_author_meta('display_name', (int) $post->post_author),
            'categories' => $categories,
            'tags' => $tags,
            'featuredImageId' => $featured_image_id ? (string) $featured_image_id : '',
            'publishedAt' => $this->get_post_date_value($post, false),
            'updatedAt' => $this->get_post_date_value($post, true)
        ];
    }

    private function get_post_taxonomy_term_names(WP_Post $post, bool $hierarchical): array
    {
        $taxonomies = get_object_taxonomies($post->post_type, 'objects');
        if (!is_array($taxonomies) || empty($taxonomies)) {
            return [];
        }

        $taxonomy_names = [];
        foreach ($taxonomies as $taxonomy_name => $taxonomy) {
            if (!is_object($taxonomy) || empty($taxonomy->public) || (bool) $taxonomy->hierarchical !== $hierarchical) {
                continue;
            }

            $taxonomy_names[] = (string) $taxonomy_name;
        }

        if (empty($taxonomy_names)) {
            return [];
        }

        $terms = wp_get_object_terms($post->ID, $taxonomy_names, ['fields' => 'names']);
        if (is_wp_error($terms) || !is_array($terms)) {
            return [];
        }

        return array_values(array_unique(array_filter(array_map(static function ($term): string {
            return sanitize_text_field((string) $term);
        }, $terms))));
    }

    private function get_post_meta_description(WP_Post $post, string $excerpt): string
    {
        foreach ($this->get_editor_seo_meta_description_keys() as $meta_key) {
            $value = trim((string) get_post_meta($post->ID, $meta_key, true));
            if ($value !== '') {
                return $this->extract_plain_text_content($value);
            }
        }

        $content_meta_settings = $this->get_content_meta_settings_for_post_type($post->post_type);
        $template = sanitize_text_field((string) ($content_meta_settings['meta_description_template'] ?? ''));
        if ($template !== '') {
            $rendered = $this->render_content_meta_template($template, $post, $excerpt);
            if ($rendered !== '') {
                return $this->extract_plain_text_content($rendered);
            }
        }

        return $this->extract_plain_text_content($excerpt);
    }

    private function map_attachment_to_synced_media(WP_Post $attachment): array
    {
        $attached_file = get_attached_file($attachment->ID);

        return [
            'cmsId' => (string) $attachment->ID,
            'title' => get_the_title($attachment),
            'url' => wp_get_attachment_url($attachment->ID) ?: '',
            'mimeType' => get_post_mime_type($attachment) ?: '',
            'fileName' => is_string($attached_file) ? basename($attached_file) : '',
            'caption' => wp_strip_all_tags((string) $attachment->post_excerpt),
            'description' => wp_strip_all_tags((string) $attachment->post_content),
            'altText' => get_post_meta($attachment->ID, '_wp_attachment_image_alt', true),
            'attachedToCmsId' => $attachment->post_parent > 0 ? (string) $attachment->post_parent : '',
            'updatedAt' => $this->get_post_date_value($attachment, true)
        ];
    }

    private function extract_plain_text_content(string $content): string
    {
        $content = strip_shortcodes($content);
        $content = wp_strip_all_tags($content);
        $content = html_entity_decode($content, ENT_QUOTES | ENT_HTML5, get_bloginfo('charset'));
        $content = preg_replace('/\[[^\]]*\]/', ' ', $content) ?? $content;
        $content = preg_replace('/\s+/', ' ', $content) ?? $content;

        return trim($content);
    }

    private function get_post_date_value(WP_Post $post, bool $modified): string
    {
        $value = $modified
            ? get_post_modified_time('c', true, $post)
            : get_post_time('c', true, $post);

        return is_string($value) ? $value : '';
    }

    private function get_pagination_args(): array
    {
        return [
            'page' => [
                'default' => 1,
                'sanitize_callback' => 'absint',
                'validate_callback' => static fn($value): bool => (int) $value >= 1
            ],
            'perPage' => [
                'default' => 100,
                'sanitize_callback' => 'absint',
                'validate_callback' => static fn($value): bool => (int) $value >= 1 && (int) $value <= 100
            ],
            'updatedAfter' => [
                'default' => '',
                'sanitize_callback' => 'sanitize_text_field',
                'validate_callback' => static fn($value): bool => $value === '' || strtotime((string) $value) !== false
            ]
        ];
    }

    private function normalize_per_page(int $per_page): int
    {
        return min(100, max(1, $per_page));
    }

    private function get_active_admin_tab(): string
    {
        $tabs = $this->get_admin_menu_tabs();
        $requested_tab = sanitize_key(wp_unslash($_GET['rankwoven_tab'] ?? ''));
        if ($requested_tab !== '' && isset($tabs[$requested_tab])) {
            return $requested_tab;
        }

        $page = sanitize_key(wp_unslash($_GET['page'] ?? 'rankwoven-seo'));
        if (in_array($page, ['rankwoven-seo-settings', 'rankwoven-seo-connection'], true)) {
            return 'connection';
        }

        foreach ($tabs as $tab => $tab_config) {
            if ($page === $tab_config['slug']) {
                return $tab;
            }
        }

        return 'dashboard';
    }

    private function get_admin_tab_url(string $tab): string
    {
        $tabs = $this->get_admin_menu_tabs();
        $slug = $tabs[$tab]['slug'] ?? $tabs['dashboard']['slug'];

        return add_query_arg(['page' => $slug], admin_url('admin.php'));
    }

    private function get_image_attribute_settings(): array
    {
        $settings = get_option(self::OPTION_IMAGE_ATTRIBUTE_SETTINGS, []);
        $defaults = [
            'set_title' => true,
            'set_alt_text' => true,
            'set_caption' => true,
            'set_description' => true,
            'remove_hyphen' => true,
            'remove_underscore' => true,
            'remove_period' => false,
            'remove_comma' => false,
            'remove_numbers' => false,
            'insert_title_attribute' => true
        ];

        return array_merge($defaults, is_array($settings) ? $settings : []);
    }

    private function sanitize_image_attribute_settings(array $input): array
    {
        $defaults = $this->get_image_attribute_settings();
        $sanitized = [];

        foreach (array_keys($defaults) as $key) {
            $sanitized[$key] = !empty($input['rankwoven_image_attributes'][$key]);
        }

        return $sanitized;
    }

    private function get_default_content_meta_settings(): array
    {
        return [
            'seo_title_template' => '{{title}} | {{site_name}}',
            'meta_description_template' => '{{excerpt}}',
            'meta_keywords_template' => '{{focus_keyphrase}}'
        ];
    }

    private function get_content_meta_settings(): array
    {
        $saved_settings = get_option(self::OPTION_CONTENT_META_SETTINGS, []);
        $saved_settings = is_array($saved_settings) ? $saved_settings : [];
        $defaults = $this->get_default_content_meta_settings();
        $settings = [];

        foreach ($this->get_supported_editor_post_types() as $post_type) {
            $settings[$post_type] = $defaults;
            if (isset($saved_settings[$post_type]) && is_array($saved_settings[$post_type])) {
                $settings[$post_type] = array_merge($settings[$post_type], array_intersect_key($saved_settings[$post_type], $defaults));
            }
        }

        return $settings;
    }

    private function get_content_meta_settings_for_post_type(string $post_type): array
    {
        $settings = $this->get_content_meta_settings();
        return isset($settings[$post_type]) && is_array($settings[$post_type])
            ? $settings[$post_type]
            : $this->get_default_content_meta_settings();
    }

    private function sanitize_content_meta_settings(array $input): array
    {
        $defaults = $this->get_default_content_meta_settings();
        $sanitized = [];

        foreach ($this->get_supported_editor_post_types() as $post_type) {
            $post_type_input = isset($input[$post_type]) && is_array($input[$post_type]) ? $input[$post_type] : [];
            $sanitized[$post_type] = [
                'seo_title_template' => sanitize_text_field((string) ($post_type_input['seo_title_template'] ?? $defaults['seo_title_template'])),
                'meta_description_template' => sanitize_textarea_field((string) ($post_type_input['meta_description_template'] ?? $defaults['meta_description_template'])),
                'meta_keywords_template' => $this->sanitize_editor_meta_keywords($post_type_input['meta_keywords_template'] ?? $defaults['meta_keywords_template'])
            ];
        }

        return $sanitized;
    }

    private function build_content_meta_template_context(WP_Post $post, string $excerpt = ''): array
    {
        $post_type_object = get_post_type_object($post->post_type);
        $post_type_label = is_object($post_type_object)
            ? sanitize_text_field((string) ($post_type_object->labels->singular_name ?? $post->post_type))
            : sanitize_text_field($post->post_type);

        $normalized_excerpt = $this->extract_plain_text_content($excerpt);
        if ($normalized_excerpt === '') {
            $normalized_excerpt = $this->extract_plain_text_content((string) $post->post_excerpt);
        }

        if ($normalized_excerpt === '') {
            $normalized_content = $this->extract_plain_text_content((string) $post->post_content);
            $normalized_excerpt = $normalized_content !== ''
                ? wp_trim_words($normalized_content, 40, '')
                : '';
        }

        $context = [
            '{{title}}' => sanitize_text_field((string) get_the_title($post)),
            '{{excerpt}}' => $normalized_excerpt,
            '{{focus_keyphrase}}' => $this->get_post_focus_keyphrase($post),
            '{{site_name}}' => sanitize_text_field((string) get_bloginfo('name')),
            '{{slug}}' => sanitize_title((string) $post->post_name),
            '{{post_type}}' => sanitize_text_field((string) $post->post_type),
            '{{post_type_label}}' => $post_type_label
        ];

        foreach ($context as $key => $value) {
            $context[str_replace(['{{', '}}'], ['{', '}'], $key)] = $value;
        }

        return $context;
    }

    private function render_content_meta_template(string $template, WP_Post $post, string $excerpt = ''): string
    {
        $template = trim($template);
        if ($template === '') {
            return '';
        }

        $rendered = strtr($template, $this->build_content_meta_template_context($post, $excerpt));
        $rendered = preg_replace('/\s+/', ' ', $rendered) ?? $rendered;

        return trim($rendered);
    }

    private function render_checkbox(string $key, array $settings, string $label, string $symbol = ''): void
    {
        ?>
        <label style="display:block;margin:0 0 10px;">
            <input
                type="checkbox"
                name="rankwoven_image_attributes[<?php echo esc_attr($key); ?>]"
                value="1"
                <?php checked(!empty($settings[$key])); ?>
            />
            <?php echo esc_html($label); ?>
            <?php if ($symbol !== '') : ?>
                <code><?php echo esc_html($symbol); ?></code>
            <?php endif; ?>
        </label>
        <?php
    }

    private function render_diagnostic_row(string $label, string $value): void
    {
        ?>
        <tr>
            <th scope="row"><?php echo esc_html($label); ?></th>
            <td><?php echo esc_html($value); ?></td>
        </tr>
        <?php
    }

    private function get_api_connection_status_label(string $api_base_url): string
    {
        if ($api_base_url === '') {
            return __('Not configured', 'rankwoven-seo');
        }

        $response = wp_remote_get($this->build_api_url('/health'), [
            'timeout' => 8
        ]);

        if (is_wp_error($response)) {
            return sprintf(
                /* translators: %s: WordPress HTTP API error message */
                __('Unreachable: %s', 'rankwoven-seo'),
                $response->get_error_message()
            );
        }

        $status_code = wp_remote_retrieve_response_code($response);
        return $status_code === 200
            ? __('Reachable', 'rankwoven-seo')
            : sprintf(
                /* translators: %d: HTTP status code */
                __('Unexpected HTTP status: %d', 'rankwoven-seo'),
                (int) $status_code
            );
    }

    private function get_last_token_used_label(): string
    {
        $last_token_used_at = sanitize_text_field(get_option(self::OPTION_LAST_TOKEN_USED_AT, ''));
        if ($last_token_used_at !== '') {
            return $last_token_used_at;
        }

        $last_sync_result = get_option(self::OPTION_LAST_SYNC_RESULT, []);
        if (is_array($last_sync_result) && !empty($last_sync_result['syncedAt'])) {
            return sanitize_text_field((string) $last_sync_result['syncedAt']);
        }

        return __('No successful local token use recorded', 'rankwoven-seo');
    }

    private function get_last_sync_label(array $last_sync_result): string
    {
        if (empty($last_sync_result)) {
            return __('No sync has completed yet', 'rankwoven-seo');
        }

        return sprintf(
            /* translators: 1: sync time, 2: article count, 3: media count, 4: sync mode */
            __('%1$s, %2$d articles, %3$d media, %4$s sync', 'rankwoven-seo'),
            sanitize_text_field((string) ($last_sync_result['syncedAt'] ?? '')),
            (int) ($last_sync_result['articlesReceived'] ?? 0),
            (int) ($last_sync_result['mediaReceived'] ?? 0),
            sanitize_text_field((string) ($last_sync_result['syncMode'] ?? 'full'))
        );
    }

    private function get_image_attribute_settings_label(array $settings): string
    {
        $enabled_labels = [];
        $label_map = [
            'set_title' => __('Title', 'rankwoven-seo'),
            'set_alt_text' => __('Alt Text', 'rankwoven-seo'),
            'set_caption' => __('Caption', 'rankwoven-seo'),
            'set_description' => __('Description', 'rankwoven-seo'),
            'insert_title_attribute' => __('HTML title attribute', 'rankwoven-seo')
        ];

        foreach ($label_map as $key => $label) {
            if (!empty($settings[$key])) {
                $enabled_labels[] = $label;
            }
        }

        return empty($enabled_labels)
            ? __('All image attribute updates disabled', 'rankwoven-seo')
            : implode(', ', $enabled_labels);
    }

    private function get_application_password_status_label(array $wp_credentials): string
    {
        if ($wp_credentials['username'] === '' && $wp_credentials['applicationPassword'] === '') {
            return __('Not configured', 'rankwoven-seo');
        }

        if ($wp_credentials['username'] === '' || $wp_credentials['applicationPassword'] === '') {
            return __('Incomplete local configuration', 'rankwoven-seo');
        }

        return sprintf(
            /* translators: %s: WordPress administrator username */
            __('Configured for administrator "%s"', 'rankwoven-seo'),
            $wp_credentials['username']
        );
    }

    private function get_last_error_label(array $last_error): string
    {
        if (empty($last_error['message'])) {
            return __('No recent error recorded', 'rankwoven-seo');
        }

        return sprintf(
            /* translators: 1: error time, 2: error message */
            __('%1$s: %2$s', 'rankwoven-seo'),
            sanitize_text_field((string) ($last_error['occurredAt'] ?? '')),
            sanitize_text_field((string) $last_error['message'])
        );
    }

    private function render_admin_post_button(string $action, string $nonce_action, string $label, string $type): void
    {
        ?>
        <form class="rankwoven-inline-form" method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
            <?php wp_nonce_field($nonce_action); ?>
            <input type="hidden" name="action" value="<?php echo esc_attr($action); ?>" />
            <?php submit_button($label, $type, 'submit', false); ?>
        </form>
        <?php
    }

    private function render_admin_metric_card(string $label, string $value, string $tone = 'neutral'): void
    {
        ?>
        <article class="rankwoven-metric-card" data-tone="<?php echo esc_attr($tone); ?>">
            <span><?php echo esc_html($label); ?></span>
            <strong><?php echo esc_html($value); ?></strong>
        </article>
        <?php
    }

    private function get_sitemap_url(): string
    {
        return home_url('/sitemap.xml');
    }

    private function build_sitemap_generation_result(): array
    {
        $entries = $this->get_sitemap_entries();
        return [
            'generatedAt' => gmdate('c'),
            'entryCount' => count($entries),
            'postTypes' => $this->get_supported_editor_post_types(),
            'sitemapUrl' => $this->get_sitemap_url()
        ];
    }

    private function get_sitemap_entries(): array
    {
        $entries = [
            [
                'loc' => home_url('/')
            ]
        ];

        $posts = get_posts([
            'post_type' => $this->get_supported_editor_post_types(),
            'post_status' => 'publish',
            'posts_per_page' => -1,
            'orderby' => 'modified',
            'order' => 'DESC',
            'no_found_rows' => true,
            'fields' => 'all'
        ]);

        foreach ($posts as $post) {
            if (!($post instanceof WP_Post)) {
                continue;
            }

            $permalink = get_permalink($post);
            if (!is_string($permalink) || $permalink === '') {
                continue;
            }

            $entries[] = [
                'loc' => esc_url_raw($permalink),
                'lastmod' => $this->get_post_date_value($post, true)
            ];
        }

        $unique_entries = [];
        $seen_locations = [];
        foreach ($entries as $entry) {
            $loc = sanitize_text_field((string) ($entry['loc'] ?? ''));
            if ($loc === '' || isset($seen_locations[$loc])) {
                continue;
            }

            $seen_locations[$loc] = true;
            $unique_entries[] = $entry;
        }

        return $unique_entries;
    }

    private function build_sitemap_xml(array $entries): string
    {
        $lines = [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
        ];

        foreach ($entries as $entry) {
            $loc = sanitize_text_field((string) ($entry['loc'] ?? ''));
            if ($loc === '') {
                continue;
            }

            $lines[] = '  <url>';
            $lines[] = '    <loc>' . esc_html($loc) . '</loc>';

            $lastmod = sanitize_text_field((string) ($entry['lastmod'] ?? ''));
            if ($lastmod !== '') {
                $lines[] = '    <lastmod>' . esc_html($lastmod) . '</lastmod>';
            }

            $lines[] = '  </url>';
        }

        $lines[] = '</urlset>';

        return implode("\n", $lines) . "\n";
    }

    private function is_sitemap_request(): bool
    {
        $request_uri = sanitize_text_field((string) ($_SERVER['REQUEST_URI'] ?? ''));
        if ($request_uri === '') {
            return false;
        }

        $path = wp_parse_url($request_uri, PHP_URL_PATH);
        if (!is_string($path) || $path === '') {
            return false;
        }

        $normalized_path = rtrim($path, '/');
        return $normalized_path === 'sitemap.xml' || str_ends_with($normalized_path, '/sitemap.xml');
    }

    private function update_image_attachment_attributes(int $attachment_id): string
    {
        if (!$this->is_image_attachment($attachment_id)) {
            return '';
        }

        $settings = $this->get_image_attribute_settings();
        $generated_text = $this->generate_image_text_from_filename($attachment_id);
        if ($generated_text === '') {
            return '';
        }

        $post_update = ['ID' => $attachment_id];
        if ($settings['set_title']) {
            $post_update['post_title'] = $generated_text;
        }
        if ($settings['set_caption']) {
            $post_update['post_excerpt'] = $generated_text;
        }
        if ($settings['set_description']) {
            $post_update['post_content'] = $generated_text;
        }

        if (count($post_update) > 1) {
            wp_update_post(wp_slash($post_update));
        }

        if ($settings['set_alt_text']) {
            update_post_meta($attachment_id, '_wp_attachment_image_alt', $generated_text);
        }

        return $generated_text;
    }

    private function generate_image_text_from_filename(int $attachment_id): string
    {
        $attached_file = get_attached_file($attachment_id);
        if (!is_string($attached_file) || $attached_file === '') {
            return '';
        }

        $settings = $this->get_image_attribute_settings();
        $filename = pathinfo($attached_file, PATHINFO_FILENAME);
        $text = str_replace(['-', '_', '.', ','], [
            $settings['remove_hyphen'] ? ' ' : '-',
            $settings['remove_underscore'] ? ' ' : '_',
            $settings['remove_period'] ? ' ' : '.',
            $settings['remove_comma'] ? ' ' : ','
        ], $filename);

        if ($settings['remove_numbers']) {
            $text = preg_replace('/\d+/', '', $text) ?? $text;
        }

        $text = preg_replace('/\s+/', ' ', trim($text)) ?? trim($text);
        return ucwords($text);
    }

    private function is_image_attachment(int $attachment_id): bool
    {
        return wp_attachment_is_image($attachment_id);
    }

    private function get_next_image_attachment_ids(int $last_processed_id, int $limit): array
    {
        global $wpdb;

        $ids = $wpdb->get_col($wpdb->prepare(
            "SELECT ID FROM {$wpdb->posts}
             WHERE post_type = 'attachment'
               AND post_status = 'inherit'
               AND post_mime_type LIKE %s
               AND ID > %d
             ORDER BY ID ASC
             LIMIT %d",
            'image/%',
            $last_processed_id,
            max(1, $limit)
        ));

        return array_map('intval', $ids);
    }

    private function get_remaining_image_count(int $last_processed_id): int
    {
        global $wpdb;

        return (int) $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$wpdb->posts}
             WHERE post_type = 'attachment'
               AND post_status = 'inherit'
               AND post_mime_type LIKE %s
               AND ID > %d",
            'image/%',
            $last_processed_id
        ));
    }

    private function get_processed_image_count(int $last_processed_id): int
    {
        global $wpdb;

        return (int) $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$wpdb->posts}
             WHERE post_type = 'attachment'
               AND post_status = 'inherit'
               AND post_mime_type LIKE %s
               AND ID <= %d",
            'image/%',
            $last_processed_id
        ));
    }

    private function append_image_bulk_log(string $message): void
    {
        $log = get_option(self::OPTION_IMAGE_BULK_LOG, []);
        $log = is_array($log) ? array_map('sanitize_text_field', $log) : [];
        $log[] = '[' . current_time('mysql') . '] ' . $message;
        $log = array_slice($log, -30);

        update_option(self::OPTION_IMAGE_BULK_LOG, $log);
    }

    private function get_title_for_content_image(object $processor): string
    {
        $class = (string) $processor->get_attribute('class');
        if (preg_match('/wp-image-(\d+)/', $class, $matches)) {
            $title = get_the_title((int) $matches[1]);
            if (is_string($title) && $title !== '') {
                return $title;
            }
        }

        return sanitize_text_field((string) $processor->get_attribute('alt'));
    }

    private function get_api_base_url(): string
    {
        return untrailingslashit(esc_url_raw(get_option(self::OPTION_API_BASE_URL, '')));
    }

    private function get_wordpress_admin_credentials(): array
    {
        return [
            'username' => sanitize_text_field(get_option(self::OPTION_WP_ADMIN_USERNAME, '')),
            'applicationPassword' => sanitize_text_field(get_option(self::OPTION_WP_APPLICATION_PASSWORD, ''))
        ];
    }

    private function build_api_url(string $path): string
    {
        return $this->get_api_base_url() . '/' . ltrim($path, '/');
    }

    private function is_saas_site_ready(): bool
    {
        return $this->get_api_base_url() !== ''
            && sanitize_text_field(get_option(self::OPTION_SITE_ID, '')) !== ''
            && sanitize_text_field(get_option(self::OPTION_SITE_TOKEN, '')) !== '';
    }

    private function request_saas_site_api(string $method, string $path, ?array $payload = null)
    {
        $site_id = sanitize_text_field(get_option(self::OPTION_SITE_ID, ''));
        $site_token = sanitize_text_field(get_option(self::OPTION_SITE_TOKEN, ''));

        if (!$this->is_saas_site_ready()) {
            return new WP_Error('rankwoven_saas_not_ready', __('RankWoven site connection is not configured.', 'rankwoven-seo'));
        }

        $request_args = [
            'method' => $method,
            'timeout' => 45,
            'headers' => [
                'Authorization' => 'Bearer ' . $site_token,
                'Accept' => 'application/json'
            ]
        ];

        if ($payload !== null) {
            $request_args['headers']['Content-Type'] = 'application/json';
            $request_args['body'] = wp_json_encode($payload);
        }

        $response = wp_remote_request(
            $this->build_api_url('/api/v1/site-connections/' . rawurlencode($site_id) . '/' . ltrim($path, '/')),
            $request_args
        );

        if (is_wp_error($response)) {
            return $response;
        }

        $body = $this->decode_response_body($response);
        if (!($body['success'] ?? false)) {
            $message = is_string($body['message'] ?? null)
                ? sanitize_text_field((string) $body['message'])
                : __('RankWoven SaaS request failed.', 'rankwoven-seo');

            return new WP_Error('rankwoven_saas_request_failed', $message, $body);
        }

        update_option(self::OPTION_LAST_TOKEN_USED_AT, gmdate('c'));
        return is_array($body['data'] ?? null) ? $body['data'] : [];
    }

    private function get_latest_audit_from_data(array $audit_data): array
    {
        $audits = is_array($audit_data['audits'] ?? null) ? $audit_data['audits'] : [];
        $latest_audit = $audits[0] ?? [];

        return is_array($latest_audit) ? $latest_audit : [];
    }

    private function get_audit_issues_from_data(array $audit_data): array
    {
        $issues = is_array($audit_data['issues'] ?? null) ? $audit_data['issues'] : [];
        return array_values(array_filter($issues, 'is_array'));
    }

    private function get_internal_link_suggestions_from_data(array $suggestions_data): array
    {
        $suggestions = is_array($suggestions_data['suggestions'] ?? null) ? $suggestions_data['suggestions'] : [];
        return array_values(array_filter($suggestions, static function ($suggestion): bool {
            return is_array($suggestion) && (string) ($suggestion['suggestionType'] ?? '') === 'internal_link';
        }));
    }

    private function decode_internal_link_suggestion_value(string $value): array
    {
        $decoded = json_decode($value, true);
        if (!is_array($decoded) || !is_array($decoded['links'] ?? null)) {
            return [
                'intro' => $value,
                'links' => []
            ];
        }

        $links = [];
        foreach ($decoded['links'] as $link) {
            if (!is_array($link)) {
                continue;
            }

            $target_url = esc_url_raw((string) ($link['targetUrl'] ?? ''));
            $anchor_text = sanitize_text_field((string) ($link['anchorText'] ?? $link['targetTitle'] ?? ''));
            if ($target_url === '' || $anchor_text === '') {
                continue;
            }

            $links[] = [
                'targetCmsId' => sanitize_text_field((string) ($link['targetCmsId'] ?? '')),
                'targetTitle' => sanitize_text_field((string) ($link['targetTitle'] ?? '')),
                'targetUrl' => $target_url,
                'anchorText' => $anchor_text,
                'relevance' => sanitize_text_field((string) ($link['relevance'] ?? '')),
                'reason' => sanitize_text_field((string) ($link['reason'] ?? ''))
            ];
        }

        return [
            'intro' => sanitize_text_field((string) ($decoded['intro'] ?? '')),
            'links' => $links
        ];
    }

    private function get_suggestion_target_label(array $suggestion): string
    {
        $target_cms_id = (int) ($suggestion['targetCmsId'] ?? 0);
        if ($target_cms_id <= 0) {
            return __('Unknown target', 'rankwoven-seo');
        }

        $post = get_post($target_cms_id);
        if ($post instanceof WP_Post) {
            return sprintf(
                /* translators: 1: post title, 2: post ID */
                __('%1$s (#%2$d)', 'rankwoven-seo'),
                sanitize_text_field((string) get_the_title($post)),
                $target_cms_id
            );
        }

        return sprintf(
            /* translators: %d: target CMS ID */
            __('Content #%d', 'rankwoven-seo'),
            $target_cms_id
        );
    }

    private function get_suggestion_summary_text(string $suggested_value): string
    {
        $internal_link_data = $this->decode_internal_link_suggestion_value($suggested_value);
        if (!empty($internal_link_data['links'])) {
            return sprintf(
                /* translators: %d: internal link count */
                __('Add %d related internal links at the end of the content.', 'rankwoven-seo'),
                count($internal_link_data['links'])
            );
        }

        return sanitize_text_field($suggested_value);
    }

    private function render_internal_link_candidate_list(array $suggestion): void
    {
        $suggested_value = (string) ($suggestion['suggestedValue'] ?? '');
        $internal_link_data = $this->decode_internal_link_suggestion_value($suggested_value);

        if (empty($internal_link_data['links'])) {
            echo esc_html($this->get_suggestion_summary_text($suggested_value));
            return;
        }

        echo '<ul style="margin:0;">';
        foreach ($internal_link_data['links'] as $link) {
            $meta = array_filter([
                $link['relevance'] !== '' ? sprintf(__('Relevance: %s', 'rankwoven-seo'), $link['relevance']) : '',
                $link['reason']
            ]);
            echo '<li>';
            echo '<a href="' . esc_url($link['targetUrl']) . '" target="_blank" rel="noopener noreferrer">' . esc_html($link['anchorText']) . '</a>';
            if (!empty($meta)) {
                echo '<br><span class="description">' . esc_html(implode(' | ', $meta)) . '</span>';
            }
            echo '</li>';
        }
        echo '</ul>';
    }

    private function sync_wordpress_credentials_to_saas(
        string $site_id,
        string $wp_admin_username,
        string $wp_application_password
    ): bool {
        if ($this->get_api_base_url() === '') {
            return false;
        }

        $site_token = sanitize_text_field(get_option(self::OPTION_SITE_TOKEN, ''));
        if ($site_token === '') {
            return false;
        }

        $response = wp_remote_request(
            $this->build_api_url('/api/v1/site-connections/' . rawurlencode($site_id) . '/wordpress-credentials'),
            [
                'method' => 'PUT',
                'timeout' => 30,
                'headers' => [
                    'Authorization' => 'Bearer ' . $site_token,
                    'Content-Type' => 'application/json'
                ],
                'body' => wp_json_encode([
                    'wordpressAdminUsername' => $wp_admin_username,
                    'wordpressApplicationPassword' => $wp_application_password
                ])
            ]
        );

        if (is_wp_error($response)) {
            return false;
        }

        $body = $this->decode_response_body($response);
        return (bool) ($body['success'] ?? false);
    }

    private function sync_analytics_settings_to_saas(string $site_id, string $ga4_property_id): bool
    {
        if ($this->get_api_base_url() === '') {
            return false;
        }

        $site_token = sanitize_text_field(get_option(self::OPTION_SITE_TOKEN, ''));
        if ($site_token === '') {
            return false;
        }

        $response = wp_remote_request(
            $this->build_api_url('/api/v1/site-connections/' . rawurlencode($site_id) . '/analytics-settings'),
            [
                'method' => 'PUT',
                'timeout' => 30,
                'headers' => [
                    'Authorization' => 'Bearer ' . $site_token,
                    'Content-Type' => 'application/json'
                ],
                'body' => wp_json_encode([
                    'googleAnalyticsPropertyId' => $ga4_property_id
                ])
            ]
        );

        if (is_wp_error($response)) {
            return false;
        }

        $body = $this->decode_response_body($response);
        return (bool) ($body['success'] ?? false);
    }

    private function decode_response_body(array $response): array
    {
        $body = json_decode((string) wp_remote_retrieve_body($response), true);
        return is_array($body) ? $body : [];
    }

    private function assert_admin_action(string $nonce_action): void
    {
        if (!current_user_can('manage_options')) {
            wp_die(esc_html__('You do not have permission to manage RankWoven SEO.', 'rankwoven-seo'));
        }

        check_admin_referer($nonce_action);
    }

    private function redirect_with_status(string $status, string $tab = 'connection'): void
    {
        $this->record_last_error_for_status($status);

        wp_safe_redirect(add_query_arg([
            'rankwoven_status' => $status
        ], $this->get_admin_tab_url($tab)));
        exit;
    }

    private function record_last_error_for_status(string $status): void
    {
        $messages = [
            'missing_api_base_url' => __('Please set the API Base URL first.', 'rankwoven-seo'),
            'missing_site_credentials' => __('Please connect this site before syncing content.', 'rankwoven-seo'),
            'missing_wordpress_application_password' => __('Please save a WordPress administrator username and application password before connecting this site.', 'rankwoven-seo'),
            'analytics_settings_update_failed' => __('GA4 Property ID was saved locally, but RankWoven could not update the SaaS analytics setting. Please check the Site Token and API service.', 'rankwoven-seo'),
            'wordpress_credentials_update_failed' => __('WordPress application password was saved locally, but RankWoven could not update the SaaS credential record. Please check the API service.', 'rankwoven-seo'),
            'site_token_invalid' => __('The Site Token is invalid or has been revoked. Regenerate the token in RankWoven, paste the new token here, then sync again.', 'rankwoven-seo'),
            'connection_failed' => __('Site connection failed. Please check the API service.', 'rankwoven-seo'),
            'sync_failed' => __('Content sync failed. Please check the Site Token and API service.', 'rankwoven-seo'),
            'google_credentials_not_configured' => __('Google credentials are not configured on the SaaS service.', 'rankwoven-seo'),
            'sitemap_submit_failed' => __('Sitemap submission failed. Please check the SaaS API and Google credentials.', 'rankwoven-seo'),
            'seo_audit_failed' => __('SEO Analysis failed. Please sync content, then check the SaaS API service.', 'rankwoven-seo'),
            'suggestions_missing_selection' => __('Please select at least one suggestion first.', 'rankwoven-seo'),
            'suggestions_action_failed' => __('Suggestion action failed. Please check the SaaS API service and Site Token.', 'rankwoven-seo')
        ];

        if (!isset($messages[$status])) {
            return;
        }

        update_option(self::OPTION_LAST_ERROR, [
            'occurredAt' => gmdate('c'),
            'status' => $status,
            'message' => $messages[$status]
        ]);
    }

    private function render_admin_notice(): void
    {
        $status = sanitize_key(wp_unslash($_GET['rankwoven_status'] ?? ''));
        if ($status === '') {
            return;
        }

        $messages = [
            'settings_saved' => ['updated', __('Settings saved.', 'rankwoven-seo')],
            'wordpress_credentials_updated' => ['updated', __('WordPress application password saved locally and updated in RankWoven.', 'rankwoven-seo')],
            'site_connected' => ['updated', __('Site connected successfully.', 'rankwoven-seo')],
            'sync_completed' => ['updated', __('Content sync completed.', 'rankwoven-seo')],
            'sitemap_generated' => ['updated', __('Sitemap.xml generated successfully.', 'rankwoven-seo')],
            'sitemap_submitted' => ['updated', __('Sitemap.xml submitted to Google Search Console.', 'rankwoven-seo')],
            'seo_audit_completed' => ['updated', __('SEO Analysis completed.', 'rankwoven-seo')],
            'suggestions_approved' => ['updated', __('Selected suggestions approved.', 'rankwoven-seo')],
            'suggestions_applied' => ['updated', __('Selected suggestions approved and queued for WordPress writeback.', 'rankwoven-seo')],
            'image_attribute_settings_saved' => ['updated', __('Image attribute settings saved.', 'rankwoven-seo')],
            'image_bulk_test_completed' => ['updated', __('Test bulk update completed for one image.', 'rankwoven-seo')],
            'image_bulk_completed' => ['updated', __('Bulk image attribute update completed for the next batch.', 'rankwoven-seo')],
            'image_bulk_counter_reset' => ['updated', __('Bulk updater counter reset.', 'rankwoven-seo')],
            'image_bulk_no_images' => ['updated', __('No remaining image attachments were found.', 'rankwoven-seo')],
            'missing_api_base_url' => ['error', __('Please set the API Base URL first.', 'rankwoven-seo')],
            'missing_site_credentials' => ['error', __('Please connect this site before syncing content.', 'rankwoven-seo')],
            'missing_wordpress_application_password' => ['error', __('Please save a WordPress administrator username and application password before connecting this site.', 'rankwoven-seo')],
            'analytics_settings_update_failed' => ['error', __('GA4 Property ID was saved locally, but RankWoven could not update the SaaS analytics setting. Please check the Site Token and API service.', 'rankwoven-seo')],
            'wordpress_credentials_update_failed' => ['error', __('WordPress application password was saved locally, but RankWoven could not update the SaaS credential record. Please check the API service.', 'rankwoven-seo')],
            'site_token_invalid' => ['error', __('The Site Token is invalid or has been revoked. Regenerate the token in RankWoven, paste the new token here, then sync again.', 'rankwoven-seo')],
            'connection_failed' => ['error', __('Site connection failed. Please check the API service.', 'rankwoven-seo')],
            'sync_failed' => ['error', __('Content sync failed. Please check the Site Token and API service.', 'rankwoven-seo')],
            'google_credentials_not_configured' => ['error', __('Google credentials are not configured on the SaaS service.', 'rankwoven-seo')],
            'sitemap_submit_failed' => ['error', __('Sitemap submission failed. Please check the SaaS API and Google credentials.', 'rankwoven-seo')],
            'seo_audit_failed' => ['error', __('SEO Analysis failed. Please sync content, then check the SaaS API service.', 'rankwoven-seo')],
            'suggestions_missing_selection' => ['error', __('Please select at least one suggestion first.', 'rankwoven-seo')],
            'suggestions_action_failed' => ['error', __('Suggestion action failed. Please check the SaaS API service and Site Token.', 'rankwoven-seo')]
        ];

        if (!isset($messages[$status])) {
            return;
        }

        [$class, $message] = $messages[$status];
        printf(
            '<div class="notice notice-%1$s"><p>%2$s</p></div>',
            esc_attr($class),
            esc_html($message)
        );
    }
}

new RankWoven_SEO_Plugin();
