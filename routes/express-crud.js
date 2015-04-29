var jade = require('jade');
var path = require('path');
var mongo = require('mongodb');

var async = require('async');

var urlPrefix;
var db;

var modelMetaConfig = {
    _id: 'tcrudModels',
    displayName: 'Model Metadata',
    columns: [
        {name: '_id', labelName: 'Collection Name', type: 'text', display:{'C': true, 'R': true, 'U': 'same as "C"', 'D': "No Need", 'L': true}},  //'L': list page display
        {name: 'displayName', labelName: 'Display Name', type: 'text', display:{'C': true, 'R': true}},
        {name: 'selectBreakSize', labelName: 'Item Number Before Input Line Break', type: 'text', defaultValue: 5, display:{'C': true, 'R': false, 'L': false}},
        {name: 'columns', labelName: 'Column List', type:'subDocList', display:{'C': true, 'R': false, 'L': false}},
        {name: 'enableEdit', labelName: 'Enable Edit Record', type: 'radio', dataSource: [
                {labelName: 'Enable', value: 1},
                {labelName: 'Disable', value: 0}
            ], display:{'C': true, 'R': false, 'L': false}
        },
        {name: 'enableSearch', labelName: 'Enable Search', type: 'radio', dataSource: [
                {labelName: 'Enable', value: 1},
                {labelName: 'Disable', value: 0}
            ], display:{'C': true, 'R': false, 'L': false}
        },
        {name: 'createNotice', labelName: 'Notice For Create/Edit Form', type: 'textarea', display: {R: false, L: false}},
        {name: 'searchNotice', labelName: 'Notice For Search Form', type: 'textarea', display: {R: false, L: false}},
    ],
};
function tcrud(root, express, app, options){
    //todo check params
    urlPrefix = root;
    app.use(urlPrefix, express.static(path.join(__dirname, '../public')));

    db = options.mongodb;

    var handleError = function(err, req, res){
        console.error(err);

        if(req.xhr){
            res.status(err.status || 500).json({message: err.toString()});
        }else{
            res.status(err.status || 500);
            res.render('error', {
                message: err.toString(),
                error: (app.get('env') === 'development')?err:{}
            });
        }
    };

    var router = express.Router();
    router.get('/page/model/:name', function(req, res) {
        var modelName = req.params.name;

        async.waterfall([
            function(callback){
                tcrud.getModelConfig(db, modelName, callback);
            },
            function(modelConfig, callback){
                res.locals.title = modelConfig.displayName;
                res.locals.modelConfig = modelConfig;
                res.locals.pretty = true;
                res.status(200).send(jade.renderFile('../views/model.jade', res.locals));
            },
        ], function(err){
            if(err) return handleError(err, req, res);
        });
    });

    router.get('/', function(req, res) {
        async.series([
            function(callback){
                db.collection('tcrudModels').find({}).toArray(function(err, docs){
                    if(err) return callback(err);

                    res.locals.title = 'T-Crud System Index Page';
                    res.locals.modelList = docs;
                    res.locals.pretty = true;

                    res.locals._hideBreadCrumb = true;
                    res.status(200).send(jade.renderFile('../views/index.jade', res.locals));
                    return callback(null);
                });
            },
        ], function(err){
            if(err) return handleError(err, req, res);
        });
    });

    router.get('/page/system/modelMeta', function(req, res) {
        res.locals.title = modelMetaConfig.displayName;
        res.locals.modelConfig = modelMetaConfig;
        res.locals.pretty = true;
        res.status(200).send(jade.renderFile('../views/modelMeta.jade', res.locals));
    });

    router.get('/restful/models/:name', function(req, res){
        var modelName = req.params.name;console.log(modelName);

        async.waterfall([
            function(callback){
                tcrud.getModelConfig(db, modelName, callback);
            },
            function(modelConfig, callback){
                db.collection(modelName, function(err, collection){
                    if(err) return callback(err);

                    if(req.query._id && req.query._id.match(/^[a-z0-9]{24}$/)){
                        req.query._id = new mongo.ObjectId(req.query._id);
                    }

                    collection.find(req.query).toArray(function(err, results){
                        if(err) return callback(err);

                        res.json(results);
                        return callback(null);
                    });
                });
            },
        ], function(err){
            if(err) return handleError(err, req, res);
        });
    });

    router.post('/restful/models/:name', function(req, res){
        var modelName = req.params.name;

        //todo: form validator
        async.waterfall([
            function(callback){
                tcrud.getModelConfig(db, modelName, callback);
            },
            function(modelConfig, callback){
                if(modelName == 'tcrudModels'){
                    if(!isModelNameValid(req.body._id)) return callback('model name invalid');
                }
                db.collection(modelName).save(req.body, {w: 1}, function(err, result){
                    if(err) return callback(err);;

                    res.json(req.body);
                    return callback(null);
                });
            },
        ], function(err){
            if(err) return handleError(err, req, res);
        });
    });

    router.put('/restful/models/:name/:_id', function(req, res){
        var modelName = req.params.name;

        var recordId = req.params._id;
        if(recordId.match(/^[a-z0-9]{24}$/)){
            recordId = new mongo.ObjectId(recordId);
        }

        //todo: form validator
        async.waterfall([
            function(callback){
                tcrud.getModelConfig(db, modelName, callback);
            },
            function(modelConfig, callback){
                db.collection(modelName).update({_id: recordId}, {$set: req.body}, {w: 1}, function(err, result){
                    if(err) return callback(err);

                    if(!result.result.n) return callback('record not found');
                    return res.json({result: 1});
                });
            },
        ], function(err){
            if(err) return handleError(err, req, res);
        });
    });

    router.delete('/restful/models/:name/:_id', function(req, res){
        var modelName = req.params.name;

        var recordId = req.params._id;
        if(recordId.match(/^[a-z0-9]{24}$/)){
            recordId = new mongo.ObjectId(recordId);
        }

        //todo: form validator
        async.waterfall([
            function(callback){
                tcrud.getModelConfig(db, modelName, callback);
            },
            function(modelConfig, callback){
                db.collection(modelName).remove({_id: recordId}, {w: 1}, function(err, result){
                    if(err) return callback(err);

                    if(!result.result.n) return callback('record not found');
                    return res.json({result: 1});
                });
            }
        ], function(err){
            if(err) return handleError(err, req, res);
        });
    });

    app.use(function(err, req, res, next) {
        console.error(err.stack);
        res.status(500).send('Something broke!');
    });

    return router;
};

