'use strict';
var _ = require("underscore");



var documentExpressMongoose = function(app, mongoose) {

    // Add an API endpoint to be used internally by this module
    app.get('/api-docs', function(req, res) {
        try {

            var routes;
            routes = generateApiData(app);
            var schemas = [];
            if (mongoose) {
                console.log("Looking for schemas");
                schemas = generateSchema(mongoose);
                console.log("schema collected");
            }
            res.send({ routes: routes, schemas: schemas });

        } catch (e) {
            res.status(400).send(e)
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

var nestedSchemas;
var generateSchema = function(mongoose) {
    console.log("Generating schema");
    nestedSchemas = [];

    // Transform models object to an array
    var schemas = _.pairs(mongoose.modelSchemas);
    console.log("generated pair schema");

    // Map each schema to a readable format
    schemas = _.map(schemas, function(schema) {
        var info = getSchemaInfo(schema);
        return info;
    });
    console.log("generated map schema", schemas);

    // Add nested schemas
    schemas = schemas.concat(nestedSchemas);
    console.log("generated concat schema", schemas);

    return schemas;
}

function getSchemaInfo(schema) {
    console.log("**get SchemaInfo schema", schema);

    // Extract schema info for all fields of a schema
    var paths = _.map(schema[1].paths, function(path) {

        // Extract field info like type, required, enum etc.
        var info = getFieldInfo(path);

        // If field is a nested array with a custom, add it's schema to nested schemas
        if (info && info.schema)
            nestedSchemas.push(info.schema);

        return info;
    });

    // Add virtual fields to schema info
    _.each(schema[1].virtuals, function(virtual) {
        if (virtual.path != "id")
            paths.push({ name: virtual.path, type: "Unknown" });
    });

    return { name: schema[0], fields: paths };
}


function getFieldInfo(path) {

    var field = { name: path.path, type: path.instance };

    if (path.options.type) {
        field.type = path.options.type.name;

        if (path.options.type instanceof Array && !path.schema)
            field.type = path.options.type[0].name + " []";
    }

    field.min = path.options.min;
    field.max = path.options.max;

    if (path.enumValues && path.enumValues.length > 0)
        field.enumValues = path.enumValues;

    if (path.schema) {
        // This field is a nested array with a custom schema
        field.type = field.name;
        // Get schema info for the array item schema
        field.schema = getSchemaInfo([field.name, path.schema]);
    }

    if (path.isRequired)
        field.required = true;

    return field;
}

module.exports = documentExpressMongoose;