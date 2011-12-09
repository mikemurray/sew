
fs = require 'fs'
fpath = require 'path'
util = require 'util'
cs = require 'coffee-script'
less = require 'less'
stitch = require 'stitch'

class Worker

  options:
    config: './config.json'
    js_path: './js'
    css_path: './css'
    main_js: './js/script.coffee'
    main_css: './css/style.less'

  constructor: (path) ->
    util.log __dirname
    @path = path;
    @package = stitch.createPackage({
      paths: [ '.testfiles/js']
    })
    @compile()
    @walk(@path)
  
  readConfig: ->
    config = fs.readFileSync @options.config if fpath.extstsSync(@options.config)
    @options[key] = config[key] for key, value in @options
    

  walk: (path) ->
    for f in fs.readdirSync(path)
      f = fpath.join(path, f)
      stats = fs.statSync(f)
      if stats.isDirectory()
        @walk f
      else
        @watch(f) if @isWatchable(f) 

  isWatchable: (file) ->
    ext = fpath.extname file
    switch ext
      when '.coffee', '.less' then return true
    return false
 
  watch: (f) ->
    fs.watchFile f, (curr, prev) =>
      if curr and (curr.nlink is 0 or +curr.mtime isnt +prev.mtime)
        @compile()
  
  compile: ->
    @compileScripts()
    @compileStyles()

  compileScripts: ->
    util.log 'Building scripts...'
    @package.compile (err, source) ->
      fs.writeFile 'application.js', source, (err) ->
        util.log err if err;
        util.log 'Compiled js!!!'
  
  compileStyles: ->
    util.log 'Building styles...'
    less.render fs.readFileSync('./testfiles/css/style.less', 'utf8'), (e, css) ->
      util.log e if e
      fs.writeFile 'application.css', css, (err) ->
        util.log err if err

wkr = new Worker('./testfiles')

