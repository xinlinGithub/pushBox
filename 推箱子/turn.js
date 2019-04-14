// 去掉移动端300ms的延时
window.addEventListener("load", function () {
    FastClick.attach( document.body );
})
// 通过操作每一关的二维数组来间接操作视图 
// 0：地板 1：墙 2：放置箱子的目标点 3：箱子 4：小人 5：箱子压着目标物的情况
// 利用h5新特性canvas来绘制视图
//  他可以开启一个新的合成层 开启gpu加速 有助于提高性能
// 图片为网上找的资源 代码自己编写的
var pushBoxGame = {
    w: 35,//每个格的宽
    h: 35,// 每个格的高
    timer: 0,//计算走了多少步
    block: null,// 存地板图片
    box: null,//存取箱子图片
    wall: null, //存取墙图片
    ball: null,// 盛放箱子的目标地图片
    down: null,//小人朝下图片
    up: null, //小人朝上图片
    left: null, //小人朝左图片
    right: null,//小人朝右图片
    curMan: null,// 当前小人对应的图片
    curLstr: 'easyLevels', // 当前关卡难度
    curLevels: [],// 取出指定难度的所有关卡
    curStepArr: [],// 存储每一关
    fixedStepArr: [],
    curSteps: 0, // 当前难度下的关卡数
    manPer: null, // 记录小人的坐标位置 是一个对象；
    canvas: document.getElementById("canvas"),
    ctx: this.canvas.getContext("2d"),// 画布画笔
    step: document.getElementById("step"),// 改变innerHTML=timer显示步数
    next: document.getElementById("next"),// 为他绑定点击事件 进入下一关
    prev: document.getElementById("prev"),// 为他绑定点击事件 返回上一关
    restart: document.getElementById("restart"),//为他绑定点击事件 重新开始本关
    retStep: document.getElementById("retStep"),// 为他绑定点击事件 返回上一步
    easy: document.getElementById("easy"),// 简单关卡选项
    mid: document.getElementById("mid"),//中等关卡选项
    cool: document.getElementById("cool"), //困难关卡选项
    level: document.getElementById("level"),//显示关卡数
    lastSteps: [],// 利用栈结构储存以前的每一个有效步骤更改后的二维数组 回退时出栈一个 将前一个重新绘制
    levels,// 所有游戏关卡 在另一个文件中引入的
    col: this.levels[0][0].length,// 方块的列数16
    row: this.levels[0].length,//方块的行数16
    preLen: Math.floor(this.levels.length / 3),// 每难度等级对应的关卡数
    easyLevels: [],// 简单的关卡
    midLevels: [],// 中等难度关卡
    difficultLevels: [],// 困难关卡
    images: {// 用于加载各张图片
        ball: "./images/ball.png",
        block: "./images/block.gif",
        down: "./images/down.png",
        up: "./images/up.png",
        left: "./images/left.png",
        right: "./images/right.png",
        wall: "./images/wall.png",
        box: "./images/box.png"
    },
    startGame() {//开始游戏
        this.pressKey();
        this.easyLevels = this.levels.slice(0, this.preLen);
        this.midLevels = this.levels.slice(this.preLen, this.preLen * 2);
        this.difficultLevels = this.levels.slice(this.preLen * 2, this.levels.length);
        this.curLevels = this.easyLevels;
        this.loadImg(this.images, images => {
            for(var type in images) {
                this[type] = images[type];
            }
            // 绘制地板
            this.paintBlock(this.curLevels[0])
            // 绑定事件
            this.bindEvent();
            // 初始化
            this.init();
        })
    },
    init() {//初始化操作
        this.fixedStepArr = this.curLevels[this.curSteps];
        this.curStepArr = this.copyArrayLevels(this.fixedStepArr);// 初始化当前关卡
        this.lastSteps = [this.copyArrayLevels(this.curStepArr)];// 初始记录栈
        this.curMan = this.down;// 初始化人的方向图片 默认朝下
        this.level.innerHTML = this.curSteps + 1;  // 初始化等级
        this.step.innerHTML = this.timer;// 初始化步数
        // 切换关卡时 需要重新绘制一下地板 否则会和上一步叠加 
        this.paintBlock(this.curStepArr);
        this.paintView(this.curStepArr);
    },
    loadImg(imgs, callback) {//加载图片 加载完后再调用回调赋给this
        var len = Object.keys(imgs).length,
            tempImg = {};
        for (var img in imgs) {
            tempImg[img] = new Image();
            tempImg[img].onload = () => {
                if(--len === 0) {
                    callback(tempImg)
                }
            }
            tempImg[img].src = imgs[img];
        }
    },
    position(x, y) {// 设置位置
        return {x,y};
    },
    bindEvent() {// 绑定事件
        document.body.onkeydown = e => {
            var p1, p2;
            switch(e.keyCode) {
                case 37://往左运动 必须判断相邻两个才行 看第一个是不是箱子 箱子旁边是不是墙或箱子
                    p1 = this.position(this.manPer.x, this.manPer.y - 1);
                    p2 = this.position(this.manPer.x, this.manPer.y - 2);
                    this.curMan = this.left;
                    break;
                case 38:// 往上运动
                    p1 = this.position(this.manPer.x - 1, this.manPer.y);
                    p2 = this.position(this.manPer.x - 2, this.manPer.y);
                    this.curMan = this.up;
                    break;
                case 39:// 往右运动
                    p1 = this.position(this.manPer.x, this.manPer.y + 1);
                    p2 = this.position(this.manPer.x, this.manPer.y + 2);
                    this.curMan = this.right;
                    break;
                case 40:// 往下运动
                    p1 = this.position(this.manPer.x + 1, this.manPer.y);
                    p2 = this.position(this.manPer.x + 2, this.manPer.y);
                    this.curMan = this.down;
                    break;
            }
            // 如果可以运动就让他运动 然后改变小人的方向
            this.go(p1, p2);//点击完后让他运动；
            console.log(e.keyCode)
        }
        this.next.onclick = this.nextStep.bind(this);//进入下一关
        this.prev.onclick = this.prevStep.bind(this);//进入上一关
        this.restart.onclick = this.restartStep.bind(this); // 从新开始本关；
        this.retStep.onclick = this.retLastStep.bind(this);// 返回上一关
        this.easy.onclick = () => this.transferLevel('easyLevels');
        this.mid.onclick = () => this.transferLevel('midLevels');
        this.cool.onclick = () => this.transferLevel('difficultLevels');
        this.canvas.onclick = e => this.canvasClick(e);
    },
    canvasClick (e) {//点击运动 代替按键运动
        var y = Math.floor(e.offsetX / this.w)- this.manPer.y;
        var x = Math.floor(e.offsetY / this.h) - this.manPer.x;
        if(x > 0 && y === 0) {// down
            document.body.pressKey(40);
        }else if(x < 0 && y === 0) {// up
            document.body.pressKey(38);
        }else if(x === 0 && y > 0) {// right
            document.body.pressKey(39);
        }else if(x === 0 && y < 0) {// left
            document.body.pressKey(37);
        }
    },
    pressKey() {// 自定义键盘事件 无需按键 点击后传入Code值即可触发
        HTMLElement.prototype.pressKey = function(code) {
            var evt = document.createEvent("UIEvents");
            evt.keyCode = code;
            evt.initEvent("keydown", true, true);
            this.dispatchEvent(evt);
        }
    },
    restartStep() {// 重新开始本关
        this.timer = 0;
        this.init();
    },
    go(p1,p2) {//移动小人
        if(p1 && p2) {
            this.drawSquareImage(this.curMan,this.manPer.x, this.manPer.y);
            if(this.isGoStep(p1, p2)) {
                this.step.innerHTML = ++this.timer;// 初始化步数
                this.lastSteps.push(this.copyArrayLevels(this.curStepArr));
                this.paintBlock(this.curStepArr);
                this.paintView(this.curStepArr);
                this.checkSuccess();
                console.log("可以走")
            }
        }
    },
    isGoStep(p1, p2) {//判断是不是可以移动
        // 左边是箱子 箱子左边不是墙 也不是箱子 可以动
        // 左边是地板 或者是目标点 直接走   旁边是空格的情况 可移动
        if(p2.x < 0) return false;
        if(p2.x > this.row - 1) return false;
        if(p2.y < 0) return false;
        if(p2.y > this.col - 1) return false;
        var p11 = this.curStepArr[p1.x][p1.y], //分别拿到之后的位置
            p22 = this.curStepArr[p2.x][p2.y],
            temp = this.fixedStepArr[this.manPer.x][this.manPer.y];//判断原来小人所在的位置
            console.log(p22)
        // 第一个为墙 或第一个为箱子 但第二个为墙 或者两个都为箱子
        if(p11 === 1 || ((p11 === 3 || p11 === 5) && (p22 === 1 || p22 === 3 || p22 === 5))) {
            return false;
        }
        if(p11 === 3 || p11 === 5) {//第一个为箱子 还需判断第二个
            if(p22 === 0) {//第二个为地板
                this.curStepArr[p2.x][p2.y] = 3;
            }else if(p22 === 2) {//第二个为目标点
                console.log("p22 === 2")
                this.curStepArr[p2.x][p2.y] = 5;
            }
        }
        // 默认可以移动
        // 本来想着可以单独绘制 不在重新绘制 可是图片大小并不是标准的方块大小 会出现覆盖不住的情况
        // 这样只能改变完二维数组以后再重新绘制了
        if( temp !== 2 && temp !== 5) {//z证明小人原来的所在地不是个目标点 则直接改变原来的位置为地板
            // this.drawSquareImage(this.block, this.manPer.x, this.manPer.y);
            console.log("temp");
            this.curStepArr[this.manPer.x][this.manPer.y] = 0;
        }else {
            // this.drawSquareImage(this.ball, this.manPer.x, this.manPer.y);
            this.curStepArr[this.manPer.x][this.manPer.y] = 2;
        }
        // this.drawSquareImage(this.curMan, p1.x, p1.y);
        this.curStepArr[p1.x][p1.y] = 4;//改位置变成人；
        this.manPer = this.position(p1.x,p1.y);//更新人的位置
        return true;
    },
    paintBlock(arr) {// 绘制地板
        this.ctx.clearRect(0,0, this.w * this.col, this.h * this.row);
        arr.forEach((ele, i) => {
            ele.forEach( (item, j) => {
                this.ctx.drawImage(this.block, j * this.w, i * this.h, this.w, this.h);
            })
        })
    },
    paintView(arr) {// 绘制地板上的物体
        var temp;
        arr.forEach((ele, i) => {
            ele.forEach((item, j) => {
                temp = null;
                switch (item) {
                    case 1:
                        temp = this.wall;//绘制墙
                        break;
                    case 2:
                        temp = this.ball;//绘制目标点
                        break;
                    case 3:
                        temp = this.box;// 绘制箱子
                        break;
                    case 4:
                        // 锁定人的位置
                        this.manPer = this.position(i , j);
                        temp = this.curMan;// 绘制人
                        break;
                    case 5:
                        temp = this.box;// 箱子和目标点重合 默认绘制箱子
                        break;
                }
                // 因为图片宽高不一定和每个方块的一样 所以要放到每个块的中间
                if(temp) this.drawSquareImage(temp, i, j);
            })
        })
    },
    drawSquareImage(img, i, j) {// 有的图片大小不一致 绘制时需要计算
        var px = (j * this.w) - (img.width - this.w) / 2;//图片横向在方块中间
        var py = (i * this.h) - (img.height - this.h);// 图片底部始终与方块底部重合
        this.ctx.drawImage(img, px, py, img.width, img.height);
    },
    nextStep() {//进入下一关
        this.timer = 0;
        this.curSteps + 1 >= this.curLevels.length ? null : this.curSteps++;
        this.init();
    },
    prevStep() {// 退到上一关
        this.timer = 0;
        this.curSteps - 1 < 0 ? null : this.curSteps--
        this.init();
    },
    retLastStep() {//返回上一步 并且是有效的运动 就是小人确实走了一格
        if(this.lastSteps.length === 1) return;
        this.step.innerHTML = --this.timer;
        this.lastSteps.pop();
        this.curStepArr = this.lastSteps[this.lastSteps.length - 1];
        this.paintBlock(this.curStepArr);
        this.paintView(this.curStepArr);
    },
    transferLevel (level) {// 切换难度等级
        if(this.curLstr !== level) {
            this.curSteps = 0;
            this.timer = 0;
            this.curLevels = this[level];
            this.init();
        }
    },
    checkSuccess() {//检查是否成功
        var flag = false;
        this.curStepArr.forEach((ele, i) => {
            ele.forEach((item, j) => {
                if((this.fixedStepArr[i][j] === 2 || this.fixedStepArr[i][j] === 5) && item !== 5) {
                    flag = true;
                }
            })
        })
        if(!flag) setTimeout(() => {
            alert("恭喜通过本关， 请进入下一关。");
            this.nextStep();
        });
    },
    copyArrayLevels(arr) {//复制一份关卡数组 不对其进行直接操作
        return JSON.parse(JSON.stringify(arr));
    }
}

pushBoxGame.startGame();








// var canvas = document.getElementById("canvas");
// canvas.style.width = 16 * 35 + "px";
// canvas.style.height = 16 * 35 + "px";

// var ctx = canvas.getContext("2d");
// var l = levels[0];
// var col = l[0].length;
// var row = l.length;
// var img = new Image()
// img.onload = function () {
//     for(var i = 0; i < row; i++) {
//         for(var j = 0; j < col; j++) {
//             ctx.drawImage(img, j * 35, i * 35,35, 35);
//         }
//     }
// }
// img.src = "./images/block.gif";

// canvas.onclick = function (e) {
//     console.log(Math.floor(e.offsetX / 35));
//     console.log(Math.floor(e.offsetY / 35))
// }
