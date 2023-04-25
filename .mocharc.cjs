'use strict';

module.exports = {    
    require: 'should',
    reporter: 'spec',
    spec: ['test/specs/*.js'], // the positional arguments!
    ui: 'bdd',
    recursive: true
};