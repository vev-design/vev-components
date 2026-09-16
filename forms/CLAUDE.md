# CLAUDE.md — forms

Guidance for Claude Code when working in this component. See the repo root `CLAUDE.md` for monorepo-wide rules.

## What this package is

**Six separately registered Vev widgets**, not one form component: `Form button`, `Text Field`, `Dropdown`, `Checkbox`, `Radio button`, `Toggle`. There is no parent `<form>` element and no container widget. A page author drops the fields and a button onto the canvas and wires them together with Vev interactions.

- Vev key: `86Z7EgRdiX7DepHUHRnS` (plus `devKey: SidNqBcZd01cXm8vCMYx`)
- All six register with `categories: ['Form']` and the shared `assets/form-icon.svg`
- See also `forms-native/` — a parallel package of the same six widgets built on native HTML validation. The two are independent forks and do not share code.

## How the pieces connect

There is no shared store. Each field dispatches its own `onChange` event; the page author binds that event to the button's `UPDATE_FORM` interaction. **The button is the form** — it holds all state:

```
TextField  --onChange-->  [editor interaction binding]  -->  Button.UPDATE_FORM
Dropdown   --onChange-->                                -->  Button.UPDATE_FORM
...
```

`useVevEvent(UPDATE_FORM)` (`components/Button/Button.tsx:190-212`) merges each incoming `{ name, value }` into `formState`. Checkbox-style fields send `type: 'add' | 'remove'` and the handler maintains an array.

**If the author forgets to wire a field, that field silently never reaches the form.** There is no validation of the wiring.

### Discovering which fields belong to this button

`getFormModels` (`Button.tsx:82-102`) does a reverse lookup through the editor's interaction graph, read from `useGlobalStateRef()`:

```ts
Object.entries(interactions?.event)
  .map(([key, value]) => value.find(i => i.type === 'UPDATE_FORM' && i.node === modelKey) && key.split('.')[0])
```

It finds every event bound to *this* button's `UPDATE_FORM`, takes the source model key, and looks up those models to read their `required` / validation settings. This is how validation works without a form container — and why it depends on `store.current.interactions` and `store.current.models`, both undocumented runtime internals.

## Submission

Despite the elaborate "Destination configuration" prop group (Zapier / Google Sheet / HTTP Request, with method, headers, query params, and default data), **runtime submission ignores nearly all of it.** `handleSubmit` POSTs `{ formData, formId }` as JSON to a single hard-coded endpoint:

```
https://us-central1-vev-prod.cloudfunctions.net/publicApiHttps/form-submission
```

`formId` is `${project}.${model.type}.${model.key}`. The destination is resolved server-side from that id — `GoogleSheetConnect` and `ZapierConnect` are editor-side OAuth/setup panels that register the destination against the form id, not runtime transports.

The only client-side branch is `isLinkSubmission` (`newTab` on a GET http request), which opens a serialized URL instead of posting.

## Known bugs

These are real and confirmed. Do not "clean them up" incidentally — fixing the first two changes live behaviour.

1. **The "Open as link" prop can never be shown.** Its `hidden` predicate reads `value?.submit?.htmlRequest?.method` (`Button.tsx:360`) but the field is named `httpRequest` (`Button.tsx:320`). `htmlRequest` is always `undefined`, so `newTab` stays hidden and `isLinkSubmission` is unreachable.
2. **The link path builds a broken URL.** `Button.tsx:160` concatenates `props.submit.httpRequest` — an *object* — with the query string, producing `"[object Object]?a=b"`. It should read `.url`. Currently masked by bug 1.
3. **`handleSubmit` has an empty dependency array** (`Button.tsx:188`) while reading `props.submit`, `model.key`, and `store`. It captures the first render's props. `formState` is passed as an argument so that part is safe, but changing the destination config in the editor does not take effect until remount.
4. **Debug `console.log` calls ship to production** — `Button.tsx:133`, `:145`, `:193`.
5. **Four unused util files**: `utils/validate-form.ts`, `utils/deepen.ts`, `utils/flatten.ts`, `utils/usePrevious.ts`. Nothing imports them. `Button.tsx` defines its own local `validateForm` rather than using `utils/validate-form.ts`. Only `utils/validate.ts` (used by `TextField` and `Button`) and `utils/google-create-sheet.ts` (used by `GoogleSheetConnect`) are live.

## Events and interactions

Button emits `FORM_SUBMITTED`, `FORM_VALID`, `FORM_INVALID` (the last with an `errors` array of `{ key, message }`). It receives `UPDATE_FORM`.

Fields emit `onChange`, `onValid`, `onInvalid`.

## Working on this

```bash
cd forms
yarn install
vev start
```

Because the widgets are only connected through editor interactions, **a single widget in isolation proves nothing.** Test by placing a button plus at least two field types on a page and wiring each field's `onChange` to the button's `UPDATE_FORM`, then:

1. Submit with a required field empty — expect `FORM_INVALID`.
2. Submit valid data and confirm the POST to the Cloud Function endpoint in the network panel.
3. Change the destination config and remount, given bug 3.
4. Check a checkbox group, which exercises the `add`/`remove` array path.
