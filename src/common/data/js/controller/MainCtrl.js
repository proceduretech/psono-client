(function(angular, Raven, moment) {
    'use strict';

    /**
     * @ngdoc controller
     * @name psonocli.controller:MainCtrl
     * @requires $scope
     * @requires $rootScope
     * @requires $filter
     * @requires $timeout
     * @requires psonocli.account
     * @requires psonocli.managerDatastorePassword
     * @requires psonocli.managerDatastoreUser
     * @requires psonocli.managerSecurityReport
     * @requires psonocli.managerSecret
     * @requires psonocli.browserClient
     * @requires psonocli.storage
     * @requires psonocli.offlineCache
     * @requires snapRemote
     * @requires $window
     * @requires $route
     * @requires $routeParams
     * @requires $location
     *
     * @description
     * Controller for main view
     */
    angular.module('psonocli').controller('MainCtrl', ['$scope', '$rootScope', '$filter', '$timeout', 'account',
        'managerDatastorePassword', 'managerDatastoreUser', 'managerSecurityReport', 'managerDatastore', 'managerSecret', 'browserClient',
        'storage', 'offlineCache', 'snapRemote', '$window', '$route', '$routeParams', '$location', '$uibModal', 'managerStatus',
        function ($scope, $rootScope, $filter, $timeout, account,
                  managerDatastorePassword, managerDatastoreUser, managerSecurityReport, managerDatastore, managerSecret, browserClient,
                  storage, offlineCache, snapRemote, $window, $route, $routeParams, $location, $uibModal, managerStatus) {

            $scope.enable_link_shares = storage.find_key('config', 'server_info') && storage.find_key('config', 'server_info').value && (!storage.find_key('config', 'server_info').value.hasOwnProperty('compliance_disable_link_shares') || ! storage.find_key('config', 'server_info').value['compliance_disable_link_shares'])
            $scope.open_tab = browserClient.open_tab;
            $scope.create_new_datastore = create_new_datastore;
            $scope.get_link_state = get_link_state;
            $scope.logout = managerDatastoreUser.logout;
            $scope.go_offline = go_offline;
            $scope.go_online = go_online;
            $scope.on_item_click = on_item_click;
            $scope.on_datastore_switch_click = on_datastore_switch_click;

            $scope.user_username = account.get_account_detail('user_username');
            $scope.messages = [];
            $scope.server_status = {
                password: '',
                password_repeat: '',
                data: {

                },
                new_security_report: 'NOT_REQUIRED', // Alternative choices are REQUIRED and UPCOMING
                last_security_report_age: 0
            };
            $scope.data_stores=[];

            /* test background page */
            //console.log(browserClient.test_background_page());

            activate();

            function activate() {


                var is_logged_in = managerDatastoreUser.is_logged_in();
                var require_two_fa_setup = managerDatastoreUser.require_two_fa_setup();
                if (is_logged_in && require_two_fa_setup) {
                    $window.location.href = 'enforce-two-fa.html';
                    return;
                }


                $scope.offline = offlineCache.is_active();
                $rootScope.$on('offline_mode_enabled', function() {
                    $scope.offline = true;
                });

                $rootScope.$on('offline_mode_disabled', function() {
                    $scope.offline = false;
                });

                browserClient.load_config().then(function (config) {
                    $scope.more_links = config['more_links'];
                });


                managerStatus.get_status().then(function(status) {
                    if (typeof(status) === 'undefined') {
                        return;
                    }
                    on_server_status_update(status.data);
                });

                $rootScope.$on('server_status_updated', function(event, data) {
                    on_server_status_update(data.data);
                });


                browserClient.load_version().then(function(version) {
                    $scope.version = version;
                    Raven.setRelease(version);
                });
                managerDatastore.register('on_datastore_overview_update', refresh_datastore_dropdown);
            }

            /**
             * @ngdoc
             * @name psonocli.controller:OtherDatastoreCtrl#on_server_status_update
             * @methodOf psonocli.controller:OtherDatastoreCtrl
             *
             * @description
             * Triggered upon server status update. Responsible to update the scope with the data.
             *
             * @param data
             */
            function on_server_status_update(data) {
                $scope.server_status.data = data;
                var recurrence_interval = managerSecurityReport.central_security_reports_recurrence_interval()*1000;

                if (recurrence_interval > 0) {
                    if (data.hasOwnProperty('last_security_report_created') && data['last_security_report_created'] !== null) {
                        var last_security_report_age__milliseconds = moment() - moment(data['last_security_report_created']);
                        $scope.server_status.last_security_report_age = Math.ceil(last_security_report_age__milliseconds/(24*60*60*1000));
                        if (last_security_report_age__milliseconds > recurrence_interval) {
                            $scope.server_status.new_security_report = 'REQUIRED'
                        } else {
                            var days_28 = 28*24*3600*1000;
                            var days_14 = 14*24*3600*1000;
                            if (recurrence_interval >= days_28 && last_security_report_age__milliseconds > recurrence_interval - days_14) {
                                $scope.server_status.new_security_report = 'SOON_REQUIRED'
                            } else {
                                $scope.server_status.new_security_report = 'NOT_REQUIRED'
                            }
                        }
                    } else {
                        $scope.server_status.new_security_report = 'REQUIRED'
                    }
                }
            }

            /**
             * @ngdoc
             * @name psonocli.controller:OtherDatastoreCtrl#create_new_datastore
             * @methodOf psonocli.controller:OtherDatastoreCtrl
             *
             * @description
             * Creates a new datastore
             */
            function create_new_datastore() {


                var modalInstance = $uibModal.open({
                    templateUrl: 'view/modal/create-datastore.html',
                    controller: 'ModalCreateDatastoreCtrl',
                    resolve: {}
                });

                modalInstance.result.then(function (form) {

                    var onError = function(result) {
                        // pass
                    };

                    var onSuccess = function(result) {
                        refresh_datastore_dropdown();
                    };

                    return managerDatastore.create_datastore('password', form['description'], form['is_default'])
                        .then(onSuccess, onError);

                }, function () {
                    // cancel triggered
                });
            }

            /**
             * @ngdoc
             * @name psonocli.controller:OtherDatastoreCtrl#go_offline
             * @methodOf psonocli.controller:OtherDatastoreCtrl
             *
             * @description
             * Triggered once someone clicks the offline button in the top menu
             */
            function go_offline() {
                $uibModal.open({
                    templateUrl: 'view/modal/go-offline.html',
                    controller: 'ModalGoOfflineCtrl',
                    backdrop: 'static',
                    resolve: {
                    }
                });
            }

            /**
             * @ngdoc
             * @name psonocli.controller:OtherDatastoreCtrl#go_online
             * @methodOf psonocli.controller:OtherDatastoreCtrl
             *
             * @description
             * Triggered once someone clicks the online button in the top menu
             */
            function go_online() {
                offlineCache.disable();
                offlineCache.clear();
                $scope.offline = false;

            }

            /**
             * @ngdoc
             * @name psonocli.controller:OtherDatastoreCtrl#refresh_datastore_dropdown
             * @methodOf psonocli.controller:OtherDatastoreCtrl
             *
             * @description
             * Loads the datastore dropdown menu and is triggered whenever a new datastore_overview is available.
             */
            function refresh_datastore_dropdown() {
                managerDatastore.get_datastore_overview().then(function (overview) {
                    $scope.data_stores=[];
                    for (var i = 0; i < overview.data.datastores.length; i++) {
                        if (overview.data.datastores[i]['type'] === 'password') {
                            $scope.data_stores.push(overview.data.datastores[i]);
                        }
                    }
                });
            }

            /**
             * @ngdoc
             * @name psonocli.controller:OtherDatastoreCtrl#on_datastore_switch_click
             * @methodOf psonocli.controller:OtherDatastoreCtrl
             *
             * @description
             * Triggered if someone clicks on one of the elements of the datastore dropdown menu and promotes (maybe) a
             * new datastore to be default.
             *
             * @param {object} datastore The datastore
             */
            function on_datastore_switch_click(datastore) {
                managerDatastore.save_datastore_meta(datastore.id, datastore.description, true);
            }

            /**
             * @ngdoc
             * @name psonocli.controller:MainCtrl#get_link_state
             * @methodOf psonocli.controller:MainCtrl
             *
             * @description
             * Returns the link state ('active' or '')
             * for navigation, can maybe moved to another controller
             *
             * @param {string} path The current path
             */
            function get_link_state(path) {
                if (path === '/' && $location.path().length === 1) {
                    return 'active';
                } else if (path !== '/' && $location.path().substr(0, path.length) === path) {
                    return 'active';
                } else {
                    return '';
                }
            }

            /**
             * @ngdoc
             * @name psonocli.controller:MainCtrl#on_item_click
             * @methodOf psonocli.controller:MainCtrl
             *
             * @description
             * Triggered once someone clicks an item
             *
             * @param {object} item The item to open
             */
            function on_item_click(item) {
                managerSecret.on_item_click(item)
            }
        }]
    );
}(angular, Raven, moment));