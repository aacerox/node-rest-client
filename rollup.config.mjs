import nodePolyfills from 'rollup-plugin-polyfill-node';

export default {
  input: './lib/NodeRestClient.js',
  output: {
    file: 'bundle.js',
    format: 'iife',
  },
  plugins: [
    nodePolyfills( /* options */ ),
  ],
};


