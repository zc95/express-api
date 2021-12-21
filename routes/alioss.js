const express = require('express');
const router = express.Router();
const fs = require('fs');
const multer = require('multer');
const OSS = require('ali-oss');
const { getFileName, getExtension } = require('../utils/file');

// 存储文件
var storage = multer.diskStorage({
    // 存放的路径
    destination: function (req, file, cb) {
        cb(null, 'uploads');
    },
    // 重命名上传的文件
    filename: function (req, file, cb) {
        const fileName = getFileName(file.originalname);
        const fileExtension = getExtension(file.originalname);
        cb(null, `${fileName}.${fileExtension}`);
    }
});

// 上传中间件
const uploadMiddle = multer({
    storage
}).single('file');

let client = new OSS({
    bucket: '', // 通过控制台或PutBucket创建的Bucket。
    region: '', // Bucket所在的区域， 默认值为oss-cn-hangzhou
    accessKeyId: '', // 通过阿里云控制台创建的AccessKey ID
    accessKeySecret: '', // 通过阿里云控制台创建的AccessKey Secret
    secure: true // 设置secure为true，则使用HTTPS
});

router.post('/upload', uploadMiddle, async (req, res) => {
    const { filename, path } = req.file;
    const { directory, forbidOverwrite } = req.body;

    try {
        // 检查是否包含中文名
        const reg = new RegExp('[\\u4E00-\\u9FFF]+', 'g');
        if (reg.test(filename)) {
            throw new Error('文件名不得包含汉字！');
        }

        // 上传
        let result = await put(req.file, directory, forbidOverwrite);

        // 移除临时文件
        fs.unlinkSync(path);

        // 返回
        if (result.url) {
            return res.send({
                code: 0,
                data: result.url
            });
        } else if (result.status === 409) {
            return res.send({
                code: 1,
                msg: '重复上传'
            });
        } else {
            throw new Error(result.message || result.code);
        }
    } catch (error) {
        fs.unlinkSync(path);
        res.status(500).json({
            message: error.message,
            errors: error.stack
        });
    }
});

/**
 * @param {String} file 上传文件信息
 * @param {String} forbidOverwrite 禁止覆盖重写文件
 * @returns
 */
async function put(file, directory = 'static', forbidOverwrite = true) {
    const { filename, path, mimetype } = file;

    // 处理directory
    directory = replaceSlash(directory) || 'static';

    // 设置 content-type
    let contentType = mimetype;
    if (['image/jpeg', 'image/png'].includes(mimetype)) contentType = 'image/jpg';
    try {
        let result = await client.put(`${directory}/${filename}`, path, {
            headers: {
                'x-oss-forbid-overwrite': forbidOverwrite, // 默认true 禁止重复上传
                'content-type': contentType,
                'content-disposition': 'inline;filename=' + encodeURIComponent(filename)
            }
        });
        return result;
    } catch (error) {
        return error;
    }
}

/**
 * 去除路径中的多余斜杠，去除末尾的斜杠
 * @param {String} str 路径字符串
 * @returns
 */
function replaceSlash(str) {
    // 去除前后空白
    str = str.trim();
    // 去除重复的斜杠
    str = str.replace(/\/+/g, '/');
    // 去除结尾的斜杠
    if (str.charAt(0, str.length - 1) === '/') {
        str = str.substr(0, str.length - 1);
    }
    return str;
}
module.exports = router;
