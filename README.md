# imagemin-power-cli 

[![NPM version](https://img.shields.io/npm/v/imagemin-power-cli.svg)](https://www.npmjs.org/package/imagemin-power-cli) [![Travis Build Status](https://img.shields.io/travis/itgalaxy/imagemin-power-cli/master.svg?label=build)](https://travis-ci.org/itgalaxy/imagemin-power-cli) [![Deps](https://david-dm.org/itgalaxy/imagemin-power-cli/status.svg)](https://david-dm.org/itgalaxy/imagemin-power-cli#info=dependencies&view=table) [![Dev Deps](https://david-dm.org/itgalaxy/imagemin-power-cli/dev-status.svg)](https://david-dm.org/itgalaxy/imagemin-power-cli#info=devDependencies&view=table)

> Minify images with power :muscle: 

## Install

```shell
$ npm install --global imagemin-power-cli
```

## Usage

```shell
Usage
        $ imagemin-power [input] [options]
        $ imagemin-power <file> > <output>
        $ cat <file> | imagemin-power > <output>
        
    Input: Files(s), glob(s), or nothing to use stdin.
      
        If an input argument is wrapped in quotation marks, it will be passed to
        node-glob for cross-platform glob support. node_modules and
        bower_components are always ignored. You can also pass no input and use
        stdin, instead.

    Options:

        -c, --config         Configuration for plugins, need export \`plugins\`.
        -d, --cwd            Current working directory.
        -p, --plugin         Override the default plugins.
        -o, --out-dir        Output directory.
        -v, --verbose        Report errors only.
        -r, --recursive      Run the command recursively.
        -i, --ignore-errors  Not stop on errors (it works with only with <path|glob>).

    Examples
        $ imagemin-power images/* --out-dir=build
        $ imagemin-power foo.png > foo-optimized.png
        $ cat foo.png | imagemin-power > foo-optimized.png
        $ imagemin-power --plugins=pngquant foo.png > foo-optimized.png
```

## Related

- [imagemin](https://github.com/imagemin/imagemin) - API for this module

## [License](LICENSE.md)
