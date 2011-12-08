
fs = require 'fs'
fpath = require 'path'
util = require 'util'
cs = require 'coffee-script'
less = require 'less'
stitch = require 'stitch'

util.log 'test'

class Worker

  data:
    scripts: []
    styles: []

  options:
    config: 'config.json'
    js_path: './js'
    css_path: './css'
    main_js: './js/script.coffee'
    main_css: './css/style.less'

  constructor: (path) ->
    @path = path;
    @package = stitch.createPackage({
      paths: [ './testfiles/lib', './testfiles/js']
    })
    @compile()

  walk: (path) ->
    for f in fs.readdirSync(path)
      f = fpath.join(path, f)
      stats = fs.statSync(f)
      if stats.isDirectory()
        @walk f
      else
        @filterFile f

  filterFile: (file) ->
    ext = fpath.extname file
    switch ext
      when '.coffee' then @data.scripts.push file
      when '.less' then @data.styles.push file

  watchFiles: ->
    for f in @data.scripts
      util.log f
      fs.watchFile f, (curr, prev) =>
        util.log curr.mtime + '  ' + prev.mtime
        @compile()
  
  compile: ->
    util.log 'Something updated'
    
    @package.compile (err, source) ->
      fs.writeFile 'application.js', source, (err) ->
        util.log err if err;
        util.log 'Compiled js!!!'
    
    less.render fs.readFileSync('./testfiles/css/style.less', 'utf8'), (e, css) ->
      util.log e if e
      fs.writeFile 'application.css', css, (err) ->
        util.log err if err
    

  compileScripts: ->
    compiledScripts = []
    for s in @data.scripts
      compiledScripts.push cs.compile(fs.readFileSync(s, 'utf8'))
    compiledScripts.join('\n') 


wkr = new Worker('./testfiles')

wkr.walk('./testfiles')
#util.log(util.inspect(wkr.data))
#wkr.watchFiles(

wkr.watchFiles()
