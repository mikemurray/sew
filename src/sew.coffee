
fs = require 'fs'
fpath = require 'path'
util = require 'util'
cs = require 'coffee-script'
less = require 'less'
stitch = require 'stitch'
strata = require 'strata'
argv = require("optimist").argv

class Worker
  
  configFile: './config.json'
  options:
    public: './public'
    jsPath: './app'
    cssPath: './app/css/style.less'
    outputJs: './public/js/scripts.js'
    outputCss: './public/css/styles.css'

  constructor: ->
    @readConfig()
    @package = stitch.createPackage { paths: [@options.jsPath] }

    switch argv._[0]
      when 'new' then @new()
      when 'build' then @compile()
      when 'watch' then @watch()
      when 'serve' then @serve()

  # Actions
  new: ->
    if true and (!fpath.existsSync(@configFile) or argv.force)
      util.log 'Creating config file'
      fs.writeFileSync @configFile, JSON.stringify(@options, null, 2)
    else
      util.log 'Config file already exists use --force to override'

  compile: ->
    @compileScriptsAndTemplates()
    @compileStyles()

  watch: ->
    @compile()
    @walk @options.jsPath, (file) =>
      fs.watchFile file, (curr, prev) =>
        if curr and (curr.nlink is 0 or +curr.mtime isnt +prev.mtime)
          switch fpath.extname file
            when '.coffee' then @compileScriptsAndTemplates()
            when '.less' then @compileStyles()

  serve: ->
    @watch()
    @app.use strata.commonLogger
    @app.use strata.static, @options.public, ['index.html', 'index.htm']
    strata.run(@app)
  
  # Compilers
  compileScriptsAndTemplates: ->
    util.log 'Building scripts...'
    @package.compile (err, source) =>
      fs.writeFile @options.outputJs, source, (err) ->
        util.log err.message if err
  
  compileStyles: ->
    util.log 'Building styles...'
    less.render fs.readFileSync(@options.cssPath, 'utf8'), (e, css) =>
      util.log "LESS - #{e.name} | #{e.message} | #{e.extract}" if e
      fs.writeFile @options.outputCss, css, (err) ->
        util.log err.message if err
  
  # Utiliity
  readConfig: ->
    if fpath.existsSync @configFile
      config = fs.readFileSync @configFile
      config = JSON.parse config
      @options[key] = value for key, value of config
      @app = new strata.Builder

  walk: (path, callback) ->
    for f in fs.readdirSync(path)
      f = fpath.join(path, f)
      stats = fs.statSync(f)
      if stats.isDirectory()
        @walk f, callback
      else
        callback.call(@, f) if @isWatchable(f)

  isWatchable: (file) ->
    switch fpath.extname file 
      when '.js', '.coffee', '.less', '.eco' then return true
    false
 
new Worker()
