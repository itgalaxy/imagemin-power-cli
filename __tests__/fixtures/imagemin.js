// eslint-disable-next-line strict, lines-around-directive
'use strict';

const imageminPngquant = require('imagemin-pngquant');

module.exports = {
    plugins: [imageminPngquant()]
};
