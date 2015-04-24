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

        //* radiobox/checkbox/select can use remote config
        /*
        {
            "sourceName": [{name: '', value: ''}]
        }*/
        this._dataSource = {};
        this.getDataSource = function(sourceName){
            return self._dataSource[sourceName] || [];
        };

        this.setDataSource = function(sourceName, data){
            if(!Array.isArray(data)) return;
            self._dataSource[sourceName] = data;
        };
    }])
    .controller('main', ['$scope', '$http', '$timeout', function($scope, $http, $timeout){
        $scope.alertMessage = '';
        $scope.isError = false;

        $scope.$http = $http;

        $scope.updateAlertMessage = function(isError, message){
            $scope.isError = isError;
            $scope.alertMessage = message;
        };

        var preTimeout;
        $scope.$on('updateMessage', function(e, code, message){
            $timeout.cancel(preTimeout);
            $scope.updateAlertMessage(code, message);
            //fade out after timeout
            preTimeout = $timeout(function(){
                $scope.updateAlertMessage(code, '');
                console.log('xxxx');
            }, 2000);
        });
    }]);


    angular.module('tcrud').controller('model', ['$scope', 'Container', function($scope, Container){
        //{modelName: ""}
        $scope.config = {};


        var formDataConfig = [
            {
                inputName: 'remoteSelect',
                sourceUrl: '/admin/restful/models/remoteSelect',
                nameKey: 'name',
                valueKey: 'number',
            },

            {
                inputName: 'remoteRadio',
                sourceUrl: '/admin/restful/models/remoteRadio',
                nameKey: 'name',
                valueKey: 'number',
            },

            {
                inputName: 'remoteCheckBox',
                sourceUrl: '/admin/restful/models/remoteCheckBox',
                nameKey: 'name',
                valueKey: 'number',
            },
        ];

        $scope.formData = {};
        formDataConfig.forEach(function(inputDataConfig){
            Container.getResource(inputDataConfig.sourceUrl).success(function(data){
                var temp = [];
                data.forEach(function(elem){
                    temp.push({name: elem[ inputDataConfig.nameKey ], value: elem[ inputDataConfig.valueKey ]});
                });
                Container.setDataSource(inputDataConfig.inputName, temp);
                $scope.formData[ inputDataConfig.inputName ] = temp;
            });
        });
//         Container.setDataSource('remoteSelect', [
//             {name: 'option3', value: 3},
//             {name: 'option4', value: 4},
//             {name: 'option5', value: 5}
//         ]);
//
//         $scope.formData.remoteSelect = Container.getDataSource('remoteSelect');
//
//         Container.setDataSource('remoteRadio', [
//             {name: 'option13', value: 13},
//             {name: 'option14', value: 14},
//             {name: 'option15', value: 15}
//         ]);
//         $scope.formData.remoteRadio = Container.getDataSource('remoteRadio');
//
//         Container.setDataSource('remoteCheckBox', [
//             {name: 'option113', value: 113},
//             {name: 'option114', value: 114},
//             {name: 'option115', value: 115}
//         ]);
//         $scope.formData.remoteCheckBox = Container.getDataSource('remoteCheckBox');

        $scope.curRecord = {};
        $scope.recordList = [];

        $scope.query = {};


        $scope.create = function(){
            var curRecord = angular.copy($scope.curRecord);
            Container.createResoure('/admin/restful/models/' + $scope.config.modelName, curRecord).success(function(data){
                Container.updateAlertMessage(false, 'Create success; _id: ' + data._id);
                $scope.recordList.unshift(data);
            });
        };

        $scope.update = function(){
            var curRecord = angular.copy($scope.curRecord);
            var curId = curRecord._id;
            delete curRecord._id;
            Container.updateResource('/admin/restful/models/' + $scope.config.modelName + '/' + curId, curRecord).success(function(data){
                Container.updateAlertMessage(false, 'Update Success; _id: ' + curId);
                angular.forEach($scope.recordList, function(elem, index){
                    if(elem._id == curId) $scope.recordList[index] = angular.copy($scope.curRecord);
                });
            });
        };

        $scope.delete = function(_id){
            Container.deleteResource('/admin/restful/models/' + $scope.config.modelName + '/' + _id).success(function(data){
                Container.updateAlertMessage(false, 'Delete success; _id: ' + _id);

                angular.forEach($scope.recordList, function(elem, index){
                    if(elem._id == _id) curIndex = index;
                });

                if(curIndex != undefined)
                    $scope.recordList.splice(curIndex, 1);
            });
        };

        $scope.debug = function(){
            Container.updateAlertMessage(false, JSON.stringify($scope.curRecord, null, '  '));
        };

        $scope.reset = function(){
            $scope.curRecord = {};
        };

        $scope.search = function(){
            Object.keys($scope.query).forEach(function(elem){
                if($scope.query[elem] === '') delete $scope.query[elem];
            });
            Container.getResource('/admin/restful/models/' + $scope.config.modelName, $scope.query).success(function(data){
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