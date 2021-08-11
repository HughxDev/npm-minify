#!/usr/bin/env node
const fs = require( 'fs' );
const process = require( 'process' );
const copy = require( 'recursive-copy' ); // eslint-disable-line import/no-extraneous-dependencies
const rimraf = require( 'rimraf' ); // eslint-disable-line import/no-extraneous-dependencies
const makeDir = require('make-dir');

const [,, ...args] = process.argv;

let verbose = false;
let verboseIndex = args.indexOf( '--verbose' );

if ( verboseIndex === -1 ) {
  verboseIndex = args.indexOf( '-v' );
}

if ( verboseIndex !== -1 ) {
  verbose = true;
}

if ( verbose ) {
  console.log( `Verbose logging active.\n` );
}

let config = {};
try {
  config = require( `${process.cwd()}/.npm-minify.js` );

  if ( verbose ) {
    console.log( `Project-level config found @ ${process.cwd()}/.npm-minify.js:` );
    console.log( `${JSON.stringify( config, null, 2 )}\n` );
  }
} catch ( missingConfigError ) {
  if ( verbose ) {
    console.log( `Project-level config not found @ ${process.cwd()}/.npm-minify.js.\n` );
  }
}

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
    '!.eslintrc.js',
    '!.eslintrc.cjs',
    '!.eslintrc.json',
    '!.eslintrc.yaml',
    '!.eslintrc.yml',
    '!.npm-minify.js',
    '!jest.config.js',
    '!node_modules/**',
    '!coverage/**',
    '!test/**',
  ];
}

if ( verbose ) {
  console.log( `Compiled config:` );
  console.log( `${JSON.stringify( config, null, 2 )}\n` );
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

      if ( verbose ) {
        console.log( `Wrote README to ${process.cwd()}/dist/${readmeFilename}.\n` );
      }
    }
  );
}

try {
  rimraf.sync( './dist/*' );
  // fs.rmdirSync( './dist/' );

  if ( verbose ) {
    console.log( `Deleted ${process.cwd()}/dist/*.\n` );
  }
} catch ( deletionError ) {
  console.error( deletionError );
  process.exit( 1 );
}

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

  try {
    makeDir.sync( './dist/' );

    if ( verbose ) {
      console.log( `Recreated ${process.cwd()}/dist/.\n` );
    }
  } catch ( creationError ) {
    console.error( creationError );
    process.exit( 1 );
  }

  fs.writeFile( './dist/package.json', slimPackageJson, 'utf8', ( writeError ) => {
    if ( writeError ) {
      console.error( writeError.message );
      process.exit( 1 );
    }

    if ( verbose ) {
      console.log( `Wrote slim package.json to ${process.cwd()}/dist/package.json:` );
      console.log( `${slimPackageJson}\n` );
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

  copy(
    '.',
    'dist',
    {
      "overwrite": true,
      "filter": config.filter,
      "dot": true,
    }
  )
  .then( ( results ) => {
    if ( verbose ) {
  		console.log( `${results.length} file(s) copied to ${process.cwd()}/dist/:` );
      console.log( `- ${results.map( ( result ) => `${result.src}` ).join( `\n- ` )}` );
    }
	} )
} );
