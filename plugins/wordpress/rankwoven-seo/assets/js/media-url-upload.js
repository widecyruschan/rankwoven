/* global window, wp, console, webpUrlUpload, document, jQuery */

/**
 * 媒體上傳介面：從網址下載檔案並加入 WordPress 媒體庫
 */
(function ($) {
    'use strict';

    var i18n = (window.webpUrlUpload && window.webpUrlUpload.i18n) ? window.webpUrlUpload.i18n : {};

    function setStatus($wrap, message, type) {
        var $status = $wrap.find('.webp-url-upload-status');
        $status
            .removeClass('is-error is-success is-info')
            .addClass(type ? 'is-' + type : '')
            .text(message || '');
    }

    function getPostId() {
        if (window.wp && wp.media && wp.media.view && wp.media.view.settings && wp.media.view.settings.post) {
            return parseInt(wp.media.view.settings.post.id, 10) || 0;
        }

        var $postId = $('#post_ID');
        if ($postId.length) {
            return parseInt($postId.val(), 10) || 0;
        }

        return 0;
    }

    function isValidHttpUrl(url) {
        return /^https?:\/\/.+/i.test(url);
    }

    function extractMessage(data, fallback) {
        if (!data) {
            return fallback;
        }
        if (typeof data === 'string') {
            return data;
        }
        if (data.message) {
            return data.message;
        }
        return fallback;
    }

    /**
     * 上傳成功後，把附件加入目前開啟的媒體視窗並選取
     */
    function selectAttachmentInMediaFrame(attachmentData) {
        if (!window.wp || !wp.media || !attachmentData || !attachmentData.id) {
            return;
        }

        var attachment = wp.media.model.Attachment.get(attachmentData.id);
        attachment.set(attachmentData);

        var frame = wp.media.frame;
        if (!frame) {
            return;
        }

        try {
            if (frame.content && typeof frame.content.mode === 'function') {
                frame.content.mode('browse');
            }

            var state = typeof frame.state === 'function' ? frame.state() : null;
            if (!state) {
                return;
            }

            var library = state.get('library');
            if (library && typeof library.add === 'function') {
                library.add(attachment);
            }

            var selection = state.get('selection');
            if (selection && typeof selection.reset === 'function') {
                selection.reset([attachment]);
            } else if (selection && typeof selection.add === 'function') {
                selection.add(attachment);
            }
        } catch (error) {
            if (window.console && console.warn) {
                console.warn('WebP Optimizer: 無法在媒體視窗中選取剛上傳的檔案', error);
            }
        }
    }

    function uploadFromUrl($wrap) {
        var $input = $wrap.find('.webp-url-upload-input');
        var $button = $wrap.find('.webp-url-upload-btn');
        var url = $.trim($input.val());

        if (!url) {
            setStatus($wrap, i18n.emptyUrl || '請貼上媒體網址', 'error');
            $input.trigger('focus');
            return;
        }

        if (!isValidHttpUrl(url)) {
            setStatus($wrap, i18n.invalidUrl || '請輸入有效的網址（需以 http:// 或 https:// 開頭）', 'error');
            $input.trigger('focus');
            return;
        }

        if (!window.webpUrlUpload) {
            setStatus($wrap, i18n.error || '上傳失敗', 'error');
            return;
        }

        $button.prop('disabled', true);
        $input.prop('disabled', true);
        setStatus($wrap, i18n.uploading || '正在下載並上傳到媒體庫…', 'info');

        $.ajax({
            url: webpUrlUpload.ajaxUrl,
            type: 'POST',
            dataType: 'json',
            timeout: 300000,
            data: {
                action: 'webp_optimizer_upload_from_url',
                nonce: webpUrlUpload.nonce,
                media_url: url,
                post_id: getPostId()
            }
        }).done(function (response) {
            if (response && response.success && response.data) {
                setStatus($wrap, i18n.success || '上傳成功，已加入媒體庫', 'success');
                $input.val('');
                selectAttachmentInMediaFrame(response.data);
                return;
            }

            setStatus($wrap, extractMessage(response && response.data, i18n.error || '上傳失敗'), 'error');
        }).fail(function (xhr) {
            var message = i18n.network || '網路錯誤，請稍後再試';
            if (xhr && xhr.responseJSON) {
                message = extractMessage(xhr.responseJSON.data, message);
            }
            setStatus($wrap, message, 'error');
        }).always(function () {
            $button.prop('disabled', false);
            $input.prop('disabled', false);
        });
    }

    $(document).on('click', '.webp-url-upload-btn', function (event) {
        event.preventDefault();
        event.stopPropagation();
        uploadFromUrl($(this).closest('.webp-url-upload'));
    });

    $(document).on('keydown', '.webp-url-upload-input', function (event) {
        if (event.key === 'Enter' || event.keyCode === 13) {
            event.preventDefault();
            event.stopPropagation();
            uploadFromUrl($(this).closest('.webp-url-upload'));
        }
    });

    // 避免點擊輸入框時觸發媒體視窗的拖放上傳層
    $(document).on('click mousedown', '.webp-url-upload-input, .webp-url-upload-btn', function (event) {
        event.stopPropagation();
    });
})(jQuery);
