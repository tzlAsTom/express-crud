(function(angular){
    //common
    var app = angular.module('tcrud', ['ui.bootstrap'])
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


    angular.module('tcrud').controller('model', ['$scope', 'Container', '$log', '$modal', function($scope, Container, $log, $modal){
        //{modelName: ""}
        $scope.modelConfig = {};


        $scope.formData = {};
        $scope.formDataValue2Key = {};
        $scope.initializeConfig = function(config){
            $scope.modelConfig = config;
            $scope.modelConfig.columns.forEach(function(columnConfig, index){
                if(columnConfig.type == 'radio'
                    || columnConfig.type == 'checkbox'
                    || columnConfig.type == 'select'
                ){
                    var value2Key = {};
                    if(columnConfig.dataSource){
                        columnConfig.dataSource.forEach(function(elem){
                            value2Key[ elem.value ] = elem.labelName;
                        });

                        Container.setDataSource(columnConfig.name + 'DataList', columnConfig.dataSource);
                        $scope.formData[ columnConfig.name ] = columnConfig.dataSource;

                        Container.setDataSource(columnConfig.name + 'Value2Key', value2Key);
                        $scope.formDataValue2Key[ columnConfig.name ] = value2Key;

                        //todo: async code. index not reliable
                        if(index == $scope.modelConfig.columns.length - 1) $scope.search();
                    }else if(columnConfig.dataSourceUrl){
                        Container.getResource(columnConfig.dataSourceUrl).success(function(data){
                            var dataList = [], value2Key = {};
                            data.forEach(function(elem){
                                dataList.push({labelName: elem[ columnConfig.nameKey ], value: elem[ columnConfig.valueKey ]});
                                value2Key[ elem[columnConfig.valueKey] ] = elem[ columnConfig.nameKey ];
                            });
                            Container.setDataSource(columnConfig.name + 'DataList', dataList);
                            $scope.formData[ columnConfig.name ] = dataList;

                            Container.setDataSource(columnConfig.name + 'Value2Key', value2Key);
                            $scope.formDataValue2Key[ columnConfig.name ] = value2Key;
                            if(index == $scope.modelConfig.columns.length - 1) $scope.search();
                        });
                    }else{
                        $log.error('missing dataSource[Url] for ' + columnConfig.name);
                    }
                }else{
                    if(index == $scope.modelConfig.columns.length - 1) $scope.search();
                }
            });
        };

        $scope.curRecord = {};
        $scope.inEditing = false;

        $scope.recordList = [];

        $scope.query = {};

        $scope.create = function(){
            var curRecord = angular.copy($scope.curRecord);
            Container.createResoure('/admin/restful/models/' + $scope.modelConfig._id, curRecord).success(function(data){
                Container.updateAlertMessage(false, 'Create success; _id: ' + data._id);

                var curRecordIndex;
                $scope.recordList.forEach(function(elem, index){
                    if(elem._id == data._id) curRecordIndex = index;
                });

                if(curRecordIndex != undefined){
                    $scope.recordList[curRecordIndex] = data;
                }else{
                    $scope.recordList.unshift(data);
                }
            });
        };

        $scope.update = function(){
            var curRecord = angular.copy($scope.curRecord);
            var curId = curRecord._id;
            delete curRecord._id;
            Container.updateResource('/admin/restful/models/' + $scope.modelConfig._id + '/' + curId, curRecord).success(function(data){
                Container.updateAlertMessage(false, 'Update Success; _id: ' + curId);
                angular.forEach($scope.recordList, function(elem, index){
                    if(elem._id == curId) $scope.recordList[index] = angular.copy($scope.curRecord);
                });
            });
        };

        $scope.delete = function(_id){
            Container.deleteResource('/admin/restful/models/' + $scope.modelConfig._id + '/' + _id).success(function(data){
                Container.updateAlertMessage(false, 'Delete success; _id: ' + _id);

                angular.forEach($scope.recordList, function(elem, index){
                    if(elem._id == _id) curIndex = index;
                });

                if(curIndex != undefined)
                    $scope.recordList.splice(curIndex, 1);
            });
        };

        $scope.debug = function(){
            console.log($scope.formData);
            console.log($scope.formDataValue2Key);
            console.log($scope.query);
            console.log($scope.curRecord);
            Container.updateAlertMessage(false, JSON.stringify($scope.curRecord, null, '  '));
        };

        $scope.reset = function(){
            $scope.curRecord = {};
            $scope.inEditing = false;
        };

        $scope.search = function(){
            Object.keys($scope.query).forEach(function(elem){
                if($scope.query[elem] === '') delete $scope.query[elem];
            });
            Container.getResource('/admin/restful/models/' + $scope.modelConfig._id, $scope.query).success(function(data){
                $scope.recordList = data;
            });
        };

        $scope.resetSearch = function(){
            $scope.query = {};
        };
        $scope.initEdit = function(_id){
            angular.forEach($scope.recordList, function(elem, index){
                if(_id == elem._id){
                    $scope.inEditing = true;
                    $scope.curRecord = angular.copy($scope.recordList[index]);;
                }
            });
        };

        $scope.initCopy = function(_id){
            angular.forEach($scope.recordList, function(elem, index){
                if(_id == elem._id){
                    var curRecord = angular.copy($scope.recordList[index]);
                    delete curRecord._id;
                    $scope.inEditing = false;
                    $scope.curRecord = curRecord;
                }
            });
        };


        $scope.openAddColumnDialog = function (selectedColumnName) {
            if(!$scope.curRecord.columns) $scope.curRecord.columns = [];

            var modalInstance = $modal.open({
                templateUrl: 'tcrudAddColumnDialog.html',
                controller: 'tcrudAddColumnDialog',
                size: 'lg',
                resolve: {
                    columns: function () {
                        //pass all columns array to modal-- modal doesnot support stream results
                        return $scope.curRecord.columns;
                    },
                    selectedColumnName: function(){
                        return selectedColumnName;
                    },
                }
            });

            modalInstance.result.then(function (selectedItem) {
                $scope.selected = selectedItem;
            }, function () {
                $log.info('Modal dismissed at: ' + new Date());
            });
        };

        $scope.modelMetaRemoveColumn = function(name){
            console.log(name);
        };
    }])
    .directive('tcrudConfig',  function(){
        return {
            restrict: 'E',
            link: function link(scope, element, attrs) {
                scope.initializeConfig(scope.$new(true).$eval(attrs['data']));
                scope.search();
            }
        };
    });

    angular.module('tcrud').controller('tcrudAddColumnDialog', ['$scope', 'Container', '$modalInstance', '$log', 'columns', 'selectedColumnName', function($scope, Container, $modalInstance, $log, columns, selectedColumnName){
        $scope.curColumn = {};

        columns.forEach(function(elem){
            if(elem.name == selectedColumnName) $scope.curColumn = angular.copy(elem);
        });

        $scope.createDataSource = function(){
            var curDataSource;
            if(!$scope.curColumn.dataSource) $scope.curColumn.dataSource = [];

            $scope.curColumn.dataSource.forEach(function(elem){
                if(elem.value == $scope.dataSourceValue) curDataSource = elem;
            });

            if(curDataSource){
                curDataSource.labelName = $scope.dataSourceLabelName;
            }else{
                $scope.curColumn.dataSource.push({labelName: $scope.dataSourceLabelName, value: $scope.dataSourceValue});
            }
        };

        $scope.initEditDataSource = function(searchValue){
            var curDataSource;
            $scope.curColumn.dataSource.forEach(function(elem){
                if(elem.value == searchValue) curDataSource = elem;
            });

            if(curDataSource){
                $scope.dataSourceLabelName = curDataSource.labelName;
                $scope.dataSourceValue = curDataSource.value;
            }
        };

        $scope.deleteDataSource = function(searchValue){
            var curDataSourceIndex;
            $scope.curColumn.dataSource.forEach(function(elem, index){
                if(elem.value == searchValue) curDataSourceIndex = index;
            });

            $scope.curColumn.dataSource.splice(curDataSourceIndex, 1);
        };

        $scope.save = function () {
            var newColumn = angular.copy($scope.curColumn);

            var curColumnIndex;
            columns.forEach(function(elem, index){
                if(elem.name == newColumn.name) curColumnIndex = index;
            });

            if(curColumnIndex != undefined){
                columns[curColumnIndex] = newColumn;
            }else{
                columns.push(newColumn);
            }
            //$modalInstance.close($scope.selected.item);
        };

        $scope.exit = function () {
            $modalInstance.dismiss('cancel');
        };

        $scope.debug = function(){
            console.log($scope.curColumn);
        };
    }]);
})(window.angular);
