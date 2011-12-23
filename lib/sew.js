(function() {
  var Worker, argv, cs, fpath, fs, less, opti, stitch, strata, uglyjs, util;

  fs = require('fs');

  fpath = require('path');

  util = require('util');

  cs = require('coffee-script');

  less = require('less');

  stitch = require('stitch');

  strata = require('strata');

  opti = require('optimist');

  uglyjs = require('uglify-js');

  argv = opti.usage('Examples: \n  sew new\n  sew build\n  sew serve -p 8080\n\nCommands:\n  new     Create new config file, this is required\n  build   Build your project\n  watch   Wacth and rebuild your project\n  serve   Start a simple HTTP server on port 3000, watch and build your project')["default"]({
    p: 3000,
    c: false
  }).argv;

  Worker = (function() {

    Worker.prototype.configFile = 'config.json';

    Worker.prototype.watchedFiles = [];

    Worker.prototype.defaults = {
      public: 'public',
      libs: [],
      scripts: ['app'],
      scriptsOutput: 'public/js/app.js',
      styles: ['css/style.less'],
      stylesOutput: 'public/css/app.css',
      compressScripts: false,
      compressStyles: false
    };

    function Worker() {
      var action;
      action = this['_' + argv._[0]];
      if (action) {
        action.call(this);
      } else {
        this._help();
      }
    }

    Worker.prototype._new = function() {
      if (true && (!fpath.existsSync(this.configFile) || argv.force)) {
        util.log('Creating config file');
        return fs.writeFileSync(this.configFile, JSON.stringify(this.defaults, null, 2));
      } else {
        return util.log('Config file already exists use --force to override');
      }
    };

    Worker.prototype._build = function() {
      this.readConfig();
      this.compileScripts();
      return this.compileStyles();
    };

    Worker.prototype._watch = function() {
      var lib, scripts, styles, _i, _j, _k, _len, _len2, _len3, _ref, _ref2, _ref3, _results;
      this._build();
      _ref = this.options.libs;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        lib = _ref[_i];
        this.walk(lib, this.watchFile);
      }
      _ref2 = this.options.scripts;
      for (_j = 0, _len2 = _ref2.length; _j < _len2; _j++) {
        scripts = _ref2[_j];
        this.walk(scripts, this.watchFile);
      }
      _ref3 = this.options.styles;
      _results = [];
      for (_k = 0, _len3 = _ref3.length; _k < _len3; _k++) {
        styles = _ref3[_k];
        _results.push(this.walk(styles, this.watchFile));
      }
      return _results;
    };

    Worker.prototype._serve = function() {
      var app;
      this._watch();
      app = new strata.Builder;
      app.use(strata.commonLogger);
      app.use(strata.file, this.options.public, ['index.html', 'index.htm']);
      return strata.run(app, {
        port: argv.p
      });
    };

    Worker.prototype._help = function() {
      return opti.showHelp();
    };

    Worker.prototype.compileScripts = function() {
      var lib, libSources, _i, _len, _ref;
      var _this = this;
      util.log('Building scripts...');
      libSources = [];
      _ref = this.options.libs;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        lib = _ref[_i];
        if (fpath.existsSync(lib)) libSources.push(fs.readFileSync(lib));
      }
      if (!this.package) {
        this.package = stitch.createPackage({
          paths: this.options.scripts
        });
      }
      return this.package.compile(function(err, source) {
        if (!_this.options.compineScripts) {
          source = libSources.join('\n') + source;
          if (_this.options.compressScripts) {
            source = uglyjs.parser.parse(source);
            source = uglyjs.uglify.ast_mangle(source);
            source = uglyjs.uglify.ast_squeeze(source);
            source = uglyjs.uglify.gen_code(source);
          }
          return fs.writeFile(_this.options.scriptsOutput, source, function(err) {
            if (err) return util.log(err.message);
          });
        }
      });
    };

    Worker.prototype.compileStyles = function() {
      var style, styleSources, _i, _len, _ref, _results;
      var _this = this;
      util.log('Building styles...');
      if (!this.cssParser) this.cssParser = new less.Parser;
      styleSources = [];
      _ref = this.options.styles;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        style = _ref[_i];
        if (fpath.existsSync(style)) styleSources.push(fs.readFileSync(style));
        _results.push(this.cssParser.parse(styleSources.join('\n'), function(e, tree) {
          if (e) {
            util.log("LESS - " + e.name + " | " + e.message + " | " + e.extract);
          }
          return fs.writeFile(_this.options.stylesOutput, tree.toCSS({
            compress: _this.options.compressStyles
          }), function(err) {
            if (err) return util.log(err.message);
          });
        }));
      }
      return _results;
    };

    Worker.prototype.readConfig = function() {
      var config, key, value, _ref;
      if (this.options) return;
      try {
        if (fpath.existsSync(this.configFile)) {
          config = fs.readFileSync(this.configFile);
          config = JSON.parse(config);
          this.options = {};
          _ref = this.defaults;
          for (key in _ref) {
            value = _ref[key];
            this.options[key] = value;
          }
          for (key in config) {
            value = config[key];
            this.options[key] = value;
          }
          if (argv.c) this.options.compressScripts = true;
          if (argv.c) this.options.compressStyles = true;
          return true;
        }
      } catch (e) {
        util.log('Error reading config file, check syntax and try again');
      }
      opti.showHelp();
      return process.exit(1);
    };

    Worker.prototype.walk = function(path, callback) {
      var f, stats, _i, _len, _ref, _results;
      stats = fs.statSync(path);
      if (stats.isFile()) {
        if (this.isWatchable(path)) return callback.call(this, path);
      } else {
        _ref = fs.readdirSync(path);
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          f = _ref[_i];
          f = fpath.join(path, f);
          stats = fs.statSync(f);
          if (stats.isDirectory()) {
            _results.push(this.walk(f, callback));
          } else {
            if (this.isWatchable(f)) {
              _results.push(callback.call(this, f));
            } else {
              _results.push(void 0);
            }
          }
        }
        return _results;
      }
    };

    Worker.prototype.isWatchable = function(file) {
      switch (fpath.extname(file)) {
        case '.js':
        case '.coffee':
        case '.css':
        case '.less':
        case '.eco':
          return true;
      }
      return false;
    };

    Worker.prototype.watchFile = function(file) {
      var _this = this;
      return fs.watchFile(file, function(curr, prev) {
        if (curr && (curr.nlink === 0 || +curr.mtime !== +prev.mtime)) {
          switch (fpath.extname(file)) {
            case '.coffee':
            case '.eco':
            case '.js':
              return _this.compileScripts();
            case '.less':
            case '.css':
              return _this.compileStyles();
          }
        }
      });
    };

    return Worker;

  })();

  new Worker();

}).call(this);
