const path = require('path')
const events = require('events');
const TelegramBot = require('node-telegram-bot-api');
      
const Chat = require('./Chat.js');

function Telebot (options) {

    clog('  ...instantiating Telebot this.$native.')

    if (!options.name) {
        cerr('  Fail at create Telebot inst')
        throw new Error('No .name was set')
    }
    
    if (!options.token) {
        cerr('  Fail at create Telebot inst')
        throw new Error('No .token was set')
    }

    if (!options.lowdb) {
        cinf('  No .lowdb set at Telebot inst')
    }

    if (!options.admins) {
        cinf('  No .admins set at Telebot inst')
    }

    this.$id = util.genHash();
    this.$name = options.name;
    this.$token = options.token;

    this.$tasks  = {};
    this.$ttchats = [];
    this.$ttbotSlaves = {};
    this.$scopeHandlers = {};

    this.$native = this.$n = new TelegramBot(this.$token, options.noptions);    
    this.$emitter = new events.EventEmitter();

    this.$lowdb = options.lowdb
    this.$admins = options.admins.split(',')
    
    // public 
    this.on = this.$emitter.on;
    this.emit = this.$emitter.emit;

    if (!this.$lowdb.data[this.$name + '.chats']) {
         this.$lowdb.data[this.$name + '.chats'] = []; 
         this.$lowdb.write()
    }

    if (!this.$lowdb.data[this.$name + '.checkings']) {
         this.$lowdb.data[this.$name + '.checkings'] = [];
         this.$lowdb.write()
    }
}

Telebot.prototype.push = function (ttchat) {
    this.$ttchats.push(ttchat)
}

Telebot.prototype.find = function (ttchatid) {
    return this.$ttchats.find(ttchat => {
        return ttchat.id === ttchatid;
    })
}

Telebot.prototype.get = function (ttchatid, key) {
    let ttchat = this.find(ttchatid)
    return ttchat.$storage[key]
}

Telebot.prototype.set = function (ttchatid, key, value) {
    let ttchat = this.find(ttchatid);
    ttchat.$storage[key] = value;
}

Telebot.prototype.inc = function (ttchatid, key, numvalue = 1) {
    let ttchat = this.find(ttchatid);
    ttchat.$storage[key] = ttchat.$storage[key] + numvalue;
}

Telebot.prototype.all = function (ttchatid) {
    let ttchat = this.find(ttchatid)
    return ttchat.$storage; 
}

Telebot.prototype.clear = function () {
    this.$ttchats = [];
}

Telebot.prototype.sendone = async function (chatid, text) {
    await this.$n.sendMessage(chatid, text)
}

Telebot.prototype.sendonce = async function (chatid, texts) {

    if (!Array.isArray(texts)) {
        cerr('  Fail at .sendonce')
        cerr('  texts are not an array')
        return;
    }

    await this.$n.sendMessage(chatid, texts.join('\n'))
}

Telebot.prototype.learn = function (keyOrObj, skillMtd) {

    if (keyOrObj.constructor.name === 'Object') {
        for (let k in keyOrObj) {
            this[`$${k}`] = keyOrObj[k];
        }
    }

    if (keyOrObj.constructor.name === 'String') {
        this[`$${keyOrObj}`] = skillMtd;
    }
}

Telebot.prototype.meeting = function (cb) {
    this.$meetingHandler = async ttchat => {
        await cb.call(this, ttchat);
    }
}

Telebot.prototype.donce = function (cb) {
    this.$donceHandler = async ttchat => {
        await cb.call(this, ttchat);
    }
}

Telebot.prototype.isadmin = function (ttchatid) {
    let found = this.$admins.find(admid => {
        return Number(admid) === ttchatid;
    })

    if (found) return true;
    return false;
}

// db related methods
Telebot.prototype.fetch = async function (ttchatid) {
    
    let found = this.$lowdb.data[this.$name + '.chats'].find(ttchatdata => {
        return ttchatdata.id === ttchatid;
    })
    
    if (!found) {
        return { id: ttchatid, balance: 0 }
    }

    return found;
}

