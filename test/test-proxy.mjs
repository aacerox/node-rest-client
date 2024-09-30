import http from 'http';
import fs from 'fs';

/**
 * Description placeholder
 * @date 6/30/2023 - 1:26:51 PM
 *
 * @type {{}}
 */
let blacklist = [];
/**
 * Description placeholder
 * @date 6/30/2023 - 1:26:51 PM
 *
 * @type {{}}
 */
let iplist = [];

fs.watchFile('./blacklist', function(c, p) {
  updateBlacklist();
});
fs.watchFile('./iplist', function(c, p) {
  updateIPlist();
});

/**
 * Description placeholder
 * @date 6/30/2023 - 1:26:29 PM
 */
function updateBlacklist() {
  console.log('Updating blacklist.');
  blacklist = fs.readFileSync('./blacklist', {encoding: 'utf-8'}).split('\n')
      .filter(function(rx) {
        return rx.length;
      })
      .map(function(rx) {
        return RegExp(rx);
      });
}

/**
 * Description placeholder
 * @date 6/30/2023 - 1:26:51 PM
 */
function updateIPlist() {
  console.log('Updating iplist.');
  iplist = fs.readFileSync('./iplist', {encoding: 'utf-8'}).split('\n')
      .filter(function(rx) {
        return rx.length;
      });
}

/**
 * Description placeholder
 * @date 6/30/2023 - 1:26:51 PM
 *
 * @param {*} ip
 * @return {boolean}
 */
function ipAllowed(ip) {
  for (i in iplist) {
    if (iplist[i] == ip) {
      return true;
    }
  }
  return false;
}

/**
 * Description placeholder
 * @date 6/30/2023 - 1:26:51 PM
 *
 * @param {*} host
 * @return {boolean}
 */
function hostAllowed(host) {
  for (i in blacklist) {
    if (blacklist[i].test(host)) {
      return false;
    }
  }
  return true;
}

/**
 * Description placeholder
 * @date 6/30/2023 - 1:26:51 PM
 *
 * @param {*} response
 * @param {*} msg
 */
function deny(response, msg) {
  response.writeHead(401);
  response.write(msg);
  response.end();
}

http.createServer(function(request, response) {
  const ip = request.socket.remoteAddress;
  if (!ipAllowed(ip)) {
    const msg = `IP ${ip} is not allowed to use this proxy`;
    deny(response, msg);
    console.log(msg);
    return;
  }

  if (!hostAllowed(request.url)) {
    const msg = `Host ${request.url} has been denied by proxy configuration`;
    deny(response, msg);
    console.log(msg);
    return;
  }

  console.log(ip + ': ' + request.method + ' ' + request.url);
  const agent = new http.Agent({host: request.headers['host'],
    port: 80, maxSockets: 1});
  const proxyRequest = http.request({
    host: request.headers['host'],
    port: 80,
    method: request.method,
    path: request.url,
    headers: request.headers,
    agent: agent,
  });
  proxyRequest.addListener('response', function(proxyResponse) {
    proxyResponse.addListener('data', function(chunk) {
      response.write(chunk, 'binary');
    });
    proxyResponse.addListener('end', function() {
      response.end();
    });
    response.writeHead(proxyResponse.statusCode, proxyResponse.headers);
  });
  request.addListener('data', function(chunk) {
    proxyRequest.write(chunk, 'binary');
  });
  request.addListener('end', function() {
    proxyRequest.end();
  });
}).listen(8080);

updateBlacklist();
updateIPlist();
