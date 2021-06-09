#!/usr/bin/env node
const fs = require( 'fs' );
const process = require( 'process' );
const copy = require( 'recursive-copy' ); // eslint-disable-line import/no-extraneous-dependencies
const rimraf = require( 'rimraf' ); // eslint-disable-line import/no-extraneous-dependencies
const makeDir = require('make-dir');

const [,, ...args] = process.argv;

let config = {};
try {
  config = require( `${process.cwd()}/.npm-minify.js` );
} catch ( missingConfigError ) {}

let filter;
let filterIndex = args.indexOf( '--filter' );

if ( filterIndex === -1 ) {
  filterIndex = args.indexOf( '-f' );
}

if ( filterIndex !== -1 ) {
  filter = args[++filterIndex];

  if ( filter && filter.length ) {
    config.filter = [
      ...config.filter,
      ...filter.split( ',' )
    ];
  }
}

if ( !config.filter ) {
  config.filter = [
    '**/*.js',
    '!**/*.test.js',
    '!.npm-minify.js',
    '!jest.config.js',
    '!node_modules/**',
    '!coverage/**',
    '!test/**',
  ];
}

let bareRepo = '';
let repoHost = 'repo';

let readmeFilenames = [
  'README',
  'README.md',
  'README.txt',
];
let readmeFilename = '';

function readmeReadCallback( readme ) {
  const cutoffPoint = '# API\n';
  let cutoffPointPosition = readme.indexOf( cutoffPoint );
  let slimReadme;

  if ( cutoffPointPosition !== -1 ) {
    slimReadme = readme.substring( 0, cutoffPointPosition + cutoffPoint.length );
    slimReadme += `\nSee the [${repoHost} README](https://${bareRepo}#api) for details.`;
  }

  fs.writeFile(
    `./dist/${readmeFilename}`,
    ( slimReadme || readme ),
    'utf8',
    ( readmeWriteError ) => {
      if ( readmeWriteError ) {
        console.error( readmeWriteError.message );
        process.exit( 1 );
      }
    }
  );
}

rimraf.sync( './dist/*' );
// fs.rmdirSync( './dist/' );

fs.readFile( './package.json', 'utf8', ( readError, packageJson ) => {
  if ( readError ) {
    console.error( readError.message );
    process.exit( 1 );
  }

  let slimPackageJson = JSON.parse( packageJson );
  if ( slimPackageJson.repository ) {
    let repo = slimPackageJson.repository.url;

    if ( typeof slimPackageJson.repository === 'string' ) {
      repo = slimPackageJson.repository;
    }

    bareRepo = repo
      .replace( /^(git\+https|git|https):\/\//i, '' )
      .replace( /\.git$/i, '' )
      .replace( /git@github\.com:/, 'github.com/' )

    if ( /github\.com/i.test( bareRepo ) ) {
      repoHost = 'GitHub';
    }
  }

  delete slimPackageJson.devDependencies;
  delete slimPackageJson.scripts;
  slimPackageJson = JSON.stringify(
    slimPackageJson,
    // null, 2
  );

  makeDir.sync( './dist/' );

  fs.writeFile( './dist/package.json', slimPackageJson, 'utf8', ( writeError ) => {
    if ( writeError ) {
      console.error( writeError.message );
      process.exit( 1 );
    }
  } );

  for ( let i = 0; i < readmeFilenames.length; i++ ) {
    let readmeContents;
    let forwardedError;

    try {
      readmeFilename = readmeFilenames[i];
      readmeContents = fs.readFileSync( `./${readmeFilename}`, { "encoding": "utf8" } );
    } catch ( readError ) {
      forwardedError = readError;
    }

    if ( readmeContents ) {
      readmeReadCallback( readmeContents );
      break;
    }
  } // for

  copy( '.', 'dist', {
    "filter": config.filter,
  } );
} );
