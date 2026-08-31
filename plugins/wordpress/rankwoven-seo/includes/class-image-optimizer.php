<?php
/**
 * RankWoven 圖片優化模組
 *
 * 由 webp-image-optimizer 合併而來：上傳轉換 WebP/AVIF、水印、
 * 產品圖縮放、媒體庫批量轉換、從網址上傳。
 */

if (!defined('ABSPATH')) {
    exit;
}

if (!defined('WEBP_OPTIMIZER_VERSION')) {
    define('WEBP_OPTIMIZER_VERSION', '2.1.0');
}

if (!defined('WEBP_OPTIMIZER_PLUGIN_URL')) {
    define('WEBP_OPTIMIZER_PLUGIN_URL', plugin_dir_url(dirname(__DIR__) . '/rankwoven-seo.php'));
}

if (!defined('WEBP_OPTIMIZER_PLUGIN_PATH')) {
    define('WEBP_OPTIMIZER_PLUGIN_PATH', plugin_dir_path(dirname(__DIR__) . '/rankwoven-seo.php'));
}

class RankWoven_Image_Optimizer {
    /**
     * 設置快取，減少頻繁讀取 option 的開銷
     * @var array|null
     */
    private $cached_settings = null;

    /**
     * 支援檢測快取
     */
    private $webp_support_cached = null;
    private $avif_support_cached = null;

    public function __construct() {
        static $booted = false;
        if ($booted) {
            return;
        }
        $booted = true;

        add_action('init', array($this, 'init'));
    }

    public function init() {
        // 檢查PHP版本和WordPress版本
        if (version_compare(PHP_VERSION, '7.4', '<')) {
            add_action('admin_notices', array($this, 'php_version_notice'));
            return;
        }

        if (version_compare(get_bloginfo('version'), '5.0', '<')) {
            add_action('admin_notices', array($this, 'wp_version_notice'));
            return;
        }

        // 初始化插件
        $this->init_hooks();
    }

    /**
     * 初始化插件
     */
    public function init_hooks() {
        // 只保留上傳時自動轉換，其他功能改為手動觸發以節省服務器資源
        add_filter('wp_handle_upload', array($this, 'convert_image_on_upload'), 10, 2);

        // 移除自動處理鉤子，改為手動觸發
        // add_filter('wp_generate_attachment_metadata', array($this, 'convert_thumbnails'), 10, 2);
        // add_filter('woocommerce_product_get_image_id', array($this, 'process_woo_product_image'), 10, 2);
        // add_filter('woocommerce_product_get_gallery_image_ids', array($this, 'process_woo_gallery_images'), 10, 2);
        // add_action('add_attachment', array($this, 'process_watermark_after_upload'));
        // add_action('add_attachment', array($this, 'update_uploaded_attachment_metadata'));

        // 後台選單由 RankWoven SEO 分頁承載，不再單獨註冊

        // 註冊設置
        add_action('admin_init', array($this, 'register_settings'));

        // 添加管理頁面樣式
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_scripts'));

        // 添加AJAX處理
        add_action('wp_ajax_webp_optimizer_batch_convert', array($this, 'ajax_batch_convert'));
        add_action('wp_ajax_webp_optimizer_scan_database', array($this, 'ajax_scan_database'));
        add_action('wp_ajax_webp_optimizer_fix_database', array($this, 'ajax_fix_database'));
        add_action('wp_ajax_webp_optimizer_get_progress', array($this, 'ajax_get_progress'));
        add_action('wp_ajax_webp_optimizer_resize_product_images', array($this, 'ajax_resize_product_images'));

        // 添加媒體庫列
        add_filter('manage_media_columns', array($this, 'add_media_columns'));
        add_action('manage_media_custom_column', array($this, 'media_column_content'), 10, 2);

        // 添加媒體庫批量操作
        add_filter('bulk_actions-upload', array($this, 'add_bulk_actions'));
        add_filter('handle_bulk_actions-upload', array($this, 'handle_bulk_actions'), 10, 3);

        // 添加產品圖片尺寸檢查和處理
        add_action('wp_ajax_webp_optimizer_check_product_image_sizes', array($this, 'ajax_check_product_image_sizes'));

        // 媒體上傳介面：從網址下載檔案並加入 WordPress 媒體庫
        add_action('post-upload-ui', array($this, 'render_url_upload_ui'));
        add_action('wp_enqueue_media', array($this, 'enqueue_media_url_upload_assets'));
        add_action('wp_ajax_webp_optimizer_upload_from_url', array($this, 'ajax_upload_from_url'));
    }

    /**
     * 加載管理頁面樣式
     */
    public function enqueue_admin_scripts($hook) {
        // 只在 RankWoven 圖片優化分頁加載樣式
        if (
            strpos($hook, 'webp-image-optimizer') !== false
            || strpos($hook, 'webp-batch-convert') !== false
            || strpos($hook, 'rankwoven-seo-image-optimizer') !== false
            || strpos($hook, 'rankwoven-seo-image-convert') !== false
        ) {
            wp_enqueue_style(
                'webp-optimizer-admin',
                WEBP_OPTIMIZER_PLUGIN_URL . 'assets/css/admin-style.css',
                array(),
                WEBP_OPTIMIZER_VERSION
            );

            wp_enqueue_script(
                'webp-optimizer-admin',
                WEBP_OPTIMIZER_PLUGIN_URL . 'assets/js/admin-script.js',
                array('jquery'),
                WEBP_OPTIMIZER_VERSION,
                true
            );

            wp_localize_script('webp-optimizer-admin', 'webp_optimizer_ajax', array(
                'nonce' => wp_create_nonce('webp_optimizer_batch_convert')
            ));
        }

        // 在媒體庫頁面加載樣式
        if ($hook === 'upload.php' || $hook === 'media-new.php') {
            $this->enqueue_media_url_upload_assets();
        }
    }

    /**
     * 在媒體上傳介面（上傳檔案分頁）顯示「從網址上傳」輸入框與按鈕
     * 掛在 post-upload-ui，會出現在「上傳檔案大小上限」文字下方
     */
    public function render_url_upload_ui() {
        if (!current_user_can('upload_files')) {
            return;
        }
        ?>
        <div class="webp-url-upload">
            <div class="webp-url-upload-row">
                <label class="screen-reader-text"><?php esc_html_e('媒體網址', 'webp-image-optimizer'); ?></label>
                <input
                    type="url"
                    class="webp-url-upload-input"
                    placeholder="<?php echo esc_attr__('請貼上媒體網址（圖片、影片、音訊等）', 'webp-image-optimizer'); ?>"
                    autocomplete="off"
                    spellcheck="false"
                    inputmode="url"
                />
                <button type="button" class="button button-primary webp-url-upload-btn">
                    <?php esc_html_e('從網址上傳', 'webp-image-optimizer'); ?>
                </button>
            </div>
            <p class="webp-url-upload-status" aria-live="polite"></p>
        </div>
        <?php
    }

