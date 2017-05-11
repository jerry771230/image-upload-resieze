let querystring = require("querystring"),
    fs = require("fs"),
    path = require('path'),
    formidable = require("formidable"),
    jimp = require("jimp"),
    sizeOf = require('image-size'),
    crypto = require('crypto'),
    mkdirp = require('mkdirp');

function start(response) {
    console.log("Request handler 'start' was called.");

    let body = '<html>' +
        '<head>' +
        '<meta http-equiv="Content-Type" content="text/html; ' +
        'charset=UTF-8" />' +
        '</head>' +
        '<body>' +
        '<form action="/upload" enctype="multipart/form-data" ' +
        'method="post">' +
        '<input type="file" name="upload" multiple="multiple" />' +
        '<input type="submit" value="Upload file" />' +
        '</form>' +
        '</body>' +
        '</html>';

    response.writeHead(200, {
        "Content-Type": "text/html"
    });
    response.write(body);
    response.end();
}

function upload(response, request) {
    console.log("Request handler 'upload' was called.");

    let form = new formidable.IncomingForm(),
        imgNormal = {
            width: 1024,
            height: 1024,
            quality: 80
        },
        imgThumbnail = {
            width: 240,
            height: 240,
            quality: 80
        },
        filePrefix = randomValueBase64(8) + '.' + randomValueBase64(12) + '.' + parseInt(new Date().getTime() / 1000, 10),
        fileSuffix = ".thumb",
        imgExt = ".jpg",
        uploadPath = "/Users/jerryhuang/workspace/practice/nodejs/image/userimg/line/854567633507454976/bday/",
        imgMaxSize = imgNormal.width * imgNormal.height;

    console.log("about to parse");

    new Promise((resolve, reject) => {
        if (!isDirectoryExists(uploadPath)) {
            mkdirp.sync(uploadPath, { mode: 0775 });
        }
        resolve();
    }).then(() => {
        form.parse(request, function(error, fields, files) {
            console.log("parsing done");

            console.log(files.upload.size);

            if (files.upload.size > imgMaxSize) {
                // exceed max size, response warning
                response.writeHead(200, {
                    "Content-Type": "application/json"
                });
                let json = JSON.stringify({
                    result: false,
                    errno: 1,
                    errmsg: "exceed max size: 1MB"
                });
                response.end(json);
            } else {

                let dimensions = sizeOf(files.upload.path),
                    rs;

                // normal size: 1024 * 1024
                rs = resize(
                    files.upload.path,
                    imgNormal, {
                        width: dimensions.width,
                        height: dimensions.height
                    },
                    uploadPath + filePrefix + imgExt
                );
                if (!rs) {
                    return errorHandler('normal size failed');
                }

                console.log("normal size done");

                // thumbnail size: 240 * 240
                rs = resize(
                    files.upload.path,
                    imgThumbnail, {
                        width: dimensions.width,
                        height: dimensions.height
                    },
                    uploadPath + filePrefix + fileSuffix + imgExt
                );
                if (!rs) {
                    return errorHandler('thumbnail size failed');
                }
                console.log("thumbnail size done");

                // response.writeHead(200, {
                //     "Content-Type": "text/html"
                // });
                // response.write("received image:<br/>");
                // response.write("<img src='/show' />");
                // response.write("<img src='/show-thumbnail' />");
                // response.end();

                response.writeHead(200, {
                    "Content-Type": "application/json"
                });
                let json = JSON.stringify({
                    result: true,
                    errno: 0,
                    errmsg: "success",
                    data: {
                        thumbnail: filePrefix + fileSuffix + imgExt
                    }
                });
                response.end(json);
            }

        });
    }, errorHandler = function(reason) {
        // Log the rejection reason
        console.log('Handle rejected promise (' + reason + ') here.');

        // response.writeHead(500, {
        //     "Content-Type": "text/plain"
        // });
        // response.write("error handle: " + reason + "\n");
        // response.end();
        response.writeHead(200, {
            "Content-Type": "application/json"
        });
        let json = JSON.stringify({
            result: false,
            errno: 2,
            errmsg: reason
        });
        response.end(json);
    });

}

function show(response, postData) {
    let uploadPath = "/Users/jerryhuang/workspace/practice/nodejs/image/userimg/";
    console.log("Request handler 'show' was called.");
    fs.readFile(uploadPath + "5qrxeC7y.MpBQx093zSgd.1493883997.jpg", "binary", function(error, file) {
        if (error) {
            response.writeHead(500, {
                "Content-Type": "text/plain"
            });
            response.write(error + "\n");
            response.end();
        } else {
            response.writeHead(200, {
                "Content-Type": "image/jpg"
            });
            response.write(file, "binary");
            response.end();
        }
    });

}


function showThumbnail(response, postData) {
    let uploadPath = "/Users/jerryhuang/workspace/practice/nodejs/image/userimg/";
    console.log("Request handler 'show thumbnail was called.");
    fs.readFile(uploadPath + "5qrxeC7y.MpBQx093zSgd.1493883997.thumb.jpg", "binary", function(error, file) {
        if (error) {
            response.writeHead(500, {
                "Content-Type": "text/plain"
            });
            response.write(error + "\n");
            response.end();
        } else {
            response.writeHead(200, {
                "Content-Type": "image/jpg"
            });
            response.write(file, "binary");
            response.end();
        }
    });

}


function resize(file, max, origin, newFile) {
    let needResize = false,
        fitWidth = jimp.AUTO,
        fitHeight = jimp.AUTO;

    console.log(file, max, origin, newFile);

    // exceed max width/ height, then resizing
    if (origin.width > max.width || origin.height > max.height) {
        needResize = true;

        if (origin.width > origin.height) {
            fitWidth = max.width;
        } else {
            fitHeight = max.height;
        }
    }

    console.log(fitWidth, fitHeight);
    jimp.read(file).then(function(img) {
        if (needResize) {
            img.resize(fitWidth, fitHeight); // resize
        }
        img.quality(max.quality) // set JPEG quality
            .write(newFile); // save

    }).catch(function(err) {
        console.error(err);
        return false;
    });

    return true;
}

function isDirectoryExists(directory) {
    try {
        fs.statSync(directory);
        return true;
    } catch (e) {
        return false;
    }
}

function randomValueBase64(len) {
    return crypto.randomBytes(Math.ceil(len * 3 / 4))
        .toString('base64') // convert to base64 format
        .slice(0, len) // return required number of characters
        .replace(/\+/g, '0') // replace '+' with '0'
        .replace(/\//g, '0'); // replace '/' with '0'
}

exports.start = start;
exports.upload = upload;
exports.show = show;
exports.showThumbnail = showThumbnail;
