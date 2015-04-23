(function(angular){
    //common
    var app = angular.module('tcrud', [])
    .service('Container', ['$http', '$rootScope', function($http, $rootScope){
        this.updateAlertMessage = function(code, message){
            $rootScope.$broadcast('updateMessage', code, message);
        };
        var self = this;
        this.getResource = function(uri, params){
            return $http.get(uri, {params: params || {}}).error(function(data, status){
                self.updateAlertMessage(true, 'Get ' + uri + ' failed:' + JSON.stringify({status: status, data: data}));
            });
        };

        this.createResoure = function(uri, data){
            return $http.post(uri, data).error(function(data, status){
                self.updateAlertMessage(true, 'Post ' + uri + ' failed:' + JSON.stringify({status: status, data: data}));
            });
        };

        this.updateResource = function(uri, data){
            return $http.put(uri, data).error(function(data, status){
                self.updateAlertMessage(true, 'Put ' + uri + ' failed:' + JSON.stringify({status: status, data: data}));
            });
        };

        this.deleteResource = function(uri){
            return $http.delete(uri).error(function(data, status){
                self.updateAlertMessage(true, 'Delete ' + uri + ' failed:' + JSON.stringify({status: status, data: data}));
            });
        };


        this.filterFromCheckBoxConfig = function(config){
            var rtn = [];

            Object.keys(config).forEach(function(elem){
                if(config[elem]) rtn.push(elem);
            });

            return rtn;
        };

        this.filterToCheckBoxConfig = function(config){
            var rtn = {};

            angular.forEach(config, function(data){
                rtn[data] = true;
            });

            return rtn;
        };
    }])
    .controller('main', ['$scope', '$http', function($scope, $http){
        $scope.alertMessage = '';
        $scope.isError = false;

        $scope.$http = $http;

        $scope.updateAlertMessage = function(isError, message){
            $scope.isError = isError;
            $scope.alertMessage = message;
        };

        $scope.$on('updateMessage', function(e, code, message){
            $scope.updateAlertMessage(code, message);
        });
    }]);


    angular.module('tcrud').controller('model', ['$scope', 'Container', function($scope, Container){
        //{modelName: ""}
        $scope.config = {};

        $scope.query = {};
        $scope.recordList = [];

        $scope.printDebug = function(){
            console.log($scope.serverSelected, $scope.curRecord, $scope.announcementList);
        };

        $scope.create = function(){
            var curRecord = angular.copy($scope.curRecord);
            Container.createResoure('/admin/restful/models/' + $scope.config.modelName, curRecord).success(function(data){
                Container.updateAlertMessage(false, 'Create success');
                $scope.recordList.unshift(data);
            });
        };

        $scope.update = function(){
            var curRecord = angular.copy($scope.curRecord);
            var curId = curRecord._id;
            delete curRecord._id;
            Container.updateResource('/admin/restful/models/' + $scope.config.modelName + '/' + curId, curRecord).success(function(data){
                Container.updateAlertMessage(false, 'Update Success');
                angular.forEach($scope.recordList, function(elem, index){
                    if(elem._id == curId) $scope.recordList[index] = angular.copy($scope.curRecord);
                });
            });
        };

        $scope.delete = function(_id){
            Container.deleteResource('/admin/restful/models/' + $scope.config.modelName + '/' + _id).success(function(data){
                Container.updateAlertMessage(false, 'Delete success');

                angular.forEach($scope.recordList, function(elem, index){
                    if(elem._id == _id) curIndex = index;
                });

                if(curIndex != undefined)
                    $scope.recordList.splice(curIndex, 1);
            });
        };

        $scope.reset = function(){
            $scope.curRecord = {};
        };

        $scope.search = function(){
            Object.keys($scope.query).forEach(function(elem){
                if($scope.query[elem] === '') delete $scope.query[elem];
            });
            Container.getResource('/admin/restful/models/' + $scope.config.modelName, $scope.query).success(function(data){
                console.log(data);
                $scope.recordList = data;
            });
        };

        $scope.initEdit = function(_id){
            angular.forEach($scope.recordList, function(elem, index){
                if(_id == elem._id){
                    $scope.curRecord = angular.copy($scope.recordList[index]);;
                    $scope.serverSelected = Container.filterToCheckBoxConfig($scope.curRecord.w);
                }
            });
        };

        $scope.initCopy = function(_id){
            angular.forEach($scope.recordList, function(elem, index){
                if(_id == elem._id){
                    var curRecord = angular.copy($scope.recordList[index]);
                    delete curRecord._id;
                    $scope.curRecord = curRecord;
                }
            });
        };
    }])
    .directive('tcrudConfig',  function(){
        return {
            restrict: 'E',
            link: function link(scope, element, attrs) {
                console.log('yyy');
                console.log(scope.query);
                scope.config = scope.$new(true).$eval(attrs['data']);
                scope.search();
            }
        };
    });
})(window.angular);