const path = require('path')
const events = require('events');
const axios = require('axios')
const Chance = require('chance')
const TelegramBot = require('node-telegram-bot-api');
      
const Chat = require('./Chat.js');

function Telebot (options) {

    clog('  ...instantiating Telebot this.$native.')

    if (!options.name) {
        cerr('  Fail at create Telebot inst')
        throw new Error('No .name was set')
    }

    if (!options.naname) {
        cerr('  Fail at create Telebot inst')
        throw new Error('No .naname was set')
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
    this.$naname = options.naname;
    this.$token = options.token;
    this.$pixmanager = options.pixmanager;
    this.$debug = options.debug;

    this.$tasks  = {};
    this.$ttchats = [];
    this.$ttbotSlaves = {};
    this.$scopeHandlers = {};
    this.$delegacyHandler = Function;

    this.$native = this.$n = new TelegramBot(this.$token, options.noptions);    
    this.$emitter = new events.EventEmitter();
    this.$axios = makeAxiosBotInst();

    this.$lowdb = options.lowdb
    this.$admins = options.admins.split(',')

    // public 
    this.on = this.$emitter.on;
    this.emit = this.$emitter.emit;

    // me still undefined
    // will be defined on start()
    this.$me = this.$n.getMe();
 
    // log shorts
    this.clog = () => {};
    this.cerr = () => {};
    this.cinf = () => {};

    if (!this.$debug) {
        this.clog = console.log;
        this.cerr = console.error;
        this.cinf = console.info;
    }

    // meta props definitions
    this.meta = Object.create(null);

    // defines this.$emitter prototype as this
    Object.setPrototypeOf(this.$emitter, this);

    if (!this.$lowdb.data[this.$name + '.chats']) {
         this.$lowdb.data[this.$name + '.chats'] = []; 
         this.$lowdb.write()
    }

    if (!this.$lowdb.data[this.$name + '.checkings']) {
         this.$lowdb.data[this.$name + '.checkings'] = [];
         this.$lowdb.write()
    }

    // * Telebot() HELPERS * --------------------------;
    function makeAxiosBotInst () {
        
        const reqopts = options.request;
        let axiosinst;

        if (reqopts) {
            axiosinst = axios.create({});
        }

        axiosinst = axios.create({
            ...reqopts
        })

        return axiosinst;
    }
}

Telebot.prototype.getcrew = function () {
    
    let h = [];

    for (let key in this.$ttbotSlaves) {
        let inst = this.$ttbotSlaves[key]
        h.push(inst.$naname)
    }
    
    return h;
}

Telebot.prototype.myself = async function () {
    return await this.$n.getMe();
}

Telebot.prototype.take = function (slaveinstname) {
    return this.$ttbotSlaves[slaveinstname];
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

Telebot.prototype.sendany = async function (chatid, textarr) {
    const chance = new Chance(),
          reply = chance.pickone(textarr);

    await this.$n.sendMessage(chatid, reply)
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

Telebot.prototype.delegacy = function (cb) {
    this.$delegacyHandler = async function (ttbotinst, task, pload) {
        await cb.call(this, ttbotinst, task, pload)
    }
}

Telebot.prototype.delegate = async function (
                    ttbotinstName, 
                        task = null, 
                            pload = null) {
    
        let ttbotTartget = this.$ttbotSlaves[ttbotinstName];
        await ttbotTartget.$delegacyHandler(ttbotinstName, task, pload)
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
        this.clog('  No ttchatdata set yet persistent json db.')
        this.clog('  ...adding new new ttchat data to json db.')
        
        this.$lowdb.data[this.$name + '.chats'].push({
            id: ttchatid,
            ...upsets
        })
        
        this.$lowdb.write()
        return;
    }

    this.clog('  Updating persistent json db.')

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

    this.clog(`  ...initiating task: ${ctx.name} within ${ctx.timeout}.`)

    setTimeout(() => {

        this.clog(`  ...task: ${ctx.name} running at interval: ${ctx.interval}.`)

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

Telebot.prototype.sendimg = async function (ttchatid, _pathOrFileId) {
    await this.$n.sendPhoto(ttchatid, _pathOrFileId);
}

Telebot.prototype.sendocument = async function (ttchatid, teleDocObj) {
    await this.$n.sendPhoto(ttchatid, teleDocObj.file_id);
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

Telebot.prototype.forward = async function (ttchatid, nmsgid, targetinstname) {

    const targetinst = this.take(targetinstname),
          targetdata = await targetinst.$n.getMe(),
          targetinstID = targetdata.id; 

    this.clog('  targetinstname >>>', targetinstname)
    this.clog('  targetinst >>>', targetinst)
    this.clog('  targetdata >>>', targetdata)
    this.clog('  msgid >>>', nmsgid)

    await this.$n.forwardMessage(targetinstID, ttchatid, nmsgid)
}

Telebot.prototype.request = async function (reqopts = {}) {
    return await this.$axios({
        ...reqopts
    })
}

Telebot.prototype.debug = async function (propmap, file, line) {
    
    if (this.$debug) {
        clog('\n\n')
        clog('  🐞 Debugging at:', file + ':' + line, '\n')
        
        for (let key in propmap) {
            clog(`  → ${key}:`, propmap[key])
        }

        clog('  🐞 Debugging end * ----------- *')
        clog('\n\n')
    }
}

Telebot.prototype.start = async function () {
    
    const haslaves = Object.keys(this.$ttbotSlaves).length >= 1;

    if (haslaves) {
        
        this.clog('\n    → ttbot:', this.$name + ` has slave instances.`)
        this.clog('    → starting them all before itself.')
        
        for (let key in this.$ttbotSlaves) {
            let slav = this.$ttbotSlaves[key]
                await slav.start()
        }
    }

    this.clog('\n    * Starting instance:', this.$name, '🤖')

    let newttinst;

    this.on('#incoming', async (ttchat, text, nmsg) => {
        this.$incomingHandler(ttchat, text, nmsg)
    })

    this.$me = await this.$n.getMe();

    const handler = async msg => {

        this.clog('\n ...running $start handler()')

        let existingttchat = await this.$ttchats.find(ttchat => {
            return ttchat.id === msg.chat.id;
        })

        // if new ttinst already exist in db
        if (existingttchat) {
            
            this.clog('  ...chat already an Chat inst (ttchat) on this.$tcoll coll.')
            this.clog(' \n\n\n existingttchat', existingttchat, '\n\n\n')
            
            this.emit('#incoming', existingttchat, msg.text, msg)
        
        } else {

            this.clog('  Adding new Chat instance to this.$tcoll')
            
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