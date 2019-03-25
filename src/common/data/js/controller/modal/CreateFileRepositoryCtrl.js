(function(angular) {
    'use strict';

    /**
     * @ngdoc controller
     * @name psonocli.controller:ModalCreateFileRepositoryCtrl
     * @requires $scope
     * @requires $q
     * @requires $uibModal
     * @requires $uibModalInstance
     * @requires psonocli.managerFileRepository
     * @requires psonocli.helper
     *
     * @description
     * Controller for the "Create File Repository" modal in Other
     */
    angular.module('psonocli').controller('ModalCreateFileRepositoryCtrl', ['$scope', '$q', '$uibModal', '$uibModalInstance',
        'managerFileRepository', 'helper',
        function ($scope, $q, $uibModal, $uibModalInstance,
                  managerFileRepository, helper) {

            $scope.errors = [];
            $scope.title = '';
            $scope.types = managerFileRepository.get_possible_types();
            $scope.selected_type = '';
            $scope.storage_config = {

            };

            $scope.cancel = cancel;
            $scope.save = save;

            activate();

            function activate() {

            }

            /**
             * @ngdoc
             * @name psonocli.controller:ModalCreateFileRepositoryCtrl#save
             * @methodOf psonocli.controller:ModalCreateFileRepositoryCtrl
             *
             * @description
             * Triggered once someone clicks the save button in the modal
             */
            function save() {
                $scope.errors = [];

                if (!$scope.title) {
                    $scope.errors.push('TITLE_IS_REQUIRED');
                    return;
                }

                if (!$scope.selected_type) {
                    $scope.errors.push('TYPE_IS_REQUIRED');
                    return;
                }

                if ($scope.selected_type === 'gcp_cloud_storage' && !$scope.storage_config['gcp_cloud_storage_bucket']) {
                    $scope.errors.push('BUCKET_IS_REQUIRED');
                    return;
                }

                if ($scope.selected_type === 'gcp_cloud_storage' && !$scope.storage_config['gcp_cloud_storage_json_key']) {
                    $scope.errors.push('JSON_KEY_IS_REQUIRED');
                    return;
                }

                if ($scope.selected_type === 'gcp_cloud_storage' && !helper.is_valid_json($scope.storage_config['gcp_cloud_storage_json_key'])) {
                    $scope.errors.push('JSON_KEY_IS_INVALID');
                    return;
                }


                if ($scope.modalCreateFileRepositoryForm.$invalid) {
                    return;
                }
                var onError = function(result) {
                    // pass
                };

                var onSuccess = function(result) {
                    $uibModalInstance.close();
                };

                return managerFileRepository.create_file_repository($scope.title, $scope.selected_type,
                    $scope.storage_config['gcp_cloud_storage_bucket'], $scope.storage_config['gcp_cloud_storage_json_key'])
                    .then(onSuccess, onError);
            }

            /**
             * @ngdoc
             * @name psonocli.controller:ModalCreateFileRepositoryCtrl#close
             * @methodOf psonocli.controller:ModalCreateFileRepositoryCtrl
             *
             * @description
             * Triggered once someone clicks the close button in the modal
             */
            function cancel() {
                $uibModalInstance.dismiss('close');
            }

        }]
    );
}(angular));