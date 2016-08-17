#!/usr/bin/env node

'use strict'; // eslint-disable-line strict

const arrify = require('arrify');
const fileType = require('file-type');
const fs = require('fs-extra');
const getStdin = require('get-stdin');
const globby = require('globby');
const imagemin = require('imagemin');
const meow = require('meow');
const ora = require('ora');
const path = require('path');
const prettyBytes = require('pretty-bytes');
const replaceExt = require('replace-ext');
const stripIndent = require('strip-indent');

const cli = meow(`
    Usage
        $ imagemin <path|glob> ... --out-dir=build [--plugin=<name> ...]
        $ imagemin <file> > <output>
        $ cat <file> | imagemin > <output>

    Options
        -c, --config         Configuration for plugins, need export \`plugins\`.
        -d, --cwd            Current working directory.
        -p, --plugin         Override the default plugins.
        -o, --out-dir        Output directory.
        -v, --verbose        Report errors only.
        -r, --recursive      Run the command recursively.
        -i, --ignore-errors  Not stop on errors (it works with only with <path|glob>).

    Examples
        $ imagemin images/* --out-dir=build
        $ imagemin foo.png > foo-optimized.png
        $ cat foo.png | imagemin > foo-optimized.png
        $ imagemin --plugins=pngquant foo.png > foo-optimized.png
`, {
    alias: {
        /* eslint-disable id-length */
        c: 'config',
        d: 'cwd',
        i: 'ignore-errors',
        o: 'out-dir',
        p: 'plugin',
        r: 'recursive',
        v: 'verbose'
        /* eslint-enable id-length */
    },
    boolean: [
        'recursive',
        'ignore-errors',
        'verbose'
    ],
    string: [
        'config',
        'cwd',
        'out-dir'
    ]
});

const handleFile
    = (filepath, opts) => new Promise((resolve, reject) => {
        fs.readFile(filepath, (error, data) => {
            /* istanbul ignore if */
            if (error) {
                return reject(error);
            }

            return resolve(data);
        });
    })
    .then(
        (data) => imagemin.buffer(data, {
            plugins: opts.plugin
        })
            .then((buffer) => {
                let parentDirectory = '';

                if (opts.recursive) {
                    parentDirectory = path.relative(opts.cwd, path.dirname(filepath));
                }

                const dest = path.resolve(
                    opts.outDir
                        ? path.join(opts.outDir, parentDirectory, path.basename(filepath))
                        : filepath
                );

                const ret = {
                    data: buffer,
                    optimizedSize: buffer.length,
                    originalSize: data.length,
                    path: fileType(buffer) && fileType(buffer).ext === 'webp' ? replaceExt(dest, '.webp') : dest
                };

                return new Promise(
                    (resolve, reject) => fs.outputFile(ret.path, ret.data, (error) => {
                        /* istanbul ignore if */
                        if (error) {
                            return reject(error);
                        }

                        return resolve(ret);
                    })
                );
            })
    );

const DEFAULT_PLUGINS = [
    'gifsicle',
    'jpegtran',
    'optipng',
    'svgo'
];

// eslint-disable-next-line consistent-return, array-callback-return
const requirePlugins = (plugins) => plugins.map((plugin) => {
    try {
        return require(`imagemin-${plugin}`)(); // eslint-disable-line global-require
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error(stripIndent(`
            Unknown plugin: ${plugin}
            Did you forgot to install the plugin?
            You can install it with:
            $ npm install -g imagemin-${plugin}
            ${error}
        `).trim());
        process.exit(1); // eslint-disable-line no-process-exit
    }
});