tcrud.getModelConfig = function(db, modelName, callback){
    if(modelName == 'tcrudModels') return callback(null, modelMetaConfig);

    db.collection('tcrudModels').findOne({_id: modelName}, function(err, result){
        if(err) return callback(err);

        if(!result) return callback('model not found');

        return callback(null, result);
    });
};

function isModelNameValid(name){
    return /^[a-zA-Z0-9_]{1,63}$/.test(name) && !/^tcrud/.test(name);
}

module.exports = tcrud;




        //todo: paganition
        var modelConfig = {
            name: 'demo',
            displayName: 'Demo for display',
            /*todo
             * authorization: {'create/retrieve/update/delete/': 'ACL ROLE'}
             * pageSize: 'pagination records in one page'
             * sortWeightColumn: ''
             * selectBreakSize: 'max record for 'input type="select/radio/checkbox"' before linebreak
             * identityColumnName: 'for client CRUD result alert'
             * displayMode: 'dialog for edit?'
            */
            selectBreakSize: 5,
            columns: [
                {name: '_id', labelName: 'ID', type: 'text'},
                {name: 'text', labelName: 'Text', type: 'text', defaultValue: 'aaa', /*todo: form validate; disable showing in CRUD form*/

                },
                {name: 'number', labelName: "Number", type: 'text'},
                {name: 'password', labelName: "Password", type: 'password'},
                {name: 'checkbox', labelName: 'CheckBox', type: 'checkbox'
                    ,dataSource: [
                        {labelName: 'option 1', value: 1},
                        {labelName: 'option 2', value: 2},
                        {labelName: 'option 3', value: 3},
                    ],
                    defaultValueIndex: 1
                },
                {name: 'radiobox', labelName: 'RadioBox', type: 'radio'
                    ,dataSource: [
                        {labelName: 'option 11', value: 11},
                        {labelName: 'option 12', value: 12},
                        {labelName: 'option 13', value: 13},
                    ]
                },
                //todo: from local nodeJs file
                {name: 'select', labelName: 'Select', type: 'select'
                    ,dataSource: [
                        {labelName: 'option 111', value: 111},
                        {labelName: 'option 112', value: 112},
                        {labelName: 'option 113', value: 113},
                    ]
                },
                {name: 'remoteCheck', labelName: 'RemoteCheck', type: 'checkbox'
                    ,dataSourceUrl: '/admin/restful/models/remoteCheckOptions'
                    ,nameKey: 'text'
                    ,valueKey: 'number'
                    ,defaultValueIndex: 1
                },
                {name: 'remoteRadio', labelName: 'RemoteRadio', type: 'radio'
                    ,nameKey: 'text'
                    ,valueKey: 'number'
                    ,dataSourceUrl: '/admin/restful/models/remoteRadioOptions'
                },
                {name: 'remoteSelect', labelName: 'RemoteSelect', type: 'select'
                    ,nameKey: 'text'
                    ,valueKey: 'number'
                    ,dataSourceUrl: '/admin/restful/models/remoteSelectOptions'
                },
            ],

        };

