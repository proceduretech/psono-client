(function(angular) {
    'use strict';

    var managerShare = function(managerBase, apiClient, cryptoLibrary,
                                 itemBlueprint, helper) {

        /**
         * Returns a share object with decrypted data
         *
         * @param share_id
         * @param secret_key
         * @returns {promise}
         */
        var read_share = function(share_id, secret_key) {

            var onError = function(result) {
                // pass
            };

            var onSuccess = function(content) {
                return {
                    data: JSON.parse(cryptoLibrary.decrypt_data(content.data.data, content.data.data_nonce, secret_key)),
                    user_share_rights: content.data.user_share_rights,
                    user_share_rights_inherited: content.data.user_share_rights_inherited
                };
            };

            return apiClient.read_share(
                managerBase.get_token(),
                managerBase.get_session_secret_key(),
                share_id
            ).then(onSuccess, onError);
        };

        /**
         * Returns a list of all shares
         *
         * @returns {promise}
         */
        var read_shares = function() {

            var onError = function(result) {
                // pass
            };

            var onSuccess = function(content) {

                for (var i = content.data.shares.length - 1; i >= 0; i--) {
                    if (content.data.shares[i].share_right_title != '') {
                        content.data.shares[i].share_right_title = managerBase.decrypt_private_key(
                            content.data.shares[i].share_right_title,
                            content.data.shares[i].share_right_title_nonce,
                            content.data.shares[i].share_right_create_user_public_key
                        )
                    }
                }

                return content.data;
            };

            return apiClient.read_shares(
                managerBase.get_token(),
                managerBase.get_session_secret_key()
            ).then(onSuccess, onError);
        };

        /**
         * updates a share
         *
         * @param share_id
         * @param content
         * @param secret_key
         * @returns {promise}
         */
        var write_share = function(share_id, content, secret_key) {

            if (content.hasOwnProperty("id")) {
                delete content.id;
            }

            var json_content = JSON.stringify(content);

            var encrypted_data = cryptoLibrary.encrypt_data(json_content, secret_key);
            return apiClient.write_share(
                managerBase.get_token(),
                managerBase.get_session_secret_key(),
                share_id,
                encrypted_data.text, encrypted_data.nonce);
        };

        /**
         * Creates a share for the given content and returns the id and the secret to decrypt the share secret
         *
         * @param content
         * @param [parent_share_id]
         * @param [parent_datastore_id]
         * @param link_id
         * @returns {promise}
         */
        var create_share = function (content, parent_share_id,
                                     parent_datastore_id, link_id) {

            if (content.hasOwnProperty("id")) {
                delete content.id;
            }

            var secret_key = cryptoLibrary.generate_secret_key();

            var json_content = JSON.stringify(content);

            var encrypted_data = cryptoLibrary.encrypt_data(json_content, secret_key);
            var encrypted_key = managerBase.encrypt_secret_key(secret_key);

            var onError = function(result) {
                // pass
            };

            var onSuccess = function(content) {
                return {share_id: content.data.share_id, secret_key: secret_key};
            };

            return apiClient.create_share(managerBase.get_token(),
                managerBase.get_session_secret_key(), encrypted_data.text,
                encrypted_data.nonce, encrypted_key.text, encrypted_key.nonce, parent_share_id, parent_datastore_id, link_id)
                .then(onSuccess, onError);
        };

        /**
         * Returns share rights for a specific share
         *
         * @param share_id
         * @returns {promise}
         */
        var read_share_rights = function(share_id) {

            var onError = function(result) {
                // pass
            };

            var onSuccess = function(content) {
                return content.data;
            };

            return apiClient.read_share_rights(managerBase.get_token(),
                managerBase.get_session_secret_key(), share_id)
                .then(onSuccess, onError);
        };

        /**
         * Returns all the share rights of the current user
         *
         * @returns {promise}
         */
        var read_share_rights_overview = function() {

            var onError = function(result) {
                // pass
            };

            var onSuccess = function(content) {
                return content.data;
            };

            return apiClient.read_share_rights_overview(
                managerBase.get_token(),
                managerBase.get_session_secret_key())
                .then(onSuccess, onError);
        };

        /**
         * creates the rights for a specified share and user
         *
         * @param title
         * @param type
         * @param share_id
         * @param user_id
         * @param user_public_key
         * @param key
         * @param read
         * @param write
         * @param grant
         * @returns {promise}
         */
        var create_share_right = function(title, type, share_id, user_id, user_public_key, key, read, write, grant) {

            var onError = function(result) {
                // pass
            };

            var onSuccess = function(content) {
                return {share_right_id: content.data.share_right_id};
            };

            var encrypted_key = managerBase.encrypt_private_key(key, user_public_key);
            var encrypted_title = managerBase.encrypt_private_key(title, user_public_key);
            var encrypted_type = managerBase.encrypt_private_key(type, user_public_key);

            return apiClient.create_share_right(managerBase.get_token(),
                managerBase.get_session_secret_key(), encrypted_title.text,
                encrypted_title.nonce, encrypted_type.text,
                encrypted_type.nonce, share_id, user_id, encrypted_key.text, encrypted_key.nonce, read, write, grant)
                .then(onSuccess, onError);
        };

        /**
         * updates the rights for a specified share right and user
         *
         * @param share_id
         * @param user_id
         * @param read
         * @param write
         * @param grant
         * @returns {*}
         */
        var update_share_right = function(share_id, user_id, read, write, grant) {

            var onError = function(result) {
                // pass
            };

            var onSuccess = function(content) {
                return {share_right_id: content.data.share_right_id};
            };

            return apiClient.update_share_right(managerBase.get_token(),
                managerBase.get_session_secret_key(), share_id, user_id, read, write, grant)
                .then(onSuccess, onError);
        };

        /**
         * deletes a specific share right
         *
         * @param share_right_id
         * @returns {promise}
         */
        var delete_share_right = function(share_right_id) {

            var onError = function(result) {
                // pass
            };

            var onSuccess = function(content) {
                return {share_right_id: content.data.share_right_id};
            };

            return apiClient.delete_share_right(managerBase.get_token(),
                managerBase.get_session_secret_key(), share_right_id)
                .then(onSuccess, onError);
        };

        /**
         * accepts a specific share right
         *
         * @param share_right_id
         * @param text
         * @param nonce
         * @param public_key
         * @param link_id
         * @param parent_share_id
         * @param parent_datastore_id
         * @returns {promise}
         */
        var accept_share_right = function(share_right_id, text, nonce, public_key, link_id, parent_share_id,
                                          parent_datastore_id) {

            var secret_key = managerBase.decrypt_private_key(text, nonce, public_key);

            var onError = function(result) {
                // pass
            };

            var onSuccess = function(content) {
                var share = {};
                if (typeof content.data.share_data !== "undefined") {
                    share = JSON.parse(cryptoLibrary.decrypt_data(content.data.share_data,
                        content.data.share_data_nonce,secret_key));
                }


                if (typeof share.type == 'undefined' && typeof content.data.share_type !== "undefined") {

                    var type = managerBase.decrypt_private_key(content.data.share_type,
                        content.data.share_type_nonce, public_key);

                    if (type != 'folder') {
                        share.type = type;
                    }
                }

                share.share_id = content.data.share_id;
                share.share_secret_key = secret_key;

                return share;
            };

            var encrypted_key = managerBase.encrypt_secret_key(secret_key);

            return apiClient.accept_share_right(managerBase.get_token(),
                managerBase.get_session_secret_key(), share_right_id,
                encrypted_key.text, encrypted_key.nonce, link_id, parent_share_id, parent_datastore_id)
                .then(onSuccess, onError);
        };

        /**
         * declines a specific share right
         *
         * @param share_right_id
         * @returns {promise}
         */
        var decline_share_right = function(share_right_id) {

            var onError = function(result) {
                // pass
            };

            var onSuccess = function(content) {
                // pass
            };

            return apiClient.decline_share_right(managerBase.get_token(),
                managerBase.get_session_secret_key(), share_right_id)
                .then(onSuccess, onError);
        };

        /**
         * returns the closest share. if no share exists for the specified path, the initially specified closest_share
         * is returned.
         *
         * @param path
         * @param datastore
         * @param closest_share
         * @param distance
         * @returns {*}
         */
        var get_closest_parent_share = function(path, datastore, closest_share, distance) {

            if (path.length == distance) {
                return closest_share;
            }

            var to_search = path.shift();

            for (var n = 0, l = datastore.folders.length; n < l; n++) {
                if (datastore.folders[n].id == to_search) {
                    if (typeof(datastore.folders[n].share_id) !== 'undefined') {
                        return get_closest_parent_share(path.slice(), datastore.folders[n], datastore.folders[n], distance);
                    } else {
                        return get_closest_parent_share(path.slice(), datastore.folders[n], closest_share, distance);
                    }
                }
            }

            return false;
        };

        // registrations

        itemBlueprint.register('read_share_rights', read_share_rights);
        itemBlueprint.register('create_share', create_share);
        itemBlueprint.register('create_share_right', create_share_right);
        itemBlueprint.register('get_closest_parent_share', get_closest_parent_share);

        return {
            read_share: read_share,
            read_shares: read_shares,
            write_share: write_share,
            create_share: create_share,
            read_share_rights: read_share_rights,
            read_share_rights_overview: read_share_rights_overview,
            create_share_right: create_share_right,
            update_share_right: update_share_right,
            delete_share_right: delete_share_right,
            accept_share_right: accept_share_right,
            decline_share_right: decline_share_right,
            get_closest_parent_share: get_closest_parent_share
        };
    };

    var app = angular.module('passwordManagerApp');
    app.factory("managerShare", ['managerBase', 'apiClient', 'cryptoLibrary',
        'itemBlueprint', 'helper', managerShare]);

}(angular));