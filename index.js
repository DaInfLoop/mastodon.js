// Thanks discord.js for this :)
const { fetch } = require('undici')
const noop = () => {};
const methods = ['get', 'post', 'delete', 'patch', 'put'];
const reflectors = [
  'toString',
  'valueOf',
  'inspect',
  'constructor',
  Symbol.toPrimitive,
  Symbol.for('nodejs.util.inspect.custom'),
];

function buildRoute(baseUri) {
  const route = [''];
  const handler = {
    get(target, name) {
      if (reflectors.includes(name)) return () => route.join('/');
      if (methods.includes(name)) {
        return (options = {}) => {
          let query = ""

          let querynames = Object.keys(options.query ?? {})

          if (querynames.length) {
            query = "?"
            querynames.forEach((x) => {
              query += x+"="+options.query[x]
            })
          }
          
          return fetch(baseUri+route.join('/')+query, {
            method: name.toUpperCase()
          }).then(res => res.json())
        }
      }
      route.push(name);
      return new Proxy(noop, handler);
    },
    apply(target, _, args) {
      route.push(...args.filter(x => x != null));
      return new Proxy(noop, handler);
    },
  };
  return new Proxy(noop, handler);
}

module.exports = class Client {
  constructor(baseUri, auth={}) {
    this.baseUri = baseUri
    Object.defineProperty(this, 'authOpts', {
        value: Object.assign({
        clientId: null,
        clientSecret: null,
        scopes: [],
        requireAuth: false
      }, auth)
    })

    if (this.authOpts.requireAuth) {
      if (!this.authOpts.clientId || !this.authOpts.clientSecret || !this.authOpts.scopes.length) {
        throw new Error("You need to specify a client ID, client secret and/or scopes.")
      }

      console.log('\x1B[32m[AUTH]\x1B[39m You need to auth with an application to use this.\n\x1B[36m\x1B[4m'+this.authUri+'\x1B[24m\x1B[39m\n\n')
    }
  }
  get api() {
    return buildRoute(this.baseUri)
  }
  get authUri() {
     return `${this.baseUri.slice(0, -7)}oauth/authorize?client_id=${this.authOpts.clientId}&scope=${this.authOpts.scopes.join('+')}&redirect_uri=urn:ietf:wg:oauth:2.0:oob&response_type=code`
  }
}

module.exports.Scopes = {
  Read: 'read',
  Write: 'write',
  Follow: 'follow',
  Push: 'push',
  Admin: {
    Read: 'admin:read',
    Write: 'admin:write'
  }
}