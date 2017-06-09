
const uglify = require('gulp-uglify');
const htmlmin = require('gulp-htmlmin');
const buffer = require('vinyl-buffer');
const bootstrap = require('bootstrap-styl');
// const source = require('vinyl-source-stream');

// const fs = require('fs');
const del = require('del');
// const path = require('path');
const combine = require('stream-combiner2').obj;

const gulp = require('gulp');
const rev = require('gulp-rev');
const gulpIf = require('gulp-if');
const notify = require('gulp-notify');
const concat = require('gulp-concat');
const stylus = require('gulp-stylus');
const plumber = require('gulp-plumber');
const cssnano = require('gulp-cssnano');
const sourcemaps = require('gulp-sourcemaps');
// const svgSprite = require('gulp-svg-sprites');
const revReplace = require('gulp-rev-replace');
const autoprefixer = require('gulp-autoprefixer');
const resolver = require('stylus').resolver;
const browserSync = require('browser-sync').create();

const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';

const dirs = {
  images: './src/assets/images/',
  fonts: './src/assets/fonts/',
  assets: './src/assets/',

  stylesheets: './src/stylesheets/',
  styleroot: './src/stylesheets/main.styl',

  application: './src/app.js',
  libs: './src/libs/',
  manifest: './manifest/',
  public: './public/',
  tmp: './tmp/',
};

console.log(module.exports);

const config = {
  prefix: { browsers: ['last 2 version'] },
  htmlmin: { collapseWhitespace: true },
  clean: [dirs.public, dirs.tmp, dirs.manifest],
  browserSync: { server: { baseDir: dirs.public } },
  pug: { pretty: true },
  stylus: { use: bootstrap(),
    'include css': true,
    define: {
      url: resolver(),
    },
  },
  plumb: {
    errorHandler: notify.onError(
    err => ({
      title: 'styles',
      message: err.message,
    })
  ) },
};

// Сборка Stylus стилей
gulp.task('styles', function () {
  return gulp.src(dirs.styleroot)
        .pipe(plumber(config.plumb))
        .pipe(gulpIf(isDevelopment, sourcemaps.init()))
        .pipe(stylus(config.stylus))
        .pipe(autoprefixer(config.prefix))
        .pipe(gulpIf(isDevelopment, sourcemaps.write()))
        .on('data', function(file) {
          file.stem = 'styles';
        })
        .pipe(gulpIf(!isDevelopment, cssnano()))
        .pipe(gulp.dest(dirs.public + '/css/'))
});

// Сборка статики
gulp.task('assets:html', function () {
  return gulp.src(`${dirs.assets}**/*.html`, { since: gulp.lastRun('assets:html') })
        .pipe(gulpIf(!isDevelopment,
          combine(
            revReplace(config.revReplace),
            htmlmin(config.htmlmin)
          )))
        .pipe(gulp.dest(dirs.public));
});

// Оптимизация изображений
gulp.task('assets:svg', function () {
  return gulp.src(dirs.images+'**/*.svg')
        .on('data', function (file) {
          file.path = file.base + 'image/' +file.basename;
        })
        .pipe(gulp.dest(dirs.public));
});

// Оптимизация изображений
gulp.task('assets:png', function () {
  return gulp.src(dirs.images+'**/*.{png,jpg,gif}')
        .on('data', function (file) {
          file.path = file.base + 'image/' + file.basename;
        })
        .pipe(gulp.dest(dirs.public));
});

// fonts
gulp.task('assets:fonts', function () {
  return gulp.src(`${dirs.fonts}*.*`)
        .on('data', function (file) {
          file.path = `${file.base}fonts/${file.basename}`;
        })
        .pipe(gulp.dest(dirs.public));
});

gulp.task('clean', function() {
  return del(config.clean);
});

// Поднятие сервера
gulp.task('serve', function (){
  browserSync.init(config.browserSync);
  console.log('server initialization start...');
  browserSync.watch(`${dirs.public}**/*.*`).on('change', browserSync.reload);
});


// Отслеживание изменений в файлах
gulp.task('watch', function() {
  gulp.watch(dirs.stylesheets, gulp.series('styles'));
  gulp.watch(dirs.application, gulp.series('bundle'));
  gulp.watch(`${dirs.fonts}*.*`, gulp.series('assets:fonts'));
  gulp.watch(`${dirs.assets}**/*.html`, gulp.series('assets:html'));
  gulp.watch(`${dirs.images}**/*.*`, gulp.series('assets:svg', 'assets:png'));
});


// Сборка Commonjs (via node) и скриптов
gulp.task('bundle', function () {
  return gulp.src([`${dirs.libs}/*.js`, dirs.application])
        .pipe(concat('bundle.js'))
        .pipe(gulpIf(!isDevelopment, combine(buffer(), uglify())))
        .pipe(gulp.dest(dirs.public + '/js/'));
});

gulp.task('build',
  gulp.series('clean', 'assets:html', 'assets:svg', 'assets:png', 'assets:fonts', 'styles', 'bundle')
);

gulp.task('re:bundle',
  gulp.series('bundle', 'watch')
);

gulp.task('dev',
    gulp.series('build', 'watch')
);
