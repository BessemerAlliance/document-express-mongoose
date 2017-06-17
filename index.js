'use strict';


var documentExpressMongoose = function(app, mongoose) {

    // Add an API endpoint to be used internally by this module
    app.get('/api-docs', function(req, res) {
        try {
            var schemas;
            var routes;

            if (mongoose) {
                console.log("Hi Mom");
                schemas = generateSchema(mongoose);
            }
            routes = generateApiData(app)

            res.send({ routes: routes, schemas: schemas });

        } catch (e) {
            res.send(400, e);
        }
    });
}

var generateApiData = function(app, path, endpoints) {
    var regExp = /^\/\^\\\/(?:(:?[\w\\.-]*(?:\\\/:?[\w\\.-]*)*)|(\(\?:\(\[\^\\\/]\+\?\)\)))\\\/.*/
    var stack = app.stack || app._router && app._router.stack;
    endpoints = endpoints || [];
    path = path || '';

    stack.forEach(function(val) {
        if (val.route) {
            endpoints.push({
                path: path + (path && val.route.path === '/' ? '' : val.route.path),
                methods: getRouteMethods(val.route)
            });
        } else if (val.name === 'router' || val.name === 'bound dispatch') {
            var newPath = regExp.exec(val.regexp);

            if (newPath) {
                var regexResult = val.regexp;
                var keyIndex = 0;
                var parsedPath;

                while (hasParams(regexResult)) {
                    regexResult = val.regexp.toString().replace(/\(\?:\(\[\^\\\/]\+\?\)\)/g, ':' + val.keys[keyIndex].name);
                    keyIndex++;
                }

                if (regexResult !== val.regexp) {
                    newPath = regExp.exec(regexResult);
                }

                parsedPath = newPath[1].replace(/\\\//g, '/');

                if (parsedPath === ':postId/sub-router') console.log(val);

                generateApiData(val.handle, path + '/' + parsedPath, endpoints)
            } else {
                generateApiData(val.handle, path, endpoints);
            }
        }

    }, this);
    return endpoints;
}

/**
 * Return true if found regexp related with express params
 */
var hasParams = function(value) {
    var regExp = /\(\?:\(\[\^\\\/]\+\?\)\)/g;
    return regExp.test(value);
};

/**
 * Print in console all the verbs detected for the passed route
 */
var getRouteMethods = function(route) {
    var methods = [];

    for (var method in route.methods) {
        if (method === '_all') continue;

        methods.push(method.toUpperCase());
    }

    return methods;
};

var generateSchema = function(mongoose) {
    var nestedSchemas = [];

    // total = nestedSchemas.push['do'];
    // total = nestedSchemas.push['rei'];
    return nestedSchemas;

};

module.exports = documentExpressMongoose;