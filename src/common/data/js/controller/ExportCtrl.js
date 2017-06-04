(function(angular) {
    'use strict';

    /**
     * @ngdoc controller
     * @name psonocli.controller:ExportCtrl
     * @requires $scope
     * @requires psonocli.managerExport
     *
     * @description
     * Controller for the "Export" tab in the "Others" menu
     */
    angular.module('psonocli').controller('ExportCtrl', ['$scope', '$window', '$timeout', 'managerExport',
        function ($scope, $window, $timeout, managerExport) {

            $scope.export_options = {
                options: managerExport.get_exporter()
            };
            $scope.state = {
                open_secret_requests: 0,
                closed_secret_request: 0,
                download_ongoing: false
            };

            $scope.export_datastore = export_datastore;

            activate();

            function activate() {
                managerExport.on('export-started', function(){
                    $scope.state.download_ongoing = true;
                });

                managerExport.on('get-secret-started', function(){
                    $scope.state.open_secret_requests = $scope.state.open_secret_requests + 1;
                });

                managerExport.on('get-secret-complete', function(){
                    $scope.state.closed_secret_request = $scope.state.closed_secret_request + 1;
                });

                managerExport.on('export-complete', function(){
                    $scope.state.open_secret_requests = 0;
                    $scope.state.closed_secret_request = 0;
                    $scope.state.download_ongoing = false;
                });
            }

            /**
             * Exports all data of a datastore
             *
             * @param type The type of the export
             */
            function export_datastore(type) {
                $scope.msgs = [];
                $scope.errors = [];

                var onSuccess = function (data) {
                    $scope.msgs = data.msgs;
                    $scope.errors = [];
                };
                var onError = function (data) {
                    $scope.msgs = [];
                    $scope.errors = data.errors;
                };

                managerExport.export_datastore(type)
                    .then(onSuccess, onError);
            }
        }]
    );
}(angular));