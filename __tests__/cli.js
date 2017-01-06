import execa from 'execa';
import fs from 'fs-extra';
import path from 'path';
import pify from 'pify';
import test from 'ava';

process.chdir(__dirname);

const fsP = pify(fs);
const cliPath = path.resolve(__dirname, '../cli.js');

test('show help screen', async (t) => {
    t.regex(await execa.stdout(cliPath, ['--help']), /Minify images/);
});

test('show `version`', async (t) => {
    // eslint-disable-next-line global-require
    t.is(await execa.stdout(cliPath, ['--version']), require('../package.json').version);
});

test('optimize a GIF', async (t) => {
    const buf = await fsP.readFile('fixtures/test.gif');
    const stdout = await execa.stdout(cliPath, {
        input: buf
    });

    t.true(stdout.length < buf.length);
});

test('optimize a jpg', async (t) => {
    const buf = await fsP.readFile('fixtures/test.jpg');
    const stdout = await execa.stdout(cliPath, {
        input: buf
    });

    t.true(stdout.length < buf.length);
});

test('optimize a png', async (t) => {
    const buf = await fsP.readFile('fixtures/test.png');
    const stdout = await execa.stdout(cliPath, {
        input: buf
    });

    t.true(stdout.length < buf.length);
});

test('optimize a svg', async (t) => {
    const buf = await fsP.readFile('fixtures/test.svg');
    const stdout = await execa.stdout(cliPath, {
        input: buf
    });

    t.true(stdout.length < buf.length);
});

test('optimize a WebP', async (t) => {
    const buf = await fsP.readFile('fixtures/test.webp');
    const stdout = await execa.stdout(cliPath, {
        input: buf
    });

    t.true(stdout.length < buf.length);
});

test('optimize with `config`', async (t) => {
    const buf = await fsP.readFile('fixtures/test.png');
    const data = await execa.stdout(cliPath, ['--config=./fixtures/imagemin.js'], {
        input: buf
    });
    const compareData = await execa.stdout(cliPath, {
        input: buf
    });

    t.true(data.length < compareData.length);
});

test('output error on `config` not found', async (t) => {
    const buf = await fsP.readFile('fixtures/test.png');

    t.throws(execa(cliPath, ['--config=invalid'], {
        input: buf
    }), /Cannot require "config"/);
});

test('optimize a PNG use glob pattern', async (t) => {
    await execa(cliPath, ['fixtures/test.png', '--out-dir=./fixtures/tmp', '--plugin=pngquant']);
    const beforeOptimizeData = await fsP.readFile('fixtures/test.png');
    const afterOptimizeData = await fsP.readFile('fixtures/tmp/test.png');

    t.true(afterOptimizeData.length < beforeOptimizeData.length);
});

test('optimize a PNG use `glob pattern` and `cwd`', async (t) => {
    await execa(cliPath, [
        'image/folder/test.png',
        '--out-dir=fixtures/tmp',
        '--plugin=pngquant',
        '--cwd=fixtures/deep'
    ]);
    const beforeOptimizeData = await fsP.readFile('fixtures/deep/image/folder/test.png');
    const afterOptimizeData = await fsP.readFile('fixtures/tmp/test.png');

    t.true(afterOptimizeData.length < beforeOptimizeData.length);
});

test('optimize a PNG use `glob pattern` and `recursive`', async (t) => {
    await execa(cliPath, [
        'fixtures/deep/image/folder/test.png',
        '--out-dir=fixtures/tmp',
        '--plugin=pngquant',
        '--recursive'
    ]);
    const beforeOptimizeData = await fsP.readFile('fixtures/deep/image/folder/test.png');
    const afterOptimizeData = await fsP.readFile('fixtures/tmp/fixtures/deep/image/folder/test.png');

    t.true(afterOptimizeData.length < beforeOptimizeData.length);
});

test('optimize a PNG use `glob pattern`, `cwd` and `recursive`', async (t) => {
    await execa(cliPath, [
        'image/folder/test.png',
        '--out-dir=fixtures/tmp',
        '--plugin=pngquant',
        '--cwd=fixtures/deep',
        '--recursive'
    ]);
    const beforeOptimizeData = await fsP.readFile('fixtures/deep/image/folder/test.png');
    const afterOptimizeData = await fsP.readFile('fixtures/tmp/image/folder/test.png');

    t.true(afterOptimizeData.length < beforeOptimizeData.length);
});

test('optimize a PNG use `glob pattern` and `verbose`', async (t) => {
    const output = await execa(cliPath, [
        'fixtures/test.png',
        '--out-dir=fixtures/tmp',
        '--plugin=pngquant',
        '--verbose'
    ]);
    const beforeOptimizeData = await fsP.readFile('fixtures/test.png');
    const afterOptimizeData = await fsP.readFile('fixtures/tmp/test.png');

    t.regex(output.stderr, /Minifying image "fixtures\/test.png"/);
    t.regex(output.stderr, /Successfully compressed images: 1. Unsuccessfully compressed images: 0. Total images: 1./);
    t.true(afterOptimizeData.length < beforeOptimizeData.length);
});

test('output error on corrupt images use `glob pattern`', (t) => {
    t.throws(execa(cliPath, ['fixtures/test-corrupt.jpg']));
});

test('output error on corrupt images use `stdout`', async (t) => {
    const buf = await fsP.readFile('fixtures/test-corrupt.jpg');
    const output = await t.throws(execa(cliPath, {
        input: buf
    }));

    t.true(output.code === 1);
    t.regex(output.stderr, /Error: Corrupt JPEG data/);
});

