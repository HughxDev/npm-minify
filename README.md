<p align="center"><img src="https://raw.githubusercontent.com/hguiney/npm-minify/master/npm-minify.svg?sanitize=true" width="150" alt="logo" /></p>

<h1 align="center">npm-minify</h1>

<p align="center">Minify your packages ahead of <code>npm publish</code> to reduce dependency bloat for your users.</p>

<p align="center"><a href="https://www.npmjs.com/package/npm-minify"><img src="https://img.shields.io/npm/dm/npm-minify.svg" alt="Downloads per month (NPM)" /></a></p>

## Installation
- `npm install --global npm-minify`
- `yarn global add npm-minify`

## What it does
1. Deletes and recreates a `dist` directory in the root of your project
2. Recursively copies all the files you specify to `dist`
3. Rewrites `package.json` to remove `devDependencies` and `scripts`, then minifies it
4. Rewrites `README`, replacing a section marked `# API` with a link to your GitHub’s `README`

Npm-minify is non-destructive except for the `dist` directory.

## What it doesn’t do
Minification of JavaScript or other assets. As package authors, we should assume that end users have their own build process and not publish pre-minified assets.

## Usage
First, add a `.npmminify.js` file to the root of your project, specifying which files should be copied (or not copied) to `dist` using a glob syntax. For example:
```js
module.exports = {
  "filter": [
    "**/*.js",
    "rng/hvml.rng",
    "!**/*.test.js",
    "!jest.config.js",
    "!node_modules/**",
    "!coverage/**",
    "!dev.js",
    "!npmify.js",
  ]
};
```

Then, when you’re ready to publish:
```shell
yarn version # or npm version
npm-minify
cd dist
npm publish
```

Alternatively, you can specify the filter list as a comma-separated command-line argument:
```shell
npm-minify --filter '**/*.js,rng/hvml.rng,!**/*.test.js,!jest.config.js,!node_modules/**,!coverage/**,!dev.js,!npmify.js'
```
If you specify `filter` in both `.npmminify.js` and as a command-line argument, npm-minify will combine the two.

If you specify no `filter`, then it defaults to copying over all `.js` files, while ignoring:
- `node_modules/`
- `coverage/`
- `test/`
- `.test.js` files
- `.npm-minify.js`
- `jest.config.js`