Telebot.prototype.upset = async function (ttchatid, upsets, key, opValue) {
        
    let tchatdata = this.$lowdb.data[this.$name + '.chats'].find(ttchatdata => {
        return ttchatdata.id === ttchatid;
    })

    if (!tchatdata) {
        clog('  No ttchatdata set yet persistent json db.')
        clog('  ...adding new new ttchat data to json db.')
        
        this.$lowdb.data[this.$name + '.chats'].push({
            id: ttchatid,
            ...upsets
        })
        
        this.$lowdb.write()
        return;
    }

    clog('  Updating persistent json db.')

    let updatedchats;

    // is operator
    if (typeof upsets === 'string' && upsets.includes('$')) {
        updatedchats = this.$lowdb.data[this.$name + '.chats'].map(_ttchatdata => {
            
            let found = _ttchatdata.id === ttchatid,
                op = upsets;   
            
            if (found) {
                
                let curval = _ttchatdata[key],
                    newval;
                
                if (op === '$inc') newval = curval + opValue;
                else if (op === '$dec') newval = curval - opValue;
                else throw new Error('Unregonized operator', op)
                
                return {
                    ..._ttchatdata,
                    [key]: newval
                }
            }

            return _ttchatdata;
        })

    } else { // is object to merge
        updatedchats = this.$lowdb.data[this.$name + '.chats'].map(_ttchatdata => {
            
            let found = _ttchatdata.id === ttchatid;
            
            if (found) {
                return {
                    ..._ttchatdata,
                    ...upsets
                }
            }

            return _ttchatdata;
        })
    }

    this.$lowdb.data[this.$name + '.chats'] = updatedchats;

    await this.$lowdb.write()
}

Telebot.prototype.task = function (ops, cb) {

    let ctx = {};
    
    ctx._id = util.genHash()
    ctx.name = ops.name;
    ctx.timeout = ops.timeout || 1000;
    ctx.interval = ops.interval || 1000;

    ctx.say = (what) => {
        cinf(`      - task ${ctx.name} says:`, what)
    }

    clog(`  ...initiating task: ${ctx.name} within ${ctx.timeout}.`)

    setTimeout(() => {

        clog(`  ...task: ${ctx.name} running at interval: ${ctx.interval}.`)
        
        this.$tasks[ctx.name] = setInterval(() => {
            cb.call({ ...this, ...ctx })
        }, ctx.interval)

    }, ctx.timeout)
}

Telebot.prototype.taskstop = function (taskname) {
    delete this.$tasks[taskname];
}

Telebot.prototype.coowork = function (ttbotcworkinst) {
    ttbotcworkinst._slave = true;
    ttbotcworkinst._master = this;
    this.$ttbotSlaves[ttbotcworkinst.$name] = ttbotcworkinst;
}

Telebot.prototype.cooworker = function (slvname) {
    return this.$ttbotSlaves[slvname];
}

Telebot.prototype.sendimg = async function (ttchatid, _path) {
    await this.$n.sendPhoto(ttchatid, _path);
}

Telebot.prototype.scopeify = async function () {
    // ...
} 

Telebot.prototype.goscope = async function (_scopename, ttchat) {
    // this.$scopeHandlers[_scopename]()
}

Telebot.prototype.incoming = async function (_cb) {
    this.$incomingHandler = _cb;
}

Telebot.prototype.start = async function () {

    if (Object.keys(this.$ttbotSlaves).length >= 1) {
        clog('\n    → ttbot:', this.$name + ` has slave instances.`)
        clog('    → starting them all before itself.')
        
        for (let key in this.$ttbotSlaves) {
            let slav = this.$ttbotSlaves[key]
                await slav.start()
        }
    }

    clog('\n    * Starting instance:', this.$name, '🤖')

    let newttinst;

    this.on('#incoming', async (ttchat, text, nmsg) => {
        this.$incomingHandler(ttchat, text, nmsg)
    })

    const handler = async msg => {

        clog('\n ...running $start handler()')

        let existingttchat = await this.$ttchats.find(ttchat => {
            return ttchat.id === msg.chat.id;
        })

        // if new ttinst already exist in db
        if (existingttchat) {
            clog('  ...chat already an Chat inst (ttchat) on this.$tcoll coll.')
            clog(' \n\n\n existingttchat', existingttchat, '\n\n\n')
            this.emit('#incoming', existingttchat, msg.text, msg)
        } else {
            clog('  Adding new Chat instance to this.$tcoll')
            newttinst = new Chat(msg);
            this.$ttchats.push(newttinst)
            this.emit('#incoming', newttinst, msg.text, msg)
        }
    }

    try {
        
        this.$n.once('message', async (msg) => {
            newttinst = new Chat(msg);
            
            if (msg.text === '/start' && this.$meetingHandler) {
                await this.$meetingHandler(newttinst)
            }

            if (msg.text != '/start' && this.$donceHandler) {
                await this.$donceHandler(newttinst)
            }
        })

        // perform native inshadows
        this.$n.on('message', async (msg) => {
            await handler.call(this, msg)
        })
        
        cinf(   '\nNew Telebot instance: \n')
        // custom bot props
        clog('   $id:',      this.$id)
        clog('   $token:',   this.$token)
        clog('   $name:',    this.$name)
        clog('   $native:',  this.$native ? 'set' : 'non-set')

    } catch (err) {
        cerr('  Fail at this.$n.on')
        cerr(err)
    }
}

module.exports = Telebot;