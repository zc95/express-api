const path = require('path');
const fs = require('fs');

//递归创建目录 同步方法
function mkdirsSync(dirname) {
    if (fs.existsSync(dirname)) {
        return true;
    } else {
        if (mkdirsSync(path.dirname(dirname))) {
            fs.mkdirSync(dirname);
            return true;
        }
    }
}

// 获取文件名
function getFileName(source) {
    return source.substring(0, source.lastIndexOf('.'));
}

// 获取文件后缀名
function getExtension(source) {
    return source.toLowerCase().substring(source.lastIndexOf('.') + 1);
}

module.exports = {
    mkdirsSync,
    getFileName,
    getExtension
};
