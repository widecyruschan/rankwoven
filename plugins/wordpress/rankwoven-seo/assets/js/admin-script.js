/* global location, ajaxurl, webp_optimizer_ajax, setTimeout, confirm, alert, document, window, jQuery */

/**
 * WebP Image Optimizer 管理界面 JavaScript
 */

(function($) {
    'use strict';

    var WebPOptimizer = {
        isConverting: false,
        convertedCount: 0,
        failedCount: 0,
        totalCount: 0,

        init: function() {
            this.bindEvents();
            this.initTooltips();
        },

        bindEvents: function() {
            $('#start_conversion').on('click', this.startConversion.bind(this));
            $('#stop_conversion').on('click', this.stopConversion.bind(this));
            $('#scan_images').on('click', this.scanImages.bind(this));

            // 質量滑塊
            $('#webp_quality').on('input', function() {
                $('#quality_value').text($(this).val() + '%');
            });
        },

        startConversion: function() {
            if (this.isConverting) return;

            this.isConverting = true;
            this.convertedCount = 0;
            this.failedCount = 0;

            $('#conversion_controls').hide();
            $('#conversion_progress').show();
            $('#conversion_log').html('<p class="info">開始批量轉換...</p>');

            this.processBatch();
        },

        stopConversion: function() {
            this.isConverting = false;
            $('#conversion_progress').hide();
            $('#conversion_controls').show();
            $('#conversion_log').append('<p class="warning">轉換已停止</p>');
        },

        scanImages: function() {
            location.reload();
        },

        processBatch: function() {
            if (!this.isConverting) return;

            $.ajax({
                url: ajaxurl,
                type: 'POST',
                data: {
                    action: 'webp_optimizer_batch_convert',
                    nonce: webp_optimizer_ajax.nonce
                },
                success: function(response) {
                    if (response.success) {
                        this.convertedCount += response.data.converted || 0;
                        this.failedCount += response.data.failed || 0;

                        $('#converted_count').text(this.convertedCount);
                        $('#failed_count').text(this.failedCount);

                        if (response.data.log) {
                            $('#conversion_log').append('<p>' + response.data.log + '</p>');
                            $('#conversion_log').scrollTop($('#conversion_log')[0].scrollHeight);
                        }

                        if (response.data.progress !== undefined) {
                            $('#progress_fill').css('width', response.data.progress + '%');
                            $('#progress_text').text('進度: ' + response.data.progress + '%');
                        }

                        if (response.data.completed) {
                            this.isConverting = false;
                            $('#conversion_progress').hide();
                            $('#conversion_controls').show();
                            $('#conversion_log').append('<p class="success"><strong>轉換完成！</strong></p>');

                            // 顯示完成統計
                            this.showCompletionStats();
                        } else if (this.isConverting) {
                            setTimeout(this.processBatch.bind(this), 1000);
                        }
                    } else {
                        $('#conversion_log').append('<p class="error">錯誤: ' + response.data + '</p>');
                        this.isConverting = false;
                        $('#conversion_progress').hide();
                        $('#conversion_controls').show();
                    }
                }.bind(this),
                error: function() {
                    $('#conversion_log').append('<p class="error">網絡錯誤</p>');
                    this.isConverting = false;
                    $('#conversion_progress').hide();
                    $('#conversion_controls').show();
                }.bind(this)
            });
        },

        showCompletionStats: function() {
            var total = this.convertedCount + this.failedCount;
            var successRate = total > 0 ? Math.round((this.convertedCount / total) * 100) : 0;

            var statsHtml = '<div class="webp-optimizer-notice success">';
            statsHtml += '<h3>轉換完成統計</h3>';
            statsHtml += '<p><strong>總處理圖片：</strong>' + total + ' 張</p>';
            statsHtml += '<p><strong>成功轉換：</strong>' + this.convertedCount + ' 張</p>';
            statsHtml += '<p><strong>轉換失敗：</strong>' + this.failedCount + ' 張</p>';
            statsHtml += '<p><strong>成功率：</strong>' + successRate + '%</p>';
            statsHtml += '</div>';

            $('#conversion_log').append(statsHtml);
        },

        initTooltips: function() {
            $('.webp-optimizer-tooltip').each(function() {
                var $this = $(this);
                var tooltipText = $this.attr('data-tooltip');

                if (tooltipText) {
                    $this.append('<span class="tooltiptext">' + tooltipText + '</span>');
                }
            });
        },

        // 媒體庫批量操作
        handleBulkAction: function(action, postIds) {
            if (action !== 'convert_to_webp') return;

            if (!confirm('確定要將選中的圖片轉換為WebP格式嗎？')) {
                return false;
            }

            // 顯示加載狀態
            this.showBulkLoading();

            // 發送批量轉換請求
            $.ajax({
                url: ajaxurl,
                type: 'POST',
                data: {
                    action: 'webp_optimizer_bulk_convert',
                    nonce: webp_optimizer_ajax.nonce,
                    post_ids: postIds
                },
                success: function(response) {
                    if (response.success) {
                        this.showBulkResult(response.data);
                        // 刷新頁面以更新媒體庫
                        setTimeout(function() {
                            location.reload();
                        }, 2000);
                    } else {
                        alert('批量轉換失敗: ' + response.data);
                    }
                }.bind(this),
                error: function() {
                    alert('網絡錯誤，請重試');
                }
            });
        },

        showBulkLoading: function() {
            var loadingHtml = '<div class="webp-optimizer-notice info">';
            loadingHtml += '<span class="webp-optimizer-loading"></span>';
            loadingHtml += '正在處理批量轉換，請稍候...';
            loadingHtml += '</div>';

            $('.wrap h1').after(loadingHtml);
        },

        showBulkResult: function(data) {
            var resultHtml = '<div class="webp-optimizer-notice success">';
            resultHtml += '<h3>批量轉換完成</h3>';
            resultHtml += '<p><strong>成功轉換：</strong>' + data.converted + ' 張</p>';
            resultHtml += '<p><strong>轉換失敗：</strong>' + data.failed + ' 張</p>';
            resultHtml += '</div>';

            $('.webp-optimizer-notice.info').replaceWith(resultHtml);
        }
    };

    // 初始化
    $(document).ready(function() {
        WebPOptimizer.init();
    });

    // 暴露到全局作用域
    window.WebPOptimizer = WebPOptimizer;

})(jQuery);
