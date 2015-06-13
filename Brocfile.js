const concat = require('broccoli-concat');
const mergeTrees = require('broccoli-merge-trees');
const esTranspiler = require('broccoli-babel-transpiler');
const pkg = require('./package.json');
const uglify = require('broccoli-uglify-js');
const umd = require('broccoli-umd');
const sourceMap = require('broccoli-source-map');
const src = 'src';



const js = esTranspiler(src, {
  stage: 0,
  moduleIds: true,
  modules: 'umd',
  sourceMap: 'inline',

  // Transforms /index.js files to use their containing directory name
  getModuleId: function (name) { 
    name = pkg.name + '/' + name;
    return name.replace(/\/index$/, '');
  },

  // Fix relative imports inside /index's
  resolveModuleSource: function (source, filename) {
    var match = filename.match(/(.+)\/index\.\S+$/i);

    // is this an import inside an /index file?
    if (match) {
      var path = match[1];
      return source
        .replace(/^\.\//, path + '/')
        .replace(/^\.\.\//, '');
    } else {
      return source;
    }
  }
});

const combined = concat(js, {
  inputFiles: [
    '**/*.js'
  ],
  outputFile: '/' + pkg.name + '.js'
});

const main = sourceMap.extract(combined);

const minified = concat(uglify(combined), {
  inputFiles: [
    pkg.name + '.js'
  ],
  outputFile: '/' + pkg.name + '.min.js'
});

module.exports = mergeTrees([main, minified]);
