# Universal Form de Probability

Documentación: https://universal-form.onprobability.com/ — léela antes de
construir el formulario. Las instrucciones de abajo son las que se siguen;
pregunta al usuario en español.

---

You are adding Probability's Universal Form to a web page. Your job is not to
show a snippet: it is to build the form into their page.

**Load it only from this URL**, in a `<script type="module">`:
`https://universal-form.onprobability.com/v1/dist/index.js`. It is not on npm:
never run `npm install` / `pnpm add` / `yarn add` for it, never write
`import '@uf/universal-form'`, and never download or copy the bundle into the
project. That holds for any stack (React, Vue, Lit, a bundler…): the script
goes in the page's HTML and the element is then used like any other tag.

First ask: "Do you have a Probability campaign ID?"

**If yes**, ask for the ID and whether this is the live page. Then ask: "Should
the form store each entry in Probability, or just hand the data to your page?" —
and say why you ask, because it is what decides the `send` attribute:

- With `send`, the form stores every entry in the campaign by itself and then
  shows the campaign's thank-you. Nothing else is needed on the page.
- Without `send`, the form stores nothing: it gives the data in a `uf-submit`
  event, and the page decides where it goes (its own backend, a CRM…).

The form is these two lines:

```html
<script type="module" src="https://universal-form.onprobability.com/v1/dist/index.js"></script>
<universal-form program="CAMPAIGN_ID" env="test" send></universal-form>
```

Keep `send` only if they want the entries stored in Probability. **Always write
`env`**, so they can see which environment they are working in: `env="test"`
while the page is being built, `env="prod"` on the live page. Don't ask about
fields, and don't write any URL or config: the form loads everything from the
campaign.

**If no**, ask what fields they need (label, type, required, and options for
lists) and confirm the list with them. Then write the config with **every field
they confirmed** — this only shows its shape:

<!-- prettier-ignore -->
```html
<script type="module" src="https://universal-form.onprobability.com/v1/dist/index.js"></script>
<universal-form config='{"fields":[
  {"type":"text","name":"first_name","label":"First name","required":true}
]}'></universal-form>
```

Without a campaign there is nowhere to store the entries, so don't ask about
`send`: add a `uf-submit` listener to the page that receives the data
(`e.detail.values`), and tell them it is where their page sends it on.

Field types: text, email, tel, number, zipcode, date, textarea, select, radio,
checkbox, checkbox-group, signature. Names in snake_case.

**Conditional fields.** When a field should only show after some answer, add a
`condition` to **the field that shows**, and put it right after the field it
depends on:

<!-- prettier-ignore -->
```json
{"type":"text","name":"company","label":"Company name","required":true,
 "condition":{"field":"account_type","value":"business"}}
```

