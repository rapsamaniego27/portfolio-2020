// This filename is retained; the configuration now uses Webpack directly.
const fs = require('node:fs/promises');
const path = require('node:path');
const vm = require('node:vm');
const { fileURLToPath } = require('node:url');
const sass = require('sass');
const postcss = require('postcss');
const autoprefixer = require('autoprefixer');
const cssnano = require('cssnano');
const terser = require('terser');

// Preserve classic script scope: classes share names across files, and the
// diary's inline search script reads the constants declared in dist/search.js.
class PortfolioAssetsPlugin {
    apply(compiler) {
        const name = 'PortfolioAssetsPlugin';
        const { Compilation, sources } = compiler.webpack;
        compiler.hooks.thisCompilation.tap(name, compilation => {
            const build = async () => {
                const production = compiler.options.mode === 'production';
                const resolve = relative => path.resolve(compiler.context, relative);
                const emit = (filename, contents, minimized = false) => {
                    compilation.emitAsset(filename, new sources.RawSource(contents), { minimized });
                };
                const read = async filename => {
                    compilation.fileDependencies.add(filename);
                    return fs.readFile(filename);
                };
                const filesIn = async (directory, recursive = false) => {
                    compilation.contextDependencies.add(directory);
                    const entries = await fs.readdir(directory, { withFileTypes: true });
                    const files = [];
                    for (const entry of entries.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
                        const filename = path.join(directory, entry.name);
                        if (entry.isFile()) {
                            compilation.fileDependencies.add(filename);
                            files.push(filename);
                        } else if (recursive && entry.isDirectory()) {
                            files.push(...await filesIn(filename, true));
                        }
                    }
                    return files;
                };
                const combine = async (directories, extraFiles, destination) => {
                    const files = [];
                    for (const directory of directories) {
                        files.push(...(await filesIn(resolve(directory))).filter(file => file.endsWith('.js')));
                    }
                    files.push(...extraFiles.map(resolve));
                    const code = (await Promise.all(files.map(async file => (await read(file)).toString('utf8'))))
                        .join('\n;\n');
                    new vm.Script(code, { filename: destination });
                    const result = production ? await terser.minify(code, {
                        module: false,
                        compress: { toplevel: false },
                        mangle: { toplevel: false },
                        format: { comments: /^!|@license|@preserve/ }
                    }) : { code };
                    emit(destination, result.code, production);
                };

                await combine([
                    'source/js/classes',
                    'source/js/components',
                    'source/js/misc'
                ], ['source/js/vendors/app.js'], 'app.js');
                await combine(['source/js/search'], [], 'search.js');

                // Register the whole Sass tree so watch mode also recovers from
                // failed imports and discovers newly added partials.
                await filesIn(resolve('source/scss'), true);
                const deprecations = new Set();
                const stylesheet = resolve('source/scss/style.scss');
                const compiled = await sass.compileAsync(stylesheet, {
                    style: 'expanded',
                    sourceMap: false,
                    verbose: true,
                    fatalDeprecations: ['import', 'global-builtin', 'color-functions', 'slash-div'],
                    logger: {
                        warn(message, options) {
                            if (options.deprecation) {
                                deprecations.add(options.deprecationType?.id || 'legacy-sass');
                            } else {
                                compilation.warnings.push(new Error(message));
                            }
                        }
                    }
                });
                for (const url of compiled.loadedUrls) {
                    if (url.protocol === 'file:') compilation.fileDependencies.add(fileURLToPath(url));
                }
                if (deprecations.size) {
                    compilation.warnings.push(new Error(
                        `Legacy Sass deprecations: ${[...deprecations].sort().join(', ')}. ` +
                        'Styles still compile; migrate the existing Sass source separately.'
                    ));
                }
                const processors = [autoprefixer()];
                if (production) processors.push(cssnano({ preset: 'default' }));
                const styles = await postcss(processors).process(compiled.css, {
                    from: stylesheet,
                    to: path.join(compiler.outputPath, 'style.min.css'),
                    map: false
                });
                for (const warning of styles.warnings()) compilation.warnings.push(new Error(warning.toString()));
                emit('style.min.css', styles.css, production);

                const vendorFiles = [
                    ['node_modules/gsap/dist/gsap.min.js', 'vendor/gsap.min.js'],
                    ['node_modules/gsap/dist/ScrollTrigger.min.js', 'vendor/ScrollTrigger.min.js'],
                    ['node_modules/@fortawesome/fontawesome-free/css/all.min.css', 'vendor/fontawesome/css/all.min.css'],
                    ['node_modules/@fortawesome/fontawesome-free/LICENSE.txt', 'vendor/fontawesome/LICENSE.txt']
                ];
                for (const [source, destination] of vendorFiles) {
                    emit(destination, await read(resolve(source)), /\.min\.(css|js)$/.test(destination));
                }
                for (const font of await filesIn(resolve('node_modules/@fortawesome/fontawesome-free/webfonts'))) {
                    emit(`vendor/fontawesome/webfonts/${path.basename(font)}`, await read(font));
                }
            };
            compilation.hooks.processAssets.tapPromise({
                name,
                stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
            }, async () => {
                try {
                    await build();
                } catch (error) {
                    // Keep dependency watching active after syntax/import errors.
                    compilation.errors.push(error);
                }
            });
        });
    }
}

module.exports = (_env, argv = {}) => ({
    context: __dirname,
    mode: argv.mode || 'development',
    entry: {},
    output: {
        path: path.resolve(__dirname, 'dist'),
        clean: false
    },
    devtool: false,
    optimization: { minimize: false, emitOnErrors: false },
    plugins: [new PortfolioAssetsPlugin()],
    watchOptions: { ignored: /node_modules/, aggregateTimeout: 100 },
    stats: { preset: 'normal', modules: false, chunks: false, entrypoints: false }
});