test('output error on corrupt images use `glob pattern` and `verbose`', async (t) => {
    const output = await t.throws(execa(cliPath, ['fixtures/test-corrupt.jpg', '--verbose']));

    t.true(output.code === 1);
    t.regex(output.stderr, /Error: Corrupt JPEG data/);
    t.notRegex(
        output.stderr,
        /Successfully compressed images: 0. Unsuccessfully compressed images: 1. Total images: 1./
    );
});

test('optimize a corrupt image use `verbose` and `ignore-errors`', async (t) => {
    const output = await execa(cliPath, [
        'fixtures/test-corrupt.jpg',
        '--verbose',
        '--ignore-errors'
    ]);

    t.regex(output.stderr, /Minifying image "fixtures\/test-corrupt.jpg"/);
    t.regex(output.stderr, /Error: Corrupt JPEG data/);
    t.regex(output.stderr, /Unsuccessfully compressed images: 1/);
});

test('optimize a corrupt image and a normal image use `verbose` and `ignore-errors`', async (t) => {
    const output = await execa(cliPath, [
        'fixtures/test-corrupt.jpg',
        'fixtures/test.jpg',
        '--out-dir=fixtures/tmp',
        '--verbose',
        '--ignore-errors'
    ]);

    t.regex(output.stderr, /Minifying image "fixtures\/test-corrupt.jpg"/);
    t.regex(output.stderr, /Error: Corrupt JPEG data/);
    t.regex(output.stderr, /Minifying image "fixtures\/test.jpg"/);
    t.regex(output.stderr, /Successfully compressed images: 1. Unsuccessfully compressed images: 1. Total images: 2./);
});

test('optimize a corrupt image use `silent` and `ignore-errors`', async (t) => {
    const output = await execa(cliPath, [
        'fixtures/test-corrupt.jpg',
        '--silent',
        '--ignore-errors'
    ]);

    t.regex(output.stderr, /Minifying image "fixtures\/test-corrupt.jpg"/);
    t.regex(output.stderr, /Error: Corrupt JPEG data/);
});

test('optimize a corrupt image and a normal image use `silent` and `ignore-errors`', async (t) => {
    const output = await execa(cliPath, [
        'fixtures/test-corrupt.jpg',
        'fixtures/test.jpg',
        '--out-dir=fixtures/tmp',
        '--silent',
        '--ignore-errors'
    ]);

    t.regex(output.stderr, /Minifying image "fixtures\/test-corrupt.jpg"/);
    t.regex(output.stderr, /Error: Corrupt JPEG data/);
    t.notRegex(
        output.stderr,
        /Successfully compressed images: 1. Unsuccessfully compressed images: 1. Total images: 2./
    );
});

test('optimize images use `verbose` and `ignore-errors`', async (t) => {
    const output = await execa(cliPath, [
        'fixtures/test.{jpg,png,webp,gif,svg}',
        '--out-dir=fixtures/tmp',
        '--verbose',
        '--ignore-errors'
    ]);

    t.regex(output.stderr, /Minifying image "fixtures\/test.jpg"/);
    t.regex(output.stderr, /Minifying image "fixtures\/test.png"/);
    t.regex(output.stderr, /Minifying image "fixtures\/test.webp"/);
    t.regex(output.stderr, /Minifying image "fixtures\/test.gif"/);
    t.regex(output.stderr, /Minifying image "fixtures\/test.svg"/);
    t.regex(output.stderr, /Successfully compressed images: 5. Unsuccessfully compressed images: 0. Total images: 5./);
});

test('optimize images use `verbose`, `ignore-errors`, `max-concurrency`', async (t) => {
    const output = await execa(cliPath, [
        'fixtures/test.{jpg,png,webp,gif,svg}',
        '--out-dir=fixtures/tmp',
        '--verbose',
        '--ignore-errors',
        '--max-concurrency=4'
    ]);

    t.regex(output.stderr, /Minifying image "fixtures\/test.jpg"/);
    t.regex(output.stderr, /Minifying image "fixtures\/test.png"/);
    t.regex(output.stderr, /Minifying image "fixtures\/test.webp"/);
    t.regex(output.stderr, /Minifying image "fixtures\/test.gif"/);
    t.regex(output.stderr, /Minifying image "fixtures\/test.svg"/);
    t.regex(output.stderr, /Successfully compressed images: 5. Unsuccessfully compressed images: 0. Total images: 5./);
});

test('support `plugins`', async (t) => {
    const buf = await fsP.readFile('fixtures/test.png');
    const data = await execa.stdout(cliPath, ['--plugin=pngquant'], {
        input: buf
    });
    const compareData = await execa.stdout(cliPath, {
        input: buf
    });

    t.true(data.length < compareData.length);
});

test('throw on missing `plugins`', async (t) => {
    const buf = await fsP.readFile('fixtures/test.png');
    const output = await t.throws(execa(cliPath, ['--plugin=unicorn'], {
        input: buf
    }));

    t.regex(output.stderr, /Unknown plugin: unicorn/);
});

test('error when trying to write multiple files to `stdout`', async (t) => {
    const output = await t.throws(execa(cliPath, ['fixtures/test.{jpg,png}']));

    t.is(output.stderr.trim(), 'Cannot write multiple files to stdout, specify a `--out-dir`');
});

test.after.always(async () => {
    await fsP.remove('fixtures/tmp');
});
