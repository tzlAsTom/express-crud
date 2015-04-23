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
        res.locals.modelConfig = {modelName: modelName};

        res.status(200).send(jade.renderFile('../views/model.jade', res.locals));
    });

    router.get('/page/index', function(req, res) {
        res.send('todo');
    });


    router.get('/page/system/model', function(req, res) {
        res.send('todo');
    });

    router.get('/restful/models/:name', function(req, res){
        var modelName = req.params.name;console.log(modelName);
        if(!isModelNameValid(modelName)) throw Error('modelName invalid');

        //todo: paganition
        //todo: model meta
        db.collection(modelName, function(err, collection){
            //todo: throw => error handling
            if(err) throw Error(err);

            if(req.query._id && req.query._id.match(/^[a-z0-9]{24}$/)){
                req.query._id = new mongo.ObjectId(req.query._id);
            }
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