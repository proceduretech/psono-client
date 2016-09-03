(function(angular, uuid) {
    'use strict';

    var managerDatastorePassword = function($q, $rootScope, managerSecret, managerDatastore, managerShare, passwordGenerator, itemBlueprint, helper) {


        /**
         * Takes a "share" object that has share rights and inherited share rights.
         * Out of those the function calculates the total rights and returns them
         *
         * @param share
         * @returns {{read: boolean, write: boolean, grant: boolean}}
         */
        var calculate_user_share_rights = function(share) {

            var i;
            var rights = {
                'read': false,
                'write': false,
                'grant': false
            };

            if (share.user_share_rights.length > 0) {
                for (i = share.user_share_rights.length - 1; i >= 0; i--) {
                    rights['read'] = rights['read'] || share.user_share_rights[i].read;
                    rights['write'] = rights['write'] || share.user_share_rights[i].write;
                    rights['grant'] = rights['grant'] || share.user_share_rights[i].grant;
                }
            } else {
                for (i = share.user_share_rights_inherited.length - 1; i >= 0; i--) {
                    rights['read'] = rights['read'] || share.user_share_rights_inherited[i].read;
                    rights['write'] = rights['write'] || share.user_share_rights_inherited[i].write;
                    rights['grant'] = rights['grant'] || share.user_share_rights_inherited[i].grant;
                }
            }

            return rights;
        };


        /**
         * Sets the share_rights for folders and items, based on the users rights on the share.
         * Calls recursive itself in case it finds another share
         *
         * @param obj
         * @param parent_share_id
         * @param parent_datastore_id
         */
        var update_share_rights_of_folders_and_items = function(obj, parent_share_id, parent_datastore_id) {
            var n;
            var share_rights = {
                    'read': true,
                    'write': true,
                    'grant': true,
                    'delete': true
                };

            var new_parent_share_id = parent_share_id;

            if (obj.hasOwnProperty('share_id')) {
                new_parent_share_id = obj['share_id'];
            }

            if (!obj.hasOwnProperty('datastore_id')) {
                share_rights['read'] = obj['share_rights']['read'];
                share_rights['write'] = obj['share_rights']['write'];
                share_rights['grant'] = obj['share_rights']['grant'] && obj['share_rights']['write'];
                share_rights['delete'] = obj['share_rights']['write'];
            }

            // check all folders recursive
            if (obj.hasOwnProperty('folders')) {
                for (n = 0; n < obj.folders.length; n++) {
                    if (obj.folders[n].hasOwnProperty('share_id')) {
                        continue;
                    }
                    obj.folders[n]['share_rights'] = share_rights;
                    obj.folders[n]['parent_share_id'] = new_parent_share_id;
                    obj.folders[n]['parent_datastore_id'] = parent_datastore_id;
                    update_share_rights_of_folders_and_items(obj.folders[n], new_parent_share_id, parent_datastore_id);
                }
            }
            // check all items
            if (obj.hasOwnProperty('items')) {
                for (n = 0; n < obj.items.length; n++) {
                    if (obj.items[n].hasOwnProperty('share_id')) {
                        continue;
                    }
                    obj.items[n]['share_rights'] = share_rights;
                    obj.items[n]['parent_share_id'] = new_parent_share_id;
                    obj.items[n]['parent_datastore_id'] = parent_datastore_id;
                }
            }
        };


        /**
         * updates some datastore folders or share folders with content
         *
         * @param datastore
         * @param path
         * @param content the actual data for this path
         * @param parent_share_rights
         * @param parent_share_id
         * @param parent_datastore_id
         */
        var update_paths_with_data = function(datastore, path, content, parent_share_rights, parent_share_id, parent_datastore_id) {
            var path_copy = path.slice();
            var search = find_in_datastore(path_copy, datastore);
            var obj = search[0][search[1]];

            // update share_rights in share object
            obj['share_rights'] = calculate_user_share_rights(content);
            obj['parent_share_id'] = parent_share_id;
            obj['parent_datastore_id'] = parent_datastore_id;
            obj['share_rights']['delete'] = parent_share_rights['write'];

            // update data (folder and items) in share object
            for (var prop in content.data) {
                if (!content.data.hasOwnProperty(prop)) {
                    continue;
                }
                obj[prop] = content.data[prop];
            }

            // update share_rights in folders and items
            update_share_rights_of_folders_and_items(obj, parent_share_id, parent_datastore_id);
        };

        /**
         * queries shares recursive
         *
         * @param datastore
         * @param share_rights_dict
         * @param share_index
         * @param all_share_data
         * @param [blocking]
         * @returns {*}
         */
        var read_shares = function(datastore, share_rights_dict, share_index, all_share_data, blocking) {
            var open_calls = 0;
            var all_calls = [];
            var rights;

            var parent_share_rights = {
                'read': true,
                'write': true,
                'grant': false,
                'delete': false
            };

            var read_shares_recursive = function(datastore, share_rights_dict, share_index, all_share_data, parent_share_rights, parent_share_id, parent_datastore_id) {
                if (typeof share_index === 'undefined') {
                    return datastore;
                }

                for (var share_id in share_index) {
                    if (!share_index.hasOwnProperty(share_id)) {
                        continue;
                    }

                    for (var i = share_index[share_id].paths.length - 1; i >= 0; i--) {
                        var path_copy = share_index[share_id].paths[i].slice();
                        var search = find_in_datastore(path_copy, datastore);
                        var sub_datastore = search[0][search[1]];

                        // Test if we already have it cached
                        if (all_share_data.hasOwnProperty(share_id)) {
                            update_paths_with_data(datastore, share_index[share_id].paths[i], all_share_data[share_id], parent_share_rights, parent_share_id, parent_datastore_id);
                            continue;
                        }

                        // Let's check if we have read writes for this share, and skip it if we don't have read writes
                        if (!share_rights_dict.hasOwnProperty(share_id) || !share_rights_dict[share_id].read) {

                            //update path with empty data, necessary to get the rights as well
                            var content = {
                                'user_share_rights': [{
                                    'read': share_rights_dict[share_id].read,
                                    'write': share_rights_dict[share_id].write,
                                    'grant': share_rights_dict[share_id].grant
                                }]
                            };

                            console.log(share_rights_dict[share_id]);
                            update_paths_with_data(datastore, share_index[share_id].paths[i], content, parent_share_rights, parent_share_id, parent_datastore_id);
                            continue;
                        }

                        all_calls.push((function (share_id, sub_datastore, path) {
                            var onSuccess = function (content) {
                                all_share_data[share_id] = content;

                                update_paths_with_data(datastore, path, content, parent_share_rights, parent_share_id, parent_datastore_id);

                                rights = calculate_user_share_rights(content);

                                read_shares_recursive(sub_datastore, share_rights_dict, content.data.share_index, all_share_data, rights, share_id, parent_datastore_id);
                                open_calls--;
                            };

                            var onError = function () {
                                open_calls--;
                            };
                            open_calls++;
                            return managerShare.read_share(share_id, share_index[share_id].secret_key)
                                .then(onSuccess, onError);
                        })(share_id, sub_datastore, share_index[share_id].paths[i]));

                    }
                }
            };

            // Read shares recursive. We start from the datastore, so delete is allowed in the datastore
            read_shares_recursive(datastore, share_rights_dict, share_index, all_share_data, parent_share_rights, undefined, datastore.datastore_id);
            update_share_rights_of_folders_and_items(datastore);

            if (blocking) {
                return $q.all(all_calls).then(function (ret) {
                    return $q(function(resolve) {
                        $rootScope.$watch(function() {
                            return open_calls;
                        }, function watchCallback(open_calls) {
                            if (open_calls == 0) {
                                resolve(datastore);
                            }
                        });
                    });
                });
            } else {
                return datastore;
            }
        };

        /**
         * searches all sub shares and hides the content of those
         *
         * @param share
         */
        var hide_sub_share_content = function (share) {

            var allowed_props = ['id', 'name', 'share_id', 'share_secret_key'];

            for (var share_id in share.share_index) {
                if (!share.share_index.hasOwnProperty(share_id)) {
                    continue;
                }

                for (var i = share.share_index[share_id].paths.length - 1; i >= 0; i--) {
                    var path_copy = share.share_index[share_id].paths[i].slice();
                    var search = find_in_datastore(path_copy, share);

                    var obj = search[0][search[1]];

                    for (var prop in obj) {
                        if (!obj.hasOwnProperty(prop)) {
                            continue;
                        }
                        if (allowed_props.indexOf(prop) > -1) {
                            continue;
                        }
                        delete obj[prop];
                    }
                }
            }

        };


        /**
         * Returns the password datastore. In addition this function triggers the generation of the local datastore
         * storage to
         *
         * @param [blocking]
         * @returns {promise}
         */
        var get_password_datastore = function(blocking) {
            var type = "password";
            var description = "default";


            var onSuccess = function (datastore) {

                var onSuccess = function (data) {

                    var share_rights_dict = {};
                    for (var i = data.share_rights.length - 1; i >= 0; i--) {
                        share_rights_dict[data.share_rights[i].share_id] = data.share_rights[i];
                    }
                    managerDatastore.fill_storage('datastore-password-leafs', datastore, [
                        ['key', 'secret_id'],
                        ['secret_id', 'secret_id'],
                        ['value', 'secret_key'],
                        ['name', 'name'],
                        ['urlfilter', 'urlfilter'],
                        ['search', 'urlfilter']

                    ]);

                    return read_shares(datastore, share_rights_dict, datastore.share_index, {}, blocking);

                };

                var onError = function () {
                    // pass
                };

                return managerShare.read_share_rights_overview()
                    .then(onSuccess, onError);
            };
            var onError = function () {
                // pass
            };

            return managerDatastore.get_datastore(type, description)
                .then(onSuccess, onError);
        };

        /**
         * Saves the password datastore with given content (including shares) based on the "paths" of all changed
         * elements
         *
         * Responsible for hiding content that doesn't belong into the datastore (like the content of secrets).
         *
         * @param datastore The real object you want to encrypt in the datastore
         * @param paths The list of paths to the changed elements
         */
        var save_datastore = function (datastore, paths) {
            var type = "password";
            var description = "default";

            // datastore has changed, so lets regenerate local lookup
            managerDatastore.fill_storage('datastore-password-leafs', datastore, [
                ['key', 'secret_id'],
                ['value', 'secret_key'],
                ['name', 'name'],
                ['urlfilter', 'urlfilter']
            ]);

            datastore = managerDatastore.filter_datastore_content(datastore);

            var closest_shares = {};

            for (var i = paths.length - 1; i >= 0; i--) {

                var closest_share = managerShare.get_closest_parent_share(paths[i], datastore, datastore, 0);
                if (typeof closest_share.id === 'undefined') {
                    // its the datastore
                    closest_shares['datastore'] = datastore;
                } else {
                    closest_shares[closest_share.id] = closest_share;
                }
            }

            for (var prop in closest_shares) {

                if (!closest_shares.hasOwnProperty(prop)) {
                    continue;
                }

                var duplicate = helper.duplicate_object(closest_shares[prop]);
                hide_sub_share_content(duplicate);

                if (prop === 'datastore') {
                    managerDatastore.save_datastore(type, description, duplicate);
                } else {
                    var share_id = duplicate.share_id;
                    var secret_key = duplicate.share_secret_key;

                    delete duplicate.share_id;
                    delete duplicate.secret_key;
                    delete duplicate.share_rights;

                    managerShare.write_share(share_id, duplicate, secret_key);
                }
            }
        };

        /**
         * Generates a new password for a given url and saves the password in the datastore.
         * Returns a promise with the new password
         *
         * @returns {promise}
         */
        var generatePassword = function(url) {

            var password = passwordGenerator.generate();

            var parsed_url = helper.parse_url(url);

            var secret_object = {
                website_password_title: "Generated for " + parsed_url.authority,
                website_password_url: url,
                website_password_username: "",
                website_password_password: password,
                website_password_notes: "",
                website_password_auto_submit: false,
                website_password_url_filter: parsed_url.authority
            };

            var link_id = uuid.v4();

            var onError = function(result) {
                // pass
            };

            var onSuccess = function (datastore) {

                managerSecret.create_secret(secret_object, link_id, datastore.datastore_id, null)
                    .then(function(data) {
                        var datastore_object = {
                            id: link_id,
                            type: 'website_password',
                            name: "Generated for " + parsed_url.authority,
                            urlfilter: parsed_url.authority,
                            secret_id: data.secret_id,
                            secret_key: data.secret_key
                        };

                        datastore.items.push(datastore_object);

                        save_datastore(datastore);
                    }, onError);
            };

            get_password_datastore()
                .then(onSuccess, onError);

            // we return a promise. We do not yet have a proper error handling and returning
            // a promise might make it easier later to wait or fix errors
            return $q(function (resolve) {
                resolve(password);
            });
        };

        /**
         * Generates a password for the active tab
         *
         * @returns {promise}
         */
        var generatePasswordActiveTab = function() {

            var onError = function() {
                alert("could not find out the url of the active tab");
            };

            var onSuccess = function(url) {


                var onError = function(result) {
                    //pass
                };
                var onSuccess = function(password) {

                    browserClient.emitSec('fillpassword-active-tab', {password: password});

                    return password;
                };

                return generatePassword(url)
                    .then(onSuccess, onError);

            };

            return browserClient.getActiveTabUrl()
                .then(onSuccess, onError);

        };


        /**
         * Go through the datastore to find the object specified with the path
         *
         * @param path The path to the object you search as list of ids
         * @param datastore The datastore object tree
         * @returns {*} False if not present or a list of two objects where the first is the List Object (items or folder container) containing the searchable object and the second the index
         */
        var find_in_datastore = function (path, datastore) {

            var to_search = undefined;

            var i, n, l;

            var rest = [];
            for (i = 0, l = path.length; i < l; i++) {
                if (i == 0) {
                    to_search = path[i];
                } else {
                    rest.push(path[i]);
                }
            }

            if (rest.length == 0) {
                // found the parent
                // check if the object is a folder, if yes return the folder list and the index
                if (datastore.hasOwnProperty('folders')) {
                    for (n = 0, l = datastore.folders.length; n < l; n++) {
                        if (datastore.folders[n].id == to_search) {
                            return [datastore.folders, n];
                            // datastore.folders.splice(n, 1);
                            // return true;
                        }
                    }
                }
                // check if its a file, if yes return the file list and the index
                if (datastore.hasOwnProperty('items')) {
                    for (n = 0, l = datastore.items.length; n < l; n++) {
                        if (datastore.items[n].id == to_search) {
                            return [datastore.items, n];
                            // datastore.items.splice(n, 1);
                            // return true;
                        }
                    }
                }
                // something went wrong, couldn't find the file / folder here
                return false;
            }

            for (n = 0, l= datastore.folders.length; n < l; n++) {
                if (datastore.folders[n].id == to_search) {
                    return find_in_datastore(rest, datastore.folders[n]);
                }
            }
            return false;
        };

        /**
         * fills other_children with all child shares of a given path
         *
         * @param path
         * @param [datastore] optional if obj provided
         * @param other_children
         * @param [int] share_distance the distance in shares to search (-1 = unlimited search, 0 stop search)
         * @param [obj] optional if datastore provided (because then its searched in the datastore)
         */
        var get_all_child_shares = function(path, datastore, other_children, share_distance, obj) {

            if (share_distance === 0) {
                return
            }

            if (typeof obj === 'undefined') {
                var path_copy = path.slice();
                var search = find_in_datastore(path_copy, datastore);
                obj = search[0][search[1]];
                return get_all_child_shares(path, datastore, other_children, share_distance, obj)
            } else if (obj === false) {
                // TODO Handle not found
                alert("HANDLE not found!");
            } else {
                if (!obj.hasOwnProperty('folders')) {
                    return;
                }
                for (var n = 0, l = obj.folders.length; n < l; n++) {
                    var new_path = path.slice();
                    new_path.push(obj.folders[n].id);
                    if (typeof(obj.folders[n].share_id) !== 'undefined') {
                        other_children.push({
                            share: obj.folders[n],
                            path: new_path
                        });
                        get_all_child_shares(new_path, obj, other_children, share_distance-1, obj.folders[n]);
                    } else {
                        get_all_child_shares(new_path, obj, other_children, share_distance, obj.folders[n]);
                    }
                }
            }
        };

        /**
         *
         * returns all secret links in element. Doesn't cross share borders.
         *
         * @param {obj} element the element to search
         * @returns {Array}
         */
        var get_all_secret_links = function(element) {

            var links = [];

            /**
             * helper function, that searches an element recursive for secret links. Doesn't cross share borders.
             *
             * @param {obj } element the element to search
             * @param {Array} links
             * @param {Array} path
             */
            var get_all_secret_links_recursive = function(element, links, path) {
                var n, l;
                var new_path = path.slice();
                new_path.push(element.id);

                // check if the element itself, is a link to a secret
                if (element.hasOwnProperty('secret_id')) {
                    links.push({
                        id: element.id,
                        path: path
                    });
                }

                // search items recursive, skip shares
                if (element.hasOwnProperty('items')) {
                    for (n = 0, l = element.items.length; n < l; n++) {
                        if (element.items[n].hasOwnProperty('share_id')) {
                            continue;
                        }
                        get_all_secret_links_recursive(element.items[n], links, new_path);
                    }
                }

                // search folders recursive, skip shares
                if (element.hasOwnProperty('folders')) {
                    for (n = 0, l = element.folders.length; n < l; n++) {
                        if (element.folders[n].hasOwnProperty('share_id')) {
                            continue;
                        }
                        get_all_secret_links_recursive(element.folders[n], links, new_path);
                    }
                }
            };

            get_all_secret_links_recursive(element, links, []);

            return links;
        };

        /**
         * returns the relative path
         *
         * @param share
         * @param absolute_path
         * @returns {Array}
         */
        var get_relative_path = function(share, absolute_path) {

            var path_copy = absolute_path.slice();

            // lets create the relative path in the share
            var relative_path = [];

            if (typeof share.id === 'undefined') {
                // we have the datastore, so we need the complete path
                relative_path = path_copy;
            } else {
                var passed = false;
                for (var i = 0, l = path_copy.length; i < l; i++) {
                    if (passed) {
                        relative_path.push(path_copy[i]);
                    } else if (share.id == path_copy[i]) {
                        passed = true;
                    }
                }
            }

            return relative_path
        };


        /**
         * triggered once a new share is added. Searches the datastore for the closest share (or the datastore if no
         * share) and adds it to the share_index
         *
         * @param share_id
         * @param path path to the new share
         * @param datastore
         * @param distance
         * @returns {*[]} paths to update
         */
        var on_share_added = function (share_id, path, datastore, distance) {

            var changed_paths = [];
            var i, l;

            var path_copy = path.slice();
            var path_copy2 = path.slice();
            var path_copy3 = path.slice();
            var path_copy4 = path.slice();

            var parent_share = managerShare.get_closest_parent_share(path_copy, datastore, datastore, distance);

            // create share_index object if not exists
            if (typeof(parent_share.share_index) == 'undefined') {
                parent_share.share_index = {};
            }

            // add the the entry for the share in the share_index if not yet exists
            if (typeof(parent_share.share_index[share_id]) == 'undefined') {

                var search = find_in_datastore(path_copy2, datastore);
                var share = search[0][search[1]];

                parent_share.share_index[share_id] = {
                    paths: [],
                    secret_key: share.share_secret_key
                };
            }

            var parent_share_path = [];
            for (i = 0, l = path_copy3.length; i < l; i++) {
                if (typeof parent_share.id === 'undefined' || path_copy3[i] === parent_share.id) {
                    break;
                }
                parent_share_path.push(path_copy3[i]);
            }
            changed_paths.push(parent_share_path);

            // lets create the relative path in the share
            var relative_path = get_relative_path(parent_share, path_copy3);

            parent_share.share_index[share_id].paths.push(relative_path);

            var share_changed = false;

            for (var old_share_id in parent_share.share_index) {
                if (!parent_share.share_index.hasOwnProperty(old_share_id)) {
                    continue;
                }
                if (old_share_id === share_id) {
                    continue;
                }

                for (i = 0, l = parent_share.share_index[old_share_id].paths.length; i < l; i++) {
                    if (!helper.array_starts_with(parent_share.share_index[old_share_id].paths[i], relative_path)) {
                        continue;
                    }
                    var new_relative_path = parent_share.share_index[old_share_id].paths[i].slice(relative_path.length);

                    parent_share.share_index[old_share_id].paths.splice(i, 1);

                    if (typeof(share.share_index) == 'undefined') {
                        share.share_index = {};
                    }

                    if (typeof(share.share_index[old_share_id]) == 'undefined') {
                        share.share_index[old_share_id] = {
                            paths: [],
                            secret_key: parent_share.share_index[old_share_id].secret_key
                        };
                    }
                    share.share_index[old_share_id].paths.push(new_relative_path);

                    if (parent_share.share_index[old_share_id].paths.length == 0) {
                        delete parent_share.share_index[old_share_id];
                    }

                    if (Object.keys(parent_share.share_index).length == 0) {
                        delete parent_share.share_index;
                    }
                    share_changed = true;
                }
            }

            if (share_changed) {
                changed_paths.push(path_copy4);
            }

            return changed_paths
        };

        /**
         * triggered once a new share is deleted. Searches the datastore for the closest share (or the datastore if no
         * share) and removes it from the share_index
         *
         * @param share_id the share_id to delete
         * @param path path to the deleted share
         * @param datastore
         * @param distance
         * @returns {*[]} paths to update
         */
        var on_share_deleted = function (share_id, path, datastore, distance) {

            var path_copy = path.slice();
            var parent_share = managerShare.get_closest_parent_share(path_copy, datastore, datastore, distance);
            var relative_path = get_relative_path(parent_share, path.slice());

            /**
             * The function that actually adjusts the share_index object and deletes the shares
             *
             * @param share the share holding the share_index
             * @param share_id the share_id of the share, that we want to remove from the share_index
             * @param relative_path the relative path inside the share
             */
            var delete_from_share_index = function(share, share_id, relative_path) {

                var already_found = false;

                for (var i = share.share_index[share_id].paths.length - 1; i >= 0; i--) {
                    // delete the path from the share index entry
                    if (helper.array_starts_with(share.share_index[share_id].paths[i], relative_path)) {
                        share.share_index[share_id].paths.splice(i, 1);
                        already_found = true;
                    }
                    // if no paths are empty, we delete the whole share_index entry
                    if (share.share_index[share_id].paths.length == 0) {
                        delete share.share_index[share_id];
                    }
                    // if the share_index holds no entries anymore, we delete the share_index
                    if (Object.keys(share.share_index).length == 0) {
                        delete share.share_index;
                    }
                    
                    if (already_found) {
                        return;
                    }
                }
            };

            // Share_id specified, so lets delete the specified one
            delete_from_share_index(parent_share, share_id, relative_path);

            return [path]
        };

        /**
         * triggered once a share moved. handles the update of the share_index
         *
         * @param share_id
         * @param old_path
         * @param new_path
         * @param datastore
         * @param add_distance
         * @param delete_distance
         * @returns {*[]} paths to update
         */
        var on_share_moved = function(share_id, old_path, new_path, datastore, add_distance, delete_distance) {

            var paths_updated1 = on_share_added(share_id, new_path, datastore, add_distance);
            var paths_updated2 = on_share_deleted(share_id, old_path, datastore, delete_distance);

            return paths_updated1.concat(paths_updated2);

        };

        itemBlueprint.register('generate', passwordGenerator.generate);
        itemBlueprint.register('get_password_datastore', get_password_datastore);
        itemBlueprint.register('save_datastore', save_datastore);
        itemBlueprint.register('find_in_datastore', find_in_datastore);
        itemBlueprint.register('on_share_added', on_share_added);

        return {
            get_password_datastore: get_password_datastore,
            save_datastore: save_datastore,
            generatePassword: generatePassword,
            generatePasswordActiveTab: generatePasswordActiveTab,
            find_in_datastore: find_in_datastore,
            get_all_child_shares: get_all_child_shares,
            get_all_secret_links: get_all_secret_links,
            on_share_added: on_share_added,
            on_share_moved: on_share_moved,
            on_share_deleted: on_share_deleted
        };
    };

    var app = angular.module('passwordManagerApp');
    app.factory("managerDatastorePassword", ['$q', '$rootScope', 'managerSecret', 'managerDatastore', 'managerShare', 'passwordGenerator', 'itemBlueprint', 'helper', managerDatastorePassword]);

}(angular, uuid));