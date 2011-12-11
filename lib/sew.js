(function() {
  var Worker, argv, cs, fpath, fs, less, stitch, strata, util;

  fs = require('fs');

  fpath = require('path');

  util = require('util');

  cs = require('coffee-script');

  less = require('less');

  stitch = require('stitch');

  strata = require('strata');

  argv = require("optimist").argv;

  Worker = (function() {

    Worker.prototype.configFile = './config.json';

    Worker.prototype.options = {
      public: './public',
      jsPath: './app',
      cssPath: './app/css/style.less',
      outputJs: './public/js/scripts.js',
      outputCss: './public/css/styles.css'
    };

    function Worker() {
      this.readConfig();
      this.package = stitch.createPackage({
        paths: [this.options.jsPath]
      });
      switch (argv._[0]) {
        case 'new':
          this["new"]();
          break;
        case 'build':
          this.compile();
          break;
        case 'watch':
          this.watch();
          break;
        case 'serve':
          this.serve();
      }
    }

    Worker.prototype["new"] = function() {
      if (true && (!fpath.existsSync(this.configFile) || argv.force)) {
        util.log('Creating config file');
        return fs.writeFileSync(this.configFile, JSON.stringify(this.options, null, 2));
      } else {
        return util.log('Config file already exists use --force to override');
      }
    };

    Worker.prototype.compile = function() {
      this.compileScriptsAndTemplates();
      return this.compileStyles();
    };

    Worker.prototype.watch = function() {
      var _this = this;
      this.compile();
      return this.walk(this.options.jsPath, function(file) {
        return fs.watchFile(file, function(curr, prev) {
          if (curr && (curr.nlink === 0 || +curr.mtime !== +prev.mtime)) {
            switch (fpath.extname(file)) {
              case '.coffee':
                return _this.compileScriptsAndTemplates();
              case '.less':
                return _this.compileStyles();
            }
          }
        });
      });
    };

    Worker.prototype.serve = function() {
      this.watch();
      this.app.use(strata.commonLogger);
      this.app.use(strata.static, this.options.public, ['index.html', 'index.htm']);
      return strata.run(this.app);
    };

    Worker.prototype.compileScriptsAndTemplates = function() {
      var _this = this;
      util.log('Building scripts...');
      return this.package.compile(function(err, source) {
        return fs.writeFile(_this.options.outputJs, source, function(err) {
          if (err) return util.log(err.message);
        });
      });
    };

    Worker.prototype.compileStyles = function() {
      var _this = this;
      util.log('Building styles...');
      return less.render(fs.readFileSync(this.options.cssPath, 'utf8'), function(e, css) {
        if (e) {
          util.log("LESS - " + e.name + " | " + e.message + " | " + e.extract);
        }
        return fs.writeFile(_this.options.outputCss, css, function(err) {
          if (err) return util.log(err.message);
        });
      });
    };

    Worker.prototype.readConfig = function() {
      var config, key, value;
      if (fpath.existsSync(this.configFile)) {
        config = fs.readFileSync(this.configFile);
        config = JSON.parse(config);
        for (key in config) {
          value = config[key];
          this.options[key] = value;
        }
        return this.app = new strata.Builder;
      }
    };

    Worker.prototype.walk = function(path, callback) {
      var f, stats, _i, _len, _ref, _results;
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
    };

    Worker.prototype.isWatchable = function(file) {
      switch (fpath.extname(file)) {
        case '.js':
        case '.coffee':
        case '.less':
        case '.eco':
          return true;
      }
      return false;
    };

    return Worker;

  })();

  new Worker();

}).call(this);
