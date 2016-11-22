var http = require('http');
var url = require('url');
var fs = require('fs');
var util = require('util');
var querystring = require("querystring");
var low = require('lowdb');
var path = require('path');

var arg = process.argv.splice(2);

// var HOST = "192.178.100.88";
var HOST = arg[0] || '192.178.106.152';
//var HOST = '192.168.1.107';
var PORT = 8093;

var mimetype = {
    'txt': 'text/plain',
    'html': 'text/html',
    'css': 'text/css',
    'xml': 'application/xml',
    'json': 'application/json',
    'js': 'application/javascript',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'png': 'image/png',
    'svg': 'image/svg+xml'
}

var walk = function(dir, done) {
    var results = [];
    fs.readdir(dir, function(err, list) {
        if (err) return done(err);
        var i = 0;
        (function next() {
            var file = list[i++];
            if (!file) return done(null, results);
            file = dir + '/' + file;
            fs.stat(file, function(err, stat) {
                if (stat && stat.isDirectory()) {
                    walk(file, function(err, res) {
                        results = results.concat(res);
                        next();
                    });
                } else {
                    if (file.substring(0, 2) != ".~") {
                        results.push(file);
                    }
                    next();
                }
            });
        })();
    });
}

var page_404 = function(req, res, path) {
    res.writeHead(404, {
        'Content-Type': 'text/html'
    });
    res.write('<!doctype html>\n');
    res.write('<title>404 Not Found</title>\n');
    res.write('<h1>Not Found</h1>');
    res.write(
        '<p>The requested URL ' +
        path +
        ' was not found on this server.</p>'
    );
    res.end();
}
var page_500 = function(req, res, error) {
    res.writeHead(500, {
        'Content-Type': 'text/html'
    });
    res.write('<!doctype html>\n');
    res.write('<title>Internal Server Error</title>\n');
    res.write('<h1>Internal Server Error</h1>');
    res.write('<pre>' + util.inspect(error) + '</pre>');
}

var getTime = function() {
    var mydate = new Date(Date.now());
    var month = mydate.getMonth() + 1;
    if (mydate.getDate() < 10) {
        var day = "0" + mydate.getDate();
    } else {
        var day = mydate.getDate();
    }

    var time = mydate.getFullYear() + "" + month + day + mydate.getHours() + mydate.getMinutes() + mydate.getSeconds();
    return time;
}

var _formatUrl = function(url) {
    url = url.replace(/^https?:\/\/(localhost|[\d\.]{12,14}):\d{1,4}/, '').replace(/^\//, '').replace(/\/$/, '').replace(/\//g, '_');
    return url;
}

var _getUrlKey = function(url) {
    url = url.replace(/^https?:\/\/(localhost|[\d\.]{12,14}):\d{1,4}/, '').replace(/\/$/, '');
    return url
}

var _getPostData = function(req, func) {
    req.setEncoding('utf8');
    var postData = ""; //POST & GET ： name=zzl&email=zzl@sina.com
    // 数据块接收中
    req.addListener("data", function(postDataChunk) {
        postData += postDataChunk;
    });

    // 数据接收完毕，执行回调函数
    req.addListener("end", function() {
        console.log('Before:' + JSON.stringify(postData));
        func(postData);
    });
}

var all_mock = function(req, res) {
    console.log(process.env.HOME);
    walk("./json", function(err, results) {
        if (err) throw err;
        console.log(results);
        var result = [];
        for (var i = 0; i < results.length; i++) {
            var val = results[i];
            val = val.replace(/^\.\.\//, '').replace(/^\.\//, '');
            console.log('path:' + val);
            var db = low(val);
            console.log(db('data').value()[0]);
            result.push(db('data').value()[0]);
        }
        res.writeHead(200, {
            'Content-Type': 'application/json;charset=utf-8'
        });
        res.write(JSON.stringify(result));
        res.end();
    });
}

var add_mock = function(req, res) {
    _getPostData(req, function(postData) {
        console.log('POSTDATA:' + JSON.stringify(postData));
        var params = querystring.parse(postData);
        params.createTime = getTime();
        params.updateTime = params.createTime;
        params.url = _getUrlKey(params.url);

        var _url = params.url;
        console.log("format url:" + _url);
        var db = low('json/' + _formatUrl(_url) + ".json");
        var id = db('data').find({
            url: params.url
        });
        try {
            if (id) {
                res.writeHead(200, {
                    'Content-Type': 'application/json;charset=utf-8'
                });
                res.write('{"errCode":"1","errMsg":"您已经提交过了，请不要重复提交"}');
                res.end();
            } else {
                params = JSON.parse(JSON.stringify(params));
                var b = db('data').push(params);
                res.writeHead(200, {
                    'Content-Type': 'application/json;charset=utf-8'
                });
                res.write('{"errCode":"000","errMsg":"添加成功"}');
                res.end();
            }
        } catch (err) {
            res.writeHead(200, {
                'Content-Type': 'application/json;charset=utf-8'
            });
            res.write('{"errCode":"2","errMsg":"服务忙，请重新提交，谢谢！"}');
            res.end();
        }
    });
}

var delete_mock = function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'application/json;charset=utf-8'
    });
    res.write('{"errCode":"000","errMsg":"删除成功"}');
    res.end();
}

