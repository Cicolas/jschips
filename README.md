# JSChip

A lightweight, zero-dependency chip/tag library for the browser.

## Installation

Include the script directly in your HTML:

```html
<script src="jschips.js"></script>
```

Or use the minified build:

```html
<script src="dist/jschips.min.js"></script>
```

## Basic usage

```html
<div id="chips"></div>

<script>
  const manager = new JSChip('#chips');

  manager.create({ label: 'Hello' });
  manager.create({ label: 'World', level: 'success' });
</script>
```

## Manager options

```js
const manager = new JSChip('#chips', {
  closable: true,   // show × button on all chips (default: true)
  draggable: true,  // enable drag-and-drop reordering (default: true)
});
```

## Creating chips

### `create(options)` → `Chip`

| Option      | Type    | Default     | Description                                      |
|-------------|---------|-------------|--------------------------------------------------|
| `label`     | string  | `'Chip'`    | Chip text                                        |
| `level`     | string  | `'default'` | `default` `info` `warning` `error` `success` `disabled` |
| `icon`      | string  | —           | Icon or emoji shown before the label             |
| `closable`  | boolean | `true`      | Show × button                                    |
| `draggable` | boolean | `true`      | Allow drag-and-drop reordering                   |
| `id`        | string  | auto        | Custom id (auto-generated if omitted)            |
| `data`      | object  | `{}`        | Arbitrary data stored on the chip instance       |

```js
const chip = manager.create({
  label: 'Warning',
  level: 'warning',
  icon: '⚠️',
  closable: true,
});
```

### `createMany(list)` → `Chip[]`

```js
manager.createMany([
  { label: 'One', level: 'info' },
  { label: 'Two', level: 'success' },
]);
```

## Managing chips

```js
manager.get('chip-id');   // retrieve a chip by id → Chip | null
manager.getAll();         // all chips → Chip[]
manager.remove('chip-id'); // remove by id → boolean
manager.clear();          // remove all chips
```

## Chip methods

```js
chip.setLabel('New label');  // update text
chip.setLevel('error');      // change level
chip.remove();               // remove from manager
```

## Events

```js
manager.on('chip:create',   ({ chip }) => console.log('created', chip.id));
manager.on('chip:remove',   ({ chip }) => console.log('removed', chip.id));
manager.on('chip:click',    ({ chip, event }) => console.log('clicked', chip));
manager.on('chip:dragstart', ({ chip }) => {});
manager.on('chip:dragend',   ({ chip }) => {});
manager.on('chip:drop',     ({ source, target }) => {});

// Unsubscribe
manager.off('chip:click', handler);
```

## Build

```sh
npm install
npm run build   # outputs dist/jschips.min.js and dist/styles.min.css
```
