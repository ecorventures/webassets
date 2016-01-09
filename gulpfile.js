'use strict'

/**
 * TODO:
 *  - Add a clean build task
 *  - Monitor removed files and strip from production.
 *  - Setup remote deployment (production)
 */
require('colors')
const gulp = require('gulp')
const concat = require('gulp-concat')
const uglify = require('uglify-js')
const header = require('gulp-header')
const svgmin = require('gulp-svgmin')
const wrench = require('wrench')
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
gulp.task('build', ['clean', 'copy'])

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

gulp.task('copy', function () {
  console.log('Copying distribution files to ', DIR.dist)

  // Build JS
  console.log('Producing JavaScript...')
  let jslibs = wrench.readdirSyncRecursive(path.join(DIR.source, 'lib')).map(function (fp) {
    return path.join(DIR.source, 'lib', fp)
  })

  jslibs.forEach(function (file, index) {
    let pth = file.replace(DIR.source, DIR.dist)
    if (!fs.existsSync(path.dirname(pth))) {
      fs.mkdirSync(path.dirname(pth))
    }
    fs.writeFileSync(pth, headerComment + uglify.minify(file, {
      mangle: true,
      compress: {
        warnings: true
      }
    }).code)
  })

  // Compress SVG's
  console.log('Producing SVG icons...')
  let svgs = wrench.readdirSyncRecursive(path.join(DIR.source, 'icons')).filter(function (fp) {
    return path.extname(fp) === '.svg'
  }).map(function (fp) {
    return path.join(DIR.source, 'icons', fp)
  })
  svgs.forEach(function (file) {
    let pth = file.replace(DIR.source, DIR.dist)
    if (!fs.existsSync(path.dirname(pth))) {
      fs.mkdirSync(path.dirname(pth))
    }
    gulp.src(file)
      .pipe(svgmin().on('error', function (err) {
        console.log(file.toString().red.bold)
        console.log(err.message)
        this.emit('end')
      }))
      .pipe(gulp.dest(path.dirname(pth)))
  })

  // Copy everything else
  console.log('Copying everything else...')
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
  })

  // console.log(svgs)
  // Minify each individual file
  // sources.forEach(function (file, index) {
  //   gulp.src(file)
  //   .pipe(concat(files[index].replace(/\//gi,'.') + '.min.js'))
  //   .pipe(uglify({
  //     mangle: true,
  //     compress: {
  //       warnings: true
  //     }
  //   }))
  //   .pipe(header(headerComment))
  //   .pipe(gulp.dest(DIR.dist))
  // })

  // Generate full project
  // gulp.src(sources)
  // .pipe(concat('chassis.dev.js'))
  // .pipe(header(headerComment))
  // .pipe(gulp.dest(DIR.dist))
  //
  // gulp.src(sources.slice(0,6))
  // .pipe(concat('chassis.slim.min.js'))
  // .pipe(uglify({
  //   mangle: true,
  //   compress: {
  //     warnings: true
  //   }
  // }))
  // .pipe(header(headerComment))
  // .pipe(gulp.dest(DIR.dist))
  //
  // return gulp.src(sources)
  // .pipe(concat('chassis.min.js'))
  // .pipe(uglify({
  //   mangle: true,
  //   compress: {
  //     warnings: true
  //   }
  // }))
  // .pipe(header(headerComment))
  // .pipe(gulp.dest(DIR.dist))
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
