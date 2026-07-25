<?php
/**
 * Plugin Name: RankWoven SEO
 * Description: Connects a WordPress site to RankWoven and syncs posts, pages, and image media for SEO optimization.
 * Version: 0.1.0
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
    private const VERSION = '0.1.0';
    private const OPTION_API_BASE_URL = 'rankwoven_api_base_url';
    private const OPTION_SITE_ID = 'rankwoven_site_id';
    private const OPTION_SITE_TOKEN = 'rankwoven_site_token';
    private const OPTION_WP_ADMIN_USERNAME = 'rankwoven_wp_admin_username';
    private const OPTION_WP_APPLICATION_PASSWORD = 'rankwoven_wp_application_password';
    private const OPTION_LAST_SYNC_RESULT = 'rankwoven_last_sync_result';
    private const REST_NAMESPACE = 'rankwoven/v1';

    public function __construct()
    {
        add_action('admin_menu', [$this, 'register_admin_page']);
        add_action('admin_post_rankwoven_save_settings', [$this, 'handle_save_settings']);
        add_action('admin_post_rankwoven_connect_site', [$this, 'handle_connect_site']);
        add_action('admin_post_rankwoven_sync_content', [$this, 'handle_sync_content']);
        add_action('rest_api_init', [$this, 'register_rest_routes']);
    }

    public function register_admin_page(): void
    {
        add_options_page(
            __('RankWoven SEO', 'rankwoven-seo'),
            __('RankWoven SEO', 'rankwoven-seo'),
            'manage_options',
            'rankwoven-seo',
            [$this, 'render_admin_page']
        );
    }

    public function render_admin_page(): void
    {
        if (!current_user_can('manage_options')) {
            return;
        }

        $api_base_url = get_option(self::OPTION_API_BASE_URL, 'http://localhost:3011');
        $site_id = get_option(self::OPTION_SITE_ID, '');
        $site_token = get_option(self::OPTION_SITE_TOKEN, '');
        $wp_admin_username = get_option(self::OPTION_WP_ADMIN_USERNAME, '');
        $wp_application_password = get_option(self::OPTION_WP_APPLICATION_PASSWORD, '');
        $last_sync_result = get_option(self::OPTION_LAST_SYNC_RESULT, []);
        ?>
        <div class="wrap">
            <h1><?php echo esc_html__('RankWoven SEO', 'rankwoven-seo'); ?></h1>
            <?php $this->render_admin_notice(); ?>

            <h2><?php echo esc_html__('API Connection', 'rankwoven-seo'); ?></h2>
            <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
                <?php wp_nonce_field('rankwoven_save_settings'); ?>
                <input type="hidden" name="action" value="rankwoven_save_settings" />
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
                            <label for="rankwoven_site_id"><?php echo esc_html__('Site ID', 'rankwoven-seo'); ?></label>
                        </th>
                        <td>
                            <input
                                id="rankwoven_site_id"
                                name="rankwoven_site_id"
                                type="text"
                                class="regular-text"
                                value="<?php echo esc_attr($site_id); ?>"
                            />
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">
                            <label for="rankwoven_site_token"><?php echo esc_html__('Site Token', 'rankwoven-seo'); ?></label>
                        </th>
                        <td>
                            <input
                                id="rankwoven_site_token"
                                name="rankwoven_site_token"
                                type="password"
                                class="regular-text"
                                value="<?php echo esc_attr($site_token); ?>"
                                autocomplete="off"
                            />
                            <p class="description">
                                <?php echo esc_html__('If this token was regenerated or revoked in RankWoven, paste the new Site Token here and save settings before syncing again.', 'rankwoven-seo'); ?>
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
                    </tbody>
                </table>
            <?php endif; ?>
        </div>
        <?php
    }

    public function handle_save_settings(): void
    {
        $this->assert_admin_action('rankwoven_save_settings');

        update_option(
            self::OPTION_API_BASE_URL,
            esc_url_raw(wp_unslash($_POST['rankwoven_api_base_url'] ?? ''))
        );
        update_option(
            self::OPTION_SITE_ID,
            sanitize_text_field(wp_unslash($_POST['rankwoven_site_id'] ?? ''))
        );
        update_option(
            self::OPTION_SITE_TOKEN,
            sanitize_text_field(wp_unslash($_POST['rankwoven_site_token'] ?? ''))
        );
        $wp_admin_username = sanitize_text_field(wp_unslash($_POST['rankwoven_wp_admin_username'] ?? ''));
        $wp_application_password = sanitize_text_field(wp_unslash($_POST['rankwoven_wp_application_password'] ?? ''));

        update_option(self::OPTION_WP_ADMIN_USERNAME, $wp_admin_username);

        if ($wp_admin_username === '') {
            delete_option(self::OPTION_WP_APPLICATION_PASSWORD);
        } elseif ($wp_application_password !== '') {
            update_option(self::OPTION_WP_APPLICATION_PASSWORD, $wp_application_password);
        }

        $site_id = sanitize_text_field(get_option(self::OPTION_SITE_ID, ''));
        if ($site_id !== '' && $wp_admin_username !== '' && $wp_application_password !== '') {
            if (!$this->sync_wordpress_credentials_to_saas($site_id, $wp_admin_username, $wp_application_password)) {
                $this->redirect_with_status('wordpress_credentials_update_failed');
            }

            $this->redirect_with_status('wordpress_credentials_updated');
        }

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

        $response = wp_remote_post($this->build_api_url('/api/v1/site-connections'), [
            'timeout' => 30,
            'headers' => [
                'Content-Type' => 'application/json'
            ],
            'body' => wp_json_encode([
                'platform' => 'wordpress',
                'name' => get_bloginfo('name'),
                'siteUrl' => home_url('/'),
                'cmsVersion' => get_bloginfo('version'),
                'pluginVersion' => self::VERSION,
                'wordpressAdminUsername' => $wp_credentials['username'],
                'wordpressApplicationPassword' => $wp_credentials['applicationPassword']
            ])
        ]);

        if (is_wp_error($response)) {
            $this->redirect_with_status('connection_failed');
        }

        $body = $this->decode_response_body($response);
        if (!($body['success'] ?? false) || empty($body['data']['site']['id']) || empty($body['data']['apiToken'])) {
            $this->redirect_with_status('connection_failed');
        }

        update_option(self::OPTION_SITE_ID, sanitize_text_field($body['data']['site']['id']));
        update_option(self::OPTION_SITE_TOKEN, sanitize_text_field($body['data']['apiToken']));

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

        $articles = $this->get_synced_articles(100, 1);
        $media = $this->get_synced_media(100, 1);
        $response = wp_remote_post($this->build_api_url('/api/v1/site-connections/' . rawurlencode($site_id) . '/sync'), [
            'timeout' => 45,
            'headers' => [
                'Authorization' => 'Bearer ' . $site_token,
                'Content-Type' => 'application/json'
            ],
            'body' => wp_json_encode([
                'syncStartedAt' => gmdate('c'),
                'articles' => $articles,
                'media' => $media
            ])
        ]);

        if (is_wp_error($response)) {
            $this->redirect_with_status('sync_failed');
        }

        $body = $this->decode_response_body($response);
        if (!($body['success'] ?? false)) {
            $error_code = $body['error']['code'] ?? '';
            if (wp_remote_retrieve_response_code($response) === 401 || $error_code === 'SITE_TOKEN_INVALID') {
                $this->redirect_with_status('site_token_invalid');
            }

            $this->redirect_with_status('sync_failed');
        }

        update_option(self::OPTION_LAST_SYNC_RESULT, [
            'syncedAt' => gmdate('c'),
            'articlesReceived' => (int) ($body['data']['articlesReceived'] ?? count($articles)),
            'mediaReceived' => (int) ($body['data']['mediaReceived'] ?? count($media))
        ]);

        $this->redirect_with_status('sync_completed');
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

        register_rest_route(self::REST_NAMESPACE, '/media', [
            'methods' => 'GET',
            'callback' => [$this, 'get_media_rest_response'],
            'permission_callback' => [$this, 'authorize_rest_request'],
            'args' => $this->get_pagination_args()
        ]);
    }

    public function authorize_rest_request(WP_REST_Request $request): bool
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

        return new WP_REST_Response([
            'articles' => $this->get_synced_articles($per_page, $page),
            'page' => $page,
            'perPage' => $per_page
        ]);
    }

    public function get_media_rest_response(WP_REST_Request $request): WP_REST_Response
    {
        $per_page = (int) $request->get_param('perPage');
        $page = (int) $request->get_param('page');

        return new WP_REST_Response([
            'media' => $this->get_synced_media($per_page, $page),
            'page' => $page,
            'perPage' => $per_page
        ]);
    }

    private function get_synced_articles(int $per_page, int $page): array
    {
        $posts = get_posts([
            'post_type' => ['post', 'page'],
            'post_status' => ['publish', 'draft', 'pending', 'future'],
            'posts_per_page' => $this->normalize_per_page($per_page),
            'paged' => max(1, $page),
            'orderby' => 'modified',
            'order' => 'DESC',
            'no_found_rows' => true
        ]);

        return array_map([$this, 'map_post_to_synced_article'], $posts);
    }

    private function get_synced_media(int $per_page, int $page): array
    {
        $attachments = get_posts([
            'post_type' => 'attachment',
            'post_status' => 'inherit',
            'post_mime_type' => 'image',
            'posts_per_page' => $this->normalize_per_page($per_page),
            'paged' => max(1, $page),
            'orderby' => 'modified',
            'order' => 'DESC',
            'no_found_rows' => true
        ]);

        return array_map([$this, 'map_attachment_to_synced_media'], $attachments);
    }

    private function map_post_to_synced_article(WP_Post $post): array
    {
        $categories = wp_get_post_terms($post->ID, 'category', ['fields' => 'names']);
        $tags = wp_get_post_terms($post->ID, 'post_tag', ['fields' => 'names']);
        $featured_image_id = get_post_thumbnail_id($post->ID);
        $excerpt = $post->post_excerpt !== ''
            ? $post->post_excerpt
            : wp_trim_words(wp_strip_all_tags($post->post_content), 40, '');

        return [
            'cmsId' => (string) $post->ID,
            'type' => $post->post_type === 'page' ? 'page' : 'post',
            'title' => get_the_title($post),
            'slug' => $post->post_name,
            'status' => get_post_status($post),
            'url' => get_permalink($post) ?: '',
            'excerpt' => $excerpt,
            'contentHtml' => $post->post_content,
            'author' => get_the_author_meta('display_name', (int) $post->post_author),
            'categories' => is_wp_error($categories) ? [] : $categories,
            'tags' => is_wp_error($tags) ? [] : $tags,
            'featuredImageId' => $featured_image_id ? (string) $featured_image_id : '',
            'publishedAt' => $this->get_post_date_value($post, false),
            'updatedAt' => $this->get_post_date_value($post, true)
        ];
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
            'altText' => get_post_meta($attachment->ID, '_wp_attachment_image_alt', true),
            'attachedToCmsId' => $attachment->post_parent > 0 ? (string) $attachment->post_parent : '',
            'updatedAt' => $this->get_post_date_value($attachment, true)
        ];
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
            ]
        ];
    }

    private function normalize_per_page(int $per_page): int
    {
        return min(100, max(1, $per_page));
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

    private function sync_wordpress_credentials_to_saas(
        string $site_id,
        string $wp_admin_username,
        string $wp_application_password
    ): bool {
        if ($this->get_api_base_url() === '') {
            return false;
        }

        $response = wp_remote_request(
            $this->build_api_url('/api/v1/site-connections/' . rawurlencode($site_id) . '/wordpress-credentials'),
            [
                'method' => 'PUT',
                'timeout' => 30,
                'headers' => [
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

    private function redirect_with_status(string $status): void
    {
        wp_safe_redirect(add_query_arg([
            'page' => 'rankwoven-seo',
            'rankwoven_status' => $status
        ], admin_url('options-general.php')));
        exit;
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
            'missing_api_base_url' => ['error', __('Please set the API Base URL first.', 'rankwoven-seo')],
            'missing_site_credentials' => ['error', __('Please connect this site before syncing content.', 'rankwoven-seo')],
            'missing_wordpress_application_password' => ['error', __('Please save a WordPress administrator username and application password before connecting this site.', 'rankwoven-seo')],
            'wordpress_credentials_update_failed' => ['error', __('WordPress application password was saved locally, but RankWoven could not update the SaaS credential record. Please check the API service.', 'rankwoven-seo')],
            'site_token_invalid' => ['error', __('The Site Token is invalid or has been revoked. Regenerate the token in RankWoven, paste the new token here, then sync again.', 'rankwoven-seo')],
            'connection_failed' => ['error', __('Site connection failed. Please check the API service.', 'rankwoven-seo')],
            'sync_failed' => ['error', __('Content sync failed. Please check the Site Token and API service.', 'rankwoven-seo')]
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
