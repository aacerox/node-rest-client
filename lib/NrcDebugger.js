'use strict';

import debugManager from 'debug';

/**
 * main debug manager
 * @author aacerox
 *
 * @type {*}
 */
const nodeDebug = debugManager('NRC');


/**
 * main debug function
 * @author aacerox
 *
 * @param {...{}} args
 */
export default function debugFn(...args) {
  if (!process.env.DEBUG) return;

  /**
   * returns debug function callers name to be logged on debug trace
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


