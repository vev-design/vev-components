# CLAUDE.md — forms-native

Guidance for Claude Code when working in this component. See the repo root `CLAUDE.md` for monorepo-wide rules.

## What this package is

The native-HTML counterpart to `forms/`. Six separately registered widgets, all suffixed in the editor so they sit alongside the originals:

`Form button (Native)`, `Text Field (native)`, `Dropdown (native)`, `Checkbox (native)`, `Radio button (native)`, `Toggle (native)`

Note the inconsistent capitalisation — the button uses `(Native)`, the five fields use `(native)`.

- Vev key: `4Qqq1n9dKbvnc6cbcBFS`, with `"admin": true` and `"public": true` in `vev.json` — the only component in the repo with both flags.

## Relationship to `forms/`

A fork, not a shared library. `forms-native/src` is `forms/src` **minus** `submit/` and six of the eight `utils/` files. The remaining files have diverged. Fixing a bug in one package does **not** fix it in the other; check both.

The substantive difference: this package has no submission logic at all.

| | `forms` | `forms-native` |
|---|---|---|
| State owner | the Button widget, via `UPDATE_FORM` | none — the browser |
| Validation | JS, via `utils/validate.ts` and the interaction graph | native constraint attributes |
| Submission | POST to a Vev Cloud Function | whatever the enclosing `<form>` does |

## How submission is meant to work

Each field renders a real input carrying `name`, and the constraint attributes the editor exposes — `required`, `pattern`, `minLength`, `maxLength`, `min`, `max`. The button is a plain `<button type="submit">` (`components/Button/Button.tsx:16-23`) with no click handler.

**This package contains no `<form>` element.** Nothing here creates one. The widgets only do something useful when the surrounding page provides a `<form>` ancestor — otherwise the submit button does nothing and the native validation never fires. That dependency is implicit and unenforced; if these widgets appear inert, check for the missing `<form>` before looking anywhere else.

## Known bug

**`Form button (Native)` declares two interactions it does not implement.** `SET_LABEL` and `SET_LOADING` appear in the registration (`components/Button/Button.tsx:88-97`), so authors can bind to them in the editor, but the component has no `useVevEvent` call and no state — both are silently inert. The `buttonText` prop is the only way to set the label, and there is no loading state.

Every field widget *does* implement its `setValue` interaction properly, so the button is the outlier.

## Field widget pattern

All five fields follow the same shape:

```ts
useVevEvent(Interaction.setValue, (event) => setValue(event.value));  // inbound
dispatch(Event.onChange, { value });                                   // outbound
```

`Toggle` and `Checkbox` carry `boolean` values; `TextField`, `Dropdown`, and `RadioButton` carry `string`.

The `onChange` events exist for wiring into other widgets. They are **not** needed for submission here — unlike in `forms/`, where they are the only way data reaches the button.

## Working on this

```bash
cd forms-native
yarn install
vev start
```

Verify on a page that actually wraps the widgets in a `<form>`. Check:

1. Native validation bubbles appear for `required` and `pattern` violations.
2. Submitted field names match the `name` props.
3. The `setValue` interaction on each field type.
4. Do not expect `SET_LABEL` / `SET_LOADING` to work — see above.
