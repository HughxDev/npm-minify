const fs = require( 'fs' );
const process = require( 'process' );
const copy = require( 'recursive-copy' ); // eslint-disable-line import/no-extraneous-dependencies
const rimraf = require( 'rimraf' ); // eslint-disable-line import/no-extraneous-dependencies

rimraf.sync( './dist/*' );
// fs.rmdirSync( './dist/' );

fs.readFile( './package.json', 'utf8', ( readError, packageJson ) => {
  if ( readError ) {
    console.error( readError.message );
    process.exit( 1 );
  }

  let slimPackageJson = JSON.parse( packageJson );
  const bareRepo = slimPackageJson.repository.url
    .replace( /^(git\+https|git|https):\/\//i, '' )
    .replace( /\.git$/i, '' );
  const repoHost = /github\.com/i.test( bareRepo ) ? 'GitHub' : 'repo';

  delete slimPackageJson.devDependencies;
  delete slimPackageJson.scripts;
  slimPackageJson = JSON.stringify(
    slimPackageJson,
    // null, 2
  );

  fs.writeFile( './dist/package.json', slimPackageJson, 'utf8', ( writeError ) => {
    if ( writeError ) {
      console.error( writeError.message );
      process.exit( 1 );
    }
  } );

  fs.readFile( './README.md', 'utf8', ( readmeReadError, readme ) => {
    if ( readmeReadError ) {
      console.error( readmeReadError.message );
      process.exit( 1 );
    }

    const cutoffPoint = '## API\n';

    let slimReadme = readme.substring( 0, readme.indexOf( cutoffPoint ) + cutoffPoint.length );
    slimReadme += `\nSee the [${repoHost} README](https://${bareRepo}#api) for details.`;

    fs.writeFile( './dist/README.md', slimReadme, 'utf8', ( readmeWriteError ) => {
      if ( readmeWriteError ) {
        console.error( readmeWriteError.message );
        process.exit( 1 );
      }
    } );
  } );

  copy( '.', 'dist', {
    'filter': [
      '**/*.js',
      'rng/hvml.rng',
      // 'README*',
      '!**/*.test.js',
      '!jest.config.js',
      '!node_modules/**',
      '!coverage/**',
      '!dev.js',
      '!npmify.js',
    ],
  } );
} );
