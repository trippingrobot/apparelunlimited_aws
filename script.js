var Apprarel = angular.module('apparel', ['angularFileUpload']);

function ItemsController($scope, $timeout, $http, $upload, $q) {

    $scope.items = [];

    $scope.upload = function (files) {
        _readFile(files[0], function (content) {
            var skus = content.split('\n');
            _getItems(skus);
        });
    };

    // Private

    function _getItems(skus) {
        $scope.loading = true;
        $scope.items = [];

        $timeout(function () {
            var count = 0;
            async.forEachSeries(skus, function (sku, callback) {
                _getItem(sku, function (item) {
                    $scope.items.push(item);
                    count += 1;
                    if (count == skus.length - 1) {
                        $scope.loading = false;
                    }
                    $timeout(function(){callback()},200); //AWS is Throttling requests
                });
            });

        });

    }

    function _getItem(sku, callback) {
        var timestamp = new Date().toISOString();
        var params = "AWSAccessKeyId=AKIAICTAJK6W2UUNXAGA&AssociateTag=maximliber-20&Condition=All&IdType=ASIN&ItemId=" + sku + "&Operation=ItemLookup&ResponseGroup=Images%2CItemAttributes&Service=AWSECommerceService&Timestamp=" + encodeURIComponent(timestamp);

        var request = "GET\nwebservices.amazon.de\n/onca/xml\n" + params;
        var signed = _signRequest(request);

        params = params + '&Signature=' + encodeURIComponent(signed);

        var link = 'http://webservices.amazon.de/onca/xml?' + params;

        //callback(item);
        var yql = 'http://query.yahooapis.com/v1/public/yql?q=' + encodeURIComponent('select * from xml where url="' + link + '"') + "&format=XML";

        //Get items
        $http.get(yql, {
            withCredentials: false
        }).success(function (data) {
            var parser = new DOMParser();
            var doc = parser.parseFromString(data, "text/xml");

            var node = doc.querySelector('Item');
            console.log(node);

            var item = {
                sku: _tryAndReturnValue(node, 'EAN'),
                asin: sku,
                title: _tryAndReturnValue(node, 'Title'),
                image:_tryAndReturnValue(node, 'LargeImage > URL')
            };

            callback(item);
        });

    };

    function _signRequest(request) {
        var signed = CryptoJS.HmacSHA256(request, "+Z3c9o3FtAqetmbql5P8mjYX3TzLdRAdfmuJBxrM").toString(CryptoJS.enc.Base64);
        return signed;
    };

    function _readFile(file, callback) {
        var reader = new FileReader();

        reader.onload = function (evt) {
            if (evt.target.readyState != 2) return;
            if (evt.target.error) {
                alert('Error while reading file');
                return;
            }

            filecontent = evt.target.result;
            callback(filecontent);
        };

        reader.readAsText(file);
    };

    function _tryAndReturnValue(node, path) {
        try {
            return node.querySelector(path).innerHTML;
        } catch (e) {
            console.log(e);
            return '';
        }
    }

}