    /**
     * 當 wp.media 載入時，一併載入從網址上傳的腳本與樣式
     */
    public function enqueue_media_url_upload_assets() {
        static $enqueued = false;
        if ($enqueued) {
            return;
        }
        $enqueued = true;

        wp_enqueue_style(
            'webp-optimizer-url-upload',
            WEBP_OPTIMIZER_PLUGIN_URL . 'assets/css/admin-style.css',
            array(),
            WEBP_OPTIMIZER_VERSION
        );

        wp_enqueue_script(
            'webp-optimizer-url-upload',
            WEBP_OPTIMIZER_PLUGIN_URL . 'assets/js/media-url-upload.js',
            array('jquery'),
            WEBP_OPTIMIZER_VERSION,
            true
        );

        wp_localize_script('webp-optimizer-url-upload', 'webpUrlUpload', array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce'   => wp_create_nonce('webp_optimizer_upload_from_url'),
            'i18n'    => array(
                'emptyUrl'    => __('請貼上媒體網址', 'webp-image-optimizer'),
                'invalidUrl'  => __('請輸入有效的網址（需以 http:// 或 https:// 開頭）', 'webp-image-optimizer'),
                'uploading'   => __('正在下載並上傳到媒體庫…', 'webp-image-optimizer'),
                'success'     => __('上傳成功，已加入媒體庫', 'webp-image-optimizer'),
                'error'       => __('上傳失敗', 'webp-image-optimizer'),
                'network'     => __('網路錯誤，請稍後再試', 'webp-image-optimizer'),
            ),
        ));
    }

    /**
     * AJAX：從遠端網址下載媒體並寫入 WordPress 媒體庫
     */
    public function ajax_upload_from_url() {
        check_ajax_referer('webp_optimizer_upload_from_url', 'nonce');

        if (!current_user_can('upload_files')) {
            wp_send_json_error(__('沒有上傳檔案的權限', 'webp-image-optimizer'));
        }

        $url = isset($_POST['media_url']) ? trim(wp_unslash($_POST['media_url'])) : '';
        $post_id = isset($_POST['post_id']) ? absint($_POST['post_id']) : 0;

        if ($url === '') {
            wp_send_json_error(__('請貼上媒體網址', 'webp-image-optimizer'));
        }

        if (strlen($url) > 2048) {
            wp_send_json_error(__('網址過長', 'webp-image-optimizer'));
        }

        if (!preg_match('#^https?://#i', $url)) {
            wp_send_json_error(__('請輸入有效的網址（需以 http:// 或 https:// 開頭）', 'webp-image-optimizer'));
        }

        $validated_url = wp_http_validate_url($url);
        if (!$validated_url) {
            wp_send_json_error(__('網址無效，或指向不允許下載的位址', 'webp-image-optimizer'));
        }

        if (!function_exists('download_url')) {
            require_once ABSPATH . 'wp-admin/includes/file.php';
        }
        if (!function_exists('media_handle_sideload')) {
            require_once ABSPATH . 'wp-admin/includes/media.php';
            require_once ABSPATH . 'wp-admin/includes/image.php';
        }

        @set_time_limit(300);

        $tmp = download_url($validated_url, 300);
        if (is_wp_error($tmp)) {
            wp_send_json_error(sprintf(
                /* translators: %s: error message */
                __('下載失敗：%s', 'webp-image-optimizer'),
                $tmp->get_error_message()
            ));
        }

        $max_size = wp_max_upload_size();
        if ($max_size && file_exists($tmp) && filesize($tmp) > $max_size) {
            @unlink($tmp);
            wp_send_json_error(__('檔案超過網站允許的上傳大小上限', 'webp-image-optimizer'));
        }

        $detected_mime = '';
        if (function_exists('mime_content_type') && file_exists($tmp)) {
            $raw_mime = mime_content_type($tmp);
            if (is_string($raw_mime) && $raw_mime !== '') {
                $detected_mime = strtolower(trim((string) strtok($raw_mime, ';')));
            }
        }

        if ($detected_mime && (strpos($detected_mime, 'text/html') === 0 || $detected_mime === 'application/xhtml+xml')) {
            @unlink($tmp);
            wp_send_json_error(__('網址指向的是網頁，不是媒體檔案。請貼上圖片、影片或音訊的直接連結。', 'webp-image-optimizer'));
        }

        $filename = $this->get_sideload_filename_from_url($validated_url, $tmp);
        $check = wp_check_filetype_and_ext($tmp, $filename);

        if (empty($check['type']) || empty($check['ext'])) {
            @unlink($tmp);
            wp_send_json_error(__('無法識別檔案類型，或此類型不允許上傳。請確認網址指向圖片、影片或音訊檔案本身，而不是網頁。', 'webp-image-optimizer'));
        }

        if (!empty($check['proper_filename'])) {
            $filename = $check['proper_filename'];
        } elseif (empty(pathinfo($filename, PATHINFO_EXTENSION))) {
            $filename .= '.' . $check['ext'];
        }

        $file_array = array(
            'name'     => $filename,
            'tmp_name' => $tmp,
            'type'     => $check['type'],
        );

        $attachment_id = media_handle_sideload($file_array, $post_id);

        if (is_wp_error($attachment_id)) {
            if (file_exists($tmp)) {
                @unlink($tmp);
            }
            wp_send_json_error(sprintf(
                /* translators: %s: error message */
                __('寫入媒體庫失敗：%s', 'webp-image-optimizer'),
                $attachment_id->get_error_message()
            ));
        }

        if (!function_exists('wp_prepare_attachment_for_js')) {
            require_once ABSPATH . 'wp-admin/includes/media.php';
        }

        $attachment = wp_prepare_attachment_for_js($attachment_id);
        if (!$attachment) {
            wp_send_json_error(__('上傳成功，但無法讀取附件資料', 'webp-image-optimizer'));
        }

        wp_send_json_success($attachment);
    }

    /**
     * 依網址與暫存檔推斷可寫入媒體庫的檔名
     *
     * @param string $url      遠端網址
     * @param string $tmp_file 本機暫存路徑
     * @return string
     */
    private function get_sideload_filename_from_url($url, $tmp_file) {
        $path = wp_parse_url($url, PHP_URL_PATH);
        $filename = '';

        if (!empty($path)) {
            $filename = basename(rawurldecode($path));
        }

        $filename = preg_replace('/[?#].*$/', '', $filename);
        $filename = sanitize_file_name($filename);

        $mime = '';
        if (function_exists('mime_content_type') && file_exists($tmp_file)) {
            $raw_mime = mime_content_type($tmp_file);
            if (is_string($raw_mime) && $raw_mime !== '') {
                $mime = strtolower(trim((string) strtok($raw_mime, ';')));
            }
        }

        if ($mime && strpos($mime, 'text/html') === 0) {
            return $filename;
        }

        $detected_ext = $this->extension_from_mime($mime);
        $current_ext = strtolower((string) pathinfo($filename, PATHINFO_EXTENSION));

        if ($filename === '' || $filename === '.' || $current_ext === '') {
            $base = pathinfo($filename, PATHINFO_FILENAME);
            if ($base === '' || $base === $filename) {
                $base = 'remote-media-' . gmdate('YmdHis');
            }
            if ($detected_ext) {
                $filename = $base . '.' . $detected_ext;
            } else {
                $filename = $base;
            }
        }

        return sanitize_file_name($filename);
    }

    /**
     * 將 MIME 對應到允許上傳的副檔名
     *
     * @param string $mime MIME 類型
     * @return string
     */
    private function extension_from_mime($mime) {
        if ($mime === '') {
            return '';
        }

        $map = array(
            'image/jpeg'      => 'jpg',
            'image/jpg'       => 'jpg',
            'image/png'       => 'png',
            'image/gif'       => 'gif',
            'image/webp'      => 'webp',
            'image/avif'      => 'avif',
            'image/bmp'       => 'bmp',
            'image/svg+xml'   => 'svg',
            'video/mp4'       => 'mp4',
            'video/webm'      => 'webm',
            'video/ogg'       => 'ogv',
            'video/quicktime' => 'mov',
            'audio/mpeg'      => 'mp3',
            'audio/mp3'       => 'mp3',
            'audio/wav'       => 'wav',
            'audio/ogg'       => 'ogg',
            'audio/aac'       => 'aac',
            'application/pdf' => 'pdf',
        );

        if (isset($map[$mime])) {
            return $map[$mime];
        }

        foreach (get_allowed_mime_types() as $exts => $type) {
            if ($type === $mime) {
                $parts = explode('|', $exts);
                return $parts[0];
            }
        }

        return '';
    }

    /**
     * 上傳時自動轉換圖片
     */
    public function convert_image_on_upload($upload, $context) {
        // 檢查是否為圖片文件
        if (!$this->is_image_file($upload['file'])) {
            return $upload;
        }

        // 檢查是否為水印圖片，如果是則跳過轉換
        if ($this->is_watermark_image($upload['file'])) {
            return $upload;
        }

        // 獲取設置
        $settings = $this->get_settings();
        $target_format = isset($settings['target_format']) ? $settings['target_format'] : 'webp';

        // 檢查是否支持目標格式
        if ($target_format === 'webp' && !$this->is_webp_supported()) {
            return $upload;
        }

        if ($target_format === 'avif' && !$this->is_avif_supported()) {
            return $upload;
        }

        // 檢測是否為WooCommerce產品圖片
        $is_woo_product = $this->is_woocommerce_product_image($upload, $context);
        $convert_context = $is_woo_product ? 'woocommerce_product' : 'general';

        // 在上傳時，我們需要先轉換圖片，然後在後續的處理中添加水印
        // 因為此時還沒有attachment_id，所以水印會在process_watermark_after_upload中處理
        $result = $this->convert_image($upload['file'], $settings, $target_format, $convert_context, null);

        if ($result && $result !== $upload['file']) {
            // 更新上傳信息
            $upload['file'] = $result;
            $upload['url'] = str_replace(ABSPATH, site_url('/'), $result);
            $upload['type'] = $target_format === 'webp' ? 'image/webp' : 'image/avif';
        }

        return $upload;
    }

    /**
     * 檢測是否為水印圖片
     */
    private function is_watermark_image($file_path) {
        // 檢查是否有水印標記文件
        $marker_file = $file_path . '.watermark';
        if (file_exists($marker_file)) {
            return true;
        }

        // 檢查文件路徑是否包含 watermarks 目錄
        if (strpos($file_path, '/watermarks/') !== false) {
            return true;
        }

        // 檢查文件名是否包含水印相關關鍵詞
        $file_name = basename($file_path);
        $watermark_keywords = array('watermark', 'logo', 'dark_logo', 'light_logo', '水印', '標誌');
        foreach ($watermark_keywords as $keyword) {
            if (stripos($file_name, $keyword) !== false) {
                return true;
            }
        }

        // 檢查是否在管理頁面上傳水印
        if (isset($_POST['action']) && $_POST['action'] === 'update') {
            if (isset($_POST['option_page']) && $_POST['option_page'] === 'webp-image-optimizer') {
                if (isset($_FILES['watermark_dark_logo']) || isset($_FILES['watermark_light_logo'])) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * 檢測是否為WooCommerce產品圖片
     */
    private function is_woocommerce_product_image($upload, $context) {
        // 檢查是否啟用了WooCommerce產品圖片優化
        $settings = $this->get_settings();
        if (!isset($settings['enable_woo_optimization']) || !$settings['enable_woo_optimization']) {
            return false;
        }

        // 方法1：檢查當前頁面是否為產品編輯頁面
        if (isset($_POST['post_type']) && $_POST['post_type'] === 'product') {
            return true;
        }

        // 方法2：檢查是否在WooCommerce產品圖片上傳區域
        if (isset($_POST['action']) && strpos($_POST['action'], 'woocommerce') !== false) {
            return true;
        }

        // 方法3：檢查是否在產品媒體庫中
        if (isset($_POST['product_id']) || isset($_GET['product_id'])) {
            return true;
        }

        // 方法4：檢查HTTP_REFERER是否包含產品編輯頁面
        if (isset($_SERVER['HTTP_REFERER'])) {
            $referer = $_SERVER['HTTP_REFERER'];
            if (strpos($referer, 'post.php') !== false && strpos($referer, 'post_type=product') !== false) {
                return true;
            }
            if (strpos($referer, 'post-new.php') !== false && strpos($referer, 'post_type=product') !== false) {
                return true;
            }
        }

        // 方法5：檢查當前頁面URL
        $current_url = $_SERVER['REQUEST_URI'] ?? '';
        if (strpos($current_url, 'post.php') !== false && isset($_GET['post'])) {
            $post_type = get_post_type($_GET['post']);
            if ($post_type === 'product') {
                return true;
            }
        }

        // 方法6：檢查文件名是否包含產品相關關鍵詞
        $file_name = basename($upload['file']);
        $product_keywords = array('product', 'goods', 'item', '商品', '產品');
        foreach ($product_keywords as $keyword) {
            if (stripos($file_name, $keyword) !== false) {
                return true;
            }
        }

        // 調試信息
        if (current_user_can('manage_options') && defined('WP_DEBUG') && WP_DEBUG) {
            error_log("WebP Optimizer: 圖片檢測 - 文件: " . basename($upload['file']) .
                     ", 上下文: " . $context .
                     ", POST類型: " . (isset($_POST['post_type']) ? $_POST['post_type'] : '無') .
                     ", 引用頁面: " . (isset($_SERVER['HTTP_REFERER']) ? $_SERVER['HTTP_REFERER'] : '無'));
        }

        return false;
    }

    /**
     * 轉換縮略圖
     */
    public function convert_thumbnails($metadata, $attachment_id) {
        $settings = $this->get_settings();
        $target_format = isset($settings['target_format']) ? $settings['target_format'] : 'webp';

        // 檢查是否支持目標格式
        if ($target_format === 'webp' && !$this->is_webp_supported()) {
            return $metadata;
        }

        if ($target_format === 'avif' && !$this->is_avif_supported()) {
            return $metadata;
        }

        $file_path = get_attached_file($attachment_id);

        if (!$file_path || !$this->is_image_file($file_path)) {
            return $metadata;
        }

        // 檢查是否為水印圖片，如果是則跳過轉換
        if ($this->is_watermark_image($file_path)) {
            return $metadata;
        }

        // 檢測是否為WooCommerce產品圖片
        $is_woo_product = $this->is_attachment_woocommerce_product($attachment_id);
        $convert_context = $is_woo_product ? 'woocommerce_product' : 'general';

        // 轉換主圖片
        $converted_path = $this->convert_image($file_path, $settings, $target_format, $convert_context, $attachment_id);

        // 轉換縮略圖
        if (isset($metadata['sizes']) && is_array($metadata['sizes'])) {
            $upload_dir = wp_upload_dir();
            $base_dir = dirname($file_path);

            foreach ($metadata['sizes'] as $size_name => $size_data) {
                $thumbnail_path = $base_dir . '/' . $size_data['file'];
                if (file_exists($thumbnail_path)) {
                    $this->convert_image($thumbnail_path, $settings, $target_format, $convert_context, $attachment_id);
                }
            }
        }

        return $metadata;
    }

    /**
     * 轉換單個圖片
     */
    private function convert_image($file_path, $settings, $target_format = 'webp', $context = 'general', $attachment_id = null) {
        // 檢查文件是否存在
        if (!file_exists($file_path)) {
            return false;
        }

        // 檢查是否為水印圖片，如果是則跳過轉換
        if ($this->is_watermark_image($file_path)) {
            return $file_path;
        }

        $file_info = pathinfo($file_path);
        $current_extension = strtolower($file_info['extension']);

        // 檢查是否已經是目標格式
        if ($current_extension === $target_format) {
            return $file_path;
        }

        // 檢查是否為支持的格式
        $supported_formats = array('jpg', 'jpeg', 'png', 'gif');
        if (!in_array($current_extension, $supported_formats)) {
            return $file_path;
        }

        // 創建圖片編輯器
        $editor = wp_get_image_editor($file_path);
        if (is_wp_error($editor)) {
            return $file_path;
        }

        // 獲取圖片尺寸
        $size = $editor->get_size();
        $width = $size['width'];
        $height = $size['height'];

        // 根據上下文決定最大尺寸
        $max_width = $settings['max_width'];
        $max_height = null;
        $resize_quality = isset($settings['image_quality']) ? intval($settings['image_quality']) : 80;

        // 如果是WooCommerce產品圖片且有特殊設定
        if ($context === 'woocommerce_product' && isset($settings['enable_woo_optimization']) && $settings['enable_woo_optimization']) {
            // 檢查是否啟用產品圖片尺寸縮放
            if (isset($settings['enable_product_image_resize']) && $settings['enable_product_image_resize']) {
                $max_width = isset($settings['product_image_max_width']) ? intval($settings['product_image_max_width']) : 800;
                $max_height = isset($settings['product_image_max_height']) ? intval($settings['product_image_max_height']) : 800;
                $resize_quality = isset($settings['product_image_resize_quality']) ? intval($settings['product_image_resize_quality']) : 85;
            } else {
                $max_width = isset($settings['woo_product_size']) ? intval($settings['woo_product_size']) : 800;
                $max_height = $max_width; // 設定為正方形
            }

            // 調試信息（僅在管理員模式下顯示）
            if (current_user_can('manage_options') && defined('WP_DEBUG') && WP_DEBUG) {
                error_log("WebP Optimizer: 產品圖片處理 - 文件: " . basename($file_path) .
                         ", 原始尺寸: {$width}x{$height}, 限制尺寸: {$max_width}x{$max_height}, 質量: {$resize_quality}");
            }
        } else {
            // 調試信息（僅在管理員模式下顯示）
            if (current_user_can('manage_options') && defined('WP_DEBUG') && WP_DEBUG) {
                error_log("WebP Optimizer: 一般圖片處理 - 文件: " . basename($file_path) .
                         ", 原始尺寸: {$width}x{$height}, 限制寬度: {$max_width}");
            }
        }

        // 調整圖片尺寸
        $resize_needed = false;
        $new_width = $width;
        $new_height = $height;

        // 檢查是否需要縮放（按最大邊的比例縮放）
        if ($width > $max_width || ($max_height && $height > $max_height)) {
            // 計算縮放比例
            $width_ratio = $max_width / $width;
            $height_ratio = $max_height ? ($max_height / $height) : 1;

            // 使用較小的比例，確保圖片完全適應限制
            $scale_ratio = min($width_ratio, $height_ratio);

            $new_width = intval($width * $scale_ratio);
            $new_height = intval($height * $scale_ratio);
            $resize_needed = true;
        }

        // 檢查原始圖片是否有透明通道
        $has_transparency = $this->has_transparency($file_path);

        // 如果需要調整尺寸
        if ($resize_needed) {
            $editor->resize($new_width, $new_height, false);

            // 調試信息
            if (current_user_can('manage_options') && defined('WP_DEBUG') && WP_DEBUG) {
                error_log("WebP Optimizer: 圖片尺寸調整 - 文件: " . basename($file_path) .
                         ", 從 {$width}x{$height} 調整為 {$new_width}x{$new_height}, 縮放比例: " . round($scale_ratio, 3) .
                         ", 透明度: " . ($has_transparency ? '保持' : '無'));
            }
        }

        // 在轉換格式前先添加水印（如果啟用了水印功能）
        if (isset($settings['enable_watermark']) && $settings['enable_watermark'] && $attachment_id) {
            if ($this->should_add_watermark($attachment_id, $context)) {
                // 先保存為原始格式（通常是PNG或JPEG）
                $original_format = $has_transparency ? 'image/png' : 'image/jpeg';
                $temp_path = $file_info['dirname'] . '/' . $file_info['filename'] . '_temp.' . $file_info['extension'];

                $temp_result = $editor->save($temp_path, $original_format);
                if (!is_wp_error($temp_result)) {
                    // 在原始格式上添加水印
                    $watermark_result = $this->add_watermark($editor, $temp_path, $settings);

                    if ($watermark_result) {
                        // 水印添加成功，使用添加了水印的文件進行格式轉換
                        $file_path = $temp_path;

                        // 重新創建編輯器，使用添加了水印的文件
                        $editor = wp_get_image_editor($file_path);
                        if (is_wp_error($editor)) {
                            // 如果重新創建編輯器失敗，使用原文件
                            $file_path = $file_info['dirname'] . '/' . $file_info['filename'] . '.' . $file_info['extension'];
                        }
                    } else {
                        // 水印添加失敗，使用原文件
                        $file_path = $file_info['dirname'] . '/' . $file_info['filename'] . '.' . $file_info['extension'];
                    }
                }
            }
        }

        // 生成目標格式文件路徑
        $target_path = $file_info['dirname'] . '/' . $file_info['filename'] . '.' . $target_format;
        // 快速返回：若目標文件已存在且較新，避免重複轉換
        if (file_exists($target_path)) {
            $target_mtime = @filemtime($target_path);
            $source_mtime = @filemtime($file_path);
            if ($target_mtime && $source_mtime && $target_mtime >= $source_mtime) {
                return $target_path;
            }
        }

        // 根據目標格式保存
        if ($target_format === 'webp') {
            // 對於有透明通道的圖片，確保WebP保持透明度
            if ($has_transparency) {
                $result = $editor->save($target_path, 'image/webp');
            } else {
                $result = $editor->save($target_path, 'image/webp');
            }
        } elseif ($target_format === 'avif') {
            // AVIF天然支持透明度
            $result = $editor->save($target_path, 'image/avif');
        } else {
            return $file_path;
        }

        if (is_wp_error($result)) {
            return $file_path;
        }



        // 根據設置決定是否刪除原文件
        if (isset($settings['delete_original']) && $settings['delete_original']) {
            unlink($file_path);
        }

        return $target_path;
    }

    /**
     * 檢查是否為圖片文件
     */
    private function is_image_file($file_path) {
        $file_info = pathinfo($file_path);
        $image_extensions = array('jpg', 'jpeg', 'png', 'gif', 'webp', 'avif');
        return in_array(strtolower($file_info['extension']), $image_extensions);
    }

    /**
     * 檢查服務器是否支持WebP
     */
    private function is_webp_supported() {
        if ($this->webp_support_cached !== null) {
            return $this->webp_support_cached;
        }
        // 先檢查 GD
        if (extension_loaded('gd') && function_exists('imagewebp')) {
            return $this->webp_support_cached = true;
        }
        // 再檢查 Imagick（用函數存在檢測避免靜態分析報錯）
        if (extension_loaded('imagick') && class_exists('Imagick') && is_callable(array('Imagick', 'queryFormats'))) {
            try {
                $formats = call_user_func(array('Imagick', 'queryFormats'), 'WEBP');
                return $this->webp_support_cached = (is_array($formats) && !empty($formats));
            } catch (\Throwable $e) {
                return $this->webp_support_cached = false;
            }
        }
        return $this->webp_support_cached = false;
    }

    /**
     * 檢查服務器是否支持AVIF
     */
    private function is_avif_supported() {
        if ($this->avif_support_cached !== null) {
            return $this->avif_support_cached;
        }
        // GD 對 AVIF 支援有限，主要檢查 Imagick
        if (extension_loaded('imagick') && class_exists('Imagick') && is_callable(array('Imagick', 'queryFormats'))) {
            try {
                $formats = call_user_func(array('Imagick', 'queryFormats'), 'AVIF');
                return $this->avif_support_cached = (is_array($formats) && !empty($formats));
            } catch (\Throwable $e) {
                return $this->avif_support_cached = false;
            }
        }
        return $this->avif_support_cached = false;
    }

    /**
     * 檢測圖片右下角背景顏色
     */
    private function detect_background_color($file_path) {
        if (!file_exists($file_path)) {
            return 'light'; // 默認返回淺色
        }

        // 獲取圖片信息
        $image_info = getimagesize($file_path);
        if (!$image_info) {
            return 'light';
        }

        $width = $image_info[0];
        $height = $image_info[1];

        // 創建圖片資源
        $image = null;
        $file_extension = strtolower(pathinfo($file_path, PATHINFO_EXTENSION));

        switch ($file_extension) {
            case 'jpg':
            case 'jpeg':
                $image = imagecreatefromjpeg($file_path);
                break;
            case 'png':
                $image = imagecreatefrompng($file_path);
                break;
            case 'gif':
                $image = imagecreatefromgif($file_path);
                break;
            case 'webp':
                if (function_exists('imagecreatefromwebp')) {
                    $image = imagecreatefromwebp($file_path);
                }
                break;
            default:
                return 'light';
        }

        if (!$image) {
            return 'light';
        }

        // 檢測右下角區域的顏色
        $sample_size = 50; // 取樣區域大小
        $start_x = max(0, $width - $sample_size);
        $start_y = max(0, $height - $sample_size);

        $total_r = 0;
        $total_g = 0;
        $total_b = 0;
        $sample_count = 0;

        // 在右下角區域取樣
        for ($x = $start_x; $x < $width; $x += 5) {
            for ($y = $start_y; $y < $height; $y += 5) {
                $rgb = imagecolorat($image, $x, $y);
                $r = ($rgb >> 16) & 0xFF;
                $g = ($rgb >> 8) & 0xFF;
                $b = $rgb & 0xFF;

                $total_r += $r;
                $total_g += $g;
                $total_b += $b;
                $sample_count++;
            }
        }

        imagedestroy($image);

        if ($sample_count === 0) {
            return 'light';
        }

        // 計算平均顏色
        $avg_r = $total_r / $sample_count;
        $avg_g = $total_g / $sample_count;
        $avg_b = $total_b / $sample_count;

        // 計算亮度 (使用標準的亮度公式)
        $brightness = (0.299 * $avg_r + 0.587 * $avg_g + 0.114 * $avg_b);

        // 調試信息
        if (current_user_can('manage_options') && defined('WP_DEBUG') && WP_DEBUG) {
            error_log("WebP Optimizer: 背景顏色檢測 - 文件: " . basename($file_path) .
                     ", RGB: ({$avg_r}, {$avg_g}, {$avg_b}), 亮度: " . round($brightness, 2) .
                     ", 判斷: " . ($brightness > 128 ? '淺色' : '深色'));
        }

        // 亮度大於128為淺色背景，否則為深色背景
        return $brightness > 128 ? 'light' : 'dark';
    }

    /**
     * 檢查是否應該添加水印
     */
    private function should_add_watermark($attachment_id, $context) {
        $settings = $this->get_settings();

        // 檢查是否啟用水印
        if (!isset($settings['enable_watermark']) || !$settings['enable_watermark']) {
            return false;
        }

        // 檢查是否有上傳水印Logo
        if (empty($settings['watermark_dark_logo']) && empty($settings['watermark_light_logo'])) {
            return false;
        }

        // 不為WooCommerce產品圖片添加水印
        if ($context === 'woocommerce_product') {
            return false;
        }

        // 檢查附件是否屬於文章或Portfolio
        $post = get_post($attachment_id);
        if (!$post) {
            return false;
        }

        // 檢查父文章類型
        $parent_post = get_post($post->post_parent);
        if ($parent_post) {
            $post_type = $parent_post->post_type;
            // 只為文章和portfolio添加水印
            if (in_array($post_type, array('post', 'portfolio'))) {
                return true;
            }
        }

        return false;
    }

    /**
     * 添加水印到圖片
     */
    private function add_watermark($editor, $file_path, $settings) {
        // 檢測背景顏色
        $background_color = $this->detect_background_color($file_path);

        // 選擇合適的水印Logo
        $watermark_path = '';
        if ($background_color === 'dark') {
            $watermark_path = isset($settings['watermark_light_logo']) ? $settings['watermark_light_logo'] : '';
        } else {
            $watermark_path = isset($settings['watermark_dark_logo']) ? $settings['watermark_dark_logo'] : '';
        }

        if (empty($watermark_path) || !file_exists($watermark_path)) {
            return false;
        }

        // 獲取主圖片尺寸
        $main_size = $editor->get_size();
        $main_width = $main_size['width'];
        $main_height = $main_size['height'];

        // 獲取水印設置
        $watermark_width = isset($settings['watermark_width']) ? intval($settings['watermark_width']) : 100;
        $watermark_opacity = isset($settings['watermark_opacity']) ? intval($settings['watermark_opacity']) : 80;
        $watermark_margin = isset($settings['watermark_margin']) ? intval($settings['watermark_margin']) : 20;
        $watermark_quality = isset($settings['watermark_quality']) ? intval($settings['watermark_quality']) : 100;

        // 獲取水印原始尺寸
        $watermark_info = getimagesize($watermark_path);
        $watermark_original_width = $watermark_info[0];
        $watermark_original_height = $watermark_info[1];

        // 計算水印高度（按比例縮放）
        $watermark_height = intval(($watermark_width * $watermark_original_height) / $watermark_original_width);

        // 創建高質量水印（如果尺寸不同才縮放）
        $watermark_info = getimagesize($watermark_path);
        $original_width = $watermark_info[0];
        $original_height = $watermark_info[1];

        if ($original_width == $watermark_width && $original_height == $watermark_height) {
            // 尺寸相同，直接使用原始水印
            $temp_watermark_path = $watermark_path;
        } else {
            // 尺寸不同，需要縮放
            $temp_watermark_path = $this->create_high_quality_watermark($watermark_path, $watermark_width, $watermark_height, $watermark_quality);
            if (!$temp_watermark_path) {
                return false;
            }
        }

        // 計算水印位置（右下角）
        $watermark_x = $main_width - $watermark_width - $watermark_margin;
        $watermark_y = $main_height - $watermark_height - $watermark_margin;

        // 確保水印不會超出圖片邊界
        $watermark_x = max(0, $watermark_x);
        $watermark_y = max(0, $watermark_y);

        // 調試水印透明度
        if (current_user_can('manage_options') && defined('WP_DEBUG') && WP_DEBUG) {
            error_log("WebP Optimizer Debug: 水印路徑 - " . $temp_watermark_path);
            error_log("WebP Optimizer Debug: 主圖片路徑 - " . $file_path);
            error_log("WebP Optimizer Debug: 水印尺寸 - {$watermark_width}x{$watermark_height}");
            error_log("WebP Optimizer Debug: 水印位置 - ({$watermark_x}, {$watermark_y})");
            error_log("WebP Optimizer Debug: 水印透明度 - {$watermark_opacity}%");

            // 檢查原始水印圖片
            $this->debug_watermark_image($watermark_path, "原始水印圖片");

            // 檢查處理後的水印圖片
            $this->debug_watermark_image($temp_watermark_path, "處理後水印圖片");
        }

        // 使用改進的GD庫方法添加水印
        $result = $this->add_watermark_with_gd($file_path, $temp_watermark_path, $watermark_x, $watermark_y, $watermark_opacity);

        // 刪除臨時文件
        if (file_exists($temp_watermark_path)) {
            unlink($temp_watermark_path);
        }

        if ($result) {
            // 調試信息
            if (current_user_can('manage_options') && defined('WP_DEBUG') && WP_DEBUG) {
                error_log("WebP Optimizer: 水印添加成功 - 文件: " . basename($file_path) .
                         ", 背景: {$background_color}, 水印尺寸: {$watermark_width}x{$watermark_height}, 位置: ({$watermark_x}, {$watermark_y})");
            }
        } else {
            // 調試錯誤信息
            if (current_user_can('manage_options') && defined('WP_DEBUG') && WP_DEBUG) {
                error_log("WebP Optimizer: 水印添加失敗 - 文件: " . basename($file_path));
            }
        }

        return $result;
    }

    /**
     * 使用GD庫添加水印
     */
    private function add_watermark_with_gd($main_image_path, $watermark_path, $x, $y, $opacity) {
        // 獲取主圖片信息
        $main_info = getimagesize($main_image_path);
        if (!$main_info) {
            return false;
        }

        // 獲取水印圖片信息
        $watermark_info = getimagesize($watermark_path);
        if (!$watermark_info) {
            return false;
        }

        // 獲取圖片尺寸
        $main_width = $main_info[0];
        $main_height = $main_info[1];
        $watermark_width = $watermark_info[0];
        $watermark_height = $watermark_info[1];

        // 確保水印不會超出主圖片邊界
        $x = max(0, min($x, $main_width - $watermark_width));
        $y = max(0, min($y, $main_height - $watermark_height));

        // 加載主圖片
        $main_image = $this->create_image_resource($main_image_path);
        if (!$main_image) {
            return false;
        }

        // 加載水印圖片
        $watermark_image = $this->create_image_resource($watermark_path);
        if (!$watermark_image) {
            imagedestroy($main_image);
            return false;
        }

        // 設置主圖片的透明度支持
        imagealphablending($main_image, true);
        imagesavealpha($main_image, true);

        // 設置水印的透明度支持
        imagealphablending($watermark_image, true);
        imagesavealpha($watermark_image, true);

        // 使用精確的透明度處理進行水印合成
        for ($wx = 0; $wx < $watermark_width; $wx++) {
            for ($wy = 0; $wy < $watermark_height; $wy++) {
                $watermark_color = imagecolorat($watermark_image, $wx, $wy);
                $watermark_alpha = ($watermark_color >> 24) & 0xFF;

                // 如果水印像素完全透明，跳過
                if ($watermark_alpha == 127) {
                    continue;
                }

                $main_x = $x + $wx;
                $main_y = $y + $wy;

                // 確保在主圖片範圍內
                if ($main_x >= 0 && $main_x < $main_width && $main_y >= 0 && $main_y < $main_height) {
                    $main_color = imagecolorat($main_image, $main_x, $main_y);

                    // 提取顏色分量
                    $watermark_r = ($watermark_color >> 16) & 0xFF;
                    $watermark_g = ($watermark_color >> 8) & 0xFF;
                    $watermark_b = $watermark_color & 0xFF;

                    $main_r = ($main_color >> 16) & 0xFF;
                    $main_g = ($main_color >> 8) & 0xFF;
                    $main_b = $main_color & 0xFF;

                    // 計算透明度混合
                    $alpha_factor = (127 - $watermark_alpha) / 127.0;
                    $opacity_factor = $opacity / 100.0;
                    $final_factor = $alpha_factor * $opacity_factor;

                    // 混合顏色
                    $new_r = intval($watermark_r * $final_factor + $main_r * (1 - $final_factor));
                    $new_g = intval($watermark_g * $final_factor + $main_g * (1 - $final_factor));
                    $new_b = intval($watermark_b * $final_factor + $main_b * (1 - $final_factor));

                    // 創建新顏色
                    $new_color = imagecolorallocate($main_image, $new_r, $new_g, $new_b);
                    imagesetpixel($main_image, $main_x, $main_y, $new_color);
                }
            }
        }

        // 清理水印圖片
        imagedestroy($watermark_image);

        // 保存結果
        $result = $this->save_image_resource($main_image, $main_image_path);

        // 清理主圖片
        imagedestroy($main_image);

        return $result;
    }



    /**
     * 創建圖片資源
     */
    private function create_image_resource($file_path) {
        $extension = strtolower(pathinfo($file_path, PATHINFO_EXTENSION));

        switch ($extension) {
            case 'jpg':
            case 'jpeg':
                return imagecreatefromjpeg($file_path);
            case 'png':
                $image = imagecreatefrompng($file_path);
                if ($image) {
                    // 對於PNG圖片，始終啟用透明度支持
                    imagealphablending($image, false);
                    imagesavealpha($image, true);
                }
                return $image;
            case 'gif':
                $image = imagecreatefromgif($file_path);
                if ($image) {
                    // 啟用透明度支持
                    imagealphablending($image, true);
                    imagesavealpha($image, true);
                }
                return $image;
            case 'webp':
                if (function_exists('imagecreatefromwebp')) {
                    $image = imagecreatefromwebp($file_path);
                    if ($image) {
                        // 啟用透明度支持
                        imagealphablending($image, true);
                        imagesavealpha($image, true);
                    }
                    return $image;
                }
                break;
        }

        return false;
    }

    /**
     * 保存圖片資源
     */
    private function save_image_resource($image, $file_path) {
        $extension = strtolower(pathinfo($file_path, PATHINFO_EXTENSION));

        switch ($extension) {
            case 'jpg':
            case 'jpeg':
                return imagejpeg($image, $file_path, 90);
            case 'png':
                // 確保PNG透明度正確保存
                imagealphablending($image, false);
                imagesavealpha($image, true);

                // 使用最高壓縮級別保存PNG
                return imagepng($image, $file_path, 9);
            case 'gif':
                // 確保GIF透明度正確保存
                imagealphablending($image, false);
                imagesavealpha($image, true);
                return imagegif($image, $file_path);
            case 'webp':
                if (function_exists('imagewebp')) {
                    // 確保WebP透明度正確保存
                    imagealphablending($image, false);
                    imagesavealpha($image, true);
                    return imagewebp($image, $file_path, 90);
                }
                break;
        }

        return false;
    }

    /**
     * 支持透明度的圖片合併
     */
    private function imagecopymerge_alpha($dst_im, $src_im, $dst_x, $dst_y, $src_x, $src_y, $src_w, $src_h, $pct) {
        // 創建臨時圖片來處理透明度
        $tmp_im = imagecreatetruecolor($src_w, $src_h);

        // 設置透明度支持
        imagealphablending($tmp_im, false);
        imagesavealpha($tmp_im, true);

        // 設置透明背景
        $transparent = imagecolorallocatealpha($tmp_im, 0, 0, 0, 127);
        imagefill($tmp_im, 0, 0, $transparent);

        // 複製源圖片到臨時圖片
        imagecopy($tmp_im, $src_im, 0, 0, $src_x, $src_y, $src_w, $src_h);

        // 設置目標圖片的透明度混合
        imagealphablending($dst_im, true);
        imagesavealpha($dst_im, true);

        // 使用標準的imagecopymerge，但確保透明度正確
        imagecopymerge($dst_im, $tmp_im, $dst_x, $dst_y, 0, 0, $src_w, $src_h, $pct);

        // 清理臨時圖片
        imagedestroy($tmp_im);
    }

    /**
     * 檢測圖片是否有透明通道
     */
    private function has_transparency($file_path) {
        $extension = strtolower(pathinfo($file_path, PATHINFO_EXTENSION));

        switch ($extension) {
            case 'png':
                $image_info = getimagesize($file_path);
                if ($image_info && isset($image_info['channels']) && $image_info['channels'] == 4) {
                    return true;
                }

                // 如果無法通過channels檢測，嘗試逐像素檢測
                if ($image_info) {
                    $image = imagecreatefrompng($file_path);
                    if ($image) {
                        $width = imagesx($image);
                        $height = imagesy($image);

                        // 檢查前幾個像素是否有透明度
                        for ($x = 0; $x < min(10, $width); $x++) {
                            for ($y = 0; $y < min(10, $height); $y++) {
                                $color = imagecolorat($image, $x, $y);
                                $alpha = ($color >> 24) & 0xFF;
                                if ($alpha > 0) {
                                    imagedestroy($image);
                                    return true;
                                }
                            }
                        }
                        imagedestroy($image);
                    }
                }
                return false;
            case 'gif':
                // GIF通常支持透明度
                return true;
            case 'webp':
                // WebP支持透明度
                return true;
            default:
                return false;
        }
    }

    /**
     * 創建高質量水印圖片
     */
    private function create_high_quality_watermark($watermark_path, $target_width, $target_height, $quality = 100) {
        // 獲取原始水印圖片信息
        $watermark_info = getimagesize($watermark_path);
        if (!$watermark_info) {
            return false;
        }

        $original_width = $watermark_info[0];
        $original_height = $watermark_info[1];
        $watermark_type = $watermark_info[2];

        // 如果尺寸相同，直接返回原圖
        if ($original_width == $target_width && $original_height == $target_height) {
            return $watermark_path;
        }

        // 1. 創建新的圖片資源
        $new_watermark = imagecreatetruecolor($target_width, $target_height);

        // 2. 設置透明度支持
        imagealphablending($new_watermark, false);
        imagesavealpha($new_watermark, true);

        // 3. 創建透明背景
        $transparent = imagecolorallocatealpha($new_watermark, 0, 0, 0, 127);
        imagefill($new_watermark, 0, 0, $transparent);

        // 4. 根據原始圖片類型加載水印
        $original_watermark = null;
        switch ($watermark_type) {
            case IMAGETYPE_PNG:
                $original_watermark = imagecreatefrompng($watermark_path);
                if ($original_watermark) {
                    // 設置PNG透明度支持
                    imagealphablending($original_watermark, true);
                    imagesavealpha($original_watermark, true);
                }
                break;
            case IMAGETYPE_JPEG:
                $original_watermark = imagecreatefromjpeg($watermark_path);
                break;
            case IMAGETYPE_GIF:
                $original_watermark = imagecreatefromgif($watermark_path);
                if ($original_watermark) {
                    // 設置GIF透明度支持
                    imagealphablending($original_watermark, true);
                    imagesavealpha($original_watermark, true);
                }
                break;
            case IMAGETYPE_WEBP:
                if (function_exists('imagecreatefromwebp')) {
                    $original_watermark = imagecreatefromwebp($watermark_path);
                    if ($original_watermark) {
                        // 設置WebP透明度支持
                        imagealphablending($original_watermark, true);
                        imagesavealpha($original_watermark, true);
                    }
                }
                break;
        }

        if (!$original_watermark) {
            imagedestroy($new_watermark);
            return false;
        }

        // 5. 使用逐像素複製方法確保透明度完全正確
        for ($x = 0; $x < $target_width; $x++) {
            for ($y = 0; $y < $target_height; $y++) {
                // 計算源圖片的對應位置
                $src_x = ($x * $original_width) / $target_width;
                $src_y = ($y * $original_height) / $target_height;

                // 獲取源像素顏色
                $src_color = imagecolorat($original_watermark, $src_x, $src_y);

                // 提取RGBA分量
                $src_r = ($src_color >> 16) & 0xFF;
                $src_g = ($src_color >> 8) & 0xFF;
                $src_b = $src_color & 0xFF;
                $src_a = ($src_color >> 24) & 0xFF;

                // 創建目標顏色，保持透明度
                $dst_color = imagecolorallocatealpha($new_watermark, $src_r, $src_g, $src_b, $src_a);

                // 設置像素
                imagesetpixel($new_watermark, $x, $y, $dst_color);
            }
        }

        // 創建臨時文件路徑
        $upload_dir = wp_upload_dir();
        $temp_path = $upload_dir['basedir'] . '/high_quality_watermark_' . uniqid() . '.png';

        // 保存為PNG格式，保持透明度
        $save_result = imagepng($new_watermark, $temp_path, 9);

        // 清理資源
        imagedestroy($original_watermark);
        imagedestroy($new_watermark);

        // 調試信息
        if (current_user_can('manage_options') && defined('WP_DEBUG') && WP_DEBUG) {
            error_log("WebP Optimizer Debug: 水印圖片創建 - 原始: {$watermark_path}, 臨時: {$temp_path}, 結果: " . ($save_result ? '成功' : '失敗'));

            // 檢查生成的臨時水印圖片
            if ($save_result && file_exists($temp_path)) {
                $this->debug_watermark_image($temp_path, "臨時水印圖片");
            }
        }

        if (!$save_result) {
            return false;
        }

        return $temp_path;
    }

    /**
     * 調試水印圖片信息
     */
    private function debug_watermark_image($watermark_path, $label = "水印圖片") {
        if (!file_exists($watermark_path)) {
            error_log("WebP Optimizer Debug: {$label} - 文件不存在: " . $watermark_path);
            return;
        }

        $image_info = getimagesize($watermark_path);
        if (!$image_info) {
            error_log("WebP Optimizer Debug: {$label} - 無法獲取圖片信息: " . $watermark_path);
            return;
        }

        error_log("WebP Optimizer Debug: {$label} - 基本信息: " .
                 "尺寸: {$image_info[0]}x{$image_info[1]}, " .
                 "類型: {$image_info[2]}, " .
                 "通道: " . (isset($image_info['channels']) ? $image_info['channels'] : '未知') . ", " .
                 "MIME: {$image_info['mime']}");

        $image = imagecreatefrompng($watermark_path);
        if (!$image) {
            error_log("WebP Optimizer Debug: {$label} - 無法加載圖片: " . $watermark_path);
            return;
        }

        $width = imagesx($image);
        $height = imagesy($image);

        // 檢查邊緣像素的透明度
        $corners = array(
            array(0, 0, "左上角"),
            array($width-1, 0, "右上角"),
            array(0, $height-1, "左下角"),
            array($width-1, $height-1, "右下角"),
            array($width/2, $height/2, "中心")
        );

        foreach ($corners as $corner) {
            $x = $corner[0];
            $y = $corner[1];
            $pos = $corner[2];

            if ($x >= 0 && $x < $width && $y >= 0 && $y < $height) {
                $color = imagecolorat($image, $x, $y);
                $alpha = ($color >> 24) & 0xFF;
                $r = ($color >> 16) & 0xFF;
                $g = ($color >> 8) & 0xFF;
                $b = $color & 0xFF;

                error_log("WebP Optimizer Debug: {$label} - {$pos}像素({$x},{$y}) - RGB({$r},{$g},{$b}) Alpha:{$alpha}");
            }
        }

        imagedestroy($image);
    }

    /**
     * 測試水印圖片透明度
     */
    private function test_watermark_transparency($watermark_path) {
        if (!file_exists($watermark_path)) {
            error_log("WebP Optimizer Debug: 水印文件不存在 - " . $watermark_path);
            return false;
        }

        $image_info = getimagesize($watermark_path);
        if (!$image_info) {
            error_log("WebP Optimizer Debug: 無法獲取水印圖片信息 - " . $watermark_path);
            return false;
        }

        error_log("WebP Optimizer Debug: 水印圖片信息 - " .
                 "尺寸: {$image_info[0]}x{$image_info[1]}, " .
                 "類型: {$image_info[2]}, " .
                 "通道: " . (isset($image_info['channels']) ? $image_info['channels'] : '未知') . ", " .
                 "MIME: {$image_info['mime']}");

        $image = imagecreatefrompng($watermark_path);
        if (!$image) {
            error_log("WebP Optimizer Debug: 無法加載水印圖片 - " . $watermark_path);
            return false;
        }

        $width = imagesx($image);
        $height = imagesy($image);

        // 檢查幾個像素的透明度
        for ($x = 0; $x < min(5, $width); $x++) {
            for ($y = 0; $y < min(5, $height); $y++) {
                $color = imagecolorat($image, $x, $y);
                $alpha = ($color >> 24) & 0xFF;
                $r = ($color >> 16) & 0xFF;
                $g = ($color >> 8) & 0xFF;
                $b = $color & 0xFF;

                error_log("WebP Optimizer Debug: 像素({$x},{$y}) - RGB({$r},{$g},{$b}) Alpha:{$alpha}");
            }
        }

        imagedestroy($image);
        return true;
    }

    /**
     * 處理水印Logo上傳
     */
    private function handle_watermark_upload($file, $upload_dir, $prefix) {
        // 檢查文件類型 - 優先支持PNG格式以保持透明度
        $allowed_types = array('image/png', 'image/jpeg', 'image/gif', 'image/webp');
        if (!in_array($file['type'], $allowed_types)) {
            return false;
        }

        // 檢查文件大小（最大2MB）
        if ($file['size'] > 2 * 1024 * 1024) {
            return false;
        }

        // 生成文件名 - 如果是PNG格式，保持PNG擴展名以維持透明度
        $file_extension = pathinfo($file['name'], PATHINFO_EXTENSION);
        $original_extension = strtolower($file_extension);

        // 如果是PNG格式，強制保持PNG擴展名
        if ($file['type'] === 'image/png' || $original_extension === 'png') {
            $file_extension = 'png';
        }

        $filename = $prefix . '_' . uniqid() . '.' . $file_extension;
        $filepath = $upload_dir . '/' . $filename;

        // 移動上傳的文件
        if (move_uploaded_file($file['tmp_name'], $filepath)) {
            // 如果是PNG格式，確保不進行任何轉換，保持原始透明度
            if ($file_extension === 'png') {
                // 標記為水印圖片，避免後續轉換
                $this->mark_as_watermark_image($filepath);
            }
            return $filepath;
        }

        return false;
    }

    /**
     * 標記文件為水印圖片
     */
    private function mark_as_watermark_image($file_path) {
        // 創建一個隱藏文件來標記這是水印圖片
        $marker_file = $file_path . '.watermark';
        if (!file_exists($marker_file)) {
            file_put_contents($marker_file, 'watermark');
        }
    }

    /**
     * 根據文件路徑獲取attachment_id
     */
    private function get_attachment_id_by_file($file_path) {
        global $wpdb;

        $upload_dir = wp_upload_dir();
        $relative_path = str_replace($upload_dir['basedir'] . '/', '', $file_path);

        $attachment_id = $wpdb->get_var($wpdb->prepare(
            "SELECT post_id FROM {$wpdb->postmeta}
             WHERE meta_key = '_wp_attached_file' AND meta_value = %s",
            $relative_path
        ));

        return $attachment_id;
    }

    /**
     * 獲取插件設置
     */
    private function get_settings() {
        // 使用快取避免每次請求都 hitting get_option
        if ($this->cached_settings !== null) {
            return $this->cached_settings;
        }

        $defaults = array(
            'target_format' => 'webp',
            'image_quality' => 80,
            'max_width' => 1600,
            'delete_original' => false,
            'preserve_original' => true,
            'batch_size' => 5,
            'batch_delay' => 1000,
            'woo_product_size' => 800,
            'enable_woo_optimization' => true,
            'enable_product_image_resize' => true,
            'product_image_max_width' => 800,
            'product_image_max_height' => 800,
            'product_image_resize_quality' => 85,
            // 水印設置
            'enable_watermark' => false,
            'watermark_dark_logo' => '',
            'watermark_light_logo' => '',
            'watermark_width' => 100,
            'watermark_position' => 'bottom-right',
            'watermark_opacity' => 80,
            'watermark_margin' => 20,
            'watermark_quality' => 100
        );

        $settings = get_option('webp_optimizer_settings', array());
        $this->cached_settings = wp_parse_args($settings, $defaults);
        return $this->cached_settings;
    }

    /**
     * 添加管理菜單
     */
    public function add_admin_menu() {
        add_options_page(
            '圖片優化設置',
            '圖片優化',
            'manage_options',
            'webp-image-optimizer',
            array($this, 'admin_page')
        );

        // 添加批量轉換頁面
        add_media_page(
            '批量轉換圖片',
            '批量轉換圖片',
            'manage_options',
            'webp-batch-convert',
            array($this, 'batch_convert_page')
        );
    }

    /**
     * 註冊設置
     */
    public function register_settings() {
        register_setting('webp_optimizer_settings', 'webp_optimizer_settings');

        add_settings_section(
            'webp_optimizer_general',
            '一般設置',
            array($this, 'settings_section_callback'),
            'webp-image-optimizer'
        );

        add_settings_field(
            'target_format',
            '目標格式',
            array($this, 'target_format_field_callback'),
            'webp-image-optimizer',
            'webp_optimizer_general'
        );

        add_settings_field(
            'image_quality',
            '圖片質量',
            array($this, 'quality_field_callback'),
            'webp-image-optimizer',
            'webp_optimizer_general'
        );

        add_settings_field(
            'max_width',
            '最大寬度',
            array($this, 'max_width_field_callback'),
            'webp-image-optimizer',
            'webp_optimizer_general'
        );

        add_settings_field(
            'delete_original',
            '刪除原文件',
            array($this, 'delete_original_field_callback'),
            'webp-image-optimizer',
            'webp_optimizer_general'
        );

        add_settings_field(
            'batch_size',
            '批次處理數量',
            array($this, 'batch_size_field_callback'),
            'webp-image-optimizer',
            'webp_optimizer_general'
        );

        add_settings_field(
            'batch_delay',
            '批次間隔時間',
            array($this, 'batch_delay_field_callback'),
            'webp-image-optimizer',
            'webp_optimizer_general'
        );

        // WooCommerce產品圖片設定
        add_settings_section(
            'webp_optimizer_woocommerce',
            'WooCommerce產品圖片設定',
            array($this, 'woocommerce_settings_section_callback'),
            'webp-image-optimizer'
        );

        add_settings_field(
            'enable_woo_optimization',
            '啟用產品圖片優化',
            array($this, 'enable_woo_optimization_field_callback'),
            'webp-image-optimizer',
            'webp_optimizer_woocommerce'
        );

        add_settings_field(
            'woo_product_size',
            '產品圖片尺寸',
            array($this, 'woo_product_size_field_callback'),
            'webp-image-optimizer',
            'webp_optimizer_woocommerce'
        );

        // 產品圖片尺寸縮放設定
        add_settings_section(
            'webp_optimizer_product_resize',
            '產品圖片尺寸縮放設定',
            array($this, 'product_resize_settings_section_callback'),
            'webp-image-optimizer'
        );

        add_settings_field(
            'enable_product_image_resize',
            '啟用產品圖片尺寸縮放',
            array($this, 'enable_product_image_resize_field_callback'),
            'webp-image-optimizer',
            'webp_optimizer_product_resize'
        );

        add_settings_field(
            'product_image_max_width',
            '產品圖片最大寬度',
            array($this, 'product_image_max_width_field_callback'),
            'webp-image-optimizer',
            'webp_optimizer_product_resize'
        );

        add_settings_field(
            'product_image_max_height',
            '產品圖片最大高度',
            array($this, 'product_image_max_height_field_callback'),
            'webp-image-optimizer',
            'webp_optimizer_product_resize'
        );

        add_settings_field(
            'product_image_resize_quality',
            '產品圖片縮放質量',
            array($this, 'product_image_resize_quality_field_callback'),
            'webp-image-optimizer',
            'webp_optimizer_product_resize'
        );

        // 水印設定
        add_settings_section(
            'webp_optimizer_watermark',
            '水印設定',
            array($this, 'watermark_settings_section_callback'),
            'webp-image-optimizer'
        );

        add_settings_field(
            'enable_watermark',
            '啟用水印',
            array($this, 'enable_watermark_field_callback'),
            'webp-image-optimizer',
            'webp_optimizer_watermark'
        );

        add_settings_field(
            'watermark_dark_logo',
            '深色Logo',
            array($this, 'watermark_dark_logo_field_callback'),
            'webp-image-optimizer',
            'webp_optimizer_watermark'
        );

        add_settings_field(
            'watermark_light_logo',
            '淺色Logo',
            array($this, 'watermark_light_logo_field_callback'),
            'webp-image-optimizer',
            'webp_optimizer_watermark'
        );

        add_settings_field(
            'watermark_width',
            '水印寬度',
            array($this, 'watermark_width_field_callback'),
            'webp-image-optimizer',
            'webp_optimizer_watermark'
        );

        add_settings_field(
            'watermark_opacity',
            '水印透明度',
            array($this, 'watermark_opacity_field_callback'),
            'webp-image-optimizer',
            'webp_optimizer_watermark'
        );

        add_settings_field(
            'watermark_margin',
            '水印邊距',
            array($this, 'watermark_margin_field_callback'),
            'webp-image-optimizer',
            'webp_optimizer_watermark'
        );

        add_settings_field(
            'watermark_quality',
            '水印質量',
            array($this, 'watermark_quality_field_callback'),
            'webp-image-optimizer',
            'webp_optimizer_watermark'
        );
    }

    /**
     * 設置頁面回調
     */
    public function settings_section_callback() {
        echo '<p>配置圖片優化插件的設置。</p>';
    }

    /**
     * 目標格式字段
     */
    public function target_format_field_callback() {
        $settings = $this->get_settings();
        $value = isset($settings['target_format']) ? $settings['target_format'] : 'webp';

        echo '<select name="webp_optimizer_settings[target_format]" id="target_format">';
        echo '<option value="webp" ' . selected('webp', $value, false) . '>WebP</option>';
        echo '<option value="avif" ' . selected('avif', $value, false) . '>AVIF</option>';
        echo '</select>';

        echo '<p class="description">選擇圖片轉換的目標格式</p>';

        // 顯示支持狀態
        echo '<p><strong>WebP支持：</strong> ' . ($this->is_webp_supported() ? '✓ 支持' : '✗ 不支持') . '</p>';
        echo '<p><strong>AVIF支持：</strong> ' . ($this->is_avif_supported() ? '✓ 支持' : '✗ 不支持') . '</p>';
    }

    /**
     * 質量設置字段
     */
    public function quality_field_callback() {
        $settings = $this->get_settings();
        $value = isset($settings['image_quality']) ? $settings['image_quality'] : 80;
        echo '<input type="range" min="1" max="100" value="' . esc_attr($value) . '" name="webp_optimizer_settings[image_quality]" id="image_quality" />';
        echo '<span id="quality_value">' . esc_html($value) . '%</span>';
        echo '<p class="description">設置圖片的壓縮質量（1-100）</p>';
    }

    /**
     * 最大寬度字段
     */
    public function max_width_field_callback() {
        $settings = $this->get_settings();
        $value = $settings['max_width'];
        echo '<input type="number" min="100" max="4000" value="' . esc_attr($value) . '" name="webp_optimizer_settings[max_width]" id="max_width" /> px';
        echo '<p class="description">超過此寬度的圖片將被自動縮放</p>';
    }

    /**
     * 刪除原文件字段
     */
    public function delete_original_field_callback() {
        $settings = $this->get_settings();
        $value = isset($settings['delete_original']) ? $settings['delete_original'] : false;
        echo '<input type="checkbox" name="webp_optimizer_settings[delete_original]" id="delete_original" value="1" ' . checked(1, $value, false) . ' />';
        echo '<label for="delete_original">轉換後刪除原始JPG/PNG/GIF文件</label>';
        echo '<p class="description">注意：此操作不可逆，請謹慎選擇</p>';
    }

    /**
     * 批次處理數量字段
     */
    public function batch_size_field_callback() {
        $settings = $this->get_settings();
        $value = isset($settings['batch_size']) ? $settings['batch_size'] : 5;
        echo '<input type="number" min="1" max="100" value="' . esc_attr($value) . '" name="webp_optimizer_settings[batch_size]" id="batch_size" />';
        echo '<p class="description">每批處理的圖片數量</p>';
    }

    /**
     * 批次間隔時間字段
     */
    public function batch_delay_field_callback() {
        $settings = $this->get_settings();
        $value = isset($settings['batch_delay']) ? $settings['batch_delay'] : 1000;
        echo '<input type="number" min="100" max="10000" value="' . esc_attr($value) . '" name="webp_optimizer_settings[batch_delay]" id="batch_delay" /> ms';
        echo '<p class="description">每批圖片之間的延遲時間（毫秒）</p>';
    }

    /**
     * WooCommerce產品圖片設定回調
     */
    public function woocommerce_settings_section_callback() {
        echo '<p>配置WooCommerce產品圖片優化設置。</p>';
    }

    /**
     * 啟用產品圖片優化字段
     */
    public function enable_woo_optimization_field_callback() {
        $settings = $this->get_settings();
        $value = isset($settings['enable_woo_optimization']) ? $settings['enable_woo_optimization'] : true;
        echo '<input type="checkbox" name="webp_optimizer_settings[enable_woo_optimization]" id="enable_woo_optimization" value="1" ' . checked(1, $value, false) . ' />';
        echo '<label for="enable_woo_optimization">啟用WooCommerce產品圖片優化</label>';
        echo '<p class="description">如果啟用，WooCommerce產品圖片將自動轉換為優化格式。</p>';
    }

    /**
     * 產品圖片尺寸字段
     */
    public function woo_product_size_field_callback() {
        $settings = $this->get_settings();
        $value = $settings['woo_product_size'];
        echo '<input type="number" min="100" max="4000" value="' . esc_attr($value) . '" name="webp_optimizer_settings[woo_product_size]" id="woo_product_size" /> px';
        echo '<p class="description">WooCommerce產品圖片的最大尺寸（寬度和高度），超過此尺寸的圖片將被自動縮放。</p>';
    }

    /**
     * 產品圖片尺寸縮放設定回調
     */
    public function product_resize_settings_section_callback() {
        echo '<p>配置產品圖片尺寸縮放的設置。</p>';
    }

    /**
     * 啟用產品圖片尺寸縮放字段
     */
    public function enable_product_image_resize_field_callback() {
        $settings = $this->get_settings();
        $value = isset($settings['enable_product_image_resize']) ? $settings['enable_product_image_resize'] : true;
        echo '<input type="checkbox" name="webp_optimizer_settings[enable_product_image_resize]" id="enable_product_image_resize" value="1" ' . checked(1, $value, false) . ' />';
        echo '<label for="enable_product_image_resize">啟用產品圖片尺寸縮放</label>';
        echo '<p class="description">如果啟用，WooCommerce產品圖片在轉換為優化格式時也會進行尺寸縮放。</p>';
    }

    /**
     * 產品圖片最大寬度字段
     */
    public function product_image_max_width_field_callback() {
        $settings = $this->get_settings();
        $value = $settings['product_image_max_width'];
        echo '<input type="number" min="100" max="4000" value="' . esc_attr($value) . '" name="webp_optimizer_settings[product_image_max_width]" id="product_image_max_width" /> px';
        echo '<p class="description">產品圖片在轉換為優化格式時的最大寬度，超過此寬度的圖片將被自動縮放。</p>';
    }

    /**
     * 產品圖片最大高度字段
     */
    public function product_image_max_height_field_callback() {
        $settings = $this->get_settings();
        $value = $settings['product_image_max_height'];
        echo '<input type="number" min="100" max="4000" value="' . esc_attr($value) . '" name="webp_optimizer_settings[product_image_max_height]" id="product_image_max_height" /> px';
        echo '<p class="description">產品圖片在轉換為優化格式時的最大高度，超過此高度的圖片將被自動縮放。</p>';
    }

    /**
     * 產品圖片縮放質量字段
     */
    public function product_image_resize_quality_field_callback() {
        $settings = $this->get_settings();
        $value = isset($settings['product_image_resize_quality']) ? $settings['product_image_resize_quality'] : 85;
        echo '<input type="range" min="1" max="100" value="' . esc_attr($value) . '" name="webp_optimizer_settings[product_image_resize_quality]" id="product_image_resize_quality" />';
        echo '<span id="product_image_resize_quality_value">' . esc_html($value) . '%</span>';
        echo '<p class="description">產品圖片在轉換為優化格式時的縮放質量（1-100）。</p>';
    }

    /**
     * 水印設定回調
     */
    public function watermark_settings_section_callback() {
        echo '<p>配置圖片水印設置。水印只會添加到文章和Portfolio的圖片，不會添加到WooCommerce產品圖片。</p>';
    }

    /**
     * 啟用水印字段
     */
    public function enable_watermark_field_callback() {
        $settings = $this->get_settings();
        $value = isset($settings['enable_watermark']) ? $settings['enable_watermark'] : false;
        echo '<input type="checkbox" name="webp_optimizer_settings[enable_watermark]" id="enable_watermark" value="1" ' . checked(1, $value, false) . ' />';
        echo '<label for="enable_watermark">啟用圖片水印功能</label>';
        echo '<p class="description">啟用後，系統會自動檢測圖片背景顏色並選擇合適的水印Logo。</p>';
    }

    /**
     * 深色Logo字段
     */
    public function watermark_dark_logo_field_callback() {
        $settings = $this->get_settings();
        $value = isset($settings['watermark_dark_logo']) ? $settings['watermark_dark_logo'] : '';
        echo '<input type="file" name="watermark_dark_logo" id="watermark_dark_logo" accept="image/*" />';
        if ($value && file_exists($value)) {
            $upload_dir = wp_upload_dir();
            $relative_path = str_replace($upload_dir['basedir'] . '/', '', $value);
            $url = $upload_dir['baseurl'] . '/' . $relative_path;
            echo '<br><img src="' . esc_url($url) . '" style="max-width: 200px; max-height: 100px; margin-top: 10px;" />';
            echo '<br><small>當前深色Logo</small>';
        }
        echo '<p class="description">上傳深色Logo，用於淺色背景的圖片。</p>';
    }

    /**
     * 淺色Logo字段
     */
    public function watermark_light_logo_field_callback() {
        $settings = $this->get_settings();
        $value = isset($settings['watermark_light_logo']) ? $settings['watermark_light_logo'] : '';
        echo '<input type="file" name="watermark_light_logo" id="watermark_light_logo" accept="image/*" />';
        if ($value && file_exists($value)) {
            $upload_dir = wp_upload_dir();
            $relative_path = str_replace($upload_dir['basedir'] . '/', '', $value);
            $url = $upload_dir['baseurl'] . '/' . $relative_path;
            echo '<br><img src="' . esc_url($url) . '" style="max-width: 200px; max-height: 100px; margin-top: 10px;" />';
            echo '<br><small>當前淺色Logo</small>';
        }
        echo '<p class="description">上傳淺色Logo，用於深色背景的圖片。</p>';
    }

    /**
     * 水印寬度字段
     */
    public function watermark_width_field_callback() {
        $settings = $this->get_settings();
        $value = isset($settings['watermark_width']) ? $settings['watermark_width'] : 100;
        echo '<input type="number" min="20" max="500" value="' . esc_attr($value) . '" name="webp_optimizer_settings[watermark_width]" id="watermark_width" /> px';
        echo '<p class="description">水印Logo的寬度，高度會自動按比例調整。</p>';
    }

    /**
     * 水印透明度字段
     */
    public function watermark_opacity_field_callback() {
        $settings = $this->get_settings();
        $value = isset($settings['watermark_opacity']) ? $settings['watermark_opacity'] : 80;
        echo '<input type="range" min="10" max="100" value="' . esc_attr($value) . '" name="webp_optimizer_settings[watermark_opacity]" id="watermark_opacity" />';
        echo '<span id="watermark_opacity_value">' . esc_html($value) . '%</span>';
        echo '<p class="description">水印的透明度（10-100）。</p>';
    }

    /**
     * 水印邊距字段
     */
    public function watermark_margin_field_callback() {
        $settings = $this->get_settings();
        $value = isset($settings['watermark_margin']) ? $settings['watermark_margin'] : 20;
        echo '<input type="number" min="5" max="100" value="' . esc_attr($value) . '" name="webp_optimizer_settings[watermark_margin]" id="watermark_margin" /> px';
        echo '<p class="description">水印距離圖片邊緣的距離。</p>';
    }

    /**
     * 水印質量字段
     */
    public function watermark_quality_field_callback() {
        $settings = $this->get_settings();
        $value = isset($settings['watermark_quality']) ? $settings['watermark_quality'] : 100;
        echo '<input type="range" min="50" max="100" value="' . esc_attr($value) . '" name="webp_optimizer_settings[watermark_quality]" id="watermark_quality" />';
        echo '<span id="watermark_quality_value">' . esc_html($value) . '%</span>';
        echo '<p class="description">水印圖片的質量設置（50-100）。較高的質量可以減少鋸齒，但會增加文件大小。</p>';
    }

    /**
     * 管理頁面
     */
    public function admin_page() {
        if (!current_user_can('manage_options')) {
            return;
        }

        // 保存設置
        if (isset($_POST['submit'])) {
            check_admin_referer('webp_optimizer_settings');

            $settings = $_POST['webp_optimizer_settings'];

            // 處理水印Logo上傳
            $upload_dir = wp_upload_dir();
            $watermark_dir = $upload_dir['basedir'] . '/watermarks';

            // 創建水印目錄
            if (!file_exists($watermark_dir)) {
                wp_mkdir_p($watermark_dir);
            }

            // 處理深色Logo上傳
            if (!empty($_FILES['watermark_dark_logo']['name'])) {
                $dark_logo = $this->handle_watermark_upload($_FILES['watermark_dark_logo'], $watermark_dir, 'dark_logo');
                if ($dark_logo) {
                    $settings['watermark_dark_logo'] = $dark_logo;
                }
            }

            // 處理淺色Logo上傳
            if (!empty($_FILES['watermark_light_logo']['name'])) {
                $light_logo = $this->handle_watermark_upload($_FILES['watermark_light_logo'], $watermark_dir, 'light_logo');
                if ($light_logo) {
                    $settings['watermark_light_logo'] = $light_logo;
                }
            }

            update_option('webp_optimizer_settings', $settings);
            // 更新後清理本地快取
            $this->cached_settings = null;
            echo '<div class="notice notice-success"><p>設置已保存！</p></div>';
        }

        $settings = $this->get_settings();
        ?>
        <section class="rankwoven-panel webp-optimizer-embedded">
            <div class="rankwoven-section-heading">
                <span class="rankwoven-eyebrow">Image Optimizer</span>
                <h2>圖片優化設置</h2>
                <p>上傳時自動轉成 WebP 或 AVIF、縮放尺寸、加上水印，並可從網址寫入媒體庫。</p>
            </div>

            <form method="post" action="" enctype="multipart/form-data">
                <?php wp_nonce_field('webp_optimizer_settings'); ?>
                <table class="form-table">
                    <tr>
                        <th scope="row">目標格式</th>
                        <td>
                            <select name="webp_optimizer_settings[target_format]" id="target_format">
                                <option value="webp" <?php selected('webp', isset($settings['target_format']) ? $settings['target_format'] : 'webp'); ?>>WebP</option>
                                <option value="avif" <?php selected('avif', isset($settings['target_format']) ? $settings['target_format'] : 'webp'); ?>>AVIF</option>
                            </select>
                            <p class="description">選擇圖片轉換的目標格式</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">圖片質量</th>
                        <td>
                            <input type="range" min="1" max="100" value="<?php echo esc_attr(isset($settings['image_quality']) ? $settings['image_quality'] : 80); ?>"
                                   name="webp_optimizer_settings[image_quality]" id="image_quality" />
                            <span id="quality_value"><?php echo esc_html(isset($settings['image_quality']) ? $settings['image_quality'] : 80); ?>%</span>
                            <p class="description">設置圖片的壓縮質量（1-100）</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">最大寬度</th>
                        <td>
                            <input type="number" min="100" max="4000" value="<?php echo esc_attr($settings['max_width']); ?>"
                                   name="webp_optimizer_settings[max_width]" id="max_width" /> px
                            <p class="description">超過此寬度的圖片將被自動縮放</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">刪除原文件</th>
                        <td>
                            <input type="checkbox" name="webp_optimizer_settings[delete_original]" id="delete_original" value="1"
                                   <?php checked(1, isset($settings['delete_original']) ? $settings['delete_original'] : false); ?> />
                            <label for="delete_original">轉換後刪除原始JPG/PNG/GIF文件</label>
                            <p class="description">注意：此操作不可逆，請謹慎選擇</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">批次處理數量</th>
                        <td>
                            <input type="number" min="1" max="100" value="<?php echo esc_attr($settings['batch_size']); ?>"
                                   name="webp_optimizer_settings[batch_size]" id="batch_size" />
                            <p class="description">每批處理的圖片數量</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">批次間隔時間</th>
                        <td>
                            <input type="number" min="100" max="10000" value="<?php echo esc_attr($settings['batch_delay']); ?>"
                                   name="webp_optimizer_settings[batch_delay]" id="batch_delay" /> ms
                            <p class="description">每批圖片之間的延遲時間（毫秒）</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">WooCommerce產品圖片優化</th>
                        <td>
                            <input type="checkbox" name="webp_optimizer_settings[enable_woo_optimization]" id="enable_woo_optimization" value="1"
                                   <?php checked(1, isset($settings['enable_woo_optimization']) ? $settings['enable_woo_optimization'] : true); ?> />
                            <label for="enable_woo_optimization">啟用WooCommerce產品圖片優化</label>
                            <p class="description">如果啟用，WooCommerce產品圖片將自動轉換為優化格式。</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">產品圖片尺寸</th>
                        <td>
                            <input type="number" min="100" max="4000" value="<?php echo esc_attr($settings['woo_product_size']); ?>"
                                   name="webp_optimizer_settings[woo_product_size]" id="woo_product_size" /> px
                            <p class="description">WooCommerce產品圖片的最大尺寸（寬度和高度），超過此尺寸的圖片將被自動縮放。</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">產品圖片尺寸縮放</th>
                        <td>
                            <input type="checkbox" name="webp_optimizer_settings[enable_product_image_resize]" id="enable_product_image_resize" value="1"
                                   <?php checked(1, isset($settings['enable_product_image_resize']) ? $settings['enable_product_image_resize'] : true); ?> />
                            <label for="enable_product_image_resize">啟用產品圖片尺寸縮放</label>
                            <p class="description">如果啟用，WooCommerce產品圖片在轉換為優化格式時也會進行尺寸縮放。</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">產品圖片最大寬度</th>
                        <td>
                            <input type="number" min="100" max="4000" value="<?php echo esc_attr($settings['product_image_max_width']); ?>"
                                   name="webp_optimizer_settings[product_image_max_width]" id="product_image_max_width" /> px
                            <p class="description">產品圖片在轉換為優化格式時的最大寬度，超過此寬度的圖片將被自動縮放。</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">產品圖片最大高度</th>
                        <td>
                            <input type="number" min="100" max="4000" value="<?php echo esc_attr($settings['product_image_max_height']); ?>"
                                   name="webp_optimizer_settings[product_image_max_height]" id="product_image_max_height" /> px
                            <p class="description">產品圖片在轉換為優化格式時的最大高度，超過此高度的圖片將被自動縮放。</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">產品圖片縮放質量</th>
                        <td>
                            <input type="range" min="1" max="100" value="<?php echo esc_attr($settings['product_image_resize_quality']); ?>"
                                   name="webp_optimizer_settings[product_image_resize_quality]" id="product_image_resize_quality" />
                            <span id="product_image_resize_quality_value"><?php echo esc_html($settings['product_image_resize_quality']); ?>%</span>
                            <p class="description">產品圖片在轉換為優化格式時的縮放質量（1-100）。</p>
                        </td>
                    </tr>

                    <!-- 水印設定 -->
                    <tr>
                        <th scope="row" colspan="2">
                            <h3 style="margin: 0; padding: 10px 0; border-bottom: 1px solid #ccc;">水印設定</h3>
                            <p style="margin: 5px 0 0 0; font-weight: normal;">配置圖片水印設置。水印只會添加到文章和Portfolio的圖片，不會添加到WooCommerce產品圖片。</p>
                        </th>
                    </tr>
                    <tr>
                        <th scope="row">啟用水印</th>
                        <td>
                            <input type="checkbox" name="webp_optimizer_settings[enable_watermark]" id="enable_watermark" value="1"
                                   <?php checked(1, isset($settings['enable_watermark']) ? $settings['enable_watermark'] : false); ?> />
                            <label for="enable_watermark">啟用圖片水印功能</label>
                            <p class="description">啟用後，系統會自動檢測圖片背景顏色並選擇合適的水印Logo。</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">深色Logo</th>
                        <td>
                            <input type="file" name="watermark_dark_logo" id="watermark_dark_logo" accept="image/*" />
                            <?php
                            $dark_logo = isset($settings['watermark_dark_logo']) ? $settings['watermark_dark_logo'] : '';
                            if ($dark_logo && file_exists($dark_logo)) {
                                $upload_dir = wp_upload_dir();
                                $relative_path = str_replace($upload_dir['basedir'] . '/', '', $dark_logo);
                                $url = $upload_dir['baseurl'] . '/' . $relative_path;
                                echo '<br><img src="' . esc_url($url) . '" style="max-width: 200px; max-height: 100px; margin-top: 10px;" />';
                                echo '<br><small>當前深色Logo</small>';
                            }
                            ?>
                            <p class="description">上傳深色Logo，用於淺色背景的圖片。</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">淺色Logo</th>
                        <td>
                            <input type="file" name="watermark_light_logo" id="watermark_light_logo" accept="image/*" />
                            <?php
                            $light_logo = isset($settings['watermark_light_logo']) ? $settings['watermark_light_logo'] : '';
                            if ($light_logo && file_exists($light_logo)) {
                                $upload_dir = wp_upload_dir();
                                $relative_path = str_replace($upload_dir['basedir'] . '/', '', $light_logo);
                                $url = $upload_dir['baseurl'] . '/' . $relative_path;
                                echo '<br><img src="' . esc_url($url) . '" style="max-width: 200px; max-height: 100px; margin-top: 10px;" />';
                                echo '<br><small>當前淺色Logo</small>';
                            }
                            ?>
                            <p class="description">上傳淺色Logo，用於深色背景的圖片。</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">水印寬度</th>
                        <td>
                            <input type="number" min="20" max="500" value="<?php echo esc_attr(isset($settings['watermark_width']) ? $settings['watermark_width'] : 100); ?>"
                                   name="webp_optimizer_settings[watermark_width]" id="watermark_width" /> px
                            <p class="description">水印Logo的寬度，高度會自動按比例調整。</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">水印透明度</th>
                        <td>
                            <input type="range" min="10" max="100" value="<?php echo esc_attr(isset($settings['watermark_opacity']) ? $settings['watermark_opacity'] : 80); ?>"
                                   name="webp_optimizer_settings[watermark_opacity]" id="watermark_opacity" />
                            <span id="watermark_opacity_value"><?php echo esc_html(isset($settings['watermark_opacity']) ? $settings['watermark_opacity'] : 80); ?>%</span>
                            <p class="description">水印的透明度（10-100）。</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">水印邊距</th>
                        <td>
                            <input type="number" min="5" max="100" value="<?php echo esc_attr(isset($settings['watermark_margin']) ? $settings['watermark_margin'] : 20); ?>"
                                   name="webp_optimizer_settings[watermark_margin]" id="watermark_margin" /> px
                            <p class="description">水印距離圖片邊緣的距離。</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">水印質量</th>
                        <td>
                            <input type="range" min="50" max="100" value="<?php echo esc_attr(isset($settings['watermark_quality']) ? $settings['watermark_quality'] : 100); ?>"
                                   name="webp_optimizer_settings[watermark_quality]" id="watermark_quality" />
                            <span id="watermark_quality_value"><?php echo esc_html(isset($settings['watermark_quality']) ? $settings['watermark_quality'] : 100); ?>%</span>
                            <p class="description">水印圖片的質量設置（50-100）。較高的質量可以減少鋸齒，但會增加文件大小。</p>
                        </td>
                    </tr>
                </table>

                <p class="submit">
                    <input type="submit" name="submit" id="submit" class="button button-primary" value="保存設置">
                </p>
            </form>

            <div class="card">
                <h2>系統信息</h2>
                <p><strong>WebP支持：</strong> <?php echo $this->is_webp_supported() ? '✓ 支持' : '✗ 不支持'; ?></p>
                <p><strong>AVIF支持：</strong> <?php echo $this->is_avif_supported() ? '✓ 支持' : '✗ 不支持'; ?></p>
                <p><strong>圖片處理庫：</strong>
                    <?php
                    if (extension_loaded('imagick')) {
                        echo 'Imagick';
                    } elseif (extension_loaded('gd')) {
                        echo 'GD';
                    } else {
                        echo '無';
                    }
                    ?>
                </p>
                <p><strong>待轉換圖片數量：</strong> <?php echo $this->get_pending_images_count(); ?> 張</p>
                <p><strong>WooCommerce產品圖片優化：</strong> <?php echo isset($settings['enable_woo_optimization']) && $settings['enable_woo_optimization'] ? '✓ 已啟用' : '✗ 未啟用'; ?></p>
                <?php if (isset($settings['enable_woo_optimization']) && $settings['enable_woo_optimization']): ?>
                <p><strong>產品圖片尺寸限制：</strong> <?php echo $settings['woo_product_size']; ?> × <?php echo $settings['woo_product_size']; ?> px</p>
                <?php endif; ?>
                <p><strong>產品圖片尺寸縮放：</strong> <?php echo isset($settings['enable_product_image_resize']) && $settings['enable_product_image_resize'] ? '✓ 已啟用' : '✗ 未啟用'; ?></p>
                <?php if (isset($settings['enable_product_image_resize']) && $settings['enable_product_image_resize']): ?>
                <p><strong>產品圖片最大尺寸：</strong> <?php echo $settings['product_image_max_width']; ?> × <?php echo $settings['product_image_max_height']; ?> px</p>
                <p><strong>需要縮放的產品圖片：</strong> <span id="oversized_product_count">點擊"檢查產品圖片尺寸"按鈕查看</span></p>
                <?php endif; ?>
                <p><strong>水印功能：</strong> <?php echo isset($settings['enable_watermark']) && $settings['enable_watermark'] ? '✓ 已啟用' : '✗ 未啟用'; ?></p>
                <?php if (isset($settings['enable_watermark']) && $settings['enable_watermark']): ?>
                <p><strong>水印寬度：</strong> <?php echo isset($settings['watermark_width']) ? $settings['watermark_width'] : 100; ?> px</p>
                <p><strong>水印透明度：</strong> <?php echo isset($settings['watermark_opacity']) ? $settings['watermark_opacity'] : 80; ?>%</p>
                <p><strong>水印邊距：</strong> <?php echo isset($settings['watermark_margin']) ? $settings['watermark_margin'] : 20; ?> px</p>
                <p><strong>水印質量：</strong> <?php echo isset($settings['watermark_quality']) ? $settings['watermark_quality'] : 100; ?>%</p>
                <?php endif; ?>
            </div>

            <div class="card">
                <h2>快速操作</h2>
                <p><a href="<?php echo esc_url(admin_url('admin.php?page=rankwoven-seo-image-convert')); ?>" class="button button-secondary">批量轉換媒體庫圖片</a></p>
                <?php if (isset($settings['enable_product_image_resize']) && $settings['enable_product_image_resize']): ?>
                <p><button id="check_product_sizes" class="button button-secondary">檢查產品圖片尺寸</button> <small>（點擊此按鈕檢查需要縮放的產品圖片數量）</small></p>
                <p><button id="resize_product_images" class="button button-primary" style="display:none;">批量縮放產品圖片</button></p>
                <?php endif; ?>
            </div>
        </section>

        <script>
        jQuery(document).ready(function($) {
            $('#image_quality').on('input', function() {
                $('#quality_value').text($(this).val() + '%');
            });

            $('#product_image_resize_quality').on('input', function() {
                $('#product_image_resize_quality_value').text($(this).val() + '%');
            });

            $('#watermark_opacity').on('input', function() {
                $('#watermark_opacity_value').text($(this).val() + '%');
            });

            $('#watermark_quality').on('input', function() {
                $('#watermark_quality_value').text($(this).val() + '%');
            });

            // 產品圖片尺寸檢查
            $('#check_product_sizes').click(function() {
                var button = $(this);
                button.prop('disabled', true).text('檢查中...');

                $.ajax({
                    url: ajaxurl,
                    type: 'POST',
                    data: {
                        action: 'webp_optimizer_check_product_image_sizes',
                        nonce: '<?php echo wp_create_nonce('webp_optimizer_batch_convert'); ?>'
                    },
                    success: function(response) {
                        if (response.success) {
                            $('#oversized_product_count').text(response.data.oversized_count + ' 張');

                            if (response.data.oversized_count > 0) {
                                $('#resize_product_images').show();
                                alert('發現 ' + response.data.oversized_count + ' 張需要縮放的產品圖片！\n\n總產品圖片：' + response.data.total_count + ' 張\n需要縮放：' + response.data.oversized_count + ' 張\n最大尺寸限制：' + response.data.max_width + ' × ' + response.data.max_height + ' px\n\n注意：這包括已經轉換為WebP/AVIF格式的圖片。');
                            } else {
                                $('#resize_product_images').hide();
                                alert('所有產品圖片尺寸都在限制範圍內！\n\n總產品圖片：' + response.data.total_count + ' 張\n需要縮放：0 張');
                            }
                        } else {
                            alert('檢查失敗：' + (response.data || '未知錯誤'));
                        }
                    },
                    error: function() {
                        alert('檢查失敗：網絡錯誤');
                    },
                    complete: function() {
                        button.prop('disabled', false).text('檢查產品圖片尺寸');
                    }
                });
            });

            // 批量縮放產品圖片
            $('#resize_product_images').click(function() {
                if (!confirm('確定要批量縮放所有超過尺寸限制的產品圖片嗎？此操作不可逆！\n\n注意：這將分批處理所有產品圖片，包括已經轉換為WebP/AVIF格式的圖片。')) {
                    return;
                }

                var button = $(this);
                button.prop('disabled', true).text('縮放中...');

                // 初始化批次處理變量
                var currentBatch = 0;
                var totalProcessed = 0;
                var isProcessing = true;

                function startResize() {
                    if (!isProcessing) return;

                    $.ajax({
                        url: ajaxurl,
                        type: 'POST',
                        data: {
                            action: 'webp_optimizer_resize_product_images',
                            nonce: '<?php echo wp_create_nonce('webp_optimizer_batch_convert'); ?>',
                            current_batch: currentBatch,
                            total_processed: totalProcessed
                        },
                        timeout: 30000,
                        success: function(response) {
                            if (response.success) {
                                if (response.data.log) {
                                    console.log('第' + (currentBatch + 1) + '批處理結果:', response.data.log);
                                }

                                // 確保數據存在
                                var resized = response.data.resized || 0;
                                var failed = response.data.failed || 0;
                                var total_product_images = response.data.total_product_images || 0;
                                var total_oversized = response.data.total_oversized || 0;
                                var progress = response.data.progress || 0;

                                // 更新處理統計
                                totalProcessed = response.data.total_processed || totalProcessed;
                                currentBatch = response.data.next_batch || (currentBatch + 1);

                                // 顯示進度信息
                                console.log('批次進度:', {
                                    '當前批次': currentBatch,
                                    '本批成功': resized,
                                    '本批失敗': failed,
                                    '總處理': totalProcessed,
                                    '總需要縮放': total_oversized,
                                    '進度': progress + '%'
                                });

                                if (response.data.completed) {
                                    // 所有批次處理完成
                                    isProcessing = false;
                                    button.prop('disabled', false).text('批量縮放產品圖片');
                                    alert('產品圖片縮放完成！\n\n批次統計：\n成功：' + resized + ' 張\n失敗：' + failed + ' 張\n\n總體統計：\n總產品圖片：' + total_product_images + ' 張\n需要縮放：' + total_oversized + ' 張\n已處理：' + totalProcessed + ' 張\n\n進度：' + progress + '%');
                                    location.reload();
                                } else {
                                    // 繼續下一批
                                    console.log('準備處理第' + currentBatch + '批...');
                                    setTimeout(startResize, <?php echo isset($settings['batch_delay']) ? intval($settings['batch_delay']) : 1000; ?>);
                                }
                            } else {
                                isProcessing = false;
                                alert('縮放失敗：' + (response.data || '未知錯誤'));
                                button.prop('disabled', false).text('批量縮放產品圖片');
                            }
                        },
                        error: function(xhr, status, error) {
                            console.error('AJAX錯誤:', status, error);
                            console.error('響應:', xhr.responseText);

                            if (status === 'timeout') {
                                alert('請求超時，請檢查服務器負載');
                            } else {
                                alert('縮放失敗：網絡錯誤 (' + status + ')');
                            }
                            isProcessing = false;
                            button.prop('disabled', false).text('批量縮放產品圖片');
                        }
                    });
                }

                startResize();
            });
        });
        </script>
        <?php
    }

    /**
     * 批量轉換頁面
     */
    public function batch_convert_page() {
        if (!current_user_can('manage_options')) {
            return;
        }

        $pending_count = $this->get_pending_images_count();
        ?>
        <section class="rankwoven-panel webp-optimizer-embedded">
            <div class="rankwoven-section-heading">
                <span class="rankwoven-eyebrow">Batch Convert</span>
                <h2>批量轉換圖片</h2>
                <p>掃描媒體庫中尚未轉換的 JPG／PNG／GIF，分批轉成設定的目標格式。</p>
            </div>

            <?php
            $settings = $this->get_settings();
            $target_format = isset($settings['target_format']) ? $settings['target_format'] : 'webp';
            $is_supported = ($target_format === 'webp' && $this->is_webp_supported()) ||
                           ($target_format === 'avif' && $this->is_avif_supported());
            ?>

            <?php if (!$is_supported): ?>
                <div class="notice notice-error">
                    <p>您的服務器不支持<?php echo strtoupper($target_format); ?>格式，無法進行轉換。</p>
                </div>
            <?php else: ?>
                <div class="webp-optimizer-card">
                    <h2>轉換統計</h2>
                    <div class="webp-optimizer-stats">
                        <div class="webp-optimizer-stat">
                            <span class="webp-optimizer-stat-number"><?php echo $pending_count; ?></span>
                            <span class="webp-optimizer-stat-label">待轉換圖片</span>
                        </div>
                        <div class="webp-optimizer-stat">
                            <span class="webp-optimizer-stat-number" id="converted_count">0</span>
                            <span class="webp-optimizer-stat-label">已轉換圖片</span>
                        </div>
                        <div class="webp-optimizer-stat">
                            <span class="webp-optimizer-stat-number" id="failed_count">0</span>
                            <span class="webp-optimizer-stat-label">轉換失敗</span>
                        </div>
                    </div>

                    <?php
                    // 統計產品圖片數量
                    $product_images_count = $this->get_pending_product_images_count();
                    if ($product_images_count > 0):
                    ?>
                    <div class="webp-optimizer-stats-detail">
                        <p><strong>圖片類型統計：</strong></p>
                        <ul>
                            <li>WooCommerce產品圖片：<?php echo $product_images_count; ?> 張（將縮放為<?php echo isset($settings['woo_product_size']) ? $settings['woo_product_size'] : 800; ?>×<?php echo isset($settings['woo_product_size']) ? $settings['woo_product_size'] : 800; ?>px）</li>
                            <li>一般圖片：<?php echo $pending_count - $product_images_count; ?> 張（最大寬度1600px）</li>
                        </ul>
                    </div>
                    <?php endif; ?>
                </div>

                <div class="webp-optimizer-card">
                    <h2><?php echo strtoupper($target_format); ?>格式圖片數據庫修復</h2>
                    <p style="margin-bottom: 15px; color: #666;">掃描並修復已轉換為<?php echo strtoupper($target_format); ?>格式但數據庫MIME類型還是舊格式的圖片</p>

                    <div class="webp-optimizer-stats">
                        <div class="webp-optimizer-stat">
                            <span class="webp-optimizer-stat-number" id="broken_links_count">-</span>
                            <span class="webp-optimizer-stat-label"><?php echo strtoupper($target_format); ?>格式不匹配</span>
                        </div>
                        <div class="webp-optimizer-stat">
                            <span class="webp-optimizer-stat-number" id="fixed_links_count">0</span>
                            <span class="webp-optimizer-stat-label">已修復</span>
                        </div>
                    </div>

                    <div class="webp-optimizer-controls">
                        <button id="scan_database" class="button button-secondary">掃描數據庫</button>
                        <button id="fix_database" class="button button-primary" style="display: none;">修復<?php echo strtoupper($target_format); ?>格式</button>
                        <button id="fix_database_progress" class="button button-secondary" style="display: none;">修復中...</button>
                    </div>

                    <div id="database_scan_log" class="webp-optimizer-log" style="display: none;">
                        <p>掃描結果將顯示在這裡...</p>
                    </div>
                </div>

                <div class="webp-optimizer-card">
                    <h2>轉換控制</h2>
                    <div id="conversion_progress" style="display: none;">
                        <div class="webp-optimizer-progress">
                            <div id="progress_fill" class="webp-optimizer-progress-fill" style="width: 0%;"></div>
                        </div>
                        <p id="progress_text" class="webp-optimizer-progress-text">準備中...</p>
                        <button id="stop_conversion" class="button button-secondary">停止轉換</button>
                    </div>

                    <div id="conversion_controls" class="webp-optimizer-controls">
                        <button id="start_conversion" class="button button-primary">開始批量轉換</button>
                        <button id="scan_images" class="button button-secondary">重新掃描圖片</button>
                    </div>
                </div>

                <div class="webp-optimizer-card">
                    <h2>轉換日誌</h2>
                    <div id="conversion_log" class="webp-optimizer-log">
                        <p>等待開始轉換...</p>
                    </div>
                </div>

                <div class="webp-optimizer-card">
                    <h2>轉換說明</h2>
                    <ul>
                        <li>批量轉換會自動處理媒體庫中所有JPG、PNG和GIF格式的圖片</li>
                        <li><strong>格式轉換：</strong>將圖片轉換為<?php echo strtoupper($target_format); ?>格式以減少文件大小</li>
                        <li><strong>尺寸縮放：</strong>自動縮放過大的圖片以優化加載速度</li>
                        <li><strong>一般圖片：</strong>最大寬度1600px，按比例縮放</li>
                        <li><strong>WooCommerce產品圖片：</strong>自動調整為<?php echo isset($settings['woo_product_size']) ? $settings['woo_product_size'] : 800; ?>×<?php echo isset($settings['woo_product_size']) ? $settings['woo_product_size'] : 800; ?>px的正方形尺寸</li>
                        <li>轉換後的<?php echo strtoupper($target_format); ?>圖片會自動替換原始圖片</li>
                        <li>可以隨時停止轉換過程</li>
                        <li>轉換日誌會顯示詳細的處理結果</li>
                        <li><strong>批次處理：</strong>每批處理<?php echo isset($settings['batch_size']) ? $settings['batch_size'] : 5; ?>張圖片，批次間隔<?php echo isset($settings['batch_delay']) ? $settings['batch_delay'] : 1000; ?>毫秒</li>
                        <li><strong>錯誤處理：</strong>網絡錯誤時會自動重試，超時錯誤會延遲5秒後重試</li>
                    </ul>
                </div>
            <?php endif; ?>
        </section>

        <script>
        jQuery(document).ready(function($) {
            var isConverting = false;
            var convertedCount = 0;
            var failedCount = 0;
            var batchDelay = <?php echo isset($settings['batch_delay']) ? intval($settings['batch_delay']) : 1000; ?>;

            $('#start_conversion').click(function() {
                if (isConverting) return;

                isConverting = true;
                convertedCount = 0;
                failedCount = 0;

                $('#conversion_controls').hide();
                $('#conversion_progress').show();
                $('#conversion_log').html('<p class="info">開始批量轉換...</p>');

                startBatchConversion();
            });

            $('#stop_conversion').click(function() {
                isConverting = false;
                $('#conversion_progress').hide();
                $('#conversion_controls').show();
                $('#conversion_log').append('<p class="warning">轉換已停止</p>');
            });

            $('#scan_images').click(function() {
                location.reload();
            });

            // 數據庫掃描功能
            $('#scan_database').click(function() {
                var $button = $(this);
                $button.prop('disabled', true).text('掃描中...');

                $.ajax({
                    url: ajaxurl,
                    type: 'POST',
                    data: {
                        action: 'webp_optimizer_scan_database',
                        nonce: '<?php echo wp_create_nonce('webp_optimizer_scan_database'); ?>'
                    },
                    success: function(response) {
                        if (response.success) {
                            var brokenCount = response.data.broken_count || 0;
                            var debugInfo = response.data.debug_info || [];
                            $('#broken_links_count').text(brokenCount);

                            if (brokenCount > 0) {
                                $('#fix_database').show();
                                var logHtml = '<p class="info">發現 ' + brokenCount + ' 個數據庫連接錯誤</p>';

                                if (debugInfo.length > 0) {
                                    logHtml += '<div class="debug-details" style="margin-top: 10px; padding: 10px; background: #f9f9f9; border-left: 4px solid #0073aa; max-height: 200px; overflow-y: auto;">';
                                    logHtml += '<h4 style="margin: 0 0 10px 0;">詳細錯誤信息：</h4>';
                                    logHtml += '<ul style="margin: 0; padding-left: 20px;">';
                                    debugInfo.forEach(function(info) {
                                        logHtml += '<li style="margin-bottom: 5px; font-size: 12px;">' + info + '</li>';
                                    });
                                    logHtml += '</ul></div>';
                                }

                                $('#database_scan_log').show().html(logHtml);
                            } else {
                                $('#database_scan_log').show().html('<p class="success">掃描完成，未發現數據庫連接錯誤</p>');
                            }
                        } else {
                            $('#database_scan_log').show().html('<p class="error">掃描失敗: ' + (response.data || '未知錯誤') + '</p>');
                        }
                    },
                    error: function() {
                        $('#database_scan_log').show().html('<p class="error">掃描失敗，請檢查網絡連接</p>');
                    },
                    complete: function() {
                        $button.prop('disabled', false).text('掃描數據庫');
                    }
                });
            });

            // 數據庫修復功能
            $('#fix_database').click(function() {
                var $button = $(this);
                var $progress = $('#fix_database_progress');
                var $fixButton = $('#fix_database');

                $fixButton.hide();
                $progress.show();

                $.ajax({
                    url: ajaxurl,
                    type: 'POST',
                    data: {
                        action: 'webp_optimizer_fix_database',
                        nonce: '<?php echo wp_create_nonce('webp_optimizer_fix_database'); ?>'
                    },
                    success: function(response) {
                        if (response.success) {
                            var fixedCount = response.data.fixed_count || 0;
                            $('#fixed_links_count').text(fixedCount);
                            $('#broken_links_count').text('0');

                            $('#database_scan_log').html('<p class="success">修復完成！成功修復 ' + fixedCount + ' 個數據庫連接</p>');
                            $('#fix_database').hide();
                        } else {
                            $('#database_scan_log').html('<p class="error">修復失敗: ' + (response.data || '未知錯誤') + '</p>');
                            $('#fix_database').show();
                        }
                    },
                    error: function() {
                        $('#database_scan_log').html('<p class="error">修復失敗，請檢查網絡連接</p>');
                        $('#fix_database').show();
                    },
                    complete: function() {
                        $progress.hide();
                    }
                });
            });

            function startBatchConversion() {
                if (!isConverting) return;

                $.ajax({
                    url: ajaxurl,
                    type: 'POST',
                    data: {
                        action: 'webp_optimizer_batch_convert',
                        nonce: '<?php echo wp_create_nonce('webp_optimizer_batch_convert'); ?>'
                    },
                    timeout: 30000, // 30秒超時
                    success: function(response) {
                        if (response.success) {
                            convertedCount += response.data.converted || 0;
                            failedCount += response.data.failed || 0;

                            $('#converted_count').text(convertedCount);
                            $('#failed_count').text(failedCount);

                            if (response.data.log) {
                                $('#conversion_log').append('<p>' + response.data.log + '</p>');
                                $('#conversion_log').scrollTop($('#conversion_log')[0].scrollHeight);
                            }

                            if (response.data.progress !== undefined) {
                                $('#progress_fill').css('width', response.data.progress + '%');
                                $('#progress_text').text('進度: ' + response.data.progress + '% (' +
                                    (response.data.total_processed || 0) + '/' +
                                    ((response.data.total_pending || 0) + (response.data.total_processed || 0)) + ')');
                            }

                            if (response.data.completed) {
                                isConverting = false;
                                $('#conversion_progress').hide();
                                $('#conversion_controls').show();
                                $('#conversion_log').append('<p class="success"><strong>轉換完成！</strong></p>');
                            } else if (isConverting) {
                                // 添加延遲，減輕服務器負載
                                setTimeout(startBatchConversion, batchDelay);
                            }
                        } else {
                            $('#conversion_log').append('<p class="error">錯誤: ' + (response.data || '未知錯誤') + '</p>');
                            isConverting = false;
                            $('#conversion_progress').hide();
                            $('#conversion_controls').show();
                        }
                    },
                    error: function(xhr, status, error) {
                        var errorMsg = '網絡錯誤';
                        if (status === 'timeout') {
                            errorMsg = '請求超時，請檢查服務器負載';
                        } else if (xhr.status) {
                            errorMsg = 'HTTP錯誤: ' + xhr.status;
                        }

                        $('#conversion_log').append('<p class="error">' + errorMsg + '</p>');

                        // 如果是網絡錯誤，嘗試重試
                        if (isConverting && (status === 'timeout' || xhr.status >= 500)) {
                            $('#conversion_log').append('<p class="warning">5秒後重試...</p>');
                            setTimeout(startBatchConversion, 5000);
                        } else {
                            isConverting = false;
                            $('#conversion_progress').hide();
                            $('#conversion_controls').show();
                        }
                    }
                });
            }
        });
        </script>
        <?php
    }

    /**
     * AJAX掃描數據庫
     */
    public function ajax_scan_database() {
        check_ajax_referer('webp_optimizer_scan_database', 'nonce');

        if (!current_user_can('manage_options')) {
            wp_die('權限不足');
        }

        $scan_result = $this->scan_database_for_broken_links();
        $broken_count = is_array($scan_result) ? $scan_result['count'] : $scan_result;
        $debug_info = is_array($scan_result) ? $scan_result['debug_info'] : array();

        wp_send_json_success(array(
            'broken_count' => $broken_count,
            'debug_info' => $debug_info
        ));
    }

    /**
     * AJAX修復數據庫
     */
    public function ajax_fix_database() {
        check_ajax_referer('webp_optimizer_fix_database', 'nonce');

        if (!current_user_can('manage_options')) {
            wp_die('權限不足');
        }

        $fixed_count = $this->fix_database_links();

        wp_send_json_success(array(
            'fixed_count' => $fixed_count
        ));
    }

    /**
     * AJAX批量轉換處理
     */
    public function ajax_batch_convert() {
        check_ajax_referer('webp_optimizer_batch_convert', 'nonce');

        if (!current_user_can('manage_options')) {
            wp_die('權限不足');
        }

        $settings = $this->get_settings();
        $batch_size = isset($settings['batch_size']) ? intval($settings['batch_size']) : 5;
        $converted = 0;
        $failed = 0;
        $log = '';

        // 獲取待轉換的圖片
        $pending_images = $this->get_pending_images($batch_size);

        if (empty($pending_images)) {
            wp_send_json_success(array(
                'completed' => true,
                'converted' => 0,
                'failed' => 0,
                'log' => '沒有待轉換的圖片',
                'progress' => 100
            ));
        }

        foreach ($pending_images as $image) {
            try {
                $file_path = get_attached_file($image->ID);

                if ($file_path && file_exists($file_path)) {
                    $target_format = isset($settings['target_format']) ? $settings['target_format'] : 'webp';

                    // 檢測是否為WooCommerce產品圖片
                    $is_woo_product = $this->is_attachment_woocommerce_product($image->ID);
                    $convert_context = $is_woo_product ? 'woocommerce_product' : 'general';

                    $result = $this->convert_image($file_path, $settings, $target_format, $convert_context, $image->ID);

                    if ($result && $result !== $file_path) {
                        $converted++;
                        $context_info = $is_woo_product ? ' (產品圖片)' : '';
                        $log .= "✓ 轉換成功: " . basename($file_path) . $context_info . "<br>";

                        // 更新附件元數據
                        $this->update_attachment_metadata($image->ID, $result, $target_format);
                    } else {
                        $failed++;
                        $log .= "✗ 轉換失敗: " . basename($file_path) . "<br>";
                    }
                } else {
                    $failed++;
                    $log .= "✗ 文件不存在: " . (isset($file_path) ? basename($file_path) : '未知文件') . "<br>";
                }
            } catch (Exception $e) {
                $failed++;
                $log .= "✗ 處理錯誤: " . (isset($image->post_title) ? $image->post_title : '未知圖片') . " - " . $e->getMessage() . "<br>";
            }
        }

        // 計算進度
        $total_pending = $this->get_pending_images_count();
        $total_processed = $this->get_total_processed_count();
        $total_images = $total_pending + $total_processed;

        if ($total_images > 0) {
            $progress = ($total_processed / $total_images) * 100;
        } else {
            $progress = 100;
        }

        wp_send_json_success(array(
            'converted' => $converted,
            'failed' => $failed,
            'log' => $log,
            'progress' => round($progress, 1),
            'completed' => $total_pending <= $batch_size,
            'total_pending' => $total_pending,
            'total_processed' => $total_processed
        ));
    }

    /**
     * 獲取待轉換的圖片
     */
    private function get_pending_images($limit = 10) {
        global $wpdb;

        $sql = $wpdb->prepare("
            SELECT p.ID, p.post_title, pm.meta_value as file_path
            FROM {$wpdb->posts} p
            LEFT JOIN {$wpdb->postmeta} pm ON p.ID = pm.post_id AND pm.meta_key = '_wp_attached_file'
            WHERE p.post_type = 'attachment'
            AND p.post_mime_type IN ('image/jpeg', 'image/png', 'image/gif')
            AND p.ID NOT IN (
                SELECT post_id FROM {$wpdb->postmeta}
                WHERE meta_key = '_image_converted'
            )
            AND (pm.meta_value IS NULL OR pm.meta_value NOT LIKE '%/watermarks/%')
            AND (pm.meta_value IS NULL OR pm.meta_value NOT LIKE '%watermark%')
            AND (pm.meta_value IS NULL OR pm.meta_value NOT LIKE '%logo%')
            ORDER BY p.ID DESC
            LIMIT %d
        ", $limit);

        $results = $wpdb->get_results($sql);

        // 進一步過濾水印圖片
        $filtered_results = array();
        foreach ($results as $result) {
            if ($result->file_path && !$this->is_watermark_image($result->file_path)) {
                $filtered_results[] = $result;
            }
        }

        return $filtered_results;
    }

    /**
     * 獲取待轉換圖片數量
     */
    private function get_pending_images_count() {
        global $wpdb;

        $sql = "
            SELECT COUNT(*)
            FROM {$wpdb->posts} p
            LEFT JOIN {$wpdb->postmeta} pm ON p.ID = pm.post_id AND pm.meta_key = '_wp_attached_file'
            WHERE p.post_type = 'attachment'
            AND p.post_mime_type IN ('image/jpeg', 'image/png', 'image/gif')
            AND p.ID NOT IN (
                SELECT post_id FROM {$wpdb->postmeta}
                WHERE meta_key = '_image_converted'
            )
            AND (pm.meta_value IS NULL OR pm.meta_value NOT LIKE '%/watermarks/%')
            AND (pm.meta_value IS NULL OR pm.meta_value NOT LIKE '%watermark%')
            AND (pm.meta_value IS NULL OR pm.meta_value NOT LIKE '%logo%')
        ";

        $count = $wpdb->get_var($sql);

        // 由於SQL無法完全過濾，我們需要進一步檢查
        // 這裡返回一個估算值，實際數量會在get_pending_images中進一步過濾
        return $count;
    }

    /**
     * 獲取已處理的圖片數量
     */
    private function get_total_processed_count() {
        global $wpdb;

        $sql = "
            SELECT COUNT(*)
            FROM {$wpdb->postmeta} pm
            WHERE pm.meta_key = '_image_converted'
        ";

        return $wpdb->get_var($sql);
    }

    /**
     * 獲取待轉換的產品圖片數量
     */
    private function get_pending_product_images_count() {
        global $wpdb;

        $sql = $wpdb->prepare("
            SELECT COUNT(*)
            FROM {$wpdb->posts} p
            LEFT JOIN {$wpdb->postmeta} pm ON p.ID = pm.post_id AND pm.meta_key = '_wp_attached_file'
            WHERE p.post_type = 'attachment'
            AND p.post_mime_type IN ('image/jpeg', 'image/png', 'image/gif')
            AND p.ID NOT IN (
                SELECT post_id FROM {$wpdb->postmeta}
                WHERE meta_key = '_image_converted'
            )
            AND p.ID IN (
                SELECT post_id FROM {$wpdb->postmeta}
                WHERE meta_key = '_thumbnail_id' OR meta_key = '_product_image_gallery'
            )
        ");

        return $wpdb->get_var($sql);
    }

    /**
     * 更新附件元數據
     */
    private function update_attachment_metadata($attachment_id, $converted_path, $format = 'webp') {
        if ($format === 'resized') {
            // 標記為已縮放
            update_post_meta($attachment_id, '_image_resized', true);
            update_post_meta($attachment_id, '_resized_file', $converted_path);
            update_post_meta($attachment_id, '_resized_time', current_time('mysql'));
        } else {
            // 標記為已轉換
            update_post_meta($attachment_id, '_image_converted', true);
            update_post_meta($attachment_id, '_converted_file', $converted_path);
            update_post_meta($attachment_id, '_converted_format', $format);

            // 更新MIME類型
            $mime_type = $format === 'webp' ? 'image/webp' : 'image/avif';
            wp_update_post(array(
                'ID' => $attachment_id,
                'post_mime_type' => $mime_type
            ));

            // 更新WordPress核心附件元數據
            $this->update_core_attachment_metadata($attachment_id, $converted_path, $format);
        }
    }

    /**
     * 更新WordPress核心附件元數據
     */
    private function update_core_attachment_metadata($attachment_id, $converted_path, $format = 'webp') {
        // 獲取原始附件元數據
        $original_metadata = wp_get_attachment_metadata($attachment_id);
        if (!$original_metadata) {
            return false;
        }

        // 獲取轉換後的圖片信息
        $converted_info = getimagesize($converted_path);
        if (!$converted_info) {
            return false;
        }

        // 更新圖片尺寸信息
        $original_metadata['width'] = $converted_info[0];
        $original_metadata['height'] = $converted_info[1];
        $original_metadata['file'] = $this->get_relative_path($converted_path);

        // 更新MIME類型
        $original_metadata['mime_type'] = $format === 'webp' ? 'image/webp' : 'image/avif';

        // 更新縮略圖路徑（如果存在）
        if (isset($original_metadata['sizes']) && is_array($original_metadata['sizes'])) {
            foreach ($original_metadata['sizes'] as $size_name => $size_data) {
                // 檢查縮略圖是否存在
                $thumbnail_path = $this->get_thumbnail_path($converted_path, $size_name);
                if (file_exists($thumbnail_path)) {
                    $original_metadata['sizes'][$size_name]['file'] = basename($thumbnail_path);
                    $original_metadata['sizes'][$size_name]['mime-type'] = $format === 'webp' ? 'image/webp' : 'image/avif';
                }
            }
        }

        // 添加轉換信息
        $original_metadata['converted_format'] = $format;
        $original_metadata['converted_time'] = current_time('mysql');

        // 更新WordPress核心附件元數據
        $result = wp_update_attachment_metadata($attachment_id, $original_metadata);

        // 更新附件的guid（URL）
        $upload_dir = wp_upload_dir();
        $converted_url = str_replace($upload_dir['basedir'], $upload_dir['baseurl'], $converted_path);

        wp_update_post(array(
            'ID' => $attachment_id,
            'guid' => $converted_url
        ));

        // 更新附件的文件路徑
        update_post_meta($attachment_id, '_wp_attached_file', $this->get_relative_path($converted_path));

        return $result;
    }

    /**
     * 獲取相對路徑
     */
    private function get_relative_path($full_path) {
        $upload_dir = wp_upload_dir();
        return str_replace($upload_dir['basedir'] . '/', '', $full_path);
    }

    /**
     * 獲取縮略圖路徑
     */
    private function get_thumbnail_path($main_image_path, $size_name) {
        $file_info = pathinfo($main_image_path);
        $extension = $file_info['extension'];
        $filename = $file_info['filename'];

        // 構建縮略圖路徑
        $thumbnail_path = $file_info['dirname'] . '/' . $filename . '-' . $size_name . '.' . $extension;

        return $thumbnail_path;
    }

    /**
     * 掃描數據庫中的MIME類型不匹配問題
     */
    private function scan_database_for_broken_links() {
        global $wpdb;

        $broken_count = 0;
        $debug_info = array();

        // 獲取當前設置的目標格式
        $settings = get_option('webp_optimizer_settings', array());
        $target_format = isset($settings['target_format']) ? $settings['target_format'] : 'webp';

        // 只檢查那些數據庫MIME類型是舊格式，但實際文件是目標格式的附件
        $mismatched_attachments = $wpdb->get_results("
            SELECT p.ID, p.post_title, p.post_mime_type, pm.meta_value as attached_file
            FROM {$wpdb->posts} p
            LEFT JOIN {$wpdb->postmeta} pm ON p.ID = pm.post_id AND pm.meta_key = '_wp_attached_file'
            WHERE p.post_type = 'attachment'
            AND p.post_mime_type IN ('image/jpeg', 'image/png', 'image/gif')
            AND pm.meta_value IS NOT NULL
        ");

        foreach ($mismatched_attachments as $attachment) {
            $attached_file = $attachment->attached_file;
            if (!$attached_file) {
                continue;
            }

            $upload_dir = wp_upload_dir();
            $full_file_path = $upload_dir['basedir'] . '/' . $attached_file;

            // 檢查文件是否存在
            if (!file_exists($full_file_path)) {
                continue;
            }

            // 獲取實際文件擴展名
            $file_extension = strtolower(pathinfo($full_file_path, PATHINFO_EXTENSION));

            // 只檢查目標格式
            if ($file_extension !== $target_format) {
                continue;
            }

            // 檢查數據庫MIME類型是否與實際文件格式不匹配
            $expected_mime = ($target_format === 'webp') ? 'image/webp' : 'image/avif';

            if ($attachment->post_mime_type !== $expected_mime) {
                $broken_count++;
                $debug_info[] = "附件ID {$attachment->ID}: MIME類型不匹配 - 數據庫: {$attachment->post_mime_type}, 實際文件: {$expected_mime} ({$target_format})";
            }
        }

        // 調試信息
        if (current_user_can('manage_options') && defined('WP_DEBUG') && WP_DEBUG) {
            error_log("WebP Optimizer: 數據庫掃描結果 - 發現 {$broken_count} 個MIME類型不匹配問題 (目標格式: {$target_format})");
            foreach ($debug_info as $info) {
                error_log("WebP Optimizer: " . $info);
            }
        }

        return array(
            'count' => $broken_count,
            'debug_info' => $debug_info
        );
    }

    /**
     * 修復數據庫中的斷開連接
     */
    private function fix_database_links() {
        global $wpdb;

        $fixed_count = 0;
        $debug_info = array();

        // 獲取當前設置的目標格式
        $settings = get_option('webp_optimizer_settings', array());
        $target_format = isset($settings['target_format']) ? $settings['target_format'] : 'webp';

        // 只獲取那些數據庫MIME類型是舊格式，但實際文件是目標格式的附件
        $mismatched_attachments = $wpdb->get_results("
            SELECT p.ID, p.post_title, p.post_mime_type, pm.meta_value as attached_file
            FROM {$wpdb->posts} p
            LEFT JOIN {$wpdb->postmeta} pm ON p.ID = pm.post_id AND pm.meta_key = '_wp_attached_file'
            WHERE p.post_type = 'attachment'
            AND p.post_mime_type IN ('image/jpeg', 'image/png', 'image/gif')
            AND pm.meta_value IS NOT NULL
        ");

        foreach ($mismatched_attachments as $attachment) {
            $attached_file = $attachment->attached_file;
            if (!$attached_file) {
                continue;
            }

            $upload_dir = wp_upload_dir();
            $full_file_path = $upload_dir['basedir'] . '/' . $attached_file;

            // 檢查文件是否存在
            if (!file_exists($full_file_path)) {
                continue;
            }

            // 獲取實際文件擴展名
            $file_extension = strtolower(pathinfo($full_file_path, PATHINFO_EXTENSION));

            // 只處理目標格式
            if ($file_extension !== $target_format) {
                continue;
            }

            // 檢查數據庫MIME類型是否與實際文件格式不匹配
            $expected_mime = ($target_format === 'webp') ? 'image/webp' : 'image/avif';

            if ($attachment->post_mime_type !== $expected_mime) {
                // 更新MIME類型
                wp_update_post(array(
                    'ID' => $attachment->ID,
                    'post_mime_type' => $expected_mime
                ));

                // 更新或添加converted_file meta
                update_post_meta($attachment->ID, '_converted_file', $full_file_path);
                update_post_meta($attachment->ID, '_image_converted', true);
                update_post_meta($attachment->ID, '_converted_format', $target_format);

                $fixed_count++;
                $debug_info[] = "附件ID {$attachment->ID}: 修復了MIME類型從 {$attachment->post_mime_type} 到 {$expected_mime} ({$target_format})";
            }
        }

        // 調試信息
        if (current_user_can('manage_options') && defined('WP_DEBUG') && WP_DEBUG) {
            error_log("WebP Optimizer: 數據庫修復結果 - 修復了 {$fixed_count} 個MIME類型不匹配問題 (目標格式: {$target_format})");
            foreach ($debug_info as $info) {
                error_log("WebP Optimizer: " . $info);
            }
        }

        return $fixed_count;
    }



    /**
     * 檢測附件是否為WooCommerce產品圖片
     */
    private function is_attachment_woocommerce_product($attachment_id) {
        // 檢查是否啟用了WooCommerce產品圖片優化
        $settings = $this->get_settings();
        if (!isset($settings['enable_woo_optimization']) || !$settings['enable_woo_optimization']) {
            return false;
        }

        $post = get_post($attachment_id);
        if (!$post) {
            return false;
        }

        // 方法1：檢查當前頁面是否為產品編輯頁面
        if (isset($_POST['post_type']) && $_POST['post_type'] === 'product') {
            return true;
        }

        // 方法2：檢查是否在WooCommerce產品圖片上傳區域
        if (isset($_POST['action']) && strpos($_POST['action'], 'woocommerce') !== false) {
            return true;
        }

        // 方法3：檢查是否在產品媒體庫中
        if (isset($_POST['product_id']) || isset($_GET['product_id'])) {
            return true;
        }

        // 方法4：檢查當前頁面URL是否包含產品相關路徑
        $current_url = $_SERVER['REQUEST_URI'] ?? '';
        if (strpos($current_url, 'post.php') !== false && isset($_GET['post'])) {
            $post_type = get_post_type($_GET['post']);
            if ($post_type === 'product') {
                return true;
            }
        }

        // 方法5：檢查文件名是否包含產品相關關鍵詞
        $file_name = basename($post->guid);
        $product_keywords = array('product', 'goods', 'item', '商品', '產品');
        foreach ($product_keywords as $keyword) {
            if (stripos($file_name, $keyword) !== false) {
                return true;
            }
        }

        // 方法6：檢查附件是否被產品使用（最可靠的方法）
        if ($this->is_attachment_used_by_product($attachment_id)) {
            return true;
        }

        // 方法7：檢查附件是否在產品目錄中（通過文件路徑判斷）
        $file_path = get_attached_file($attachment_id);
        if ($file_path) {
            $upload_dir = wp_upload_dir();
            $relative_path = str_replace($upload_dir['basedir'] . '/', '', $file_path);

            // 檢查是否在產品相關目錄中
            $product_directories = array('products', 'woocommerce', 'shop', '商品', '產品');
            foreach ($product_directories as $dir) {
                if (strpos($relative_path, $dir) !== false) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * 檢查附件是否被WooCommerce產品使用
     */
    private function is_attachment_used_by_product($attachment_id) {
        global $wpdb;

        // 檢查是否作為產品主圖片
        $product_with_image = $wpdb->get_var($wpdb->prepare(
            "SELECT post_id FROM {$wpdb->postmeta}
             WHERE meta_key = '_thumbnail_id' AND meta_value = %d
             AND post_id IN (SELECT ID FROM {$wpdb->posts} WHERE post_type = 'product')",
            $attachment_id
        ));

        if ($product_with_image) {
            return true;
        }

        // 檢查是否在產品畫廊中
        $products_with_gallery = $wpdb->get_results($wpdb->prepare(
            "SELECT post_id, meta_value FROM {$wpdb->postmeta}
             WHERE meta_key = '_product_image_gallery'
             AND post_id IN (SELECT ID FROM {$wpdb->posts} WHERE post_type = 'product')"
        ));

        foreach ($products_with_gallery as $product) {
            $gallery_ids = explode(',', $product->meta_value);
            if (in_array($attachment_id, $gallery_ids)) {
                return true;
            }
        }

        return false;
    }

    /**
     * 處理上傳後的附件元數據更新
     */
    public function update_uploaded_attachment_metadata($attachment_id) {
        // 獲取附件信息
        $attachment = get_post($attachment_id);
        if (!$attachment || $attachment->post_type !== 'attachment') {
            return;
        }

        // 檢查是否為圖片
        if (!preg_match('/^image\//', $attachment->post_mime_type)) {
            return;
        }

        // 檢查是否為水印圖片
        $file_path = get_attached_file($attachment_id);
        if ($this->is_watermark_image($file_path)) {
            return;
        }

        // 檢查是否已經轉換
        $converted_format = get_post_meta($attachment_id, '_converted_format', true);
        if (!$converted_format) {
            return;
        }

        // 獲取轉換後的文件路徑
        $converted_file = get_post_meta($attachment_id, '_converted_file', true);
        if (!$converted_file || !file_exists($converted_file)) {
            return;
        }

        // 更新WordPress核心附件元數據
        $this->update_core_attachment_metadata($attachment_id, $converted_file, $converted_format);

        // 調試信息
        if (current_user_can('manage_options') && defined('WP_DEBUG') && WP_DEBUG) {
            error_log("WebP Optimizer: 上傳後附件元數據更新 - 附件ID: {$attachment_id}, 格式: {$converted_format}, 文件: {$converted_file}");
        }
    }

    /**
     * 在附件創建完成後處理水印
     */
    public function process_watermark_after_upload($attachment_id) {
        $settings = $this->get_settings();

        // 檢查是否啟用水印
        if (!isset($settings['enable_watermark']) || !$settings['enable_watermark']) {
            return;
        }

        // 檢查是否應該添加水印
        if (!$this->should_add_watermark($attachment_id, 'general')) {
            return;
        }

        $file_path = get_attached_file($attachment_id);
        if (!$file_path || !file_exists($file_path)) {
            return;
        }

        // 檢查圖片是否已經轉換為WebP或AVIF格式
        $file_extension = strtolower(pathinfo($file_path, PATHINFO_EXTENSION));
        $is_converted = in_array($file_extension, array('webp', 'avif'));

        if ($is_converted) {
            // 如果圖片已經轉換為WebP/AVIF，需要先轉換回PNG/JPEG添加水印，然後重新轉換
            $this->add_watermark_to_converted_image($attachment_id, $file_path, $settings);
        } else {
            // 如果圖片還是原始格式，直接添加水印
            $editor = wp_get_image_editor($file_path);
            if (!is_wp_error($editor)) {
                $this->add_watermark($editor, $file_path, $settings);
            }
        }
    }

    /**
     * 為已轉換的圖片添加水印
     */
    private function add_watermark_to_converted_image($attachment_id, $converted_file_path, $settings) {
        // 獲取原始圖片路徑
        $original_file_path = get_post_meta($attachment_id, '_wp_attached_file', true);
        if (!$original_file_path) {
            return false;
        }

        $upload_dir = wp_upload_dir();
        $original_full_path = $upload_dir['basedir'] . '/' . $original_file_path;

        // 如果原始文件不存在，嘗試從轉換的文件恢復
        if (!file_exists($original_full_path)) {
            // 創建臨時PNG文件
            $temp_png_path = $this->convert_to_png_for_watermark($converted_file_path);
            if (!$temp_png_path) {
                return false;
            }
            $original_full_path = $temp_png_path;
        }

        // 在原始格式上添加水印
        $editor = wp_get_image_editor($original_full_path);
        if (is_wp_error($editor)) {
            return false;
        }

        $watermark_result = $this->add_watermark($editor, $original_full_path, $settings);

        if ($watermark_result) {
            // 水印添加成功，重新轉換為目標格式
            $target_format = isset($settings['target_format']) ? $settings['target_format'] : 'webp';
            $this->convert_image($original_full_path, $settings, $target_format, 'general', $attachment_id);

            // 清理臨時文件
            if (isset($temp_png_path) && file_exists($temp_png_path)) {
                unlink($temp_png_path);
            }

            return true;
        }

        return false;
    }

    /**
     * 將轉換的圖片轉換回PNG格式以便添加水印
     */
    private function convert_to_png_for_watermark($converted_file_path) {
        $editor = wp_get_image_editor($converted_file_path);
        if (is_wp_error($editor)) {
            return false;
        }

        $file_info = pathinfo($converted_file_path);
        $temp_png_path = $file_info['dirname'] . '/' . $file_info['filename'] . '_temp_watermark.png';

        $result = $editor->save($temp_png_path, 'image/png');
        if (is_wp_error($result)) {
            return false;
        }

        return $temp_png_path;
    }

    /**
     * 處理WooCommerce產品主圖片
     */
    public function process_woo_product_image($image_id, $product) {
        if (!$image_id) {
            return $image_id;
        }

        $settings = $this->get_settings();
        if (!isset($settings['enable_woo_optimization']) || !$settings['enable_woo_optimization']) {
            return $image_id;
        }

        $file_path = get_attached_file($image_id);
        if ($file_path && file_exists($file_path)) {
            // 檢查是否為水印圖片，如果是則跳過
            if ($this->is_watermark_image($file_path)) {
                return $image_id;
            }

            $target_format = isset($settings['target_format']) ? $settings['target_format'] : 'webp';
            $this->convert_image($file_path, $settings, $target_format, 'woocommerce_product', $image_id);
        }

        return $image_id;
    }

    /**
     * 處理WooCommerce產品畫廊圖片
     */
    public function process_woo_gallery_images($gallery_ids, $product) {
        if (empty($gallery_ids)) {
            return $gallery_ids;
        }

        $settings = $this->get_settings();
        if (!isset($settings['enable_woo_optimization']) || !$settings['enable_woo_optimization']) {
            return $gallery_ids;
        }

        $target_format = isset($settings['target_format']) ? $settings['target_format'] : 'webp';

        foreach ($gallery_ids as $image_id) {
            $file_path = get_attached_file($image_id);
            if ($file_path && file_exists($file_path)) {
                // 檢查是否為水印圖片，如果是則跳過
                if ($this->is_watermark_image($file_path)) {
                    continue;
                }

                $this->convert_image($file_path, $settings, $target_format, 'woocommerce_product', $image_id);
            }
        }

        return $gallery_ids;
    }

    /**
     * 添加媒體庫列
     */
    public function add_media_columns($columns) {
        $columns['image_status'] = '圖片狀態';
        return $columns;
    }

    /**
     * 媒體庫列內容
     */
    public function media_column_content($column, $post_id) {
        if ($column === 'image_status') {
            $image_converted = get_post_meta($post_id, '_image_converted', true);
            $converted_format = get_post_meta($post_id, '_converted_format', true);
            $mime_type = get_post_mime_type($post_id);

            if ($mime_type === 'image/webp') {
                echo '<span class="webp-optimizer-status webp">✓ WebP</span>';
            } elseif ($mime_type === 'image/avif') {
                echo '<span class="webp-optimizer-status avif">✓ AVIF</span>';
            } elseif ($image_converted) {
                echo '<span class="webp-optimizer-status converted">已轉換為' . strtoupper($converted_format) . '</span>';
            } elseif (in_array($mime_type, array('image/jpeg', 'image/png', 'image/gif'))) {
                echo '<span class="webp-optimizer-status pending">待轉換</span>';
            } else {
                echo '<span class="webp-optimizer-status unsupported">不支持</span>';
            }
        }
    }

    /**
     * 添加批量操作
     */
    public function add_bulk_actions($bulk_actions) {
        $bulk_actions['convert_to_optimized'] = '轉換為優化格式';
        return $bulk_actions;
    }

    /**
     * 處理批量操作
     */
    public function handle_bulk_actions($redirect_to, $doaction, $post_ids) {
        if ($doaction !== 'convert_to_optimized') {
            return $redirect_to;
        }

        $settings = $this->get_settings();
        $converted = 0;
        $failed = 0;

        foreach ($post_ids as $post_id) {
            $file_path = get_attached_file($post_id);

            if ($file_path && file_exists($file_path)) {
                // 檢查是否為水印圖片，如果是則跳過
                if ($this->is_watermark_image($file_path)) {
                    continue;
                }

                $target_format = isset($settings['target_format']) ? $settings['target_format'] : 'webp';
                $result = $this->convert_image($file_path, $settings, $target_format, 'general', $post_id);

                if ($result && $result !== $file_path) {
                    $this->update_attachment_metadata($post_id, $result, $target_format);
                    $converted++;
                } else {
                    $failed++;
                }
            }
        }

        $redirect_to = add_query_arg(array(
            'converted' => $converted,
            'failed' => $failed
        ), $redirect_to);

        return $redirect_to;
    }

    /**
     * PHP版本提示
     */
    public function php_version_notice() {
        echo '<div class="notice notice-error"><p>圖片優化插件需要PHP 7.4或更高版本。</p></div>';
    }

    /**
     * WordPress版本提示
     */
    public function wp_version_notice() {
        echo '<div class="notice notice-error"><p>圖片優化插件需要WordPress 5.0或更高版本。</p></div>';
    }

    /**
     * AJAX檢查產品圖片尺寸
     */
    public function ajax_check_product_image_sizes() {
        check_ajax_referer('webp_optimizer_batch_convert', 'nonce');

        if (!current_user_can('manage_options')) {
            wp_die('權限不足');
        }

        $settings = $this->get_settings();
        $max_width = isset($settings['product_image_max_width']) ? intval($settings['product_image_max_width']) : 800;
        $max_height = isset($settings['product_image_max_height']) ? intval($settings['product_image_max_height']) : 800;

        // 獲取所有產品圖片
        $product_images = $this->get_product_images();
        $oversized_images = array();
        $total_count = count($product_images);

        foreach ($product_images as $image) {
            $file_path = get_attached_file($image->ID);

            if ($file_path && file_exists($file_path)) {
                $image_size = getimagesize($file_path);
                if ($image_size) {
                    $width = $image_size[0];
                    $height = $image_size[1];

                    if ($width > $max_width || $height > $max_height) {
                        $file_info = pathinfo($file_path);
                        $extension = strtoupper($file_info['extension']);
                        $oversized_images[] = array(
                            'id' => $image->ID,
                            'title' => $image->post_title,
                            'file' => basename($file_path),
                            'current_width' => $width,
                            'current_height' => $height,
                            'max_width' => $max_width,
                            'max_height' => $max_height,
                            'format' => $extension
                        );
                    }
                }
            }
        }

        wp_send_json_success(array(
            'oversized_count' => count($oversized_images),
            'total_count' => $total_count,
            'oversized_images' => $oversized_images,
            'max_width' => $max_width,
            'max_height' => $max_height
        ));
    }

    /**
     * AJAX批量縮放產品圖片
     */
    public function ajax_resize_product_images() {
        check_ajax_referer('webp_optimizer_batch_convert', 'nonce');

        if (!current_user_can('manage_options')) {
            wp_die('權限不足');
        }

        $settings = $this->get_settings();
        $batch_size = isset($settings['batch_size']) ? intval($settings['batch_size']) : 5;
        $resized = 0;
        $failed = 0;
        $log = '';

        // 獲取當前批次編號
        $current_batch = isset($_POST['current_batch']) ? intval($_POST['current_batch']) : 0;
        $total_processed = isset($_POST['total_processed']) ? intval($_POST['total_processed']) : 0;

        // 調試信息
        if (current_user_can('manage_options') && defined('WP_DEBUG') && WP_DEBUG) {
            error_log("WebP Optimizer: 開始第 " . ($current_batch + 1) . " 批處理，批次大小: {$batch_size}，已處理: {$total_processed}");
        }

        // 獲取需要縮放的產品圖片（只獲取當前批次）
        $oversized_images = $this->get_oversized_product_images_batch($batch_size, $current_batch * $batch_size);

        // 調試信息
        if (current_user_can('manage_options') && defined('WP_DEBUG') && WP_DEBUG) {
            error_log("WebP Optimizer: 第 " . ($current_batch + 1) . " 批找到 " . count($oversized_images) . " 張需要縮放的圖片");
        }

        if (empty($oversized_images)) {
            // 獲取總數和已處理數
            $total_product_images = $this->get_total_product_images_count();
            $total_oversized = $this->get_oversized_product_images_count();

            // 調試信息
            if (current_user_can('manage_options') && defined('WP_DEBUG') && WP_DEBUG) {
                error_log("WebP Optimizer: 所有批次處理完成，總產品圖片: {$total_product_images}, 需要縮放: {$total_oversized}, 已處理: {$total_processed}");
            }

            wp_send_json_success(array(
                'completed' => true,
                'resized' => 0,
                'failed' => 0,
                'log' => '所有產品圖片處理完成！',
                'progress' => 100,
                'total_product_images' => $total_product_images,
                'total_oversized' => $total_oversized,
                'total_processed' => $total_processed,
                'current_batch' => $current_batch
            ));
        }

        // 處理當前批次的圖片
        foreach ($oversized_images as $image) {
            try {
                $file_path = get_attached_file($image->ID);

                if ($file_path && file_exists($file_path)) {
                    $result = $this->resize_product_image($file_path, $settings);

                    if ($result) {
                        $resized++;
                        $file_info = pathinfo($file_path);
                        $extension = strtoupper($file_info['extension']);
                        $log .= "✓ 縮放成功: " . basename($file_path) . " (產品圖片, {$extension}格式)<br>";

                        // 更新附件元數據
                        $this->update_attachment_metadata($image->ID, $result, 'resized');
                    } else {
                        $failed++;
                        $log .= "✗ 縮放失敗: " . basename($file_path) . "<br>";
                    }
                } else {
                    $failed++;
                    $log .= "✗ 文件不存在: " . (isset($file_path) ? basename($file_path) : '未知文件') . "<br>";
                }
            } catch (Exception $e) {
                $failed++;
                $log .= "✗ 處理錯誤: " . (isset($image->post_title) ? $image->post_title : '未知圖片') . " - " . $e->getMessage() . "<br>";
            }
        }

        // 更新總處理數量
        $total_processed += $resized + $failed;

        // 計算進度 - 基於需要縮放的總數
        $total_oversized = $this->get_oversized_product_images_count();

        if ($total_oversized > 0) {
            $progress = ($total_processed / $total_oversized) * 100;
        } else {
            $progress = 100;
        }

        // 檢查是否還有更多需要縮放的圖片
        $remaining_images = $this->get_oversized_product_images_batch($batch_size, ($current_batch + 1) * $batch_size);
        $has_more = !empty($remaining_images);

        // 調試信息
        if (current_user_can('manage_options') && defined('WP_DEBUG') && WP_DEBUG) {
            error_log("WebP Optimizer: 第 " . ($current_batch + 1) . " 批處理完成，成功: {$resized}, 失敗: {$failed}, 總處理: {$total_processed}, 進度: " . round($progress, 1) . "%, 還有更多: " . ($has_more ? '是' : '否'));
        }

        wp_send_json_success(array(
            'resized' => $resized,
            'failed' => $failed,
            'log' => $log,
            'progress' => round($progress, 1),
            'completed' => !$has_more,
            'total_product_images' => $this->get_total_product_images_count(),
            'total_oversized' => $total_oversized,
            'total_processed' => $total_processed,
            'current_batch' => $current_batch,
            'next_batch' => $current_batch + 1
        ));
    }

    /**
     * 縮放單個產品圖片
     */
    private function resize_product_image($file_path, $settings) {
        // 檢查文件是否存在
        if (!file_exists($file_path)) {
            return false;
        }

        // 檢查是否為水印圖片，如果是則跳過縮放
        if ($this->is_watermark_image($file_path)) {
            return $file_path;
        }

        $file_info = pathinfo($file_path);
        $current_extension = strtolower($file_info['extension']);

        // 檢查是否為支持的格式
        $supported_formats = array('jpg', 'jpeg', 'png', 'gif', 'webp', 'avif');
        if (!in_array($current_extension, $supported_formats)) {
            return $file_path;
        }

        // 創建圖片編輯器
        $editor = wp_get_image_editor($file_path);
        if (is_wp_error($editor)) {
            return $file_path;
        }

        // 獲取圖片尺寸
        $size = $editor->get_size();
        $width = $size['width'];
        $height = $size['height'];

        // 獲取產品圖片尺寸限制
        $max_width = isset($settings['product_image_max_width']) ? intval($settings['product_image_max_width']) : 800;
        $max_height = isset($settings['product_image_max_height']) ? intval($settings['product_image_max_height']) : 800;
        $resize_quality = isset($settings['product_image_resize_quality']) ? intval($settings['product_image_resize_quality']) : 85;

        // 檢查是否需要縮放
        if ($width <= $max_width && $height <= $max_height) {
            return $file_path; // 不需要縮放
        }

        // 計算縮放比例
        $width_ratio = $max_width / $width;
        $height_ratio = $max_height / $height;

        // 使用較小的比例，確保圖片完全適應限制
        $scale_ratio = min($width_ratio, $height_ratio);

        $new_width = intval($width * $scale_ratio);
        $new_height = intval($height * $scale_ratio);

        // 調整圖片尺寸
        $editor->resize($new_width, $new_height, false);

        // 調試信息
        if (current_user_can('manage_options') && defined('WP_DEBUG') && WP_DEBUG) {
            error_log("WebP Optimizer: 產品圖片縮放 - 文件: " . basename($file_path) .
                     ", 從 {$width}x{$height} 調整為 {$new_width}x{$new_height}, 縮放比例: " . round($scale_ratio, 3) .
                     ", 格式: " . $current_extension);
        }

        // 根據原格式保存縮放後的圖片
        if ($current_extension === 'webp') {
            $result = $editor->save($file_path, 'image/webp');
        } elseif ($current_extension === 'avif') {
            $result = $editor->save($file_path, 'image/avif');
        } else {
            $result = $editor->save($file_path);
        }

        if (is_wp_error($result)) {
            return $file_path;
        }

        return $file_path;
    }

    /**
     * 獲取所有產品圖片
     */
    private function get_product_images() {
        global $wpdb;

        // 獲取所有產品的主圖片ID
        $featured_image_ids = $wpdb->get_col("
            SELECT DISTINCT meta_value
            FROM {$wpdb->postmeta}
            WHERE meta_key = '_thumbnail_id'
            AND meta_value != ''
            AND post_id IN (SELECT ID FROM {$wpdb->posts} WHERE post_type = 'product')
        ");

        // 獲取所有產品的畫廊圖片ID
        $gallery_image_ids = array();
        $gallery_meta = $wpdb->get_results("
            SELECT meta_value
            FROM {$wpdb->postmeta}
            WHERE meta_key = '_product_image_gallery'
            AND meta_value != ''
            AND post_id IN (SELECT ID FROM {$wpdb->posts} WHERE post_type = 'product')
        ");

        foreach ($gallery_meta as $meta) {
            if (!empty($meta->meta_value)) {
                $ids = explode(',', $meta->meta_value);
                $gallery_image_ids = array_merge($gallery_image_ids, $ids);
            }
        }

        // 合併所有圖片ID並去重
        $all_image_ids = array_merge($featured_image_ids, $gallery_image_ids);
        $all_image_ids = array_unique(array_filter($all_image_ids));

        if (empty($all_image_ids)) {
            return array();
        }

        // 構建IN查詢的佔位符
        $placeholders = implode(',', array_fill(0, count($all_image_ids), '%d'));

        // 獲取圖片詳情
        $sql = $wpdb->prepare("
            SELECT ID, post_title, post_mime_type
            FROM {$wpdb->posts}
            WHERE ID IN ({$placeholders})
            AND post_type = 'attachment'
            AND post_mime_type LIKE 'image/%'
            ORDER BY ID DESC
        ", $all_image_ids);

        return $wpdb->get_results($sql);
    }

    /**
     * 獲取需要縮放的產品圖片
     */
    private function get_oversized_product_images($limit = 10) {
        global $wpdb;

        $settings = $this->get_settings();
        $max_width = isset($settings['product_image_max_width']) ? intval($settings['product_image_max_width']) : 800;
        $max_height = isset($settings['product_image_max_height']) ? intval($settings['product_image_max_height']) : 800;

        // 獲取所有產品的主圖片ID
        $featured_image_ids = $wpdb->get_col("
            SELECT DISTINCT meta_value
            FROM {$wpdb->postmeta}
            WHERE meta_key = '_thumbnail_id'
            AND meta_value != ''
            AND post_id IN (SELECT ID FROM {$wpdb->posts} WHERE post_type = 'product')
        ");

        // 獲取所有產品的畫廊圖片ID
        $gallery_image_ids = array();
        $gallery_meta = $wpdb->get_results("
            SELECT meta_value
            FROM {$wpdb->postmeta}
            WHERE meta_key = '_product_image_gallery'
            AND meta_value != ''
            AND post_id IN (SELECT ID FROM {$wpdb->posts} WHERE post_type = 'product')
        ");

        foreach ($gallery_meta as $meta) {
            if (!empty($meta->meta_value)) {
                $ids = explode(',', $meta->meta_value);
                $gallery_image_ids = array_merge($gallery_image_ids, $ids);
            }
        }

        // 合併所有圖片ID並去重
        $all_image_ids = array_merge($featured_image_ids, $gallery_image_ids);
        $all_image_ids = array_unique(array_filter($all_image_ids));

        if (empty($all_image_ids)) {
            return array();
        }

        // 構建IN查詢的佔位符
        $placeholders = implode(',', array_fill(0, count($all_image_ids), '%d'));

        // 獲取圖片詳情
        $sql = $wpdb->prepare("
            SELECT ID, post_title, post_mime_type
            FROM {$wpdb->posts}
            WHERE ID IN ({$placeholders})
            AND post_type = 'attachment'
            AND post_mime_type LIKE 'image/%'
            ORDER BY ID DESC
            LIMIT %d
        ", array_merge($all_image_ids, array($limit)));

        $images = $wpdb->get_results($sql);
        $oversized_images = array();

        foreach ($images as $image) {
            $file_path = get_attached_file($image->ID);

            if ($file_path && file_exists($file_path)) {
                // 檢查是否為水印圖片，如果是則跳過
                if ($this->is_watermark_image($file_path)) {
                    continue;
                }

                $image_size = getimagesize($file_path);
                if ($image_size) {
                    $width = $image_size[0];
                    $height = $image_size[1];

                    if ($width > $max_width || $height > $max_height) {
                        $oversized_images[] = $image;
                    }
                }
            }
        }

        return $oversized_images;
    }

    /**
     * 獲取需要縮放的產品圖片數量
     */
    private function get_oversized_product_images_count() {
        global $wpdb;

        $settings = $this->get_settings();
        $max_width = isset($settings['product_image_max_width']) ? intval($settings['product_image_max_width']) : 800;
        $max_height = isset($settings['product_image_max_height']) ? intval($settings['product_image_max_height']) : 800;

        // 獲取所有產品的主圖片ID
        $featured_image_ids = $wpdb->get_col("
            SELECT DISTINCT meta_value
            FROM {$wpdb->postmeta}
            WHERE meta_key = '_thumbnail_id'
            AND meta_value != ''
            AND post_id IN (SELECT ID FROM {$wpdb->posts} WHERE post_type = 'product')
        ");

        // 獲取所有產品的畫廊圖片ID
        $gallery_image_ids = array();
        $gallery_meta = $wpdb->get_results("
            SELECT meta_value
            FROM {$wpdb->postmeta}
            WHERE meta_key = '_product_image_gallery'
            AND meta_value != ''
            AND post_id IN (SELECT ID FROM {$wpdb->posts} WHERE post_type = 'product')
        ");

        foreach ($gallery_meta as $meta) {
            if (!empty($meta->meta_value)) {
                $ids = explode(',', $meta->meta_value);
                $gallery_image_ids = array_merge($gallery_image_ids, $ids);
            }
        }

        // 合併所有圖片ID並去重
        $all_image_ids = array_merge($featured_image_ids, $gallery_image_ids);
        $all_image_ids = array_unique(array_filter($all_image_ids));

        if (empty($all_image_ids)) {
            return 0;
        }

        // 構建IN查詢的佔位符
        $placeholders = implode(',', array_fill(0, count($all_image_ids), '%d'));

        // 獲取圖片詳情
        $sql = $wpdb->prepare("
            SELECT ID, post_title, post_mime_type
            FROM {$wpdb->posts}
            WHERE ID IN ({$placeholders})
            AND post_type = 'attachment'
            AND post_mime_type LIKE 'image/%'
        ", $all_image_ids);

        $images = $wpdb->get_results($sql);
        $count = 0;

        foreach ($images as $image) {
            $file_path = get_attached_file($image->ID);

            if ($file_path && file_exists($file_path)) {
                $image_size = getimagesize($file_path);
                if ($image_size) {
                    $width = $image_size[0];
                    $height = $image_size[1];

                    if ($width > $max_width || $height > $max_height) {
                        $count++;
                    }
                }
            }
        }

        return $count;
    }

    /**
     * 獲取已縮放的產品圖片數量
     */
    private function get_resized_product_images_count() {
        global $wpdb;

        $sql = "
            SELECT COUNT(*)
            FROM {$wpdb->postmeta} pm
            WHERE pm.meta_key = '_image_resized'
        ";

        return $wpdb->get_var($sql);
    }

    /**
     * 獲取總的產品圖片數量
     */
    private function get_total_product_images_count() {
        global $wpdb;

        // 獲取所有產品的主圖片ID
        $featured_image_ids = $wpdb->get_col("
            SELECT DISTINCT meta_value
            FROM {$wpdb->postmeta}
            WHERE meta_key = '_thumbnail_id'
            AND meta_value != ''
            AND post_id IN (SELECT ID FROM {$wpdb->posts} WHERE post_type = 'product')
        ");

        // 獲取所有產品的畫廊圖片ID
        $gallery_image_ids = array();
        $gallery_meta = $wpdb->get_results("
            SELECT meta_value
            FROM {$wpdb->postmeta}
            WHERE meta_key = '_product_image_gallery'
            AND meta_value != ''
            AND post_id IN (SELECT ID FROM {$wpdb->posts} WHERE post_type = 'product')
        ");

        foreach ($gallery_meta as $meta) {
            if (!empty($meta->meta_value)) {
                $ids = explode(',', $meta->meta_value);
                $gallery_image_ids = array_merge($gallery_image_ids, $ids);
            }
        }

        // 合併所有圖片ID並去重
        $all_image_ids = array_merge($featured_image_ids, $gallery_image_ids);
        $all_image_ids = array_unique(array_filter($all_image_ids));

        if (empty($all_image_ids)) {
            return 0;
        }

        // 構建IN查詢的佔位符
        $placeholders = implode(',', array_fill(0, count($all_image_ids), '%d'));

        // 統計圖片數量
        $sql = $wpdb->prepare("
            SELECT COUNT(*)
            FROM {$wpdb->posts}
            WHERE ID IN ({$placeholders})
            AND post_type = 'attachment'
            AND post_mime_type LIKE 'image/%'
        ", $all_image_ids);

        return $wpdb->get_var($sql);
    }

    /**
     * 獲取需要縮放的產品圖片（分批）
     */
    private function get_oversized_product_images_batch($limit = 10, $offset = 0) {
        global $wpdb;

        $settings = $this->get_settings();
        $max_width = isset($settings['product_image_max_width']) ? intval($settings['product_image_max_width']) : 800;
        $max_height = isset($settings['product_image_max_height']) ? intval($settings['product_image_max_height']) : 800;

        // 獲取所有產品的主圖片ID
        $featured_image_ids = $wpdb->get_col("
            SELECT DISTINCT meta_value
            FROM {$wpdb->postmeta}
            WHERE meta_key = '_thumbnail_id'
            AND meta_value != ''
            AND post_id IN (SELECT ID FROM {$wpdb->posts} WHERE post_type = 'product')
        ");

        // 獲取所有產品的畫廊圖片ID
        $gallery_image_ids = array();
        $gallery_meta = $wpdb->get_results("
            SELECT meta_value
            FROM {$wpdb->postmeta}
            WHERE meta_key = '_product_image_gallery'
            AND meta_value != ''
            AND post_id IN (SELECT ID FROM {$wpdb->posts} WHERE post_type = 'product')
        ");

        foreach ($gallery_meta as $meta) {
            if (!empty($meta->meta_value)) {
                $ids = explode(',', $meta->meta_value);
                $gallery_image_ids = array_merge($gallery_image_ids, $ids);
            }
        }

        // 合併所有圖片ID並去重
        $all_image_ids = array_merge($featured_image_ids, $gallery_image_ids);
        $all_image_ids = array_unique(array_filter($all_image_ids));

        if (empty($all_image_ids)) {
            return array();
        }

        // 構建IN查詢的佔位符
        $placeholders = implode(',', array_fill(0, count($all_image_ids), '%d'));

        // 獲取所有產品圖片詳情
        $sql = $wpdb->prepare("
            SELECT ID, post_title, post_mime_type
            FROM {$wpdb->posts}
            WHERE ID IN ({$placeholders})
            AND post_type = 'attachment'
            AND post_mime_type LIKE 'image/%'
            ORDER BY ID DESC
        ", $all_image_ids);

        $all_images = $wpdb->get_results($sql);
        $oversized_images = array();

        // 檢查每張圖片的尺寸，只保留需要縮放的
        foreach ($all_images as $image) {
            $file_path = get_attached_file($image->ID);

            if ($file_path && file_exists($file_path)) {
                $image_size = getimagesize($file_path);
                if ($image_size) {
                    $width = $image_size[0];
                    $height = $image_size[1];

                    if ($width > $max_width || $height > $max_height) {
                        $oversized_images[] = $image;
                    }
                }
            }
        }

        // 對需要縮放的圖片進行分頁
        $total_oversized = count($oversized_images);
        $start_index = $offset;
        $end_index = min($start_index + $limit, $total_oversized);

        // 調試信息
        if (current_user_can('manage_options') && defined('WP_DEBUG') && WP_DEBUG) {
            error_log("WebP Optimizer: 分批查詢 - 總產品圖片: " . count($all_images) .
                     ", 需要縮放: {$total_oversized}, 偏移: {$offset}, 限制: {$limit}, 返回: " . ($end_index - $start_index));
        }

        return array_slice($oversized_images, $start_index, $limit);
    }
}