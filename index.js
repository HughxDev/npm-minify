#!/usr/bin/env node
const fs = require( 'fs' );
const process = require( 'process' );
const copy = require( 'recursive-copy' ); // eslint-disable-line import/no-extraneous-dependencies
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
    config.filter.push( ...filter.split( ',' ) );
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

let inDir = '.';
let inDirIndex = args.indexOf( '--in' );

if ( inDirIndex === -1 ) {
  inDirIndex = args.indexOf( '-i' );
}

if ( inDirIndex !== -1 ) {
  inDir = args[++inDirIndex];
}

if ( inDir !== '.' ) {
  while ( inDir[inDir.length - 1] === '/' ) {
    inDir = inDir.slice( 0, -1 );
  }

  config.filter.push( `!${inDir}/**` );
}

let outDir = 'dist';
let outDirIndex = args.indexOf( '--out' );

if ( outDirIndex === -1 ) {
  outDirIndex = args.indexOf( '-o' );
}

if ( outDirIndex !== -1 ) {
  outDir = args[++outDirIndex];
}

if ( outDir !== 'dist' ) {
  while ( outDir[outDir.length - 1] === '/' ) {
    outDir = outDir.slice( 0, -1 );
  }
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
    `${outDir}/${readmeFilename}`,
    ( slimReadme || readme ),
    'utf8',
    ( readmeWriteError ) => {
      if ( readmeWriteError ) {
        console.error( readmeWriteError.message );
        process.exit( 1 );
      }

      if ( verbose ) {
        console.log( `Wrote README to ${outDir}/${readmeFilename}.\n` );
      }
    }
  );
}

try {
  fs.rmSync( `${outDir}`, { recursive: true, force: true } );

  if ( verbose ) {
    console.log( `Deleted ${outDir}/*.\n` );
  }
} catch ( deletionError ) {
  console.error( deletionError );
  process.exit( 1 );
}

fs.readFile( `${inDir}/package.json`, 'utf8', ( readError, packageJson ) => {
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
    makeDir.sync( outDir );

    if ( verbose ) {
      console.log( `Recreated ${outDir}/.\n` );
    }
  } catch ( creationError ) {
    console.error( creationError );
    process.exit( 1 );
  }

  fs.writeFile( `${outDir}/package.json`, slimPackageJson, 'utf8', ( writeError ) => {
    if ( writeError ) {
      console.error( writeError.message );
      process.exit( 1 );
    }

    if ( verbose ) {
      console.log( `Wrote slim package.json to ${outDir}/package.json:` );
      console.log( `${slimPackageJson}\n` );
    }
  } );

  for ( let i = 0; i < readmeFilenames.length; i++ ) {
    let readmeContents;
    let forwardedError;

    try {
      readmeFilename = readmeFilenames[i];
      readmeContents = fs.readFileSync( `${inDir}/${readmeFilename}`, { "encoding": "utf8" } );
    } catch ( readError ) {
      forwardedError = readError;
    }

    if ( readmeContents ) {
      readmeReadCallback( readmeContents );
      break;
    }
  } // for

  const copyOptions = {
    "overwrite": true,
    "filter": config.filter,
    "dot": true,
  };

  // @ts-ignore - Bad type
  copy(
    inDir,
    outDir,
    copyOptions
  )
  .then( ( results ) => {
    if ( verbose ) {
  		console.log( `${results.length} file(s) copied to ${outDir}/:` );
      console.log( `- ${results.map( ( result ) => `${result.src}` ).join( `\n- ` )}` );
    }
	} )
  .catch( ( error ) => {
    console.error( error );
    process.exit( 1 );
  } )
} );
