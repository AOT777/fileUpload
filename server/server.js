const express = require('express'),
    fs = require('fs'),
    // 对请求体数据进行解析，处理不同类型的请求体：比如text、json、urlencoded等，对应的报文主体的格式不同。
    bodyParser = require('body-parser'),
    //处理传过来的文件自动处理上传，解析 multipart/form-data 格式的请求
    multiparty = require('multiparty'),
    // 根据文件内容生成特定的hash值
    SparkMD5 = require('spark-md5');

/*-CREATE SERVER-*/
const app = express(),
    PORT = 8888,
    HOST = 'http://127.0.0.1',
    HOSTNAME = `${HOST}:${PORT}`;
app.listen(PORT, () => {
    console.log(`THE WEB SERVICE IS CREATED SUCCESSFULLY AND IS LISTENING TO THE PORT：${PORT}，YOU CAN VISIT：${HOSTNAME}`);
});

/*-中间件-*/
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    req.method === 'OPTIONS' ? res.send('CURRENT SERVICES SUPPORT CROSS DOMAIN REQUESTS!') : next();
});
// extended: false：表示使用系统模块querystring来处理，也是官方推荐的
// bodyParser.json是用来解析json数据格式的。bodyParser.urlencoded则是用来解析我们通常的form表单提交的数据
app.use(bodyParser.urlencoded({
    extended: false,
    limit: '1024mb'
}));

/*-API-*/
// 延迟函数
const delay = function delay(interval) {
    typeof interval !== "number" ? interval = 1000 : null;
    return new Promise(resolve => {
        setTimeout(() => {
            resolve();
        }, interval);
    });
};

// 检测文件是否存在
const exists = function exists(path) {
    return new Promise(resolve => {
        // fs.access判断文件和目录是否存在,err存在则怎么文件不存在，否则存在
        // 第二个参数是要检查的权限掩码
        // fs.F_OK - 文件是对于进程是否可见，可以用来检查文件是否存在。也是mode 的默认值
        // fs.R_OK - 文件对于进程是否可读
        // fs.W_OK - 文件对于进程是否可写
        // fs.X_OK - 文件对于进程是否可执行。（Windows系统不可用，执行效果等同fs.F_OK）
        fs.access(path, fs.constants.F_OK, err => {
            if (err) {
                resolve(false);
                return;
            }
            resolve(true);
        });
    });
};

// 创建文件并写入到指定的目录 & 返回客户端结果
// 详细参数介绍可以百度查看
const writeFile = function writeFile(res, path, file, filename, stream) {
    return new Promise((resolve, reject) => {
        //stream为true支持formdata格式，buffer格式不支持
        if (stream) {
            try {
                // 流就是为了在有限的内存中实现我们操作"海量"数据的目标。
                //针对大文件，一边读一边写
                //读取file.path写入path
                let readStream = fs.createReadStream(file.path),
                    writeStream = fs.createWriteStream(path);
                // 格式： 可读流.pipe(可写流)
                // .pipe()函数是接受一个源头src并将数据输出到一个可写的流dst中
                // 简单来说，边读边写东西，读太快，来不及写，就先暂停读，等写完了再继续读。
                readStream.pipe(writeStream);
                // end表示文件读取完成事件，还有error读取错误，open,close,data文件内容
                readStream.on('end', () => {
                    resolve();
                    // 同步删除文件
                    fs.unlinkSync(file.path);
                    res.send({
                        code: 0,
                        codeText: 'upload success',
                        originalFilename: filename,
                        servicePath: path.replace(__dirname, HOSTNAME)
                    });
                });
            } catch (err) {
                reject(err);
                res.send({
                    code: 1,
                    codeText: err
                });
            }
            return;
        }
        fs.writeFile(path, file, err => {
            if (err) {
                reject(err);
                res.send({
                    code: 1,
                    codeText: err
                });
                return;
            }
            resolve();
            res.send({
                code: 0,
                codeText: 'upload success',
                originalFilename: filename,
                servicePath: path.replace(__dirname, HOSTNAME)
            });
        });
    });
};

// 基于multiparty插件实现文件上传处理 & form-data解析
const uploadDir = `${__dirname}/upload`;
const multiparty_upload = function multiparty_upload(req, auto) {
    // auto为true则自动解析上传，否则只解析不上传
    typeof auto !== "boolean" ? auto = false : null;
    let config = {
        maxFieldsSize: 200 * 1024 * 1024,
    };
    if (auto) config.uploadDir = uploadDir;
    return new Promise(async (resolve, reject) => {
        await delay();
        new multiparty.Form(config)
            .parse(req, (err, fields, files) => {
                if (err) {
                    reject(err);
                    return;
                }
                //fields里面有个filename属性存放的是文件名数组
                //files里面有个file属性存放的是文件数组
                resolve({
                    fields,
                    files
                });
            });
    });
};

// 单文件上传处理「FORM-DATA」
app.post('/upload_single', async (req, res) => {
    try {
        let {
            files
        } = await multiparty_upload(req, true);
        let file = (files.file && files.file[0]) || {};
        res.send({
            code: 0,
            codeText: 'upload success',
            originalFilename: file.originalFilename,
            servicePath: file.path.replace(__dirname, HOSTNAME)
        });
    } catch (err) {
        res.send({
            code: 1,
            codeText: err
        });
    }
});

