'use strict'

window.ECOR = window.ECOR || {}
if (!NGN) {
  console.error('ECOR.ApiClient requires NGN')
}

/**
 * @class ECOR.ApiClient
 * A class for building secure API connections, using NGN.
 */
ECOR.ApiClient = function (cfg) {
  var HTTP = window.NGN.HTTP || null
  if (!HTTP) {
    throw new Error('The ApiClient requires the NGN Chassis HTTP module.')
  }

  cfg = cfg || {}

  // Private Attributes
  var accesstoken = null

  // Private methods
  var BUS = window.NGN.BUS || null
  var fire = function () {
    if (BUS) {
      BUS.emit.apply(BUS, arguments)
    }
  }

  // Class Attributes
  Object.defineProperties(this, {
    /**
     * @cfg {string} [host]
     * The API root. Defaults to the domain on which the client is served from.
     * Port can be included here.
     */
    host: NGN.define(true, true, false, cfg.host || window.location),

    /**
     * @cfg {string} [root=/]
     * The root path to apply to the host.
     */
    root: NGN.define(true, true, false, cfg.root || '/'),

    /**
     * @cfg {object} [headers]
     * Supply HTTP headers that will be applied to every request.
     * Example:
     * ```js
     * new ECOR.ApiClient({
     *   headers: {
     *     'my-custom-header': 'my-custom-value'
     *   }
     * })
     * ```
     */
    headers: NGN.define(true, false, false, cfg.headers || {}),

    /**
     * @cfg {string} [loginPath=oauth/login]
     * The URL path to send login requests to.
     */
    loginPath: NGN.define(false, false, false, cfg.loginPath || 'oauth/login'),

    /**
     * @property accessToken
     * The access token used to make authenticated requests.
     * @private
     */
    accessToken: NGN._get(function () {
      return accesstoken || null
    }),

    /**
     * @property base
     * The concatenation of the host and root. A helper property.
     * @private
     */
    base: NGN._get(function () {
      return this.host + this.root
    }),

    /**
     * @method authenticate
     * Login. This only needs to be called once per session. The library
     * will automatically handle access tokens and refreshing.
     * @param {string} username
     * @param {string} password
     * @param {function} callback
     * @param {boolean} callback.success
     * Indicates the authentication was successful.
     */
    authenticate: NGN.define(true, false, false, function (login, password, callback) {
      if (accesstoken !== null) {
        return
      }

      var me = this
      HTTP.post({
        url: this.base + this.loginPath,
        username: login,
        password: password,
        headers: this.headers
      }, function (res) {
        if (res.status === 200) {
          var data = typeof res.response !== 'string' ? res.response : JSON.parse(res.responseText)
          accesstoken = data.token.access_token
          fire('api.authentication.success')
          callback && callback(true)

          // Set a time to retrieve a new access token (1.5 seconds before it expires).
          setTimeout(function () {
            me.refreshToken(callback)
          }, (data.token.expires_in - 1.5) * 1000)
        } else {
          var reason = res.responseText || res.statusText
          fire('api.authentication.failure', reason)
          callback && callback(false, reason)
        }
      })
    }),

    /**
     * @method refreshToken
     * Refresh the access token. This is normally called automatically before
     * the current token expires, so it is unlikely developers need to use this
     * directly in their code.
     * @param  {function} callback
     * The callback is executed when the refresh is complete.
     * @param {boolean} callback.success
     * Indicates the refresh was successful and the new token is available
     * in the #accessToken property.
     * @param {string} callback.reason
     * This only exists if the refresh fails. It provides a reason for the failure.
     */
    refreshToken: NGN.define(false, false, false, function (callback) {
      var me = this
      HTTP.post({
        url: this.base + 'oauth/token',
        accessToken: accesstoken,
        headers: this.headers
      }, function (res) {
        if (res.status === 200) {
          var data = typeof res.response !== 'string' ? res.response : JSON.parse(res.responseText)
          accesstoken = data.token.access_token
          fire('api.authentication.refresh')
          callback && callback(true)

          // Set a time to retrieve a new access token (1.5 seconds before it expires).
          setTimeout(function () {
            me.refreshToken()
          }, (data.token.expires_in - 1.5) * 1000)
        } else {
          var reason = 'Authentication expired. ' + (res.responseText || res.statusText)
          fire('api.authentication.failure', reason)
          callback && callback(false, reason)
        }
      })
    }),

    // Wrapper to prevent security confusion
    secure: NGN.define(false, false, false, function (callback) {
      if (accesstoken === null) {
        console.warn('Attempting to use the API without authentication.')
      }
      callback && callback()
    })
  })
}
