(function() {
  module.exports = function(config) {
    return config.set({
      basePath: '',
      frameworks: ['jasmine'],
        files: [
            "../src/common/data/js/lib/ecma-nacl.js",
            "../src/common/data/js/lib/sha512.js",
            "../src/common/data/js/lib/sha256.js",
            "../src/common/data/js/lib/scrypt.js",
            "../src/common/data/js/lib/uuid.js",
            "../src/common/data/js/lib/jquery-2.1.4.js",
            "../src/common/data/js/lib/snap.min.js",
            "../src/common/data/js/lib/jquery.ui.js",
            "../src/common/data/js/lib/sortable.js",
            "../src/common/data/js/lib/lokijs.min.js",
            "../src/common/data/js/lib/password-generator.js",
            "../src/common/data/js/lib/angular.js",
            "../src/common/data/js/lib/angular-animate.js",
            "../src/common/data/js/lib/angular-complexify.js",
            "../src/common/data/js/lib/loading-bar.js",
            "../src/common/data/js/lib/angular-route.js",
            "../src/common/data/js/lib/angular-sanitize.js",
            "../src/common/data/js/lib/angular-local-storage.min.js",
            "../src/common/data/js/lib/angular-snap.min.js",
            "../src/common/data/js/lib/ui-bootstrap-tpls-0.13.4.min.js",
            "../src/common/data/js/lib/ngdraggable.js",
            "../src/common/data/js/lib/angular-tree-view.js",
            "../src/common/data/js/lib/angular-ui-select.js",
            "../src/common/data/js/lib/ng-context-menu.js",
            "../src/common/data/js/lib/angular-dashboard-framework.js",
            "../src/common/data/js/widgets/adf-widget-datastore.js",
            "../src/common/data/js/widgets/adf-widget-shareusers.js",
            "../src/common/data/js/main.js",
            "../src/common/data/js/service/api-client.js",
            "../src/common/data/js/service/helper.js",
            "../src/common/data/js/service/item-blueprint.js",
            "../src/common/data/js/service/crypto-library.js",
            "../src/common/data/js/service/storage.js",
            "../src/common/data/js/service/settings.js",
            "../src/common/data/js/service/manager.js",
            "../src/common/data/js/service/manager-datastore.js",
            "../src/common/data/js/service/browser-client.js",
            "../src/common/data/js/service/password-generator.js",
            "../src/common/data/view/templates.js",

            "../unittests/data/js/lib/angular-mocks.js",

            '../unittests/tests/*.coffee',
            '../unittests/tests/**/*.coffee'
        ],
        exclude: [],
      preprocessors: {
        '**/*.coffee': ['coffee']
      },
      coffeePreprocessor: {
        options: {
          bare: true,
          sourceMap: false
        },
        transformPath: function(path) {
          return path.replace(/\.coffee$/, '.js');
        }
      },
      reporters: ['progress'],
      port: 9876,
      colors: true,
      logLevel: config.LOG_INFO,
      autoWatch: true,
      browsers: [],
      singleRun: false,
      concurrency: Infinity
    });
  };

}).call(this);
