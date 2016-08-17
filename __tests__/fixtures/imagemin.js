'use strict'; // eslint-disable-line strict

const imageminPngquant = require('imagemin-pngquant');

module.exports = {
    plugins: [
        imageminPngquant()
    ]
};
