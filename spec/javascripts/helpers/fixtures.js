(function($) {
    beforeEach(function() {
        this.prepareResponse = function(responseJSON) {
            return [200, {
                'Content-Type': 'application/json'
            },
            JSON.stringify(responseJSON)];
        };

        window.fixtures = function(model) {
            var self = this;

            return {
                jsonFor: function jsonFor(key, options) {
                    return self.fixtures.jsonFor(key, $.extend({
                        model: model
                    },
                    options));
                },

                modelFor: function modelFor(key, options) {
                    var klass = chorus.models[model];
                    var obj = new klass(null, options);
                    var data = klass.prototype.parse.call(obj, self.fixtures.jsonFor(key, {
                        model: model
                    }));
                    if (obj.set) {
                        obj.set(data);
                    } else {
                        obj.reset(data, options);
                    }
                    return obj;
                }
            };
        };

        $.extend(window.fixtures, {
            jsonFor: function jsonFor(key, options) {
                var config = $.extend({
                    model: this.model,
                    overrides: {}
                },
                options || {});

                var source = this[config.model];

                if (!source) {
                    throw "The model you asked for (" + config.model + ") is not in fixtures";
                    this.fail("The model you asked for (" + config.model + ") is not in fixtures");
                }

                if (!source[key]) {
                    throw "The key you asked for (" + key + ") is not in fixtures for " + config.model;
                    this.fail("The key you asked for (" + key + ") is not in fixtures for " + config.model);
                }

                return $.extend(source[key], config.overrides);
            },

            modelFor: function modelFor(key, options) {
                var klass = chorus.models[this.model];
                var obj = new klass(null, options);
                var data = klass.prototype.parse.call(obj, self.fixtures.jsonFor(key, {
                    model: this.model
                }));
                if (obj.set) {
                    obj.set(data);
                } else {
                    obj.reset(data, options);
                }
                return obj;
            },

            Session: {
                save: {
                    "message":
                        [

                        ],
                    "status": "ok",
                    "requestId": 4,
                    "resource":
                        [
                            {
                                "userName": "edcadminlol",
                                "admin": true,
                                "firstName": "EDC",
                                "lastName": "Admin",
                                "fullName": "EDC Admin",
                                "authid": "4b11614a29bb62f3a56f7ff141e90db91320194325353.539273276006",
                                "use_external_ldap": false
                            }
                        ],
                    "method": "POST",
                    "resourcelink": "/edc/auth/login/",
                    "pagination": null,
                    "version": "0.1"
                },

                saveFailure: {
                    "message":
                        [
                            {
                                "message": "Username or password is incorrect.",
                                "msgcode": "E_2_0006",
                                "description": null,
                                "severity": "error",
                                "msgkey": "USER.LOGIN_FAILED"
                            }
                        ],
                    "status": "fail",
                    "requestId": 3,
                    "resource":
                        [

                        ],
                    "method": "POST",
                    "resourcelink": "/edc/auth/login/",
                    "pagination": null,
                    "version": "0.1"
                }
            },

            User: {
                fetch : {
                    "message":[],
                    "status":"ok",
                    "requestId":108,
                    "resource":[
                        {
                            "id":"42",
                            "userName":"edcadmin",
                            "firstName":"EDC",
                            "lastName":"Admin",
                            "emailAddress":"edcadmin@example.com",
                            "title":null,
                            "ou":null,
                            "manager":null,
                            "streetAddress":null,
                            "l":null,
                            "st":null,
                            "c":null,
                            "admin":true,
                            "notes":null,
                            "lastLogin":"2011-11-16 09:40:27.916",
                            "imageId":"10036",
                            "dn":null,
                            "isDeleted":false,
                            "dumb":null,
                            "lastUpdatedStamp":"2011-11-16 12:34:47.632",
                            "lastUpdatedTxStamp":"2011-11-16 12:34:47.454",
                            "createdStamp":"2011-11-03 10:49:41.346",
                            "createdTxStamp":"2011-11-03 10:49:41.342"
                        }
                    ],
                    "method":"GET",
                    "resourcelink":"/edc/user/edcadmin",
                    "pagination":null,
                    "version":"0.1"
                }
            },

            UserSet: {
                fetch:
                {
                    "message": [],
                    "status": "ok",
                    "requestId": 8,
                    "resource": [
                        {
                            "id":"10000",
                            "userName": "markr",
                            "firstName": "Mark",
                            "lastName": "Rushakoff",
                            "emailAddress": "markymark@pivotallabs.com",
                            "title": "Title",
                            "admin": false,
                            "notes": null,
                            "lastLogin": "2011-11-03 17:45:39",
                            "isDeleted": false
                        },
                        {
                            "id":"10001",
                            "userName": "edcadmin",
                            "firstName": "EDC",
                            "lastName": "Admin",
                            "emailAddress": "edcadmin@greenplum.com",
                            "title": "Engineer",
                            "admin": true,
                            "notes": null,
                            "lastLogin": "2011-11-03 17:45:39",
                            "isDeleted": false
                        },
                        {
                            "id":"10002",
                            "userName": "frogman",
                            "firstName": "frOg",
                            "lastName": "man",
                            "emailAddress": "frogman@greenplum.com",
                            "title": "Frog-man",
                            "admin": false,
                            "notes": null,
                            "lastLogin": "2011-11-03 17:45:39",
                            "isDeleted": false
                        }
                    ],
                    "method": "GET",
                    "resourcelink": "/edc/user/",
                    "pagination": {
                        "total": "2",
                        "page": "1",
                        "records": "22"
                    },
                    "version": "0.1"
                }

            },

            Workspace : {
                fetch : {
                    "message":[],
                    "status":"ok",
                    "requestId":3697,
                    "resource":[
                        {
                            "id":"10013",
                            "ownerFullName":"EDC Admin",
                            "name":"fortune",
                            "description":"a cool workspace",
                            "createdStamp":"2011-11-14",
                            "owner":"edcadmin",
                            "isPublic":true,
                            "iconId":null,
                            "state":1,
                            "summary":"this is the workspace summary",
                            "sandboxId":null,
                            "active":true,
                            "permission":["admin"]
                        }
                    ],
                    "method":"GET",
                    "resourcelink":"/edc/workspace/10013",
                    "pagination":null,
                    "version":"0.1"
                },
                fetchWithLatestComments : {
                    "message":[],
                    "status":"ok",
                    "requestId":3697,
                    "resource":[
                        {
                            "id":"10013",
                            "ownerFullName":"EDC Admin",
                            "name":"fortune",
                            "description":"a cool workspace",
                            "createdStamp":"2011-11-14",
                            "owner":"edcadmin",
                            "isPublic":true,
                            "iconId":null,
                            "state":1,
                            "summary":"this is the workspace summary",
                            "sandboxId":null,
                            "active":true,
                            "permission":["admin"],
                            "latestCommentList": [{
                                "timestamp": "2011-12-08 17:16:47",
                                "id": 10050,
                                "author": {
                                    "id": "InitialUser",
                                    "lastName": "Admin",
                                    "firstName": "EDC"
                                },
                                "text": "This rocks, man",
                                "attachments": [],
                                "type": "NOTE",
                                "comments": []
                            }]
                        }
                    ],
                    "method":"GET",
                    "resourcelink":"/edc/workspace/10013",
                    "pagination":null,
                    "version":"0.1"
                }

            },

            Workfile : {
                fetch : {
                    "message":[],
                    "status":"ok",
                    "requestId":17,
                    "resource":[
                        {
                            "createdStamp":"2011-11-22",
                            "lastUpdatedStamp":"2011-11-22 14:40:42.11",
                            "modifiedBy":"edcadmin",
                            "ownerFullName":"EDC Admin",
                            "imageId":null,
                            "id":"10020",
                            "fileName":"who.sql",
                            "mimeType":"text/x-sql",
                            "fileType":"sql",
                            "isBinary":false,
                            "workspaceId":"10000",
                            "source":"empty",
                            "owner":"edcadmin",
                            "description":null,
                            "latestVersionNum":1,
                            "versionFileId":"1111_1111",
                            "isDeleted":false,
                            "modifiedByFirstName":"EDC",
                            "modifiedByLastName":"Admin",
                            "modifiedById":"10010",
                            "commentCount":2,
                            "commentBody":"I am loving commenting",
                            "commenterId":"InitialUser",
                            "commenterFirstName":"EDC",
                            "commenterLastName":"Admin"
                        }
                    ],
                    "method":"GET",
                    "resourcelink":"/edc/workspace/10000/workfile/10020",
                    "pagination":null,
                    "version":"0.1"
                },

                copy : {
                    "message":[],
                    "status":"ok",
                    "requestId":1137,
                    "resource":[
                        {
                            "fileName":"test.sql",
                            "mimeType":"text/x-sql",
                            "fileType":"sql",
                            "isBinary":false,
                            "workspaceId":"10010",
                            "source":"chorus",
                            "owner":"edcadmin",
                            "description":"null",
                            "latestVersionNum":1,
                            "isDeleted":false,
                            "modifiedBy":"edcadmin",
                            "id":"10026",
                            "lastUpdatedTxStamp":"2011-11-28 13:47:42.245",
                            "createdTxStamp":"2011-11-28 13:47:42.245",
                            "lastUpdatedStamp":"2011-11-28 13:47:42.253",
                            "createdStamp":"2011-11-28 13:47:42.253"
                        }
                    ],
                    "method":"POST",
                    "resourcelink":"/edc/workspace/10010/workfile",
                    "pagination":null,
                    "version":"0.1"
                },

                copyFailed : {
                    "message":[
                        {
                            "message":"Workspace already has a workfile with this name. Specify a different name.",
                            "msgcode":"E_14_0013",
                            "description":null,
                            "severity":"error",
                            "msgkey":"WORKFILE.FILENAME_EXISTS"
                        }
                    ],
                    "status":"fail",
                    "requestId":1156,
                    "resource":[],
                    "method":"POST",
                    "resourcelink":"/edc/workspace/10010/workfile",
                    "pagination":null,
                    "version":"0.1"
                },

                image : {
                    "message": [],
                    "status": "ok",
                    "requestId": 1913,
                    "resource": [{
                        "id": "10035",
                        "fileName": "avatar.jpg",
                        "mimeType": "image/jpeg",
                        "fileType": "N/A",
                        "isBinary": true,
                        "workspaceId": "10000",
                        "source": "fs",
                        "owner": "edcadmin",
                        "description": null,
                        "latestVersionNum": 1,
                        "isDeleted": false,
                        "modifiedBy": "edcadmin",
                        "lastUpdatedStamp": "2011-11-29 10:31:15.153",
                        "lastUpdatedTxStamp": "2011-11-29 10:31:15.143",
                        "createdStamp": "2011-11-29 10:31:15.153",
                        "createdTxStamp": "2011-11-29 10:31:15.143",
                        "versionFileId": "1322591475139_3804",
                        "versionNum": "1",
                        "versionOwner": "edcadmin",
                        "hasDraft": false,
                        "sandboxId": null
                    }],
                    "method": "GET",
                    "resourcelink": "/edc/workspace/10000/workfile/10035",
                    "pagination": null,
                    "version": "0.1"
                },

                fetchText : {
	                    "message":[],
	                    "status":"ok",
	                    "requestId":449,
	                    "resource":[

	                        {
	                            "id":"10004",
	                            "fileName":"editabletextfile.txt",
	                            "mimeType":"text/plain",
	                            "fileType":"txt",
	                            "isBinary":false,
	                            "workspaceId":"10001",
	                            "source":"fs",
	                            "owner":"edcadmin",
	                            "description":null,
	                            "latestVersionNum":1,
	                            "isDeleted":false,
	                            "modifiedBy":"edcadmin",
	                            "lastUpdatedStamp":"2011-11-29 10:46:03.152",
	                            "lastUpdatedTxStamp":"2011-11-29 10:46:03.145",
	                            "createdStamp":"2011-11-29 10:46:03.152",
	                            "createdTxStamp":"2011-11-29 10:46:03.145",
	                            "versionFileId":"1322592363143_7126",
	                            "versionNum":"1",
	                            "versionOwner":"edcadmin",
	                            "content":"This is a text file.\n\nThis is the 3rd line.\n\nReally really long line.  Really really long line.  Really really long line.Really really long line.Really really long line.Really really long line.Really really long line.Really really long line.Really really long line.Really really long line.Really really long line.Really really long line.Really really long line.Really really long line.Really really long line.Really really long line.Really really long line.Really really long line.Really really long line.",
	                            "editable":true,
	                            "hasDraft":false,
	                            "sandboxId":null
	                        }
	                    ],
	                    "method":"GET",
	                    "resourcelink":"/edc/workspace/10001/workfile/10004",
	                    "pagination":null,
	                    "version":"0.1"
		                }
            },

            Activity : {
                fetch : {
                    "message" : [ ],
                    "status" : "ok",
                    "requestId" : 256,
                    "resource" : [
                        {
                            id : 10000,
                            timestamp : "2011-11-23 15:42:02.321",
                            type : "NOT_IMPLEMENTED",
                            author : {
                                username : "edcadmin",
                                firstName : "EDC",
                                lastName : "Admin"
                            },

                            comments : [
                                {
                                    id : 10023,
                                    timestamp : "2011-11-23 15:42:02.321",
                                    author : {
                                        username : "msofaer",
                                        firstName : "Michael",
                                        lastName : "Sofaer"
                                    },
                                    text : "hi there"
                                },
                                {
                                    id : 10024,
                                    timestamp : "2011-11-23 15:42:02.321",
                                    author : {
                                        username : "mrushakoff",
                                        firstName : "Mark",
                                        lastName : "Rushakoff"
                                    },
                                    text : "hello"
                                }
                            ]
                        }
                    ],
                    "method" : "GET",
                    "resourcelink" : "/edc/activitystream/workspace/10000",
                    "pagination" : null,
                    "version" : "0.1"
                }

            },

            ActivitySet : {
                fetch : {
                    "message" : [ ],
                    "status" : "ok",
                    "requestId" : 256,
                    "resource" : [
                        {
                            id : 10000,
                            timestamp : "2011-11-23 15:42:02.321",
                            type : "NOT_IMPLEMENTED",
                            author : {
                                id : "11",
                                username : "edcadmin",
                                firstName : "EDC",
                                lastName : "Admin"
                            },

                            comments : [
                                {
                                    id : 10023,
                                    timestamp : "2011-11-23 15:42:02.321",
                                    author : {
                                        id : "12",
                                        username : "msofaer",
                                        firstName : "Michael",
                                        lastName : "Sofaer"
                                    },
                                    text : "hi there"
                                },
                                {
                                    id : 10024,
                                    timestamp : "2011-05-23 15:42:02.321",
                                    author : {
                                        id : "13",
                                        username : "mrushakoff",
                                        firstName : "Mark",
                                        lastName : "Rushakoff"
                                    },
                                    text : "hello"
                                }
                            ]
                        },
                        {
                            id : 10001,
                            timestamp : "2011-04-23 15:42:02.321",
                            type : "NOT_IMPLEMENTED",
                            author : {
                                id : "14",
                                username : "dburkes",
                                firstName : "Danny",
                                lastName : "Burkes"
                            },

                            comments : []
                        }
                    ],
                    "method" : "GET",
                    "resourcelink" : "/edc/activitystream/workspace/10000",
                    "pagination" :
                    {
                        "total" : "1",
                        "page" : "1",
                        "records" : "8"
                    },
                    "version" : "0.1"
                }
            }

        });
    });
})(jQuery);
