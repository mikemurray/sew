
fs = require 'fs'
fpath = require 'path'
util = require 'util'
cs = require 'coffee-script'
less = require 'less'
stitch = require 'stitch'
strata = require 'strata'
opti = require "optimist"
  
argv = opti.usage('''
  Examples: 
    sew new
    sew build
    sew serve -p 8080
  
  Commands:
    new     Create new config file, this is required
    build   Build your project
    watch   Wacth and rebuild your project
    serve   Start a simple HTTP server on port 3000, watch and build your project
    ''')
.default({p: 3000})
.argv

class Worker
  
  configFile: 'config.json'
  defaults:
    public: 'public'
    scripts: 'app'
    scriptsOutput: 'public/js/app.js'
    styles: 'css/style.less'
    stylesOutput: 'public/css/app.css'

  constructor: ->
    action = @['_' + argv._[0]]
    if action then action.call(@) else @_help()

  # Actions
  _new: ->
    if true and (!fpath.existsSync(@configFile) or argv.force)
      util.log 'Creating config file'
      fs.writeFileSync @configFile, JSON.stringify(@defaults, null, 2)
    else
      util.log 'Config file already exists use --force to override'

  _build: ->
    @readConfig()
    @compileScripts()
    @compileStyles()

  _watch: ->
    @_build()
    @walk './', (file) =>
      fs.watchFile file, (curr, prev) =>
        if curr and (curr.nlink is 0 or +curr.mtime isnt +prev.mtime)
          switch fpath.extname file
            when '.coffee', '.eco' then @compileScripts()
            when '.less' then @compileStyles()

  _serve: ->
    @_watch()
    app = new strata.Builder
    app.use strata.commonLogger
    app.use strata.static, @options.public, ['index.html', 'index.htm']
    strata.run app, { port: argv.p }

  _help: ->
    opti.showHelp()

  # Compilers
  compileScripts: ->
    util.log 'Building scripts...'
    @package = stitch.createPackage { paths: [@options.scripts] } if not @package
    @package.compile (err, source) =>
      fs.writeFile @options.scriptsOutput, source, (err) ->
        util.log err.message if err
  
  compileStyles: ->
    util.log 'Building styles...'
    if fpath.existsSync @options.styles
      less.render fs.readFileSync(@options.styles, 'utf8'), (e, css) =>
        util.log "LESS - #{e.name} | #{e.message} | #{e.extract}" if e
        fs.writeFile @options.stylesOutput, css, (err) ->
          util.log err.message if err
  
  # Utiliity
  readConfig: ->
    return if @options
    if fpath.existsSync @configFile
      config = fs.readFileSync @configFile
      config = JSON.parse config
      @options = {}
      @options[key] = value for key, value of @defaults
      @options[key] = value for key, value of config
      return true
    process.exit(1)

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