app.post('/upload_single_name', async (req, res) => {
    try {
        let {
            fields,
            files
        } = await multiparty_upload(req);
        let file = (files.file && files.file[0]) || {},
            filename = (fields.filename && fields.filename[0]) || "",
            path = `${uploadDir}/${filename}`,
            isExists = false;
        // 检测是否存在
        isExists = await exists(path);
        if (isExists) {
            res.send({
                code: 0,
                codeText: 'file is exists',
                originalFilename: filename,
                servicePath: path.replace(__dirname, HOSTNAME)
            });
            return;
        }
        writeFile(res, path, file, filename, true);
    } catch (err) {
        res.send({
            code: 1,
            codeText: err
        });
    }
});

// 单文件上传处理「BASE64」
app.post('/upload_single_base64', async (req, res) => {
    let file = req.body.file,
        filename = req.body.filename,
        spark = new SparkMD5.ArrayBuffer(),
        suffix = /\.([0-9a-zA-Z]+)$/.exec(filename)[1],//获取文件名后缀
        isExists = false,
        path;
    file = decodeURIComponent(file);//解析
    file = file.replace(/^data:image\/\w+;base64,/, "");//去除base64格式内容前部分
    file = Buffer.from(file, 'base64');//将base64格式转换为普通格式
    spark.append(file);//将file添加给spark,通过spark.end可以拿到指定的hash值
    path = `${uploadDir}/${spark.end()}.${suffix}`;
    await delay();
    // 检测是否存在
    isExists = await exists(path);
    if (isExists) {
        res.send({
            code: 0,
            codeText: 'file is exists',
            originalFilename: filename,
            servicePath: path.replace(__dirname, HOSTNAME)
        });
        return;
    }
    writeFile(res, path, file, filename, false);
});

// 大文件切片上传 & 合并切片
const merge = function merge(HASH, count) {
    return new Promise(async (resolve, reject) => {
        let path = `${uploadDir}/${HASH}`,
            fileList = [],
            suffix,
            isExists;
        isExists = await exists(path);
        if (!isExists) {
            reject('HASH path is not found!');
            return;
        }
        fileList = fs.readdirSync(path);//读取文件夹中所有切片的名称，返回一个数组
        if (fileList.length < count) {
            reject('the slice has not been uploaded!');
            return;
        }
        //reg匹配出_index,比如_1，_2，_3等等，b表示为a的后一位，比如a为fileList数组第一位则b为第二位
        // reg.exec(a)[0]表示_1,reg.exec(a)[1]表示1，两者差_，ab相减小于0表示升序
        fileList.sort((a, b) => {
            let reg = /_(\d+)/;
            return reg.exec(a)[1] - reg.exec(b)[1];
        }).forEach(item => {
            //比如后缀是.png,那么exec(item)[0]表示.png，exec(item)[1]表示png，差个点
            !suffix ? suffix = /\.([0-9a-zA-Z]+)$/.exec(item)[1] : null;
            //所有切片合并到一起，和存放切片的文件夹同路径
            //appendFileSync(a,b),从b路径中读取合并到a路径
            fs.appendFileSync(`${uploadDir}/${HASH}.${suffix}`, fs.readFileSync(`${path}/${item}`));
            //读一个切片合并完成则删除该切片
            fs.unlinkSync(`${path}/${item}`);
        });
        // 清除文件夹
        fs.rmdirSync(path);
        resolve({
            path: `${uploadDir}/${HASH}.${suffix}`,
            filename: `${HASH}.${suffix}`
        });
    });
};
app.post('/upload_chunk', async (req, res) => {
    try {
        let {
            fields,
            files
        } = await multiparty_upload(req);
        let file = (files.file && files.file[0]) || {},
            filename = (fields.filename && fields.filename[0]) || "",
            path = '',
            isExists = false;
        // 创建存放切片的临时目录
        //[^_]表示除了符号_之外，+代表多个，最终匹配出HASH_index
        //数组解构
        let [, HASH] = /^([^_]+)_(\d+)/.exec(filename);
        path = `${uploadDir}/${HASH}`;//创建文件夹地址
        !fs.existsSync(path) ? fs.mkdirSync(path) : null;//创建文件夹，名称问HASH
        // 把切片存储到临时目录中
        path = `${uploadDir}/${HASH}/${filename}`;//表示文件夹里的每一个切片内容
        isExists = await exists(path);
        if (isExists) {
            res.send({
                code: 0,
                codeText: 'file is exists',
                originalFilename: filename,
                servicePath: path.replace(__dirname, HOSTNAME)
            });
            return;
        }
        writeFile(res, path, file, filename, true);
    } catch (err) {
        res.send({
            code: 1,
            codeText: err
        });
    }
});
app.post('/upload_merge', async (req, res) => {
    let {
        HASH,
        count
    } = req.body;
    try {
        let {
            filename,
            path
        } = await merge(HASH, count);
        res.send({
            code: 0,
            codeText: 'merge success',
            originalFilename: filename,
            servicePath: path.replace(__dirname, HOSTNAME)
        });
    } catch (err) {
        res.send({
            code: 1,
            codeText: err
        });
    }
});
app.get('/upload_already', async (req, res) => {
    let {
        HASH
    } = req.query;
    //文件夹位置
    let path = `${uploadDir}/${HASH}`,
        fileList = [];
    try {
        //读取文件夹中所有切片的名称，返回一个数组
        fileList = fs.readdirSync(path);
        fileList = fileList.sort((a, b) => {
            let reg = /_(\d+)/;
            return reg.exec(a)[1] - reg.exec(b)[1];
        });
        res.send({
            code: 0,
            codeText: '',
            fileList: fileList
        });
    } catch (err) {
        res.send({
            code: 0,
            codeText: '',
            fileList: fileList
        });
    }
});

app.use(express.static('./'));
app.use((req, res) => {
    res.status(404);
    res.send('NOT FOUND!');
});