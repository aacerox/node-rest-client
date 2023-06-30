'use strict';

module.exports = {    
    require: 'should',
    reporter: 'spec',
    spec: ['test/specs/*.mjs'], // the positional arguments!
    ui: 'bdd',
    recursive: true
};