(function (angular, uuid) {
    'use strict';

    /**
     * managerAdfWidget is a base class for adf widgets
     *
     */

    var managerAdfWidget = function ($modal, managerDatastorePassword, managerShare, managerSecret, managerShareLink,
                                     managerSecretLink, itemBlueprint) {


        /**
         * Opens the modal to create a new folder
         *
         * @param parent The parent of the new folder
         * @param path The path to the parent of the new folder
         * @param data_structure the data structure
         * @param manager manager responsible for
         */
        var openNewFolder = function (parent, path, data_structure, manager) {

            var modalInstance = $modal.open({
                templateUrl: 'view/modal-new-folder.html',
                controller: 'ModalNewFolderCtrl',
                resolve: {
                    parent: function () {
                        return parent;
                    },
                    path: function () {
                        return path;
                    }
                }
            });

            modalInstance.result.then(function (name) {
                if (typeof parent === 'undefined') {
                    parent = data_structure;
                }

                if (typeof parent.folders === 'undefined') {
                    parent.folders = [];
                }
                parent.folders.push({
                    id: uuid.v4(),
                    name: name
                });

                manager.save_datastore(data_structure, [path]);

            }, function () {
                // cancel triggered
            });
        };

        /**
         * Opens the modal to edit a folder
         *
         * @param node The node you want to edit
         * @param path The path to the node
         * @param data_structure the data structure
         * @param manager manager responsible for
         * @param size The size of the modal
         */
        var openEditFolder = function (node, path, data_structure, manager, size) {

            var modalInstance = $modal.open({
                templateUrl: 'view/modal-edit-folder.html',
                controller: 'ModalEditFolderCtrl',
                size: size,
                resolve: {
                    node: function () {
                        return node;
                    },
                    path: function () {
                        return path;
                    }
                }
            });

            modalInstance.result.then(function (name) {
                node.name = name;

                manager.save_datastore(data_structure, [path]);

            }, function () {
                // cancel triggered
            });
        };

        /**
         * Opens the modal for a new entry
         *
         * @param datastore
         * @param parent
         * @param path
         * @param size
         */
        var openNewItem = function (datastore, parent, path, size) {
            var modalInstance = $modal.open({
                templateUrl: 'view/modal-new-entry.html',
                controller: 'ModalDatastoreNewEntryCtrl',
                size: size,
                resolve: {
                    parent: function () {
                        return parent;
                    },
                    path: function () {
                        return path;
                    }
                }
            });

            modalInstance.result.then(function (content) {

                if (typeof parent === 'undefined') {
                    parent = datastore;
                }

                if (typeof parent.items === 'undefined') {
                    parent.items = [];
                }
                var link_id = uuid.v4();

                var datastore_object = {
                    id: link_id,
                    type: content.id
                };
                var secret_object = {};

                if (itemBlueprint.get_blueprint(content.id).getName) {
                    datastore_object.name = itemBlueprint.get_blueprint(content.id).getName(content.fields);
                }

                for (var i = content.fields.length - 1; i >= 0; i--) {

                    if (!content.fields[i].hasOwnProperty("value")) {
                        continue;
                    }
                    if (!datastore_object.name && content.title_field == content.fields[i].name) {
                        datastore_object.name = content.fields[i].value;
                    }
                    if (content.hasOwnProperty("urlfilter_field")
                        && content.urlfilter_field == content.fields[i].name) {
                        datastore_object.urlfilter = content.fields[i].value;
                    }
                    secret_object[content.fields[i].name] = content.fields[i].value;
                }

                var onError = function(result) {
                    // pass
                };

                var closest_share = managerShare.get_closest_parent_share(path.slice(), datastore,
                    datastore, 0);

                var parent_share_id, parent_datastore_id;

                if (closest_share.hasOwnProperty('share_id')) {
                    parent_share_id = closest_share['share_id'];
                } else {
                    parent_datastore_id = closest_share['datastore_id'];
                }

                var onSuccess = function(e) {
                    datastore_object['secret_id'] = e.secret_id;
                    datastore_object['secret_key'] = e.secret_key;

                    parent.items.push(datastore_object);

                    managerDatastorePassword.save_datastore(datastore, [path]);
                };

                managerSecret.create_secret(secret_object, link_id, parent_datastore_id, parent_share_id)
                    .then(onSuccess, onError);

            }, function () {
                // cancel triggered
            });
        };

        /**
         * Opens the modal for a the edit entry
         *
         * @param datastore
         * @param node
         * @param path
         * @param size
         */
        var openEditItem = function(datastore, node, path, size) {

            var onError = function(result) {
                // pass
            };

            var onSuccess = function(data) {

                var modalInstance = $modal.open({
                    templateUrl: 'view/modal-edit-entry.html',
                    controller: 'ModalEditEntryCtrl',
                    size: size,
                    resolve: {
                        node: function () {
                            return node;
                        },
                        path: function () {
                            return path;
                        },
                        data: function () {
                            return data;
                        }
                    }
                });

                modalInstance.result.then(function (content) {

                    var secret_object = {};

                    for (var i = content.fields.length - 1; i >= 0; i--) {

                        if (!content.fields[i].hasOwnProperty("value")) {
                            continue;
                        }
                        if (content.title_field == content.fields[i].name) {
                            node.name = content.fields[i].value;
                        }
                        if (content.hasOwnProperty("urlfilter_field")
                            && content.urlfilter_field == content.fields[i].name) {
                            node.urlfilter = content.fields[i].value;
                        }
                        secret_object[content.fields[i].name] = content.fields[i].value;
                    }

                    var onError = function(result) {
                        // pass
                    };

                    var onSuccess = function(e) {
                        managerDatastorePassword.save_datastore(datastore, [path]);
                    };

                    managerSecret.write_secret(node.secret_id, node.secret_key, secret_object)
                        .then(onSuccess, onError);

                }, function () {
                    // cancel triggered
                });
            };

            managerSecret.read_secret(node.secret_id, node.secret_key)
                .then(onSuccess, onError);
        };



        /**
         * Move an item
         *
         * @param datastore the scope
         * @param item_path the path of the item
         * @param target_path the path where we want to put the item
         * @param type type of the item (item or folder)
         */
        var moveItem = function(datastore, item_path, target_path, type) {

            /**
             * takes any element like shares, folders, items ... and checks if they can be moved
             *
             * @param element
             * @param target
             * @returns {boolean}
             */
            var canMove = function(element, target) {
                var i;

                /**
                 * our little helper function that actually checks if an element can be moved
                 *
                 * @param element
                 * @param target
                 * @returns {boolean}
                 */
                var canMoveHelper = function(element, target) {

                    // prevent the move of shares without grant rights into different shares
                    if (element.share_rights.grant == false && element.hasOwnProperty('parent_share_id')
                        && target.hasOwnProperty('share_id') && target['share_id'] !== element['parent_share_id']) {

                        alert("Sorry, but you you cannot move a share without grant rights into another share.");
                        return false;
                    }


                    // prevent the move of shares without grant rights into different shares
                    if (element.share_rights.grant == false && element.hasOwnProperty('parent_share_id')
                        && !target.hasOwnProperty('share_id') && target.hasOwnProperty('parent_share_id') && target['parent_share_id'] !== element['parent_share_id']) {

                        alert("Sorry, but you you cannot move a share without grant rights into another share.");
                        return false;
                    }

                    return true;
                };

                // Start of the actual rights checking

                // prevent the move of anything into a target without right writes
                if (target.hasOwnProperty("share_rights") && target.share_rights.write == false) {
                    alert("Sorry, but you don't have write rights on target");
                    return false;
                }

                // we are moving a share, so its unnecessary to check any lower item / folder rights
                if (element.hasOwnProperty('share_id')) {
                    return canMoveHelper(element, target);
                }

                // checks if we maybe have an item itself
                if (element.hasOwnProperty('type')) {
                    if (canMoveHelper(element, target) == false) {
                        return false;
                    }
                }

                // checks if we have a folder with items
                if (element.hasOwnProperty('items') && element.items.length > 0) {
                    for (i = element.items.length - 1; i >= 0; i--) {
                        if (canMoveHelper(element.items[i], target) == false) {
                            return false;
                        }
                    }
                }

                // checks if we have a folder with folders
                if (element.hasOwnProperty('folders') && element.folders.length > 0) {
                    for (i = element.folders.length - 1; i >= 0; i--) {
                        if (canMove(element.folders[i], target) == false) {
                            return false;
                        }
                    }
                }

                // Nothing is blocking our move
                return true;
            };


            var i;
            var closest_parent;
            // TODO ask for confirmation

            var orig_item_path = item_path.slice();
            orig_item_path.pop();

            var orig_target_path;

            if (target_path === null) {
                orig_target_path = [];
            } else {
                orig_target_path = target_path.slice();
            }

            var target = datastore;
            if (target_path !== null) {
                // find drop zone
                var val1 = managerDatastorePassword.find_in_datastore(target_path, datastore);
                target = val1[0][val1[1]];
            }

            // find element
            var val2 = managerDatastorePassword.find_in_datastore(item_path, datastore);

            if (val2 === false) {
                return;
            }
            var element = val2[0][val2[1]];

            // check if we have folders / items array, otherwise create the array
            if (!target.hasOwnProperty(type)) {
                target[type] = [];
            }

            //prevent the move of shares if rights are not sufficient
            if (!canMove(element, target)) {
                return;
            }

            // add the element to the other folders / items
            target[type].push(element);


            // delete the array at hte current position
            val2[0].splice(val2[1], 1);

            var target_path_copy = orig_target_path.slice();
            var target_path_copy2 = orig_target_path.slice();
            var item_path_copy = orig_item_path.slice();
            target_path_copy.push(element.id);
            item_path_copy.push(element.id);

            // lets populate our child shares that we need to handle
            var child_shares = [];
            if (element.hasOwnProperty("share_id")) {
                //we moved a share
                child_shares.push({
                    share: element,
                    path: []
                });
            } else {
                managerDatastorePassword.get_all_child_shares([], datastore, child_shares, 1, element);
            }
            var secret_links = managerDatastorePassword.get_all_secret_links(element);

            // lets update for every child_share the share_index
            for (i = child_shares.length - 1; i >= 0; i--) {
                managerDatastorePassword.on_share_moved(
                    child_shares[i].share.share_id, item_path_copy.concat(child_shares[i].path),
                    target_path_copy.concat(child_shares[i].path), datastore, 1,
                    child_shares[i].path.length + 1);
            }

            // and save everything (before we update the links and might lose some necessary rights)
            managerDatastorePassword.save_datastore(datastore, [orig_item_path, orig_target_path]);

            // adjust the links for every child_share (and therefore update the rights)
            for (i = child_shares.length - 1; i >= 0; i--) {
                closest_parent = managerShare.get_closest_parent_share(
                    target_path_copy.concat(child_shares[i].path), datastore, datastore, 1
                );

                managerShareLink.on_share_moved(child_shares[i].share.id, closest_parent);
            }

            // if parent_share did not change, then we are done here
            if (element.hasOwnProperty("parent_share_id") && target.hasOwnProperty("parent_share_id")
                && (target['parent_share_id'] == element['parent_share_id']
                || (target.hasOwnProperty('share_id') && target['share_id'] == element['parent_share_id']))) {
                return;
            }

            // if parent_datastore did not change, then we are done here
            if (element.hasOwnProperty("parent_datastore_id") && target.hasOwnProperty("parent_datastore_id")
                && (target['parent_datastore_id'] == element['parent_datastore_id']
                || (target.hasOwnProperty('datatstore_id') && target['datatstore_id'] == element['parent_datastore_id']))) {
                return;
            }

            // adjust the links for every secret link (and therefore update the rights)
            for (i = secret_links.length - 1; i >= 0; i--) {
                closest_parent = managerShare.get_closest_parent_share(
                    target_path_copy2.concat(secret_links[i].path), datastore, datastore, 1
                );
                managerSecretLink.on_secret_moved(secret_links[i].id, closest_parent);
            }
            if (secret_links.length > 0) {
                managerDatastorePassword.update_parents(closest_parent, closest_parent.parent_share_id, closest_parent.parent_datastore_id);
            }
        };

        /**
         * Deletes and item from datastore
         *
         * @param datastore
         * @param item
         * @param path
         */
        var deleteItem = function(datastore, item, path) {

            var i;
            // TODO ask for confirmation

            var item_path_copy = path.slice();
            var element_path_that_changed = path.slice();
            element_path_that_changed.pop();

            var search = managerDatastorePassword.find_in_datastore(path, datastore);
            var element = search[0][search[1]];

            if (search) {
                // remove element from element holding structure (folders or items array)
                search[0].splice(search[1], 1);
            }

            // lets populate our child shares that we need to handle, e.g a we deleted a folder that contains some shares
            var child_shares = [];
            if (element.hasOwnProperty("share_id")) {
                //we deleted a share
                child_shares.push({
                    share: element,
                    path: []
                });
            } else {
                managerDatastorePassword.get_all_child_shares([], datastore, child_shares, 1, element);
            }

            var secret_links = managerDatastorePassword.get_all_secret_links(element);

            // lets update for every child_share the share_index
            for (i = child_shares.length - 1; i >= 0; i--) {
                managerDatastorePassword.on_share_deleted(
                    child_shares[i].share.share_id,
                    item_path_copy.concat(child_shares[i].path),
                    datastore,
                    child_shares[i].path.length + 1
                );
            }

            // and save everything (before we update the links and might lose some necessary rights)
            managerDatastorePassword.save_datastore(datastore, [element_path_that_changed]);

            // adjust the links for every child_share (and therefore update the rights)
            for (i = child_shares.length - 1; i >= 0; i--) {
                managerShareLink.on_share_deleted(child_shares[i].share.id);
            }
            // adjust the links for every secret link (and therefore update the rights)
            for (i = secret_links.length - 1; i >= 0; i--) {
                managerSecretLink.on_secret_deleted(secret_links[i].id);
            }
        };

        /**
         * Go through the structure to find the object specified with the path
         *
         * @param path The path to the object you search as list of ids
         * @param structure The structure object tree
         * @returns {*} False if not present or a list of two objects where the first is the List Object containing the searchable object and the second the index
         */
        var findInStructure = function (path, structure) {
            var to_search = path.shift();
            var n = undefined;

            if (path.length == 0) {
                // found the object
                // check if its a folder, if yes return the folder list and the index
                if (structure.hasOwnProperty('folders')) {
                    for (n = 0; n < structure.folders.length; n++) {
                        if (structure.folders[n].id == to_search) {
                            return [structure.folders, n];
                            // structure.folders.splice(n, 1);
                            // return true;
                        }
                    }
                }
                // check if its a file, if yes return the file list and the index
                if (structure.hasOwnProperty('items')) {
                    for (n = 0; n < structure.items.length; n++) {
                        if (structure.items[n].id == to_search) {
                            return [structure.items, n];
                            // structure.items.splice(n, 1);
                            // return true;
                        }
                    }
                }
                // something went wrong, couldn't find the file / folder here
                return false;
            }

            for (n = 0; n < structure.folders.length; n++) {
                if (structure.folders[n].id == to_search) {
                    return findInStructure(path, structure.folders[n]);
                }
            }
            return false;
        };

        /**
         * Returns the class of the icon used to display a specific item
         *
         * @param item
         * @returns {*|string}
         */
        var itemIcon = function (item) {
            var iconClassMap = {
                    txt: 'fa fa-file-text-o',
                    log: 'fa fa-file-text-o',
                    jpg: 'fa fa-file-image-o blue',
                    jpeg: 'fa fa-file-image-o blue',
                    png: 'fa fa-file-image-o orange',
                    gif: 'fa fa-file-image-o',
                    pdf: 'fa fa-file-pdf-o',
                    wav: 'fa fa-file-audio-o',
                    mp3: 'fa fa-file-audio-o',
                    wma: 'fa fa-file-audio-o',
                    avi: 'fa fa-file-video-o',
                    mov: 'fa fa-file-video-o',
                    mkv: 'fa fa-file-video-o',
                    flv: 'fa fa-file-video-o',
                    mp4: 'fa fa-file-video-o',
                    mpg: 'fa fa-file-video-o',
                    doc: 'fa fa-file-word-o',
                    dot: 'fa fa-file-word-o',
                    docx: 'fa fa-file-word-o',
                    docm: 'fa fa-file-word-o',
                    dotx: 'fa fa-file-word-o',
                    dotm: 'fa fa-file-word-o',
                    docb: 'fa fa-file-word-o',
                    xls: 'fa fa-file-excel-o',
                    xlt: 'fa fa-file-excel-o',
                    xlm: 'fa fa-file-excel-o',
                    xla: 'fa fa-file-excel-o',
                    xll: 'fa fa-file-excel-o',
                    xlw: 'fa fa-file-excel-o',
                    xlsx: 'fa fa-file-excel-o',
                    xlsm: 'fa fa-file-excel-o',
                    xlsb: 'fa fa-file-excel-o',
                    xltx: 'fa fa-file-excel-o',
                    xltm: 'fa fa-file-excel-o',
                    xlam: 'fa fa-file-excel-o',
                    csv: 'fa fa-file-excel-o',
                    ppt: 'fa fa-file-powerpoint-o',
                    pptx: 'fa fa-file-powerpoint-o',
                    zip: 'fa fa-file-archive-o',
                    tar: 'fa fa-file-archive-o',
                    gz: 'fa fa-file-archive-o',
                    '7zip': 'fa fa-file-archive-o'
                },
                defaultIconClass = 'fa fa-file-o';

            var pattern = /\.(\w+)$/,
                match = pattern.exec(item.name),
                ext = match && match[1];

            return iconClassMap[ext] || defaultIconClass;
        };

        return {
            openNewFolder: openNewFolder,
            openEditFolder: openEditFolder,
            findInStructure: findInStructure,
            openNewItem: openNewItem,
            openEditItem: openEditItem,
            moveItem: moveItem,
            deleteItem: deleteItem,
            itemIcon: itemIcon
        };
    };

    var app = angular.module('passwordManagerApp');
    app.factory("managerAdfWidget", ['$modal', 'managerDatastorePassword', 'managerShare', 'managerSecret',
        'managerShareLink', 'managerSecretLink', 'itemBlueprint', managerAdfWidget]);


    /**
     * Controller for the "New Folder" modal
     */
    app.controller('ModalNewFolderCtrl', ['$scope', '$modalInstance', 'parent', 'path',
        function ($scope, $modalInstance, parent, path) {

            $scope.parent = parent;
            $scope.path = path;
            $scope.name = '';

            /**
             * Triggered once someone clicks the save button in the modal
             */
            $scope.save = function () {

                if ($scope.newFolderForm.$invalid) {
                    return;
                }

                $modalInstance.close($scope.name);
            };

            /**
             * Triggered once someone clicks the cancel button in the modal
             */
            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };
        }]);

    /**
     * Controller for the "Edit Folder" modal
     */
    app.controller('ModalEditFolderCtrl', ['$scope', '$modalInstance', 'node', 'path',
        function ($scope, $modalInstance, node, path) {

            $scope.node = node;
            $scope.path = path;
            $scope.name = node.name;

            /**
             * Triggered once someone clicks the save button in the modal
             */
            $scope.save = function () {

                if ($scope.editFolderForm.$invalid) {
                    return;
                }

                $modalInstance.close($scope.name);
            };

            /**
             * Triggered once someone clicks the cancel button in the modal
             */
            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };
        }]);


    /**
     * Controller for the "New Entry" modal
     */
    app.controller('ModalDatastoreNewEntryCtrl', ['$scope', '$modalInstance', 'itemBlueprint', 'parent', 'path',
        function ($scope, $modalInstance, itemBlueprint, parent, path) {

            $scope.parent = parent;
            $scope.path = path;
            $scope.name = '';
            $scope.content = '';
            $scope.isCollapsed = true;

            $scope.errors = [];

            $scope.reset = function() {
                $scope.submitted = false;
            };

            $scope.bp = {
                all: itemBlueprint.get_blueprints(),
                selected: itemBlueprint.get_default_blueprint()
            };

            $scope.has_advanced = itemBlueprint.has_advanced;

            /**
             * Triggered once someone clicks the save button in the modal
             */
            $scope.save = function () {

                if ($scope.newEntryForm.$invalid) {
                    return;
                }

                $modalInstance.close($scope.bp.selected);
            };

            /**
             * Triggered once someone clicks the cancel button in the modal
             */
            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };
        }]);


    /**
     * Controller for the "Edit Entry" modal
     */
    app.controller('ModalEditEntryCtrl', ['$scope', '$modalInstance', 'itemBlueprint', 'node', 'path', 'data',
        function ($scope, $modalInstance, itemBlueprint, node, path, data) {

            $scope.node = node;
            $scope.path = path;
            $scope.name = node.name;
            $scope.content = '';
            $scope.isCollapsed = true;

            $scope.errors = [];

            $scope.reset = function() {
                $scope.submitted = false;
            };

            $scope.bp = {
                all: itemBlueprint.get_blueprints(),
                selected: itemBlueprint.get_blueprint(node.type)
            };

            for (var i = $scope.bp.selected.fields.length - 1; i >= 0; i--) {
                if (data.hasOwnProperty($scope.bp.selected.fields[i].name)) {
                    $scope.bp.selected.fields[i].value = data[$scope.bp.selected.fields[i].name];
                }
            }

            $scope.has_advanced = itemBlueprint.has_advanced;

            /**
             * Triggered once someone clicks the save button in the modal
             */
            $scope.save = function () {

                if ($scope.editEntryForm.$invalid) {
                    return;
                }

                $modalInstance.close($scope.bp.selected);
            };

            /**
             * Triggered once someone clicks the cancel button in the modal
             */
            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };

            if (typeof $scope.bp.selected.onEditModalOpen !== 'undefined') {
                $scope.bp.selected.onEditModalOpen($scope.bp.selected);
            }
        }]);


    /**
     * Controller for the "Share Entry" modal
     */
    app.controller('ModalShareEntryCtrl', ['$scope', '$modalInstance', '$modal', 'shareBlueprint', 'managerDatastoreUser', 'node', 'path', 'users', 'DTOptionsBuilder', 'DTColumnDefBuilder',
        function ($scope, $modalInstance, $modal, shareBlueprint, managerDatastoreUser, node, path, users, DTOptionsBuilder, DTColumnDefBuilder) {


            $scope.dtOptions = DTOptionsBuilder.newOptions();
            $scope.dtColumnDefs = [
                DTColumnDefBuilder.newColumnDef(0),
                DTColumnDefBuilder.newColumnDef(1).notSortable()
            ];

            $scope.node = node;
            $scope.path = path;
            $scope.users = users;
            $scope.rights = [{
                id: 'read',
                name: 'Read',
                initial_value: true
            }, {
                id: 'write',
                name: 'Write',
                initial_value: true
            }, {
                id: 'grant',
                name: 'Grant',
                initial_value: true
            }];

            $scope.selected_users = [];
            $scope.selected_rights = [];

            // fills selected_rights array with the default values
            for (var i = $scope.rights.length - 1; i >= 0; i--) {
                if ($scope.rights[i].initial_value) {
                    $scope.selected_rights.push($scope.rights[i].id);
                }
            }

            $scope.errors = [];

            /**
             * responsible to add a user to the known users datastore
             */
            $scope.addUser = function() {

                var modalInstance = $modal.open({
                    templateUrl: 'view/modal-new-entry.html',
                    controller: 'ModalShareNewEntryCtrl',
                    resolve: {
                        parent: function () {
                        },
                        path: function () {
                            return [];
                        }
                    }
                });

                modalInstance.result.then(function (content) {

                    managerDatastoreUser.get_user_datastore()
                        .then(function (parent) {

                            if (typeof parent.items === 'undefined') {
                                parent.items = [];
                            }

                            var user_object = {
                                id: uuid.v4(),
                                type: content.id,
                                data: {}
                            };

                            if (shareBlueprint.get_blueprint(content.id).getName) {
                                user_object.name = shareBlueprint.get_blueprint(content.id).getName(content.fields);
                            }

                            for (var i = content.fields.length - 1; i >= 0; i--) {

                                if (!content.fields[i].hasOwnProperty("value")) {
                                    continue;
                                }
                                if (!user_object.name && content.title_field == content.fields[i].name) {
                                    user_object.name = content.fields[i].value;
                                }
                                if (content.hasOwnProperty("urlfilter_field")
                                    && content.urlfilter_field == content.fields[i].name) {
                                    user_object.urlfilter = content.fields[i].value;
                                }
                                user_object.data[content.fields[i].name] = content.fields[i].value;
                            }

                            parent.items.push(user_object);

                            managerDatastoreUser.save_datastore(parent).then(function() {

                                $scope.users.push(user_object);
                                $scope.selected_users.push(user_object.id);
                            }, function() {
                                // TODO handle error
                            });
                        });

                }, function () {
                    // cancel triggered
                });
            };


            /**
             * responsible to toggle selections of rights and users and adding it to the selected_rights / selected_users
             * array
             *
             * @param id
             * @param type
             */
            $scope.toggleSelect = function(id, type) {

                var search_array;
                if (type === 'right') {
                    search_array = $scope.selected_rights;
                } else {
                    search_array = $scope.selected_users;
                }

                var array_index = search_array.indexOf(id);
                if (array_index > -1) {
                    //its selected, lets deselect it
                    search_array.splice(array_index, 1);
                } else {
                    search_array.push(id);
                }
            };

            /**
             * Triggered once someone clicks the save button in the modal
             */
            $scope.save = function () {
                $modalInstance.close({
                    node: $scope.node,
                    path: $scope.path,
                    users: $scope.users,
                    selected_users: $scope.selected_users,
                    rights: $scope.rights,
                    selected_rights: $scope.selected_rights
                });
            };

            /**
             * Triggered once someone clicks the cancel button in the modal
             */
            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };
        }]);


    /**
     * Controller for the "Display share rights" modal
     */
    app.controller('ModalDisplayShareRightsCtrl', ['$scope', '$modalInstance', 'itemBlueprint', 'node', 'path', 'share_details', 'managerShare', 'DTOptionsBuilder', 'DTColumnDefBuilder',
        function ($scope, $modalInstance, itemBlueprint, node, path, share_details, managerShare, DTOptionsBuilder, DTColumnDefBuilder) {

            $scope.dtOptions = DTOptionsBuilder.newOptions();
            $scope.dtColumnDefs = [
                DTColumnDefBuilder.newColumnDef(0),
                DTColumnDefBuilder.newColumnDef(1),
                DTColumnDefBuilder.newColumnDef(2),
                DTColumnDefBuilder.newColumnDef(3),
                DTColumnDefBuilder.newColumnDef(4),
                DTColumnDefBuilder.newColumnDef(5).notSortable()
            ];

            $scope.node = node;
            $scope.path = path;
            $scope.name = node.name;
            $scope.share_details = share_details;


            /**
             * Triggered once someone clicks the cancel button in the modal
             */
            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };

            /**
             * Triggered once someone clicks on the delete button for a share right
             *
             * @param right
             */
            $scope.delete = function (right) {

                for (var i = share_details.user_share_rights.length - 1; i >= 0; i--) {
                    if (share_details.user_share_rights[i].id !== right.id) {
                        continue;
                    }

                    share_details.user_share_rights.splice(i, 1);
                    managerShare.delete_share_right(right.id);
                }
            };

            /**
             * Triggerec once someone clicks on the right toggle button for a share right
             *
             * @param type
             * @param right
             */
            $scope.toggle_right = function(type, right) {

                right[type] = !right[type];

                managerShare.update_share_right(right.share_id, right.user_id, right.read, right.write, right.grant)
            };

        }]);

}(angular, uuid));