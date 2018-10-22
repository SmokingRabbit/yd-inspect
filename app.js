const path = require(`path`);
const fs = require(`fs`);
const childProcess = require(`child_process`);
const clc = require(`cli-color`);
const readline = require(`readline`);
const request = require(`request`);
const xlsxParser = require(`node-xlsx`);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
const { exec } = childProcess;
const host = 'https://smokingrabbit.github.io/yd-inspect/';

!function () {
    let inspectFiles = [];
    let filePath = null;
    let inspectAllIndex = 0;
    let codeMap = {};

    function tapConfirm(cb, timeout) {
         exec(`${codeMap.adb} shell input tap 400 454`, (err, stdout, stderr) => {
            if (err) {
                return console.log(clc.redBright(codeMap.bootFailure));
            }
            else {
                if (cb) {
                    if (timeout) {
                        setTimeout(() => {
                            cb();
                        }, 13000);
                    }
                    else {
                        cb();
                    }
                }
            }
        });
    }

    function tapSartInspect(cb) {
        exec(`${codeMap.adb} shell input tap 90 760`, (err, stdout, stderr) => {
            if (err) {
                return console.log(clc.redBright(codeMap.bootFailure));
            }
            else {
                tapConfirm(cb);
            }
        });
    }

    function tapSubmitInspect(cb, timeout = false) {
        exec(`${codeMap.adb} shell input tap 246 760`, (err, stdout, stderr) => {
            if (err) {
                return console.log(clc.redBright(codeMap.bootFailure));
            }
            else {
                tapConfirm(cb, timeout);
            }
        });
    }

    function startInspect(cb) {
        request.get(`${host}auth.json`, (err, res, body) => {
            if (err) {
                console.log(error);
                return closeRL();
            }

            try {
                body = JSON.parse(body);
            } catch (e) {
                closeRL();
            }

            const auth = body.authorization;

            const fileContent = xlsxParser.parse(filePath).shift();

            let index = 0;
            fileContent.data.shift();
            console.log(clc.magenta(`\n\n***********************************************************************`));
            console.log(clc.blue(`\t${codeMap.prepareLine}：` + fileContent.name + `\n`));

            const autoLatlng = () => {
                const data = fileContent.data[index];
                if (!data) {
                    tapSubmitInspect(cb, true);
                    console.log(clc.blue(`\t${codeMap.inspectEnd}`));
                    console.log(clc.magenta(`***********************************************************************`));
                    return ;
                }

                const lng = data[1];
                const lat = data[2];


                console.log(clc.cyan(`\t${index + 1}. ${codeMap.point}： ${lng}，${lat}`));

                const fail = () => {
                    console.log(clc.redBright(`\t${codeMap.positioningFailure}\n`));
                    setTimeout(() => {
                        autoLatlng();
                    }, 2000);
                }

                const nextPoint = () => {
                    console.log(clc.green(`\t${codeMap.positioningSuccess}\n`));

                    setTimeout(() => {
                        index++;
                        autoLatlng();
                    }, 8000 + Math.random() * 5);
                }

                if (!auth) {
                    nextPoint();
                    return;
                }

                exec(`${codeMap.adb} shell setprop persist.nox.gps.latitude ${lat}`, (err, stdout, stderr) => {
                    if (!err) {
                        exec(`${codeMap.adb} shell setprop persist.nox.gps.longitude  ${lng}`, (err, stdout, stderr) => {
                            if (!err) {
                                nextPoint();
                            }
                            else {
                                fail();
                            }
                        });
                    }
                    else {
                        fail();
                    }
                });
            }

            autoLatlng();
        });
    }

    function closeRL() {
        setTimeout(() => {
            rl.close();
        }, 15000);
    }

    function inspectAll() {
        filePath = path.join(__dirname, `${codeMap.file}`, `${inspectFiles[inspectAllIndex]}`);

        const cb = () => {
            startInspect(() => {
                inspectAllIndex++;

                if (inspectAllIndex < inspectFiles.length) {
                    inspectAll();
                }
                else {
                    console.log(clc.green(`\n\n${codeMap.exitAll}`));
                    closeRL();
                }
            });
        }

        tapSartInspect(cb);
    }

    function inspectSelect() {
        console.log(`\n\n`);
        inspectFiles.forEach((file, index) => {
            console.log(clc.blue(`\t${index + 1}. ${file}`));
        });

        rl.question(clc.yellowBright(`${codeMap.lineNumber}：`), (answer) => {
            answer = parseInt(answer, 10);

            if (answer < 1 || answer > inspectFiles.length) {
                console.log(clc.redBright(`${codeMap.inputLineNumberError}`));
                return inspectSelect();
            }

            filePath = path.join(__dirname, `${codeMap.file}`, `${inspectFiles[answer-1]}`);

            const cb = () => {
                startInspect(() => {
                    console.log(clc.green(`\n\n${codeMap.exitSelf}`));
                    closeRL();
                });
            }

            tapSartInspect(cb);
        });
    }

    function selectCategory() {
        rl.question(clc.yellowBright(`${codeMap.select}：\n\t1. ${codeMap.all} \n\t2. ${codeMap.self} \n(${codeMap.inputNumber})\t`), (answer) => {
            answer = parseInt(answer, 10);

            if (answer !== 1 && answer !== 2) {
                console.log(clc.redBright(`${codeMap.inputNumberError}`));
                selectCategory();
            }
            else {
                switch (answer) {
                    case 1:
                        inspectAll();
                        break;
                    case 2:
                        inspectSelect();
                        break;
                }
            }
        });
    }

    function run () {
        request.get(`${host}code.json`, (err, res, body) => {
            if (err) {
                console.log(error);
                return closeRL();
            }

            try {
                body = JSON.parse(body);
            } catch (e) {
                closeRL();
            }

            codeMap = body;


            console.log(clc.white(`${codeMap.loading}`));

            fs.readdir(path.join(__dirname, `${codeMap.file}`), (err, files) => {
                if (err || files.length === 0) {
                    console.log(clc.redBright(`${codeMap.loadFailure}`));
                    closeRL();
                }
                else {
                    inspectFiles = files.filter((file) => {
                        return file.indexOf(`xlsx`) > -1;
                    });
                    console.log(clc.white(`${codeMap.loadingText}${inspectFiles.length}${codeMap.file}`));

                    selectCategory();
                }
            });
        });
    }

    run();
}();
