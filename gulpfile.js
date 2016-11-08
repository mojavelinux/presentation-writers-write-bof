'use strict';

const pkg = require('./package.json');
const autoprefixer = require('gulp-autoprefixer');
const browserify = require('browserify');
const buffer = require('vinyl-buffer');
const connect = require('gulp-connect');
const csso = require('gulp-csso');
const del = require('del');
const exec = require('gulp-exec');
const ghpages = require('gh-pages');
const gulp = require('gulp');
const gutil = require('gulp-util');
const path = require('path');
const plumber = require('gulp-plumber');
const rename = require('gulp-rename');
const source = require('vinyl-source-stream');
const stylus = require('gulp-stylus');
const through = require('through');
const uglify = require('gulp-uglify');
const isDist = process.argv.indexOf('serve') === -1;
const browserifyPlumber = function (e) {
  if (isDist) throw e;
  gutil.log(e.stack);
  this.emit('end');
};
const fs = require('fs');
const execProcess = require('child_process').exec;

gulp.task('js', ['clean:js'], function () {
  // see https://wehavefaces.net/gulp-browserify-the-gulp-y-way-bb359b3f9623
  return browserify('src/scripts/main.js').bundle()
    .on('error', browserifyPlumber)
    .pipe(source('src/scripts/main.js'))
    .pipe(buffer())
    //.pipe(isDist ? uglify() : through())
    .pipe(rename('build.js'))
    .pipe(gulp.dest('dist/build'))
    .pipe(connect.reload());
});

gulp.task('html', ['clean:html'], function () {
  return gulp.src('src/index.adoc')
    .pipe(isDist ? through() : plumber())
    .pipe(exec('bundle exec asciidoctor-bespoke -o - src/index.adoc', { pipeStdout: true, maxBuffer: 1e10 }))
    .pipe(exec.reporter({ stdout: false }))
    .pipe(rename('index.html'))
    .pipe(gulp.dest('dist'))
    .pipe(connect.reload());
});

gulp.task('css', ['clean:css'], function () {
  return gulp.src('src/styles/main.styl')
    .pipe(isDist ? through() : plumber())
    .pipe(stylus({ 'include css': true, paths: ['./node_modules'] }))
    .pipe(autoprefixer({ browsers: ['last 2 versions'], cascade: false }))
    .pipe(isDist ? csso() : through())
    .pipe(rename('build.css'))
    .pipe(gulp.dest('dist/build'))
    .pipe(connect.reload());
});

gulp.task('images', ['clean:images'], function () {
  return gulp.src('src/media/images/**/*')
    .pipe(gulp.dest('dist/media/images'))
    .pipe(connect.reload());
});

gulp.task('fonts', function () {
  return gulp.src('src/media/fonts/*')
    .pipe(gulp.dest('dist/media/fonts'))
    .pipe(connect.reload());
});

gulp.task('clean', function () {
  return del('dist');
});

gulp.task('clean:html', function () {
  return del('dist/index.html');
});

gulp.task('clean:js', function () {
  return del('dist/build/build.js');
});

gulp.task('clean:css', function () {
  return del('dist/build/build.css');
});

gulp.task('clean:images', function () {
  return del('dist/media/images');
});

gulp.task('connect', ['build'], function () {
  connect.server({ root: 'dist', port: 8080, livereload: true });
});

gulp.task('watch', function () {
  gulp.watch('src/**/*.adoc', ['html']);
  gulp.watch('src/scripts/**/*.js', ['js']);
  gulp.watch('src/styles/**/*.styl', ['css']);
  gulp.watch('src/images/**/*', ['images']);
});

gulp.task('publish', ['clean', 'build'], function (done) {
  ghpages.publish(path.join(__dirname, 'dist'), { logger: gutil.log }, done);
});

gulp.task('build', ['js', 'html', 'css', 'images', 'fonts']);

gulp.task('serve', ['connect', 'watch']);

gulp.task('default', ['build']);
