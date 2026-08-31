<?php
/**
 * Plugin Name: RankWoven SEO
 * Description: Connects a WordPress site to RankWoven and syncs posts, pages, portfolio items, products, and image media for SEO optimization. Includes GEO controls, LLMs.txt, RSS Sitemap output, and WebP/AVIF image optimization.
 * Version: 0.8.0
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
    private const VERSION = '0.8.0';
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
    private const OPTION_ROBOTS_TXT_CONTENT = 'rankwoven_robots_txt_content';
    private const OPTION_LLMS_SETTINGS = 'rankwoven_llms_settings';
    private const OPTION_RSS_SETTINGS = 'rankwoven_rss_settings';
    private const OPTION_GEO_SETTINGS = 'rankwoven_geo_settings';
    private const OPTION_INDEXNOW_SETTINGS = 'rankwoven_indexnow_settings';
    private const OPTION_INDEXNOW_LAST_RESULT = 'rankwoven_indexnow_last_result';
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

    /**
     * @var RankWoven_Image_Optimizer|null
     */
    private $image_optimizer = null;

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
        add_action('admin_post_rankwoven_rescan_internal_links', [$this, 'handle_rescan_internal_links']);
        add_action('admin_post_rankwoven_generate_sitemap', [$this, 'handle_generate_sitemap']);
        add_action('admin_post_rankwoven_submit_sitemap_google', [$this, 'handle_submit_sitemap_google']);
        add_action('admin_post_rankwoven_submit_indexnow', [$this, 'handle_submit_indexnow']);
        add_action('admin_post_rankwoven_run_seo_audit', [$this, 'handle_run_seo_audit']);
        add_action('admin_post_rankwoven_apply_audit_issue', [$this, 'handle_apply_audit_issue']);
        add_action('admin_post_rankwoven_manage_suggestions', [$this, 'handle_manage_suggestions']);
        add_action('admin_post_rankwoven_save_image_attributes', [$this, 'handle_save_image_attributes']);
        add_action('admin_post_rankwoven_test_image_attributes', [$this, 'handle_test_image_attributes']);
        add_action('admin_post_rankwoven_bulk_update_image_attributes', [$this, 'handle_bulk_update_image_attributes']);
        add_action('admin_post_rankwoven_reset_image_bulk_counter', [$this, 'handle_reset_image_bulk_counter']);
        add_action('wp_ajax_rankwoven_editor_seo', [$this, 'handle_editor_seo_ajax']);
        add_action('add_attachment', [$this, 'handle_new_attachment']);
        add_action('save_post', [$this, 'handle_indexnow_post_save'], 20, 3);
        add_action('trashed_post', [$this, 'handle_indexnow_trashed_post']);
        add_action('before_delete_post', [$this, 'handle_indexnow_deleted_post']);
        add_action('wp_head', [$this, 'render_frontend_seo_meta_tags'], 1);
        add_action('wp_head', [$this, 'render_geo_meta_tags'], 2);
        add_action('wp_head', [$this, 'render_geo_structured_data'], 3);
        add_action('parse_request', [$this, 'maybe_render_custom_sitemap_request'], -100, 1);
        add_action('template_redirect', [$this, 'maybe_render_sitemap_xml'], 0);
        add_action('template_redirect', [$this, 'maybe_render_rss_sitemap_xml'], 0);
        add_action('template_redirect', [$this, 'maybe_render_llms_content'], 0);
        add_filter('the_content', [$this, 'add_image_title_attributes_to_content']);
        // Hostinger 的 llms.txt 產生器透過 wp_trim_excerpt() 套用 the_content；只在該堆疊中移除 TOC，避免影響前台文章顯示。
        add_filter('the_content', [$this, 'filter_llms_excerpt_content'], 9999);
        add_filter('sanitize_file_name', [$this, 'filter_uploaded_image_filename'], 20);
        add_filter('redirect_canonical', [$this, 'disable_core_sitemap_redirect'], 10, 2);
        add_filter('robots_txt', [$this, 'append_sitemap_to_robots_txt'], 20000, 2);
        add_action('rest_api_init', [$this, 'register_rest_routes']);
        $this->boot_image_optimizer();
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

        // 保留舊的 LLMs.txt 設定 URL，讓既有書籤回到整合後的網站地圖頁。
        add_submenu_page(
            null,
            __('LLMs.txt', 'rankwoven-seo'),
            __('LLMs.txt', 'rankwoven-seo'),
            'manage_options',
            'rankwoven-seo-llms-txt',
            [$this, 'render_admin_page']
        );

        add_options_page(
            __('RankWoven SEO', 'rankwoven-seo'),
            __('RankWoven SEO', 'rankwoven-seo'),
            'manage_options',
            'rankwoven-seo-settings',
            [$this, 'render_admin_page']
        );
    }

    private function boot_image_optimizer(): void
    {
        if (class_exists('WebPImageOptimizer', false)) {
            return;
        }

        $optimizer_file = plugin_dir_path(__FILE__) . 'includes/class-image-optimizer.php';
        if (!is_readable($optimizer_file)) {
            return;
        }

        require_once $optimizer_file;

        if (class_exists('RankWoven_Image_Optimizer')) {
            $this->image_optimizer = new RankWoven_Image_Optimizer();
        }
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
            'geo' => [
                'label' => __('GEO 優化', 'rankwoven-seo'),
                'slug' => 'rankwoven-seo-geo'
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
            'image_optimizer' => [
                'label' => __('圖片優化', 'rankwoven-seo'),
                'slug' => 'rankwoven-seo-image-optimizer'
            ],
            'image_convert' => [
                'label' => __('批量轉圖', 'rankwoven-seo'),
                'slug' => 'rankwoven-seo-image-convert'
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

        $admin_css_path = plugin_dir_path(__FILE__) . 'assets/admin.css';
        $admin_css_version = self::VERSION;
        if (file_exists($admin_css_path)) {
            $admin_css_version .= '.' . (string) filemtime($admin_css_path);
        }

        wp_enqueue_style(
            'rankwoven-admin',
            plugin_dir_url(__FILE__) . 'assets/admin.css',
            [],
            $admin_css_version
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

        $editor_seo_script_path = plugin_dir_path(__FILE__) . 'assets/editor-seo.js';
        $editor_seo_script_version = self::VERSION;
        if (file_exists($editor_seo_script_path)) {
            $editor_seo_script_version .= '.' . (string) filemtime($editor_seo_script_path);
        }

        wp_enqueue_script(
            'rankwoven-editor-seo',
            plugin_dir_url(__FILE__) . 'assets/editor-seo.js',
            ['wp-data'],
            $editor_seo_script_version,
            true
        );

        $editor_seo_style_path = plugin_dir_path(__FILE__) . 'assets/editor-seo.css';
        $editor_seo_style_version = self::VERSION;
        if (file_exists($editor_seo_style_path)) {
            $editor_seo_style_version .= '.' . (string) filemtime($editor_seo_style_path);
        }
        wp_enqueue_style(
            'rankwoven-editor-seo',
            plugin_dir_url(__FILE__) . 'assets/editor-seo.css',
            [],
            $editor_seo_style_version
        );

        wp_localize_script('rankwoven-editor-seo', 'rankwovenEditorSeoConfig', [
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('rankwoven_editor_seo'),
            'postType' => (string) ($screen->post_type ?? ''),
            'supportedPostTypes' => $this->get_supported_editor_post_types(),
            'scoreGroupLabels' => [
                'fail' => __('Problems', 'rankwoven-seo'),
                'warning' => __('Warnings', 'rankwoven-seo'),
                'pass' => __('Success', 'rankwoven-seo')
            ]
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
        $slug = $this->normalize_editor_seo_slug((string) $post->post_name, (string) $post->post_title);
        $score_data = $this->calculate_local_editor_seo_score(
            $focus_keyphrase,
            $seo_title,
            $slug,
            $meta_description,
            (string) $post->post_content,
            $post->ID,
            (string) $post->post_excerpt
        );
        $seo_score = max(0, min(100, (int) ($score_data['seoScore'] ?? 0)));
        $analysis = sanitize_textarea_field((string) ($score_data['analysis'] ?? get_post_meta($post->ID, self::META_EDITOR_ANALYSIS, true)));
        $score_checks = is_array($score_data['scoreChecks'] ?? null) ? $score_data['scoreChecks'] : [];
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
            <div class="rankwoven-editor-seo-checks" data-rankwoven-seo-checks>
                <?php foreach ([
                    'fail' => __('Problems', 'rankwoven-seo'),
                    'warning' => __('Warnings', 'rankwoven-seo'),
                    'pass' => __('Success', 'rankwoven-seo')
                ] as $status => $heading) : ?>
                    <section class="rankwoven-editor-seo-check-group" data-rankwoven-score-group="<?php echo esc_attr($status); ?>">
                        <h3><?php echo esc_html($heading); ?></h3>
                        <ul>
                            <?php foreach ($score_checks as $check) : ?>
                                <?php if (($check['status'] ?? '') !== $status) : continue; endif; ?>
                                <li>
                                    <span class="rankwoven-editor-seo-check-dot" aria-hidden="true"></span>
                                    <div>
                                        <strong><?php echo esc_html((string) ($check['label'] ?? '')); ?></strong>
                                        <span><?php echo esc_html((string) ($check['message'] ?? '')); ?></span>
                                    </div>
                                </li>
                            <?php endforeach; ?>
                        </ul>
                    </section>
                <?php endforeach; ?>
            </div>
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

    public function render_geo_meta_tags(): void
    {
        if (is_admin()) {
            return;
        }

        $settings = $this->get_geo_settings();
        $robots_directives = [];

        if (empty($settings['indexable'])) {
            $robots_directives[] = 'noindex';
            $robots_directives[] = 'nofollow';
        }

        if (empty($settings['allow_snippets'])) {
            $robots_directives[] = 'nosnippet';
            $robots_directives[] = 'max-snippet:0';
            $robots_directives[] = 'max-image-preview:none';
        }

        if ($robots_directives !== []) {
            $this->render_head_meta_tag([
                'name' => 'robots',
                'content' => implode(', ', $robots_directives)
            ]);
        }

        if (empty($settings['language_declaration'])) {
            return;
        }

        $current_url = home_url('/');
        if (is_singular()) {
            $permalink = get_permalink();
            if (is_string($permalink) && $permalink !== '') {
                $current_url = $permalink;
            }
        }

        $links = [];
        $language_code = (string) $settings['language_code'];
        if ($language_code !== '') {
            $links[$language_code . '|' . $current_url] = [
                'code' => $language_code,
                'url' => $current_url
            ];
        }

        foreach ($settings['alternate_languages'] as $alternate) {
            $code = (string) ($alternate['code'] ?? '');
            $url = (string) ($alternate['url'] ?? '');
            if ($code === '' || $url === '') {
                continue;
            }

            $links[$code . '|' . $url] = [
                'code' => $code,
                'url' => $url
            ];
        }

        foreach ($links as $link) {
            $this->render_geo_hreflang_link((string) $link['code'], (string) $link['url']);
        }

        $x_default_url = (string) $settings['x_default_url'];
        $this->render_geo_hreflang_link('x-default', $x_default_url !== '' ? $x_default_url : home_url('/'));
    }

    /**
     * Output a small JSON-LD graph that gives search and AI crawlers stable
     * entity, content, author, and breadcrumb references.
     */
    public function render_geo_structured_data(): void
    {
        if (is_admin()) {
            return;
        }

        $settings = $this->get_geo_settings();
        if (empty($settings['structured_data'])) {
            return;
        }

        $site_url = esc_url_raw(home_url('/'));
        $site_name = sanitize_text_field((string) ($settings['organization_name'] ?: get_bloginfo('name')));
        $site_description = sanitize_textarea_field((string) ($settings['organization_description'] ?: get_bloginfo('description')));
        $logo_url = esc_url_raw((string) $settings['organization_logo']);
        $organization_id = $site_url . '#rankwoven-organization';
        $website_id = $site_url . '#rankwoven-website';
        $graph = [];

        if (!empty($settings['entity_schema'])) {
            $organization = [
                '@type' => 'Organization',
                '@id' => $organization_id,
                'name' => $site_name,
                'url' => $site_url
            ];
            if ($site_description !== '') {
                $organization['description'] = $site_description;
            }
            if ($logo_url !== '') {
                $organization['logo'] = [
                    '@type' => 'ImageObject',
                    'url' => $logo_url
                ];
            }
            if (!empty($settings['organization_same_as'])) {
                $organization['sameAs'] = array_values(array_filter(array_map('esc_url_raw', $settings['organization_same_as'])));
            }
            $graph[] = $organization;
            $graph[] = [
                '@type' => 'WebSite',
                '@id' => $website_id,
                'url' => $site_url,
                'name' => $site_name,
                'publisher' => ['@id' => $organization_id],
                'inLanguage' => $this->get_default_geo_language()
            ];
        }

        $post = get_queried_object();
        $current_url = $site_url;
        $title = $site_name;
        $description = $site_description;
        $image = '';
        $content_entity_id = '';
        $author_id = '';
        $post_type = '';
        if ($post instanceof WP_Post && is_singular()) {
            $permalink = get_permalink($post);
            $current_url = is_string($permalink) && $permalink !== '' ? esc_url_raw($permalink) : $site_url;
            $title = sanitize_text_field((string) ($this->get_post_seo_title($post) ?: get_the_title($post)));
            if (preg_match('/#(?:post|separator|site)_[a-z_]+/i', $title) === 1) {
                $title = sanitize_text_field((string) get_the_title($post));
            }
            $description = $this->get_post_meta_description($post, wp_strip_all_tags((string) $post->post_excerpt));
            $preview_image = $this->get_post_preview_image($post);
            $image = (string) ($preview_image['url'] ?? '');
            $post_type = (string) $post->post_type;

            if (!empty($settings['author_date_schema'])) {
                $author_name = sanitize_text_field((string) get_the_author_meta('display_name', (int) $post->post_author));
                if ($author_name !== '') {
                    $author_id = $site_url . '#rankwoven-author-' . (int) $post->post_author;
                    $graph[] = [
                        '@type' => 'Person',
                        '@id' => $author_id,
                        'name' => $author_name,
                        'url' => esc_url_raw((string) get_author_posts_url((int) $post->post_author))
                    ];
                }
            }
        }

        if (!empty($settings['content_schema']) && $post instanceof WP_Post && is_singular()) {
            $entity_type = $post_type === 'product' ? 'Product' : ($post_type === 'page' ? 'WebPage' : 'Article');
            $content_entity_id = $current_url . ($entity_type === 'Product' ? '#rankwoven-product' : ($entity_type === 'WebPage' ? '#rankwoven-webpage' : '#rankwoven-article'));
            $entity = [
                '@type' => $entity_type,
                '@id' => $content_entity_id,
                'url' => $current_url,
                'name' => $title,
                'description' => $description,
                'isPartOf' => ['@id' => $website_id]
            ];
            if ($image !== '') {
                $entity['image'] = [$image];
            }
            if ($author_id !== '' && $entity_type === 'Article') {
                $entity['author'] = ['@id' => $author_id];
            }
            if ($entity_type === 'Article') {
                $published_at = $this->get_post_date_value($post, false);
                $modified_at = $this->get_post_date_value($post, true);
                if ($published_at !== '') {
                    $entity['datePublished'] = $published_at;
                }
                if ($modified_at !== '') {
                    $entity['dateModified'] = $modified_at;
                }
                $entity['mainEntityOfPage'] = ['@type' => 'WebPage', '@id' => $current_url];
            }
            if ($entity_type === 'Product') {
                $sku = sanitize_text_field((string) get_post_meta($post->ID, '_sku', true));
                $price = sanitize_text_field((string) get_post_meta($post->ID, '_price', true));
                if ($sku !== '') {
                    $entity['sku'] = $sku;
                }
                if ($price !== '' && is_numeric($price)) {
                    $offer = [
                        '@type' => 'Offer',
                        'url' => $current_url,
                        'price' => (float) $price,
                        'availability' => 'https://schema.org/' . (get_post_meta($post->ID, '_stock_status', true) === 'outofstock' ? 'OutOfStock' : 'InStock')
                    ];
                    $currency = sanitize_text_field((string) get_option('woocommerce_currency', ''));
                    if ($currency !== '') {
                        $offer['priceCurrency'] = $currency;
                    }
                    $entity['offers'] = $offer;
                }
            }
            $graph[] = $entity;
        }

        if (!empty($settings['content_schema'])) {
            $breadcrumb_items = [
                ['@type' => 'ListItem', 'position' => 1, 'name' => $site_name, 'item' => $site_url]
            ];
            if ($current_url !== $site_url) {
                $breadcrumb_items[] = ['@type' => 'ListItem', 'position' => 2, 'name' => $title, 'item' => $current_url];
            }
            $graph[] = [
                '@type' => 'BreadcrumbList',
                '@id' => $current_url . '#rankwoven-breadcrumb',
                'itemListElement' => $breadcrumb_items
            ];
        }

        if ($graph === []) {
            return;
        }

        echo '<script type="application/ld+json">' . wp_json_encode([
            '@context' => 'https://schema.org',
            '@graph' => $graph
        ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . '</script>' . "\n";
    }

    private function render_geo_hreflang_link(string $language_code, string $url): void
    {
        $language_code = $language_code === 'x-default'
            ? 'x-default'
            : $this->sanitize_geo_language_code($language_code);
        $url = esc_url_raw($url);
        if ($language_code === '' || $url === '') {
            return;
        }

        printf(
            '<link rel="alternate" hreflang="%1$s" href="%2$s" />%3$s',
            esc_attr($language_code),
            esc_url($url),
            "\n"
        );
    }

    public function maybe_render_custom_sitemap_request($wp): void
    {
        if ($this->maybe_render_indexnow_key()) {
            return;
        }

        if ($this->is_sitemap_request()) {
            $this->maybe_render_sitemap_xml();
        }

        if ($this->is_rss_sitemap_request()) {
            $this->maybe_render_rss_sitemap_xml();
        }

        if ($this->get_llms_request_kind() !== '') {
            $this->maybe_render_llms_content();
        }
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

    public function maybe_render_rss_sitemap_xml(): void
    {
        if (!$this->is_rss_sitemap_request()) {
            return;
        }

        $settings = $this->get_rss_settings();
        if (empty($settings['enabled'])) {
            return;
        }

        nocache_headers();
        status_header(200);
        header('Content-Type: application/rss+xml; charset=UTF-8');
        echo $this->build_rss_sitemap_xml($settings);
        exit;
    }

    public function maybe_render_llms_content(): void
    {
        $request_kind = $this->get_llms_request_kind();
        if ($request_kind === '') {
            return;
        }

        $settings = $this->get_llms_settings();
        if ($request_kind === 'llms' && empty($settings['enabled'])) {
            return;
        }

        if ($request_kind === 'llms-full' && (empty($settings['enabled']) || empty($settings['full_enabled']))) {
            return;
        }

        if ($request_kind === 'markdown') {
            if (empty($settings['enabled']) || empty($settings['convert_posts_to_markdown'])) {
                return;
            }

            $this->maybe_render_markdown_post($settings);
            return;
        }

        $content = $request_kind === 'llms-full'
            ? $this->build_llms_full_txt($settings)
            : $this->build_llms_txt($settings);

        nocache_headers();
        status_header(200);
        header('Content-Type: text/plain; charset=UTF-8');
        echo $content;
        exit;
    }

    public function append_sitemap_to_robots_txt(string $output, bool $public): string
    {
        if (!$public) {
            return $output;
        }

        $custom_output = $this->get_custom_robots_txt_content();
        $robots_output = $custom_output !== '' ? $custom_output : $output;

        return $this->append_sitemap_to_robots_content($robots_output);
    }

    private function append_sitemap_to_robots_content(string $output): string
    {
        $sitemap_url = $this->get_sitemap_url();
        $trimmed_output = rtrim($output);
        $lines = $trimmed_output === '' ? [] : [$trimmed_output];

        if (!str_contains($output, $sitemap_url)) {
            $lines[] = 'Sitemap: ' . $sitemap_url;
        }

        $rss_settings = $this->get_rss_settings();
        $rss_sitemap_url = $this->get_rss_sitemap_url();
        if (!empty($rss_settings['enabled']) && !str_contains($output, $rss_sitemap_url)) {
            $lines[] = 'Sitemap: ' . $rss_sitemap_url;
        }

        return $this->append_geo_robots_rules(implode("\n", $lines) . "\n");
    }

    private function append_geo_robots_rules(string $output): string
    {
        $settings = $this->get_geo_settings();
        $lines = [rtrim($output), '', '# RankWoven GEO AI crawler rules'];

        foreach ($this->get_geo_crawler_groups() as $key => $group) {
            foreach ($group['user_agents'] as $user_agent) {
                $lines[] = 'User-agent: ' . $user_agent;
                $lines[] = !empty($settings[$key]) ? 'Allow: /' : 'Disallow: /';
            }
            $lines[] = '';
        }

        return rtrim(implode("\n", $lines)) . "\n";
    }

    public function disable_core_sitemap_redirect($redirect_url, $requested_url)
    {
        if ($this->is_sitemap_request() || $this->is_rss_sitemap_request() || $this->get_llms_request_kind() !== '' || $this->is_indexnow_key_request()) {
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
        $slug = $this->normalize_editor_seo_slug_candidate($value);
        if ($slug === '' && $fallback !== '') {
            $slug = $this->normalize_editor_seo_slug_candidate($fallback);
        }

        return $slug !== '' ? $slug : 'rankwoven_seo';
    }

    private function normalize_editor_seo_slug_candidate(string $value): string
    {
        $decoded = trim(wp_strip_all_tags($value));
        for ($index = 0; $index < 2; $index++) {
            $next_decoded = rawurldecode($decoded);
            if ($next_decoded === $decoded) {
                break;
            }
            $decoded = $next_decoded;
        }

        if (function_exists('remove_accents')) {
            $decoded = remove_accents($decoded);
        }

        $slug = strtolower($decoded);
        $slug = (string) preg_replace('/[^a-z]+/', '_', $slug);
        $slug = (string) preg_replace('/_+/', '_', $slug);
        $slug = trim($slug, '_');

        return substr($slug, 0, 240);
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
            $content_html,
            0,
            $normalized_excerpt
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
            'scoreChecks' => is_array($score_data['scoreChecks'] ?? null) ? $score_data['scoreChecks'] : [],
            'metaDescription' => $meta_description,
            'analysis' => trim($analysis)
        ];
    }

    private function normalize_editor_seo_comparable_text(string $value): string
    {
        $plain_text = html_entity_decode(wp_strip_all_tags(strip_shortcodes($value)), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $normalized = (string) preg_replace('/\s+/u', ' ', trim($plain_text));

        return function_exists('mb_strtolower') ? mb_strtolower($normalized) : strtolower($normalized);
    }

    private function get_editor_seo_text_units(string $value): int
    {
        $plain_text = $this->normalize_editor_seo_comparable_text($value);
        if ($plain_text === '') {
            return 0;
        }

        $match_count = preg_match_all('/\p{Han}|[\p{L}\p{N}]+/u', $plain_text, $matches);

        return $match_count === false ? 0 : $match_count;
    }

    private function count_editor_seo_keyphrase_occurrences(string $text, string $keyphrase): int
    {
        if ($text === '' || $keyphrase === '') {
            return 0;
        }

        if (preg_match('/^[\p{L}\p{N}]+$/u', $keyphrase) && !preg_match('/\p{Han}/u', $keyphrase)) {
            preg_match_all('/\p{Han}|[\p{L}\p{N}]+/u', $text, $matches);

            return count(array_filter($matches[0] ?? [], static fn ($token): bool => $token === $keyphrase));
        }

        return substr_count($text, $keyphrase);
    }

    private function editor_seo_text_contains_keyphrase(string $text, string $keyphrase): bool
    {
        if ($text === '' || $keyphrase === '') {
            return false;
        }

        if (preg_match('/^[\p{L}\p{N}]+$/u', $keyphrase) && !preg_match('/\p{Han}/u', $keyphrase)) {
            preg_match_all('/\p{Han}|[\p{L}\p{N}]+/u', $text, $matches);

            return in_array($keyphrase, $matches[0] ?? [], true);
        }

        if (str_contains($text, $keyphrase)) {
            return true;
        }

        $keyphrase_tokens = preg_match_all('/\p{Han}|[\p{L}\p{N}]+/u', $keyphrase, $keyphrase_matches);
        if ($keyphrase_tokens === false || $keyphrase_tokens < 2 || !preg_match('/\s/u', $keyphrase)) {
            return false;
        }

        preg_match_all('/\p{Han}|[\p{L}\p{N}]+/u', $text, $text_matches);
        $text_tokens = array_fill_keys($text_matches[0] ?? [], true);
        foreach ($keyphrase_matches[0] ?? [] as $token) {
            if (!isset($text_tokens[$token])) {
                return false;
            }
        }

        return true;
    }

    private function get_editor_seo_display_width(string $value): int
    {
        $length = function_exists('mb_strlen') ? mb_strlen($value) : strlen($value);
        preg_match_all('/\p{Han}/u', $value, $han_matches);

        return $length + count($han_matches[0] ?? []);
    }

    private function editor_seo_slug_contains_keyphrase(string $slug, string $keyphrase_slug): bool
    {
        return $slug !== '' && $keyphrase_slug !== '' && str_contains('_' . $slug . '_', '_' . $keyphrase_slug . '_');
    }

    private function get_editor_seo_product_media_html(int $post_id): string
    {
        if ($post_id <= 0 || get_post_type($post_id) !== 'product') {
            return '';
        }

        $attachment_ids = [];
        $thumbnail_id = (int) get_post_thumbnail_id($post_id);
        if ($thumbnail_id > 0) {
            $attachment_ids[] = $thumbnail_id;
        }

        foreach (explode(',', (string) get_post_meta($post_id, '_product_image_gallery', true)) as $gallery_id) {
            $gallery_id = (int) trim($gallery_id);
            if ($gallery_id > 0) {
                $attachment_ids[] = $gallery_id;
            }
        }

        $media_html = '';
        foreach (array_values(array_unique($attachment_ids)) as $attachment_id) {
            $alt_text = (string) get_post_meta($attachment_id, '_wp_attachment_image_alt', true);
            $media_html .= sprintf('<img alt="%s">', esc_attr($alt_text));
        }

        return $media_html;
    }

    private function build_editor_seo_scoring_content(string $content_html, string $excerpt, int $post_id): string
    {
        $parts = [];
        if (trim($excerpt) !== '') {
            $parts[] = '<p>' . wp_kses_post($excerpt) . '</p>';
        }
        if (trim($content_html) !== '') {
            $parts[] = $content_html;
        }
        $product_media_html = $this->get_editor_seo_product_media_html($post_id);
        if ($product_media_html !== '') {
            $parts[] = $product_media_html;
        }

        return implode('', $parts);
    }

    private function build_editor_seo_score_check(
        string $key,
        string $label,
        string $status,
        int $max_points,
        string $message,
        ?int $points_override = null
    ): array {
        $points = $points_override ?? ($status === 'pass' ? $max_points : ($status === 'warning' ? (int) round($max_points / 2) : 0));

        return [
            'key' => $key,
            'label' => $label,
            'status' => $status,
            'points' => $points,
            'maxPoints' => $max_points,
            'message' => $message
        ];
    }

    private function is_editor_seo_keyphrase_used_elsewhere(string $focus_keyphrase, int $post_id): bool
    {
        if ($focus_keyphrase === '') {
            return false;
        }

        $matching_posts = get_posts([
            'post_type' => $this->get_supported_editor_post_types(),
            'post_status' => ['publish', 'draft', 'pending', 'future', 'private'],
            'post__not_in' => $post_id > 0 ? [$post_id] : [],
            'meta_key' => self::META_EDITOR_FOCUS_KEYPHRASE,
            'meta_value' => $focus_keyphrase,
            'fields' => 'ids',
            'numberposts' => 1,
            'no_found_rows' => true,
            'suppress_filters' => false
        ]);

        return $matching_posts !== [];
    }

    private function calculate_local_editor_seo_score(
        string $focus_keyphrase,
        string $seo_title,
        string $slug,
        string $meta_description,
        string $content_html,
        int $post_id = 0,
        string $excerpt = ''
    ): array {
        $normalized_keyphrase = $this->normalize_editor_seo_comparable_text($focus_keyphrase);
        $normalized_title = trim(wp_strip_all_tags($seo_title));
        $normalized_meta_description = trim(wp_strip_all_tags($meta_description));
        $lower_title = $this->normalize_editor_seo_comparable_text($normalized_title);
        $lower_meta_description = $this->normalize_editor_seo_comparable_text($normalized_meta_description);
        $scoring_content_html = $this->build_editor_seo_scoring_content($content_html, $excerpt, $post_id);
        $lower_content = $this->normalize_editor_seo_comparable_text($scoring_content_html);
        $title_display_width = $this->get_editor_seo_display_width($normalized_title);
        $meta_length = function_exists('mb_strlen') ? mb_strlen($normalized_meta_description) : strlen($normalized_meta_description);
        $content_units = $this->get_editor_seo_text_units($scoring_content_html);
        $keyphrase_occurrences = $this->count_editor_seo_keyphrase_occurrences($lower_content, $normalized_keyphrase);
        $recommended_keyphrase_occurrences = max(1, (int) ceil($content_units / 200));
        $keyphrase_density = $content_units > 0 ? ($keyphrase_occurrences / $content_units) * 100 : 0;
        $keyphrase_slug = $this->normalize_editor_seo_slug_candidate($normalized_keyphrase);

        preg_match_all('/<a\b[^>]*\bhref\s*=\s*["\']([^"\']+)["\']/i', $scoring_content_html, $link_matches);
        $site_host = strtolower((string) wp_parse_url(home_url('/'), PHP_URL_HOST));
        $internal_link_count = 0;
        $outbound_link_count = 0;
        foreach ($link_matches[1] ?? [] as $href) {
            $href = trim(html_entity_decode((string) $href, ENT_QUOTES | ENT_HTML5, 'UTF-8'));
            if ($href === '' || str_starts_with($href, '#') || preg_match('/^(?:mailto|tel|javascript):/i', $href)) {
                continue;
            }

            $link_host = strtolower((string) wp_parse_url($href, PHP_URL_HOST));
            if ($link_host === '' || $link_host === $site_host || str_ends_with($link_host, '.' . $site_host)) {
                $internal_link_count++;
            } else {
                $outbound_link_count++;
            }
        }

        preg_match_all('/<img\b[^>]*>/i', $scoring_content_html, $image_matches);
        $image_count = count($image_matches[0] ?? []);
        $image_keyphrase_count = 0;
        foreach ($image_matches[0] ?? [] as $image_tag) {
            preg_match('/\balt\s*=\s*["\']([^"\']*)["\']/i', (string) $image_tag, $alt_match);
            $alt_text = $this->normalize_editor_seo_comparable_text((string) ($alt_match[1] ?? ''));
            if ($this->editor_seo_text_contains_keyphrase($alt_text, $normalized_keyphrase)) {
                $image_keyphrase_count++;
            }
        }

        preg_match_all('/<p\b[^>]*>([\s\S]*?)<\/p>/i', $scoring_content_html, $paragraph_matches);
        $paragraphs = array_values(array_filter(array_map(
            fn ($paragraph): string => $this->normalize_editor_seo_comparable_text((string) $paragraph),
            $paragraph_matches[1] ?? []
        )));
        if ($paragraphs === [] && $lower_content !== '') {
            $paragraphs = [$lower_content];
        }
        $introduction = $paragraphs[0] ?? '';
        $paragraph_lengths = array_map(fn ($paragraph): int => $this->get_editor_seo_text_units((string) $paragraph), $paragraphs);
        $longest_paragraph = $paragraph_lengths === [] ? 0 : max($paragraph_lengths);

        $sentences = array_values(array_filter(array_map('trim', preg_split('/[.!?。！？]+/u', $lower_content) ?: [])));
        $sentence_count = count($sentences);
        $long_sentence_limit = preg_match('/\p{Han}/u', $lower_content) ? 45 : 25;
        $long_sentence_count = count(array_filter(
            $sentences,
            fn ($sentence): bool => $this->get_editor_seo_text_units((string) $sentence) > $long_sentence_limit
        ));
        $long_sentence_ratio = $sentence_count > 0 ? $long_sentence_count / $sentence_count : 0;
        $passive_sentence_count = count(array_filter($sentences, static function ($sentence): bool {
            return preg_match('/(?:\b(?:is|are|was|were|be|been|being)\s+[a-z]+(?:ed|en)\b|被|受到|由[^，。！？]{1,20}(?:進行|完成|建立|使用|處理))/iu', (string) $sentence) === 1;
        }));
        $passive_sentence_ratio = $sentence_count > 0 ? $passive_sentence_count / $sentence_count : 0;

        $sentence_starts = array_map(static function ($sentence): string {
            preg_match('/^\s*(\p{Han}{1,4}|(?:[\p{L}\p{N}]+\s*){1,3})/u', (string) $sentence, $matches);
            return function_exists('mb_strtolower') ? mb_strtolower(trim((string) ($matches[1] ?? ''))) : strtolower(trim((string) ($matches[1] ?? '')));
        }, $sentences);
        $has_consecutive_sentences = false;
        for ($index = 2; $index < count($sentence_starts); $index++) {
            if ($sentence_starts[$index] !== '' && $sentence_starts[$index] === $sentence_starts[$index - 1] && $sentence_starts[$index] === $sentence_starts[$index - 2]) {
                $has_consecutive_sentences = true;
                break;
            }
        }

        preg_match_all('/<h[2-4]\b[^>]*>/i', $scoring_content_html, $subheading_matches, PREG_OFFSET_CAPTURE);
        $subheading_count = count($subheading_matches[0] ?? []);
        $heading_sections = preg_split('/<h[2-4]\b[^>]*>[\s\S]*?<\/h[2-4]>/i', $scoring_content_html) ?: [];
        $heading_section_lengths = array_map(
            fn ($section): int => $this->get_editor_seo_text_units((string) $section),
            $heading_sections
        );
        $longest_heading_section = $heading_section_lengths === [] ? 0 : max($heading_section_lengths);
        $previous_keyphrase_used = $this->is_editor_seo_keyphrase_used_elsewhere($focus_keyphrase, $post_id);

        $checks = [];
        $checks[] = $this->build_editor_seo_score_check(
            'focus-keyphrase',
            __('Focus keyphrase', 'rankwoven-seo'),
            $normalized_keyphrase !== '' ? 'pass' : 'fail',
            5,
            $normalized_keyphrase !== '' ? __('已設定 Focus keyphrase。', 'rankwoven-seo') : __('尚未設定 Focus keyphrase。', 'rankwoven-seo')
        );
        $checks[] = $this->build_editor_seo_score_check(
            'title-length',
            __('SEO title width', 'rankwoven-seo'),
            $title_display_width >= 30 && $title_display_width <= 60 ? 'pass' : ($title_display_width >= 24 && $title_display_width <= 70 ? 'warning' : 'fail'),
            7,
            $title_display_width >= 30 && $title_display_width <= 60
                ? sprintf(__('SEO title 顯示寬度約 %d 單位，符合建議。', 'rankwoven-seo'), $title_display_width)
                : sprintf(__('SEO title 顯示寬度約 %d 單位，建議調整至 30-60 單位。', 'rankwoven-seo'), $title_display_width)
        );
        $checks[] = $this->build_editor_seo_score_check(
            'focus-in-title',
            __('Keyphrase in SEO title', 'rankwoven-seo'),
            $this->editor_seo_text_contains_keyphrase($lower_title, $normalized_keyphrase) ? 'pass' : 'fail',
            7,
            $this->editor_seo_text_contains_keyphrase($lower_title, $normalized_keyphrase)
                ? __('SEO title 已包含完整 Focus keyphrase。', 'rankwoven-seo')
                : __('SEO title 尚未包含完整 Focus keyphrase。', 'rankwoven-seo')
        );
        $checks[] = $this->build_editor_seo_score_check(
            'meta-length',
            __('Meta description length', 'rankwoven-seo'),
            $meta_length >= 120 && $meta_length <= 156 ? 'pass' : ($meta_length >= 70 && $meta_length <= 160 ? 'warning' : 'fail'),
            6,
            $meta_length >= 120 && $meta_length <= 156
                ? sprintf(__('Meta description 長度為 %d 字，符合建議。', 'rankwoven-seo'), $meta_length)
                : sprintf(__('Meta description 長度為 %d 字，建議調整至 120-156 字。', 'rankwoven-seo'), $meta_length)
        );
        $checks[] = $this->build_editor_seo_score_check(
            'focus-in-meta',
            __('Keyphrase in meta description', 'rankwoven-seo'),
            $this->editor_seo_text_contains_keyphrase($lower_meta_description, $normalized_keyphrase) ? 'pass' : 'fail',
            6,
            $this->editor_seo_text_contains_keyphrase($lower_meta_description, $normalized_keyphrase)
                ? __('Meta description 已包含 Focus keyphrase。', 'rankwoven-seo')
                : __('Meta description 尚未包含 Focus keyphrase。', 'rankwoven-seo')
        );
        $checks[] = $this->build_editor_seo_score_check(
            'slug-keyphrase',
            __('Keyphrase in slug', 'rankwoven-seo'),
            $this->editor_seo_slug_contains_keyphrase($slug, $keyphrase_slug) ? 'pass' : ($slug !== '' ? 'warning' : 'fail'),
            5,
            $this->editor_seo_slug_contains_keyphrase($slug, $keyphrase_slug)
                ? __('Slug 已包含 Focus keyphrase 的英文格式。', 'rankwoven-seo')
                : __('Slug 應加入與 Focus keyphrase 對應的英文詞組。', 'rankwoven-seo')
        );
        $checks[] = $this->build_editor_seo_score_check(
            'content-length',
            __('Text length', 'rankwoven-seo'),
            $content_units >= 300 ? 'pass' : ($content_units >= 150 ? 'warning' : 'fail'),
            10,
            $content_units >= 300
                ? sprintf(__('正文包含約 %d 個中英文文字單位，長度充足。', 'rankwoven-seo'), $content_units)
                : sprintf(__('正文只有約 %d 個中英文文字單位，建議至少補充至 300。', 'rankwoven-seo'), $content_units)
        );
        $density_status = $normalized_keyphrase === '' || $keyphrase_occurrences < $recommended_keyphrase_occurrences
            ? 'fail'
            : ($keyphrase_density > 3.5 ? 'warning' : 'pass');
        $checks[] = $this->build_editor_seo_score_check(
            'keyphrase-density',
            __('Keyphrase density', 'rankwoven-seo'),
            $density_status,
            7,
            sprintf(
                __('Focus keyphrase 出現 %1$d 次；此長度建議至少 %2$d 次，並避免過度重複。', 'rankwoven-seo'),
                $keyphrase_occurrences,
                $recommended_keyphrase_occurrences
            )
        );
        $checks[] = $this->build_editor_seo_score_check(
            'keyphrase-introduction',
            __('Keyphrase in introduction', 'rankwoven-seo'),
            $this->editor_seo_text_contains_keyphrase($introduction, $normalized_keyphrase) ? 'pass' : 'fail',
            6,
            $this->editor_seo_text_contains_keyphrase($introduction, $normalized_keyphrase)
                ? __('首段已包含 Focus keyphrase。', 'rankwoven-seo')
                : __('首段尚未包含 Focus keyphrase。', 'rankwoven-seo')
        );
        $checks[] = $this->build_editor_seo_score_check(
            'outbound-links',
            __('Outbound links', 'rankwoven-seo'),
            $outbound_link_count > 0 ? 'pass' : 'fail',
            5,
            $outbound_link_count > 0
                ? sprintf(__('正文包含 %d 條外部連結。', 'rankwoven-seo'), $outbound_link_count)
                : __('正文尚未包含外部連結。', 'rankwoven-seo')
        );
        $checks[] = $this->build_editor_seo_score_check(
            'images',
            __('Images', 'rankwoven-seo'),
            $image_count > 0 ? 'pass' : 'fail',
            5,
            $image_count > 0 ? sprintf(__('正文包含 %d 張圖片。', 'rankwoven-seo'), $image_count) : __('正文尚未包含圖片。', 'rankwoven-seo')
        );
        $image_keyphrase_status = $image_count > 0 && $normalized_keyphrase !== '' && $image_keyphrase_count >= max(1, (int) ceil($image_count / 2)) ? 'pass' : 'warning';
        $checks[] = $this->build_editor_seo_score_check(
            'image-keyphrase',
            __('Image keyphrase', 'rankwoven-seo'),
            $image_keyphrase_status,
            5,
            sprintf(__('共 %1$d 張圖片，其中 %2$d 張的 Alt Text 包含 Focus keyphrase；建議至少覆蓋一半相關圖片。', 'rankwoven-seo'), $image_count, $image_keyphrase_count),
            $image_count === 0 ? 0 : null
        );
        $checks[] = $this->build_editor_seo_score_check(
            'internal-links',
            __('Internal links', 'rankwoven-seo'),
            $internal_link_count >= 2 ? 'pass' : ($internal_link_count === 1 ? 'warning' : 'fail'),
            5,
            $internal_link_count >= 2
                ? sprintf(__('正文包含 %d 條內部連結。', 'rankwoven-seo'), $internal_link_count)
                : __('建議正文至少加入兩條相關內部連結。', 'rankwoven-seo')
        );
        $checks[] = $this->build_editor_seo_score_check(
            'consecutive-sentences',
            __('Consecutive sentences', 'rankwoven-seo'),
            $sentence_count === 0 ? 'fail' : ($has_consecutive_sentences ? 'warning' : 'pass'),
            4,
            $sentence_count === 0 ? __('正文為空，無法評估連續句子。', 'rankwoven-seo') : ($has_consecutive_sentences ? __('有三個連續句子使用相同開頭，建議增加句式變化。', 'rankwoven-seo') : __('連續句子的開頭有足夠變化。', 'rankwoven-seo'))
        );
        $subheading_status = $content_units === 0
            ? 'fail'
            : ($content_units < 300 || ($subheading_count > 0 && $longest_heading_section <= 300)
            ? 'pass'
            : ($longest_heading_section <= 450 ? 'warning' : 'fail'));
        $checks[] = $this->build_editor_seo_score_check(
            'subheading-distribution',
            __('Subheading distribution', 'rankwoven-seo'),
            $subheading_status,
            4,
            $subheading_count > 0 && $longest_heading_section <= 300
                ? sprintf(__('正文使用 %d 個 H2-H4 子標題，分佈合理。', 'rankwoven-seo'), $subheading_count)
                : ($content_units === 0
                    ? __('正文為空，無法評估子標題分佈。', 'rankwoven-seo')
                    : ($content_units < 300
                    ? __('短內容暫不需要額外子標題。', 'rankwoven-seo')
                    : ($subheading_count > 0 ? __('部分章節過長，建議增加或重新分配 H2-H4 子標題。', 'rankwoven-seo') : __('內容較長，建議加入 H2-H4 子標題。', 'rankwoven-seo'))))
        );
        $checks[] = $this->build_editor_seo_score_check(
            'paragraph-length',
            __('Paragraph length', 'rankwoven-seo'),
            $longest_paragraph === 0 ? 'fail' : ($longest_paragraph <= 150 ? 'pass' : ($longest_paragraph <= 250 ? 'warning' : 'fail')),
            4,
            $longest_paragraph === 0 ? __('正文為空，無法評估段落長度。', 'rankwoven-seo') : ($longest_paragraph <= 150 ? __('段落長度易於閱讀。', 'rankwoven-seo') : sprintf(__('最長段落約 %d 個文字單位，建議拆短。', 'rankwoven-seo'), $longest_paragraph))
        );
        $checks[] = $this->build_editor_seo_score_check(
            'passive-voice',
            __('Passive voice', 'rankwoven-seo'),
            $sentence_count === 0 ? 'fail' : ($passive_sentence_ratio <= 0.1 ? 'pass' : ($passive_sentence_ratio <= 0.2 ? 'warning' : 'fail')),
            3,
            $sentence_count === 0 ? __('正文為空，無法評估語態。', 'rankwoven-seo') : ($passive_sentence_ratio <= 0.1 ? __('主動語態比例良好。', 'rankwoven-seo') : __('被動語態句子偏多，建議改用更直接的主動語態。', 'rankwoven-seo'))
        );
        $checks[] = $this->build_editor_seo_score_check(
            'sentence-length',
            __('Sentence length', 'rankwoven-seo'),
            $sentence_count === 0 ? 'fail' : ($long_sentence_ratio <= 0.25 ? 'pass' : ($long_sentence_ratio <= 0.4 ? 'warning' : 'fail')),
            4,
            $sentence_count === 0 ? __('正文為空，無法評估句子長度。', 'rankwoven-seo') : ($long_sentence_ratio <= 0.25 ? __('大部分句子長度適中。', 'rankwoven-seo') : __('過長句子比例偏高，建議拆分以改善可讀性。', 'rankwoven-seo'))
        );
        $checks[] = $this->build_editor_seo_score_check(
            'previously-used-keyphrase',
            __('Previously used keyphrase', 'rankwoven-seo'),
            $normalized_keyphrase === '' ? 'warning' : ($previous_keyphrase_used ? 'warning' : 'pass'),
            2,
            $normalized_keyphrase === ''
                ? __('設定 Focus keyphrase 後才可檢查重複使用。', 'rankwoven-seo')
                : ($previous_keyphrase_used ? __('其他內容已使用相同 Focus keyphrase，可能造成關鍵詞競爭。', 'rankwoven-seo') : __('此 Focus keyphrase 尚未被其他內容使用。', 'rankwoven-seo'))
        );

        $score = array_reduce($checks, static fn (int $total, array $check): int => $total + (int) $check['points'], 0);
        $messages = array_map(
            static fn (array $check): string => (string) $check['message'],
            array_filter($checks, static fn (array $check): bool => $check['status'] !== 'pass')
        );
        $summary = $messages === []
            ? __('目前內容 SEO 分數 100/100。全部 SEO 檢查項均已達標。', 'rankwoven-seo')
            : sprintf(
                /* translators: 1: SEO score, 2: optimization hints */
                __('目前內容 SEO 分數 %1$d/100。待優化：%2$s', 'rankwoven-seo'),
                $score,
                implode('；', $messages)
            );

        return [
            'seoScore' => max(0, min(100, $score)),
            'analysis' => $summary,
            'scoreChecks' => $checks
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
        $score_checks = is_array($data['scoreChecks'] ?? null) ? $data['scoreChecks'] : [];

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
            'scoreChecks' => $score_checks,
            'metaDescription' => $meta_description,
            'metaKeywords' => $meta_keywords,
            'analysis' => $analysis
        ];
    }

    public function handle_editor_seo_ajax(): void
    {
        if (!check_ajax_referer('rankwoven_editor_seo', 'nonce', false)) {
            wp_send_json_error([
                'message' => __('Security check failed. Please refresh the editor page and try again.', 'rankwoven-seo')
            ], 403);
        }

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
        if (!in_array($mode, ['generate', 'save'], true)) {
            wp_send_json_error([
                'message' => __('Unsupported SEO action.', 'rankwoven-seo')
            ], 400);
        }

        $focus_keyphrase = sanitize_text_field(wp_unslash($_POST['focusKeyphrase'] ?? ''));
        $seo_title = sanitize_text_field(wp_unslash($_POST['seoTitle'] ?? ''));
        $slug = $this->normalize_editor_seo_slug_candidate((string) wp_unslash($_POST['slug'] ?? ''));
        $meta_description = sanitize_textarea_field(wp_unslash($_POST['metaDescription'] ?? ''));
        $meta_keywords = $this->sanitize_editor_meta_keywords(wp_unslash($_POST['metaKeywords'] ?? ''));
        $seo_score = max(0, min(100, (int) ($_POST['seoScore'] ?? 0)));
        $analysis = sanitize_textarea_field(wp_unslash($_POST['analysis'] ?? ''));
        $score_checks = [];
        $current_title = sanitize_text_field(wp_unslash($_POST['currentTitle'] ?? $post->post_title));
        $current_seo_title = sanitize_text_field(wp_unslash($_POST['currentSeoTitle'] ?? $seo_title));
        $current_slug = $this->normalize_editor_seo_slug((string) wp_unslash($_POST['currentSlug'] ?? $post->post_name), (string) $post->post_title);
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
                'contentHtml' => $content_html . $this->get_editor_seo_product_media_html($post_id),
                'currentMetaDescription' => $meta_description,
                'currentMetaKeywords' => $meta_keywords,
                'currentUrl' => (string) get_permalink($post_id),
                'hasPreviouslyUsedKeyphrase' => $this->is_editor_seo_keyphrase_used_elsewhere($focus_keyphrase, $post_id),
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

        $local_analysis = $this->calculate_local_editor_seo_score(
            $focus_keyphrase,
            $seo_title !== '' ? $seo_title : $current_seo_title,
            $slug !== '' ? $slug : $current_slug,
            $meta_description,
            $content_html,
            $post_id,
            $excerpt
        );
        $seo_score = max(0, min(100, (int) ($local_analysis['seoScore'] ?? 0)));
        $score_checks = is_array($local_analysis['scoreChecks'] ?? null) ? $local_analysis['scoreChecks'] : [];
        $local_summary = sanitize_textarea_field((string) ($local_analysis['analysis'] ?? ''));
        if ($mode === 'save' || $analysis === '') {
            $analysis = $local_summary;
        } elseif ($local_summary !== '' && !str_contains($analysis, $local_summary)) {
            $analysis = sanitize_textarea_field($analysis . "\n" . $local_summary);
        }

        $saved_slug = $slug !== '' ? $slug : $current_slug;
        if ($saved_slug !== '' && $saved_slug !== (string) $post->post_name) {
            $save_result = wp_update_post(wp_slash([
                'ID' => $post_id,
                'post_name' => $saved_slug
            ]), true);

            if (is_wp_error($save_result)) {
                wp_send_json_error([
                    'message' => $save_result->get_error_message()
                ], 500);
            }
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
            'slug' => $saved_slug,
            'seoScore' => $seo_score,
            'metaDescription' => $meta_description,
            'metaKeywords' => $meta_keywords,
            'analysis' => $analysis,
            'scoreChecks' => $score_checks,
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
        $slug = $this->normalize_editor_seo_slug_candidate((string) wp_unslash($_POST['rankwoven_seo_slug'] ?? ''));
        $current_post_slug = $this->normalize_editor_seo_slug((string) $post->post_name, (string) get_the_title($post_id));
        $meta_description = sanitize_textarea_field(wp_unslash($_POST['rankwoven_meta_description'] ?? ''));
        $meta_keywords = $this->sanitize_editor_meta_keywords(wp_unslash($_POST['rankwoven_meta_keywords'] ?? ''));

        $local_analysis = $this->calculate_local_editor_seo_score(
            $focus_keyphrase,
            $seo_title !== '' ? $seo_title : sanitize_text_field((string) get_the_title($post_id)),
            $slug !== '' ? $slug : $current_post_slug,
            $meta_description,
            (string) $post->post_content,
            $post_id,
            (string) $post->post_excerpt
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
                        <?php echo esc_html__('Manage search appearance, SEO analysis, sitemap submission, image attributes, WebP/AVIF optimization, and safe internal-link writeback from one WordPress-native panel.', 'rankwoven-seo'); ?>
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

            <?php if ($active_tab === 'geo') : ?>
                <?php $this->render_geo_page(); ?>
        </div>
                <?php return; ?>
            <?php endif; ?>

            <?php if ($active_tab === 'image_attributes') : ?>
                <?php $this->render_image_attributes_page(); ?>
        </div>
                <?php return; ?>
            <?php endif; ?>

            <?php if ($active_tab === 'image_optimizer') : ?>
                <?php $this->render_image_optimizer_page(); ?>
        </div>
                <?php return; ?>
            <?php endif; ?>

            <?php if ($active_tab === 'image_convert') : ?>
                <?php $this->render_image_convert_page(); ?>
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
        $issue_groups = $this->group_audit_issues_by_content_type($issues);
        ?>
        <h3><?php echo esc_html__('最新審計', 'rankwoven-seo'); ?></h3>
        <table class="widefat striped">
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
            <div class="rankwoven-audit-type-summary" aria-label="<?php echo esc_attr__('SEO issue counts by content type', 'rankwoven-seo'); ?>">
                <?php foreach ($issue_groups as $group) : ?>
                    <span class="rankwoven-audit-type-chip">
                        <?php echo esc_html((string) $group['label']); ?>
                        <strong><?php echo esc_html((string) count($group['issues'])); ?></strong>
                    </span>
                <?php endforeach; ?>
            </div>

            <?php foreach ($issue_groups as $group) : ?>
                <h4 class="rankwoven-audit-group-title">
                    <?php echo esc_html((string) $group['label']); ?>
                    <span><?php echo esc_html(sprintf(__('%d 個問題', 'rankwoven-seo'), count($group['issues']))); ?></span>
                </h4>
                <table class="widefat striped rankwoven-audit-issue-table">
                    <thead>
                        <tr>
                            <th><?php echo esc_html__('嚴重程度', 'rankwoven-seo'); ?></th>
                            <th><?php echo esc_html__('目標內容', 'rankwoven-seo'); ?></th>
                            <th><?php echo esc_html__('規則', 'rankwoven-seo'); ?></th>
                            <th><?php echo esc_html__('訊息', 'rankwoven-seo'); ?></th>
                            <th><?php echo esc_html__('建議', 'rankwoven-seo'); ?></th>
                            <th><?php echo esc_html__('操作', 'rankwoven-seo'); ?></th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($group['issues'] as $issue) : ?>
                            <tr>
                                <td><?php echo esc_html((string) ($issue['severity'] ?? '')); ?></td>
                                <td><?php echo esc_html($this->get_suggestion_target_label($issue)); ?></td>
                                <td><code><?php echo esc_html((string) ($issue['ruleCode'] ?? '')); ?></code></td>
                                <td><?php echo esc_html((string) ($issue['message'] ?? '')); ?></td>
                                <td><?php echo esc_html($this->get_suggestion_summary_text((string) ($issue['suggestedValue'] ?? ''))); ?></td>
                                <td><?php $this->render_audit_issue_actions($issue); ?></td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            <?php endforeach; ?>
        <?php endif; ?>
        <?php
    }

    private function render_audit_issue_actions(array $issue): void
    {
        $target_cms_id = (int) ($issue['targetCmsId'] ?? 0);
        $edit_url = $target_cms_id > 0 ? get_edit_post_link($target_cms_id, '') : '';
        $apply_payload = $this->get_audit_issue_apply_payload($issue);
        ?>
        <div class="rankwoven-audit-actions">
            <?php if (is_string($edit_url) && $edit_url !== '') : ?>
                <a class="button button-small" href="<?php echo esc_url($edit_url); ?>">
                    <?php echo esc_html__('修改', 'rankwoven-seo'); ?>
                </a>
            <?php else : ?>
                <button type="button" class="button button-small" disabled>
                    <?php echo esc_html__('修改', 'rankwoven-seo'); ?>
                </button>
            <?php endif; ?>

            <?php if (is_array($apply_payload)) : ?>
                <form class="rankwoven-inline-action-form" method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
                    <?php wp_nonce_field('rankwoven_apply_audit_issue'); ?>
                    <input type="hidden" name="action" value="rankwoven_apply_audit_issue" />
                    <input type="hidden" name="rankwoven_target_type" value="<?php echo esc_attr((string) $apply_payload['target_type']); ?>" />
                    <input type="hidden" name="rankwoven_target_cms_id" value="<?php echo esc_attr((string) $apply_payload['target_cms_id']); ?>" />
                    <input type="hidden" name="rankwoven_field_name" value="<?php echo esc_attr((string) $apply_payload['field_name']); ?>" />
                    <input type="hidden" name="rankwoven_suggested_value" value="<?php echo esc_attr((string) $apply_payload['suggested_value']); ?>" />
                    <button type="submit" class="button button-small button-primary">
                        <?php echo esc_html__('套用', 'rankwoven-seo'); ?>
                    </button>
                </form>
            <?php else : ?>
                <button
                    type="button"
                    class="button button-small"
                    title="<?php echo esc_attr__('此問題需要人工檢查內容後修改，不能安全直接套用。', 'rankwoven-seo'); ?>"
                    disabled
                >
                    <?php echo esc_html__('套用', 'rankwoven-seo'); ?>
                </button>
            <?php endif; ?>
        </div>
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
        <div class="rankwoven-action-row">
            <?php $this->render_admin_post_button('rankwoven_rescan_internal_links', 'rankwoven_rescan_internal_links', __('重新掃描內部連結', 'rankwoven-seo'), 'primary'); ?>
            <span class="description">
                <?php echo esc_html__('刪除文章、頁面、商品或 Portfolio 後使用。系統會完整重新同步內容，清理舊候選，再重新產生可套用的內部連結建議。', 'rankwoven-seo'); ?>
            </span>
        </div>

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
            <?php echo esc_html__('Click a tag above each template field to insert variables automatically. Customers do not need to type placeholder code manually.', 'rankwoven-seo'); ?>
        </p>

        <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" data-rankwoven-content-meta-settings>
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
        <?php $this->render_content_meta_settings_script(); ?>
        <?php
    }

    private function render_content_meta_field_row(string $field_name, string $value, string $label, string $description, bool $multiline = false): void
    {
        $field_id = sanitize_key(str_replace(['[', ']'], ['_', ''], $field_name));
        $tokens = [
            '{{title}}' => __('Title', 'rankwoven-seo'),
            '{{excerpt}}' => __('Excerpt', 'rankwoven-seo'),
            '{{focus_keyphrase}}' => __('Focus Keyphrase', 'rankwoven-seo'),
            '{{site_name}}' => __('Site Name', 'rankwoven-seo'),
            '{{slug}}' => __('Slug', 'rankwoven-seo'),
            '{{post_type}}' => __('Post Type', 'rankwoven-seo'),
            '{{post_type_label}}' => __('Post Type Label', 'rankwoven-seo'),
        ];
        ?>
        <tr>
            <th scope="row">
                <label for="<?php echo esc_attr($field_id); ?>"><?php echo esc_html($label); ?></label>
            </th>
            <td>
                <div class="rankwoven-content-meta-field" data-rankwoven-content-meta-field>
                    <p class="description rankwoven-token-help">
                        <?php echo esc_html__('Click a tag to insert variables into this template.', 'rankwoven-seo'); ?>
                    </p>
                    <div class="rankwoven-token-row">
                        <?php foreach ($tokens as $token => $token_label) : ?>
                            <?php $button_aria_label = sprintf(__('Insert %s placeholder', 'rankwoven-seo'), $token_label); ?>
                            <button
                                type="button"
                                class="button rankwoven-token-button"
                                data-rankwoven-content-token="<?php echo esc_attr($token); ?>"
                                aria-label="<?php echo esc_attr($button_aria_label); ?>"
                            >
                                + <?php echo esc_html($token_label); ?>
                            </button>
                        <?php endforeach; ?>
                    </div>
                    <?php if ($multiline) : ?>
                        <textarea
                            id="<?php echo esc_attr($field_id); ?>"
                            name="<?php echo esc_attr($field_name); ?>"
                            class="large-text"
                            rows="3"
                            data-rankwoven-content-meta-input
                        ><?php echo esc_textarea($value); ?></textarea>
                    <?php else : ?>
                        <input
                            type="text"
                            id="<?php echo esc_attr($field_id); ?>"
                            name="<?php echo esc_attr($field_name); ?>"
                            class="large-text"
                            value="<?php echo esc_attr($value); ?>"
                            data-rankwoven-content-meta-input
                        />
                    <?php endif; ?>
                    <p class="description"><?php echo esc_html($description); ?></p>
                </div>
            </td>
        </tr>
        <?php
    }

    private function render_content_meta_settings_script(): void
    {
        ?>
        <script>
        (() => {
            const root = document.querySelector('[data-rankwoven-content-meta-settings]');
            if (!root) {
                return;
            }

            const insertToken = (input, token) => {
                const start = input.selectionStart ?? input.value.length;
                const end = input.selectionEnd ?? input.value.length;
                input.value = `${input.value.slice(0, start)}${token}${input.value.slice(end)}`;
                input.focus();
                input.setSelectionRange(start + token.length, start + token.length);
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
            };

            root.addEventListener('click', (event) => {
                const tokenButton = event.target.closest('[data-rankwoven-content-token]');
                if (!tokenButton) {
                    return;
                }

                const token = tokenButton.dataset.rankwovenContentToken || '';
                const field = tokenButton.closest('[data-rankwoven-content-meta-field]');
                const input = field ? field.querySelector('[data-rankwoven-content-meta-input]') : null;
                if (input && token !== '') {
                    insertToken(input, token);
                }
            });
        })();
        </script>
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
        $geo_assessment = $this->get_geo_assessment($this->get_geo_settings());
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
                <?php $this->render_diagnostic_row(__('GEO readiness', 'rankwoven-seo'), sprintf('%d/100', (int) $geo_assessment['overall_score'])); ?>
                <?php $this->render_diagnostic_row(__('Application Password', 'rankwoven-seo'), $this->get_application_password_status_label($wp_credentials)); ?>
                <?php $this->render_diagnostic_row(__('Last error', 'rankwoven-seo'), $this->get_last_error_label($last_error)); ?>
            </tbody>
        </table>
        <?php
    }

    private function render_sitemap_page(): void
    {
        $sitemap_url = home_url('/sitemap.xml');
        $robots_txt_url = home_url('/robots.txt');
        $custom_robots_txt_content = $this->get_custom_robots_txt_content();
        $robots_txt_placeholder = implode("\n", [
            'User-agent: *',
            'Allow: /',
            '',
            'Disallow: /wp-admin/',
            'Allow: /wp-admin/admin-ajax.php'
        ]);
        $last_sitemap_result = get_option(self::OPTION_LAST_SITEMAP_RESULT, []);
        $last_sitemap_result = is_array($last_sitemap_result) ? $last_sitemap_result : [];
        $last_submission_result = get_option(self::OPTION_LAST_SITEMAP_SUBMISSION_RESULT, []);
        $last_submission_result = is_array($last_submission_result) ? $last_submission_result : [];
        $sitemap_post_types = $last_sitemap_result['postTypes'] ?? [];
        $sitemap_post_types = is_array($sitemap_post_types) ? $sitemap_post_types : [];
        $sitemap_post_types = array_map(static fn ($post_type): string => sanitize_text_field((string) $post_type), $sitemap_post_types);
        ?>
        <?php $this->render_rss_sitemap_page(); ?>
        <?php $this->render_llms_txt_page(); ?>
        <?php $this->render_indexnow_page(); ?>

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

        <?php $this->render_search_engine_submission_links($sitemap_url); ?>

        <h3><?php echo esc_html__('robots.txt 手動設定', 'rankwoven-seo'); ?></h3>
        <p>
            <?php echo esc_html__('在此保存要輸出的 robots.txt 內容。留空時使用 WordPress 預設 robots.txt；RankWoven 會自動保留 Sitemap 行，避免搜尋引擎漏讀 sitemap.xml。', 'rankwoven-seo'); ?>
        </p>
        <p>
            <code><?php echo esc_html($robots_txt_url); ?></code>
            <a href="<?php echo esc_url($robots_txt_url); ?>" target="_blank" rel="noopener noreferrer" style="margin-left:12px;">
                <?php echo esc_html__('Open robots.txt', 'rankwoven-seo'); ?>
            </a>
        </p>
        <?php if ($this->has_physical_robots_txt_file()) : ?>
            <div class="notice notice-warning inline">
                <p>
                    <?php echo esc_html__('偵測到網站根目錄存在實體 robots.txt。部分主機會優先輸出該文件，令 WordPress 動態 robots.txt 設定不生效；如保存後前台未變更，請檢查主機上的實體文件。', 'rankwoven-seo'); ?>
                </p>
            </div>
        <?php endif; ?>
        <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
            <?php wp_nonce_field('rankwoven_save_settings'); ?>
            <input type="hidden" name="action" value="rankwoven_save_settings" />
            <input type="hidden" name="rankwoven_settings_scope" value="sitemap" />
            <table class="form-table" role="presentation">
                <tr>
                    <th scope="row">
                        <label for="rankwoven_robots_txt_content"><?php echo esc_html__('robots.txt Content', 'rankwoven-seo'); ?></label>
                    </th>
                    <td>
                        <textarea
                            id="rankwoven_robots_txt_content"
                            name="rankwoven_robots_txt_content"
                            class="large-text code"
                            rows="12"
                            spellcheck="false"
                            placeholder="<?php echo esc_attr($robots_txt_placeholder); ?>"
                        ><?php echo esc_textarea($custom_robots_txt_content); ?></textarea>
                        <p class="description">
                            <?php echo esc_html__('支援標準 robots.txt 指令，例如 User-agent、Allow、Disallow、Crawl-delay 和 Sitemap。保存後會即時影響 WordPress 動態 /robots.txt。', 'rankwoven-seo'); ?>
                        </p>
                    </td>
                </tr>
            </table>
            <?php submit_button(__('Save robots.txt', 'rankwoven-seo')); ?>
        </form>

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

    private function render_indexnow_page(): void
    {
        $settings = $this->get_indexnow_settings();
        $last_result = get_option(self::OPTION_INDEXNOW_LAST_RESULT, []);
        $last_result = is_array($last_result) ? $last_result : [];
        $key = (string) ($settings['key'] ?? '');
        $key_url = $key !== '' ? home_url('/' . rawurlencode($key) . '.txt') : '';
        $selected_post_types = is_array($settings['post_types'] ?? null) ? $settings['post_types'] : [];
        $available_post_types = $this->get_supported_editor_post_types();
        ?>
        <section class="rankwoven-panel rankwoven-indexnow-panel">
            <div class="rankwoven-section-heading">
                <span class="rankwoven-eyebrow"><?php echo esc_html__('Instant Indexing', 'rankwoven-seo'); ?></span>
                <h2><?php echo esc_html__('IndexNow', 'rankwoven-seo'); ?></h2>
                <p><?php echo esc_html__('在內容新增、更新或刪除後，即時通知支援 IndexNow 的搜尋引擎，縮短搜尋結果反映變更的時間。', 'rankwoven-seo'); ?></p>
            </div>
            <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
                <?php wp_nonce_field('rankwoven_save_settings'); ?>
                <input type="hidden" name="action" value="rankwoven_save_settings" />
                <input type="hidden" name="rankwoven_settings_scope" value="indexnow" />
                <table class="form-table" role="presentation">
                    <tr>
                        <th scope="row"><?php echo esc_html__('啟用 IndexNow', 'rankwoven-seo'); ?></th>
                        <td>
                            <label class="rankwoven-toggle-row">
                                <input type="checkbox" name="rankwoven_indexnow_settings[enabled]" value="1" <?php checked(!empty($settings['enabled'])); ?> />
                                <?php echo esc_html__('允許插件通知 IndexNow API', 'rankwoven-seo'); ?>
                            </label>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><?php echo esc_html__('自動提交', 'rankwoven-seo'); ?></th>
                        <td>
                            <label class="rankwoven-toggle-row">
                                <input type="checkbox" name="rankwoven_indexnow_settings[auto_submit]" value="1" <?php checked(!empty($settings['auto_submit'])); ?> />
                                <?php echo esc_html__('文章、頁面、Portfolio 或商品發佈／更新／移除時自動通知', 'rankwoven-seo'); ?>
                            </label>
                            <p class="description"><?php echo esc_html__('通知只會傳送公開內容 URL，並以短暫鎖定避免同一內容重複提交。', 'rankwoven-seo'); ?></p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><?php echo esc_html__('內容類型', 'rankwoven-seo'); ?></th>
                        <td>
                            <div class="rankwoven-checkbox-grid">
                                <?php foreach ($available_post_types as $post_type) : ?>
                                    <label>
                                        <input type="checkbox" name="rankwoven_indexnow_settings[post_types][]" value="<?php echo esc_attr($post_type); ?>" <?php checked($selected_post_types === [] || in_array($post_type, $selected_post_types, true)); ?> />
                                        <?php echo esc_html(post_type_exists($post_type) ? get_post_type_object($post_type)->labels->name : $post_type); ?>
                                    </label>
                                <?php endforeach; ?>
                            </div>
                            <p class="description"><?php echo esc_html__('未選擇時會套用所有支援的公開內容類型。', 'rankwoven-seo'); ?></p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="rankwoven_indexnow_key"><?php echo esc_html__('IndexNow API Key', 'rankwoven-seo'); ?></label></th>
                        <td>
                            <input id="rankwoven_indexnow_key" name="rankwoven_indexnow_settings[key]" type="text" class="regular-text code" value="<?php echo esc_attr($key); ?>" pattern="[A-Za-z0-9-]{8,128}" placeholder="保存時自動生成 32 位 Key" />
                            <p class="description"><?php echo esc_html__('這是公開驗證 Key，不是網站登入密碼。留空並啟用時，保存設定會自動生成。', 'rankwoven-seo'); ?></p>
                            <?php if ($key_url !== '') : ?>
                                <p><span><?php echo esc_html__('Key 文件：', 'rankwoven-seo'); ?></span><code><?php echo esc_html($key_url); ?></code> <a href="<?php echo esc_url($key_url); ?>" target="_blank" rel="noopener noreferrer"><?php echo esc_html__('檢查', 'rankwoven-seo'); ?></a></p>
                            <?php endif; ?>
                        </td>
                    </tr>
                </table>
                <?php submit_button(__('保存 IndexNow 設定', 'rankwoven-seo')); ?>
            </form>

            <div class="rankwoven-section-heading">
                <span class="rankwoven-eyebrow"><?php echo esc_html__('Manual Ping', 'rankwoven-seo'); ?></span>
                <h3><?php echo esc_html__('手動提交 URL', 'rankwoven-seo'); ?></h3>
                <p><?php echo esc_html__('每行輸入一個本站 URL，最多提交 10,000 個地址。', 'rankwoven-seo'); ?></p>
            </div>
            <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
                <?php wp_nonce_field('rankwoven_submit_indexnow'); ?>
                <input type="hidden" name="action" value="rankwoven_submit_indexnow" />
                <textarea name="rankwoven_indexnow_urls" class="large-text code" rows="5" placeholder="https://example.com/article/1\nhttps://example.com/article/2"></textarea>
                <?php submit_button(__('立即提交到 IndexNow', 'rankwoven-seo'), 'secondary'); ?>
            </form>

            <h3><?php echo esc_html__('最近一次提交', 'rankwoven-seo'); ?></h3>
            <table class="widefat striped">
                <tbody>
                    <tr><th><?php echo esc_html__('時間', 'rankwoven-seo'); ?></th><td><?php echo esc_html((string) ($last_result['submittedAt'] ?? __('尚未提交', 'rankwoven-seo'))); ?></td></tr>
                    <tr><th><?php echo esc_html__('狀態', 'rankwoven-seo'); ?></th><td><?php echo esc_html((string) ($last_result['status'] ?? '')); ?></td></tr>
                    <tr><th><?php echo esc_html__('URL 數量', 'rankwoven-seo'); ?></th><td><?php echo esc_html((string) ($last_result['urlCount'] ?? 0)); ?></td></tr>
                    <tr><th><?php echo esc_html__('訊息', 'rankwoven-seo'); ?></th><td><?php echo esc_html((string) ($last_result['message'] ?? '')); ?></td></tr>
                </tbody>
            </table>
        </section>
        <?php
    }

    private function render_geo_page(): void
    {
        $settings = $this->get_geo_settings();
        $assessment = $this->get_geo_assessment($settings);
        $crawler_groups = $this->get_geo_crawler_groups();
        ?>
        <section class="rankwoven-panel">
            <div class="rankwoven-section-heading">
                <span class="rankwoven-eyebrow"><?php echo esc_html__('Generative Engine Optimization', 'rankwoven-seo'); ?></span>
                <h2><?php echo esc_html__('GEO 優化', 'rankwoven-seo'); ?></h2>
                <p><?php echo esc_html__('控制 AI 爬蟲存取、內容索引、摘要引用和語言聲明，讓搜尋引擎與生成式 AI 更容易正確理解及引用網站內容。', 'rankwoven-seo'); ?></p>
            </div>

            <div class="rankwoven-stat-grid">
                <?php $this->render_admin_metric_card(__('GEO readiness', 'rankwoven-seo'), sprintf('%d/100', (int) $assessment['overall_score']), $assessment['overall_score'] >= 80 ? 'ready' : 'warning'); ?>
                <?php $this->render_admin_metric_card(__('AI Crawler Access', 'rankwoven-seo'), sprintf('%d/100', (int) $assessment['crawler_score']), $assessment['crawler_score'] >= 80 ? 'ready' : 'warning'); ?>
                <?php $this->render_admin_metric_card(__('Machine Readability', 'rankwoven-seo'), sprintf('%d/100', (int) $assessment['machine_score']), $assessment['machine_score'] >= 80 ? 'ready' : 'warning'); ?>
                <?php $this->render_admin_metric_card(__('Structured Data', 'rankwoven-seo'), sprintf('%d/100', (int) $assessment['structured_data_score']), $assessment['structured_data_score'] >= 80 ? 'ready' : 'warning'); ?>
                <?php $this->render_admin_metric_card(__('Content & Citability', 'rankwoven-seo'), sprintf('%d/100', (int) $assessment['content_score']), $assessment['content_score'] >= 80 ? 'ready' : 'warning'); ?>
                <?php $this->render_admin_metric_card(__('Trust & E-E-A-T', 'rankwoven-seo'), sprintf('%d/100', (int) $assessment['trust_score']), $assessment['trust_score'] >= 80 ? 'ready' : 'warning'); ?>
            </div>

            <div class="rankwoven-geo-assessment-grid">
                <?php foreach ($assessment['groups'] as $group) : ?>
                    <article class="rankwoven-geo-assessment-group">
                        <div class="rankwoven-geo-group-heading">
                            <h3><?php echo esc_html((string) $group['title']); ?></h3>
                            <strong><?php echo esc_html(sprintf('%d/100', (int) $group['score'])); ?></strong>
                        </div>
                        <ul class="rankwoven-geo-check-list">
                            <?php foreach ($group['checks'] as $check) : ?>
                                <?php
                                $status = (string) $check['status'];
                                $status_label = $status === 'pass'
                                    ? __('通過', 'rankwoven-seo')
                                    : ($status === 'info' ? __('提示', 'rankwoven-seo') : __('注意', 'rankwoven-seo'));
                                ?>
                                <li class="rankwoven-geo-check" data-status="<?php echo esc_attr($status); ?>">
                                    <span class="rankwoven-geo-check-icon" aria-hidden="true"><?php echo esc_html($status === 'pass' ? 'OK' : ($status === 'info' ? 'i' : '!')); ?></span>
                                    <div>
                                        <div class="rankwoven-geo-check-title">
                                            <strong><?php echo esc_html((string) $check['label']); ?></strong>
                                            <span><?php echo esc_html($status_label); ?></span>
                                        </div>
                                        <p><?php echo esc_html((string) $check['description']); ?></p>
                                    </div>
                                </li>
                            <?php endforeach; ?>
                        </ul>
                    </article>
                <?php endforeach; ?>
            </div>
        </section>

        <form class="rankwoven-panel" method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
            <?php wp_nonce_field('rankwoven_save_settings'); ?>
            <input type="hidden" name="action" value="rankwoven_save_settings" />
            <input type="hidden" name="rankwoven_settings_scope" value="geo" />

            <div class="rankwoven-section-heading">
                <span class="rankwoven-eyebrow"><?php echo esc_html__('Access Policy', 'rankwoven-seo'); ?></span>
                <h2><?php echo esc_html__('AI 爬蟲存取', 'rankwoven-seo'); ?></h2>
            </div>
            <table class="form-table" role="presentation">
                <?php foreach ($crawler_groups as $key => $group) : ?>
                    <tr>
                        <th scope="row"><?php echo esc_html((string) $group['label']); ?></th>
                        <td>
                            <label class="rankwoven-toggle-row">
                                <input type="checkbox" name="rankwoven_geo_settings[<?php echo esc_attr($key); ?>]" value="1" <?php checked(!empty($settings[$key])); ?> />
                                <?php echo esc_html__('允許存取', 'rankwoven-seo'); ?>
                            </label>
                            <p class="description">
                                <?php echo esc_html((string) $group['description']); ?>
                                <br />
                                <code><?php echo esc_html(implode(', ', $group['user_agents'])); ?></code>
                            </p>
                        </td>
                    </tr>
                <?php endforeach; ?>
            </table>

            <div class="rankwoven-section-heading">
                <span class="rankwoven-eyebrow"><?php echo esc_html__('Index & Snippets', 'rankwoven-seo'); ?></span>
                <h2><?php echo esc_html__('索引與摘要控制', 'rankwoven-seo'); ?></h2>
            </div>
            <table class="form-table" role="presentation">
                <tr>
                    <th scope="row"><?php echo esc_html__('Indexability', 'rankwoven-seo'); ?></th>
                    <td>
                        <label class="rankwoven-toggle-row">
                            <input type="checkbox" name="rankwoven_geo_settings[indexable]" value="1" <?php checked(!empty($settings['indexable'])); ?> />
                            <?php echo esc_html__('允許搜尋引擎與 AI 引擎索引公開頁面', 'rankwoven-seo'); ?>
                        </label>
                        <p class="description"><?php echo esc_html__('取消後會在前台輸出 noindex, nofollow；請只在整站暫停索引時使用。', 'rankwoven-seo'); ?></p>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><?php echo esc_html__('Snippet Controls', 'rankwoven-seo'); ?></th>
                    <td>
                        <label class="rankwoven-toggle-row">
                            <input type="checkbox" name="rankwoven_geo_settings[allow_snippets]" value="1" <?php checked(!empty($settings['allow_snippets'])); ?> />
                            <?php echo esc_html__('允許 AI 和搜尋引擎引用頁面摘要', 'rankwoven-seo'); ?>
                        </label>
                        <p class="description"><?php echo esc_html__('取消後會輸出 nosnippet、max-snippet:0 和 max-image-preview:none。', 'rankwoven-seo'); ?></p>
                    </td>
                </tr>
            </table>

            <div class="rankwoven-section-heading">
                <span class="rankwoven-eyebrow"><?php echo esc_html__('Language Declaration', 'rankwoven-seo'); ?></span>
                <h2><?php echo esc_html__('語言與 hreflang', 'rankwoven-seo'); ?></h2>
            </div>
            <table class="form-table" role="presentation">
                <tr>
                    <th scope="row"><?php echo esc_html__('Language Declaration', 'rankwoven-seo'); ?></th>
                    <td>
                        <label class="rankwoven-toggle-row">
                            <input type="checkbox" name="rankwoven_geo_settings[language_declaration]" value="1" <?php checked(!empty($settings['language_declaration'])); ?> />
                            <?php echo esc_html__('輸出語言聲明與 hreflang 標籤', 'rankwoven-seo'); ?>
                        </label>
                        <p class="description"><?php echo esc_html__('WordPress 會繼續輸出 html lang；此選項會額外輸出當前語言、替代語言和 x-default 連結。', 'rankwoven-seo'); ?></p>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><label for="rankwoven_geo_language_code"><?php echo esc_html__('當前語言代碼', 'rankwoven-seo'); ?></label></th>
                    <td>
                        <input id="rankwoven_geo_language_code" name="rankwoven_geo_settings[language_code]" type="text" class="regular-text" value="<?php echo esc_attr((string) $settings['language_code']); ?>" placeholder="zh-Hant" />
                        <p class="description"><?php echo esc_html__('使用 BCP 47 語言標籤，例如 zh-Hant、zh-TW 或 en。', 'rankwoven-seo'); ?></p>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><label for="rankwoven_geo_x_default_url"><?php echo esc_html__('x-default URL', 'rankwoven-seo'); ?></label></th>
                    <td>
                        <input id="rankwoven_geo_x_default_url" name="rankwoven_geo_settings[x_default_url]" type="url" class="regular-text" value="<?php echo esc_attr((string) $settings['x_default_url']); ?>" placeholder="https://example.com/" />
                        <p class="description"><?php echo esc_html__('建議保留一個不限定語言的入口，避免 AI 引擎引用錯誤語言版本。', 'rankwoven-seo'); ?></p>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><label for="rankwoven_geo_alternate_languages"><?php echo esc_html__('替代語言 URL', 'rankwoven-seo'); ?></label></th>
                    <td>
                        <textarea id="rankwoven_geo_alternate_languages" name="rankwoven_geo_settings[alternate_languages]" class="large-text code" rows="5" placeholder="en=https://example.com/en/\nzh-Hant=https://example.com/zh-hant/"><?php echo esc_textarea($this->format_geo_alternate_languages($settings['alternate_languages'])); ?></textarea>
                        <p class="description"><?php echo esc_html__('每行一組 language=URL，例如 en=https://example.com/en/；只接受 http 或 https 地址。', 'rankwoven-seo'); ?></p>
                    </td>
                </tr>
            </table>

            <div class="rankwoven-section-heading">
                <span class="rankwoven-eyebrow"><?php echo esc_html__('Structured Data', 'rankwoven-seo'); ?></span>
                <h2><?php echo esc_html__('JSON-LD 與網站實體', 'rankwoven-seo'); ?></h2>
                <p><?php echo esc_html__('用結構化資料標示網站、作者、文章與商品，提升搜尋引擎及生成式 AI 對內容來源、日期和上下文的理解。', 'rankwoven-seo'); ?></p>
            </div>
            <table class="form-table" role="presentation">
                <tr>
                    <th scope="row"><?php echo esc_html__('JSON-LD Markup', 'rankwoven-seo'); ?></th>
                    <td>
                        <label class="rankwoven-toggle-row">
                            <input type="checkbox" name="rankwoven_geo_settings[structured_data]" value="1" <?php checked(!empty($settings['structured_data'])); ?> />
                            <?php echo esc_html__('輸出 JSON-LD 結構化資料', 'rankwoven-seo'); ?>
                        </label>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><?php echo esc_html__('Entity Schema', 'rankwoven-seo'); ?></th>
                    <td>
                        <label class="rankwoven-toggle-row">
                            <input type="checkbox" name="rankwoven_geo_settings[entity_schema]" value="1" <?php checked(!empty($settings['entity_schema'])); ?> />
                            <?php echo esc_html__('輸出 Organization、WebSite 與 sameAs 實體資料', 'rankwoven-seo'); ?>
                        </label>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><?php echo esc_html__('Content Schema', 'rankwoven-seo'); ?></th>
                    <td>
                        <label class="rankwoven-toggle-row">
                            <input type="checkbox" name="rankwoven_geo_settings[content_schema]" value="1" <?php checked(!empty($settings['content_schema'])); ?> />
                            <?php echo esc_html__('輸出 Article、WebPage、Product 和 BreadcrumbList 資料', 'rankwoven-seo'); ?>
                        </label>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><?php echo esc_html__('Author & Date Markup', 'rankwoven-seo'); ?></th>
                    <td>
                        <label class="rankwoven-toggle-row">
                            <input type="checkbox" name="rankwoven_geo_settings[author_date_schema]" value="1" <?php checked(!empty($settings['author_date_schema'])); ?> />
                            <?php echo esc_html__('在文章結構化資料中加入作者、發佈日期與更新日期', 'rankwoven-seo'); ?>
                        </label>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><label for="rankwoven_geo_organization_name"><?php echo esc_html__('Organization Name', 'rankwoven-seo'); ?></label></th>
                    <td>
                        <input id="rankwoven_geo_organization_name" name="rankwoven_geo_settings[organization_name]" type="text" class="regular-text" value="<?php echo esc_attr((string) $settings['organization_name']); ?>" />
                    </td>
                </tr>
                <tr>
                    <th scope="row"><label for="rankwoven_geo_organization_description"><?php echo esc_html__('Organization Description', 'rankwoven-seo'); ?></label></th>
                    <td>
                        <textarea id="rankwoven_geo_organization_description" name="rankwoven_geo_settings[organization_description]" class="large-text" rows="3"><?php echo esc_textarea((string) $settings['organization_description']); ?></textarea>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><label for="rankwoven_geo_organization_logo"><?php echo esc_html__('Organization Logo URL', 'rankwoven-seo'); ?></label></th>
                    <td>
                        <input id="rankwoven_geo_organization_logo" name="rankwoven_geo_settings[organization_logo]" type="url" class="regular-text" value="<?php echo esc_attr((string) $settings['organization_logo']); ?>" placeholder="https://example.com/logo.png" />
                    </td>
                </tr>
                <tr>
                    <th scope="row"><label for="rankwoven_geo_organization_same_as"><?php echo esc_html__('sameAs 社交連結', 'rankwoven-seo'); ?></label></th>
                    <td>
                        <textarea id="rankwoven_geo_organization_same_as" name="rankwoven_geo_settings[organization_same_as]" class="large-text code" rows="4" placeholder="https://www.linkedin.com/company/example/"><?php echo esc_textarea(implode("\n", $settings['organization_same_as'])); ?></textarea>
                        <p class="description"><?php echo esc_html__('每行一個官方社交或品牌頁面 URL，只接受 http 或 https 地址。', 'rankwoven-seo'); ?></p>
                    </td>
                </tr>
            </table>

            <?php submit_button(__('保存 GEO 設定', 'rankwoven-seo')); ?>
        </form>
        <?php
    }

    private function render_search_engine_submission_links(string $sitemap_url): void
    {
        $search_engines = $this->get_search_engine_submission_links($sitemap_url);
        ?>
        <section class="rankwoven-search-engine-submissions" aria-labelledby="rankwoven-search-engine-submissions-title">
            <div class="rankwoven-section-heading">
                <span class="rankwoven-eyebrow"><?php echo esc_html__('Search Discovery', 'rankwoven-seo'); ?></span>
                <h3 id="rankwoven-search-engine-submissions-title"><?php echo esc_html__('提交 Sitemap 到搜尋引擎', 'rankwoven-seo'); ?></h3>
                <p><?php echo esc_html__('先生成並確認 sitemap.xml，再按需要開啟各搜尋引擎的官方站長工具。需要驗證網站所有權的服務，會在其平台內要求登入及完成驗證。', 'rankwoven-seo'); ?></p>
            </div>
            <div class="rankwoven-search-engine-grid">
                <?php foreach ($search_engines as $engine) : ?>
                    <article class="rankwoven-search-engine-card">
                        <div>
                            <h4><?php echo esc_html((string) $engine['name']); ?></h4>
                            <p><?php echo esc_html((string) $engine['description']); ?></p>
                        </div>
                        <a
                            class="rankwoven-external-link"
                            href="<?php echo esc_url((string) $engine['url']); ?>"
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="<?php echo esc_attr(sprintf(__('在 %s 開啟官方入口', 'rankwoven-seo'), (string) $engine['name'])); ?>"
                        >
                            <span aria-hidden="true">&#8599;</span>
                            <?php echo esc_html__('開啟', 'rankwoven-seo'); ?>
                        </a>
                    </article>
                <?php endforeach; ?>
            </div>
            <p class="description">
                <?php echo esc_html__('提示：Yahoo、DuckDuckGo、Ask、AOL 和 Qwant 沒有穩定的獨立 Sitemap 提交表單；可透過 Bing Webmaster Tools、robots.txt 或其官方抓取／收錄入口發現內容。', 'rankwoven-seo'); ?>
            </p>
        </section>
        <?php
    }

    private function get_search_engine_submission_links(string $sitemap_url): array
    {
        $encoded_site_url = rawurlencode(home_url('/'));
        $encoded_sitemap_url = rawurlencode($sitemap_url);

        return [
            [
                'name' => 'Google',
                'url' => 'https://search.google.com/search-console/sitemaps?resource_id=' . $encoded_site_url,
                'description' => __('Search Console Sitemap 報告；需登入並驗證網站。', 'rankwoven-seo')
            ],
            [
                'name' => 'Bing',
                'url' => 'https://www.bing.com/webmasters/sitemaps',
                'description' => __('Bing Webmaster Tools Sitemap 提交工具。', 'rankwoven-seo')
            ],
            [
                'name' => 'Yahoo',
                'url' => 'https://www.bing.com/webmasters/sitemaps',
                'description' => __('Yahoo 搜尋收錄主要透過 Bing Webmaster Tools 管理。', 'rankwoven-seo')
            ],
            [
                'name' => 'Baidu',
                'url' => 'https://ziyuan.baidu.com/site/index',
                'description' => __('百度站長平台網站管理及 Sitemap 提交入口。', 'rankwoven-seo')
            ],
            [
                'name' => 'Yandex',
                'url' => 'https://webmaster.yandex.com/sites/',
                'description' => __('Yandex Webmaster 網站及 Sitemap 管理入口。', 'rankwoven-seo')
            ],
            [
                'name' => 'DuckDuckGo',
                'url' => 'https://www.bing.com/webmasters/sitemaps',
                'description' => __('沒有獨立 Sitemap 表單；可透過 Bing 及公開 Sitemap 發現。', 'rankwoven-seo')
            ],
            [
                'name' => 'Ask',
                'url' => 'https://www.bing.com/webmasters/sitemaps',
                'description' => __('沒有穩定的獨立提交工具；可透過 Bing 公開 Sitemap 發現。', 'rankwoven-seo')
            ],
            [
                'name' => 'AOL',
                'url' => 'https://www.bing.com/webmasters/sitemaps',
                'description' => __('沒有穩定的獨立提交工具；可透過 Bing 公開 Sitemap 發現。', 'rankwoven-seo')
            ],
            [
                'name' => 'Naver',
                'url' => 'https://searchadvisor.naver.com/',
                'description' => __('Naver Search Advisor 的 Sitemap／RSS 提交入口。', 'rankwoven-seo')
            ],
            [
                'name' => 'Qwant',
                'url' => 'https://help.qwant.com/en/docs/qwant-search/survey-monkey/how-to-get-my-website-listed-on-qwant/',
                'description' => __('Qwant 官方收錄說明及網站回報入口。', 'rankwoven-seo')
            ],
            [
                'name' => 'Sogou',
                'url' => 'https://zhanzhang.sogou.com/',
                'description' => __('搜狗站長平台網站管理入口。', 'rankwoven-seo')
            ],
            [
                'name' => 'Brave',
                'url' => 'https://search.brave.com/submit-url?url=' . $encoded_sitemap_url,
                'description' => __('Brave Search 官方 URL 提交入口；可提交 Sitemap URL。', 'rankwoven-seo')
            ]
        ];
    }

    private function render_rss_sitemap_page(): void
    {
        $settings = $this->get_rss_settings();
        $post_types = $this->get_llms_public_post_types();
        $rss_url = $this->get_rss_sitemap_url();
        $selected_post_types = $settings['post_types'];
        $all_post_types_selected = empty($selected_post_types);
        ?>
        <h2><?php echo esc_html__('RSS Sitemap', 'rankwoven-seo'); ?></h2>
        <p>
            <?php echo esc_html__('此選項會生成獨立 RSS Sitemap，供 Google、Bing 和支援 RSS Sitemap 的搜尋引擎提交。它只包含網站最新內容，不是全部內容的完整 Sitemap。', 'rankwoven-seo'); ?>
        </p>
        <p>
            <code><?php echo esc_html($rss_url); ?></code>
            <a href="<?php echo esc_url($rss_url); ?>" target="_blank" rel="noopener noreferrer" style="margin-left:12px;">
                <?php echo esc_html__('開啟 RSS Sitemap', 'rankwoven-seo'); ?>
            </a>
        </p>

        <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
            <?php wp_nonce_field('rankwoven_save_settings'); ?>
            <input type="hidden" name="action" value="rankwoven_save_settings" />
            <input type="hidden" name="rankwoven_settings_scope" value="rss_sitemap" />
            <table class="form-table" role="presentation">
                <tr>
                    <th scope="row"><?php echo esc_html__('啟用 RSS Sitemap', 'rankwoven-seo'); ?></th>
                    <td>
                        <label>
                            <input type="checkbox" name="rankwoven_rss_settings[enabled]" value="1" <?php checked($settings['enabled']); ?> />
                            <?php echo esc_html__('啟用 RSS Sitemap', 'rankwoven-seo'); ?>
                        </label>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><label for="rankwoven_rss_posts_per_page"><?php echo esc_html__('貼文數量', 'rankwoven-seo'); ?></label></th>
                    <td>
                        <input id="rankwoven_rss_posts_per_page" name="rankwoven_rss_settings[posts_per_page]" type="number" class="small-text" min="1" max="500" value="<?php echo esc_attr((string) $settings['posts_per_page']); ?>" />
                        <p class="description"><?php echo esc_html__('RSS Sitemap 會輸出最新更新內容；建議使用 50 篇以內。', 'rankwoven-seo'); ?></p>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><?php echo esc_html__('Post Types', 'rankwoven-seo'); ?></th>
                    <td>
                        <?php if (empty($post_types)) : ?>
                            <p class="description"><?php echo esc_html__('目前沒有可用的公開文章類型。', 'rankwoven-seo'); ?></p>
                        <?php else : ?>
                            <?php foreach ($post_types as $post_type => $post_type_object) : ?>
                                <label style="display:block;margin-bottom:6px;">
                                    <input type="checkbox" name="rankwoven_rss_settings[post_types][]" value="<?php echo esc_attr($post_type); ?>" <?php checked($all_post_types_selected || in_array($post_type, $selected_post_types, true)); ?> />
                                    <?php echo esc_html((string) ($post_type_object->labels->name ?? $post_type)); ?>
                                    <code><?php echo esc_html($post_type); ?></code>
                                </label>
                            <?php endforeach; ?>
                            <p class="description"><?php echo esc_html__('全部勾選時會保存為預設範圍；輸出僅包含已發布且可公開訪問的內容。', 'rankwoven-seo'); ?></p>
                        <?php endif; ?>
                    </td>
                </tr>
            </table>
            <?php submit_button(__('保存 RSS Sitemap 設定', 'rankwoven-seo')); ?>
        </form>
        <?php
    }

    private function render_llms_txt_page(): void
    {
        $settings = $this->get_llms_settings();
        $post_types = $this->get_llms_public_post_types();
        $taxonomies = $this->get_llms_public_taxonomies();
        $llms_url = home_url('/llms.txt');
        $llms_full_url = home_url('/llms-full.txt');
        $selected_post_types = $settings['post_types'];
        $selected_taxonomies = $settings['taxonomies'];
        $all_post_types_selected = empty($selected_post_types);
        $all_taxonomies_selected = empty($selected_taxonomies);
        ?>
        <h2><?php echo esc_html__('LLMs.txt 設定', 'rankwoven-seo'); ?></h2>
        <p>
            <?php echo esc_html__('生成面向大型語言模型的網站摘要文件。預設關閉，啟用後才會公開輸出網站內容。', 'rankwoven-seo'); ?>
        </p>
        <p>
            <code><?php echo esc_html($llms_url); ?></code>
            <a href="<?php echo esc_url($llms_url); ?>" target="_blank" rel="noopener noreferrer" style="margin-left:12px;">
                <?php echo esc_html__('開啟 llms.txt', 'rankwoven-seo'); ?>
            </a>
            <br />
            <code><?php echo esc_html($llms_full_url); ?></code>
            <a href="<?php echo esc_url($llms_full_url); ?>" target="_blank" rel="noopener noreferrer" style="margin-left:12px;">
                <?php echo esc_html__('開啟 llms-full.txt', 'rankwoven-seo'); ?>
            </a>
        </p>
        <?php if ($this->has_physical_llms_file('llms.txt') || $this->has_physical_llms_file('llms-full.txt')) : ?>
            <div class="notice notice-warning inline">
                <p>
                    <?php echo esc_html__('偵測到網站根目錄存在實體 llms.txt 文件。部分主機會優先輸出實體文件，令這裡的動態設定不生效；如保存後前台未變化，請檢查並移除或更新實體文件。', 'rankwoven-seo'); ?>
                </p>
            </div>
        <?php endif; ?>

        <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
            <?php wp_nonce_field('rankwoven_save_settings'); ?>
            <input type="hidden" name="action" value="rankwoven_save_settings" />
            <input type="hidden" name="rankwoven_settings_scope" value="llms_txt" />
            <table class="form-table" role="presentation">
                <tr>
                    <th scope="row"><?php echo esc_html__('輸出文件', 'rankwoven-seo'); ?></th>
                    <td>
                        <label>
                            <input type="checkbox" name="rankwoven_llms_settings[enabled]" value="1" <?php checked($settings['enabled']); ?> />
                            <?php echo esc_html__('啟用 llms.txt', 'rankwoven-seo'); ?>
                        </label>
                        <br />
                        <label>
                            <input type="checkbox" name="rankwoven_llms_settings[full_enabled]" value="1" <?php checked($settings['full_enabled']); ?> />
                            <?php echo esc_html__('啟用 llms-full.txt（包含文章正文）', 'rankwoven-seo'); ?>
                        </label>
                        <p class="description">
                            <?php echo esc_html__('llms-full.txt 需要同時啟用 llms.txt；關閉主開關時兩個文件都不會輸出。', 'rankwoven-seo'); ?>
                        </p>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><?php echo esc_html__('Markdown 轉換', 'rankwoven-seo'); ?></th>
                    <td>
                        <label>
                            <input type="checkbox" name="rankwoven_llms_settings[convert_posts_to_markdown]" value="1" <?php checked($settings['convert_posts_to_markdown']); ?> />
                            <?php echo esc_html__('為公開文章提供 .md 地址', 'rankwoven-seo'); ?>
                        </label>
                        <p class="description">
                            <?php echo esc_html__('啟用後，可在文章固定連結後追加 .md 獲取 Markdown 內容，例如 /sample-post.md。', 'rankwoven-seo'); ?>
                        </p>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><label for="rankwoven_llms_title"><?php echo esc_html__('標題', 'rankwoven-seo'); ?></label></th>
                    <td>
                        <input id="rankwoven_llms_title" name="rankwoven_llms_settings[title]" type="text" class="regular-text" value="<?php echo esc_attr($settings['title']); ?>" />
                        <p class="description"><?php echo esc_html__('支援 {{site_title}}、{{site_description}}、{{site_url}} 佔位符。', 'rankwoven-seo'); ?></p>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><label for="rankwoven_llms_description"><?php echo esc_html__('描述', 'rankwoven-seo'); ?></label></th>
                    <td>
                        <textarea id="rankwoven_llms_description" name="rankwoven_llms_settings[description]" class="large-text" rows="4"><?php echo esc_textarea($settings['description']); ?></textarea>
                        <p class="description"><?php echo esc_html__('支援 {{site_title}}、{{site_description}}、{{site_url}} 佔位符。', 'rankwoven-seo'); ?></p>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><label for="rankwoven_llms_urls_per_post_type"><?php echo esc_html__('每種文章類型的 URL 上限', 'rankwoven-seo'); ?></label></th>
                    <td>
                        <input id="rankwoven_llms_urls_per_post_type" name="rankwoven_llms_settings[urls_per_post_type]" type="number" class="small-text" min="1" max="10000" value="<?php echo esc_attr((string) $settings['urls_per_post_type']); ?>" />
                        <p class="description"><?php echo esc_html__('每種公開文章類型最多輸出多少條內容連結。', 'rankwoven-seo'); ?></p>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><label for="rankwoven_llms_urls_per_taxonomy"><?php echo esc_html__('每種分類法的 URL 上限', 'rankwoven-seo'); ?></label></th>
                    <td>
                        <input id="rankwoven_llms_urls_per_taxonomy" name="rankwoven_llms_settings[urls_per_taxonomy]" type="number" class="small-text" min="1" max="10000" value="<?php echo esc_attr((string) $settings['urls_per_taxonomy']); ?>" />
                        <p class="description"><?php echo esc_html__('每種公開分類法最多輸出多少條分類連結。', 'rankwoven-seo'); ?></p>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><?php echo esc_html__('文章类型', 'rankwoven-seo'); ?></th>
                    <td>
                        <?php if (empty($post_types)) : ?>
                            <p class="description"><?php echo esc_html__('目前沒有可用的公開文章類型。', 'rankwoven-seo'); ?></p>
                        <?php else : ?>
                            <?php foreach ($post_types as $post_type => $post_type_object) : ?>
                                <label style="display:block;margin-bottom:6px;">
                                    <input type="checkbox" name="rankwoven_llms_settings[post_types][]" value="<?php echo esc_attr($post_type); ?>" <?php checked($all_post_types_selected || in_array($post_type, $selected_post_types, true)); ?> />
                                    <?php echo esc_html((string) ($post_type_object->labels->name ?? $post_type)); ?>
                                    <code><?php echo esc_html($post_type); ?></code>
                                </label>
                            <?php endforeach; ?>
                            <p class="description"><?php echo esc_html__('全部勾選時會保存為預設範圍；輸出僅包含已發布且可公開訪問的內容。', 'rankwoven-seo'); ?></p>
                        <?php endif; ?>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><?php echo esc_html__('分类法', 'rankwoven-seo'); ?></th>
                    <td>
                        <?php if (empty($taxonomies)) : ?>
                            <p class="description"><?php echo esc_html__('目前沒有可用的公開分類法。', 'rankwoven-seo'); ?></p>
                        <?php else : ?>
                            <?php foreach ($taxonomies as $taxonomy => $taxonomy_object) : ?>
                                <label style="display:block;margin-bottom:6px;">
                                    <input type="checkbox" name="rankwoven_llms_settings[taxonomies][]" value="<?php echo esc_attr($taxonomy); ?>" <?php checked($all_taxonomies_selected || in_array($taxonomy, $selected_taxonomies, true)); ?> />
                                    <?php echo esc_html((string) ($taxonomy_object->labels->name ?? $taxonomy)); ?>
                                    <code><?php echo esc_html($taxonomy); ?></code>
                                </label>
                            <?php endforeach; ?>
                            <p class="description"><?php echo esc_html__('僅輸出有公開連結且至少關聯一篇已發布內容的分類項。', 'rankwoven-seo'); ?></p>
                        <?php endif; ?>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><label for="rankwoven_llms_excluded_posts"><?php echo esc_html__('排除文章 ID', 'rankwoven-seo'); ?></label></th>
                    <td>
                        <textarea id="rankwoven_llms_excluded_posts" name="rankwoven_llms_settings[excluded_posts]" class="large-text code" rows="3" placeholder="12, 34, 56"><?php echo esc_textarea(implode(', ', $settings['excluded_posts'])); ?></textarea>
                        <p class="description"><?php echo esc_html__('使用逗號或換行分隔 WordPress 文章、頁面或自訂文章 ID。', 'rankwoven-seo'); ?></p>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><label for="rankwoven_llms_excluded_terms"><?php echo esc_html__('排除分类项 ID', 'rankwoven-seo'); ?></label></th>
                    <td>
                        <textarea id="rankwoven_llms_excluded_terms" name="rankwoven_llms_settings[excluded_terms]" class="large-text code" rows="3" placeholder="12, 34, 56"><?php echo esc_textarea(implode(', ', $settings['excluded_terms'])); ?></textarea>
                        <p class="description"><?php echo esc_html__('使用逗號或換行分隔分類項 term ID。', 'rankwoven-seo'); ?></p>
                    </td>
                </tr>
            </table>
            <?php submit_button(__('保存 LLMs.txt 設定', 'rankwoven-seo')); ?>
        </form>
        <?php
    }

    private function render_image_attributes_page(): void
    {
        $settings = $this->get_image_attribute_settings();
        $profiles = $this->get_image_attribute_profiles();
        $first_attribute = (string) array_key_first($profiles);
        ?>
        <h2><?php echo esc_html__('Image Attribute Settings', 'rankwoven-seo'); ?></h2>
        <p>
            <?php echo esc_html__('Configure how AI-generated image context is formatted for each attribute. RankWoven generates the image title, alt text, caption, description, and filename from the surrounding post or page context first; these settings only control the final format.', 'rankwoven-seo'); ?>
        </p>
        <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
            <?php wp_nonce_field('rankwoven_save_image_attributes'); ?>
            <input type="hidden" name="action" value="rankwoven_save_image_attributes" />
            <div class="rankwoven-image-settings" data-rankwoven-image-settings>
                <div class="rankwoven-image-tabs" role="tablist" aria-label="<?php echo esc_attr__('Image attribute fields', 'rankwoven-seo'); ?>">
                    <?php foreach ($profiles as $attribute => $profile) : ?>
                        <button
                            type="button"
                            class="rankwoven-image-tab<?php echo $attribute === $first_attribute ? ' is-active' : ''; ?>"
                            role="tab"
                            aria-selected="<?php echo $attribute === $first_attribute ? 'true' : 'false'; ?>"
                            data-rankwoven-image-tab="<?php echo esc_attr($attribute); ?>"
                        >
                            <?php echo esc_html((string) $profile['label']); ?>
                        </button>
                    <?php endforeach; ?>
                </div>

                <?php foreach ($profiles as $attribute => $profile) : ?>
                    <?php
                    $rule = isset($settings['attributes'][$attribute]) && is_array($settings['attributes'][$attribute])
                        ? $settings['attributes'][$attribute]
                        : $this->get_image_attribute_rule($attribute, []);
                    ?>
                    <section
                        class="rankwoven-image-panel<?php echo $attribute === $first_attribute ? ' is-active' : ''; ?>"
                        data-rankwoven-image-panel="<?php echo esc_attr($attribute); ?>"
                        <?php echo $attribute === $first_attribute ? '' : 'hidden'; ?>
                    >
                        <?php $this->render_image_attribute_rule_panel($attribute, $profile, $rule); ?>
                    </section>
                <?php endforeach; ?>
            </div>

            <table class="form-table rankwoven-image-global-settings" role="presentation">
                <tr>
                    <th scope="row"><?php echo esc_html__('Basic SEO Settings', 'rankwoven-seo'); ?></th>
                    <td>
                        <label>
                            <input
                                type="checkbox"
                                name="rankwoven_image_attributes[insert_title_attribute]"
                                value="1"
                                <?php checked(!empty($settings['insert_title_attribute'])); ?>
                            />
                            <?php echo esc_html__('Insert image title into content HTML output', 'rankwoven-seo'); ?>
                        </label>
                        <p class="description">
                            <?php echo esc_html__('When enabled, RankWoven adds a title attribute to rendered image tags when a title is available.', 'rankwoven-seo'); ?>
                        </p>
                    </td>
                </tr>
            </table>
            <?php submit_button(__('Save Image Attribute Settings', 'rankwoven-seo')); ?>
        </form>
        <?php $this->render_image_attribute_settings_script(); ?>
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
            <?php echo esc_html__('Run the bulk updater to update existing image titles, captions, descriptions, and alternative text from AI-generated context, then apply your saved format rules.', 'rankwoven-seo'); ?>
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

    private function render_image_optimizer_page(): void
    {
        if ($this->image_optimizer instanceof RankWoven_Image_Optimizer) {
            $this->image_optimizer->admin_page();
            return;
        }

        echo '<div class="notice notice-error"><p>' . esc_html__('圖片優化模組未能載入。', 'rankwoven-seo') . '</p></div>';
    }

    private function render_image_convert_page(): void
    {
        if ($this->image_optimizer instanceof RankWoven_Image_Optimizer) {
            $this->image_optimizer->batch_convert_page();
            return;
        }

        echo '<div class="notice notice-error"><p>' . esc_html__('圖片優化模組未能載入。', 'rankwoven-seo') . '</p></div>';
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

        if ($scope === 'sitemap') {
            $robots_txt_content = $this->sanitize_robots_txt_content(wp_unslash($_POST['rankwoven_robots_txt_content'] ?? ''));
            if ($robots_txt_content === '') {
                delete_option(self::OPTION_ROBOTS_TXT_CONTENT);
            } else {
                update_option(self::OPTION_ROBOTS_TXT_CONTENT, $robots_txt_content);
            }

            delete_option(self::OPTION_LAST_ERROR);
            $this->redirect_with_status('robots_txt_saved', 'sitemap');
        }

        if ($scope === 'llms_txt') {
            $llms_settings = $this->sanitize_llms_settings(wp_unslash($_POST['rankwoven_llms_settings'] ?? []));
            update_option(self::OPTION_LLMS_SETTINGS, $llms_settings);
            delete_option(self::OPTION_LAST_ERROR);
            $this->redirect_with_status('llms_settings_saved', 'sitemap');
        }

        if ($scope === 'rss_sitemap') {
            $rss_settings = $this->sanitize_rss_settings(wp_unslash($_POST['rankwoven_rss_settings'] ?? []));
            update_option(self::OPTION_RSS_SETTINGS, $rss_settings);
            delete_option(self::OPTION_LAST_ERROR);
            $this->redirect_with_status('rss_sitemap_settings_saved', 'sitemap');
        }

        if ($scope === 'indexnow') {
            $indexnow_settings = $this->sanitize_indexnow_settings(wp_unslash($_POST['rankwoven_indexnow_settings'] ?? []));
            if (!empty($indexnow_settings['enabled']) && $indexnow_settings['key'] === '') {
                $indexnow_settings['key'] = $this->generate_indexnow_key();
            }
            update_option(self::OPTION_INDEXNOW_SETTINGS, $indexnow_settings);
            delete_option(self::OPTION_LAST_ERROR);
            $this->redirect_with_status('indexnow_settings_saved', 'sitemap');
        }

        if ($scope === 'geo') {
            $geo_settings = $this->sanitize_geo_settings(wp_unslash($_POST['rankwoven_geo_settings'] ?? []));
            update_option(self::OPTION_GEO_SETTINGS, $geo_settings);
            delete_option(self::OPTION_LAST_ERROR);
            $this->redirect_with_status('geo_settings_saved', 'geo');
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

    public function handle_submit_indexnow(): void
    {
        $this->assert_admin_action('rankwoven_submit_indexnow');

        $urls = preg_split('/\R/', (string) wp_unslash($_POST['rankwoven_indexnow_urls'] ?? '')) ?: [];
        $result = $this->submit_indexnow_urls($urls, 'manual');
        if (is_wp_error($result)) {
            update_option(self::OPTION_INDEXNOW_LAST_RESULT, [
                'submittedAt' => gmdate('c'),
                'status' => 'error',
                'urlCount' => 0,
                'message' => $result->get_error_message()
            ]);
            $this->redirect_with_status('indexnow_submit_failed', 'sitemap');
        }

        $this->redirect_with_status('indexnow_submitted', 'sitemap');
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

        $this->run_content_sync(false, 'connection');
        delete_option(self::OPTION_LAST_ERROR);
        $this->redirect_with_status('sync_completed');
    }

    public function handle_rescan_internal_links(): void
    {
        $this->assert_admin_action('rankwoven_rescan_internal_links');

        $this->run_content_sync(true, 'link_assistant');
        $audit_result = $this->request_saas_site_api('POST', 'audits');
        if (is_wp_error($audit_result)) {
            $this->redirect_with_status('internal_links_rescan_failed', 'link_assistant');
        }

        delete_option(self::OPTION_LAST_ERROR);
        $this->redirect_with_status('internal_links_rescan_completed', 'link_assistant');
    }

    private function run_content_sync(bool $force_full, string $failure_tab): array
    {
        $site_id = sanitize_text_field(get_option(self::OPTION_SITE_ID, ''));
        $site_token = sanitize_text_field(get_option(self::OPTION_SITE_TOKEN, ''));

        if ($site_id === '' || $site_token === '') {
            $this->redirect_with_status('missing_site_credentials', $failure_tab);
        }

        $sync_started_at = gmdate('c');
        $updated_after = $force_full ? '' : $this->get_incremental_updated_after();
        $task_response = $this->create_sync_task($site_id, $site_token, $sync_started_at, $updated_after);

        if (is_wp_error($task_response)) {
            $this->redirect_with_status('sync_failed', $failure_tab);
        }

        $task_body = $this->decode_response_body($task_response);
        $this->redirect_if_sync_response_failed($task_response, $task_body, $failure_tab);

        $sync_task_id = sanitize_text_field($task_body['data']['task']['id'] ?? '');
        if ($sync_task_id === '') {
            $this->redirect_with_status('sync_failed', $failure_tab);
        }

        $sync_summary = $this->sync_paginated_content_batches(
            $site_id,
            $site_token,
            $sync_task_id,
            $sync_started_at,
            $updated_after,
            $failure_tab
        );

        $sync_result = [
            'syncedAt' => gmdate('c'),
            'syncStartedAt' => $sync_started_at,
            'updatedAfter' => $updated_after,
            'syncMode' => $force_full ? 'rescan' : ($updated_after === '' ? 'full' : 'incremental'),
            'syncTaskId' => $sync_task_id,
            'articlesReceived' => (int) $sync_summary['articlesReceived'],
            'mediaReceived' => (int) $sync_summary['mediaReceived'],
            'articlePagesSynced' => (int) $sync_summary['articlePagesSynced'],
            'mediaPagesSynced' => (int) $sync_summary['mediaPagesSynced']
        ];

        update_option(self::OPTION_LAST_SYNC_RESULT, $sync_result);
        update_option(self::OPTION_LAST_TOKEN_USED_AT, gmdate('c'));

        return $sync_result;
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

    public function handle_apply_audit_issue(): void
    {
        $this->assert_admin_action('rankwoven_apply_audit_issue');

        $payload = [
            'target_type' => sanitize_key(wp_unslash($_POST['rankwoven_target_type'] ?? '')),
            'target_cms_id' => (int) wp_unslash($_POST['rankwoven_target_cms_id'] ?? 0),
            'field_name' => sanitize_text_field(wp_unslash($_POST['rankwoven_field_name'] ?? '')),
            'suggested_value' => sanitize_textarea_field(wp_unslash($_POST['rankwoven_suggested_value'] ?? ''))
        ];

        $result = $this->apply_audit_issue_payload($payload);
        if (is_wp_error($result)) {
            $this->redirect_with_status('audit_issue_apply_failed', 'seo_analysis');
        }

        delete_option(self::OPTION_LAST_ERROR);
        $this->redirect_with_status('audit_issue_applied', 'seo_analysis');
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

    public function handle_indexnow_post_save(int $post_id, WP_Post $post, bool $update): void
    {
        if (wp_is_post_revision($post_id) || (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE)) {
            return;
        }

        $settings = $this->get_indexnow_settings();
        if (empty($settings['enabled']) || empty($settings['auto_submit']) || $post->post_status !== 'publish' || !in_array($post->post_type, $this->get_supported_editor_post_types(), true)) {
            return;
        }

        $post_types = is_array($settings['post_types'] ?? null) ? $settings['post_types'] : [];
        if ($post_types !== [] && !in_array($post->post_type, $post_types, true)) {
            return;
        }

        $this->notify_indexnow_post($post_id, 'updated');
    }

    public function handle_indexnow_trashed_post(int $post_id): void
    {
        $this->notify_indexnow_post($post_id, 'deleted');
    }

    public function handle_indexnow_deleted_post(int $post_id): void
    {
        $this->notify_indexnow_post($post_id, 'deleted');
    }

    private function notify_indexnow_post(int $post_id, string $change_type): void
    {
        $settings = $this->get_indexnow_settings();
        if (empty($settings['enabled']) || empty($settings['auto_submit']) || empty($settings['key'])) {
            return;
        }

        $post = get_post($post_id);
        if (!($post instanceof WP_Post)) {
            return;
        }

        if (!in_array($post->post_type, $this->get_supported_editor_post_types(), true)) {
            return;
        }

        $post_types = is_array($settings['post_types'] ?? null) ? $settings['post_types'] : [];
        if ($post_types !== [] && !in_array($post->post_type, $post_types, true)) {
            return;
        }

        $url = get_permalink($post_id);
        if (!is_string($url) || $url === '') {
            return;
        }

        $lock_key = 'rankwoven_indexnow_' . md5($change_type . '|' . $url);
        if (get_transient($lock_key)) {
            return;
        }
        set_transient($lock_key, 1, 60);
        $this->submit_indexnow_urls([$url], $change_type);
    }

    private function submit_indexnow_urls(array $urls, string $source = 'manual')
    {
        $settings = $this->get_indexnow_settings();
        $key = (string) ($settings['key'] ?? '');
        if (empty($settings['enabled']) && $source === 'manual') {
            return new WP_Error('rankwoven_indexnow_disabled', __('請先啟用 IndexNow。', 'rankwoven-seo'));
        }
        if ($key === '') {
            return new WP_Error('rankwoven_indexnow_key_missing', __('IndexNow API Key 尚未設定，請先保存 IndexNow 設定。', 'rankwoven-seo'));
        }

        $host = strtolower((string) wp_parse_url(home_url('/'), PHP_URL_HOST));
        $normalized_urls = [];
        foreach ($urls as $url) {
            $url = esc_url_raw(trim((string) $url));
            $url_host = strtolower((string) wp_parse_url($url, PHP_URL_HOST));
            $scheme = strtolower((string) wp_parse_url($url, PHP_URL_SCHEME));
            if ($url === '' || !in_array($scheme, ['http', 'https'], true) || $url_host === '' || $url_host !== $host) {
                continue;
            }
            $normalized_urls[$url] = $url;
            if (count($normalized_urls) >= 10000) {
                break;
            }
        }

        if ($normalized_urls === []) {
            return new WP_Error('rankwoven_indexnow_urls_missing', __('沒有找到可提交的本站 URL。', 'rankwoven-seo'));
        }

        $response = wp_remote_post('https://api.indexnow.org/indexnow', [
            'timeout' => 8,
            'headers' => ['Content-Type' => 'application/json; charset=utf-8'],
            'body' => wp_json_encode([
                'host' => $host,
                'key' => $key,
                'keyLocation' => $this->get_indexnow_key_url(),
                'urlList' => array_values($normalized_urls)
            ])
        ]);

        if (is_wp_error($response)) {
            $error = new WP_Error('rankwoven_indexnow_request_failed', $response->get_error_message());
            update_option(self::OPTION_INDEXNOW_LAST_RESULT, [
                'submittedAt' => gmdate('c'),
                'status' => 'error',
                'urlCount' => count($normalized_urls),
                'message' => $error->get_error_message(),
                'source' => $source
            ]);
            return $error;
        }

        $status_code = (int) wp_remote_retrieve_response_code($response);
        $success = $status_code >= 200 && $status_code < 300;
        $message = $success
            ? sprintf(__('IndexNow 已接受 %d 個 URL。', 'rankwoven-seo'), count($normalized_urls))
            : sprintf(__('IndexNow 回應 HTTP %d，請檢查 API Key 文件及網站 URL。', 'rankwoven-seo'), $status_code);
        update_option(self::OPTION_INDEXNOW_LAST_RESULT, [
            'submittedAt' => gmdate('c'),
            'status' => $success ? 'success' : 'error',
            'statusCode' => $status_code,
            'urlCount' => count($normalized_urls),
            'message' => $message,
            'source' => $source
        ]);

        return $success
            ? ['statusCode' => $status_code, 'urlCount' => count($normalized_urls)]
            : new WP_Error('rankwoven_indexnow_api_error', $message);
    }

    public function filter_uploaded_image_filename(string $filename): string
    {
        $extension = strtolower((string) pathinfo($filename, PATHINFO_EXTENSION));
        if (!in_array($extension, ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'svg'], true)) {
            return $filename;
        }

        $settings = $this->get_image_attribute_settings();
        $filename_rule = isset($settings['attributes']['filename']) && is_array($settings['attributes']['filename'])
            ? $settings['attributes']['filename']
            : $this->get_image_attribute_rule('filename', []);
        if (empty($filename_rule['enabled'])) {
            return $filename;
        }

        if ($this->get_upload_context_post_id() <= 0) {
            return $filename;
        }

        $generated_filename = $this->render_image_attribute_text_from_values(
            $this->generate_image_attribute_context_values_for_upload($filename),
            'filename'
        );
        if ($generated_filename === '') {
            return $filename;
        }

        $slug = sanitize_title($generated_filename);
        return $slug !== '' ? $slug . '.' . $extension : $filename;
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
        string $updated_after,
        string $failure_tab = 'connection'
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
                $this->redirect_with_status('sync_failed', $failure_tab);
            }

            $body = $this->decode_response_body($response);
            $this->redirect_if_sync_response_failed($response, $body, $failure_tab);

            $articles_received = (int) ($body['data']['task']['articlesReceived'] ?? ($articles_received + $article_count));
            $media_received = (int) ($body['data']['task']['mediaReceived'] ?? ($media_received + $media_count));

            if ($is_final_batch) {
                break;
            }

            $page++;
        }

        if ($page > self::SYNC_MAX_BATCH_PAGES) {
            $this->redirect_with_status('sync_failed', $failure_tab);
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

    private function redirect_if_sync_response_failed($response, array $body, string $failure_tab = 'connection'): void
    {
        if (($body['success'] ?? false)) {
            return;
        }

        $error_code = $body['error']['code'] ?? '';
        if (wp_remote_retrieve_response_code($response) === 401 || $error_code === 'SITE_TOKEN_INVALID') {
            $this->redirect_with_status('site_token_invalid', $failure_tab);
        }

        $this->redirect_with_status('sync_failed', $failure_tab);
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

    private function get_supported_content_post_types(): array
    {
        return array_values(array_filter(['post', 'page', 'portfolio', 'product'], 'post_type_exists'));
    }

    private function normalize_synced_post_type(string $post_type): string
    {
        return in_array($post_type, ['post', 'page', 'portfolio', 'product'], true) ? $post_type : 'post';
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
            'type' => $this->normalize_synced_post_type($post->post_type),
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
        $content = html_entity_decode($content, ENT_QUOTES | ENT_HTML5, get_bloginfo('charset') ?: 'UTF-8');
        $content = preg_replace('/<script\b[^>]*>.*?<\/script>|<style\b[^>]*>.*?<\/style>/is', ' ', $content) ?? $content;
        $content = strip_shortcodes($content);
        $content = $this->strip_shortcode_markup($content);
        $content = wp_strip_all_tags($content);
        $content = preg_replace('/#(?:post_excerpt|post_content)\b/iu', ' ', $content) ?? $content;
        $content = preg_replace('/\s+/u', ' ', $content) ?? $content;

        return trim($content);
    }

    /**
     * Remove generated table-of-contents markup without removing article headings.
     */
    private function strip_llms_navigation_markup(string $content): string
    {
        $opening_pattern = '/<div\b(?=[^>]*(?:\bid\s*=\s*["\'][^"\']*(?:ez-toc-container|toc_container)[^"\']*["\']|\bclass\s*=\s*["\'][^"\']*\b(?:ez-toc|toc-container|toc_container)\b[^"\']*["\']))[^>]*>/iu';
        $tag_pattern = '/<\/?div\b[^>]*>/iu';

        while (preg_match($opening_pattern, $content, $opening_match, PREG_OFFSET_CAPTURE) === 1) {
            $start = (int) $opening_match[0][1];
            $opening_end = $start + strlen((string) $opening_match[0][0]);
            $depth = 1;
            $closing_end = null;

            preg_match_all($tag_pattern, $content, $tags, PREG_OFFSET_CAPTURE, $opening_end);
            foreach ($tags[0] as $tag_match) {
                $tag = (string) $tag_match[0];
                if (str_starts_with($tag, '</')) {
                    $depth--;
                    if ($depth === 0) {
                        $closing_end = (int) $tag_match[1] + strlen($tag);
                        break;
                    }
                } elseif (!str_ends_with(trim($tag), '/>')) {
                    $depth++;
                }
            }

            if ($closing_end === null) {
                break;
            }

            $content = substr($content, 0, $start) . substr($content, $closing_end);
        }

        return $content;
    }

    private function get_llms_rendered_content(WP_Post $post): string
    {
        $content = (string) apply_filters('the_content', (string) $post->post_content);
        $content = $this->strip_llms_navigation_markup($content);
        return $this->strip_shortcode_markup($content);
    }

    private function get_llms_plain_text_content(WP_Post $post): string
    {
        return $this->extract_plain_text_content($this->get_llms_rendered_content($post));
    }

    private function get_llms_post_excerpt(WP_Post $post): string
    {
        $plain_content = $this->get_llms_plain_text_content($post);
        $fallback = $plain_content !== '' ? wp_trim_words($plain_content, 40, '') : '';
        $description = $this->normalize_llms_inline_text($this->get_post_meta_description($post, $fallback));

        if ($description === '' || $this->is_llms_navigation_excerpt($description)) {
            return $this->normalize_llms_inline_text($fallback);
        }

        return $description;
    }

    private function is_llms_navigation_excerpt(string $value): bool
    {
        return preg_match('/^\s*(?:內容目錄|table\s+of\s+contents)\b/iu', $value) === 1;
    }

    public function filter_llms_excerpt_content(string $content): string
    {
        if (!$this->is_excerpt_generation_context()) {
            return $content;
        }

        $content = $this->strip_llms_navigation_markup($content);
        return $this->strip_shortcode_markup($content);
    }

    private function is_excerpt_generation_context(): bool
    {
        foreach (debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS, 12) as $frame) {
            if (($frame['function'] ?? '') === 'wp_trim_excerpt') {
                return true;
            }
        }

        return false;
    }

    private function strip_shortcode_markup(string $content): string
    {
        return preg_replace(
            '/\[\/[a-zA-Z][\w-]*\]|\[(?:\/?)((?:vc|wpb|et|fusion|elementor|su)[\w-]*|[a-zA-Z][\w-]*\s+[^\]]+)\]/iu',
            ' ',
            $content
        ) ?? $content;
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

        if ($page === 'rankwoven-seo-llms-txt') {
            return 'sitemap';
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
        $saved_settings = get_option(self::OPTION_IMAGE_ATTRIBUTE_SETTINGS, []);
        $saved_settings = is_array($saved_settings) ? $saved_settings : [];
        $settings = [
            'insert_title_attribute' => array_key_exists('insert_title_attribute', $saved_settings)
                ? (bool) $saved_settings['insert_title_attribute']
                : true,
            'attributes' => []
        ];

        foreach (array_keys($this->get_image_attribute_profiles()) as $attribute) {
            $settings['attributes'][$attribute] = $this->get_image_attribute_rule($attribute, $saved_settings);
        }

        return $settings;
    }

    private function sanitize_image_attribute_settings(array $input): array
    {
        $posted_settings = isset($input['rankwoven_image_attributes']) && is_array($input['rankwoven_image_attributes'])
            ? $input['rankwoven_image_attributes']
            : [];
        $sanitized = [
            'insert_title_attribute' => !empty($posted_settings['insert_title_attribute']),
            'attributes' => []
        ];
        $casing_modes = ['disabled', 'lower', 'title', 'sentence'];

        foreach (array_keys($this->get_image_attribute_profiles()) as $attribute) {
            $posted_rule = isset($posted_settings['attributes'][$attribute]) && is_array($posted_settings['attributes'][$attribute])
                ? $posted_settings['attributes'][$attribute]
                : [];
            $format = sanitize_text_field((string) ($posted_rule['format'] ?? '{{image_title}}'));
            $casing = sanitize_key((string) ($posted_rule['casing'] ?? 'title'));

            $sanitized['attributes'][$attribute] = [
                'enabled' => !empty($posted_rule['enabled']),
                'format' => $format !== '' ? $format : '{{image_title}}',
                'strip_punctuation' => !empty($posted_rule['strip_punctuation']),
                'space_hyphen' => !empty($posted_rule['space_hyphen']),
                'space_underscore' => !empty($posted_rule['space_underscore']),
                'strip_period' => !empty($posted_rule['strip_period']),
                'strip_comma' => !empty($posted_rule['strip_comma']),
                'strip_numbers' => !empty($posted_rule['strip_numbers']),
                'strip_plus' => !empty($posted_rule['strip_plus']),
                'strip_ampersand' => !empty($posted_rule['strip_ampersand']),
                'words_to_strip' => sanitize_textarea_field((string) ($posted_rule['words_to_strip'] ?? '')),
                'casing' => in_array($casing, $casing_modes, true) ? $casing : 'title'
            ];
        }

        return $sanitized;
    }

    private function get_image_attribute_profiles(): array
    {
        return [
            'alt_text' => [
                'label' => __('Alt Tag', 'rankwoven-seo'),
                'format_label' => __('Alt Tag Format', 'rankwoven-seo'),
                'enable_label' => __('Autogenerate Alt Text on Upload', 'rankwoven-seo'),
                'description' => __('AI generates the alternative text from the surrounding content first. This format only controls how that generated value is written to WordPress.', 'rankwoven-seo'),
                'legacy_enabled_key' => 'set_alt_text',
                'default_enabled' => true,
                'default_format' => '{{alt_text}}'
            ],
            'title' => [
                'label' => __('Title', 'rankwoven-seo'),
                'format_label' => __('Title Format', 'rankwoven-seo'),
                'enable_label' => __('Autogenerate Title on Upload', 'rankwoven-seo'),
                'description' => __('AI generates the WordPress media title from the surrounding content first. This format only controls the final title pattern.', 'rankwoven-seo'),
                'legacy_enabled_key' => 'set_title',
                'default_enabled' => true,
                'default_format' => '{{image_title}} {{separator}} {{site_title}}'
            ],
            'caption' => [
                'label' => __('Caption', 'rankwoven-seo'),
                'format_label' => __('Caption Format', 'rankwoven-seo'),
                'enable_label' => __('Autogenerate Caption on Upload', 'rankwoven-seo'),
                'description' => __('AI generates the caption from the related post, page, product, or portfolio context first. This format only controls the final caption pattern.', 'rankwoven-seo'),
                'legacy_enabled_key' => 'set_caption',
                'default_enabled' => true,
                'default_format' => '{{caption}}'
            ],
            'description' => [
                'label' => __('Description', 'rankwoven-seo'),
                'format_label' => __('Description Format', 'rankwoven-seo'),
                'enable_label' => __('Autogenerate Description on Upload', 'rankwoven-seo'),
                'description' => __('AI generates the attachment description from the surrounding content first. This format only controls the final description pattern.', 'rankwoven-seo'),
                'legacy_enabled_key' => 'set_description',
                'default_enabled' => true,
                'default_format' => '{{description}}'
            ],
            'filename' => [
                'label' => __('Filename', 'rankwoven-seo'),
                'format_label' => __('Filename Format', 'rankwoven-seo'),
                'enable_label' => __('Clean Filename on Upload', 'rankwoven-seo'),
                'description' => __('AI generates a context-aware filename before WordPress stores the upload. This format only controls the final filename pattern; existing files are not renamed by the bulk updater.', 'rankwoven-seo'),
                'legacy_enabled_key' => '',
                'default_enabled' => false,
                'default_format' => '{{filename}}'
            ]
        ];
    }

    private function get_image_attribute_rule(string $attribute, array $saved_settings): array
    {
        $profiles = $this->get_image_attribute_profiles();
        $profile = $profiles[$attribute] ?? $profiles['alt_text'];
        $saved_rule = isset($saved_settings['attributes'][$attribute]) && is_array($saved_settings['attributes'][$attribute])
            ? $saved_settings['attributes'][$attribute]
            : [];
        $legacy_enabled_key = (string) ($profile['legacy_enabled_key'] ?? '');

        return [
            'enabled' => array_key_exists('enabled', $saved_rule)
                ? (bool) $saved_rule['enabled']
                : ($legacy_enabled_key !== '' && array_key_exists($legacy_enabled_key, $saved_settings)
                    ? (bool) $saved_settings[$legacy_enabled_key]
                    : (bool) $profile['default_enabled']),
            'format' => sanitize_text_field((string) ($saved_rule['format'] ?? $profile['default_format'])),
            'strip_punctuation' => array_key_exists('strip_punctuation', $saved_rule) ? (bool) $saved_rule['strip_punctuation'] : true,
            'space_hyphen' => array_key_exists('space_hyphen', $saved_rule)
                ? (bool) $saved_rule['space_hyphen']
                : (bool) ($saved_settings['remove_hyphen'] ?? true),
            'space_underscore' => array_key_exists('space_underscore', $saved_rule)
                ? (bool) $saved_rule['space_underscore']
                : (bool) ($saved_settings['remove_underscore'] ?? true),
            'strip_period' => array_key_exists('strip_period', $saved_rule)
                ? (bool) $saved_rule['strip_period']
                : (bool) ($saved_settings['remove_period'] ?? false),
            'strip_comma' => array_key_exists('strip_comma', $saved_rule)
                ? (bool) $saved_rule['strip_comma']
                : (bool) ($saved_settings['remove_comma'] ?? false),
            'strip_numbers' => array_key_exists('strip_numbers', $saved_rule)
                ? (bool) $saved_rule['strip_numbers']
                : (bool) ($saved_settings['remove_numbers'] ?? false),
            'strip_plus' => !empty($saved_rule['strip_plus']),
            'strip_ampersand' => !empty($saved_rule['strip_ampersand']),
            'words_to_strip' => sanitize_textarea_field((string) ($saved_rule['words_to_strip'] ?? '')),
            'casing' => in_array((string) ($saved_rule['casing'] ?? 'title'), ['disabled', 'lower', 'title', 'sentence'], true)
                ? (string) ($saved_rule['casing'] ?? 'title')
                : 'title'
        ];
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

    private function render_image_attribute_rule_panel(string $attribute, array $profile, array $rule): void
    {
        $field_prefix = 'rankwoven_image_attributes[attributes][' . $attribute . ']';
        $tokens = [
            '{{image_title}}' => __('AI Image Title', 'rankwoven-seo'),
            '{{alt_text}}' => __('AI Alt Text', 'rankwoven-seo'),
            '{{caption}}' => __('AI Caption', 'rankwoven-seo'),
            '{{description}}' => __('AI Description', 'rankwoven-seo'),
            '{{filename}}' => __('AI Filename', 'rankwoven-seo'),
            '{{separator}}' => __('Separator', 'rankwoven-seo'),
            '{{site_title}}' => __('Site Title', 'rankwoven-seo'),
            '{{attachment_id}}' => __('Attachment ID', 'rankwoven-seo')
        ];
        ?>
        <div class="rankwoven-image-panel-intro">
            <h3><?php echo esc_html((string) $profile['label']); ?></h3>
            <p><?php echo esc_html((string) $profile['description']); ?></p>
        </div>
        <table class="form-table rankwoven-image-rule-table" role="presentation">
            <tr>
                <th scope="row"><?php echo esc_html((string) $profile['enable_label']); ?></th>
                <td>
                    <label class="rankwoven-toggle-row">
                        <input
                            type="checkbox"
                            name="<?php echo esc_attr($field_prefix); ?>[enabled]"
                            value="1"
                            <?php checked(!empty($rule['enabled'])); ?>
                        />
                        <?php echo esc_html__('Enabled', 'rankwoven-seo'); ?>
                    </label>
                    <?php if ($attribute === 'filename') : ?>
                        <p class="description">
                            <?php echo esc_html__('Filename cleanup only applies to new image uploads. Existing files are not renamed by the bulk updater.', 'rankwoven-seo'); ?>
                        </p>
                    <?php endif; ?>
                </td>
            </tr>
            <tr>
                <th scope="row"><?php echo esc_html((string) $profile['format_label']); ?></th>
                <td>
                    <p class="description">
                        <?php echo esc_html__('Click a tag to insert AI-generated context values into this final format. The tags are not copied from the original filename.', 'rankwoven-seo'); ?>
                    </p>
                    <div class="rankwoven-token-row">
                        <?php foreach ($tokens as $token => $label) : ?>
                            <button type="button" class="button rankwoven-token-button" data-rankwoven-token="<?php echo esc_attr($token); ?>">
                                + <?php echo esc_html($label); ?>
                            </button>
                        <?php endforeach; ?>
                    </div>
                    <input
                        type="text"
                        class="large-text rankwoven-format-input"
                        name="<?php echo esc_attr($field_prefix); ?>[format]"
                        value="<?php echo esc_attr((string) $rule['format']); ?>"
                        data-rankwoven-format-input
                    />
                </td>
            </tr>
            <tr>
                <th scope="row"><?php echo esc_html__('Strip Punctuation', 'rankwoven-seo'); ?></th>
                <td>
                    <label class="rankwoven-toggle-row">
                        <input
                            type="checkbox"
                            name="<?php echo esc_attr($field_prefix); ?>[strip_punctuation]"
                            value="1"
                            <?php checked(!empty($rule['strip_punctuation'])); ?>
                        />
                        <?php echo esc_html__('Enabled', 'rankwoven-seo'); ?>
                    </label>
                    <div class="rankwoven-checkbox-grid">
                        <?php $this->render_image_attribute_checkbox($field_prefix, $rule, 'space_hyphen', __('Convert dashes (-) to spaces', 'rankwoven-seo')); ?>
                        <?php $this->render_image_attribute_checkbox($field_prefix, $rule, 'space_underscore', __('Convert underscores (_) to spaces', 'rankwoven-seo')); ?>
                        <?php $this->render_image_attribute_checkbox($field_prefix, $rule, 'strip_period', __('Strip periods (.)', 'rankwoven-seo')); ?>
                        <?php $this->render_image_attribute_checkbox($field_prefix, $rule, 'strip_comma', __('Strip commas (,)', 'rankwoven-seo')); ?>
                        <?php $this->render_image_attribute_checkbox($field_prefix, $rule, 'strip_numbers', __('Strip numbers (0-9)', 'rankwoven-seo')); ?>
                        <?php $this->render_image_attribute_checkbox($field_prefix, $rule, 'strip_plus', __('Strip plus signs (+)', 'rankwoven-seo')); ?>
                        <?php $this->render_image_attribute_checkbox($field_prefix, $rule, 'strip_ampersand', __('Strip ampersands (&)', 'rankwoven-seo')); ?>
                    </div>
                </td>
            </tr>
            <tr>
                <th scope="row"><?php echo esc_html__('Casing', 'rankwoven-seo'); ?></th>
                <td>
                    <select name="<?php echo esc_attr($field_prefix); ?>[casing]">
                        <option value="disabled" <?php selected((string) $rule['casing'], 'disabled'); ?>><?php echo esc_html__('Disabled', 'rankwoven-seo'); ?></option>
                        <option value="lower" <?php selected((string) $rule['casing'], 'lower'); ?>><?php echo esc_html__('Lower Case', 'rankwoven-seo'); ?></option>
                        <option value="title" <?php selected((string) $rule['casing'], 'title'); ?>><?php echo esc_html__('Title Case', 'rankwoven-seo'); ?></option>
                        <option value="sentence" <?php selected((string) $rule['casing'], 'sentence'); ?>><?php echo esc_html__('Sentence Case', 'rankwoven-seo'); ?></option>
                    </select>
                    <p class="description">
                        <?php echo esc_html__('Choose which casing should be applied after cleanup.', 'rankwoven-seo'); ?>
                    </p>
                </td>
            </tr>
            <tr>
                <th scope="row"><?php echo esc_html__('Words to Strip', 'rankwoven-seo'); ?></th>
                <td>
                    <textarea
                        class="large-text"
                        rows="4"
                        name="<?php echo esc_attr($field_prefix); ?>[words_to_strip]"
                    ><?php echo esc_textarea((string) $rule['words_to_strip']); ?></textarea>
                    <p class="description">
                        <?php echo esc_html__('Add one word or phrase per line. Matching words are removed before casing is applied.', 'rankwoven-seo'); ?>
                    </p>
                </td>
            </tr>
        </table>
        <?php
    }

    private function render_image_attribute_checkbox(string $field_prefix, array $rule, string $key, string $label): void
    {
        ?>
        <label>
            <input
                type="checkbox"
                name="<?php echo esc_attr($field_prefix); ?>[<?php echo esc_attr($key); ?>]"
                value="1"
                <?php checked(!empty($rule[$key])); ?>
            />
            <?php echo esc_html($label); ?>
        </label>
        <?php
    }

    private function render_image_attribute_settings_script(): void
    {
        ?>
        <script>
        (() => {
            const root = document.querySelector('[data-rankwoven-image-settings]');
            if (!root) {
                return;
            }

            const activatePanel = (attribute) => {
                root.querySelectorAll('[data-rankwoven-image-tab]').forEach((tab) => {
                    const isActive = tab.dataset.rankwovenImageTab === attribute;
                    tab.classList.toggle('is-active', isActive);
                    tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
                });
                root.querySelectorAll('[data-rankwoven-image-panel]').forEach((panel) => {
                    const isActive = panel.dataset.rankwovenImagePanel === attribute;
                    panel.classList.toggle('is-active', isActive);
                    panel.hidden = !isActive;
                });
            };

            const insertToken = (input, token) => {
                const start = input.selectionStart ?? input.value.length;
                const end = input.selectionEnd ?? input.value.length;
                input.value = `${input.value.slice(0, start)}${token}${input.value.slice(end)}`;
                input.focus();
                input.setSelectionRange(start + token.length, start + token.length);
            };

            root.addEventListener('click', (event) => {
                const tab = event.target.closest('[data-rankwoven-image-tab]');
                if (tab) {
                    activatePanel(tab.dataset.rankwovenImageTab);
                    return;
                }

                const tokenButton = event.target.closest('[data-rankwoven-token]');
                if (!tokenButton) {
                    return;
                }

                const panel = tokenButton.closest('[data-rankwoven-image-panel]');
                const input = panel ? panel.querySelector('[data-rankwoven-format-input]') : null;
                if (input) {
                    insertToken(input, tokenButton.dataset.rankwovenToken);
                }
            });
        })();
        </script>
        <?php
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

        foreach ($this->get_image_attribute_profiles() as $attribute => $profile) {
            if (!empty($settings['attributes'][$attribute]['enabled'])) {
                $enabled_labels[] = (string) $profile['label'];
            }
        }

        if (!empty($settings['insert_title_attribute'])) {
            $enabled_labels[] = __('HTML title attribute', 'rankwoven-seo');
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

    private function get_rss_sitemap_url(): string
    {
        return home_url('/sitemap.rss');
    }

    private function get_rss_stylesheet_url(): string
    {
        return plugins_url('assets/rss-sitemap.xsl', __FILE__);
    }

    private function get_custom_robots_txt_content(): string
    {
        return $this->sanitize_robots_txt_content((string) get_option(self::OPTION_ROBOTS_TXT_CONTENT, ''));
    }

    private function sanitize_robots_txt_content($content): string
    {
        $content = is_string($content) ? wp_check_invalid_utf8($content) : '';
        $content = str_replace(["\r\n", "\r"], "\n", $content);
        $content = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $content) ?? $content;
        $lines = array_map(static fn ($line): string => rtrim((string) $line), explode("\n", $content));
        $content = trim(implode("\n", $lines));

        if (strlen($content) > 20000) {
            $content = substr($content, 0, 20000);
        }

        return $content;
    }

    private function has_physical_robots_txt_file(): bool
    {
        return file_exists(ABSPATH . 'robots.txt');
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

    private function build_rss_sitemap_xml(array $settings): string
    {
        $post_types = empty($settings['post_types'])
            ? array_keys($this->get_llms_public_post_types())
            : $settings['post_types'];
        $posts = [];
        if (!empty($post_types)) {
            $posts = get_posts([
                'post_type' => $post_types,
                'post_status' => 'publish',
                'posts_per_page' => (int) $settings['posts_per_page'],
                'orderby' => 'modified',
                'order' => 'DESC',
                'no_found_rows' => true,
                'ignore_sticky_posts' => true
            ]);
        }
        $posts = is_array($posts) ? $posts : [];
        $posts = array_values(array_filter($posts, static fn ($post): bool => $post instanceof WP_Post));
        $site_name = sanitize_text_field((string) get_bloginfo('name'));
        $site_description = sanitize_textarea_field((string) get_bloginfo('description'));
        $site_url = esc_url_raw(home_url('/'));
        $rss_url = esc_url_raw($this->get_rss_sitemap_url());
        $stylesheet_url = esc_url_raw($this->get_rss_stylesheet_url());
        $site_icon_url = function_exists('get_site_icon_url') ? esc_url_raw((string) get_site_icon_url(512)) : '';
        $lines = [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<?xml-stylesheet type="text/xsl" href="' . esc_url($stylesheet_url) . '"?>',
            '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">',
            '  <channel>',
            '    <title>' . esc_html($site_name) . '</title>',
            '    <link>' . esc_url($site_url) . '</link>',
            '    <description>' . esc_html($site_description) . '</description>',
            '    <atom:link href="' . esc_url($rss_url) . '" rel="self" type="application/rss+xml" />',
            '    <lastBuildDate>' . esc_html(gmdate('D, d M Y H:i:s +0000')) . '</lastBuildDate>'
        ];
        if ($site_icon_url !== '') {
            $lines[] = '    <image>';
            $lines[] = '      <url>' . esc_url($site_icon_url) . '</url>';
            $lines[] = '      <title>' . esc_html($site_name) . '</title>';
            $lines[] = '      <link>' . esc_url($site_url) . '</link>';
            $lines[] = '    </image>';
        }

        foreach ($posts as $post) {
            $permalink = get_permalink($post);
            if (!is_string($permalink) || $permalink === '') {
                continue;
            }

            $title = $this->normalize_llms_inline_text((string) get_the_title($post));
            $description = $this->get_llms_post_excerpt($post);
            $content = $this->get_llms_plain_text_content($post);
            $content = preg_replace('/(?:\*\*|__|`)/u', '', $content) ?? $content;
            $published_at = get_post_time('D, d M Y H:i:s +0000', true, $post);
            $preview_image = $this->get_post_preview_image($post);
            $lines[] = '    <item>';
            $lines[] = '      <title>' . esc_html($title !== '' ? $title : __('Untitled', 'rankwoven-seo')) . '</title>';
            $lines[] = '      <link>' . esc_url($permalink) . '</link>';
            $lines[] = '      <guid isPermaLink="true">' . esc_url($permalink) . '</guid>';
            if (is_string($published_at) && $published_at !== '') {
                $lines[] = '      <pubDate>' . esc_html($published_at) . '</pubDate>';
            }
            if ($preview_image['url'] !== '') {
                $lines[] = '      <enclosure url="' . esc_url($preview_image['url']) . '" length="0" type="image/*" />';
            }
            if ($description !== '') {
                $lines[] = '      <description><![CDATA[' . $this->escape_rss_cdata($description) . ']]></description>';
            }
            if ($content !== '') {
                $lines[] = '      <content:encoded><![CDATA[' . $this->escape_rss_cdata($content) . ']]></content:encoded>';
            }
            $lines[] = '    </item>';
        }

        $lines[] = '  </channel>';
        $lines[] = '</rss>';
        return implode("\n", $lines) . "\n";
    }

    private function escape_rss_cdata(string $value): string
    {
        return str_replace(']]>', ']]]]><![CDATA[>', $value);
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

    private function is_rss_sitemap_request(): bool
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
        return in_array($normalized_path, ['sitemap.rss', 'sitemap.latest.rss', 'rss-sitemap.xml'], true)
            || str_ends_with($normalized_path, '/sitemap.rss')
            || str_ends_with($normalized_path, '/sitemap.latest.rss')
            || str_ends_with($normalized_path, '/rss-sitemap.xml');
    }

    private function maybe_render_indexnow_key(): bool
    {
        if (!$this->is_indexnow_key_request()) {
            return false;
        }

        $key = (string) ($this->get_indexnow_settings()['key'] ?? '');
        if ($key === '') {
            return false;
        }

        nocache_headers();
        status_header(200);
        header('Content-Type: text/plain; charset=UTF-8');
        echo esc_html($key);
        exit;
    }

    private function is_indexnow_key_request(): bool
    {
        $key = (string) ($this->get_indexnow_settings()['key'] ?? '');
        if ($key === '') {
            return false;
        }

        $request_uri = sanitize_text_field((string) ($_SERVER['REQUEST_URI'] ?? ''));
        $path = wp_parse_url($request_uri, PHP_URL_PATH);
        if (!is_string($path) || $path === '') {
            return false;
        }

        return basename(rtrim($path, '/')) === $key . '.txt';
    }

    private function get_indexnow_key_url(): string
    {
        $key = (string) ($this->get_indexnow_settings()['key'] ?? '');
        return $key !== '' ? esc_url_raw(home_url('/' . rawurlencode($key) . '.txt')) : '';
    }

    private function get_geo_crawler_groups(): array
    {
        return [
            'training_crawlers' => [
                'label' => __('AI Training Crawlers', 'rankwoven-seo'),
                'description' => __('允許模型訓練爬蟲讀取公開內容，內容可能用於未來模型知識。', 'rankwoven-seo'),
                'user_agents' => ['GPTBot', 'Google-Extended', 'CCBot', 'ClaudeBot', 'Bytespider']
            ],
            'search_crawlers' => [
                'label' => __('AI Search Crawlers', 'rankwoven-seo'),
                'description' => __('允許需要引用來源的 AI 搜尋爬蟲存取頁面。', 'rankwoven-seo'),
                'user_agents' => ['OAI-SearchBot', 'Claude-SearchBot', 'PerplexityBot', 'Googlebot', 'Bingbot']
            ],
            'assistant_fetchers' => [
                'label' => __('AI Assistant Fetchers', 'rankwoven-seo'),
                'description' => __('允許用戶主動觸發的 AI 助手抓取即時頁面內容。', 'rankwoven-seo'),
                'user_agents' => ['ChatGPT-User', 'Claude-User', 'Perplexity-User']
            ]
        ];
    }

    private function get_default_geo_language(): string
    {
        $language = sanitize_text_field((string) get_bloginfo('language'));
        return $this->sanitize_geo_language_code($language) ?: 'en';
    }

    private function get_default_geo_settings(): array
    {
        $site_url = esc_url_raw(home_url('/'));
        return [
            'training_crawlers' => true,
            'search_crawlers' => true,
            'assistant_fetchers' => true,
            'indexable' => true,
            'allow_snippets' => true,
            'language_declaration' => true,
            'language_code' => $this->get_default_geo_language(),
            'x_default_url' => $site_url,
            'alternate_languages' => [],
            'structured_data' => true,
            'entity_schema' => true,
            'content_schema' => true,
            'author_date_schema' => true,
            'organization_name' => sanitize_text_field((string) get_bloginfo('name')),
            'organization_description' => sanitize_textarea_field((string) get_bloginfo('description')),
            'organization_logo' => function_exists('get_site_icon_url') ? esc_url_raw((string) get_site_icon_url(512)) : '',
            'organization_same_as' => []
        ];
    }

    private function get_geo_settings(): array
    {
        $saved_settings = get_option(self::OPTION_GEO_SETTINGS, []);
        return $this->sanitize_geo_settings(is_array($saved_settings) ? $saved_settings : []);
    }

    private function sanitize_geo_settings($input): array
    {
        $input = is_array($input) ? $input : [];
        $defaults = $this->get_default_geo_settings();
        $language_code = array_key_exists('language_code', $input)
            ? $this->sanitize_geo_language_code((string) $input['language_code'])
            : $defaults['language_code'];
        $x_default_url = array_key_exists('x_default_url', $input)
            ? $this->sanitize_geo_url($input['x_default_url'])
            : $defaults['x_default_url'];

        return [
            'training_crawlers' => !empty($input['training_crawlers']),
            'search_crawlers' => !empty($input['search_crawlers']),
            'assistant_fetchers' => !empty($input['assistant_fetchers']),
            'indexable' => !empty($input['indexable']),
            'allow_snippets' => !empty($input['allow_snippets']),
            'language_declaration' => !empty($input['language_declaration']),
            'language_code' => $language_code !== '' ? $language_code : $defaults['language_code'],
            'x_default_url' => $x_default_url !== '' ? $x_default_url : $defaults['x_default_url'],
            'alternate_languages' => $this->sanitize_geo_alternate_languages($input['alternate_languages'] ?? []),
            'structured_data' => array_key_exists('structured_data', $input) ? !empty($input['structured_data']) : (bool) $defaults['structured_data'],
            'entity_schema' => array_key_exists('entity_schema', $input) ? !empty($input['entity_schema']) : (bool) $defaults['entity_schema'],
            'content_schema' => array_key_exists('content_schema', $input) ? !empty($input['content_schema']) : (bool) $defaults['content_schema'],
            'author_date_schema' => array_key_exists('author_date_schema', $input) ? !empty($input['author_date_schema']) : (bool) $defaults['author_date_schema'],
            'organization_name' => sanitize_text_field((string) ($input['organization_name'] ?? $defaults['organization_name'])),
            'organization_description' => sanitize_textarea_field((string) ($input['organization_description'] ?? $defaults['organization_description'])),
            'organization_logo' => $this->sanitize_geo_url($input['organization_logo'] ?? $defaults['organization_logo']),
            'organization_same_as' => $this->sanitize_geo_social_urls($input['organization_same_as'] ?? [])
        ];
    }

    private function sanitize_geo_social_urls($value): array
    {
        $lines = is_array($value) ? $value : (preg_split('/\R/', (string) $value) ?: []);
        $urls = [];
        foreach ($lines as $line) {
            $url = $this->sanitize_geo_url($line);
            if ($url !== '') {
                $urls[$url] = $url;
            }
        }

        return array_values($urls);
    }

    private function sanitize_geo_language_code(string $language_code): string
    {
        $language_code = trim($language_code);
        if ($language_code === '' || !preg_match('/^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{2,8})*$/', $language_code)) {
            return '';
        }

        return $language_code;
    }

    private function sanitize_geo_url($url): string
    {
        $url = esc_url_raw(trim((string) $url));
        $scheme = strtolower((string) wp_parse_url($url, PHP_URL_SCHEME));
        $host = (string) wp_parse_url($url, PHP_URL_HOST);
        return in_array($scheme, ['http', 'https'], true) && $host !== '' ? $url : '';
    }

    private function sanitize_geo_alternate_languages($value): array
    {
        $lines = [];
        if (is_array($value)) {
            foreach ($value as $item) {
                if (is_array($item)) {
                    $lines[] = (string) ($item['code'] ?? '') . '=' . (string) ($item['url'] ?? '');
                } else {
                    $lines[] = (string) $item;
                }
            }
        } else {
            $lines = preg_split('/\R/', (string) $value) ?: [];
        }

        $alternates = [];
        foreach ($lines as $line) {
            $parts = preg_split('/\s*=\s*/', trim((string) $line), 2);
            if (!is_array($parts) || count($parts) !== 2) {
                continue;
            }

            $code = $this->sanitize_geo_language_code((string) $parts[0]);
            $url = $this->sanitize_geo_url($parts[1]);
            if ($code === '' || $url === '') {
                continue;
            }

            $key = $code . '|' . $url;
            $alternates[$key] = [
                'code' => $code,
                'url' => $url
            ];
        }

        return array_values($alternates);
    }

    private function format_geo_alternate_languages(array $alternates): string
    {
        $lines = [];
        foreach ($alternates as $alternate) {
            $code = $this->sanitize_geo_language_code((string) ($alternate['code'] ?? ''));
            $url = $this->sanitize_geo_url($alternate['url'] ?? '');
            if ($code !== '' && $url !== '') {
                $lines[] = $code . '=' . $url;
            }
        }

        return implode("\n", $lines);
    }

    private function get_geo_assessment(array $settings): array
    {
        $crawler_checks = [
            [
                'label' => __('AI Training Crawlers', 'rankwoven-seo'),
                'status' => !empty($settings['training_crawlers']) ? 'info' : 'warning',
                'ok' => !empty($settings['training_crawlers']),
                'description' => !empty($settings['training_crawlers'])
                    ? __('訓練爬蟲可讀取公開內容。', 'rankwoven-seo')
                    : __('訓練爬蟲被禁止讀取公開內容。', 'rankwoven-seo')
            ],
            [
                'label' => __('AI Search Crawlers', 'rankwoven-seo'),
                'status' => !empty($settings['search_crawlers']) ? 'pass' : 'warning',
                'ok' => !empty($settings['search_crawlers']),
                'description' => !empty($settings['search_crawlers'])
                    ? __('OpenAI、Anthropic、Perplexity、Google 和 Bing 可存取頁面。', 'rankwoven-seo')
                    : __('引用關鍵的 AI 搜尋爬蟲被禁止存取頁面。', 'rankwoven-seo')
            ],
            [
                'label' => __('AI Assistant Fetchers', 'rankwoven-seo'),
                'status' => !empty($settings['assistant_fetchers']) ? 'pass' : 'warning',
                'ok' => !empty($settings['assistant_fetchers']),
                'description' => !empty($settings['assistant_fetchers'])
                    ? __('ChatGPT-User、Claude-User 和 Perplexity-User 可取得即時內容。', 'rankwoven-seo')
                    : __('用戶主動觸發的 AI 助手抓取器被禁止存取。', 'rankwoven-seo')
            ],
            [
                'label' => __('Indexability', 'rankwoven-seo'),
                'status' => !empty($settings['indexable']) ? 'pass' : 'warning',
                'ok' => !empty($settings['indexable']),
                'description' => !empty($settings['indexable'])
                    ? __('未輸出 noindex，公開頁面可出現在 AI 搜尋結果。', 'rankwoven-seo')
                    : __('前台會輸出 noindex，AI 搜尋引擎不應收錄公開頁面。', 'rankwoven-seo')
            ],
            [
                'label' => __('Snippet Controls', 'rankwoven-seo'),
                'status' => !empty($settings['allow_snippets']) ? 'pass' : 'warning',
                'ok' => !empty($settings['allow_snippets']),
                'description' => !empty($settings['allow_snippets'])
                    ? __('未限制摘要，AI 引擎可在回答中引用頁面內容。', 'rankwoven-seo')
                    : __('前台會輸出 nosnippet，限制 AI 引擎引用頁面內容。', 'rankwoven-seo')
            ]
        ];
        $language_ready = !empty($settings['language_declaration'])
            && (string) ($settings['language_code'] ?? '') !== ''
            && (string) ($settings['x_default_url'] ?? '') !== '';
        $llms_settings = $this->get_llms_settings();
        $sitemap_ready = $this->get_sitemap_entries() !== [];
        $machine_checks = [
            [
                'label' => __('Language Declaration', 'rankwoven-seo'),
                'status' => $language_ready ? 'pass' : 'warning',
                'ok' => $language_ready,
                'description' => $language_ready
                    ? __('已輸出語言 hreflang 及 x-default，降低錯誤語言引用風險。', 'rankwoven-seo')
                    : __('請啟用語言聲明並設定 x-default URL，避免錯誤語言引用。', 'rankwoven-seo')
            ],
            [
                'label' => __('Server-Rendered Content', 'rankwoven-seo'),
                'status' => 'pass',
                'ok' => true,
                'description' => __('WordPress 在伺服器端輸出內容，非 JavaScript AI 爬蟲可讀取完整頁面。', 'rankwoven-seo')
            ],
            [
                'label' => __('Title, H1 & Description in HTML', 'rankwoven-seo'),
                'status' => sanitize_text_field((string) get_bloginfo('name')) !== '' && sanitize_textarea_field((string) get_bloginfo('description')) !== '' ? 'pass' : 'warning',
                'ok' => sanitize_text_field((string) get_bloginfo('name')) !== '' && sanitize_textarea_field((string) get_bloginfo('description')) !== '',
                'description' => sanitize_text_field((string) get_bloginfo('name')) !== '' && sanitize_textarea_field((string) get_bloginfo('description')) !== ''
                    ? __('網站標題、H1 和描述具備伺服器端 HTML 來源。', 'rankwoven-seo')
                    : __('請確保網站標題與描述已設定，並在頁面 HTML 中提供清晰 H1。', 'rankwoven-seo')
            ],
            [
                'label' => __('llms.txt', 'rankwoven-seo'),
                'status' => !empty($llms_settings['enabled']) ? 'pass' : 'warning',
                'ok' => !empty($llms_settings['enabled']),
                'description' => !empty($llms_settings['enabled'])
                    ? __('已啟用 llms.txt，AI 系統可取得整理後的公開內容索引。', 'rankwoven-seo')
                    : __('建議啟用 llms.txt，提供 AI 系統可讀的內容入口。', 'rankwoven-seo')
            ],
            [
                'label' => __('XML Sitemap', 'rankwoven-seo'),
                'status' => $sitemap_ready ? 'pass' : 'warning',
                'ok' => $sitemap_ready,
                'description' => $sitemap_ready
                    ? __('Sitemap 已包含首頁及已發佈內容，方便 AI 爬蟲發現頁面。', 'rankwoven-seo')
                    : __('尚未建立可供抓取的 Sitemap 項目。', 'rankwoven-seo')
            ],
            [
                'label' => __('Canonical URL', 'rankwoven-seo'),
                'status' => 'pass',
                'ok' => true,
                'description' => __('前台輸出自我指向 canonical URL，降低重複頁面引用風險。', 'rankwoven-seo')
            ],
            [
                'label' => __('URL Structure', 'rankwoven-seo'),
                'status' => $this->is_pretty_permalink_structure() ? 'pass' : 'warning',
                'ok' => $this->is_pretty_permalink_structure(),
                'description' => $this->is_pretty_permalink_structure()
                    ? __('網站使用穩定、可讀的永久連結結構。', 'rankwoven-seo')
                    : __('建議使用可讀的永久連結，避免以查詢參數作為主要內容 URL。', 'rankwoven-seo')
            ]
        ];

        $assessment_post = $this->get_geo_assessment_post();
        $content_html = $assessment_post instanceof WP_Post ? $this->get_llms_rendered_content($assessment_post) : '';
        $plain_content = $assessment_post instanceof WP_Post ? $this->get_llms_plain_text_content($assessment_post) : '';
        $content_units = $plain_content !== '' ? $this->get_editor_seo_text_units($plain_content) : 0;
        preg_match_all('/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/i', $content_html, $heading_matches);
        $heading_levels = array_map('intval', $heading_matches[1] ?? []);
        $heading_titles = array_map(static fn ($heading): string => trim(wp_strip_all_tags((string) $heading)), $heading_matches[2] ?? []);
        $h1_count = count(array_filter($heading_levels, static fn (int $level): bool => $level === 1));
        $heading_jump = false;
        $previous_level = 0;
        foreach ($heading_levels as $level) {
            if ($previous_level > 0 && $level > $previous_level + 1) {
                $heading_jump = true;
                break;
            }
            $previous_level = $level;
        }
        $first_paragraph = '';
        if (preg_match('/<p\b[^>]*>([\s\S]*?)<\/p>/i', $content_html, $paragraph_match) === 1) {
            $first_paragraph = trim(wp_strip_all_tags((string) $paragraph_match[1]));
        }
        $question_heading_count = count(array_filter($heading_titles, static function (string $heading): bool {
            return preg_match('/[?？]$|^(?:what|why|how|when|where|who|which|是否|如何|為什麼|什麼|怎樣|何時|哪個)\b/iu', $heading) === 1;
        }));
        $has_list_or_table = preg_match('/<(?:ul|ol|table)\b/i', $content_html) === 1;
        $has_statistics = preg_match('/(?:\b\d+(?:\.\d+)?\s*%|\b\d{2,}\b|\$\s*\d+)/u', $plain_content) === 1;
        $site_host = strtolower((string) wp_parse_url(home_url('/'), PHP_URL_HOST));
        $outbound_links = 0;
        if (preg_match_all('/<a\b[^>]*\bhref\s*=\s*["\']([^"\']+)["\']/i', $content_html, $link_matches)) {
            foreach ($link_matches[1] as $href) {
                $host = strtolower((string) wp_parse_url(html_entity_decode((string) $href, ENT_QUOTES | ENT_HTML5, 'UTF-8'), PHP_URL_HOST));
                if ($host !== '' && $host !== $site_host && !str_ends_with($host, '.' . $site_host)) {
                    $outbound_links++;
                }
            }
        }
        $section_lengths = [];
        if ($heading_levels !== []) {
            $sections = preg_split('/<h[1-6]\b[^>]*>[\s\S]*?<\/h[1-6]>/i', $content_html) ?: [];
            foreach ($sections as $section) {
                $section_lengths[] = $this->get_editor_seo_text_units(wp_strip_all_tags((string) $section));
            }
        }
        $average_section_length = $section_lengths !== [] ? (int) round(array_sum($section_lengths) / count($section_lengths)) : 0;
        $content_checks = [
            [
                'label' => __('Heading Hierarchy', 'rankwoven-seo'),
                'status' => $heading_levels !== [] && !$heading_jump ? 'pass' : 'warning',
                'ok' => $heading_levels !== [] && !$heading_jump,
                'description' => $heading_levels !== [] && !$heading_jump
                    ? __('標題層級按順序排列，便於 AI 擷取章節上下文。', 'rankwoven-seo')
                    : __('標題層級存在跳級或沒有標題，建議按 H1、H2、H3 順序整理。', 'rankwoven-seo')
            ],
            [
                'label' => __('Answer-First Structure', 'rankwoven-seo'),
                'status' => $first_paragraph !== '' && $this->get_editor_seo_text_units($first_paragraph) <= 320 ? 'pass' : 'warning',
                'ok' => $first_paragraph !== '' && $this->get_editor_seo_text_units($first_paragraph) <= 320,
                'description' => $first_paragraph !== '' && $this->get_editor_seo_text_units($first_paragraph) <= 320
                    ? __('首段提供短而直接的答案，適合生成式搜尋擷取。', 'rankwoven-seo')
                    : __('建議在首段用一至兩句直接回答頁面主題。', 'rankwoven-seo')
            ],
            [
                'label' => __('H1 Heading', 'rankwoven-seo'),
                'status' => $h1_count === 1 ? 'pass' : 'warning',
                'ok' => $h1_count === 1,
                'description' => $h1_count === 1 ? __('頁面有且只有一個 H1。', 'rankwoven-seo') : sprintf(__('目前偵測到 %d 個 H1，建議保留一個清晰主標題。', 'rankwoven-seo'), $h1_count)
            ],
            [
                'label' => __('Question-Style Headings', 'rankwoven-seo'),
                'status' => $question_heading_count > 0 ? 'pass' : 'warning',
                'ok' => $question_heading_count > 0,
                'description' => $question_heading_count > 0 ? sprintf(__('偵測到 %d 個問題式標題，可對應使用者查詢。', 'rankwoven-seo'), $question_heading_count) : __('建議加入問題式 H2／H3，讓 AI 更容易匹配查詢意圖。', 'rankwoven-seo')
            ],
            [
                'label' => __('Lists & Tables', 'rankwoven-seo'),
                'status' => $has_list_or_table ? 'pass' : 'warning',
                'ok' => $has_list_or_table,
                'description' => $has_list_or_table ? __('內容包含清單或表格，方便 AI 讀取結構化資訊。', 'rankwoven-seo') : __('建議用清單或表格整理步驟、比較和重點。', 'rankwoven-seo')
            ],
            [
                'label' => __('Statistics & Data Points', 'rankwoven-seo'),
                'status' => $has_statistics ? 'pass' : 'warning',
                'ok' => $has_statistics,
                'description' => $has_statistics ? __('內容包含可驗證的數字或統計資料。', 'rankwoven-seo') : __('加入來源清楚的數字、比例或日期，可提高內容可引用性。', 'rankwoven-seo')
            ],
            [
                'label' => __('Citations & Quotations', 'rankwoven-seo'),
                'status' => $outbound_links > 0 || preg_match('/<blockquote\b/i', $content_html) === 1 ? 'pass' : 'warning',
                'ok' => $outbound_links > 0 || preg_match('/<blockquote\b/i', $content_html) === 1,
                'description' => $outbound_links > 0 || preg_match('/<blockquote\b/i', $content_html) === 1 ? __('內容包含外部引用連結或引文。', 'rankwoven-seo') : __('建議加入權威外部來源或標示引文出處。', 'rankwoven-seo')
            ],
            [
                'label' => __('Content Depth', 'rankwoven-seo'),
                'status' => $content_units >= 300 && $content_units <= 3000 ? 'pass' : 'warning',
                'ok' => $content_units >= 300 && $content_units <= 3000,
                'description' => $content_units >= 300 && $content_units <= 3000 ? sprintf(__('可引用正文約 %d 個文字單位，深度適中。', 'rankwoven-seo'), $content_units) : sprintf(__('目前正文約 %d 個文字單位，建議維持 300 至 3,000 個單位。', 'rankwoven-seo'), $content_units)
            ],
            [
                'label' => __('Section Sizing', 'rankwoven-seo'),
                'status' => $average_section_length > 0 && $average_section_length <= 400 ? 'pass' : 'warning',
                'ok' => $average_section_length > 0 && $average_section_length <= 400,
                'description' => $average_section_length > 0 && $average_section_length <= 400 ? __('各章節長度適合分段擷取。', 'rankwoven-seo') : __('建議以短章節和清晰子標題分割長段落。', 'rankwoven-seo')
            ]
        ];
        $about_contact_ready = $this->has_geo_public_page(['about', '關於']) && $this->has_geo_public_page(['contact', '聯絡']);
        $privacy_terms_ready = $this->has_geo_public_page(['privacy', '私隱', '隱私']) && $this->has_geo_public_page(['terms', '條款']);
        $trust_checks = [
            [
                'label' => __('Author Signals', 'rankwoven-seo'),
                'status' => $assessment_post instanceof WP_Post && get_the_author_meta('display_name', (int) $assessment_post->post_author) !== '' ? 'pass' : 'warning',
                'ok' => $assessment_post instanceof WP_Post && get_the_author_meta('display_name', (int) $assessment_post->post_author) !== '',
                'description' => $assessment_post instanceof WP_Post ? __('內容有可識別作者，可在 JSON-LD 中建立 Person 實體。', 'rankwoven-seo') : __('發佈文章後加入作者名稱，建立可追溯的內容來源。', 'rankwoven-seo')
            ],
            [
                'label' => __('Freshness Signals', 'rankwoven-seo'),
                'status' => $assessment_post instanceof WP_Post && $this->get_post_date_value($assessment_post, false) !== '' ? 'pass' : 'warning',
                'ok' => $assessment_post instanceof WP_Post && $this->get_post_date_value($assessment_post, false) !== '',
                'description' => $assessment_post instanceof WP_Post ? __('內容具備 datePublished 和 dateModified，可傳達更新時效。', 'rankwoven-seo') : __('發佈內容後會自動加入機器可讀日期。', 'rankwoven-seo')
            ],
            [
                'label' => __('About & Contact', 'rankwoven-seo'),
                'status' => $about_contact_ready ? 'pass' : 'warning',
                'ok' => $about_contact_ready,
                'description' => $about_contact_ready ? __('網站提供 About 與 Contact 公開入口。', 'rankwoven-seo') : __('建議在導覽或頁尾加入 About 與 Contact 頁面。', 'rankwoven-seo')
            ],
            [
                'label' => __('Brand Consistency', 'rankwoven-seo'),
                'status' => (string) ($settings['organization_name'] ?? '') !== '' && (string) ($settings['organization_name'] ?? '') === sanitize_text_field((string) get_bloginfo('name')) ? 'pass' : 'warning',
                'ok' => (string) ($settings['organization_name'] ?? '') !== '' && (string) ($settings['organization_name'] ?? '') === sanitize_text_field((string) get_bloginfo('name')),
                'description' => __('Organization、網站標題和 Open Graph 會使用同一品牌名稱。', 'rankwoven-seo')
            ],
            [
                'label' => __('Privacy & Terms', 'rankwoven-seo'),
                'status' => $privacy_terms_ready ? 'pass' : 'warning',
                'ok' => $privacy_terms_ready,
                'description' => $privacy_terms_ready ? __('網站提供 Privacy 與 Terms 公開入口。', 'rankwoven-seo') : __('建議在頁尾同時連結 Privacy 和 Terms，補足信任訊號。', 'rankwoven-seo')
            ],
            [
                'label' => __('HTTPS', 'rankwoven-seo'),
                'status' => strtolower((string) wp_parse_url(home_url('/'), PHP_URL_SCHEME)) === 'https' ? 'pass' : 'warning',
                'ok' => strtolower((string) wp_parse_url(home_url('/'), PHP_URL_SCHEME)) === 'https',
                'description' => strtolower((string) wp_parse_url(home_url('/'), PHP_URL_SCHEME)) === 'https' ? __('網站使用 HTTPS 傳輸。', 'rankwoven-seo') : __('正式網站應使用 HTTPS，保障使用者和爬蟲連線。', 'rankwoven-seo')
            ],
            [
                'label' => __('Social & OG Metadata', 'rankwoven-seo'),
                'status' => sanitize_text_field((string) get_bloginfo('name')) !== '' && sanitize_textarea_field((string) get_bloginfo('description')) !== '' ? 'pass' : 'warning',
                'ok' => sanitize_text_field((string) get_bloginfo('name')) !== '' && sanitize_textarea_field((string) get_bloginfo('description')) !== '',
                'description' => sanitize_text_field((string) get_bloginfo('name')) !== '' && sanitize_textarea_field((string) get_bloginfo('description')) !== ''
                    ? __('前台會輸出 Open Graph 和 Twitter Card 標籤，保持社交分享與 AI 預覽一致。', 'rankwoven-seo')
                    : __('請設定網站名稱和描述，確保 Open Graph／Twitter Card 有完整內容。', 'rankwoven-seo')
            ]
        ];

        $structured_data_checks = [
            [
                'label' => __('JSON-LD Markup', 'rankwoven-seo'),
                'status' => !empty($settings['structured_data']) ? 'pass' : 'warning',
                'ok' => !empty($settings['structured_data']),
                'description' => !empty($settings['structured_data']) ? __('前台會輸出 JSON-LD 結構化資料。', 'rankwoven-seo') : __('啟用 JSON-LD，讓 AI 引擎理解頁面實體和事實。', 'rankwoven-seo')
            ],
            [
                'label' => __('Entity Schema', 'rankwoven-seo'),
                'status' => !empty($settings['structured_data']) && !empty($settings['entity_schema']) ? 'pass' : 'warning',
                'ok' => !empty($settings['structured_data']) && !empty($settings['entity_schema']),
                'description' => __('Organization、Person 和 WebSite schema 錨定品牌與作者實體。', 'rankwoven-seo')
            ],
            [
                'label' => __('Content Schema', 'rankwoven-seo'),
                'status' => !empty($settings['structured_data']) && !empty($settings['content_schema']) ? 'pass' : 'warning',
                'ok' => !empty($settings['structured_data']) && !empty($settings['content_schema']),
                'description' => __('Article、WebPage、Product 和 BreadcrumbList schema 提供內容上下文。', 'rankwoven-seo')
            ],
            [
                'label' => __('Author & Date Markup', 'rankwoven-seo'),
                'status' => !empty($settings['structured_data']) && !empty($settings['author_date_schema']) ? 'pass' : 'warning',
                'ok' => !empty($settings['structured_data']) && !empty($settings['author_date_schema']),
                'description' => __('作者、datePublished 和 dateModified 可提升引用可信度。', 'rankwoven-seo')
            ]
        ];

        $score_group = static function (array $checks): int {
            if ($checks === []) {
                return 0;
            }

            $passed = count(array_filter($checks, static fn (array $check): bool => !empty($check['ok'])));
            return (int) round(($passed / count($checks)) * 100);
        };
        $crawler_score = $score_group($crawler_checks);
        $machine_score = $score_group($machine_checks);
        $structured_data_score = $score_group($structured_data_checks);
        $content_score = $score_group($content_checks);
        $trust_score = $score_group($trust_checks);

        return [
            'crawler_score' => $crawler_score,
            'machine_score' => $machine_score,
            'structured_data_score' => $structured_data_score,
            'content_score' => $content_score,
            'trust_score' => $trust_score,
            'overall_score' => (int) round(($crawler_score + $machine_score + $structured_data_score + $content_score + $trust_score) / 5),
            'groups' => [
                [
                    'title' => __('AI Crawler Access', 'rankwoven-seo'),
                    'score' => $crawler_score,
                    'checks' => $crawler_checks
                ],
                [
                    'title' => __('Machine Readability', 'rankwoven-seo'),
                    'score' => $machine_score,
                    'checks' => $machine_checks
                ],
                [
                    'title' => __('Structured Data', 'rankwoven-seo'),
                    'score' => $structured_data_score,
                    'checks' => $structured_data_checks
                ],
                [
                    'title' => __('Content & Citability', 'rankwoven-seo'),
                    'score' => $content_score,
                    'checks' => $content_checks
                ],
                [
                    'title' => __('Trust & E-E-A-T', 'rankwoven-seo'),
                    'score' => $trust_score,
                    'checks' => $trust_checks
                ]
            ]
        ];
    }

    private function get_geo_assessment_post(): ?WP_Post
    {
        $posts = get_posts([
            'post_type' => $this->get_supported_editor_post_types(),
            'post_status' => 'publish',
            'posts_per_page' => 1,
            'orderby' => 'modified',
            'order' => 'DESC',
            'no_found_rows' => true,
            'ignore_sticky_posts' => true
        ]);

        return isset($posts[0]) && $posts[0] instanceof WP_Post ? $posts[0] : null;
    }

    private function has_geo_public_page(array $slugs): bool
    {
        foreach ($slugs as $slug) {
            $page = get_page_by_path(sanitize_title((string) $slug), OBJECT, 'page');
            if ($page instanceof WP_Post && $page->post_status === 'publish') {
                return true;
            }
        }

        return false;
    }

    private function is_pretty_permalink_structure(): bool
    {
        $structure = (string) get_option('permalink_structure', '');
        return $structure !== '' && strpos($structure, '?') === false;
    }

    private function get_default_llms_settings(): array
    {
        return [
            'enabled' => false,
            'full_enabled' => false,
            'convert_posts_to_markdown' => false,
            'title' => '{{site_title}}',
            'description' => '{{site_description}}',
            'urls_per_post_type' => 1000,
            'urls_per_taxonomy' => 1000,
            'post_types' => [],
            'taxonomies' => [],
            'excluded_posts' => [],
            'excluded_terms' => []
        ];
    }

    private function get_default_rss_settings(): array
    {
        return [
            'enabled' => false,
            'posts_per_page' => 50,
            'post_types' => []
        ];
    }

    private function get_default_indexnow_settings(): array
    {
        return [
            'enabled' => false,
            'auto_submit' => true,
            'key' => '',
            'post_types' => $this->get_supported_editor_post_types()
        ];
    }

    private function get_indexnow_settings(): array
    {
        $saved_settings = get_option(self::OPTION_INDEXNOW_SETTINGS, []);
        return $this->sanitize_indexnow_settings(is_array($saved_settings) ? $saved_settings : []);
    }

    private function sanitize_indexnow_settings($input): array
    {
        $input = is_array($input) ? $input : [];
        $defaults = $this->get_default_indexnow_settings();
        $key = sanitize_text_field((string) ($input['key'] ?? $defaults['key']));
        if (!preg_match('/^[A-Za-z0-9-]{8,128}$/', $key)) {
            $key = '';
        }

        $post_types = [];
        if (isset($input['post_types']) && is_array($input['post_types'])) {
            $post_types = array_values(array_intersect(
                $this->get_supported_editor_post_types(),
                array_map('sanitize_key', $input['post_types'])
            ));
        }

        return [
            'enabled' => !empty($input['enabled']),
            'auto_submit' => array_key_exists('auto_submit', $input) ? !empty($input['auto_submit']) : (bool) $defaults['auto_submit'],
            'key' => $key,
            'post_types' => $post_types
        ];
    }

    private function generate_indexnow_key(): string
    {
        try {
            return bin2hex(random_bytes(16));
        } catch (Throwable $error) {
            return strtolower(wp_generate_password(32, false, false));
        }
    }

    private function get_rss_settings(): array
    {
        $saved_settings = get_option(self::OPTION_RSS_SETTINGS, []);
        return $this->sanitize_rss_settings(is_array($saved_settings) ? $saved_settings : []);
    }

    private function sanitize_rss_settings($input): array
    {
        $input = is_array($input) ? $input : [];
        $defaults = $this->get_default_rss_settings();
        $posts_per_page = absint($input['posts_per_page'] ?? $defaults['posts_per_page']);

        return [
            'enabled' => !empty($input['enabled']),
            'posts_per_page' => min(500, max(1, $posts_per_page)),
            'post_types' => $this->sanitize_llms_object_selection($input['post_types'] ?? [], array_keys($this->get_llms_public_post_types()))
        ];
    }

    private function get_llms_settings(): array
    {
        $saved_settings = get_option(self::OPTION_LLMS_SETTINGS, []);
        return $this->sanitize_llms_settings(is_array($saved_settings) ? $saved_settings : []);
    }

    private function sanitize_llms_settings($input): array
    {
        $input = is_array($input) ? $input : [];
        $defaults = $this->get_default_llms_settings();
        $post_types = $this->sanitize_llms_object_selection($input['post_types'] ?? [], array_keys($this->get_llms_public_post_types()));
        $taxonomies = $this->sanitize_llms_object_selection($input['taxonomies'] ?? [], array_keys($this->get_llms_public_taxonomies()));
        $title = sanitize_text_field((string) ($input['title'] ?? $defaults['title']));
        $description = sanitize_textarea_field((string) ($input['description'] ?? $defaults['description']));
        $urls_per_post_type = absint($input['urls_per_post_type'] ?? $defaults['urls_per_post_type']);
        $urls_per_taxonomy = absint($input['urls_per_taxonomy'] ?? $defaults['urls_per_taxonomy']);

        return [
            'enabled' => !empty($input['enabled']),
            'full_enabled' => !empty($input['full_enabled']),
            'convert_posts_to_markdown' => !empty($input['convert_posts_to_markdown']),
            'title' => $title !== '' ? $title : $defaults['title'],
            'description' => $description !== '' ? $description : $defaults['description'],
            'urls_per_post_type' => min(10000, max(1, $urls_per_post_type)),
            'urls_per_taxonomy' => min(10000, max(1, $urls_per_taxonomy)),
            'post_types' => $post_types,
            'taxonomies' => $taxonomies,
            'excluded_posts' => $this->sanitize_llms_id_list($input['excluded_posts'] ?? []),
            'excluded_terms' => $this->sanitize_llms_id_list($input['excluded_terms'] ?? [])
        ];
    }

    private function sanitize_llms_object_selection($value, array $allowed): array
    {
        $values = is_array($value) ? $value : (preg_split('/[\s,，]+/', (string) $value) ?: []);
        $selected = [];

        foreach ($values as $item) {
            $name = sanitize_key((string) $item);
            if ($name !== '' && in_array($name, $allowed, true) && !in_array($name, $selected, true)) {
                $selected[] = $name;
            }
        }

        return $selected;
    }

    private function sanitize_llms_id_list($value): array
    {
        $values = is_array($value) ? $value : (preg_split('/[\s,，]+/', (string) $value) ?: []);
        $ids = [];

        foreach ($values as $value_item) {
            $id = absint($value_item);
            if ($id > 0 && !in_array($id, $ids, true)) {
                $ids[] = $id;
            }
        }

        return $ids;
    }

    private function get_llms_public_post_types(): array
    {
        $post_types = get_post_types(['public' => true], 'objects');
        if (!is_array($post_types)) {
            return [];
        }

        $excluded_types = ['attachment', 'revision', 'nav_menu_item', 'custom_css', 'customize_changeset', 'oembed_cache', 'user_request'];
        foreach ($excluded_types as $excluded_type) {
            unset($post_types[$excluded_type]);
        }

        foreach ($post_types as $post_type => $post_type_object) {
            if (!is_object($post_type_object) || empty($post_type_object->publicly_queryable)) {
                unset($post_types[$post_type]);
            }
        }

        return $post_types;
    }

    private function get_llms_public_taxonomies(): array
    {
        $taxonomies = get_taxonomies(['public' => true], 'objects');
        if (!is_array($taxonomies)) {
            return [];
        }

        unset($taxonomies['nav_menu'], $taxonomies['link_category']);
        foreach ($taxonomies as $taxonomy => $taxonomy_object) {
            if (!is_object($taxonomy_object) || empty($taxonomy_object->publicly_queryable)) {
                unset($taxonomies[$taxonomy]);
            }
        }

        return $taxonomies;
    }

    private function has_physical_llms_file(string $filename): bool
    {
        return in_array($filename, ['llms.txt', 'llms-full.txt'], true) && file_exists(ABSPATH . $filename);
    }

    private function get_llms_request_kind(): string
    {
        $request_uri = sanitize_text_field((string) ($_SERVER['REQUEST_URI'] ?? ''));
        if ($request_uri === '') {
            return '';
        }

        $path = wp_parse_url($request_uri, PHP_URL_PATH);
        if (!is_string($path) || $path === '') {
            return '';
        }

        $normalized_path = rtrim($path, '/');
        if ($normalized_path === 'llms.txt' || str_ends_with($normalized_path, '/llms.txt')) {
            return 'llms';
        }

        if ($normalized_path === 'llms-full.txt' || str_ends_with($normalized_path, '/llms-full.txt')) {
            return 'llms-full';
        }

        if (str_ends_with($normalized_path, '.md')) {
            return 'markdown';
        }

        return '';
    }

    private function build_llms_txt(array $settings): string
    {
        return $this->build_llms_document($settings, false);
    }

    private function build_llms_full_txt(array $settings): string
    {
        return $this->build_llms_document($settings, true);
    }

    private function build_llms_document(array $settings, bool $include_content): string
    {
        $title = $this->render_llms_template((string) $settings['title']);
        $description = $this->render_llms_template((string) $settings['description']);
        $lines = ['# ' . ($title !== '' ? $title : sanitize_text_field((string) get_bloginfo('name')))];

        if ($description !== '') {
            foreach (preg_split('/\R/', $description) ?: [] as $description_line) {
                $description_line = trim((string) $description_line);
                if ($description_line !== '') {
                    $lines[] = '> ' . $description_line;
                }
            }
        }

        $lines[] = '';
        $lines[] = 'Source: ' . esc_url_raw(home_url('/'));
        $lines[] = '';
        $has_content = false;
        $post_types = $this->get_llms_public_post_types();
        foreach ($post_types as $post_type => $post_type_object) {
            if (!$this->is_llms_post_type_enabled($post_type, $settings)) {
                continue;
            }

            $posts = get_posts([
                'post_type' => $post_type,
                'post_status' => 'publish',
                'posts_per_page' => (int) $settings['urls_per_post_type'],
                'orderby' => 'modified',
                'order' => 'DESC',
                'no_found_rows' => true,
                'ignore_sticky_posts' => true
            ]);
            $posts = is_array($posts) ? $posts : [];
            $filtered_posts = array_values(array_filter($posts, function ($post) use ($settings): bool {
                return $post instanceof WP_Post && !in_array((int) $post->ID, $settings['excluded_posts'], true);
            }));
            if (empty($filtered_posts)) {
                continue;
            }

            $label = is_object($post_type_object) ? (string) ($post_type_object->labels->name ?? $post_type) : $post_type;
            $lines[] = '## ' . $this->normalize_llms_inline_text($label);
            foreach ($filtered_posts as $post) {
                $permalink = get_permalink($post);
                if (!is_string($permalink) || $permalink === '') {
                    continue;
                }

                $post_title = $this->normalize_llms_inline_text((string) get_the_title($post));
                $excerpt = $this->get_llms_post_excerpt($post);
                if ($include_content) {
                    $lines[] = '';
                    $lines[] = '### ' . ($post_title !== '' ? $post_title : __('Untitled', 'rankwoven-seo'));
                    $lines[] = 'URL: ' . esc_url_raw($permalink);
                    if ($excerpt !== '') {
                        $lines[] = '> ' . $excerpt;
                    }
                    $markdown = $this->convert_html_to_markdown($this->get_llms_rendered_content($post));
                    if ($markdown !== '') {
                        $lines[] = '';
                        $lines[] = $markdown;
                    }
                } else {
                    $line = '- [' . ($post_title !== '' ? $post_title : __('Untitled', 'rankwoven-seo')) . '](' . esc_url_raw($permalink) . ')';
                    if ($excerpt !== '') {
                        $line .= ': ' . $excerpt;
                    }
                    $lines[] = $line;
                }
                $has_content = true;
            }
            $lines[] = '';
        }

        $taxonomy_lines = $this->build_llms_taxonomy_lines($settings);
        if (!empty($taxonomy_lines)) {
            $lines[] = '## Taxonomies';
            $lines = array_merge($lines, $taxonomy_lines);
            $lines[] = '';
            $has_content = true;
        }

        if (!$has_content) {
            $lines[] = __('No public content is available.', 'rankwoven-seo');
            $lines[] = '';
        }

        return rtrim(implode("\n", $lines)) . "\n";
    }

    private function build_llms_taxonomy_lines(array $settings): array
    {
        $lines = [];
        foreach ($this->get_llms_public_taxonomies() as $taxonomy => $taxonomy_object) {
            if (!$this->is_llms_taxonomy_enabled($taxonomy, $settings)) {
                continue;
            }

            $terms = get_terms([
                'taxonomy' => $taxonomy,
                'hide_empty' => true,
                'number' => (int) $settings['urls_per_taxonomy'],
                'orderby' => 'count',
                'order' => 'DESC'
            ]);
            if (is_wp_error($terms) || !is_array($terms) || empty($terms)) {
                continue;
            }

            $taxonomy_term_lines = [];
            foreach ($terms as $term) {
                if (!($term instanceof WP_Term) || in_array((int) $term->term_id, $settings['excluded_terms'], true)) {
                    continue;
                }

                $term_link = get_term_link($term);
                if (is_wp_error($term_link) || !is_string($term_link) || $term_link === '') {
                    continue;
                }

                $term_name = $this->normalize_llms_inline_text((string) $term->name);
                $line = '- [' . ($term_name !== '' ? $term_name : __('Untitled', 'rankwoven-seo')) . '](' . esc_url_raw($term_link) . ')';
                $term_description = $this->normalize_llms_inline_text((string) term_description($term->term_id, $taxonomy));
                if ($term_description !== '') {
                    $line .= ': ' . $term_description;
                }
                $taxonomy_term_lines[] = $line;
            }

            if (!empty($taxonomy_term_lines)) {
                $label = is_object($taxonomy_object) ? (string) ($taxonomy_object->labels->name ?? $taxonomy) : $taxonomy;
                $lines[] = '';
                $lines[] = '### ' . $this->normalize_llms_inline_text($label);
                $lines = array_merge($lines, $taxonomy_term_lines);
            }
        }

        return $lines;
    }

    private function maybe_render_markdown_post(array $settings): void
    {
        $request_uri = sanitize_text_field((string) ($_SERVER['REQUEST_URI'] ?? ''));
        $path = wp_parse_url($request_uri, PHP_URL_PATH);
        if (!is_string($path) || !str_ends_with(rtrim($path, '/'), '.md')) {
            return;
        }

        $post_path = substr(rtrim($path, '/'), 0, -3);
        if ($post_path === '') {
            return;
        }

        $home_path = wp_parse_url(home_url('/'), PHP_URL_PATH);
        $home_path = is_string($home_path) ? rtrim($home_path, '/') : '';
        $relative_path = $home_path !== '' && str_starts_with($post_path, $home_path . '/')
            ? substr($post_path, strlen($home_path))
            : $post_path;
        $post_id = url_to_postid(home_url('/' . ltrim($relative_path, '/')));
        if ($post_id <= 0) {
            return;
        }

        $post = get_post($post_id);
        if (!($post instanceof WP_Post) || $post->post_status !== 'publish' || !$this->is_llms_post_type_enabled($post->post_type, $settings)) {
            return;
        }

        if (in_array($post_id, $settings['excluded_posts'], true)) {
            return;
        }

        $permalink = get_permalink($post);
        if (!is_string($permalink) || $permalink === '') {
            return;
        }

        $title = $this->normalize_llms_inline_text((string) get_the_title($post));
        $description = $this->get_llms_post_excerpt($post);
        $content = $this->convert_html_to_markdown($this->get_llms_rendered_content($post));
        $lines = ['# ' . ($title !== '' ? $title : __('Untitled', 'rankwoven-seo')), ''];
        if ($description !== '') {
            $lines[] = '> ' . $description;
            $lines[] = '';
        }
        $lines[] = 'Source: ' . esc_url_raw($permalink);
        if ($content !== '') {
            $lines[] = '';
            $lines[] = $content;
        }

        nocache_headers();
        status_header(200);
        header('Content-Type: text/markdown; charset=UTF-8');
        echo rtrim(implode("\n", $lines)) . "\n";
        exit;
    }

    private function convert_html_to_markdown(string $html): string
    {
        $html = strip_shortcodes($html);
        $html = $this->strip_shortcode_markup($html);
        $html = preg_replace('/<script\b[^>]*>.*?<\/script>|<style\b[^>]*>.*?<\/style>/is', '', $html) ?? $html;
        $html = preg_replace_callback('/<img\b[^>]*>/i', static function (array $matches): string {
            $tag = $matches[0];
            preg_match('/\bsrc=["\']([^"\']+)["\']/i', $tag, $src_match);
            preg_match('/\balt=["\']([^"\']*)["\']/i', $tag, $alt_match);
            $src = isset($src_match[1]) ? esc_url_raw(html_entity_decode($src_match[1], ENT_QUOTES | ENT_HTML5, 'UTF-8')) : '';
            $alt = isset($alt_match[1]) ? trim(wp_strip_all_tags(html_entity_decode($alt_match[1], ENT_QUOTES | ENT_HTML5, 'UTF-8'))) : '';
            return $src !== '' ? '![' . $alt . '](' . $src . ')' : '';
        }, $html) ?? $html;
        $html = preg_replace_callback('/<a\b[^>]*href=["\']([^"\']+)["\'][^>]*>(.*?)<\/a>/is', static function (array $matches): string {
            $url = esc_url_raw(html_entity_decode($matches[1], ENT_QUOTES | ENT_HTML5, 'UTF-8'));
            $text = trim(wp_strip_all_tags($matches[2]));
            return $url !== '' && $text !== '' ? '[' . $text . '](' . $url . ')' : $text;
        }, $html) ?? $html;
        $html = preg_replace('/<h([1-6])\b[^>]*>(.*?)<\/h\1>/is', "\n\n#$1 $2\n\n", $html) ?? $html;
        $html = preg_replace('/<li\b[^>]*>(.*?)<\/li>/is', "\n- $1", $html) ?? $html;
        $html = preg_replace('/<br\s*\/?\s*>/i', "\n", $html) ?? $html;
        $html = preg_replace('/<\/(p|div|section|article|blockquote|pre|ul|ol|table|tr)>/i', "\n\n", $html) ?? $html;
        $html = preg_replace('/<(strong|b)\b[^>]*>(.*?)<\/\1>/is', '**$2**', $html) ?? $html;
        $html = preg_replace('/<(em|i)\b[^>]*>(.*?)<\/\1>/is', '*$2*', $html) ?? $html;
        $markdown = html_entity_decode(wp_strip_all_tags($html), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $markdown = preg_replace('/#(?:post_excerpt|post_content)\b/iu', ' ', $markdown) ?? $markdown;
        $markdown = preg_replace('/[ \t]+/', ' ', $markdown) ?? $markdown;
        $markdown = preg_replace('/\n[ \t]+/', "\n", $markdown) ?? $markdown;
        $markdown = preg_replace('/\n{3,}/', "\n\n", $markdown) ?? $markdown;

        return trim($markdown);
    }

    private function render_llms_template(string $template): string
    {
        $replacements = [
            '{{site_title}}' => sanitize_text_field((string) get_bloginfo('name')),
            '{{site_name}}' => sanitize_text_field((string) get_bloginfo('name')),
            '{{site_description}}' => sanitize_textarea_field((string) get_bloginfo('description')),
            '{{site_url}}' => esc_url_raw(home_url('/'))
        ];

        return trim(strtr($template, $replacements));
    }

    private function normalize_llms_inline_text(string $value): string
    {
        $value = $this->extract_plain_text_content($value);
        return trim((string) preg_replace('/\s+/', ' ', $value));
    }

    private function is_llms_post_type_enabled(string $post_type, array $settings): bool
    {
        return empty($settings['post_types']) || in_array($post_type, $settings['post_types'], true);
    }

    private function is_llms_taxonomy_enabled(string $taxonomy, array $settings): bool
    {
        return empty($settings['taxonomies']) || in_array($taxonomy, $settings['taxonomies'], true);
    }

    private function update_image_attachment_attributes(int $attachment_id): string
    {
        if (!$this->is_image_attachment($attachment_id)) {
            return '';
        }

        $post_update = ['ID' => $attachment_id];
        $generated = [];
        $attribute_values = $this->generate_image_attribute_context_values($attachment_id);
        $title_text = $this->render_image_attribute_text_from_values($attribute_values, 'title', $attachment_id);
        $caption_text = $this->render_image_attribute_text_from_values($attribute_values, 'caption', $attachment_id);
        $description_text = $this->render_image_attribute_text_from_values($attribute_values, 'description', $attachment_id);
        $alt_text = $this->render_image_attribute_text_from_values($attribute_values, 'alt_text', $attachment_id);

        if ($title_text !== '') {
            $post_update['post_title'] = $title_text;
            $generated[] = sprintf('Title: %s', $title_text);
        }
        if ($caption_text !== '') {
            $post_update['post_excerpt'] = $caption_text;
            $generated[] = sprintf('Caption: %s', $caption_text);
        }
        if ($description_text !== '') {
            $post_update['post_content'] = $description_text;
            $generated[] = sprintf('Description: %s', $description_text);
        }

        if (count($post_update) > 1) {
            wp_update_post(wp_slash($post_update));
        }

        if ($alt_text !== '') {
            update_post_meta($attachment_id, '_wp_attachment_image_alt', $alt_text);
            $generated[] = sprintf('Alt: %s', $alt_text);
        }

        return implode('; ', $generated);
    }

    private function generate_image_attribute_context_values(int $attachment_id): array
    {
        $attached_file = get_attached_file($attachment_id);
        $file_name = is_string($attached_file) && $attached_file !== '' ? basename($attached_file) : '';
        $attachment = get_post($attachment_id);
        $context_post_id = $attachment instanceof WP_Post ? (int) $attachment->post_parent : 0;
        $fallback_values = $this->build_local_image_attribute_values($attachment_id, $file_name, $context_post_id);
        $remote_values = $this->request_saas_image_attribute_values($attachment_id, $file_name, $context_post_id);

        return is_array($remote_values) ? $this->merge_image_attribute_values($fallback_values, $remote_values) : $fallback_values;
    }

    private function generate_image_attribute_context_values_for_upload(string $filename): array
    {
        $context_post_id = $this->get_upload_context_post_id();
        $fallback_values = $this->build_local_image_attribute_values(0, $filename, $context_post_id);
        $remote_values = $this->request_saas_image_attribute_values(0, $filename, $context_post_id);

        return is_array($remote_values) ? $this->merge_image_attribute_values($fallback_values, $remote_values) : $fallback_values;
    }

    private function get_upload_context_post_id(): int
    {
        foreach (['post_id', 'postId', 'post'] as $key) {
            $raw_value = $_REQUEST[$key] ?? 0;
            if (is_array($raw_value)) {
                continue;
            }

            $post_id = (int) sanitize_text_field(wp_unslash((string) $raw_value));
            if ($post_id > 0) {
                return $post_id;
            }
        }

        return 0;
    }

    private function build_local_image_attribute_values(int $attachment_id, string $file_name = '', int $context_post_id = 0): array
    {
        $context_post = $context_post_id > 0 ? get_post($context_post_id) : null;
        $site_title = sanitize_text_field((string) get_bloginfo('name'));
        $context_title = $context_post instanceof WP_Post ? sanitize_text_field((string) get_the_title($context_post)) : '';
        $context_slug = $context_post instanceof WP_Post ? sanitize_title((string) $context_post->post_name) : '';
        $context_excerpt = $context_post instanceof WP_Post
            ? $this->extract_plain_text_content($context_post->post_excerpt !== '' ? $context_post->post_excerpt : $context_post->post_content)
            : '';
        $sequence_number = $this->get_image_attachment_sequence_number($attachment_id, $context_post_id);
        $title_base = $context_title !== ''
            ? ($sequence_number > 1 ? sprintf('%s %d', $context_title, $sequence_number) : $context_title)
            : sprintf('%s image%s', $site_title !== '' ? $site_title : 'RankWoven', $attachment_id > 0 ? ' ' . $attachment_id : '');
        $caption = $context_excerpt !== ''
            ? wp_trim_words($context_excerpt, 28, '')
            : sprintf('%s related image', $context_title !== '' ? $context_title : ($site_title !== '' ? $site_title : 'RankWoven'));
        $description = $context_excerpt !== ''
            ? wp_trim_words($context_excerpt, 48, '')
            : $caption;
        $file_base = $context_slug !== ''
            ? ($sequence_number > 1 ? sprintf('%s-%d', $context_slug, $sequence_number) : $context_slug)
            : sanitize_title($title_base);

        return [
            'imageTitle' => $title_base,
            'title' => $title_base,
            'altText' => $title_base,
            'caption' => $caption,
            'description' => $description,
            'fileName' => $file_base !== '' ? $file_base : sanitize_title((string) pathinfo($file_name, PATHINFO_FILENAME)),
            'source' => 'local_context'
        ];
    }

    private function get_image_attachment_sequence_number(int $attachment_id, int $context_post_id): int
    {
        if ($context_post_id <= 0) {
            return 1;
        }

        $attachments = get_posts([
            'post_parent' => $context_post_id,
            'post_type' => 'attachment',
            'post_mime_type' => 'image',
            'post_status' => 'inherit',
            'orderby' => 'ID',
            'order' => 'ASC',
            'fields' => 'ids',
            'numberposts' => -1
        ]);

        if (!is_array($attachments) || empty($attachments)) {
            return 1;
        }

        $attachment_ids = array_values(array_map('intval', $attachments));
        $position = $attachment_id > 0 ? array_search($attachment_id, $attachment_ids, true) : count($attachment_ids);

        return is_int($position) ? $position + 1 : count($attachment_ids) + 1;
    }

    private function request_saas_image_attribute_values(int $attachment_id, string $file_name, int $context_post_id)
    {
        if (!$this->is_saas_site_ready()) {
            return null;
        }

        $payload = $this->build_image_attribute_generation_payload($attachment_id, $file_name, $context_post_id);
        $result = $this->request_saas_site_api('POST', 'image-attributes', $payload);
        if (is_wp_error($result)) {
            return null;
        }

        return $this->sanitize_image_attribute_generation_values($result);
    }

    private function build_image_attribute_generation_payload(int $attachment_id, string $file_name, int $context_post_id): array
    {
        $attachment = $attachment_id > 0 ? get_post($attachment_id) : null;
        $context_post = $context_post_id > 0 ? get_post($context_post_id) : null;
        $attached_file = $attachment_id > 0 ? get_attached_file($attachment_id) : '';
        $resolved_file_name = $file_name !== ''
            ? $file_name
            : (is_string($attached_file) && $attached_file !== '' ? basename($attached_file) : '');
        $context_excerpt = $context_post instanceof WP_Post
            ? $this->extract_plain_text_content($context_post->post_excerpt !== '' ? $context_post->post_excerpt : $context_post->post_content)
            : '';

        return [
            'attachmentId' => $attachment_id > 0 ? (string) $attachment_id : 'new-upload',
            'imageUrl' => $attachment_id > 0 ? (wp_get_attachment_url($attachment_id) ?: '') : '',
            'mimeType' => $attachment_id > 0 ? (get_post_mime_type($attachment_id) ?: '') : '',
            'fileName' => $resolved_file_name,
            'currentTitle' => $attachment instanceof WP_Post ? sanitize_text_field((string) get_the_title($attachment)) : '',
            'currentCaption' => $attachment instanceof WP_Post ? wp_strip_all_tags((string) $attachment->post_excerpt) : '',
            'currentDescription' => $attachment instanceof WP_Post ? wp_strip_all_tags((string) $attachment->post_content) : '',
            'currentAltText' => $attachment_id > 0 ? sanitize_textarea_field((string) get_post_meta($attachment_id, '_wp_attachment_image_alt', true)) : '',
            'attachedToCmsId' => $context_post_id > 0 ? (string) $context_post_id : '',
            'attachedToTitle' => $context_post instanceof WP_Post ? sanitize_text_field((string) get_the_title($context_post)) : '',
            'contextPostType' => $context_post instanceof WP_Post ? $this->normalize_synced_post_type((string) $context_post->post_type) : 'post',
            'contextTitle' => $context_post instanceof WP_Post ? sanitize_text_field((string) get_the_title($context_post)) : '',
            'contextSlug' => $context_post instanceof WP_Post ? sanitize_title((string) $context_post->post_name) : '',
            'contextExcerpt' => wp_trim_words($context_excerpt, 80, ''),
            'contextHtml' => $context_post instanceof WP_Post ? (string) $context_post->post_content : '',
            'sequenceNumber' => $this->get_image_attachment_sequence_number($attachment_id, $context_post_id),
            'locale' => str_replace('_', '-', get_locale())
        ];
    }

    private function sanitize_image_attribute_generation_values(array $values): array
    {
        $file_name = basename((string) ($values['fileName'] ?? ''));
        $file_base = $file_name !== '' ? preg_replace('/\.[^.]+$/', '', $file_name) : '';

        return [
            'imageTitle' => sanitize_text_field((string) ($values['imageTitle'] ?? $values['title'] ?? '')),
            'title' => sanitize_text_field((string) ($values['title'] ?? $values['imageTitle'] ?? '')),
            'altText' => sanitize_textarea_field((string) ($values['altText'] ?? '')),
            'caption' => sanitize_textarea_field((string) ($values['caption'] ?? '')),
            'description' => sanitize_textarea_field((string) ($values['description'] ?? '')),
            'fileName' => sanitize_title((string) $file_base),
            'source' => sanitize_key((string) ($values['source'] ?? 'ai'))
        ];
    }

    private function merge_image_attribute_values(array $fallback_values, array $remote_values): array
    {
        foreach ($remote_values as $key => $value) {
            if ($key === 'source' || trim((string) $value) !== '') {
                $fallback_values[$key] = $value;
            }
        }

        return $fallback_values;
    }

    private function render_image_attribute_text_from_values(array $values, string $attribute, int $attachment_id = 0): string
    {
        $settings = $this->get_image_attribute_settings();
        $rule = isset($settings['attributes'][$attribute]) && is_array($settings['attributes'][$attribute])
            ? $settings['attributes'][$attribute]
            : $this->get_image_attribute_rule($attribute, []);

        if (empty($rule['enabled'])) {
            return '';
        }

        $context = [
            '{{image_title}}' => (string) ($values['imageTitle'] ?? ''),
            '{{alt_text}}' => (string) ($values['altText'] ?? ''),
            '{{caption}}' => (string) ($values['caption'] ?? ''),
            '{{description}}' => (string) ($values['description'] ?? ''),
            '{{filename}}' => (string) ($values['fileName'] ?? ''),
            '{{separator}}' => '|',
            '{{site_title}}' => sanitize_text_field((string) get_bloginfo('name')),
            '{{attachment_id}}' => $attachment_id > 0 ? (string) $attachment_id : ''
        ];

        foreach ($context as $key => $value) {
            $context[str_replace(['{{', '}}'], ['{', '}'], $key)] = $value;
        }

        $format = trim((string) ($rule['format'] ?? '{{image_title}}'));
        $text = strtr($format !== '' ? $format : '{{image_title}}', $context);
        return $this->normalize_image_attribute_text($text, $rule);
    }

    private function normalize_image_attribute_text(string $text, array $rule): string
    {
        if (!empty($rule['strip_punctuation'])) {
            $text = str_replace('-', !empty($rule['space_hyphen']) ? ' ' : '-', $text);
            $text = str_replace('_', !empty($rule['space_underscore']) ? ' ' : '_', $text);
            $text = !empty($rule['strip_period']) ? str_replace('.', '', $text) : $text;
            $text = !empty($rule['strip_comma']) ? str_replace(',', '', $text) : $text;
            $text = !empty($rule['strip_plus']) ? str_replace('+', '', $text) : $text;
            $text = !empty($rule['strip_ampersand']) ? str_replace('&', '', $text) : $text;

            if (!empty($rule['strip_numbers'])) {
                $text = preg_replace('/\d+/', '', $text) ?? $text;
            }
        }

        $words_to_strip = preg_split('/\R+/', (string) ($rule['words_to_strip'] ?? '')) ?: [];
        foreach ($words_to_strip as $word) {
            $word = trim($word);
            if ($word !== '') {
                $text = preg_replace('/' . preg_quote($word, '/') . '/iu', '', $text) ?? $text;
            }
        }

        $text = preg_replace('/\s+/', ' ', trim($text)) ?? trim($text);
        return $this->apply_image_attribute_casing($text, (string) ($rule['casing'] ?? 'title'));
    }

    private function apply_image_attribute_casing(string $text, string $casing): string
    {
        if ($text === '' || $casing === 'disabled') {
            return $text;
        }

        if ($casing === 'lower') {
            return function_exists('mb_strtolower') ? mb_strtolower($text, 'UTF-8') : strtolower($text);
        }

        if ($casing === 'sentence') {
            $lower_text = function_exists('mb_strtolower') ? mb_strtolower($text, 'UTF-8') : strtolower($text);
            if (function_exists('mb_substr') && function_exists('mb_strtoupper')) {
                return mb_strtoupper(mb_substr($lower_text, 0, 1, 'UTF-8'), 'UTF-8') . mb_substr($lower_text, 1, null, 'UTF-8');
            }

            return ucfirst($lower_text);
        }

        return function_exists('mb_convert_case')
            ? mb_convert_case($text, MB_CASE_TITLE, 'UTF-8')
            : ucwords(strtolower($text));
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

    private function group_audit_issues_by_content_type(array $issues): array
    {
        $groups = [];

        foreach ($issues as $issue) {
            if (!is_array($issue)) {
                continue;
            }

            $category = $this->get_audit_issue_content_type($issue);
            $key = (string) $category['key'];
            if (!isset($groups[$key])) {
                $groups[$key] = [
                    'key' => $key,
                    'label' => (string) $category['label'],
                    'issues' => []
                ];
            }

            $groups[$key]['issues'][] = $issue;
        }

        uasort($groups, function (array $left, array $right): int {
            $left_order = $this->get_audit_issue_group_order((string) $left['key']);
            $right_order = $this->get_audit_issue_group_order((string) $right['key']);

            if ($left_order === $right_order) {
                return strcmp((string) $left['label'], (string) $right['label']);
            }

            return $left_order <=> $right_order;
        });

        return array_values($groups);
    }

    private function get_audit_issue_content_type(array $issue): array
    {
        $target_type = sanitize_key((string) ($issue['targetType'] ?? ''));
        $target_cms_id = (int) ($issue['targetCmsId'] ?? 0);

        if ($target_type === 'media' || $target_type === 'image') {
            $mime_type = $target_cms_id > 0 ? get_post_mime_type($target_cms_id) : '';
            $is_image = is_string($mime_type) && str_starts_with($mime_type, 'image/');

            return $is_image
                ? ['key' => 'image', 'label' => __('圖片', 'rankwoven-seo')]
                : ['key' => 'media', 'label' => __('媒體', 'rankwoven-seo')];
        }

        if ($target_type === 'article') {
            $post_type = $target_cms_id > 0 ? (string) get_post_type($target_cms_id) : '';
            $post_type = $post_type !== '' ? sanitize_key($post_type) : 'post';

            return [
                'key' => $post_type,
                'label' => $this->get_audit_issue_post_type_label($post_type)
            ];
        }

        return ['key' => 'unknown', 'label' => __('未分類', 'rankwoven-seo')];
    }

    private function get_audit_issue_post_type_label(string $post_type): string
    {
        $known_labels = [
            'post' => __('文章', 'rankwoven-seo'),
            'page' => __('頁面', 'rankwoven-seo'),
            'product' => __('商品', 'rankwoven-seo'),
            'portfolio' => __('Portfolio', 'rankwoven-seo')
        ];

        if (isset($known_labels[$post_type])) {
            return (string) $known_labels[$post_type];
        }

        $post_type_object = get_post_type_object($post_type);
        if (is_object($post_type_object)) {
            return sanitize_text_field((string) ($post_type_object->labels->singular_name ?? $post_type));
        }

        return __('文章', 'rankwoven-seo');
    }

    private function get_audit_issue_group_order(string $group_key): int
    {
        $order = [
            'post' => 10,
            'page' => 20,
            'product' => 30,
            'portfolio' => 40,
            'image' => 50,
            'media' => 60,
            'unknown' => 999
        ];

        return $order[$group_key] ?? 80;
    }

    private function get_audit_issue_apply_payload(array $issue): ?array
    {
        $target_type = sanitize_key((string) ($issue['targetType'] ?? ''));
        $target_cms_id = (int) ($issue['targetCmsId'] ?? 0);
        $field_name = $this->get_audit_issue_field_name($issue);
        $suggested_value = trim((string) ($issue['suggestedValue'] ?? ''));

        if ($target_cms_id <= 0 || $field_name === '' || $suggested_value === '') {
            return null;
        }

        $article_fields = ['title', 'metaDescription'];
        $media_fields = ['title', 'caption', 'description', 'altText'];
        if ($target_type === 'article' && in_array($field_name, $article_fields, true)) {
            return [
                'target_type' => $target_type,
                'target_cms_id' => $target_cms_id,
                'field_name' => $field_name,
                'suggested_value' => $suggested_value
            ];
        }

        if ($target_type === 'media' && in_array($field_name, $media_fields, true)) {
            return [
                'target_type' => $target_type,
                'target_cms_id' => $target_cms_id,
                'field_name' => $field_name,
                'suggested_value' => $suggested_value
            ];
        }

        return null;
    }

    private function get_audit_issue_field_name(array $issue): string
    {
        $field_name = sanitize_text_field((string) ($issue['fieldName'] ?? ''));
        if ($field_name !== '') {
            return $field_name;
        }

        $rule_code = strtoupper(sanitize_text_field((string) ($issue['ruleCode'] ?? '')));
        return match ($rule_code) {
            'ARTICLE_TITLE_LENGTH', 'MEDIA_TITLE_CONTEXT' => 'title',
            'ARTICLE_META_DESCRIPTION_LENGTH' => 'metaDescription',
            'MEDIA_CAPTION_CONTEXT' => 'caption',
            'MEDIA_DESCRIPTION_CONTEXT' => 'description',
            'MEDIA_ALT_TEXT_CONTEXT' => 'altText',
            default => ''
        };
    }

    private function apply_audit_issue_payload(array $payload)
    {
        $target_type = sanitize_key((string) ($payload['target_type'] ?? ''));
        $target_cms_id = (int) ($payload['target_cms_id'] ?? 0);
        $field_name = sanitize_text_field((string) ($payload['field_name'] ?? ''));
        $suggested_value = trim(sanitize_textarea_field((string) ($payload['suggested_value'] ?? '')));

        if ($target_cms_id <= 0 || $field_name === '' || $suggested_value === '') {
            return new WP_Error('rankwoven_audit_issue_invalid_payload', __('Audit issue apply payload is invalid.', 'rankwoven-seo'));
        }

        if ($target_type === 'article') {
            return $this->apply_audit_issue_to_article($target_cms_id, $field_name, $suggested_value);
        }

        if ($target_type === 'media') {
            return $this->apply_audit_issue_to_media($target_cms_id, $field_name, $suggested_value);
        }

        return new WP_Error('rankwoven_audit_issue_unsupported_target', __('This audit issue target cannot be applied automatically.', 'rankwoven-seo'));
    }

    private function apply_audit_issue_to_article(int $post_id, string $field_name, string $suggested_value)
    {
        $post = get_post($post_id);
        if (!($post instanceof WP_Post) || !in_array($post->post_type, $this->get_supported_editor_post_types(), true)) {
            return new WP_Error('rankwoven_audit_issue_article_not_found', __('Article not found or cannot be updated.', 'rankwoven-seo'));
        }

        if (!current_user_can('edit_post', $post_id)) {
            return new WP_Error('rankwoven_audit_issue_article_forbidden', __('You do not have permission to edit this content.', 'rankwoven-seo'));
        }

        if ($field_name === 'title') {
            $result = wp_update_post(wp_slash([
                'ID' => $post_id,
                'post_title' => sanitize_text_field($suggested_value)
            ]), true);

            return is_wp_error($result) ? $result : true;
        }

        if ($field_name === 'metaDescription') {
            foreach ($this->get_editor_seo_meta_description_keys() as $meta_key) {
                $this->save_editor_seo_meta_value($post_id, $meta_key, sanitize_textarea_field($suggested_value));
            }

            return true;
        }

        return new WP_Error('rankwoven_audit_issue_article_field_unsupported', __('This article field cannot be applied automatically.', 'rankwoven-seo'));
    }

    private function apply_audit_issue_to_media(int $attachment_id, string $field_name, string $suggested_value)
    {
        $attachment = get_post($attachment_id);
        if (!($attachment instanceof WP_Post) || $attachment->post_type !== 'attachment') {
            return new WP_Error('rankwoven_audit_issue_media_not_found', __('Media item not found or cannot be updated.', 'rankwoven-seo'));
        }

        if (!current_user_can('edit_post', $attachment_id)) {
            return new WP_Error('rankwoven_audit_issue_media_forbidden', __('You do not have permission to edit this media item.', 'rankwoven-seo'));
        }

        if ($field_name === 'altText') {
            update_post_meta($attachment_id, '_wp_attachment_image_alt', sanitize_textarea_field($suggested_value));
            return true;
        }

        $post_update = ['ID' => $attachment_id];
        if ($field_name === 'title') {
            $post_update['post_title'] = sanitize_text_field($suggested_value);
        } elseif ($field_name === 'caption') {
            $post_update['post_excerpt'] = wp_kses_post($suggested_value);
        } elseif ($field_name === 'description') {
            $post_update['post_content'] = wp_kses_post($suggested_value);
        } else {
            return new WP_Error('rankwoven_audit_issue_media_field_unsupported', __('This media field cannot be applied automatically.', 'rankwoven-seo'));
        }

        $result = wp_update_post(wp_slash($post_update), true);
        return is_wp_error($result) ? $result : true;
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

        return $this->get_readable_content_excerpt($suggested_value);
    }

    private function render_internal_link_candidate_list(array $suggestion): void
    {
        $suggested_value = (string) ($suggestion['suggestedValue'] ?? '');
        $internal_link_data = $this->decode_internal_link_suggestion_value($suggested_value);
        $links = !empty($internal_link_data['links'])
            ? $internal_link_data['links']
            : $this->get_internal_link_candidate_links_from_metadata($suggestion);

        if (empty($links)) {
            echo esc_html($this->get_suggestion_summary_text($suggested_value));
            return;
        }

        echo '<ul style="margin:0;">';
        foreach ($links as $link) {
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

    private function get_internal_link_candidate_links_from_metadata(array $suggestion): array
    {
        $metadata = $suggestion['metadata'] ?? [];
        if (is_string($metadata)) {
            $decoded_metadata = json_decode($metadata, true);
            $metadata = is_array($decoded_metadata) ? $decoded_metadata : [];
        }

        if (!is_array($metadata)) {
            return [];
        }

        $target_url = esc_url_raw((string) ($metadata['targetUrl'] ?? ''));
        $anchor_text = sanitize_text_field((string) ($metadata['anchorText'] ?? $metadata['targetTitle'] ?? ''));
        if ($target_url === '' || $anchor_text === '') {
            return [];
        }

        return [[
            'targetCmsId' => sanitize_text_field((string) ($metadata['targetCmsId'] ?? '')),
            'targetTitle' => sanitize_text_field((string) ($metadata['targetTitle'] ?? '')),
            'targetUrl' => $target_url,
            'anchorText' => $anchor_text,
            'relevance' => sanitize_text_field((string) ($metadata['relevance'] ?? '')),
            'reason' => sanitize_text_field((string) ($metadata['reason'] ?? ''))
        ]];
    }

    private function get_readable_content_excerpt(string $value, int $max_length = 220): string
    {
        $text = html_entity_decode($value, ENT_QUOTES | ENT_HTML5, get_bloginfo('charset') ?: 'UTF-8');
        $text = preg_replace('/<script\b[^>]*>.*?<\/script>/is', ' ', $text) ?? $text;
        $text = preg_replace('/<style\b[^>]*>.*?<\/style>/is', ' ', $text) ?? $text;
        $text = preg_replace('/\[(\/?)[a-zA-Z0-9_-]+(?:\s+[^\]]*)?\]/', ' ', $text) ?? $text;
        $text = strip_shortcodes($text);
        $text = wp_strip_all_tags($text, true);
        $text = preg_replace('/\s+/u', ' ', $text) ?? $text;
        $text = trim($text);

        if ($text === '') {
            return __('No readable content preview.', 'rankwoven-seo');
        }

        if (function_exists('mb_strlen') && function_exists('mb_substr')) {
            return mb_strlen($text) > $max_length
                ? mb_substr($text, 0, $max_length) . '...'
                : $text;
        }

        return strlen($text) > $max_length
            ? substr($text, 0, $max_length) . '...'
            : $text;
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
            'indexnow_submit_failed' => __('IndexNow submission failed. Please check the API Key and website URL.', 'rankwoven-seo'),
            'seo_audit_failed' => __('SEO Analysis failed. Please sync content, then check the SaaS API service.', 'rankwoven-seo'),
            'internal_links_rescan_failed' => __('Internal link rescan failed. Please check the SaaS API service and run sync again.', 'rankwoven-seo'),
            'audit_issue_apply_failed' => __('Audit issue could not be applied automatically. Please edit the content manually.', 'rankwoven-seo'),
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
        if (get_transient('rankwoven_webp_optimizer_merged')) {
            printf(
                '<div class="notice notice-success is-dismissible"><p>%s</p></div>',
                esc_html__('圖片優化功能已合併至 RankWoven SEO。舊的 WebP Image Optimizer 已停用，原有設定會沿用。請到「圖片優化」與「批量轉圖」分頁使用。', 'rankwoven-seo')
            );
            delete_transient('rankwoven_webp_optimizer_merged');
        }

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
            'robots_txt_saved' => ['updated', __('robots.txt settings saved.', 'rankwoven-seo')],
            'llms_settings_saved' => ['updated', __('LLMs.txt settings saved.', 'rankwoven-seo')],
            'rss_sitemap_settings_saved' => ['updated', __('RSS Sitemap settings saved.', 'rankwoven-seo')],
            'indexnow_settings_saved' => ['updated', __('IndexNow settings saved.', 'rankwoven-seo')],
            'indexnow_submitted' => ['updated', __('URLs submitted to IndexNow successfully.', 'rankwoven-seo')],
            'geo_settings_saved' => ['updated', __('GEO 設定已保存。', 'rankwoven-seo')],
            'seo_audit_completed' => ['updated', __('SEO Analysis completed.', 'rankwoven-seo')],
            'internal_links_rescan_completed' => ['updated', __('Internal links rescanned. Deleted content was removed from candidates and new suggestions were generated.', 'rankwoven-seo')],
            'internal_links_rescan_failed' => ['error', __('Internal link rescan failed. Please check the SaaS API service and Site Token.', 'rankwoven-seo')],
            'audit_issue_applied' => ['updated', __('SEO Analysis issue suggestion applied to WordPress content.', 'rankwoven-seo')],
            'audit_issue_apply_failed' => ['error', __('This SEO Analysis issue could not be applied automatically. Please edit the content manually.', 'rankwoven-seo')],
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
            'indexnow_submit_failed' => ['error', __('IndexNow submission failed. Please check the API Key and website URL.', 'rankwoven-seo')],
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
