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
    private const OPTION_IMAGE_ATTRIBUTE_SETTINGS = 'rankwoven_image_attribute_settings';
    private const OPTION_IMAGE_BULK_LAST_ID = 'rankwoven_image_bulk_last_id';
    private const OPTION_IMAGE_BULK_LOG = 'rankwoven_image_bulk_log';
    private const IMAGE_BULK_BATCH_SIZE = 50;
    private const REST_NAMESPACE = 'rankwoven/v1';

    public function __construct()
    {
        add_action('admin_menu', [$this, 'register_admin_page']);
        add_action('admin_post_rankwoven_save_settings', [$this, 'handle_save_settings']);
        add_action('admin_post_rankwoven_connect_site', [$this, 'handle_connect_site']);
        add_action('admin_post_rankwoven_sync_content', [$this, 'handle_sync_content']);
        add_action('admin_post_rankwoven_save_image_attributes', [$this, 'handle_save_image_attributes']);
        add_action('admin_post_rankwoven_test_image_attributes', [$this, 'handle_test_image_attributes']);
        add_action('admin_post_rankwoven_bulk_update_image_attributes', [$this, 'handle_bulk_update_image_attributes']);
        add_action('admin_post_rankwoven_reset_image_bulk_counter', [$this, 'handle_reset_image_bulk_counter']);
        add_action('add_attachment', [$this, 'handle_new_attachment']);
        add_filter('the_content', [$this, 'add_image_title_attributes_to_content']);
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
        $active_tab = $this->get_active_admin_tab();
        ?>
        <div class="wrap">
            <h1><?php echo esc_html__('RankWoven SEO', 'rankwoven-seo'); ?></h1>
            <?php $this->render_admin_notice(); ?>
            <?php $this->render_admin_tabs($active_tab); ?>

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

    private function render_admin_tabs(string $active_tab): void
    {
        $tabs = [
            'connection' => __('Site Connection', 'rankwoven-seo'),
            'image_attributes' => __('Image Attributes', 'rankwoven-seo'),
            'image_bulk' => __('Bulk Updater', 'rankwoven-seo')
        ];
        ?>
        <h2 class="nav-tab-wrapper">
            <?php foreach ($tabs as $tab => $label) : ?>
                <a
                    class="nav-tab <?php echo $active_tab === $tab ? 'nav-tab-active' : ''; ?>"
                    href="<?php echo esc_url(add_query_arg([
                        'page' => 'rankwoven-seo',
                        'rankwoven_tab' => $tab
                    ], admin_url('options-general.php'))); ?>"
                >
                    <?php echo esc_html($label); ?>
                </a>
            <?php endforeach; ?>
        </h2>
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

    private function get_active_admin_tab(): string
    {
        $tab = sanitize_key(wp_unslash($_GET['rankwoven_tab'] ?? 'connection'));
        return in_array($tab, ['connection', 'image_attributes', 'image_bulk'], true) ? $tab : 'connection';
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

    private function render_admin_post_button(string $action, string $nonce_action, string $label, string $type): void
    {
        ?>
        <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" style="display:inline-block;margin:0 8px 0 0;">
            <?php wp_nonce_field($nonce_action); ?>
            <input type="hidden" name="action" value="<?php echo esc_attr($action); ?>" />
            <?php submit_button($label, $type, 'submit', false); ?>
        </form>
        <?php
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

    private function redirect_with_status(string $status, string $tab = 'connection'): void
    {
        wp_safe_redirect(add_query_arg([
            'page' => 'rankwoven-seo',
            'rankwoven_tab' => $tab,
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
            'image_attribute_settings_saved' => ['updated', __('Image attribute settings saved.', 'rankwoven-seo')],
            'image_bulk_test_completed' => ['updated', __('Test bulk update completed for one image.', 'rankwoven-seo')],
            'image_bulk_completed' => ['updated', __('Bulk image attribute update completed for the next batch.', 'rankwoven-seo')],
            'image_bulk_counter_reset' => ['updated', __('Bulk updater counter reset.', 'rankwoven-seo')],
            'image_bulk_no_images' => ['updated', __('No remaining image attachments were found.', 'rankwoven-seo')],
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
