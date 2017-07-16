(function () {
    module.exports = function (config) {
        return config.set({
            basePath: '',
            frameworks: ['jasmine'],
            files: [
                "../src/common/data/js/lib/ecma-nacl.min.js",
                "../src/common/data/js/lib/sha512.min.js",
                "../src/common/data/js/lib/sha256.min.js",
                "../src/common/data/js/lib/uuid.js",
                "../src/common/data/js/lib/chart.min.js",
                "../src/common/data/js/lib/jquery.min.js",
                "../src/common/data/js/lib/client.min.js",
                "../src/common/data/js/lib/datatables.min.js",
                "../src/common/data/js/lib/snap.min.js",
                "../src/common/data/js/lib/jquery-ui.min.js",
                "../src/common/data/js/lib/sortable.min.js",
                "../src/common/data/js/lib/lokijs.min.js",
                "../src/common/data/js/lib/qrcode.min.js",
                "../src/common/data/js/lib/fastclick.js",
                "../src/common/data/js/lib/password-generator.js",
                "../src/common/data/js/lib/papaparse.min.js",
                "../src/common/data/js/lib/angular.min.js",
                "../src/common/data/js/lib/angular-animate.min.js",
                "../src/common/data/js/lib/angular-touch.min.js",
                "../src/common/data/js/lib/angular-complexify.min.js",
                "../src/common/data/js/lib/loading-bar.min.js",
                "../src/common/data/js/lib/angular-chart.min.js",
                "../src/common/data/js/lib/angular-route.min.js",
                "../src/common/data/js/lib/angular-sanitize.min.js",
                "../src/common/data/js/lib/angular-local-storage.min.js",
                "../src/common/data/js/lib/angular-snap.min.js",
                "../src/common/data/js/lib/ui-bootstrap-tpls.min.js",
                "../src/common/data/js/lib/ngdraggable.js",
                "../src/common/data/js/lib/angular-ui-select.js",
                "../src/common/data/js/lib/ng-context-menu.js",
                "../src/common/data/js/lib/angular-datatables.js",

                "../src/common/data/js/module/ng-tree.js",

                "../src/common/data/js/main.js",

                "../src/common/data/js/directive/fileReader.js",
                "../src/common/data/js/directive/treeView.js",
                "../src/common/data/js/directive/treeViewNode.js",

                "../src/common/data/js/controller/AcceptShareCtrl.js",
                "../src/common/data/js/controller/AccountCtrl.js",
                "../src/common/data/js/controller/ActivationCtrl.js",
                "../src/common/data/js/controller/DatastoreCtrl.js",
                "../src/common/data/js/controller/SecurityReportCtrl.js",
                "../src/common/data/js/controller/LoginCtrl.js",
                "../src/common/data/js/controller/LostPasswordCtrl.js",
                "../src/common/data/js/controller/MainCtrl.js",
                "../src/common/data/js/controller/ModalAcceptShareCtrl.js",
                "../src/common/data/js/controller/ModalConfigureGoogleAuthenticatorCtrl.js",
                "../src/common/data/js/controller/ModalConfigureYubiKeyOTPCtrl.js",
                "../src/common/data/js/controller/ModalCreateDatastoreCtrl.js",
                "../src/common/data/js/controller/ModalEditDatastoreCtrl.js",
                "../src/common/data/js/controller/ModalDeleteDatastoreCtrl.js",
                "../src/common/data/js/controller/ModalDatastoreNewEntryCtrl.js",
                "../src/common/data/js/controller/ModalDisplayShareRightsCtrl.js",
                "../src/common/data/js/controller/ModalEditEntryCtrl.js",
                "../src/common/data/js/controller/ModalEditFolderCtrl.js",
                "../src/common/data/js/controller/ModalNewFolderCtrl.js",
                "../src/common/data/js/controller/ModalShareEditEntryCtrl.js",
                "../src/common/data/js/controller/ModalShareEntryCtrl.js",
                "../src/common/data/js/controller/ModalShareNewEntryCtrl.js",
                "../src/common/data/js/controller/ModalShowRecoverycodeCtrl.js",
                "../src/common/data/js/controller/OpenSecretCtrl.js",
                "../src/common/data/js/controller/OtherCtrl.js",
                "../src/common/data/js/controller/SessionsCtrl.js",
                "../src/common/data/js/controller/KnownHostsCtrl.js",
                "../src/common/data/js/controller/OtherDatastoreCtrl.js",
                "../src/common/data/js/controller/ExportCtrl.js",
                "../src/common/data/js/controller/ImportCtrl.js",
                "../src/common/data/js/controller/PanelCtrl.js",
                "../src/common/data/js/controller/RegisterCtrl.js",
                "../src/common/data/js/controller/SettingsCtrl.js",
                "../src/common/data/js/controller/ShareCtrl.js",
                "../src/common/data/js/controller/ShareusersCtrl.js",
                "../src/common/data/js/controller/WrapperCtrl.js",
                "../src/common/data/js/service/api-client.js",
                "../src/common/data/js/service/helper.js",
                "../src/common/data/js/service/device.js",
                "../src/common/data/js/service/message.js",
                "../src/common/data/js/service/item-blueprint.js",
                "../src/common/data/js/service/share-blueprint.js",
                "../src/common/data/js/service/crypto-library.js",
                "../src/common/data/js/service/converter.js",
                "../src/common/data/js/service/storage.js",
                "../src/common/data/js/service/account.js",
                "../src/common/data/js/service/settings.js",
                "../src/common/data/js/service/manager-base.js",
                "../src/common/data/js/service/manager.js",
                "../src/common/data/js/service/manager-widget.js",
                "../src/common/data/js/service/manager-datastore.js",
                "../src/common/data/js/service/manager-secret-link.js",
                "../src/common/data/js/service/manager-share-link.js",
                "../src/common/data/js/service/manager-export.js",
                "../src/common/data/js/service/manager-hosts.js",
                "../src/common/data/js/service/manager-import.js",
                "../src/common/data/js/service/manager-security-report.js",
                "../src/common/data/js/service/import-chrome-csv.js",
                "../src/common/data/js/service/import-psono-pw-json.js",
                "../src/common/data/js/service/import-lastpass-com-csv.js",
                "../src/common/data/js/service/import-keepassx-org-csv.js",
                "../src/common/data/js/service/import-keepass-info-csv.js",
                "../src/common/data/js/service/manager-secret.js",
                "../src/common/data/js/service/manager-share.js",
                "../src/common/data/js/service/manager-datastore-password.js",
                "../src/common/data/js/service/manager-datastore-user.js",
                "../src/common/data/js/service/manager-datastore-setting.js",
                "../src/common/data/js/service/browser-client.js",
                "../src/common/data/js/service/password-generator.js",
                "../src/common/data/js/service/drop-down-menu-watcher.js",
                "../src/common/data/view/templates.js",

                "../src/common/data/js/service/manager-background.js",
                "../src/common/data/js/controller/BackgroundCtrl.js",

                "../unittests/data/js/lib/angular-mocks.js",

                '../unittests/tests/*.js',
                '../unittests/tests/**/*.js'
            ],
            exclude: [],
            preprocessors: {
                '../src/**/!(*lib)/*.js': ['coverage']
            },
            coverageReporter: {
                type : 'html',
                dir : 'coverage/'
            },
            reporters: ['progress', 'coverage'],
            port: 9876,
            colors: true,
            logLevel: config.LOG_INFO,
            autoWatch: true,
            browsers: ['Chrome'],
            singleRun: true,
            concurrency: Infinity
        });
    };

}).call(this);