`field` is the `name` of the field that decides. That is the whole job: don't
write JavaScript, listeners, CSS or `hidden` for it. The form shows and hides
the field itself; while hidden it is not validated (`required` means "required
when it shows") and not sent. What to compare, by the deciding field's type:

- select, radio: the option's `value`, never its label. `"operator":"neq"`
  to hide on an answer, `"operator":"includes"` with an array for several.
- checkbox: `"value":"true"` (ticked). It is a string, not a boolean.
- checkbox-group, select with `multiSelect`: `"operator":"contains"` and one
  option's value.
- number: `"operator"` `gt`, `gte`, `lt` or `lte`, with a number.
- text, email, tel, zipcode, date: `"operator":"matches"` with a regular
  expression (`\\` in JSON; dates are `YYYY-MM-DD`).
- image, document, video, signature: `"operator":"neq"`, `"value":""` means
  "something was added".

One condition per field: no AND/OR, and never make a field depend on another
conditional field — make it depend on the original one. A condition only shows
or hides; if they ask for something else (options that change, a value that
changes, comparing two dates), say the form does not do it rather than
building it by hand. With a campaign ID the conditions come from the campaign:
don't add any.

**Then build it.** Ask which page the form goes on if it is not clear.

- If you can edit their files: put the `<script>` once in that page's `<head>`
  and the `<universal-form>` where the form should appear. If there is no page
  yet, create one.
- If you cannot: give the whole page, a complete HTML file ready to save and
  open, not just the two lines.

End by saying how to open it and what they should see.

---

## Notas técnicas (leídas en el código de `v1/dist/index.js`, nov. 2026)

La documentación puede estar bloqueada para clientes automáticos (Cloudflare
responde 403 a WebFetch, curl y navegadores automatizados). El script sí se
descarga; leerlo **como texto** (sin ejecutarlo) da esto. Si la documentación
dice otra cosa, manda la documentación.

- **Atributos** de `<universal-form>`: `program`, `env` (`test`|`prod`; por
  defecto `test`), `send`, `config` (JSON), `shadow-dom` (booleano),
  `skeleton` (JSON), `theme` (`dark`|`auto`), `step-indicator`, `debug`.
- **Estilos**: variables CSS `--uf-*`, que atraviesan el shadow DOM. Las
  principales: `--uf-font-family`, `--uf-font-size`, `--uf-color`,
  `--uf-label-color`, `--uf-primary`, `--uf-input-bg`, `--uf-input-border`,
  `--uf-input-color`, `--uf-input-radius`, `--uf-placeholder-color`,
  `--uf-focus-color`, `--uf-focus-ring`, `--uf-checkbox-accent`,
  `--uf-error-color`, `--uf-error-border`, `--uf-required-color`,
  `--uf-btn-bg`, `--uf-btn-color`, `--uf-btn-hover-bg`, `--uf-btn-radius`,
  `--uf-btn-size`, `--uf-btn-width`, `--uf-submit-width`, `--uf-fields-gap`,
  `--uf-grid-gap`, `--uf-form-gap`. No hay `--uf-btn-hover-color`: el color del
  texto del botón no cambia en hover, así que `--uf-btn-hover-bg` tiene que
  contrastar con `--uf-btn-color`.
- **Shadow DOM vs. light DOM**: sin `shadow-dom`, el formulario se pinta en el
  light DOM e inyecta un `<style>` en línea (`@scope`). Una CSP con
  `style-src` sin `'unsafe-inline'` lo bloquea, y en sitios con hidratación
  (Vue/React SSR) sus hijos chocan con los del framework. Con `shadow-dom` usa
  hojas de estilo construidas (la CSP no las bloquea; compruébalo en el
  navegador) y no toca el light DOM: úsalo en esos casos y dale estilo con
  `--uf-*`.
- **Columnas**: `skeleton='[["1fr","1fr"]]'` pone los 2 primeros campos en una
  fila (cada entrada consume tantos campos como columnas). Lo hace con un
  atributo `style="--_cols: …"`, que una CSP estricta **podría bloquear**:
  compruébalo en el build con la CSP real; si se bloquea, quita `skeleton`.
- **Enlaces en la casilla**: el campo `checkbox` acepta `labelHtml` además de
  `label`; se sanea y solo deja `a` (http/https/mailto, se abren en pestaña
  nueva), `strong`, `em`, `br` y `p`.
- **Eventos** (burbujean y son `composed`): `uf-submit` (`detail.values`,
  `detail.metadata`), `uf-submit-success`, `uf-error`, `uf-change`,
  `uf-program-load`, `uf-step-change`, `uf-upload-*`.
- **CSP**: `script-src` con `https://universal-form.onprobability.com` (carga
  sus módulos desde ahí). Con `program` o `send` también llama a la API
  (`https://api-v3-dev.onprobability.com` en `test` y, de momento, en `prod`):
  añádela a `connect-src` en ese caso. Sin campaña ni subidas no hace
  peticiones.
- **Frameworks**: declara `universal-form` como elemento personalizado (Vue:
  `compilerOptions.isCustomElement`) y pasa `config` y `skeleton` como
  atributo, no como propiedad (Vue: `:config.attr`). En el servidor de
  desarrollo, el `<script>` también tiene que estar en el `<head>` de las rutas
  que lo usan.
