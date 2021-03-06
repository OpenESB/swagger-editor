'use strict';

SwaggerEditor.service('Backend', function Backend($http, $q, defaults,
  Builder, ExternalHooks) {
  var changeListeners =  {};
  var buffer = {};
  var throttleTimeout = defaults.backendThrottle || 200;
  var commit = _.throttle(commitNow, throttleTimeout, {
    leading: false,
    trailing: true
  });

  function commitNow(data) {
    var result = Builder.buildDocs(data, { resolve: true });
    if (!result.error) {
      $http.put(defaults.backendEndpoint, data)
        .then(function success() {
          ExternalHooks.trigger('put-success', [].slice.call(arguments));
        }, function failure() {
          ExternalHooks.trigger('put-failure', [].slice.call(arguments));
        });
    }
  }

  this.save = function (key, value) {

    // Save values in a buffer
    buffer[key] = value;

    if (Array.isArray(changeListeners[key])) {
      changeListeners[key].forEach(function (fn) {
        fn(value);
      });
    }

    if (defaults.useYamlBackend && (key === 'yaml' && value)) {
      commit(value);
    } else if (key === 'specs' && value) {
      commit(buffer[key]);
    }

  };

  this.reset = noop;

  this.load = function (key) {
    if (key !== 'yaml') {
      var deferred = $q.defer();
      if (!key) {
        deferred.reject();
      } else {
        deferred.resolve(buffer[key]);
      }
      return deferred.promise;
    }

    return $http.get(defaults.backendEndpoint)
      .then(function (res) {
        if (defaults.useYamlBackend) {
          buffer.yaml = res.data;
          return buffer.yaml;
        }
        return res.data;
      });
  };

  this.addChangeListener = function (key, fn) {
    if (angular.isFunction(fn)) {
      if (!changeListeners[key]) {
        changeListeners[key] = [];
      }
      changeListeners[key].push(fn);
    }
  };

  function noop() {}
});
