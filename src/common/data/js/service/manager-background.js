(function(angular) {
    'use strict';

    /**
     * @ngdoc service
     * @name psonocli.managerBackground
     * @requires $q
     * @requires psonocli.managerBase
     * @requires psonocli.storage
     * @requires psonocli.managerDatastorePassword
     * @requires psonocli.helper
     * @requires psonocli.apiClient
     * @requires psonocli.device
     *
     * @description
     * Service that handles the complete background process
     */
    var managerBackground = function($q, managerBase, managerSecret, storage, managerDatastorePassword, helper,
                                     cryptoLibrary, apiClient, device, browser, chrome, browserClient) {

        var last_login_credentials;
        var activeTabId;
        var hits_additional_info = {};
        var fillpassword = [];
        var already_filled_max_allowed = {};

        activate();

        function activate() {

            chrome.tabs.onActivated.addListener(function(activeInfo) {
                activeTabId = activeInfo.tabId;
            });

            chrome.omnibox.onInputChanged.addListener(on_input_changed);
            chrome.omnibox.onInputEntered.addListener(on_input_entered);
            chrome.omnibox.setDefaultSuggestion({
                description: "Search datastore: <match>%s</match>"
            });
            browser.runtime.onMessage.addListener(on_message);
            browser.webRequest.onAuthRequired.addListener(on_auth_required, {urls: ["<all_urls>"]}, ["asyncBlocking"]);
            // browser.webRequest.onBeforeRequest.addListener(on_before_request, {urls: ["<all_urls>"]}, ["blocking", "requestBody"]);
            // browser.webRequest.onBeforeSendHeaders.addListener(on_before_send_headers, {urls: ["<all_urls>"]}, ["blocking", "requestHeaders"]);

            browser.notifications.onButtonClicked.addListener(function(notificationId, buttonIndex){
                if (notificationId.startsWith('new-password-detected-')  && buttonIndex === 0) {
                    save_last_login_credentials();
                }
                chrome.notifications.clear(notificationId)
            });

            browserClient.disable_browser_password_saving();
        }

        // /*
        //  * Dummy context menu
        //  */
        // function onClick(info, tab) {
        //     console.log(JSON.stringify(info));
        //     console.log(JSON.stringify(tab));
        // }
        //
        // var contexts = [
        //     "page"
        // ];
        //
        // for (var i = 0; i < contexts.length; i++) {
        //     var context = contexts[i];
        //     var title = "My menuitem";
        //     var id = chrome.contextMenus.create({"title": title, "contexts":[context], "onclick": onClick});
        // }
        //
        //
        // // Create a parent item and two children.
        // var parent = chrome.contextMenus.create({"title": "My parent"});
        // var child1 = chrome.contextMenus.create(
        //     {"title": "My child 1", "parentId": parent, "onclick": onClick});
        // var child2 = chrome.contextMenus.create(
        //     {"title": "My child 2", "parentId": parent, "onclick": onClick});

        /*
         * Some messaging stuff
         */

        // Start helper functions

        /**
         * @ngdoc
         * @name psonocli.managerBackground#on_message
         * @methodOf psonocli.managerBackground
         *
         * @description
         * Main function to deal with messages
         *
         * @param request
         * @param sender
         * @param sendResponse
         *
         * @returns {*}
         */
        function on_message(request, sender, sendResponse) {

            var event_functions = {
                'fillpassword': on_fillpassword,
                'ready': on_ready,
                'fillpassword-active-tab': on_fillpassword_active_tab,
                'save-password-active-tab': save_password_active_tab,
                'bookmark-active-tab': bookmark_active_tab,
                'login': on_login,
                'logout': on_logout,
                'storage-reload': on_storage_reload,
                'website-password-refresh': on_website_password_refresh,
                'request-secret': on_request_secret,
                'open-tab': on_open_tab,
                'login-form-submit': login_form_submit
            };

            if (event_functions.hasOwnProperty(request.event)){
                return event_functions[request.event](request, sender, sendResponse);
            } else {
                // not catchable event
                console.log(sender.tab);
                console.log("background script received (uncaptured)    " + request.event);
            }
        }

        /**
         * @ngdoc
         * @name psonocli.managerBackground#on_ready
         * @methodOf psonocli.managerBackground
         *
         * @description
         * we received a ready event from a content script that finished loading
         * lets provide the possible passwords
         *
         * @param request
         * @param sender
         * @param sendResponse
         */
        var on_ready = function(request, sender, sendResponse) {
            if (sender.tab) {
                var url = sender.tab.url;
                var parsed_url = helper.parse_url(url);

                for(var i = fillpassword.length - 1; i >= 0; i--) {
                    if( helper.endsWith(parsed_url.authority, fillpassword[i].authority)) {
                        fillpassword[i].submit = parsed_url.scheme === 'https';
                        sendResponse({event: "fillpassword", data: fillpassword[i]});
                        fillpassword.splice(i, 1);
                        break;
                    }
                }
            }
        };

        /**
         * @ngdoc
         * @name psonocli.managerBackground#on_fillpassword
         * @methodOf psonocli.managerBackground
         *
         * @description
         * we received a fillpassword event
         * lets remember it
         *
         * @param request
         * @param sender
         * @param sendResponse
         */
        function on_fillpassword(request, sender, sendResponse) {
            fillpassword.push(request.data);
        }

        /**
         * @ngdoc
         * @name psonocli.managerBackground#on_fillpassword_active_tab
         * @methodOf psonocli.managerBackground
         *
         * @description
         * we received a fillpassword active tab event
         * lets send a fillpassword event to the to the active tab
         *
         * @param request
         * @param sender
         * @param sendResponse
         */
        function on_fillpassword_active_tab (request, sender, sendResponse) {
            if (typeof(activeTabId) === 'undefined') {
                return;
            }
            browser.tabs.sendMessage(activeTabId, {event: "fillpassword", data: request.data}, function(response) {
                // pass
            });
        }

        /**
         * @ngdoc
         * @name psonocli.managerBackground#save_password_active_tab
         * @methodOf psonocli.managerBackground
         *
         * @description
         * we received a fillpassword active tab event
         * lets send a fillpassword event to the to the active tab
         *
         * @param request
         * @param sender
         * @param sendResponse
         */
        function save_password_active_tab (request, sender, sendResponse) {
            if (typeof(activeTabId) === 'undefined') {
                return;
            }


            managerDatastorePassword.save_password_active_tab(request.data.password);
        }

        /**
         * @ngdoc
         * @name psonocli.managerBackground#bookmark_active_tab
         * @methodOf psonocli.managerBackground
         *
         * @description
         * we received a fillpassword active tab event
         * lets send a fillpassword event to the to the active tab
         *
         * @param request
         * @param sender
         * @param sendResponse
         */
        function bookmark_active_tab (request, sender, sendResponse) {
            if (typeof(activeTabId) === 'undefined') {
                return;
            }

            managerDatastorePassword.bookmark_active_tab();
        }

        /**
         * @ngdoc
         * @name psonocli.managerBackground#on_logout
         * @methodOf psonocli.managerBackground
         *
         * @description
         * we received a logout event
         * lets close all extension tabs
         *
         * @param request
         * @param sender
         * @param sendResponse
         */
        function on_logout(request, sender, sendResponse) {

            chrome.tabs.query({url: 'chrome-extension://'+chrome.runtime.id+'/*'}, function(tabs) {
                var tabids = [];
                for (var i = 0; i < tabs.length; i++) {
                    tabids.push(tabs[i].id);
                }

                chrome.tabs.remove(tabids)
            });
        }

        /**
         * @ngdoc
         * @name psonocli.managerBackground#on_storage_reload
         * @methodOf psonocli.managerBackground
         *
         * @description
         * Reloads the storage
         *
         * @param request
         * @param sender
         * @param sendResponse
         */
        function on_storage_reload(request, sender, sendResponse) {
            storage.reload();
        }

        /**
         * @ngdoc
         * @name psonocli.managerBackground#on_login
         * @methodOf psonocli.managerBackground
         *
         * @description
         * we received a login event
         *
         * @param request
         * @param sender
         * @param sendResponse
         */
        function on_login(request, sender, sendResponse) {
            // pass
        }

        /**
         * @ngdoc
         * @name psonocli.managerBackground#search_website_passwords_by_urlfilter
         * @methodOf psonocli.managerBackground
         *
         * @description
         * Returns all website passwords where the specified url matches the url filter
         *
         * @param {string} url The url to match
         * @param {boolean} only_autosubmit Only entries with autosubmit
         *
         * @returns {Array} The database objects where the url filter match the url
         */
        function search_website_passwords_by_urlfilter(url, only_autosubmit) {
            var parsed_url = helper.parse_url(url);

            var filter = function(leaf) {

                if (leaf.type !== 'website_password') {
                    return false;
                }
                if (!helper.endsWith(parsed_url.authority, leaf.urlfilter)) {
                    return false;
                }

                return !only_autosubmit || (leaf.hasOwnProperty('autosubmit') && leaf['autosubmit']);

            };

            return storage.where('datastore-password-leafs', filter);
        }

        /**
         * @ngdoc
         * @name psonocli.managerBackground#on_website_password_refresh
         * @methodOf psonocli.managerBackground
         *
         * @description
         * a page finished loading, and wants to know if we have passwords for this page to display to the customer
         * in the input popup menu
         *
         * @param request
         * @param sender
         * @param sendResponse
         */
        function on_website_password_refresh(request, sender, sendResponse) {
            var update = [];
            var leafs;

            if (!sender.tab) {
                return;
            }

            leafs = search_website_passwords_by_urlfilter(sender.tab.url, false);

            for (var ii = 0; ii < leafs.length; ii++) {
                update.push({
                    secret_id: leafs[ii].secret_id,
                    name: leafs[ii].name
                });
            }

            sendResponse({event: "website-password-update", data: update});
        }

        /**
         * @ngdoc
         * @name psonocli.managerBackground#request_secret
         * @methodOf psonocli.managerBackground
         *
         * @description
         * Reads the specified secret of the server, decrypts it and returns a promise
         *
         * @param secret_id
         * @returns {promise} Returns a promise with the decrypted secret content
         */
        function request_secret(secret_id) {
            var secret_key = managerBase.find_one_nolimit('datastore-password-leafs', secret_id);
            return managerSecret.read_secret(secret_id, secret_key);
        }

        /**
         * @ngdoc
         * @name psonocli.managerBackground#on_request_secret
         * @methodOf psonocli.managerBackground
         *
         * @description
         * some content script requested a secret
         * lets search in our localstorage for the config and the secret_key of the requested secret
         * lets request the content of the secret from our backend server
         *
         * @param request
         * @param sender
         * @param sendResponse
         *
         * @returns {boolean}
         */
        function on_request_secret(request, sender, sendResponse) {

            request_secret(request.data.secret_id)
                .then(function(data) {
                    sendResponse({event: "return-secret", data: data});
                }, function(value) {
                    // failed
                    sendResponse({event: "return-secret", data: 'fail'});
                });

            return true; // return true because of async response
        }

        /**
         * @ngdoc
         * @name psonocli.managerBackground#on_open_tab
         * @methodOf psonocli.managerBackground
         *
         * @description
         * Opens a new tab
         *
         * @param request
         * @param sender
         * @param sendResponse
         */
        function on_open_tab(request, sender, sendResponse) {
            browser.tabs.create({
                url: request.data.url
            });
        }

        /**
         * @ngdoc
         * @name psonocli.managerBackground#login_form_submit
         * @methodOf psonocli.managerBackground
         *
         * @description
         * Catches login form submits
         *
         * @param request
         * @param sender
         * @param sendResponse
         */
        function login_form_submit(request, sender, sendResponse) {
            last_login_credentials = request.data;
            last_login_credentials['url'] = sender.url;

            var existing_passwords = search_website_passwords_by_urlfilter(sender.url, false);
            if (existing_passwords.length > 0) {
                return;
            }

            browser.notifications.create('new-password-detected-' + cryptoLibrary.generate_uuid(), {
                "type": 'basic',
                "iconUrl": "img/icon-64.png",
                "title": "New Password detected",
                "message": "Do you want to save this password?",
                "contextMessage": "Psono will store the password encrypted",
                "buttons": [{"title": "Yes"}, {"title": "No"}],
                "eventTime": Date.now() + 4 * 1000
            })
        }

        /**
         * Omnibox feauture
         */

        /**
         * @ngdoc
         * @name psonocli.managerBackground#search_datastore
         * @methodOf psonocli.managerBackground
         *
         * @description
         * searches the datastore for all entries that either match the searched text either with their urlfilter or name
         * and returns the found results
         *
         * @param text
         * @returns {Array}
         */
        function search_datastore(text) {

            var password_filter = helper.get_password_filter(text);
            var hits = [];
            var datastore_entry;
            var leafs = storage.where('datastore-password-leafs', password_filter);
            for (var i = 0; i < leafs.length; i++) {
                datastore_entry = leafs[i];
                hits.push({
                    content: datastore_entry.name + ' [Secret: ' + datastore_entry.key + ']',
                    description: datastore_entry.name
                });

                hits_additional_info[datastore_entry.key] = {type: datastore_entry.type}
            }

            return hits;
        }

        /**
         * @ngdoc
         * @name psonocli.managerBackground#on_input_changed
         * @methodOf psonocli.managerBackground
         *
         * @description
         * Triggered once the input in the omnibox changes. Searches the datastore for the input and provides the
         * suggestions for the omnibox
         *
         * @param text
         * @param suggest
         */
        function on_input_changed(text, suggest) {
            suggest(search_datastore(text));
        }

        /**
         * @ngdoc
         * @name psonocli.managerBackground#on_input_entered
         * @methodOf psonocli.managerBackground
         *
         * @description
         * Triggered once someone selected a proposal in the omnibox and opens a new tab with either the selected website
         * or the datastore with a pre-filled search
         *
         * @param text
         */
        function on_input_entered(text) {
            var to_open = '';

            try {
                to_open = text.split(/Secret: /).pop().split("]")[0];
            }
            catch(err) {
                return;
            }

            if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(to_open)) {
                chrome.tabs.create({
                    url: '/data/open-secret.html#!/secret/' + hits_additional_info[to_open]['type'] + '/' + to_open
                });
            } else {
                chrome.tabs.create({
                    url: '/data/index.html#!/datastore/search/' + encodeURIComponent(to_open)
                });
            }
        }

        // var fp_nonces = {
        //     'b6251e77-ac4f-443b-b4d9-00771a38c0ec': 'OtherPassword'
        // };
        //
        // function get_redirect_url(details) {
        //     var find_me;
        //     for (var nonce in fp_nonces) {
        //         if (!fp_nonces.hasOwnProperty(nonce)) {
        //             continue;
        //         }
        //         find_me = 'psono-fp-' + nonce;
        //         if (details.url.indexOf(find_me) !== -1) {
        //             console.log("new_redirect_url_found");
        //             return details.url.replace(find_me, fp_nonces[nonce]);
        //         }
        //     }
        // }
        //
        // function get_new_request_body(request_body) {
        //     return {"formData":{"password":['OtherPassword'],"username":["UsernamePOST"]}}
        // }
        //
        // function on_before_request(details) {
        //     var return_value = {};
        //     if (details.tabId < 0 || details.url.startsWith('chrome-extension://')) {
        //         // request of an extension
        //         return return_value;
        //     }
        //     console.log("on_before_request:");
        //     var redirect_url = get_redirect_url(details);
        //     if (redirect_url) {
        //         return_value.redirectUrl = redirect_url;
        //     }
        //     var request_body = get_new_request_body(details.requestBody);
        //     if (request_body) {
        //         return_value.requestBody = request_body;
        //     }
        //     console.log(details);
        //     console.log(return_value);
        //     return return_value;
        // }
        //
        // function replace_in_request_headers(request_headers) {
        //     var find_me;
        //     for (var nonce in fp_nonces) {
        //         if (!fp_nonces.hasOwnProperty(nonce)) {
        //             continue;
        //         }
        //         find_me = 'psono-fp-' + nonce;
        //         for (var i = 0; i < request_headers.length; i++) {
        //
        //             if (request_headers[i].value.indexOf(find_me) !== -1) {
        //                 request_headers[i].value = request_headers[i].value.replace(find_me, fp_nonces[nonce]);
        //             }
        //         }
        //     }
        //     return request_headers;
        // }
        // function on_before_send_headers(details) {
        //     var return_value = {};
        //     if (details.tabId < 0) {
        //         // request of an extension
        //         return return_value;
        //     }
        //     console.log("on_before_send_headers:");
        //     var new_request_headers = replace_in_request_headers(details.requestHeaders);
        //     if (new_request_headers) {
        //         return_value.requestHeaders = new_request_headers;
        //     }
        //     console.log(details);
        //     console.log(return_value);
        //     return return_value;
        // }

        /**
         * @ngdoc
         * @name psonocli.managerBackground#on_auth_required
         * @methodOf psonocli.managerBackground
         *
         * @description
         * Triggered once a website loads that requires authentication (e.g. basic auth)
         *
         * @param {object} details
         * @param {function} callbackFn The callback function to call once the secret has been returned
         *
         * @returns {object}
         */
        function on_auth_required(details, callbackFn) {
            var return_value = {};
            var entries;
            entries = search_website_passwords_by_urlfilter(details.url, true);

            if (entries.length < 1) {
                return callbackFn(return_value);
            }

            if (already_filled_max_allowed.hasOwnProperty(details.requestId) && already_filled_max_allowed[details.requestId] < 1) {
                return callbackFn(return_value);
            }

            if (! already_filled_max_allowed.hasOwnProperty(details.requestId)) {
                already_filled_max_allowed[details.requestId] = Math.min(entries.length, 2);
            }

            already_filled_max_allowed[details.requestId]--;
            request_secret(entries[already_filled_max_allowed[details.requestId]]['secret_id'])
                .then(function(data){
                    return_value = {
                        authCredentials: {
                            username: data['website_password_username'],
                            password: data['website_password_password']
                        }
                    };
                    return callbackFn(return_value);
                }, function(value) {
                    return callbackFn(return_value);
                });
        }




        /**
         * @ngdoc
         * @name psonocli.managerBackground#save_last_login_credentials
         * @methodOf psonocli.managerBackground
         *
         * @description
         * Saves the last login credentials in the datastore
         *
         * @returns {promise}
         */
        function save_last_login_credentials() {
            return managerDatastorePassword.save_password(
                last_login_credentials['url'],
                last_login_credentials['username'],
                last_login_credentials['password']
            )
        }

        return {};
    };

    var app = angular.module('psonocli');
    app.factory("managerBackground", ['$q', 'managerBase', 'managerSecret', 'storage', 'managerDatastorePassword', 'helper',
        'cryptoLibrary', 'apiClient', 'device', 'browser', 'chrome', 'browserClient', managerBackground]);

}(angular));