/**
 * Luggest - Lightweight Autocomplete Library
 * ------------------------------------------
 * Vanilla JavaScript autocomplete utility with zero dependencies.
 * Supports static arrays, remote JSON sources, keyboard navigation,
 * per-element instances, and customizable callbacks.
 *
 * Repository: https://github.com/yesman93/luggest
 * License: MIT
 */

Object.defineProperty(window, 'Luggest', {

    configurable: false,
    enumerable: false,

    /**
     * Lazy-loaded singleton getter.
     *
     * @returns {Object} Luggest core singleton
     */
    get: (function () {

        let _instance = null;

        return function () {

            if (_instance) {
                return _instance;
            }

            _instance = {

                /**
                 * Map of input element IDs to their Luggest instances.
                 *
                 * @type {Object.<string, Object>}
                 */
                _instances: {},

                /**
                 * Exposed reference to instances map (read-only by convention).
                 *
                 * @type {Object.<string, Object>}
                 */
                get instances() {
                    return this._instances;
                },

                /**
                 * Default minimal length of input to start suggesting.
                 *
                 * @type {Number}
                 */
                default_min_length: 1,

                /**
                 * Initialize Luggest on an element or selector.
                 *
                 * @param {HTMLElement|string} target
                 * @param {Object} [options]
                 * @param {Array|String} [options.source] Array of items or URL returning JSON.
                 * @param {Number} [options.min_length] Minimal input length to trigger suggestions.
                 * @param {Function} [options.on_open] Callback when suggestions are shown.
                 * @param {Function} [options.on_select] Callback when item is selected.
                 * @param {Number} [options.max_results] Limit number of shown results.
                 *
                 * @returns {Object|null} Instance bound to element or null on failure.
                 */
                init: function (target, options) {

                    const element = this._resolve_element(target);

                    if (!element) {
                        console.error('[Luggest] Target element not found for:', target);
                        return null;
                    }

                    if (!element.id) {
                        console.error('[Luggest] Element must have an id attribute to use Luggest.', element);
                        return null;
                    }

                    const id = element.id;

                    if (this._instances[id]) {
                        return this._instances[id];
                    }

                    const normalized_options = options || {};

                    const instance = this._create_instance(element, normalized_options);

                    this._instances[id] = instance;
                    element.dataset.luggest = '1';

                    return instance;
                },

                /**
                 * Retrieve Luggest instance for given element ID.
                 *
                 * @param {String} id
                 *
                 * @returns {Object|null}
                 */
                get: function (id) {
                    return this._instances[id] || null;
                },

                /**
                 * Destroy Luggest instance for given element ID (if exists).
                 *
                 * @param {String} id
                 *
                 * @returns {void}
                 */
                destroy: function (id) {
                    const instance = this._instances[id];
                    if (instance && typeof instance.destroy === 'function') {
                        instance.destroy();
                    }
                },

                /**
                 * Resolve DOM element from selector or element reference.
                 *
                 * @param {HTMLElement|string} target
                 *
                 * @returns {HTMLElement|null}
                 */
                _resolve_element: function (target) {

                    if (target instanceof HTMLElement) {
                        return target;
                    }

                    if (typeof target === 'string') {
                        return document.querySelector(target);
                    }

                    return null;
                },

                /**
                 * Normalize a single source item into { value, label, metadata }.
                 *
                 * @param {*} item
                 *
                 * @returns {{value: string, label: string, metadata: any}}
                 */
                _normalize_item: function (item) {

                    if (item && typeof item === 'object') {

                        const value = item.value != null
                            ? String(item.value)
                            : (item.label != null ? String(item.label) : '');

                        const label = item.label != null
                            ? String(item.label)
                            : value;

                        const metadata = Object.prototype.hasOwnProperty.call(item, 'metadata')
                            ? item.metadata
                            : null;

                        return {
                            value: value,
                            label: label,
                            metadata: metadata
                        };
                    }

                    const value_str = String(item);

                    return {
                        value: value_str,
                        label: value_str,
                        metadata: null
                    };
                },

                /**
                 * Normalize an array of items into standard objects.
                 *
                 * @param {Array} list
                 *
                 * @returns {Array<{value: string, label: string, metadata: any}>}
                 */
                _normalize_list: function (list) {

                    if (!Array.isArray(list)) {
                        return [];
                    }

                    const normalized = [];

                    for (let i = 0; i < list.length; i++) {
                        normalized.push(this._normalize_item(list[i]));
                    }

                    return normalized;
                },

                /**
                 * Fetch and filter source items for a given query.
                 * Supports array source or URL returning JSON array.
                 *
                 * @param {Array|string} source
                 * @param {String} query
                 * @param {Array|null} [normalized_array_source]
                 *
                 * @returns {Promise<Array<{value: string, label: string, metadata: any}>>}
                 */
                _resolve_source: function (source, query, normalized_array_source) {

                    const term = (query || '').toLowerCase();

                    // Array source (already normalized)
                    if (Array.isArray(source)) {

                        const list = Array.isArray(normalized_array_source)
                            ? normalized_array_source
                            : this._normalize_list(source);

                        if (!term) {
                            return Promise.resolve(list);
                        }

                        const filtered = list.filter(function (item) {
                            const label = (item.label || '').toLowerCase();
                            const value = (item.value || '').toLowerCase();
                            return label.indexOf(term) !== -1 || value.indexOf(term) !== -1;
                        });

                        return Promise.resolve(filtered);
                    }

                    // URL source
                    if (typeof source === 'string' && source.length > 0) {

                        const has_query = source.indexOf('?') !== -1;
                        const url = source + (has_query ? '&' : '?') + 'term=' + encodeURIComponent(query);

                        return fetch(url, {
                            method: 'GET',
                            credentials: 'same-origin',
                            headers: {
                                'Accept': 'application/json'
                            }
                        })
                            .then(function (response) {
                                return response.json();
                            })
                            .then(function (data) {
                                if (!Array.isArray(data)) {
                                    return [];
                                }
                                return _instance._normalize_list(data);
                            })
                            .catch(function (error) {
                                console.error('[Luggest] Error loading suggestions:', error);
                                return [];
                            });
                    }

                    return Promise.resolve([]);
                },

                /**
                 * Create a Luggest instance for a specific input element.
                 *
                 * @param {HTMLInputElement} element
                 * @param {Object} options
                 *
                 * @returns {Object}
                 */
                _create_instance: function (element, options) {

                    const core = this;

                    const instance = {

                        id: element.id,
                        element: element,

                        options: {
                            source: options.source || [],
                            min_length: (typeof options.min_length === 'number' && options.min_length >= 0)
                                ? options.min_length
                                : core.default_min_length,
                            on_open: typeof options.on_open === 'function' ? options.on_open : null,
                            on_select: typeof options.on_select === 'function' ? options.on_select : null,
                            max_results: typeof options.max_results === 'number' ? options.max_results : 20
                        },

                        _container: null,
                        _items: [],
                        _is_open: false,
                        _highlight_index: -1,
                        _last_query: '',
                        _array_source_normalized: Array.isArray(options.source)
                            ? core._normalize_list(options.source)
                            : null,

                        _pending_request_token: 0,

                        _bound_on_input: null,
                        _bound_on_focus: null,
                        _bound_on_keydown: null,
                        _bound_on_document_click: null,
                        _bound_on_resize: null,

                        /**
                         * Close suggestion dropdown.
                         *
                         * @returns {void}
                         */
                        close: function () {

                            if (!this._is_open) {
                                return;
                            }

                            if (this._container) {
                                this._container.style.display = 'none';
                                this._container.innerHTML = '';
                            }

                            this._is_open = false;
                            this._highlight_index = -1;
                        },

                        /**
                         * Destroy this instance and detach all event listeners.
                         *
                         * @returns {void}
                         */
                        destroy: function () {

                            this.close();
                            this._unbind_events();

                            if (this._container && this._container.parentNode) {
                                this._container.parentNode.removeChild(this._container);
                            }

                            if (this.element && this.element.dataset) {
                                delete this.element.dataset.luggest;
                            }

                            if (core._instances && this.id && core._instances[this.id]) {
                                delete core._instances[this.id];
                            }
                        },

                        /**
                         * Create dropdown container if not yet created.
                         *
                         * @returns {void}
                         */
                        _ensure_container: function () {

                            if (this._container) {
                                return;
                            }

                            const container = document.createElement('div');
                            container.className = 'luggest-dropdown';
                            container.style.position = 'absolute';
                            container.style.display = 'none';
                            container.style.zIndex = '9999';

                            document.body.appendChild(container);

                            this._container = container;
                        },

                        /**
                         * Position container below the input element.
                         *
                         * @returns {void}
                         */
                        _position_container: function () {

                            if (!this._container || !this.element) {
                                return;
                            }

                            const rect = this.element.getBoundingClientRect();

                            this._container.style.minWidth = rect.width + 'px';
                            this._container.style.top = (rect.bottom + window.scrollY) + 'px';
                            this._container.style.left = (rect.left + window.scrollX) + 'px';
                        },

                        /**
                         * Render suggestion items in dropdown.
                         *
                         * @param {Array<{value: string, label: string, metadata: any}>} items
                         *
                         * @returns {void}
                         */
                        _render_items: function (items) {

                            this._ensure_container();

                            const container = this._container;

                            container.innerHTML = '';

                            if (!items || !items.length) {
                                this.close();
                                return;
                            }

                            this._position_container();

                            const fragment = document.createDocumentFragment();
                            const limit = Math.min(items.length, this.options.max_results);

                            for (let i = 0; i < limit; i++) {

                                const item = items[i];
                                const div = document.createElement('div');
                                div.className = 'luggest-item';
                                div.textContent = item.label;
                                div.dataset.index = String(i);

                                div.addEventListener('mousedown', (event) => {
                                    event.preventDefault();
                                    this._select_item(i);
                                });

                                fragment.appendChild(div);
                            }

                            container.appendChild(fragment);
                            container.style.display = 'block';

                            this._is_open = true;
                            this._highlight_index = -1;

                            if (typeof this.options.on_open === 'function') {
                                this.options.on_open(this.element, items);
                            }
                        },

                        /**
                         * Handle input event; trigger suggestion loading.
                         *
                         * @param {Event} event
                         *
                         * @returns {void}
                         */
                        _handle_input: function (event) {

                            const value = this.element.value || '';
                            this._last_query = value;

                            if (value.length < this.options.min_length) {
                                this.close();
                                return;
                            }

                            const current_token = ++this._pending_request_token;

                            core._resolve_source(
                                this.options.source,
                                value,
                                this._array_source_normalized
                            ).then((items) => {

                                if (current_token !== this._pending_request_token) {
                                    return;
                                }

                                this._items = items || [];
                                this._render_items(this._items);
                            });
                        },

                        /**
                         * Set active (highlighted) item by index.
                         *
                         * @param {Number} index
                         *
                         * @returns {void}
                         */
                        _set_highlight: function (index) {

                            if (!this._container) {
                                return;
                            }

                            const nodes = this._container.querySelectorAll('.luggest-item');

                            for (let i = 0; i < nodes.length; i++) {
                                const node = nodes[i];
                                if (i === index) {
                                    node.classList.add('is-active');
                                } else {
                                    node.classList.remove('is-active');
                                }
                            }

                            this._highlight_index = index;
                        },

                        /**
                         * Handle keyboard navigation.
                         *
                         * @param {KeyboardEvent} event
                         *
                         * @returns {void}
                         */
                        _handle_keydown: function (event) {

                            if (!this._is_open || !this._items.length) {
                                return;
                            }

                            const key = event.key;

                            if (key === 'ArrowDown' || key === 'Down') {

                                event.preventDefault();

                                const next_index = (this._highlight_index + 1) % this._items.length;
                                this._set_highlight(next_index);

                            } else if (key === 'ArrowUp' || key === 'Up') {

                                event.preventDefault();

                                const prev_index = (this._highlight_index - 1 + this._items.length) % this._items.length;
                                this._set_highlight(prev_index);

                            } else if (key === 'Enter') {

                                if (this._highlight_index >= 0 && this._highlight_index < this._items.length) {
                                    event.preventDefault();
                                    this._select_item(this._highlight_index);
                                }

                            } else if (key === 'Escape' || key === 'Esc') {

                                this.close();
                            }
                        },

                        /**
                         * Handle focus event (only if min_length = 0).
                         *
                         * @returns {void}
                         */
                        _handle_focus: function () {

                            if (this.options.min_length === 0) {
                                this._handle_input(); // triggers loading all results
                            }
                        },


                        /**
                         * Handle clicks outside the input/dropdown to close results.
                         *
                         * @param {MouseEvent} event
                         *
                         * @returns {void}
                         */
                        _handle_document_click: function (event) {

                            const target = event.target;

                            if (target === this.element) {
                                return;
                            }

                            if (this._container && this._container.contains(target)) {
                                return;
                            }

                            this.close();
                        },

                        /**
                         * Select item at given index.
                         *
                         * @param {Number} index
                         *
                         * @returns {void}
                         */
                        _select_item: function (index) {

                            const item = this._items[index];

                            if (!item) {
                                return;
                            }

                            this.element.value = item.value;

                            if (typeof this.options.on_select === 'function') {
                                this.options.on_select(this.element, item);
                            }

                            this.close();
                        },

                        /**
                         * Bind DOM event listeners.
                         *
                         * @returns {void}
                         */
                        _bind_events: function () {

                            this._bound_on_input = this._handle_input.bind(this);
                            this._bound_on_focus = this._handle_focus.bind(this);
                            this._bound_on_keydown = this._handle_keydown.bind(this);
                            this._bound_on_document_click = this._handle_document_click.bind(this);
                            this._bound_on_resize = this._position_container.bind(this);

                            this.element.addEventListener('input', this._bound_on_input);
                            this.element.addEventListener('focus', this._bound_on_focus);
                            this.element.addEventListener('keydown', this._bound_on_keydown);
                            document.addEventListener('click', this._bound_on_document_click);
                            window.addEventListener('resize', this._bound_on_resize);
                        },

                        /**
                         * Unbind DOM event listeners.
                         *
                         * @returns {void}
                         */
                        _unbind_events: function () {

                            if (this._bound_on_input) {
                                this.element.removeEventListener('input', this._bound_on_input);
                            }

                            if (this._bound_on_focus) {
                                this.element.removeEventListener('focus', this._bound_on_focus);
                            }

                            if (this._bound_on_keydown) {
                                this.element.removeEventListener('keydown', this._bound_on_keydown);
                            }

                            if (this._bound_on_document_click) {
                                document.removeEventListener('click', this._bound_on_document_click);
                            }

                            if (this._bound_on_resize) {
                                window.removeEventListener('resize', this._bound_on_resize);
                            }

                            this._bound_on_input = null;
                            this._bound_on_focus = null;
                            this._bound_on_keydown = null;
                            this._bound_on_document_click = null;
                            this._bound_on_resize = null;
                        }
                    };

                    instance._bind_events();

                    return instance;
                }
            };

            return _instance;
        };
    })()
});
