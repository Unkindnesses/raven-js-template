# Raven JS Template

This repo shows how to call [Raven](https://github.com/unkindnesses/raven) code
within a JS project. You don't need to install Raven (it's included as a
package here) but you do need [Node.js](https://nodejs.org/en) (v25+) with npm.

Run the demo with these commands:

```bash
$ git clone https://github.com/Unkindnesses/raven-js-template
$ cd raven-js-template
$ npm i
$ npm run build
$ node dist/index.js
hello from raven!
hello from js!
2 + 3 = 5
[
  1,  1,  2,  3,  5,
  8, 13, 21, 34, 55
]
```

Functionality here is basic as the intent is to demonstrate the build process,
not to show off what Raven and JS can do. It's set up as a command line app,
but the same approaches should work in the browser (you can load `index.js` into
a web page).

We recommended looking at the build scripts in `package.json` to see how this
is put together.

## Calling Raven from JS

The basics are easy. This repo shows off TypeScript and esbuild integration,
but for now let's try the most basic JS->Raven call.

You can export a function from Raven much as you would in JS. Arguments are
received as `JSObject`s, so we convert them before use. `lib.rv`:

```js
export { add }

fn add(x, y) {
  Float64(x) + Float64(y)
}
```

Then import and call from JS. `main.js`:

```js
import { add } from './lib.js'

console.log(await add(2, 3))
```

Note that all Raven functions are in effect async, so you have to `await` the
result. (We'll have a way to export sync functions in future.)

The only other wrinkle is that we have to compile the Raven code to JS before
running.

```bash
$ npx raven build --js lib.rv
$ node main.js
5
```

Raven emits `.js` and `.wasm` files by default. You should probably add these
to your `.gitignore` – either the specific outputs (`src/lib.js` and
`src/lib.wasm`), all JS and wasm files (`src/*.js` and co) or all such files in
a `src` subfolder (`src/raven/*.js` and co) depending on what's convenient.

Just like JS, Raven source files can be run as scripts. Any top-level statements
are run when the module is loaded. `lib.rv`:

```js
export { add }

fn add(x, y) {
  Float64(x) + Float64(y)
}

println("hello, world!")
```

```bash
$ raven build --js lib.rv
$ node lib.js
hello, world!
$ node main.js
hello, world!
5
```

Raven tries to make source files platform-independent in the same way as JS, so
this'll run in node, a browser or wherever (provided you don't rely on platform-
specific APIs).

## Calling Raven from TypeScript

is exactly the same! Just change `main.js` above to `main.ts`.

Raven can export TypeScript compatible signatures, like so:

```js
export { add }

@ts `(x: number, y: number) => Promise<number>`
fn add(x, y) {
  Float64(x) + Float64(y)
}
```

You need to enable the `"allowJs": true` option in your `tsconfig.json` for this
to work. TypeScript will take these signatures at face value (it can't verify
Raven code).

## Using a bundler

Raven tries to be platform-agnostic, but unfortunately the situation with wasm
and bundlers is messy.

The most reliable way to avoid problems is to use `--embed`. This skips emitting
a wasm binary entirely, instead embedding the code into the JS output, which
will be compatible with any tooling.

```bash
$ raven build --js --embed lib.rv
$ ls lib*
lib.js lib.rv
```

Raven also provides the `--esbuild` option, as in `raven build --js --esbuild lib.rv`,
which is what's used in this template. This generates code to resolve the wasm
path, something like

```js
import wasmPath from './lib.wasm'
const wasmURL = new URL(wasmPath, import.meta.url)
```

which both makes esbuild aware of the wasm asset and lets it rewrite to the
correct final path, so long as the `--loader:.wasm=file` option is set for
esbuild.

The other esbuild option needed is `--format=esm`. Raven emits
modern ES modules (using features like top-level await) and esbuild will
complain if the format doesn't match. (Support for older CommonJS formats is
possible – [open an
issue](https://github.com/Unkindnesses/raven/issues) if you need that.)

We should be able to remove these options if and when esbuild and others [start
conforming to standards](https://github.com/WebAssembly/esm-integration). In the
meantime, it's possible for us to support other bundler patterns as needed.
[Open an issue](https://github.com/Unkindnesses/raven/issues) if you run into
problems using a bundler.

In summary the build step for this template is:

```bash
npx raven build --js --esbuild src/lib.rv
npx esbuild src/index.ts --bundle --minify --format=esm --loader:.wasm=file --outdir=dist
```

Finally, though it's optional, another useful option for `raven build` is
`--strip`. The bulk of Raven binary size is debug info, so getting rid of that
can be a good saving.

```bash
$ raven build --js lib.rv
$ l lib.wasm
-rw-r--r--@ 1 mike  staff    29K 12 Feb 21:36 lib.wasm
$ raven build --js --strip lib.rv
$ l lib.wasm
-rw-r--r--@ 1 mike  staff   2.5K 12 Feb 21:36 lib.wasm
```
