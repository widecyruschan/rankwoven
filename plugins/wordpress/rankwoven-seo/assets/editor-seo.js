/* global window, document, HTMLButtonElement, URLSearchParams, fetch, wp */
(function () {
  const config = window.rankwovenEditorSeoConfig;
  if (!config) {
    return;
  }

  const root = document.getElementById('rankwoven-editor-seo-metabox');
  if (!root) {
    return;
  }

  const statusEl = root.querySelector('[data-rankwoven-editor-seo-status]');
  const generateButton = root.querySelector('[data-rankwoven-editor-seo-action="generate"]');
  const saveButton = root.querySelector('[data-rankwoven-editor-seo-action="save"]');
  const focusKeyphraseInput = root.querySelector('#rankwoven_focus_keyphrase');
  const seoTitleInput = root.querySelector('#rankwoven_seo_title');
  const slugInput = root.querySelector('#rankwoven_seo_slug');
  const seoScoreInput = root.querySelector('#rankwoven_seo_score');
  const metaDescriptionInput = root.querySelector('#rankwoven_meta_description');
  const metaKeywordsInput = root.querySelector('#rankwoven_meta_keywords');
  const analysisInput = root.querySelector('#rankwoven_seo_analysis');

  function setStatus(message, isError) {
    if (!statusEl) {
      return;
    }

    statusEl.textContent = message;
    statusEl.style.color = isError ? '#b32d2e' : '';
  }

  function setButtonsDisabled(isDisabled) {
    [generateButton, saveButton].forEach((button) => {
      if (button instanceof HTMLButtonElement) {
        button.disabled = isDisabled;
      }
    });
  }

  function getClassicValue(selector) {
    const element = document.querySelector(selector);
    if (!element) {
      return '';
    }

    if ('value' in element) {
      return String(element.value || '');
    }

    return String(element.textContent || '');
  }

  function getEditorState() {
    const state = {
      postId: 0,
      currentTitle: '',
      currentSlug: '',
      excerpt: '',
      contentHtml: ''
    };

    try {
      if (window.wp && wp.data && typeof wp.data.select === 'function') {
        const editor = wp.data.select('core/editor');
        if (editor) {
          state.postId = Number(editor.getCurrentPostId?.() || document.querySelector('#post_ID')?.value || 0);
          state.currentTitle = String(editor.getEditedPostAttribute('title') || '');
          state.currentSlug = String(editor.getEditedPostAttribute('slug') || '');
          state.excerpt = String(editor.getEditedPostAttribute('excerpt') || '');
          state.contentHtml = String(editor.getEditedPostAttribute('content') || '');
          return state;
        }
      }
    } catch {
      // Fall through to classic editor values.
    }

    state.postId = Number(document.querySelector('#post_ID')?.value || 0);
    state.currentTitle = getClassicValue('#title');
    state.currentSlug = getClassicValue('#rankwoven_seo_slug');
    state.excerpt = getClassicValue('#excerpt');
    state.contentHtml = getClassicValue('#content');

    return state;
  }

  function getFieldValue(field) {
    return field ? String(field.value || '') : '';
  }

  function getSeoScoreValue() {
    return Number(getFieldValue(seoScoreInput).replace('/100', '')) || 0;
  }

  function getResponseErrorMessage(response, body, rawText) {
    const trimmedText = String(rawText || '').trim();

    if (trimmedText === '-1' || body === -1) {
      return 'Security check failed. Please refresh the editor page and try again.';
    }

    if (trimmedText === '0' || body === 0) {
      return 'WordPress AJAX action is unavailable. Please refresh the page and confirm RankWoven SEO is active.';
    }

    if (body && typeof body === 'object') {
      return body?.data?.message || body?.message || `SEO request failed (${response.status}).`;
    }

    if (trimmedText === '') {
      return `WordPress returned an empty response (${response.status}).`;
    }

    return `WordPress returned a non-JSON response (${response.status}). Please check the PHP error log.`;
  }

  async function parseSeoResponse(response) {
    const rawText = await response.text();
    const trimmedText = rawText.trim();
    let body = null;

    if (trimmedText !== '') {
      try {
        body = JSON.parse(trimmedText);
      } catch {
        throw new Error(getResponseErrorMessage(response, null, rawText));
      }
    }

    if (!response.ok || !body || typeof body !== 'object' || !body.success) {
      throw new Error(getResponseErrorMessage(response, body, rawText));
    }

    return body;
  }

  function syncEditorMetaState() {
    if (!(window.wp && wp.data && typeof wp.data.dispatch === 'function')) {
      return;
    }

    try {
      const editor = wp.data.dispatch('core/editor');
      if (editor && typeof editor.editPost === 'function') {
        editor.editPost({
          slug: getFieldValue(slugInput),
          meta: {
            _rankwoven_focus_keyphrase: getFieldValue(focusKeyphraseInput),
            _rankwoven_seo_title: getFieldValue(seoTitleInput),
            _rankwoven_seo_score: getSeoScoreValue(),
            _rankwoven_meta_description: getFieldValue(metaDescriptionInput),
            _rankwoven_meta_keywords: getFieldValue(metaKeywordsInput),
            _rankwoven_seo_analysis: getFieldValue(analysisInput)
          }
        });
      }
    } catch {
      // Server-side save remains the source of truth when Gutenberg meta sync is unavailable.
    }
  }

  function bindEditorMetaSync(field) {
    if (!field || typeof field.addEventListener !== 'function') {
      return;
    }

    field.addEventListener('input', syncEditorMetaState);
    field.addEventListener('change', syncEditorMetaState);
  }

  function applyEditorState(data) {
    if (seoTitleInput) {
      seoTitleInput.value = data.seoTitle || '';
    }
    if (slugInput) {
      slugInput.value = data.slug || '';
    }
    if (metaDescriptionInput) {
      metaDescriptionInput.value = data.metaDescription || '';
    }
    if (metaKeywordsInput) {
      metaKeywordsInput.value = data.metaKeywords || '';
    }
    if (seoScoreInput) {
      seoScoreInput.value = `${Number(data.seoScore || 0)}/100`;
    }
    if (analysisInput) {
      analysisInput.value = data.analysis || '';
    }

    if (window.wp && wp.data && typeof wp.data.dispatch === 'function') {
      try {
        const editor = wp.data.dispatch('core/editor');
        if (editor && typeof editor.editPost === 'function') {
          editor.editPost({
            slug: data.slug || '',
            meta: {
              _rankwoven_focus_keyphrase: data.focusKeyphrase || '',
              _rankwoven_seo_title: data.seoTitle || '',
              _rankwoven_seo_score: Number(data.seoScore || 0),
              _rankwoven_meta_description: data.metaDescription || '',
              _rankwoven_meta_keywords: data.metaKeywords || '',
              _rankwoven_seo_analysis: data.analysis || ''
            }
          });
        }
      } catch {
      // Ignore editor sync errors and keep the server-side save as source of truth.
      }
    }
  }

  async function requestEditorSeo(mode) {
    const editorState = getEditorState();
    const payload = new URLSearchParams();
    payload.set('action', 'rankwoven_editor_seo');
    payload.set('nonce', config.nonce);
    payload.set('mode', mode);
    payload.set('postId', String(editorState.postId || 0));
    payload.set('postType', config.postType || '');
    payload.set('currentTitle', editorState.currentTitle || '');
    payload.set('currentSeoTitle', seoTitleInput ? String(seoTitleInput.value || '') : '');
    payload.set('currentSlug', slugInput ? String(slugInput.value || '') : editorState.currentSlug || '');
    payload.set('focusKeyphrase', focusKeyphraseInput ? String(focusKeyphraseInput.value || '') : '');
    payload.set('seoTitle', seoTitleInput ? String(seoTitleInput.value || '') : '');
    payload.set('slug', slugInput ? String(slugInput.value || '') : editorState.currentSlug || '');
    payload.set('seoScore', seoScoreInput ? String(seoScoreInput.value || '').replace('/100', '') : '0');
    payload.set('metaDescription', metaDescriptionInput ? String(metaDescriptionInput.value || '') : '');
    payload.set('metaKeywords', metaKeywordsInput ? String(metaKeywordsInput.value || '') : '');
    payload.set('analysis', analysisInput ? String(analysisInput.value || '') : '');
    payload.set('excerpt', editorState.excerpt || '');
    payload.set('contentHtml', editorState.contentHtml || '');
    payload.set('locale', document.documentElement.lang || 'zh-Hant');

    setButtonsDisabled(true);
    setStatus(mode === 'generate' ? 'Generating SEO suggestions...' : 'Saving SEO fields...');

    try {
      const response = await fetch(config.ajaxUrl, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
        },
        body: payload.toString()
      });

      const body = await parseSeoResponse(response);

      applyEditorState(body.data);
      setStatus(mode === 'generate' ? 'SEO suggestions generated and applied.' : 'SEO fields saved.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'SEO request failed.', true);
    } finally {
      setButtonsDisabled(false);
    }
  }

  if (generateButton) {
    generateButton.addEventListener('click', () => {
      void requestEditorSeo('generate');
    });
  }

  if (saveButton) {
    saveButton.addEventListener('click', () => {
      void requestEditorSeo('save');
    });
  }

  [
    focusKeyphraseInput,
    seoTitleInput,
    slugInput,
    metaDescriptionInput,
    metaKeywordsInput
  ].forEach(bindEditorMetaSync);
})();