const run = (input, options) => {
    const opts = Object.assign({
        config: null,
        cwd: process.cwd(),
        // Info support multiple plugins
        plugin: DEFAULT_PLUGINS,
        recursive: false
    }, options);

    const dataSource = opts.config || path.resolve('./.imagemin.js');

    if (opts.config) {
        let config = null;

        try {
            config = require(path.resolve(dataSource)); // eslint-disable-line global-require
        } catch (error) {
            console.error(`Cannot require "config"\n${error}`); // eslint-disable-line no-console
            process.exit(1); // eslint-disable-line no-process-exit
        }

        opts.plugin = config.plugins;
    } else {
        opts.plugin = requirePlugins(arrify(opts.plugin));
    }

    if (Buffer.isBuffer(input)) {
        return imagemin
            .buffer(input, {
                plugins: opts.plugin
            })
            .then((buf) => process.stdout.write(buf));
    }

    let spinner = null;

    if (opts.verbose) {
        spinner = ora(
            'Starting minifying images...'
        );
        spinner.start();
    }

    /* istanbul ignore if */
    if (!Array.isArray(input)) {
        return Promise.reject(new TypeError('Expected an array'));
    }

    let successCounter = 0;
    let failCounter = 0;
    let totalBytes = 0;
    let totalSavedBytes = 0;

    return globby(input, {
        cwd: opts.cwd,
        nodir: true
    })
        .then((paths) => {
            // Maybe throw error if not found images

            if (!opts.outDir && paths.length > 1) {
                // eslint-disable-next-line no-console
                console.error('Cannot write multiple files to stdout, specify a `--out-dir`');
                process.exit(1); // eslint-disable-line no-process-exit
            }

            return Promise.all(paths.map((filepath) => {
                const realFilepath = path.resolve(path.join(opts.cwd, filepath));
                const total = paths.length;

                return handleFile(realFilepath, opts)
                    .then(
                        (result) => {
                            if (opts.verbose) {
                                successCounter++;

                                const originalSize = result.originalSize;
                                const optimizedSize = result.optimizedSize;
                                const saved = originalSize - optimizedSize;
                                const percent = originalSize > 0 ? (saved / originalSize) * 100 : 0;
                                const savedMsg = `saved ${prettyBytes(saved)} `
                                    + `- ${percent.toFixed(1).replace(/\.0$/, '')}%`;

                                totalBytes += originalSize;
                                totalSavedBytes += saved;

                                spinner.text = `Minifying image "${filepath}" `
                                    + `(${successCounter + failCounter} of ${total})`
                                    + `${saved > 0 ? ` - ${savedMsg}` : ' - already optimized'}...`;
                                spinner.succeed();
                                spinner.text = 'Minifying images...';
                                spinner.start();
                            }

                            return filepath;
                        },
                        (error) => {
                            if (opts.ignoreErrors) {
                                if (opts.verbose) {
                                    failCounter++;

                                    spinner.text = `Minifying image "${filepath}" `
                                        + `(${successCounter + failCounter} of ${total})...\nError: ${error.stack}...`;
                                    spinner.fail();
                                    spinner.text = 'Minifying images...';
                                    spinner.start();
                                }

                                return Promise.resolve();
                            }

                            return Promise.reject(error);
                        }
                    );
            }));
        })
        .then((files) => {
            if (opts.verbose) {
                const percent = totalBytes > 0 ? (totalSavedBytes / totalBytes) * 100 : 0;

                spinner.text = `Successfully compressed images: ${successCounter}. `
                    + `Unsuccessfully compressed images: ${failCounter}. `
                    + `Total images: ${successCounter + failCounter}. `
                    + `Total images size: ${prettyBytes(totalBytes)}. `
                    + `Total saved size: ${prettyBytes(totalSavedBytes)} - ${percent}%. `;
                spinner.stopAndPersist('ℹ');
            }

            return Promise.resolve(files);
        })
        .catch((error) => {
            if (opts.verbose) {
                spinner.fail();
            }

            throw error;
        });
};

/* istanbul ignore if */
if (!cli.input.length && process.stdin.isTTY) {
    console.error('Specify at least one filename'); // eslint-disable-line no-console
    process.exit(1); // eslint-disable-line no-process-exit
}

if (cli.input.length) {
    run(cli.input, cli.flags)
        .catch((error) => {
            console.error(error.stack); // eslint-disable-line no-console
            process.exit(1); // eslint-disable-line no-process-exit
        });
} else {
    getStdin
        .buffer()
        .then((buf) => run(buf, cli.flags))
        .catch((error) => {
            console.error(error.stack); // eslint-disable-line no-console
            process.exit(1); // eslint-disable-line no-process-exit
        });
}