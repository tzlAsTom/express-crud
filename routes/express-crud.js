var jade = require('jade');
var path = require('path');
var mongo = require('mongodb');

var urlPrefix;
var db;
module.exports = function(root, express, app, options){
    //todo check params
    urlPrefix = root;
    app.use(urlPrefix, express.static(path.join(__dirname, '../public')));

    db = options.mongodb;

    var router = express.Router();
    router.get('/page/model/:name', function(req, res) {
        var modelName = req.params.name;
        if(!isModelNameValid(modelName)) throw Error('modelName invalid');
        res.locals.title = modelName;
        modelConfig.name = modelName;
        res.locals.modelConfig = modelConfig;

        //WTF?
        res.locals.pretty = true;
        res.status(200).send(jade.renderFile('../views/model.jade', res.locals));
    });

    router.get('/page/index', function(req, res) {
        res.send('todo');
    });


    router.get('/page/system/modelMeta', function(req, res) {
        var modelMetaConfig = {
            name: 'tcrudModels',
            displayName: 'Model Metadata',
            columns: [
                {name: '_id', labelName: 'Collection Name', type: 'text'},
                {name: 'displayName', labelName: 'Display Name', type: 'text'},
                {name: 'selectBreakSize', labelName: 'Item Number Before Input Line Break', type: 'text', defaultValue: 5},
                {name: 'columns', labelName: 'Column List', value:[
                    {name: 'columnName1', labelName: 'Column Name1', type: 'text', defaultValue: 'aaa'},
                ]},
            ],
        };

        res.locals.title = modelMetaConfig.displayName;
        res.locals.modelConfig = modelMetaConfig;
        res.locals.pretty = true;
        res.status(200).send(jade.renderFile('../views/modelMeta.jade', res.locals));
    });

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
    router.get('/restful/models/:name', function(req, res){
        var modelName = req.params.name;console.log(modelName);
        if(!isModelNameValid(modelName)) throw Error('modelName invalid');

        //todo: modelName prefixed with 'tcrud' is not allow

        db.collection(modelName, function(err, collection){
            //todo: throw => error handling
            if(err) throw Error(err);

            if(req.query._id && req.query._id.match(/^[a-z0-9]{24}$/)){
                req.query._id = new mongo.ObjectId(req.query._id);
            }
console.log(req.query);
            collection.find(req.query).toArray(function(err, results){
                if(err) throw Error(err);

                return res.json(results);
            });
        });
    });

    router.post('/restful/models/:name', function(req, res){
        var modelName = req.params.name;
        if(!isModelNameValid(modelName)) throw Error('modelName invalid');

        //todo: form validator
        db.collection(modelName, function(err, collection){
            if(err) throw Error(err);

            collection.save(req.body, {w: 1}, function(err, result){
                if(err) throw Error(err);

                return res.json(req.body);
            });
        });
    });

    router.put('/restful/models/:name/:_id', function(req, res){
        var modelName = req.params.name;
        if(!isModelNameValid(modelName)) throw Error('modelName invalid');

        var recordId = req.params._id;
        if(recordId.match(/^[a-z0-9]{24}$/)){
            recordId = new mongo.ObjectId(recordId);
        }

        //todo: form validator
        db.collection(modelName, function(err, collection){
            if(err) throw Error(err);

            collection.update({_id: recordId}, {$set: req.body}, {w: 1}, function(err, result){
                if(err) throw Error(err);

                if(!result.result.n) throw Error('record not found');
                return res.json({result: 1});
            });
        });
    });

    router.delete('/restful/models/:name/:_id', function(req, res){
        var modelName = req.params.name;
        if(!isModelNameValid(modelName)) throw Error('modelName invalid');

        var recordId = req.params._id;
        if(recordId.match(/^[a-z0-9]{24}$/)){
            recordId = new mongo.ObjectId(recordId);
        }

        //todo: form validator
        db.collection(modelName, function(err, collection){
            if(err) throw Error(err);

            collection.remove({_id: recordId}, {w: 1}, function(err, result){
                if(err) throw Error(err);

                if(!result.result.n) throw Error('record not found');
                return res.json({result: 1});
            });
        });
    });

    return router;
};

function isModelNameValid(name){
    return /^[a-zA-Z0-9_]{1,63}$/.test(name);
}
