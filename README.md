# Luggest

# Luggest

![license](https://img.shields.io/badge/license-MIT-green)
![size](https://img.shields.io/badge/size-~2KB-blue)
![js](https://img.shields.io/badge/vanilla-JS-orange)


**Luggest** is a lightweight, dependency-free autocomplete library for plain JavaScript.

- No jQuery
- Simple API
- Works with static arrays or remote JSON sources
- Per-element instances (similar to CKEditor / TinyMCE style access)

---

## Features

- 🔎 Autocomplete for any text `<input>`
- 📃 Static array source **or** AJAX URL
- 🎯 Supports `{ value, label, metadata }` objects **or** simple string arrays
- 🎚 Configurable minimum input length (`min_length`, default `1`, can be `0`)
- 🎛 Events: `on_open`, `on_select`
- 🧹 Instance methods: `close()`, `destroy()`
- 🧱 Global access via `Luggest.get(id)` and `Luggest.instances[id]`

---

## Installation

### Option 1: Direct `<script>` include

```html
<script src="src/luggest.js"></script>
```

### Option 2: Local copy

Just copy `src/luggest.js` into your project and include it in your layout.

---

## Basic Usage

HTML:

```html
<input type="text" id="city-input" autocomplete="off">
```

JavaScript:

```html
<script src="src/luggest.js"></script>
<script>
    const cities = ['Prague', 'Brno', 'Ostrava', 'Plzeň', 'Liberec'];

    Luggest.init('#city-input', {
        source: cities,
        min_length: 1,
        on_select: function (element, item) {
            console.log('Selected:', item);
        }
    });
</script>
```

---

## Options

`Luggest.init(target, options)`

- **`target`**:  
  - CSS selector string (e.g. `'#my-input'`) **or**
  - DOM element (`document.getElementById(...)` / `querySelector(...)`)  
  The element **must have an `id`** or Luggest will log an error and skip init.

- **`options`** (all optional):

  - `source`  
    - `Array` or `String` (URL)
    - **Array mode**:
      - `['Prague', 'Brno']`
      - or `[{ value: 'prg', label: 'Prague', metadata: {...} }, ...]`
      - Strings are normalized to `{ value, label }` where `value === label`
    - **URL mode**:
      - `source: '/autocomplete/cities'`
      - Luggest calls: `/autocomplete/cities?term=YOUR_QUERY`
      - The endpoint must return JSON array in the same formats as above.

  - `min_length`
    - Minimal number of characters before suggestions are requested.
    - Default: `1`
    - Can be `0`. In that case:
      - On **focus**, all suggestions are shown (for the current source).

  - `max_results`
    - Maximum number of items shown in dropdown.
    - Default: `20`

  - `on_open(element, items)`
    - Called when suggestions are shown.
    - `element` – input element
    - `items` – array of normalized `{ value, label, metadata }`

  - `on_select(element, item)`
    - Called when user selects an item (click or Enter).
    - `element` – input element
    - `item` – selected item `{ value, label, metadata }`

---

## API

### Initialize

```js
const instance = Luggest.init('#my-input', {
    source: myData,
    min_length: 2
});
```

If an instance already exists for that element ID, the existing one is returned.

### Get instance

```js
const inst = Luggest.get('my-input');
// or
const inst2 = Luggest.instances['my-input'];
```

### Instance methods

```js
inst.close();    // Close dropdown
inst.destroy();  // Remove dropdown, listeners, and unregister instance
```

Destroying will also:

- Remove the dropdown container from DOM
- Remove event listeners
- Delete `Luggest.instances[id]`
- Clear `data-luggest` on the element

---

## Browser Support

- Modern evergreen browsers (Chrome, Firefox, Edge, Safari)
- No external dependencies

---

## License

MIT
