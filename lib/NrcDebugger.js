'use strict';

import debugManager from 'debug';

/**
 * Description placeholder
 * @author aacerox
 *
 * @type {*}
 */
const nodeDebug = debugManager('NRC');


/**
 * Description placeholder
 * @author aacerox
 *
 * @param {...{}} args
 */
export default function debugFn(...args) {
  if (!process.env.DEBUG) return;

  /**
   * Description placeholder
   * @author aacerox
   *
   * @return {*}
   */
  function callerName() {
    try {
      throw new Error();
    } catch (e) {
      try {
        return e.stack.split('at ')[3].split(' ')[0];
      } catch (e) {
        return '';
      }
    }
  }


  const now = new Date();
  // eslint-disable-next-line max-len
  const header = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}   ${callerName()} -  `;
  const innerArgs = Array.prototype.slice.call(args);

  innerArgs.splice(0, 0, header);


  nodeDebug.apply(console, innerArgs);
};


