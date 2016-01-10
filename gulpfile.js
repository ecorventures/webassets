'use strict'

// require('localenvironment')
require('colors')

const gulp = require('gulp')
const concat = require('gulp-concat')
const uglify = require('uglify-js')
const header = require('gulp-header')
const svgmin = require('gulp-svgmin')
const wrench = require('wrench')
const CloudFlareAPI = require('cloudflare4')
const del = require('del')
const fs = require('fs')
const path = require('path')
const pkg = require('./package.json')
const headerComment = '/**\n  * v' + pkg.version + ' generated on: ' + (new Date()) + '\n  * Copyright (c) 2014-' + (new Date()).getFullYear() + ', Ecor Ventures LLC. All Rights Reserved.\n  */\n'

const DIR = {
  source: path.resolve('./assets'),
  dist: path.resolve('./dist')
}

// Build a release
// gulp.task('build', ['version', 'clean', 'copy'])
gulp.task('build', ['clean', 'copy', 'purgecache'])

// Check versions for Bower & npm
// gulp.task('version', function (next) {
//   console.log('Checking versions.')
//
//   // Sync Bower
//   var bower = require('./bower.json')
//   if (bower.version !== pkg.version) {
//     console.log('Updating bower package.')
//     bower.version = pkg.version
//     fs.writeFileSync(path.resolve('./bower.json'), JSON.stringify(bower, null, 2))
//   }
// })

// Create a clean build
gulp.task('clean', function (next) {
  console.log('Cleaning distribution.')
  if (fs.existsSync(DIR.dist)) {
    del.sync(DIR.dist)
  }
  fs.mkdirSync(DIR.dist)
  next()
})

var md = function (pth) {
  if (!fs.existsSync(pth)) {
    if (fs.existsSync(path.join(pth, '..'))) {
      // Parent dir exists, create the directory
      console.log('Making'.green, pth.green)
      fs.mkdirSync(pth)
    } else {
      // Parent dir doesn't exist, create it first
      md(path.join(pth, '..'))
      md(pth)
    }
  }
}

gulp.task('copy', function () {
  console.log('Copying distribution files to ', DIR.dist)

  // Build JS
  console.log('\nProducing JavaScript:'.cyan.bold.underline)
  let jslibs = wrench.readdirSyncRecursive(path.join(DIR.source, 'lib')).filter(function (fp) {
    return !fs.statSync(path.join(DIR.source, 'lib', fp)).isDirectory()
  }).map(function (fp) {
    return path.join(DIR.source, 'lib', fp)
  })

  jslibs.forEach(function (file, index) {
    let pth = file.replace(DIR.source, DIR.dist)
    md(path.dirname(pth))
    let content = uglify.minify(file, {
      mangle: true,
      compress: {
        warnings: true
      }
    }).code
    fs.writeFileSync(pth, headerComment + content)
  })
  console.log('JS optimization complete.'.green)

  // Compress SVG's
  console.log('\nProducing SVG icons:'.cyan.bold.underline)
  let svgs = wrench.readdirSyncRecursive(path.join(DIR.source, 'icons')).filter(function (fp) {
    return path.extname(fp) === '.svg'
  }).map(function (fp) {
    return path.join(DIR.source, 'icons', fp)
  })
  svgs.forEach(function (file) {
    let pth = file.replace(DIR.source, DIR.dist)
    md(path.dirname(pth))
    gulp.src(file)
      .pipe(svgmin().on('error', function (err) {
        console.log(file.toString().red.bold)
        console.log(err.message)
        this.emit('end')
      }))
      .pipe(gulp.dest(path.dirname(pth)))
  })
  console.log('SVG icon optimization complete.'.green)

  // Copy everything else
  console.log('\nCopying everything else:'.cyan.bold.underline)
  fs.readdirSync(DIR.source).filter(function (dir) {
    return ['lib', 'icons'].indexOf(dir.toLowerCase()) < 0
  }).forEach(function (dir) {
    wrench.copyDirSyncRecursive(path.join(DIR.source, dir), path.join(DIR.dist, dir), {
      forceDelete: true, // Whether to overwrite existing directory or not
      excludeHiddenUnix: false, // Whether to copy hidden Unix files or not (preceding .)
      preserveFiles: false, // If we're overwriting something and the file already exists, keep the existing
      preserveTimestamps: true, // Preserve the mtime and atime when copying files
      inflateSymlinks: true // Whether to follow symlinks or not when copying files
    })
    console.log('Copy complete.\n'.green)
  })
})

gulp.task('purgecache', function () {
  // Clear CloudFlare cache
  if (process.env.CLOUDFLARE_EMAIL && process.env.CLOUDFLARE_API_KEY) {
    console.log('Clearing CloudFlare cache...'.cyan.underline)
    let cf = new CloudFlareAPI({
      email: process.env.CLOUDFLARE_EMAIL,
      key: process.env.CLOUDFLARE_API_KEY
    })
    cf.zoneGetAll({
      name: 'ecor.biz'
    }).then(function (zone) {
      cf.zonePurgeCache(zone[0].id).then(function () {
        console.log('Cache purged.'.green.bold + '\n')
      })
    })
  }
})

gulp.task('optimize', function () {
  return gulp.src(path.join(DIR.dist, 'chassis.min.js'))
  .pipe(uglify({
    compress: {
      warnings: true
    }
  }))
  .pipe(gulp.dest(DIR.dist))
})