var update_mock = function(req, res) {
    _getPostData(req, function(postData) {
        console.log('POSTDATA:' + JSON.stringify(postData));
        var params = querystring.parse(postData);
        params.updateTime = getTime();
        params.url = _getUrlKey(params.url);

        var _url = params.url;
        console.log("format url:" + _url);
        var db = low('json/' + _formatUrl(_url) + ".json");
        var id = db('data').find({
            url: params.url
        });
        console.log(JSON.stringify(params.json));
        params.json = JSON.parse(JSON.stringify(params.json));
        try {
            if (id) {
                db('data')
                    .chain()
                    .find({ url:  params.url})
                    .assign({ json: params.json, updateTime:params.updateTime})
                    .value();
                res.writeHead(200, {
                    'Content-Type': 'application/json;charset=utf-8'
                });
                res.write('{"errCode":"1","errMsg":"更新成功！"}');
                res.end();
            } else {
                var b = db('data').push(params);
                res.writeHead(200, {
                    'Content-Type': 'application/json;charset=utf-8'
                });
                res.write('{"errCode":"000","errMsg":"添加成功"}');
                res.end();
            }
        } catch (err) {
            console.log(err);
            res.writeHead(200, {
                'Content-Type': 'application/json;charset=utf-8'
            });
            res.write('{"errCode":"2","errMsg":"服务忙，请重新提交，谢谢！"}');
            res.end();
        }
    });}

var mock_api = function(req, res, pathName,params) {
     var params = params;
    var _pathName = pathName;
    _pathName = _pathName.replace(/^\/mock/, '');//获取到接口名称
    var jsonPath = "./json/" + _formatUrl(_pathName) + ".json";//拼接文件路径名称
    fs.stat(jsonPath, function(err, stat) {
        if (stat && stat.isFile()) {
            var db = low(jsonPath);
            try {
                var jsonData =  db('data').value()[0]['json'];
                 if(params.query.callback){
                    jsonData =  params.query.callback+"("+JSON.parse(JSON.stringify(jsonData))+")";
                }else{
                    jsonData =  JSON.parse(JSON.stringify(jsonData));
                }
                res.writeHead(200, {
                    'Content-Type': 'application/json;charset=utf-8'
                });
                res.write(jsonData);
                res.end();
            } catch (err) {
                res.writeHead(200, {
                    'Content-Type': 'application/json;charset=utf-8'
                });
                res.write('{"errCode":"222","errMsg":"服务忙，请重新提交，谢谢！"}');
                res.end();
            }
        } else {
            console.log(jsonPath+' not exist');
            res.writeHead(200, {
                'Content-Type': 'application/json;charset=utf-8'
            });
            res.write('{"errCode":"111","errMsg":"请求路径不对"}');
            res.end();
        }
    })
}

var route = {
    "/": "/html/main.html",
    "/all": function(req, res) {
        return all_mock(req, res);
    },
    "/add": function(req, res) {
        console.log("enter in add");
        return add_mock(req, res);
    },
    "/delete": function(req, res) {
        console.log('enter in delete');
        return delete_mock(req, res);
    },
    "/update": function(req, res) {
        console.log('enter in update');
        return update_mock(req, res);
    }
}
http.createServer(function(req, res) {
    var params = url.parse(req.url, true);
    var pathname = url.parse(req.url).pathname;
    for (var item in route) {
        if (pathname == item) {
            var val = route[item];
            var type = typeof val;
            if (type == "string") {
                console.log("it's string");
                pathname = val;
            } else if (type == "function") {
                console.log("It's function");
                return val.call(null, req, res);
            } else {
                console.log('NO MATCH ROUTE');
            }
        }
    }

    if (pathname.indexOf("/mock") == 0) {
        return mock_api(req, res, pathname,params);
    }

    console.log('PATHNAME:' + pathname);

    var realPath = __dirname + pathname;
    fs.exists(realPath, function(exists) {
        if (!exists) {
            return page_404(req, res, pathname);
        } else {
            var file = fs.createReadStream(realPath);
            res.writeHead(200, {
                'Content-Type': mimetype[realPath.split('.').pop()] || 'text/plain'
            });
            file.on('data', res.write.bind(res));
            file.on('close', res.end.bind(res));
            file.on('error', function(err) {
                return page_500(req, res, err);
            });
        }
    });
}).listen(PORT, HOST);

console.log('Server running at http://' + HOST + ':' + PORT + '/');
