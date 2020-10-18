const mix = require('laravel-mix');

/*
|--------------------------------------------------------------------------
| Mix Asset Management
|--------------------------------------------------------------------------
|
| Mix provides a clean, fluent API for defining some Webpack build steps
| for your Laravel application. By default, we are compiling the Sass
| file for the application as well as bundling up all the JS files.
|
*/

mix.options({
    processCssUrls: false
}).sass('source/scss/style.scss', 'dist/style.min.css');
 
mix.combine([
    'source/js/classes/*',
    'source/js/components/*',
    'source/js/misc/*',
    'source/js/vendors/*'
], 'dist/app.js');