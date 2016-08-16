import execa from 'execa';
import fs from 'fs-extra';
import pify from 'pify';
import test from 'ava';

process.chdir(__dirname);

const fsP = pify(fs);

// Todo isPng and etc

test('show help screen', async (t) => {
    t.regex(await execa.stdout('../cli.js', ['--help']), /Minify images/);
});

test('show version', async (t) => {
    t.is(await execa.stdout('../cli.js', ['--version']), require('../package.json').version);
});

test('output error on config not found', async (t) => {
    const buf = await fsP.readFile('fixtures/test.gif');

    t.throws(execa('../cli.js', ['--config=invalid'], {input: buf}), /Cannot require "config"/);
});

test('optimize a GIF', async (t) => {
    const buf = await fsP.readFile('fixtures/test.gif');

    t.true((await execa.stdout('../cli.js', {input: buf})).length < buf.length);
});

test('optimize a JPG', async (t) => {
    const buf = await fsP.readFile('fixtures/test.jpg');

    t.true((await execa.stdout('../cli.js', {input: buf})).length < buf.length);
});

test('optimize a PNG', async (t) => {
    const buf = await fsP.readFile('fixtures/test.png');

    t.true((await execa.stdout('../cli.js', {input: buf})).length < buf.length);
});

test('optimize a SVG', async (t) => {
    const buf = await fsP.readFile('fixtures/test.svg');

    t.true((await execa.stdout('../cli.js', {input: buf})).length < buf.length);
});

test('output error on corrupt images', async (t) => {
    t.throws(execa('../cli.js', ['fixtures/test-corrupt.jpg']));
});

test('support plugins', async (t) => {
    const buf = await fsP.readFile('fixtures/test.png');
    const data = await execa.stdout('../cli.js', ['--plugin=pngquant'], {input: buf});
    const compareData = await execa.stdout('../cli.js', {input: buf});

    t.true(data.length < compareData.length);
});

/*test('error when trying to write multiple files to stdout', async (t) => {
    const err = await t.throws(execa('../cli.js', ['fixtures/test.{jpg,png}']));

    console.log(err.stderr);

    t.is(err.stderr.trim(), 'Cannot write multiple files to stdout, specify a `--out-dir`');
});*/

test('throw on missing plugins', async (t) => {
    const buf = await fsP.readFile('fixtures/test.png');
    const err = await t.throws(execa('../cli.js', ['--plugin=unicorn'], {input: buf}));

    t.regex(err.stderr, /Unknown plugin: unicorn/);
});
